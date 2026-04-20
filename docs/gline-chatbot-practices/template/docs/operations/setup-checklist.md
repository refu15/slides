# 実環境構築チェックリスト

G-LINE 採用チャットボットの本番環境を構築するための手順。上から順に実施すれば動く状態になる。**所要 4〜6時間**。

## 前提

- [ ] AWS アカウント開設済み（請求先登録済み）
- [ ] Cloudflare アカウント開設済み（無料でOK）
- [ ] Google Cloud / AI Studio アカウント作成済み
- [ ] Resend アカウント作成済み（無料プラン）
- [ ] GitHub リポジトリアクセス権限（`refu15/gline-chatbot` への push 権限）
- [ ] 独自ドメインを所有（例：`gline-bot.example.jp`）

---

## Phase 1: AWS RDS（東京リージョン）

### 1-1. Terraform 実行

```bash
cd template/infra/terraform
terraform init
export TF_VAR_db_password=$(openssl rand -base64 32)
export TF_VAR_cloudflare_account_id="YOUR_CF_ACCOUNT_ID"
export TF_VAR_cloudflare_api_token="YOUR_CF_API_TOKEN"
terraform workspace new production
terraform apply -var="env=production"
```

- [ ] `terraform apply` 完了
- [ ] `terraform output db_endpoint` で接続先を取得・メモ
- [ ] `terraform output hyperdrive_id` をメモ

### 1-2. スキーマ適用

```bash
export DATABASE_URL="postgresql://gline_admin:$TF_VAR_db_password@$DB_ENDPOINT/gline_chatbot?sslmode=require"
cd template
npm install
npm run db:init     # schema.sql + RLS
npm run db:seed     # FAQ 初期データ
npm run db:smoke    # 疎通確認（8項目すべて ✓）
```

- [ ] `npm run db:smoke` 全項目 ✓
- [ ] `pgvector`, `pgcrypto`, `pg_trgm` 拡張の有効化を確認
- [ ] migration 0003 (GDPR cascade) を適用: `psql $DATABASE_URL -f db/migrations/0003_gdpr_cascade.sql`
- [ ] migration 0004 (audit_log) を適用: `psql $DATABASE_URL -f db/migrations/0004_audit_log.sql`

### 1-3. DB ロール発行

```sql
-- app_public（Workers 用、INSERT のみ）
CREATE USER app_public WITH PASSWORD 'xxx';
GRANT app_public TO app_public;

-- app_analytics（Metabase 用、読み取りのみ）
CREATE USER app_analytics WITH PASSWORD 'yyy';
GRANT app_analytics TO app_analytics;

-- app_admin（管理画面用）
CREATE USER app_admin WITH PASSWORD 'zzz';
GRANT app_admin TO app_admin;
```

- [ ] 3つのロールを作成・パスワードをメモ
- [ ] 各ロール用の `DATABASE_URL` を作成

---

## Phase 2: Secrets Manager

### 2-1. AWS Secrets Manager

```bash
# Terraform が自動作成する（gline/db-url-production, gline/applicant-enc-key-production）
aws secretsmanager get-secret-value --secret-id gline/db-url-production
aws secretsmanager get-secret-value --secret-id gline/applicant-enc-key-production
```

- [ ] 両シークレットが取得できる
- [ ] `APPLICANT_ENC_KEY` が 32バイト以上
- [ ] KMS キーローテーション有効を確認（年1回推奨）

### 2-2. GitHub Secrets

リポジトリ Settings → Secrets and variables → Actions:

| Secret 名 | 用途 |
|---|---|
| `GEMINI_API_KEY` | LLM + embedding |
| `DATABASE_URL` | RAG 再構築・監査ログパージ |
| `APPLICANT_ENC_KEY` | pgcrypto 暗号化鍵 |
| `SLACK_WEBHOOK` | 週次モデル監視レポート |
| `RESEND_API_KEY` | info メール通知 |

- [ ] 5つ全て登録完了

---

## Phase 3: Cloudflare Workers（API）

### 3-1. Hyperdrive 接続設定

```bash
cd template/api/cloudflare-workers
npm install
npx wrangler hyperdrive create gline-pg \
  --connection-string="$DATABASE_URL"
# 出力される id を wrangler.toml の [[hyperdrive]].id に貼り付け
```

- [ ] Hyperdrive 作成完了
- [ ] `wrangler.toml` の `[[hyperdrive]].id` を実 ID に置換

### 3-2. Workers Secrets 設定

```bash
npx wrangler secret put GEMINI_API_KEY
npx wrangler secret put APPLICANT_ENC_KEY
npx wrangler secret put SESSION_SALT
npx wrangler secret put RESEND_API_KEY
npx wrangler secret put TURNSTILE_SECRET_KEY
```

- [ ] 5つ全て登録完了
- [ ] `wrangler.toml` の `ALLOWED_ORIGINS` を実ドメインに更新（`https://g-line.co.jp` 等）
- [ ] `ENVIRONMENT = "production"` を設定

### 3-3. Rate Limiting Bindings 設定

Cloudflare Dashboard → Workers → Settings → Bindings → Rate Limiting で以下を作成（wrangler.toml に記載済み）:
- [ ] `CHAT_LIMITER` (10 req/min)
- [ ] `APPLY_LIMITER` (3 req/min)
- [ ] `GDPR_LIMITER` (2 req/min)

### 3-4. デプロイ

```bash
npx wrangler deploy --env production
# -> https://gline-chatbot-api-prod.YOUR-ACCOUNT.workers.dev
```

