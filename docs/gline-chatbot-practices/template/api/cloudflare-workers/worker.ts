// ============================================================
// G-LINE Chatbot API (Cloudflare Workers + Hyperdrive + AWS RDS)
//
// エンドポイント:
//   POST /api/chat     チャット応答（RAG + LLM + ガードレール）
//   POST /api/apply    応募者登録
//   POST /api/event    ウィジェットイベント（chat_open, apply_click等）
//   POST /api/gdpr     個人情報削除要求
//   GET  /api/health   ヘルスチェック
// ============================================================

import { Hono } from 'hono'
import { cors } from 'hono/cors'
import postgres from 'postgres'

// ------------------------------------------------------------
// Env bindings
// ------------------------------------------------------------
export interface Env {
  HYPERDRIVE: Hyperdrive
  GEMINI_API_KEY: string
  APPLICANT_ENC_KEY: string
  SESSION_SALT: string
  ALLOWED_ORIGINS: string       // カンマ区切り: "https://g-line.co.jp,https://staging.g-line.co.jp"
  RESEND_API_KEY?: string
  NOTIFY_EMAIL?: string
  GEMINI_MODEL?: string         // デフォルト: gemini-3.1-flash-lite-preview
}

// ------------------------------------------------------------
// App
// ------------------------------------------------------------
const app = new Hono<{ Bindings: Env }>()

app.use('*', async (c, next) => {
  const allowed = (c.env.ALLOWED_ORIGINS ?? '').split(',').map(s => s.trim()).filter(Boolean)
  const corsHandler = cors({
    origin: (origin) => {
      if (!origin) return null
      if (allowed.length === 0) return '*'       // allowlist 未設定は全許可（dev 用）
      return allowed.includes(origin) ? origin : null
    },
    allowMethods: ['GET', 'POST', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'X-Tenant-Id'],
    maxAge: 600,
  })
  return corsHandler(c, next)
})

// ------------------------------------------------------------
// DB helper
// ------------------------------------------------------------
function db(env: Env) {
  return postgres(env.HYPERDRIVE.connectionString, {
    ssl: 'require',
    max: 5,
    idle_timeout: 10,
    connect_timeout: 10,
    prepare: false,
  })
}

async function hashSessionId(raw: string, salt: string): Promise<string> {
  const enc = new TextEncoder().encode(`${salt}::${raw}`)
  const buf = await crypto.subtle.digest('SHA-256', enc)
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('')
}

// ------------------------------------------------------------
// Anonymization
// ------------------------------------------------------------
const PATTERNS: Array<{ re: RegExp; mask: string }> = [
  { re: /\b[\w.+-]+@[\w-]+\.[\w.-]+\b/g,               mask: '[EMAIL]' },
  { re: /\b(?:\+?81-?|0)\d{1,4}-?\d{1,4}-?\d{3,4}\b/g, mask: '[PHONE]' },
  { re: /\b\d{3}-?\d{4}\b/g,                            mask: '[POSTAL]' },
  { re: /\b\d{4}-?\d{4}-?\d{4}-?\d{4}\b/g,             mask: '[CARD]' },
]
function anonymize(text: string): string {
  let out = text
  for (const { re, mask } of PATTERNS) out = out.replace(re, mask)
  return out
}

// ------------------------------------------------------------
// Guardrails
// ------------------------------------------------------------
type EscalationReason =
  | 'salary_negotiation' | 'confidential_request'
  | 'gdpr_deletion' | 'system_prompt_probe' | null

