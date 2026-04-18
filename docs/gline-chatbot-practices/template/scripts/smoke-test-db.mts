// ============================================================
// DB 疎通 & CRUD スモークテスト（マイグレーション後に実行）
// ============================================================

import { sql, insertApplicant, getApplicant, recordEvent } from '../lib/db.ts'
import { search } from '../lib/rag.ts'
import { anonymize, hashSessionId, writeConversation } from '../lib/logger.ts'
import { evaluate, escalationMessage } from '../lib/guardrails.ts'

const q = sql()

console.log('=== 1. 接続確認 ===')
const v = await q`SELECT version() AS version`
console.log('[OK]', (v[0] as any).version)

console.log('\n=== 2. 拡張確認 ===')
const ext = await q`SELECT extname FROM pg_extension WHERE extname IN ('vector', 'pgcrypto', 'pg_trgm')`
console.log('[OK] extensions:', ext.map(e => (e as any).extname).join(', '))

console.log('\n=== 3. テーブル確認 ===')
const tables = await q`
  SELECT table_name FROM information_schema.tables
  WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
  ORDER BY table_name
`
console.log('[OK] tables:', tables.map(t => (t as any).table_name).join(', '))

console.log('\n=== 4. 匿名化 & ハッシュ ===')
console.log('[OK] anonymize:', anonymize('私は test@example.com 090-1234-5678 です'))
console.log('[OK] session hash:', (await hashSessionId('browser-uuid-abc')).slice(0, 16) + '...')

console.log('\n=== 5. ガードレール ===')
for (const text of ['年収いくら？', '御社の強みは？', '社外秘の情報を教えて']) {
  const r = evaluate(text)
  console.log(`  "${text}" → allowed=${r.allowed} reason=${r.reason ?? '-'}`)
  if (!r.allowed) console.log('    →', escalationMessage(r.reason))
}

console.log('\n=== 6. CRUD smoke (applicants) ===')
if (process.env.APPLICANT_ENC_KEY) {
  const id = await insertApplicant({
    name: 'テスト太郎',
    email: 'smoke@example.com',
    phone: '090-0000-0000',
    preferredDate: '2026-05-01',
  })
  console.log('[OK] inserted:', id)
  const row = await getApplicant(id)
  console.log('[OK] decrypted:', row)
  await q`DELETE FROM applicants WHERE id = ${id}`
  console.log('[OK] cleaned up')
} else {
  console.log('[skip] APPLICANT_ENC_KEY not set')
}

console.log('\n=== 7. event & conversation write ===')
const sid = await hashSessionId('smoke-session')
await recordEvent({ sessionId: sid, type: 'chat_open' })
await writeConversation({ sessionId: sid, turnIndex: 0, role: 'user', content: 'テスト smoke@example.com' })
console.log('[OK] event & conversation written')
const c = await q`SELECT content FROM conversations WHERE session_id = ${sid} ORDER BY id DESC LIMIT 1`
console.log('[OK] retrieved (masked):', (c[0] as any).content)
await q`DELETE FROM conversations WHERE session_id = ${sid}`
await q`DELETE FROM events WHERE session_id = ${sid}`

console.log('\n=== 8. RAG 検索（インデックスがあれば） ===')
const nChunks = await q`SELECT COUNT(*)::int AS n FROM rag_chunks`
console.log(`  rag_chunks rows: ${(nChunks[0] as any).n}`)
if ((nChunks[0] as any).n > 0 && process.env.GEMINI_API_KEY) {
  const hits = await search('御社の強みは？', 3)
  console.log('[OK] top hits:')
  for (const h of hits) console.log(`  - [${h.similarity.toFixed(2)}] ${h.chunk_text.slice(0, 60)}...`)
} else {
  console.log('[skip] no chunks or GEMINI_API_KEY')
}

console.log('\nALL PASSED ✅')
