# ローカル開発環境セットアップ

Docker Compose で PostgreSQL (pgvector 同梱) を起動し、Gemini API だけでローカル動作確認する手順。

**所要時間：15〜20分**
**前提：Docker Desktop 起動、Gemini API キー取得済み**

---

## 1. DB 起動

```bash
cd template
docker compose up -d
docker compose logs -f postgres   # スキーマ適用完了まで確認（Ctrl+C で抜ける）
```

初回起動時、`db/schema.sql` → `migrations/0002/0003/0004` → `seed.sql` が自動適用されます。
ホスト側ポート: **5433**（既存 PostgreSQL と衝突回避）

停止: `docker compose down`（データ保持）
完全削除: `docker compose down -v`（ボリュームも削除）

## 2. 環境変数設定

プロジェクトルート (`template/`) に `.env.local` を作成：

```bash
DATABASE_URL=postgresql://gline_dev:dev_password_change_me@localhost:5433/gline_chatbot?sslmode=disable
GEMINI_API_KEY=<Google AI Studio で取得したキー>
APPLICANT_ENC_KEY=local-dev-key-change-in-prod-ABCDEFGHIJKLMNOP
SESSION_SALT=local-dev-salt-change-me
```

## 3. 疎通確認

```bash
cd template
npm install
export $(cat .env.local | xargs)   # Git Bash / Linux
# PowerShell: Get-Content .env.local | ForEach-Object { $k,$v = $_.Split('='); [Environment]::SetEnvironmentVariable($k, $v) }

npm run db:smoke
```

以下が出れば OK：
```
[OK] version: PostgreSQL 16.x
[OK] extensions: vector, pgcrypto, pg_trgm
[OK] tables: applicants, appointments, audit_log, conversations, ...
```

## 4. RAG 原稿投入（任意、代表の本など）

```bash
mkdir -p rag_sources
# *.txt/.md をここに置く
npm run rag:rebuild
```

## 5. Workers API をローカル起動

```bash
cd template/api/cloudflare-workers
npm install

# wrangler.toml に localConnectionString を追加するか、env 変数で渡す
# wrangler dev はデフォルトで .dev.vars を読み込む
cat > .dev.vars <<EOF
GEMINI_API_KEY=<同上>
APPLICANT_ENC_KEY=local-dev-key-change-in-prod-ABCDEFGHIJKLMNOP
SESSION_SALT=local-dev-salt-change-me
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:4173
ENVIRONMENT=development
EOF

# Hyperdrive のローカル接続文字列を指定して起動
npx wrangler dev --var HYPERDRIVE_LOCAL_CONNECTION_STRING:postgresql://gline_dev:dev_password_change_me@localhost:5433/gline_chatbot
# → http://127.0.0.1:8787
```

別タブで疎通確認：
```bash
curl http://127.0.0.1:8787/api/health
# → {"ok":true,"ts":...}

curl -X POST http://127.0.0.1:8787/api/chat \
  -H "Content-Type: application/json" \
  -H "Origin: http://localhost:5173" \
  -d '{"sessionId":"test-01","message":"御社の強みは？"}'
```

## 6. Widget をローカル起動

```bash
cd template/widget
npm install
npm run dev
# → http://localhost:5173
```

ブラウザで http://localhost:5173 を開き、右下の「💬 採用のご質問はこちら」をクリック。

## 7. 管理画面をローカル起動（任意）

```bash
cd template/admin
npm install --legacy-peer-deps

cat > .env.local <<EOF
APP_ADMIN_DATABASE_URL=postgresql://gline_dev:dev_password_change_me@localhost:5433/gline_chatbot?sslmode=disable
APPLICANT_ENC_KEY=local-dev-key-change-in-prod-ABCDEFGHIJKLMNOP
ADMIN_ALLOWED_EMAILS=dev@local
EOF

npm run dev
# → http://localhost:3000/admin
```

ローカル開発では Cloudflare Access がないため、middleware.ts で `cf-access-authenticated-user-email` を擬似する必要があります。Chrome 拡張 `ModHeader` などで以下を追加：
- Header Name: `cf-access-authenticated-user-email`
- Value: `dev@local`

---

## トラブルシュート

| 症状 | 対処 |
|---|---|
| Docker で pg が起動しない | `docker compose logs postgres` でエラー確認。ポート 5433 競合なら他ポートに |
| `smoke-test-db` が ssl エラー | DATABASE_URL に `?sslmode=disable` が付いているか確認 |
| Workers から DB に繋がらない | `wrangler dev` の `--var HYPERDRIVE_LOCAL_CONNECTION_STRING` 確認 |
| Gemini API が 429 | 無料枠レート制限。少し待って再試行 |
| CORS エラー | `.dev.vars` の `ALLOWED_ORIGINS` に widget の URL を含める |

---

## クリーンアップ

```bash
cd template
docker compose down -v    # DB データも削除
```
