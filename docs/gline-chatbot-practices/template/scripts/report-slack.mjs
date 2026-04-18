// ============================================================
// 週次スキャン結果を Slack Webhook へ投稿する。
// SLACK_WEBHOOK が未設定なら何もしない（任意機能）。
// ============================================================

import fs from 'node:fs'

const SUMMARY = './tmp/scan-summary.json'
const webhook = process.env.SLACK_WEBHOOK

if (!webhook) {
  console.log('SLACK_WEBHOOK not set — skipping Slack report.')
  process.exit(0)
}
if (!fs.existsSync(SUMMARY)) {
  console.log('No scan summary found — skipping.')
  process.exit(0)
}

const s = JSON.parse(fs.readFileSync(SUMMARY, 'utf8'))
const date = new Date(s.scanned_at).toISOString().slice(0, 10)

const lines = []
lines.push(`*📡 週次 LLM モデルスキャン — ${date}*`)
lines.push('')
lines.push(`現行モデル: \`${s.current}\``)
lines.push(`候補検出数: ${s.candidates.length}`)

if (s.candidates.length) {
  lines.push('')
  lines.push('*候補一覧（Eval スコア順）*')
  const sorted = [...s.candidates].sort((a, b) => b.score.overall - a.score.overall)
  for (const c of sorted.slice(0, 5)) {
    const pct = (c.score.overall * 100).toFixed(1)
    lines.push(`• \`${c.name}\` — ${pct}% (${c.score.passed}/${c.score.total})`)
  }
}

lines.push('')
if (s.recommend_switch) {
  lines.push(`✅ *切替推奨*: \`${s.recommended_model}\` — 自動PRを作成しました`)
} else {
  lines.push('ℹ️ 今週は切替推奨なし（現行モデル継続）')
}

const payload = { text: lines.join('\n') }
const res = await fetch(webhook, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload),
})

if (!res.ok) {
  console.error(`Slack post failed: ${res.status} ${await res.text()}`)
  process.exit(1)
}
console.log('Slack report posted.')