const GUARDRAILS: Array<{ reason: Exclude<EscalationReason, null>; patterns: RegExp[] }> = [
  {
    reason: 'salary_negotiation',
    patterns: [
      /給(?:料|与)\s*(?:は)?\s*いくら/,
      /年収.*(?:教え|いくら|具体)/,
      /ボーナス.*(?:いくら|出ま)/,
      /内定.*条件.*(?:出し|可能)/,
    ],
  },
  {
    reason: 'confidential_request',
    patterns: [
      /未公開/, /社外秘/, /機密/, /内部情報/,
      /役員.*(?:名簿|名前)/, /社員.*(?:一覧|名簿)/,
    ],
  },
  {
    reason: 'gdpr_deletion',
    patterns: [
      /(?:情報|データ|個人情報).*(?:削除|消して)/,
      /忘れられる権利/,
    ],
  },
  {
    reason: 'system_prompt_probe',
    patterns: [
      /システムプロンプト.*(?:見せ|教え|出力)/,
      /(?:ignore|無視).*(?:instruction|指示|前提)/i,
      /jailbreak|脱獄/i,
    ],
  },
]

function guardrailCheck(text: string): EscalationReason {
  for (const g of GUARDRAILS) {
    if (g.patterns.some(re => re.test(text))) return g.reason
  }
  return null
}

function escalationMessage(reason: EscalationReason): string {
  switch (reason) {
    case 'salary_negotiation':
      return '具体的な条件については面接の場でしっかりお話ししたいと思っています。お気軽に info@g-line.co.jp までご連絡ください。'
    case 'confidential_request':
      return 'その内容はこちらからお話しできるものではないので、直接ご相談いただくのが一番かと思います。info@g-line.co.jp までご連絡ください。'
    case 'gdpr_deletion':
      return '情報削除のご希望、承知いたしました。本人確認のため info@g-line.co.jp 宛にお問い合わせいただければ速やかに対応いたします。'
    case 'system_prompt_probe':
      return 'お答えできない内容です。採用や会社のことについてなら、何でもお気軽にお尋ねください。'
    default:
      return 'info@g-line.co.jp までお気軽にご連絡ください。'
  }
}

// ------------------------------------------------------------
// RAG search
// ------------------------------------------------------------
interface RagHit { source: string; chunk_text: string; similarity: number }

async function embedQuery(text: string, apiKey: string): Promise<number[]> {
  const res = await fetch(
    'https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({
        content: { parts: [{ text }] },
        taskType: 'RETRIEVAL_QUERY',
      }),
    },
  )
  if (!res.ok) throw new Error(`Embed failed: ${res.status}`)
  const json = await res.json<{ embedding: { values: number[] } }>()
  return json.embedding.values
}

async function ragSearch(sql: postgres.Sql, query: string, apiKey: string, k = 5): Promise<RagHit[]> {
  const vec = await embedQuery(query, apiKey)
  const vecLit = `[${vec.join(',')}]`
  const rows = await sql<RagHit[]>`
    SELECT source, chunk_text, 1 - (embedding <=> ${vecLit}::vector) AS similarity
    FROM rag_chunks
    ORDER BY embedding <=> ${vecLit}::vector
    LIMIT ${k}
  `
  return rows.filter(h => h.similarity >= 0.55)
}

// ------------------------------------------------------------
// Gemini LLM call
// ------------------------------------------------------------
const PERSONA = `あなたは G-LINE 代表（荒牧氏）の分身として採用候補者の質問に答えるアシスタントです。
- 一人称は「私」
- 熱意があり、飾らない口調、敬語だが距離を詰める温度感
- 2〜5文、200字前後を基準に簡潔に
- 機密情報・未公開情報・給与交渉には答えず、info メールへの問合せを案内
- 会社情報を創作・断定せず、資料にないことは面接で聞くよう促す`

async function geminiChat(
  apiKey: string,
  model: string,
  systemPrompt: string,
  history: Array<{ role: 'user' | 'assistant'; content: string }>,
  userMessage: string,
): Promise<{ text: string; tokensIn: number; tokensOut: number }> {
  const contents = [
    ...history.map(h => ({ role: h.role === 'assistant' ? 'model' : 'user', parts: [{ text: h.content }] })),
    { role: 'user', parts: [{ text: userMessage }] },
  ]
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents,
        generationConfig: { temperature: 0.7, maxOutputTokens: 1024, topP: 0.95 },
      }),
    },
  )
  if (!res.ok) throw new Error(`Gemini failed: ${res.status} ${await res.text()}`)
  const json = await res.json<any>()
  return {
    text: json.candidates?.[0]?.content?.parts?.[0]?.text ?? '',
    tokensIn: json.usageMetadata?.promptTokenCount ?? 0,
    tokensOut: json.usageMetadata?.candidatesTokenCount ?? 0,
  }
}

