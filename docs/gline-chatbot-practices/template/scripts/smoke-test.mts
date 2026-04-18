import { loadConfig, createProvider, withSystemPrompt } from '../lib/llm.ts'

const cfg = loadConfig('./config/llm.yaml')
console.log('[OK] config loaded:', cfg.current.provider, '/', cfg.current.model)
console.log('[OK] fallback chain:', cfg.fallback_chain.map(m => `${m.provider}/${m.model}`).join(' → '))

const p = createProvider(cfg.current)
console.log('[OK] provider instantiated:', p.name)

const msgs = withSystemPrompt([{ role: 'user', content: 'test' }])
console.log('[OK] system prompt loaded. messages:', msgs.length, '/ sys chars:', msgs[0].content.length)
