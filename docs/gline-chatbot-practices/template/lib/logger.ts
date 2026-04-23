// ============================================================
// 会話ログの匿名化 + 書き込み（Workers / Node 共通）
//   sql と salt をすべて引数で受ける。
// ============================================================

// Lite 版では DB 不要。anonymize と hashSessionId のみ提供。

// ------------------------------------------------------------
// 匿名化
// ------------------------------------------------------------
const PATTERNS: Array<{ re: RegExp; mask: string }> = [
  { re: /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g,  mask: '[EMAIL]' },
  { re: /\+81[-\s]?\d{1,4}[-\s]?\d{1,4}[-\s]?\d{3,4}/g,     mask: '[PHONE]' },
  { re: /\b0\d{1,4}-?\d{1,4}-?\d{3,4}\b/g,                  mask: '[PHONE]' },
  { re: /\b\d{3}-?\d{4}\b/g,                                 mask: '[POSTAL]' },
  { re: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g,      mask: '[CARD]' },
]

export function anonymize(text: string): string {
  let out = text
  for (const { re, mask } of PATTERNS) out = out.replace(re, mask)
  return out
}

// ------------------------------------------------------------
// session_id のハッシュ化（salt を引数で必須化）
// ------------------------------------------------------------
export async function hashSessionId(raw: string, salt?: string): Promise<string> {
  const s = salt ?? process.env.SESSION_SALT
  if (!s || s.length < 8) {
    throw new Error('SESSION_SALT is not configured or too short (>= 8 chars required)')
  }
  const enc = new TextEncoder().encode(`${s}::${raw}`)
  const buf = await crypto.subtle.digest('SHA-256', enc)
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('')
}

// ------------------------------------------------------------
// 書き込み
// ------------------------------------------------------------
// DB への書き込みは Lite 版では廃止。
