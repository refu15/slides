// ============================================================
// Gemini の公開モデル一覧を取得して tmp/gemini-models.json に保存する。
// 週次ワークフローの最初のステップ。
// ============================================================

import fs from 'node:fs'
import path from 'node:path'

const API_KEY = process.env.GEMINI_API_KEY
if (!API_KEY) {
  console.error('GEMINI_API_KEY is not set')
  process.exit(1)
}

const OUT_DIR = './tmp'
fs.mkdirSync(OUT_DIR, { recursive: true })

const url = 'https://generativelanguage.googleapis.com/v1beta/models'
const res = await fetch(url, { headers: { 'x-goog-api-key': API_KEY } })
if (!res.ok) {
  console.error(`Failed to fetch models: ${res.status} ${await res.text()}`)
  process.exit(1)
}
const data = await res.json()

const outPath = path.join(OUT_DIR, 'gemini-models.json')
fs.writeFileSync(outPath, JSON.stringify(data, null, 2))

const count = Array.isArray(data.models) ? data.models.length : 0
console.log(`Fetched ${count} Gemini models → ${outPath}`)

// 一覧ログ（確認用）
for (const m of data.models ?? []) {
  const name = m.name?.replace(/^models\//, '') ?? '?'
  console.log(`  - ${name}  (input: ${m.inputTokenLimit ?? '?'} / output: ${m.outputTokenLimit ?? '?'})`)
}
