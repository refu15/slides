// ============================================================
// PostgreSQL クライアント（AWS RDS + Cloudflare Hyperdrive 対応）
//   - Node.js（ローカル / GitHub Actions）: DATABASE_URL へ直接接続
//   - Cloudflare Workers: Hyperdrive binding 経由で接続
// ============================================================

import postgres from 'postgres'

export type Row = Record<string, any>
export type SqlClient = ReturnType<typeof postgres>

let _sql: SqlClient | null = null

interface InitOptions {
  connectionString?: string    // 優先。Hyperdrive の場合はここに binding.connectionString を渡す
}

export function sql(opts: InitOptions = {}): SqlClient {
  if (_sql) return _sql
  const url = opts.connectionString ?? process.env.DATABASE_URL
  if (!url) throw new Error('DATABASE_URL is not set')

  _sql = postgres(url, {
    ssl: 'require',
    max: 5,                // 接続プール上限（Workers + Hyperdrive を想定して小さく）
    idle_timeout: 20,
    connect_timeout: 10,
    prepare: false,        // Hyperdrive と相性悪いので無効化
    transform: { undefined: null },
  })
  return _sql
}

/** 明示的に接続解放（スクリプト終了時・テスト時に使用） */
export async function closeDb(): Promise<void> {
  if (_sql) {
    await _sql.end({ timeout: 5 })
    _sql = null
  }
}

// ------------------------------------------------------------
// 暗号化ヘルパ（pgcrypto 使用）
// ------------------------------------------------------------

function requireKey(): string {
  const k = process.env.APPLICANT_ENC_KEY
  if (!k) throw new Error('APPLICANT_ENC_KEY is not set (32 bytes base64)')
  return k
}

/** 応募者情報を暗号化して INSERT し id を返す */
export async function insertApplicant(input: {
  name: string
  email: string
  phone?: string
  preferredDate?: string
  notes?: string
}): Promise<string> {
  const q = sql()
  const key = requireKey()
  const rows = await q<{ id: string }[]>`
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
  return rows[0].id
}

/** 暗号化済みレコードを復号して返す（admin のみ） */
export async function getApplicant(id: string) {
  const q = sql()
  const key = requireKey()
  const rows = await q<Row[]>`
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
  const rows = await q<{ id: string }[]>`
    UPDATE applicants
    SET requested_deletion = TRUE,
        deleted_at = NOW()
    WHERE email_hash = ${emailHash}
    RETURNING id
  `
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
  const rows = await q<{ id: string }[]>`
    INSERT INTO appointments (applicant_id, scheduled_at, location)
    VALUES (${input.applicantId}, ${input.scheduledAt}, ${input.location ?? '対面（本社）'})
    RETURNING id
  `
  return rows[0].id
}

// ------------------------------------------------------------
// イベント
// ------------------------------------------------------------
export type EventType =
  | 'chat_open' | 'ask' | 'answer' | 'escalate'
  | 'apply_click' | 'appointment_created' | 'rag_hit' | 'rag_miss'

export async function recordEvent(input: {
  sessionId: string
  type: EventType
  metadata?: Record<string, unknown>
}) {
  const q = sql()
  const meta = JSON.stringify(input.metadata ?? {})
  await q`
    INSERT INTO events (session_id, event_type, metadata)
    VALUES (${input.sessionId}, ${input.type}, ${meta}::jsonb)
  `
}
