# 運用 Runbook

G-LINE 採用チャットボットの日常運用・障害対応の手順書。採用担当・開発事業者・代表が必要に応じて参照する。

---

## 🚨 障害対応フロー

### レベル定義

| レベル | 症状 | 初動時間目標 |
|---|---|---|
| **P0 致命的** | サイト全停止、PII 漏洩疑い、DB データ破損 | **15分以内** |
| **P1 高** | チャット応答不可、応募フォーム停止 | 1時間以内 |
| **P2 中** | 特定機能不可、レイテンシ悪化 | 営業時間内 |
| **P3 低** | 軽微な表示崩れ、UX 改善 | 翌営業日 |

### P0 / P1 発生時の初動

1. **障害検知**（Sentry / Slack `#gline-ops` / Uptime 監視から）
2. **一次切り分け**:
   - Cloudflare Workers 側か？ → `npx wrangler tail` でログ確認
   - DB 側か？ → AWS RDS Console でメトリクス確認
   - LLM 側か？ → Gemini Status Page を確認
3. **Slack `#gline-ops` で状況共有**（時刻・症状・想定原因）
4. **ユーザーへの影響範囲** を推定
5. **ロールバック検討**:
   - Workers: `npx wrangler rollback` で前バージョンへ
   - Admin: Vercel で前デプロイに戻す
   - DB: Point-in-time Recovery（7日以内）
6. **根本原因調査** → 修正 → デプロイ → モニタリング
7. **事後報告書作成**（下記フォーマット）

### Workers ロールバック手順

```bash
cd template/api/cloudflare-workers
npx wrangler deployments list --env production | head -5
npx wrangler rollback [DEPLOYMENT_ID] --env production
```

### DB Point-in-time Recovery

```bash
aws rds restore-db-instance-to-point-in-time \
  --source-db-instance-identifier gline-db-production \
  --target-db-instance-identifier gline-db-recovery-$(date +%Y%m%d) \
  --restore-time "2026-04-20T09:30:00Z"
```

---

## 📧 応募者対応

### 新規応募が来たら

1. info メール通知を受領（応募者IDと管理画面リンク）
2. 管理画面 `/admin/applicants` で詳細を閲覧（暗号化復号される）
3. 必要に応じて電話/メールで返信
4. 面接予約確定 → `/admin/appointments` に登録
5. 自動で確認メールが送信される（`appointment-confirmed`）

### キャンセル受付

- 応募者から電話 or メールでキャンセル依頼
- 管理画面 `/admin/appointments` で `status = cancelled` に更新
- 通知は自動送信しない（個別対応が基本）

### 削除請求対応（GDPR / APPI）

#### 受付ルート
- メール: `info@g-line.co.jp`
- チャット: AI が「削除希望」を検知 → エスカレーション自動起票
- 応募フォーム下部の削除申請リンク

#### 対応手順（7日以内受付・30日以内処理）
1. 管理画面 `/admin/gdpr` を開く
2. 請求者メール入力 → 検索
3. 該当応募者を確認（本人確認書類と照合）
4. 「削除します」と入力 + 2段階確認で物理削除ボタン
5. 会話ログ・イベント・エスカレーションも cascade 削除（Migration 0003）
6. 削除完了メール送信（`gdpr-acknowledged` テンプレート）
7. 監査ログ（audit_log）に記録

---

## 📅 日次・週次・月次オペレーション

### 日次（自動・担当: 自動ワークフロー）
- 03:30 JST: 90日超の会話ログ自動削除（`daily-purge.yml`）
- 管理画面で前日のエスカレーション件数を確認（代表/採用担当）

### 週次（担当: 代表・採用担当）
- **月曜朝**: 先週の KPI レビュー（`/admin` ダッシュボード）
  - 応募転換率・エスカレーション率・RAG ヒット率
- **月曜朝**: LLM モデル監視 PR 確認（`llm-weekly-check.yml` 実行結果）
  - 合格した新モデルがあれば merge
- **週次 Persona 改訂案 PR**: `/admin/persona` で diff 確認

### 月次（担当: 開発事業者）
- 1日 00:00 JST: RAG ベクトル再構築（`monthly-rag-rebuild.yml`）
- 月末: コストレビュー（AWS Billing / Cloudflare / Gemini）
- 月末: Sentry エラー傾向レビュー

### 四半期（担当: 代表 + 開発事業者）
- プロンプト・ペルソナ見直し会議
- Eval ケースの追加・更新
- セキュリティ監査（外部ペネトレーションテスト計画）

### 年次（担当: 開発事業者）
- ペネトレーションテスト実施
- KMS 鍵ローテーション
- 法務レビュー（プラポリ更新が必要なら）
- 依存ライブラリの major version 更新

---

## 🛠 よくある作業

### FAQ 追加・編集

1. 管理画面 `/admin/faq` にログイン
2. 「新規作成」ボタン
3. カテゴリ・質問・回答・キーワードを入力
4. 「公開」トグル ON
5. 保存 → 即反映（revalidate: 0）

### RAG 原稿追加（代表の新著出版等）

```bash
cd template
# 新原稿を rag_sources/ に追加
cp /path/to/new-book.txt rag_sources/2026-new-book.txt
git add rag_sources/
git commit -m "rag: 新著を追加"
git push
# → GitHub Actions が自動で persona-learn.yml 実行
# → 改訂案 PR 作成
# → /admin/persona でレビュー → 採用
```

### モデル切替（新 Gemini がリリース時）

- 自動: `llm-weekly-check.yml` が検知して PR 作成
- 手動: `config/llm.yaml` の `current.model` を編集 → commit

---

## 📊 ダッシュボード URL

- 管理画面: `https://admin.gline-bot.example.jp/admin`
- Metabase: `https://metabase.example.jp`
- Cloudflare Analytics: CF Dashboard → Workers → Analytics
- Sentry: `https://sentry.io/organizations/g-line/`
- Uptime: Better Uptime / UptimeRobot
- Slack `#gline-ops`

---

## 📞 緊急連絡先

| 役割 | 連絡先 | 対応時間 |
|---|---|---|
| 代表 | 要記入 | 24時間（緊急のみ） |
| 採用担当 | 要記入 | 平日 9-17時 |
| 開発事業者 | 要記入 | 24時間以内初動 |
| AWS サポート | Business プラン | 24時間 |
| Cloudflare サポート | Free プラン | ベストエフォート |

---

## 📝 事後報告書フォーマット

障害後 24時間以内に作成し、`docs/operations/incidents/YYYY-MM-DD-<title>.md` に保存:

```markdown
# 事後報告書: [タイトル]

## 概要
- 発生日時: YYYY-MM-DD HH:MM JST
- 復旧日時: YYYY-MM-DD HH:MM JST
- 影響時間: N 分
- 影響範囲: [ユーザー・機能]

## タイムライン
- HH:MM 検知
- HH:MM 切り分け完了
- HH:MM ロールバック実施
- HH:MM 復旧確認

## 根本原因
[技術的な原因を記述]

## 影響
- 応募者数: N 名
- PII 漏洩: なし / あり
- メディア露出: なし / あり

## 対策
- 短期: [即実施済み]
- 中期: [1週間以内に実施]
- 長期: [1ヶ月以内に実施]

## 責任者署名
- 開発事業者: _______
- 代表承認: _______
```
