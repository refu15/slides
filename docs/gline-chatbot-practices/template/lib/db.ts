// ============================================================
// Neon PostgreSQL HTTP クライアント
// Cloudflare Workers / Vercel Edge / Node 全環境で動作
// ============================================================

import { neon } from '@neondatabase/serverless'

// v0.10 以降はデフォルトで接続キャッシュ有効。追加設定不要。

export type Row = Record<string, any>
export type SqlClient = (
  strings: TemplateStringsArray,
  ...values: unknown[]
) => Promise<Row[]>

let _sql: SqlClient | null = null

export function sql(): SqlClient {
  if (_sql) return _sql
  const url = process.env.DATABASE_URL
  if (!url) throw new Error('DATABASE_URL is not set')
  _sql = neon(url) as unknown as SqlClient
  return _sql
}

// ------------------------------------------------------------
// 暗号化ヘルパ（pgcrypto 使用）
// 本番では Cloud KMS / Vault で鍵管理することを推奨
// ------------------------------------------------------------

function requireKey(): string {
  const k = process.env.APPLICANT_ENC_KEY
  if (!k) throw new Error('APPLICANT_ENC_KEY is not set (32 bytes base64)')
  return k
}

/** pgcrypto の pgp_sym_encrypt を使って暗号化した形で INSERT */
export async function insertApplicant(input: {
  name: string
  email: string
  phone?: string
  preferredDate?: string
  notes?: string
}): Promise<string> {
  const q = sql()
  const key = requireKey()
  const rows = await q`
    INSERT INTO applicants (
      name_enc, email_enc, email_hash, phone_enc, preferred_date, notes
    )
    VALUES (
      pgp_sym_encrypt(${input.name}, ${key}),
      pgp_sym_encrypt(${input.email}, ${key}),
      encode(digest(${input.email.toLowerCase()}, 'sha256'), 'hex'),
      ${input.phone ? q`pgp_sym_encrypt(${input.phone}, ${key})` : null},
      ${input.preferredDate ?? null},
      ${input.notes ?? null}
    )
    RETURNING id
  `
  return (rows[0] as { id: string }).id
}

/** 暗号化済みレコードを復号して返す（admin のみ） */
export async function getApplicant(id: string) {
  const q = sql()
  const key = requireKey()
  const rows = await q`
    SELECT
      id,
      pgp_sym_decrypt(name_enc, ${key}) AS name,
      pgp_sym_decrypt(email_enc, ${key}) AS email,
      CASE WHEN phone_enc IS NULL THEN NULL
           ELSE pgp_sym_decrypt(phone_enc, ${key}) END AS phone,
      preferred_date, notes, created_at
    FROM applicants
    WHERE id = ${id} AND deleted_at IS NULL
  `
  return rows[0] ?? null
}

/** GDPR 削除要求 → 論理削除 → 日次バッチで物理削除 */
export async function requestDeletion(emailHash: string): Promise<number> {
  const q = sql()
  const rows = (await q`
    UPDATE applicants
    SET requested_deletion = TRUE,
        deleted_at = NOW()
    WHERE email_hash = ${emailHash}
    RETURNING id
  `) as { id: string }[]
  return rows.length
}

// ------------------------------------------------------------
// 予約
// ------------------------------------------------------------
export async function createAppointment(input: {
  applicantId: string
  scheduledAt: string
  location?: string
}) {
  const q = sql()
  const rows = await q`
    INSERT INTO appointments (applicant_id, scheduled_at, location)
    VALUES (${input.applicantId}, ${input.scheduledAt}, ${input.location ?? '対面（本社）'})
    RETURNING id
  `
  return (rows[0] as { id: string }).id
}

// ------------------------------------------------------------
// イベント
// ------------------------------------------------------------
export async function recordEvent(input: {
  sessionId: string
  type:
    | 'chat_open' | 'ask' | 'answer' | 'escalate'
    | 'apply_click' | 'appointment_created' | 'rag_hit' | 'rag_miss'
  metadata?: Record<string, unknown>
}) {
  const q = sql()
  await q`
    INSERT INTO events (session_id, event_type, metadata)
    VALUES (${input.sessionId}, ${input.type}, ${JSON.stringify(input.metadata ?? {})}::jsonb)
  `
}
