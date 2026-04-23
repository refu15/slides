# Lite 版 デプロイ手順書（最短版）

所要時間：**1 時間**で本番公開まで到達。

## 準備するもの

1. **Cloudflare アカウント**（無料、サインアップ 5分）
2. **Resend アカウント**（無料、サインアップ 5分）
3. **Gemini API キー**（https://aistudio.google.com/apikey で発行済み）
4. **G-LINE の代表原稿**（`.txt` or `.md`、最低1本）

## 手順

### Step 1: Cloudflare アカウント作成（5分）

1. https://dash.cloudflare.com/sign-up でメール登録
2. メール認証
3. **ドメイン追加はスキップ**（workers.dev サブドメインを使うため不要）

### Step 2: Resend アカウント作成（5分）

1. https://resend.com/signup で GitHub 認証
2. Dashboard → API Keys → Create API Key
3. Domains → Add Domain（将来 `no-reply@alno-ai.net` を使う場合）
   - 当面は Resend のデフォルトドメイン `onboarding@resend.dev` でもテスト可能
   - wrangler.toml の送信元を `onboarding@resend.dev` に変更

### Step 3: ローカル準備（10分）

```bash
cd template
npm install
cd api/cloudflare-workers && npm install
cd ../../widget && npm install
cd ..
```

### Step 4: 代表原稿の投入（10分）

```bash
# rag_sources/ に原稿を置く（既に sample-company-intro.txt あり）
ls rag_sources/

# chunks.json 生成（Gemini 埋込、時間は原稿量次第で 1〜5分）
GEMINI_API_KEY=<your-gemini-key> npm run rag:build
# → api/cloudflare-workers/chunks.json にバンドル
```

### Step 5: Workers デプロイ（15分）

```bash
cd api/cloudflare-workers

# 初回だけ: wrangler login
npx wrangler login
# ブラウザで Cloudflare にログイン → 承認

# Secrets 登録
npx wrangler secret put GEMINI_API_KEY
# 貼り付け

npx wrangler secret put SESSION_SALT
# 32文字以上のランダム文字列（openssl rand -hex 32 など）

npx wrangler secret put RESEND_API_KEY
# re_ で始まる Resend API キー

# 環境変数の調整（wrangler.toml）
# - ALLOWED_ORIGINS: "https://g-line.co.jp,https://www.g-line.co.jp"
# - NOTIFY_EMAIL: "info@g-line.co.jp"
# - ENVIRONMENT: "production"

# デプロイ
npx wrangler deploy
```

出力される URL（例）：
```
https://gline-chatbot-api.your-account.workers.dev
```

動作確認：
```bash
curl https://gline-chatbot-api.your-account.workers.dev/api/health
# → {"ok":true,"chunks":N,"env":"production"}
```

### Step 6: Widget デプロイ（10分）

```bash
cd ../../widget

# vite.config.ts で __API_URL__ が production の時に Workers URL を指すよう編集
# （または data-api-url 属性で埋込時に指定する形も可）

# ビルド
npx vite build
# → dist/widget.js, dist/widget.css

# Cloudflare Pages にデプロイ
npx wrangler pages deploy dist --project-name=gline-widget
```

出力：
```
https://gline-widget.pages.dev
```

### Step 7: G-LINE HP に埋込（5分）

以下の 1 行を `</body>` 直前に貼り付け：

```html
<script
  src="https://gline-widget.pages.dev/widget.js"
  data-tenant="g-line"
  data-api-url="https://gline-chatbot-api.your-account.workers.dev"
  async
></script>
```

**完了**。G-LINE HP を開くと右下に「💬 採用のご質問はこちら」ボタンが表示される。

### Step 8: 応募受付テスト（5分）

1. 右下のチャットを開く
2. 「応募したい」と入力 → 3 ターン後に「応募フォームを開く」ボタン
3. 氏名・メールを入力して送信
4. `info@g-line.co.jp` にメールが届くか確認

---

## トラブルシューティング

| 症状 | 対処 |
|---|---|
| チャットがエラーになる | `wrangler tail` でログ確認、`GEMINI_API_KEY` が正しいか |
| 応募メールが届かない | `RESEND_API_KEY` が有効か、送信元ドメインが認証済みか |
| CORS エラー | `wrangler.toml` の `ALLOWED_ORIGINS` に HP の URL を追加 |
| 応答が浅い / 代表っぽくない | RAG 原稿を増やして `npm run rag:build` → 再デプロイ |

---

## 月額コスト

| 項目 | 月額 |
|---|---|
| Cloudflare Workers | ¥0（無料枠 10万 req/日）|
| Cloudflare Pages | ¥0 |
| Gemini 3.1 Flash-Lite | ¥200〜500 |
| Resend | ¥0（無料 3000通/月） |
| **合計** | **¥200〜¥500** |

---

## 後日のアップグレード

応募者数や機能要求が増えた場合、`deprecated/` に退避した機能（管理画面・DB 保存・監査ログ等）を段階的に復活させます：

1. **応募者 100 件/月 超え** → AWS RDS + admin 復活
2. **複数拠点に展開** → マルチテナント対応（tenant_id 追加）
3. **監査要件が発生** → audit_log 復活
4. **モデル切替実験** → A/Bテスト UI 復活

詳細は [Enterprise 版 Runbook](./runbook.md) 参照。
</thinking>
