// ============================================================
// PostgreSQL クライアント（AWS RDS + Cloudflare Hyperdrive 対応）
//   - Workers: createDb({ connectionString, encryptionKey }) を使用
//   - Node.js: sql() シングルトン（process.env から読む）を使用
//
// すべての DB 操作関数は SqlClient と暗号化鍵を引数で受ける形に統一し、
// Workers から lib/* を直接 import できるようにする。
// ============================================================

import postgres from 'postgres'

export type Row = Record<string, any>
export type SqlClient = postgres.Sql

export interface DbConfig {
  connectionString: string
  encryptionKey?: string
}

/** Workers/Node 共通: 接続を毎回作るファクトリ */
export function createDb(config: DbConfig): SqlClient {
  if (!config.connectionString) throw new Error('connectionString is required')
  return postgres(config.connectionString, {
    ssl: 'require',
    max: 5,
    idle_timeout: 10,
    connect_timeout: 10,
    prepare: false,
    transform: { undefined: null },
  })
}

// ------------------------------------------------------------
// Node 専用: process.env 読み込み + シングルトン
// ------------------------------------------------------------
let _sql: SqlClient | null = null

export function sql(): SqlClient {
  if (_sql) return _sql
  const url = process.env.DATABASE_URL
  if (!url) throw new Error('DATABASE_URL is not set')
  _sql = createDb({ connectionString: url })
  return _sql
}

export async function closeDb(): Promise<void> {
  if (_sql) {
    await _sql.end({ timeout: 5 })
    _sql = null
  }
}

// ------------------------------------------------------------
// 暗号化鍵の取得ヘルパ（引数優先、fallback で process.env）
// ------------------------------------------------------------
function resolveEncKey(key?: string): string {
  const k = key ?? process.env.APPLICANT_ENC_KEY
  if (!k) throw new Error('encryption key (APPLICANT_ENC_KEY) is not set')
  if (k.length < 16) throw new Error('encryption key too short (>= 16 chars required)')
  return k
}

// ------------------------------------------------------------
// 応募者 CRUD（すべて sql と key を引数で受ける）
// ------------------------------------------------------------

export interface ApplicantInput {
  name: string
  email: string
  phone?: string
  preferredDate?: string
  notes?: string
  /** GDPR 削除時に関連ログも削除できるよう、応募時点の session_id を記録 */
  sessionIdHash?: string
}

/** 暗号化して INSERT し id を返す */
export async function insertApplicant(
  q: SqlClient,
  input: ApplicantInput,
  encKey?: string,
): Promise<string> {
  const key = resolveEncKey(encKey)
  const rows = await q<{ id: string }[]>`
    INSERT INTO applicants (
      name_enc, email_enc, email_hash, phone_enc,
      preferred_date, notes, first_session_id
    )
    VALUES (
      pgp_sym_encrypt(${input.name}, ${key}),
      pgp_sym_encrypt(${input.email}, ${key}),
      encode(digest(${input.email.toLowerCase()}, 'sha256'), 'hex'),
      ${input.phone ? q`pgp_sym_encrypt(${input.phone}, ${key})` : null},
      ${input.preferredDate ?? null},
      ${input.notes ?? null},
      ${input.sessionIdHash ?? null}
    )
    RETURNING id
  `
  return rows[0].id
}

/** 暗号化済みレコードを復号して返す（admin のみ） */
export async function getApplicant(
  q: SqlClient,
  id: string,
  encKey?: string,
) {
  const key = resolveEncKey(encKey)
  const rows = await q<Row[]>`
    SELECT
      id,
      pgp_sym_decrypt(name_enc, ${key}) AS name,
      pgp_sym_decrypt(email_enc, ${key}) AS email,
      CASE WHEN phone_enc IS NULL THEN NULL
           ELSE pgp_sym_decrypt(phone_enc, ${key}) END AS phone,
      preferred_date, notes, first_session_id, created_at
    FROM applicants
    WHERE id = ${id} AND deleted_at IS NULL
  `
  return rows[0] ?? null
}

/**
 * GDPR 削除要求（論理削除）。
 * #11 対応：関連テーブル（conversations/events/escalations）も first_session_id 経由で削除。
 * 返り値は削除関連情報。
 */
export interface GdprDeleteResult {
  applicants: number
  conversations: number
  events: number
  escalations: number
}

export async function requestDeletion(
  q: SqlClient,
  emailHash: string,
): Promise<GdprDeleteResult> {
  // 応募者を論理削除しつつ関連 session_id を取得
  const applicants = await q<{ id: string; first_session_id: string | null }[]>`
    UPDATE applicants
    SET requested_deletion = TRUE,
        deleted_at = NOW()
    WHERE email_hash = ${emailHash}
      AND deleted_at IS NULL
    RETURNING id, first_session_id
  `

  const sids = applicants
    .map(a => a.first_session_id)
    .filter((s): s is string => !!s)

  let conversations = 0
  let events = 0
  let escalations = 0

  if (sids.length > 0) {
    const c = await q<{ id: number }[]>`
      DELETE FROM conversations WHERE session_id = ANY(${sids}::text[])
      RETURNING id
    `
    conversations = c.length

    const e = await q<{ id: number }[]>`
      DELETE FROM events WHERE session_id = ANY(${sids}::text[])
      RETURNING id
    `
    events = e.length

    const es = await q<{ id: string }[]>`
      DELETE FROM escalations WHERE session_id = ANY(${sids}::text[])
      RETURNING id
    `
    escalations = es.length
  }

  return {
    applicants: applicants.length,
    conversations,
    events,
    escalations,
  }
}

// ------------------------------------------------------------
// 予約
// ------------------------------------------------------------
export async function createAppointment(
  q: SqlClient,
  input: {
    applicantId: string
    scheduledAt: string
    location?: string
  },
) {
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

export async function recordEvent(
  q: SqlClient,
  input: {
    sessionId: string
    type: EventType | string
    metadata?: Record<string, unknown>
  },
) {
  const meta = JSON.stringify(input.metadata ?? {})
  await q`
    INSERT INTO events (session_id, event_type, metadata)
    VALUES (${input.sessionId}, ${input.type}, ${meta}::jsonb)
  `
}
