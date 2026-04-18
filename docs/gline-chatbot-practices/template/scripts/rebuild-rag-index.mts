// ============================================================
// RAG ベクトルインデックス再構築
//   rag_sources/*.txt を読み込み、rag_chunks を一旦クリアして再埋込。
// 実行: npx tsx scripts/rebuild-rag-index.mts
// ============================================================

import fs from 'node:fs'
import path from 'node:path'
import { ingest } from '../lib/rag.ts'
import { sql } from '../lib/db.ts'

const SOURCES_DIR = './rag_sources'

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is not set')
  process.exit(1)
}
if (!process.env.GEMINI_API_KEY) {
  console.error('GEMINI_API_KEY is not set')
  process.exit(1)
}

if (!fs.existsSync(SOURCES_DIR)) {
  fs.mkdirSync(SOURCES_DIR, { recursive: true })
  fs.writeFileSync(
    path.join(SOURCES_DIR, 'README.txt'),
    '代表の本・自叙伝・会社HP・募集要項を .txt ファイルとしてここに置いてください。\nファイル名がそのまま source タグになります。\n',
  )
  console.log(`Created ${SOURCES_DIR}/ — ソース原稿を置いてから再実行してください。`)
  process.exit(0)
}

const files = fs.readdirSync(SOURCES_DIR).filter(f => f.endsWith('.txt') && f !== 'README.txt')
if (files.length === 0) {
  console.error(`No .txt files in ${SOURCES_DIR}/`)
  process.exit(1)
}

const q = sql()
console.log('Truncating rag_chunks...')
await q`TRUNCATE TABLE rag_chunks`

let total = 0
for (const f of files) {
  const text = fs.readFileSync(path.join(SOURCES_DIR, f), 'utf8')
  const source = path.basename(f, '.txt')
  console.log(`Ingesting ${f} (${text.length} chars)...`)
  const n = await ingest({ source, sourceRef: f, text })
  console.log(`  ${n} chunks indexed`)
  total += n
}

console.log(`\nDone. Total chunks: ${total}`)
