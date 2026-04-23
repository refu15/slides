# G-LINE 採用チャットボット（Lite 版）

> 社長の分身として応募者の質問に答え、応募をメール通知で受け付ける **最小構成** の AI 採用チャットボット。

[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6)](https://www.typescriptlang.org/)
[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-F38020)](https://workers.cloudflare.com/)
[![Gemini](https://img.shields.io/badge/Gemini-3.1%20Flash--Lite-4285F4)](https://ai.google.dev/)

---

## 📌 Lite 版の特徴

- **DB 不要**（応募情報はメール通知のみ、会話ログ保存なし）
- **RAG は静的 JSON**（ビルド時 `chunks.json` 生成、Worker にバンドル）
- **必要アカウント 2 つだけ**: Cloudflare + Resend（Gemini は既にあり）
- **月額 ¥500 以下**（Cloudflare 無料 + Gemini ¥200〜500 + Resend 無料）
- **本番公開まで 1 日**

---

## 🏗 アーキテクチャ

```
[G-LINE HP]
   ↓ <script src=".../widget.js">
[Cloudflare Pages]  widget.js 静的配信
   ↓ fetch
[Cloudflare Workers]  /api/chat /api/apply /api/health
   ├─ Gemini 3.1 Flash-Lite 呼び出し
   ├─ ガードレール（給与交渉・機密検知）
   ├─ RAG（chunks.json 線形スキャン）
   └─ Resend でメール通知（応募時）
```

---

## 🚀 セットアップ（所要 1 時間）

### 1. アカウント準備

- ✅ **Cloudflare**（無料・ドメイン追加不要 → workers.dev URL で OK）
- ✅ **Resend**（無料 3000通/月）
- ✅ **Gemini API キー**（Google AI Studio で発行、無料）

### 2. 依存インストール

```bash
cd template
npm install
cd api/cloudflare-workers && npm install
cd ../../widget && npm install
```

### 3. RAG 原稿を投入

```bash
# 代表の書籍・HP原稿等を .txt または .md で置く
cp /path/to/company-info.txt rag_sources/

# chunks.json を生成（Gemini で埋込、Worker にバンドル）
GEMINI_API_KEY=<your-key> npm run rag:build
```

### 4. Cloudflare Workers デプロイ

```bash
cd api/cloudflare-workers

# 初回のみ: wrangler ログイン
npx wrangler login

# Secrets 登録
npx wrangler secret put GEMINI_API_KEY
npx wrangler secret put SESSION_SALT          # 32文字以上のランダム文字列
npx wrangler secret put RESEND_API_KEY         # re_ で始まる Resend API キー

# wrangler.toml の ALLOWED_ORIGINS / NOTIFY_EMAIL を編集
# （デフォルトは g-line.co.jp / info@g-line.co.jp）

# デプロイ
npx wrangler deploy
# → https://gline-chatbot-api.your-account.workers.dev
```

### 5. Widget デプロイ

```bash
cd widget

# API URL を合わせる（vite.config.ts の __API_URL__ or data-api-url）
# 本番ビルド
npx vite build

# Cloudflare Pages にデプロイ
npx wrangler pages deploy dist --project-name=gline-widget
# → https://gline-widget.pages.dev
```

### 6. G-LINE HP に埋込

```html
<!-- </body> 直前 -->
<script
  src="https://gline-widget.pages.dev/widget.js"
  data-tenant="g-line"
  data-api-url="https://gline-chatbot-api.your-account.workers.dev"
  async
></script>
```

これで右下に採用チャットボタンが表示されます。

---

## 📂 ディレクトリ構成（Lite 版）

```
template/
├── api/cloudflare-workers/  Workers API 本体
│   ├── worker.ts            Hono + Gemini + RAG + Resend
│   ├── chunks.json           RAG 埋込データ（ビルド時生成）
│   └── wrangler.toml
├── widget/                   埋め込みウィジェット（Preact）
│   └── src/widget.tsx
├── lib/                      共通ライブラリ
│   ├── rag.ts                線形スキャン + 埋込
│   ├── guardrails.ts         NGトピック検知
│   ├── business-hours.ts     営業時間判定
│   ├── logger.ts             PII 匿名化 + session_id ハッシュ
│   └── sentry.ts             エラー通知（オプション）
├── prompts/sanbo-persona.md  社長ペルソナ
├── legal/                    プラポリ・利用規約（日英）
├── rag_sources/              代表の原稿を置く場所
├── scripts/
│   └── build-rag-chunks.mts  chunks.json ビルダー
├── tests/                    vitest（64ケース）
├── docs/                     運用ドキュメント
└── deprecated/               Standard/Enterprise 版の機能
                              （admin/DB/Terraform/E2E 等）
                              必要になったら戻す
```

---

## 🔒 セキュリティ

- **TLS**: Cloudflare が自動で TLS 1.2+
- **PII 匿名化**: 会話ログは保存しないが、Gemini へ送信する前に `anonymize()` でメール・電話番号をマスク
- **CORS**: `ALLOWED_ORIGINS` で許可ドメインを明示
- **Rate Limit**: Cloudflare Rate Limiting bindings（wrangler.toml 参照）
- **Session ID ハッシュ化**: ブラウザの raw UUID はサーバー側に保存しない

---

## 💡 後から機能を戻す場合

`deprecated/` に退避した機能（管理画面・A/Bテスト・監査ログ・ペルソナ自動学習・DB 連携）は、必要になったら以下で復元できます：

```bash
cd template
git log --all --oneline | grep -i 'lite\|deprecated'  # 履歴確認
mv deprecated/admin .
mv deprecated/db .
# …
```

---

## 🔗 関連ドキュメント

- [プラポリ雛形（日本語）](./legal/privacy-policy-ja.md)
- [プラポリ雛形（英語）](./legal/privacy-policy-en.md)
- [利用規約](./legal/terms-of-use-ja.md)
- [法務レビュー依頼状](./docs/legal-review/cover-letter.md)
- [Lite 版デプロイガイド](./docs/operations/lite-deploy.md)

---

## 📄 ライセンス

Private / Proprietary
