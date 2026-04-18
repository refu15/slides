// ============================================================
// 会話ログの匿名化 + 書き込み
// - session_id はブラウザ側のランダムUUIDをハッシュ化して使用
// - 個人情報（電話番号・メール・氏名らしき文字列）を検出したら自動マスク
// ============================================================

import { sql, recordEvent } from './db.ts'

// ------------------------------------------------------------
// 匿名化
// ------------------------------------------------------------
const PATTERNS: Array<{ re: RegExp; mask: string }> = [
  { re: /\b[\w.+-]+@[\w-]+\.[\w.-]+\b/g,                    mask: '[EMAIL]' },
  { re: /\b(?:\+?81-?|0)\d{1,4}-?\d{1,4}-?\d{3,4}\b/g,      mask: '[PHONE]' },
  { re: /\b\d{3}-?\d{4}\b/g,                                 mask: '[POSTAL]' },
  { re: /\b\d{4}-?\d{4}-?\d{4}-?\d{4}\b/g,                  mask: '[CARD]' },
]

export function anonymize(text: string): string {
  let out = text
  for (const { re, mask } of PATTERNS) out = out.replace(re, mask)
  return out
}

// ------------------------------------------------------------
// session_id のハッシュ化（ブラウザ UUID -> SHA-256）
// ------------------------------------------------------------
export async function hashSessionId(raw: string, salt?: string): Promise<string> {
  const s = (salt ?? process.env.SESSION_SALT ?? 'gline-salt')
  const enc = new TextEncoder().encode(`${s}::${raw}`)
  const buf = await crypto.subtle.digest('SHA-256', enc)
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('')
}

// ------------------------------------------------------------
// 書き込み
// ------------------------------------------------------------
export interface LogEntry {
  sessionId: string              // すでにハッシュ化済み
  turnIndex: number
  role: 'user' | 'assistant' | 'system'
  content: string
  model?: string
  provider?: string
  tokensIn?: number
  tokensOut?: number
  latencyMs?: number
}

export async function writeConversation(entry: LogEntry): Promise<void> {
  const q = sql()
  const content = anonymize(entry.content)
  await q`
    INSERT INTO conversations (
      session_id, turn_index, role, content,
      model, provider, tokens_in, tokens_out, latency_ms
    )
    VALUES (
      ${entry.sessionId}, ${entry.turnIndex}, ${entry.role}, ${content},
      ${entry.model ?? null}, ${entry.provider ?? null},
      ${entry.tokensIn ?? 0}, ${entry.tokensOut ?? 0}, ${entry.latencyMs ?? null}
    )
  `
}

/** チャット開始時のエントリーイベント */
export async function logChatOpen(sessionId: string, meta: Record<string, unknown> = {}) {
  await recordEvent({ sessionId, type: 'chat_open', metadata: meta })
}

/** 応募フォームクリック */
export async function logApplyClick(sessionId: string, meta: Record<string, unknown> = {}) {
  await recordEvent({ sessionId, type: 'apply_click', metadata: meta })
}
