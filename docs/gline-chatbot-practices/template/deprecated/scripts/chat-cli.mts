// ============================================================
// ローカル動作確認用の最小 CLI。
// 例: npm run chat -- "御社の強みは？"
// ============================================================

import { chatWithFallback, withSystemPrompt } from '../lib/llm.ts'

const input = process.argv.slice(2).join(' ').trim()
if (!input) {
  console.error('Usage: npm run chat -- "質問文"')
  process.exit(1)
}

const messages = withSystemPrompt([{ role: 'user', content: input }])
const res = await chatWithFallback(messages)

console.log('---')
console.log(`[${res.provider}/${res.model}]  in:${res.usage.inputTokens} out:${res.usage.outputTokens}`)
console.log('---')
console.log(res.content)
