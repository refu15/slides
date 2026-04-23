// ============================================================
// rag_sources/*.txt / *.md から chunks.json を生成（Lite 版）
//
// 実行: GEMINI_API_KEY=... npx tsx scripts/build-rag-chunks.mts
// 出力: api/cloudflare-workers/chunks.json（Workers にバンドルされる）
// ============================================================

import fs from 'node:fs'
import path from 'node:path'
import { chunk, embed, mapConcurrent, type StoredChunk } from '../lib/rag.ts'

const SOURCES_DIR = path.resolve('./rag_sources')
const OUTPUT_PATH = path.resolve('./api/cloudflare-workers/chunks.json')

const apiKey = process.env.GEMINI_API_KEY
if (!apiKey) {
  console.error('GEMINI_API_KEY is not set')
  process.exit(1)
}

if (!fs.existsSync(SOURCES_DIR)) {
  fs.mkdirSync(SOURCES_DIR, { recursive: true })
  fs.writeFileSync(
    path.join(SOURCES_DIR, 'README.txt'),
    '代表の書籍・HP・募集要項等の .txt / .md ファイルをここに置いてください。\n',
  )
  console.log(`Created ${SOURCES_DIR}/ — 原稿を置いてから再実行してください。`)
  fs.writeFileSync(OUTPUT_PATH, '[]\n')
  process.exit(0)
}

const files = fs
  .readdirSync(SOURCES_DIR)
  .filter((f) => (f.endsWith('.txt') || f.endsWith('.md')) && f !== 'README.txt' && f !== 'README.md')

if (files.length === 0) {
  console.warn(`No source files in ${SOURCES_DIR}/ — chunks.json を空で書き出します`)
  fs.writeFileSync(OUTPUT_PATH, '[]\n')
  process.exit(0)
}

// 全ファイルをチャンクに分割
const chunks: { source: string; text: string }[] = []
for (const f of files) {
  const fullPath = path.join(SOURCES_DIR, f)
  const text = fs.readFileSync(fullPath, 'utf8')
  const source = path.basename(f, path.extname(f))
  const pieces = chunk(text)
  console.log(`  ${f}: ${text.length} chars → ${pieces.length} chunks`)
  for (const piece of pieces) {
    chunks.push({ source, text: piece })
  }
}
console.log(`\n合計 ${chunks.length} chunks を embedding 中（concurrency=5）...`)

// 並列で埋込（Gemini のレート制限を超えないよう concurrency=5）
const results = await mapConcurrent(chunks, 5, async (c) => {
  const embedding = await embed(c.text, 'RETRIEVAL_DOCUMENT', { geminiApiKey: apiKey })
  return { ...c, embedding }
})

const stored: StoredChunk[] = []
let failed = 0
for (const r of results) {
  if (r.status === 'fulfilled') stored.push(r.value)
  else failed++
}

fs.writeFileSync(OUTPUT_PATH, JSON.stringify(stored, null, 0) + '\n')
const fileSizeMB = (fs.statSync(OUTPUT_PATH).size / 1024 / 1024).toFixed(2)
console.log(`\n✅ ${stored.length}/${chunks.length} chunks を ${OUTPUT_PATH} に書き出し (${fileSizeMB} MB)`)
if (failed > 0) console.warn(`⚠️ ${failed} chunks 失敗（スキップ）`)
