# G-LINE 採用チャットボット

> 社長（代表）の分身として応募者の質問に答え、応募・面接予約まで自然に誘導する AI 採用チャットボット。

[![Next.js](https://img.shields.io/badge/Next.js-15-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6)](https://www.typescriptlang.org/)
[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-F38020)](https://workers.cloudflare.com/)
[![AWS RDS](https://img.shields.io/badge/AWS-RDS%20PostgreSQL-FF9900)](https://aws.amazon.com/rds/postgresql/)
[![Gemini](https://img.shields.io/badge/Gemini-3.1%20Flash--Lite-4285F4)](https://ai.google.dev/)

---

## 📌 プロジェクト概要

G-LINE 採用サイトに埋め込む AI チャットボット一式。Google Gemini 3.1 Flash-Lite + RAG（検索拡張生成）で代表の書籍・HP・募集要項を根拠にした返答を行い、応募・面接予約まで導線化する。

- **主目的**: 会社理解 → 応募・面接予約への転換率向上
- **UX**: 1 行 `<script>` タグで任意のサイト（WordPress / Wix / STUDIO / 素HTML 等）に埋め込み可能
- **安全性**: 個人情報は AWS 東京リージョン保管・AES-256 暗号化・RLS・APPI/GDPR 準拠
- **月額コスト**: 初年度 ¥500〜/月、2年目以降 ¥3,500〜/月

---

## ✨ ハイライト

| 観点 | 特徴 |
|---|---|
| **AI 応答** | Gemini 3.1 Flash-Lite（Claude Haiku 比 -72% のコスト）+ RAG + 社長ペルソナ |
| **モデル切替可能** | YAML 1 行の変更で Gemini / OpenAI / Anthropic を切替／週次監視で自動 PR |
| **データ保護** | pgcrypto 列暗号化、Row Level Security 3 ロール、90 日自動削除 |
| **埋め込み容易** | Preact + Vite で gzip **7.6KB** の軽量ウィジェット |
| **管理画面** | Next.js 15 製の FAQ/応募者/予約/エスカレーション/GDPR/A/Bテスト画面 |
| **自動化** | GitHub Actions で日次ログ削除・週次モデル監視・月次 RAG 再構築 |
| **完全な IaC** | AWS RDS + Cloudflare Hyperdrive を Terraform で再現 |

---

## 🏗 アーキテクチャ

```
┌─ [顧客サイト]  （WordPress / 素HTML / Wix / STUDIO / 任意サーバー）
│   <script src=".../widget.js" data-tenant="g-line" async>
│                      ↓
├─ [フロント配信] Cloudflare Pages (無料)
│   widget.js (Preact + Vite, gzip 7.6KB)
│                      ↓ REST
├─ [API]  Cloudflare Workers (無料, エッジ)
│   Hono + ガードレール + RAG + Gemini 呼び出し + Resend 通知
│                      ↓ Hyperdrive
├─ [DB]   AWS RDS PostgreSQL 東京 (pgvector + pgcrypto)
│   7 テーブル + RLS + 2 ビュー
│
├─ [管理] Next.js 15 + shadcn/ui + Cloudflare Access
│   FAQ / 応募者 / 予約 / エスカレーション / GDPR / A/Bテスト
│
└─ [外部] Gemini API / Resend / GitHub Actions
```

---

## 📂 ディレクトリ構成

```
.
├── index.html                          ベストプラクティス 10 選（設計書）
├── requirements.html                   要件定義書 HTML 版
├── G-LINE-Requirements-v1.0.pdf        要件定義書 PDF 版（1.6MB）
└── template/
    ├── legal/                          法的文書（日英 プラポリ・利用規約・同意文言）
    ├── prompts/sanbo-persona.md        社長ペルソナ（A 案・熱意ある口調）
    ├── config/llm.yaml                 LLM モデル切替設定
    ├── eval/gline-50cases.json         評価テストケース（30 問）
    ├── db/                             schema.sql + migrations + seed
    ├── lib/                            db / rag / logger / guardrails
    ├── scripts/                        週次モデル監視 / RAG 再構築 / 分析
    ├── widget/                         埋め込みウィジェット（Preact + Vite）
    ├── api/cloudflare-workers/         Hono API（/api/chat /apply /event /gdpr）
    ├── admin/                          Next.js 15 管理画面
    ├── emails/                         React Email 5 テンプレート + Resend
    ├── e2e/                            Playwright E2E テスト 6 種
    ├── infra/terraform/                AWS RDS + Cloudflare Hyperdrive IaC
    └── .github/workflows/              daily-purge / llm-weekly-check / monthly-rag-rebuild
```

---

## 🚀 クイックスタート

### 1. AWS RDS + Cloudflare のプロビジョニング

```bash
cd template/infra/terraform
terraform init
terraform apply -var="env=dev"
```

### 2. DB スキーマ適用

```bash
cd template
npm install
cp .env.example .env       # DATABASE_URL 等を設定
npm run db:init            # schema + RLS
npm run db:seed            # FAQ 初期データ
npm run db:smoke           # 疎通確認
```

### 3. RAG 原稿投入

```bash
# 代表の本・HP 原稿を rag_sources/*.txt に配置
npm run rag:rebuild
```

### 4. API デプロイ（Cloudflare Workers）

```bash
cd template/api/cloudflare-workers
npm install
npx wrangler hyperdrive create gline-pg --connection-string="$DATABASE_URL"
npx wrangler secret put GEMINI_API_KEY
npx wrangler deploy
```

### 5. ウィジェットをサイトに埋め込み

```html
<script
  src="https://widget.example.com/widget.js"
  data-tenant="g-line-001"
  async
></script>
```

WordPress・Wix・STUDIO 等の貼り付け方は `template/widget/embed-examples/` 参照。

### 6. 管理画面起動（任意）

```bash
cd template/admin
npm install --legacy-peer-deps
npm run dev   # http://localhost:3000/admin
```

---

## 🛠 技術スタック

| レイヤー | 採用技術 |
|---|---|
| LLM | Google Gemini 3.1 Flash-Lite（text-embedding-004 含む）|
| API | Cloudflare Workers + Hono + postgres.js |
| DB | AWS RDS PostgreSQL 16（db.t4g.micro 東京）+ pgvector + pgcrypto |
| DB プール | Cloudflare Hyperdrive |
| フロント | Preact + Vite + TypeScript strict（IIFE バンドル）|
| 管理画面 | Next.js 15 App Router + shadcn/ui + react-hook-form + zod |
| メール | React Email + Resend |
| 認証 | Cloudflare Access（管理画面）|
| 監視 | Cloudflare Analytics + Sentry Free |
| BI | Metabase Cloud Free |
| CI/CD | GitHub Actions |
| IaC | Terraform（AWS + Cloudflare）|
| テスト | Playwright + axe-playwright（WCAG 2.1 AA）|

---

## 💰 月額コスト試算（中規模：月1,800対話想定）

| 項目 | 初年度 | 2年目以降 |
|---|---|---|
| Cloudflare Workers + Pages | ¥0 | ¥0 |
| AWS RDS db.t4g.micro 東京 | ¥0（12ヶ月無料）| ¥3,450 |
| Gemini API | ¥200〜¥900 | ¥200〜¥900 |
| Resend / Metabase / Sentry | ¥0 | ¥0 |
| **合計** | **¥500〜¥1,200** | **¥3,950〜¥4,650** |

---

## 📋 コンプライアンス

- **APPI（個人情報保護法）**: 東京リージョン保管、越境移転なし、90 日匿名化、削除請求対応
- **GDPR**: 忘れられる権利対応、DPA 準拠
- **ISMAP**: AWS / Cloudflare ともに対応済
- **SOC 2 Type 2 / ISO 27001 / ISO 27701**: インフラ側で取得済
- **WCAG 2.1 AA**: E2E で自動チェック

法務レビュー用コメントは `template/legal/privacy-policy-ja.md` 内の `<!-- LEGAL REVIEW: ... -->` を参照。

---

## 📑 関連ドキュメント

| ドキュメント | 用途 |
|---|---|
| [要件定義書 PDF](./G-LINE-Requirements-v1.0.pdf) | 代表・採用担当への共有用 |
| [ベストプラクティス10選](./index.html) | 設計思想の記録 |
| [プライバシーポリシー（日）](./template/legal/privacy-policy-ja.md) | 法務レビュー対象 |
| [プライバシーポリシー（英）](./template/legal/privacy-policy-en.md) | 海外応募者向け |
| [ダッシュボード SQL 集](./template/docs/dashboard-queries.md) | Metabase 接続後に利用 |
| [管理画面 README](./template/admin/README.md) | 運用担当向け |
| [Terraform README](./template/infra/terraform/README.md) | インフラ担当向け |

---

## 🗺 ロードマップ

### ✅ Phase 0（完了）
- 要件定義書 v1.0
- LLM 切替可能テンプレート（Gemini 3.1 Flash-Lite）
- DB スキーマ + RLS + pgvector
- Cloudflare Workers API
- 埋め込みウィジェット
- 管理画面 + A/Bテスト UI
- E2E テスト
- 法的文書
- Terraform IaC

### 🔄 Phase 1（進行予定）
- [ ] 法務レビュー完了
- [ ] 実 AWS RDS 環境構築
- [ ] 実ドメイン取得・DNS 設定
- [ ] 代表著書・HP の RAG 原稿投入
- [ ] β 版テスト

### 🚀 Phase 2（本番運用）
- [ ] 2026-06-01 公開
- [ ] KPI 監視（週次レビュー）
- [ ] FAQ 継続更新
- [ ] モデル週次監視 → 自動切替

---

## 📝 コミット履歴

```
feat: A/Bテスト管理 UI を管理画面に追加 (Codex-4)
feat: 管理画面/メール通知/E2E/法的文書を追加（Codex + Claude 並列）
feat: Phase 1-4 実装完了（DB + API + Widget + Terraform IaC）
feat: G-LINE採用チャットボット 要件定義書 v1.0 + 実装雛形
```

---

## 📄 ライセンス

Private / Proprietary — 無断での複製・二次配布禁止。社内利用のみ。

---

## 👥 Contributors

Initial implementation by Claude Opus 4.7 & Codex GPT-5.4 (agent delegation).
