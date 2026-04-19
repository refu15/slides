import postgres from 'postgres'

export type Row = Record<string, unknown>
export type SqlClient = ReturnType<typeof postgres>

let _sql: SqlClient | null = null

export function sql(): SqlClient {
  if (_sql) return _sql
  const url = process.env.APP_ADMIN_DATABASE_URL
  if (!url) throw new Error('APP_ADMIN_DATABASE_URL is not set')

  _sql = postgres(url, {
    ssl: 'require',
    max: 5,
    idle_timeout: 20,
    connect_timeout: 10,
    prepare: false,
    transform: { undefined: null },
  })
  return _sql
}

export function requireKey(): string {
  const k = process.env.APPLICANT_ENC_KEY
  if (!k) throw new Error('APPLICANT_ENC_KEY is not set')
  return k
}