// ============================================================
// Routes
// ============================================================

app.get('/api/health', (c) => c.json({ ok: true, ts: Date.now() }))

// ------------- /api/chat -------------
app.post('/api/chat', async (c) => {
  const started = Date.now()
  const body = await c.req.json<{
    sessionId: string
    message: string
    history?: Array<{ role: 'user' | 'assistant'; content: string }>
  }>()
  const { sessionId: rawSid, message, history = [] } = body

  if (!rawSid || !message) return c.json({ error: 'sessionId and message required' }, 400)

  const sid = await hashSessionId(rawSid, c.env.SESSION_SALT)
  const sql = db(c.env)

  // ガードレール判定
  const esc = guardrailCheck(message)
  if (esc) {
    const reply = escalationMessage(esc)
    c.executionCtx.waitUntil((async () => {
      await sql`
        INSERT INTO conversations (session_id, turn_index, role, content)
        VALUES (${sid}, 0, 'user', ${anonymize(message)})
      `
      await sql`
        INSERT INTO conversations (session_id, turn_index, role, content)
        VALUES (${sid}, 1, 'assistant', ${reply})
      `
      await sql`
        INSERT INTO escalations (session_id, reason, trigger_message)
        VALUES (${sid}, ${esc}, ${anonymize(message)})
      `
      await sql`
        INSERT INTO events (session_id, event_type, metadata)
        VALUES (${sid}, 'escalate', ${JSON.stringify({ reason: esc })}::jsonb)
      `
      await sql.end()
    })())
    return c.json({ reply, escalated: true, reason: esc })
  }

  // RAG 検索
  let ragHits: RagHit[] = []
  try {
    ragHits = await ragSearch(sql, message, c.env.GEMINI_API_KEY, 5)
  } catch (e) {
    console.warn('RAG search failed:', e)
  }

  // システムプロンプト組み立て
  const ragContext = ragHits.length
    ? '\n\n以下は代表の発言・会社資料からの抜粋です。回答はこの内容に忠実に作成してください。\n\n' +
      ragHits.map((h, i) => `[資料${i + 1} / 出典: ${h.source}]\n${h.chunk_text}`).join('\n\n')
    : ''
  const systemPrompt = PERSONA + ragContext

  // LLM 呼び出し
  const model = c.env.GEMINI_MODEL ?? 'gemini-3.1-flash-lite-preview'
  const { text, tokensIn, tokensOut } = await geminiChat(
    c.env.GEMINI_API_KEY, model, systemPrompt, history, message,
  )
  const latency = Date.now() - started

  // 非同期でログ保存
  c.executionCtx.waitUntil((async () => {
    const turn = history.length
    await sql`
      INSERT INTO conversations (session_id, turn_index, role, content)
      VALUES (${sid}, ${turn}, 'user', ${anonymize(message)})
    `
    await sql`
      INSERT INTO conversations (
        session_id, turn_index, role, content,
        model, provider, tokens_in, tokens_out, latency_ms
      )
      VALUES (
        ${sid}, ${turn + 1}, 'assistant', ${text},
        ${model}, 'google', ${tokensIn}, ${tokensOut}, ${latency}
      )
    `
    await sql`
      INSERT INTO events (session_id, event_type, metadata)
      VALUES (${sid}, 'ask', ${JSON.stringify({ rag_hits: ragHits.length })}::jsonb)
    `
    await sql`
      INSERT INTO events (session_id, event_type, metadata)
      VALUES (${sid}, ${ragHits.length ? 'rag_hit' : 'rag_miss'}, '{}'::jsonb)
    `
    await sql.end()
  })())

  return c.json({ reply: text, escalated: false, ragHits: ragHits.length, latencyMs: latency })
})

