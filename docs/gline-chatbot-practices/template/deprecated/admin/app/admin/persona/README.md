# /admin/persona — ペルソナ管理

代表（社長）の分身としての応答スタイル（`prompts/sanbo-persona.md`）を管理する画面。GitHub Actions の `persona-learn.yml` が自動生成した改訂案 PR を、ブラウザ上で diff 確認 → 採用 / 却下 / 微修正できる。

## 機能

- **現在のペルソナ表示**: main ブランチの `sanbo-persona.md` 全文
- **改訂案 PR 一覧**: `persona` ラベル付きの open PR
- **Diff Viewer**: 行単位の追加 / 削除表示（`diff` パッケージ使用）
- **採用**: Squash merge で main に反映
- **却下**: 理由を PR コメントに追加して close（次回分析に反映）
- **微修正**: PR ブランチに直接 commit 追加

## 必要な環境変数

`admin/.env.local` に以下を設定:

```bash
# GitHub API（PR 操作用。scope: contents:write, pull_requests:write）
GITHUB_TOKEN=ghp_xxxxx

# リポジトリ owner/name
GITHUB_REPO=refu15/gline-chatbot

# ペルソナファイルのリポジトリ内パス（既定: prompts/sanbo-persona.md）
PERSONA_PATH=prompts/sanbo-persona.md
```

## 必要な依存

`admin/package.json`:

```json
"dependencies": {
  "@octokit/rest": "^21.0.0",
  "diff": "^7.0.0"
},
"devDependencies": {
  "@types/diff": "^7.0.0"
}
```

インストール:

```bash
cd template/admin
npm install --legacy-peer-deps
```

## Server Actions

- `approvePersona(prNumber)`: PR を squash merge
- `rejectPersona(prNumber, reason)`: PR にコメント + close
- `editAndCommitPersona(prNumber, editedContent)`: PR ブランチに commit 追加
- `addFewShotFromConversation(conversationId)`: 会話から Q&A を抽出して新規 PR 作成

## ファイル構成

```
app/admin/persona/
├── page.tsx                    Server Component（一覧・diff 表示）
├── diff-viewer.tsx             Client（diffLines 行単位ビュー）
├── persona-actions-ui.tsx      Client（採用/却下/微修正ボタン + Dialog）
├── actions.ts                  Server Actions（Octokit）
└── README.md                   このファイル
```

## 使用フロー

1. `rag_sources/` にテキスト原稿を追加して commit & push
2. GitHub Actions `persona-learn.yml` が実行され、差分があれば PR 自動作成
3. `/admin/persona` で diff を確認
4. 代表が「採用」をクリック → main に merge → 本番反映

## セキュリティ

- 管理画面全体は `middleware.ts` で Cloudflare Access 認証
- `GITHUB_TOKEN` は Server Actions 内でのみ使用、client には漏れない
- `ADMIN_ALLOWED_EMAILS` に含まれるメールのみアクセス可
