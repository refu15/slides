// ============================================================
// Metabase 接続確認 & KPI スポットチェック
// 実行: npx tsx scripts/export-analytics.mts
// ============================================================

import { sql } from '../lib/db.ts'

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is not set')
  process.exit(1)
}

const q = sql()

async function run(label: string, body: () => Promise<unknown[]>) {
  console.log(`\n=== ${label} ===`)
  try {
    const rows = await body()
    console.table(rows)
  } catch (e) {
    console.error(`  (skipped: ${(e as Error).message})`)
  }
}

await run('テーブル一覧', () => q`
  SELECT table_name FROM information_schema.tables
  WHERE table_schema = 'public' ORDER BY table_name
`)

await run('週次 KPI（直近8週）', () => q`
  SELECT * FROM v_kpi_weekly LIMIT 8
`)

await run('エスカレーション理由 TOP5', () => q`
  SELECT reason, COUNT(*)::int AS n
  FROM escalations
  WHERE created_at > NOW() - INTERVAL '30 days'
  GROUP BY reason
  ORDER BY n DESC
  LIMIT 5
`)

await run('RAG ヒット率（直近7日）', () => q`
  SELECT
    COUNT(*) FILTER (WHERE event_type = 'rag_hit')::int  AS hit,
    COUNT(*) FILTER (WHERE event_type = 'rag_miss')::int AS miss,
    ROUND(
      100.0 * COUNT(*) FILTER (WHERE event_type = 'rag_hit')
           / NULLIF(COUNT(*) FILTER (WHERE event_type IN ('rag_hit', 'rag_miss')), 0),
      1
    )::float AS hit_rate_pct
  FROM events
  WHERE created_at > NOW() - INTERVAL '7 days'
`)

console.log('\nMetabase 接続 URL（パスワード伏せ）:')
console.log(`  ${process.env.DATABASE_URL!.replace(/:([^@]+)@/, ':***@')}`)
