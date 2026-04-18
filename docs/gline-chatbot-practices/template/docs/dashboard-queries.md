# Metabase 推奨 SQL 集

Metabase Cloud Free（1ユーザー・無料）を Neon PostgreSQL に接続し、以下のクエリをベースに「採用ボット運用ダッシュボード」を構築します。

## 接続設定

- **Database type**: PostgreSQL
- **Host**: `ep-xxx.ap-northeast-1.aws.neon.tech`
- **Port**: `5432`
- **Database name**: `gline_chatbot`
- **Username**: `app_analytics`（分析専用ロール）
- **Password**: Neon Console で発行
- **SSL**: 必須 (`sslmode=require`)

`app_analytics` ロールは匿名化ビューと faq/events のみ SELECT 可能。個人情報（applicants / conversations の原文）にはアクセスできません。

---

## 週次 KPI ダッシュボード（採用担当者用）

### 1. 週次サマリ
```sql
SELECT * FROM v_kpi_weekly LIMIT 12;
```

### 2. 応募フォーム遷移率（週次）
```sql
SELECT week, unique_users, apply_clicks, apply_conversion_pct
FROM v_kpi_weekly
ORDER BY week DESC
LIMIT 12;
```

### 3. 頻出質問カテゴリ TOP10（直近30日）
```sql
SELECT
  metadata->>'category' AS category,
  COUNT(*) AS count
FROM events
WHERE event_type = 'ask'
  AND created_at > NOW() - INTERVAL '30 days'
GROUP BY metadata->>'category'
ORDER BY count DESC
LIMIT 10;
```

### 4. エスカレーション理由 TOP5（直近30日）
```sql
SELECT reason, COUNT(*) AS count
FROM escalations
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY reason
ORDER BY count DESC;
```

### 5. RAG ヒット率（直近7日）
```sql
SELECT
  COUNT(*) FILTER (WHERE event_type = 'rag_hit')  AS hit,
  COUNT(*) FILTER (WHERE event_type = 'rag_miss') AS miss,
  ROUND(
    100.0 * COUNT(*) FILTER (WHERE event_type = 'rag_hit')
         / NULLIF(COUNT(*) FILTER (WHERE event_type IN ('rag_hit','rag_miss')), 0),
    1
  ) AS hit_rate_pct
FROM events
WHERE created_at > NOW() - INTERVAL '7 days';
```

### 6. モデル別コスト試算（直近30日）
```sql
SELECT
  model,
  COUNT(*)          AS calls,
  SUM(tokens_in)    AS total_in,
  SUM(tokens_out)   AS total_out,
  ROUND((SUM(tokens_in)  * 0.25 / 1000000.0)::numeric, 2) AS est_cost_in_usd,
  ROUND((SUM(tokens_out) * 1.50 / 1000000.0)::numeric, 2) AS est_cost_out_usd
FROM conversations
WHERE role = 'assistant'
  AND created_at > NOW() - INTERVAL '30 days'
GROUP BY model
ORDER BY calls DESC;
```

### 7. 時間帯ヒートマップ（質問の多い時間）
```sql
SELECT
  EXTRACT(DOW FROM created_at)::int  AS day_of_week,   -- 0=日, 6=土
  EXTRACT(HOUR FROM created_at)::int AS hour,
  COUNT(*) AS count
FROM events
WHERE event_type = 'ask'
  AND created_at > NOW() - INTERVAL '30 days'
GROUP BY day_of_week, hour
ORDER BY day_of_week, hour;
```

### 8. 平均応答レイテンシ（モデル別）
```sql
SELECT
  model,
  COUNT(*)               AS calls,
  ROUND(AVG(latency_ms)) AS avg_ms,
  ROUND(PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY latency_ms)) AS p50_ms,
  ROUND(PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY latency_ms)) AS p95_ms
FROM conversations
WHERE role = 'assistant'
  AND created_at > NOW() - INTERVAL '7 days'
GROUP BY model;
```

---

## 未回答検出クエリ（GitHub Issue 自動起票用）

### 9. エスカレーションされた質問（人間対応が必要）
```sql
SELECT
  e.id,
  e.session_id,
  e.reason,
  e.trigger_message,
  e.status,
  e.created_at
FROM escalations e
WHERE e.status = 'open'
  AND e.created_at > NOW() - INTERVAL '7 days'
ORDER BY e.created_at DESC;
```

### 10. RAG でヒットしなかった質問（FAQ追加の候補）
```sql
SELECT
  c.content AS question,
  COUNT(*)  AS appeared_count,
  MAX(c.created_at) AS last_seen
FROM conversations c
JOIN events e
  ON e.session_id = c.session_id
 AND e.event_type = 'rag_miss'
 AND e.created_at BETWEEN c.created_at - INTERVAL '10 seconds' AND c.created_at + INTERVAL '10 seconds'
WHERE c.role = 'user'
  AND c.created_at > NOW() - INTERVAL '30 days'
GROUP BY c.content
HAVING COUNT(*) >= 2
ORDER BY appeared_count DESC
LIMIT 20;
```

---

## ダッシュボード構成例

**「G-LINE 採用ボット Weekly」**（採用担当・代表共有）

| 行 | 列1 | 列2 |
|---|---|---|
| 1 | 週次利用者数（折れ線） | 応募遷移率（折れ線） |
| 2 | 頻出カテゴリ TOP10（棒） | エスカレーション理由（円） |
| 3 | 時間帯ヒートマップ | RAG ヒット率（数値） |
| 4 | モデル別コスト（表） | 平均レイテンシ（表） |

Metabase Free は 1ユーザー制限ですが、**読み取り専用の共有リンク**が無料で発行できるため、採用担当・代表の2名であれば追加料金なしで運用できます。