// ------------- /api/apply -------------
app.post('/api/apply', async (c) => {
  const body = await c.req.json<{
    sessionId: string
    name: string
    email: string
    phone?: string
    preferredDate?: string
    notes?: string
  }>()
  const { sessionId: rawSid, name, email, phone, preferredDate, notes } = body
  if (!name || !email) return c.json({ error: 'name and email required' }, 400)

  const sid = await hashSessionId(rawSid ?? `anon-${Date.now()}`, c.env.SESSION_SALT)
  const sql = db(c.env)
  const key = c.env.APPLICANT_ENC_KEY

  const rows = await sql<{ id: string }[]>`
    INSERT INTO applicants (
      name_enc, email_enc, email_hash, phone_enc, preferred_date, notes
    )
    VALUES (
      pgp_sym_encrypt(${name}, ${key}),
      pgp_sym_encrypt(${email}, ${key}),
      encode(digest(${email.toLowerCase()}, 'sha256'), 'hex'),
      ${phone ? sql`pgp_sym_encrypt(${phone}, ${key})` : null},
      ${preferredDate ?? null},
      ${notes ?? null}
    )
    RETURNING id
  `
  const applicantId = rows[0].id

  await sql`
    INSERT INTO events (session_id, event_type, metadata)
    VALUES (${sid}, 'apply_click', ${JSON.stringify({ applicant_id: applicantId })}::jsonb)
  `

  // info メール通知（Resend）
  if (c.env.RESEND_API_KEY && c.env.NOTIFY_EMAIL) {
    c.executionCtx.waitUntil(sendNotifyEmail(c.env, {
      name, email, phone, preferredDate, notes,
    }))
  }

  c.executionCtx.waitUntil(sql.end())
  return c.json({ ok: true, applicantId })
})

// ------------- /api/event -------------
app.post('/api/event', async (c) => {
  const body = await c.req.json<{
    sessionId: string
    type: string
    metadata?: Record<string, unknown>
  }>()
  const { sessionId: rawSid, type, metadata = {} } = body
  if (!rawSid || !type) return c.json({ error: 'sessionId and type required' }, 400)

  const sid = await hashSessionId(rawSid, c.env.SESSION_SALT)
  const sql = db(c.env)
  await sql`
    INSERT INTO events (session_id, event_type, metadata)
    VALUES (${sid}, ${type}, ${JSON.stringify(metadata)}::jsonb)
  `
  c.executionCtx.waitUntil(sql.end())
  return c.json({ ok: true })
})

// ------------- /api/gdpr -------------
app.post('/api/gdpr', async (c) => {
  const body = await c.req.json<{ email: string }>()
  const { email } = body
  if (!email) return c.json({ error: 'email required' }, 400)

  const sql = db(c.env)
  const rows = await sql<{ id: string }[]>`
    UPDATE applicants
    SET requested_deletion = TRUE, deleted_at = NOW()
    WHERE email_hash = encode(digest(${email.toLowerCase()}, 'sha256'), 'hex')
    RETURNING id
  `
  c.executionCtx.waitUntil(sql.end())
  return c.json({ ok: true, affected: rows.length })
})

// ------------------------------------------------------------
// Notify email
// ------------------------------------------------------------
async function sendNotifyEmail(env: Env, applicant: {
  name: string; email: string; phone?: string; preferredDate?: string; notes?: string
}) {
  if (!env.RESEND_API_KEY || !env.NOTIFY_EMAIL) return
  const body = {
    from: 'G-LINE 採用ボット <no-reply@example.jp>',
    to: env.NOTIFY_EMAIL,
    subject: '【新規応募】' + applicant.name + ' 様',
    text: [
      `新しい応募がありました。`,
      ``,
      `氏名: ${applicant.name}`,
      `メール: ${applicant.email}`,
      `電話: ${applicant.phone ?? '-'}`,
      `希望日時: ${applicant.preferredDate ?? '-'}`,
      ``,
      `相談内容:`,
      applicant.notes ?? '(なし)',
    ].join('\n'),
  }
  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })
  } catch (e) {
    console.warn('Resend failed:', e)
  }
}

export default app
