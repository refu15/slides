# G-LINE 採用チャットボット｜LLM 切替可能テンプレート

Gemini 3.1 Flash-Lite をデフォルトに、将来より安く/強いモデルが出たら **YAML 1行変更だけで乗り換えられる** 雛形。週次で自動監視し、切替候補を PR で提案します。

## ディレクトリ構成

```
template/
├── config/llm.yaml                         # モデル設定の単一ソース
├── lib/
│   ├── llm.ts                              # LLM Adapter 層（Gemini/OpenAI/Anthropic）
│   ├── db.ts                               # Neon PostgreSQL クライアント
│   ├── rag.ts                              # pgvector 検索 + Gemini 埋込
│   ├── logger.ts                           # 会話ログ匿名化 + 保存
│   └── guardrails.ts                       # 禁止トピック検知
├── db/
│   ├── schema.sql                          # 全体スキーマ（pgvector 含む）
│   ├── migrations/
│   │   ├── 0001_init.sql
│   │   └── 0002_rls_policies.sql           # Row Level Security
│   └── seed.sql                             # FAQ 初期データ
├── prompts/sanbo-persona.md                # 社長ペルソナ（A案口調）
├── eval/gline-50cases.json                 # LLM 評価テストケース
├── rag_sources/                             # 代表の本・自叙伝・HP原稿 (*.txt)
├── scripts/
│   ├── fetch-models.mjs                    # Gemini モデル一覧取得
│   ├── diff-and-eval.mjs                   # 差分検知 & 自動評価
│   ├── report-slack.mjs                    # 週次 Slack レポート
│   ├── chat-cli.mts                        # ローカル対話 CLI
│   ├── smoke-test.mts                      # LLM Adapter スモークテスト
│   ├── smoke-test-db.mts                   # DB 疎通テスト
│   ├── rebuild-rag-index.mjs               # RAG 再構築
│   └── export-analytics.mjs                # KPI スポットチェック
├── .github/workflows/
│   ├── llm-weekly-check.yml                # 週次 LLM モデル監視
│   ├── daily-purge.yml                     # 日次 90日超ログ削除
│   └── monthly-rag-rebuild.yml             # 月次 RAG 再構築
├── docs/
│   └── dashboard-queries.md                # Metabase 推奨 SQL 集
├── package.json
├── .env.example
└── .gitignore
```

## クイックスタート

### A. LLM 層だけ試す（Neon 不要）

```bash
npm ci
cp .env.example .env
# → GEMINI_API_KEY を記入
npm run chat -- "御社の強みは？"
npm run check-models
```

### B. DB 含めた完全構成

```bash
# 1. Neon プロジェクト作成（https://console.neon.tech）
#    - Region: AWS Asia Pacific (Tokyo) - ap-northeast-1
#    - Database name: gline_chatbot

# 2. 接続文字列を .env の DATABASE_URL に設定
#    APPLICANT_ENC_KEY / SESSION_SALT もランダム文字列で設定

# 3. スキーマ & RLS 適用
npm run db:init

# 4. FAQ 初期データ投入
npm run db:seed

# 5. 疎通確認
npm run db:smoke

# 6. RAG 原稿を配置して埋込
mkdir -p rag_sources
# → rag_sources/book.txt, rag_sources/website.txt などを配置
npm run rag:rebuild

# 7. スポット分析
npm run analytics
```

## GitHub Actions セットアップ

リポジトリの **Settings → Secrets and variables → Actions** で以下を登録：

| Secret 名 | 用途 |
|---|---|
| `GEMINI_API_KEY` | Gemini API の利用 + モデル一覧取得 + 埋込生成 |
| `DATABASE_URL` | Neon PostgreSQL 接続文字列 |
| `APPLICANT_ENC_KEY` | 応募者個人情報の暗号化鍵（32バイト以上） |
| `SESSION_SALT` | session_id ハッシュ化ソルト |
| `SLACK_WEBHOOK`  | 週次レポート投稿先（任意） |
| `RESEND_API_KEY` | info メール通知用（任意） |
| `OPENAI_API_KEY` | LLM フォールバック用（任意） |
| `ANTHROPIC_API_KEY` | LLM フォールバック用（任意） |

毎週月曜 09:00 JST に自動実行されます。手動実行は Actions タブの「Run workflow」から。

## モデル切替の流れ

1. 月曜朝：ワークフローが新モデルを検知
2. Eval 50問で自動評価（スコア 0.85 以上 かつ 現行より安い → 合格）
3. 合格なら **切替 PR を自動作成**
4. 人間は PR をレビューして merge するだけ
5. 障害時は `config/llm.yaml` の `current` を戻して merge → 即ロールバック

## A/B テスト

`config/llm.yaml` の `ab_test` を有効化：

```yaml
ab_test:
  enabled: true
  candidate_model: gemini-3.2-flash-lite-preview
  traffic_percentage: 10   # 10% のユーザーに新モデルを割当
  start_date: 2026-04-21
```

7日後にログ集計 → 問題なければ `current` を書き換えて全量切替。

## 依存先

- [Google Generative AI SDK](https://ai.google.dev/)
- [LiteLLM](https://docs.litellm.ai/)（Node 実装の場合は `@litellm/node` or 自作 Adapter）
- [js-yaml](https://www.npmjs.com/package/js-yaml)

## ライセンス

MIT
