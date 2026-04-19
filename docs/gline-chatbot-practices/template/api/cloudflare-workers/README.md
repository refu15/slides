# G-LINE Chatbot API (Cloudflare Workers)

Hono + postgres.js で実装された G-LINE 採用チャットボットの API サーバー。Cloudflare Hyperdrive 経由で AWS RDS PostgreSQL（東京）に接続します。

## エンドポイント

| メソッド | パス | 用途 |
|---|---|---|
| POST | /api/chat | チャット応答（RAG + LLM + ガードレール） |
| POST | /api/apply | 応募者登録（暗号化保存 + info メール通知） |
| POST | /api/event | ウィジェットイベント（chat_open 等） |
| POST | /api/gdpr | 個人情報削除要求 |
| GET  | /api/health | ヘルスチェック |

## セットアップ

### 1. AWS RDS を用意（別途 Terraform 参照）

```bash
# 接続文字列例
postgresql://gline_app:PASSWORD@gline-db.xxxxx.ap-northeast-1.rds.amazonaws.com:5432/gline_chatbot?sslmode=require
```

### 2. スキーマ適用

```bash
cd ../..
psql "$DATABASE_URL" -f db/schema.sql
psql "$DATABASE_URL" -f db/migrations/0002_rls_policies.sql
psql "$DATABASE_URL" -f db/seed.sql
```

### 3. Hyperdrive 作成

```bash
cd api/cloudflare-workers
npx wrangler hyperdrive create gline-pg \
  --connection-string="postgresql://gline_app:PASSWORD@gline-db.xxxxx.ap-northeast-1.rds.amazonaws.com:5432/gline_chatbot?sslmode=require"
# 表示される id を wrangler.toml の [[hyperdrive]].id に貼り付け
```

### 4. Secrets 設定

```bash
npx wrangler secret put GEMINI_API_KEY
npx wrangler secret put APPLICANT_ENC_KEY
npx wrangler secret put SESSION_SALT
npx wrangler secret put RESEND_API_KEY
```

### 5. 依存インストール & デプロイ

```bash
npm install
npm run deploy:staging    # ステージング
npm run deploy:prod        # 本番
```

## ローカル開発

```bash
# .dev.vars に開発用の値を設定（.gitignore 済み想定）
echo 'GEMINI_API_KEY="AIza..."' >> .dev.vars
echo 'APPLICANT_ENC_KEY="dev-key-32bytes-..."' >> .dev.vars
echo 'SESSION_SALT="dev-salt"' >> .dev.vars
echo 'ALLOWED_ORIGINS="http://localhost:5173"' >> .dev.vars

npm run dev
# → http://127.0.0.1:8787 で起動
```

Hyperdrive のローカル接続は `.dev.vars` の `HYPERDRIVE_LOCAL_CONNECTION_STRING` でオーバーライド可能（wrangler 3.50+）。

## 動作確認

```bash
# ヘルスチェック
curl https://gline-chatbot-api.YOUR-ACCOUNT.workers.dev/api/health

# チャット
curl -X POST https://gline-chatbot-api.YOUR-ACCOUNT.workers.dev/api/chat \
  -H "Content-Type: application/json" \
  -d '{"sessionId":"test-01","message":"御社の強みは？"}'

# 応募
curl -X POST https://gline-chatbot-api.YOUR-ACCOUNT.workers.dev/api/apply \
  -H "Content-Type: application/json" \
  -d '{"sessionId":"test-01","name":"山田太郎","email":"test@example.com","phone":"090-1111-2222"}'
```

## アーキテクチャ

```
Browser (widget.js)
   ↓ fetch + CORS
Cloudflare Workers (本ファイル)
   ├─ Guardrails（禁止トピック即エスカレーション）
   ├─ RAG 検索（Gemini embedding + pgvector）
   ├─ Gemini 3.1 Flash-Lite 呼び出し
   ├─ 非同期ログ書込（ctx.waitUntil）
   └─ Resend メール通知
   ↓ Hyperdrive（接続プール）
AWS RDS PostgreSQL（東京）
```