- [ ] デプロイ成功
- [ ] `curl .../api/health` で `{"ok": true}` 応答
- [ ] ログ tail で起動確認: `npx wrangler tail`

---

## Phase 4: Cloudflare Turnstile（Bot 検知）

1. Cloudflare Dashboard → Turnstile → Add Site
2. Widget Mode: Managed、Domain: G-LINE HP ドメイン
3. Site Key（公開）と Secret Key（秘密）を取得

- [ ] Turnstile Widget 作成完了
- [ ] Secret Key を `wrangler secret put TURNSTILE_SECRET_KEY`
- [ ] Site Key を widget ビルド時の `data-turnstile-key` 環境変数へ

---

## Phase 5: ウィジェット配信（Cloudflare Pages）

### 5-1. ビルド & デプロイ

```bash
cd template/widget
npm install
npx vite build
npx wrangler pages deploy dist --project-name=gline-widget
```

- [ ] `https://widget.gline-bot.example.jp/widget.js` が HTTP 200 で配信
- [ ] gzip サイズ ≤ 50KB を確認

### 5-2. ドメイン設定

Cloudflare Pages → Custom Domain → `widget.gline-bot.example.jp` を追加

- [ ] DNS CNAME 設定
- [ ] SSL 証明書自動発行を確認

---

## Phase 6: 管理画面（Vercel / Cloudflare Pages）

### 6-1. Vercel デプロイ

```bash
cd template/admin
# Vercel CLI or Web UI で Next.js プロジェクト作成
vercel --prod
```

環境変数（Vercel Dashboard）:

| 変数 | 値 |
|---|---|
| `APP_ADMIN_DATABASE_URL` | app_admin ロール用 DATABASE_URL |
| `APPLICANT_ENC_KEY` | Secrets Manager と同じ |
| `ADMIN_ALLOWED_EMAILS` | カンマ区切りメール一覧 |
| `GITHUB_TOKEN` | PR 操作用 |
| `GITHUB_REPO` | `refu15/gline-chatbot` |
| `PERSONA_PATH` | `prompts/sanbo-persona.md` |

- [ ] デプロイ成功
- [ ] 環境変数 6 つ設定
- [ ] Cloudflare Access 設定（後述）

### 6-2. Cloudflare Access（管理画面認証）

1. Cloudflare Dashboard → Zero Trust → Access → Applications → Add
2. Application domain: `admin.gline-bot.example.jp`
3. Identity providers: Google Workspace / One-time PIN
4. Policies: 許可メール 2〜3 名

- [ ] Access 設定完了
- [ ] 未認証アクセスで 401 確認
- [ ] 認証後に `/admin` が表示

---

## Phase 7: DNS / HP 側設定

### 7-1. DNS

| レコード | 値 |
|---|---|
| `gline-bot.example.jp` CNAME | `gline-chatbot-api-prod.YOUR-ACCOUNT.workers.dev` |
| `widget.gline-bot.example.jp` CNAME | `gline-widget.pages.dev` |
| `admin.gline-bot.example.jp` CNAME | Vercel or Pages |

- [ ] 3レコード DNS 伝播確認（`dig` で）

### 7-2. G-LINE HP に埋込タグ

```html
<script src="https://widget.gline-bot.example.jp/widget.js"
        data-tenant="g-line-001"
        data-turnstile-key="0x4AAAAAAA..."
        async></script>
```

- [ ] HP の `</body>` 直前に追加
- [ ] モバイル / PC でチャットボタン表示を確認

---

## Phase 8: RAG 原稿投入

```bash
cd template
# rag_sources/ に代表の原稿（.txt/.md）を配置
mkdir -p rag_sources
cp /path/to/ceo-book.txt rag_sources/2025-ceo-book.txt

npm run rag:rebuild
```

- [ ] rag_sources/ に原稿配置
- [ ] `npm run rag:rebuild` 成功
- [ ] DB で `SELECT COUNT(*) FROM rag_chunks` が > 0

---

## Phase 9: 動作確認

- [ ] ウィジェットを開ける（HP の右下ボタン）
- [ ] チャットで「御社の強みは？」→ 代表口調で回答
- [ ] ガードレール動作確認（「給料いくら？」→ エスカレーション表示）
- [ ] 応募フォーム送信（Turnstile 通過、info メール届く）
- [ ] 管理画面にログイン（Cloudflare Access 認証）
- [ ] 管理画面で応募者復号表示
- [ ] GitHub Actions で `persona-learn.yml` を手動実行（workflow_dispatch）

---

## Phase 10: モニタリング設定

- [ ] Sentry プロジェクト作成、DSN 登録（Workers / admin / widget）
- [ ] Slack `#gline-ops` チャンネル作成 + Webhook 発行
- [ ] Better Uptime / UptimeRobot で `/api/health` を 5分毎監視
- [ ] AWS Budget Alert 設定（月額 $30 で警告）
- [ ] Cloudflare 使用量アラート設定
- [ ] Metabase Cloud Free でダッシュボード 1枚作成

---

## 完了判定

以下が全部「はい」なら本番公開可能：

- [ ] ウィジェット表示 OK / チャット応答 OK
- [ ] 応募送信 OK / info メール届く OK / 管理画面で復号表示 OK
- [ ] 監査ログ（audit_log）に管理者操作が記録される
- [ ] プライバシーポリシー法務レビュー完了
- [ ] 運用 Runbook（docs/operations/runbook.md）を採用担当が確認済み
- [ ] 漏洩対応計画書（docs/operations/incident-response.md）を関係者が確認済み
- [ ] Uptime 監視 / アラート通知動作確認

**これで本番公開OK**。
