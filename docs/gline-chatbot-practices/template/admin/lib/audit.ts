// ============================================================
// 監査ログ（audit_log）書き込み・読み込みヘルパー（admin 用）
// template/lib/audit.ts の admin-only 版。
// ============================================================

import type { SqlClient } from './db'

export type AuditAction =
  | 'view_applicant' | 'decrypt_pii' | 'gdpr_delete'
  | 'faq_edit' | 'faq_publish_toggle'
  | 'escalation_update'
  | 'persona_approve' | 'persona_reject' | 'persona_edit_commit' | 'few_shot_add'
  | 'model_config_change' | 'ab_test_start' | 'ab_test_stop'
  | 'export_data'

export interface AuditLogEntry {
  actorEmail: string
  action: AuditAction | string
  resourceType?: string
  resourceId?: string
  metadata?: Record<string, unknown>
  ipAddress?: string
  userAgent?: string
}

export async function writeAuditLog(
  sql: SqlClient,
  entry: AuditLogEntry,
): Promise<void> {
  try {
    await sql`
      INSERT INTO audit_log (
        actor_email, action, resource_type, resource_id,
        metadata, ip_address, user_agent
      )
      VALUES (
        ${entry.actorEmail},
        ${entry.action},
        ${entry.resourceType ?? null},
        ${entry.resourceId ?? null},
        ${JSON.stringify(entry.metadata ?? {})}::jsonb,
        ${entry.ipAddress ?? null},
        ${entry.userAgent ?? null}
      )
    `
  } catch (e) {
    console.error('[audit] failed:', (e as Error).message, entry)
  }
}

export interface AuditLogRecord {
  id: number
  actor_email: string
  action: string
  resource_type: string | null
  resource_id: string | null
  metadata: Record<string, unknown>
  ip_address: string | null
  user_agent: string | null
  created_at: string
}

export async function readAuditLogs(
  sql: SqlClient,
  filters: {
    actorEmail?: string
    action?: string
    resourceType?: string
    resourceId?: string
    sinceDays?: number
    limit?: number
    offset?: number
  } = {},
): Promise<AuditLogRecord[]> {
  const limit = Math.min(filters.limit ?? 50, 500)
  const offset = filters.offset ?? 0
  const sinceDays = filters.sinceDays ?? 90

  const rows = await sql`
    SELECT id, actor_email, action, resource_type, resource_id,
           metadata, ip_address, user_agent, created_at
    FROM audit_log
    WHERE created_at > NOW() - INTERVAL '1 day' * ${sinceDays}
      AND (${filters.actorEmail ?? null}::text IS NULL
           OR actor_email = ${filters.actorEmail ?? null})
      AND (${filters.action ?? null}::text IS NULL
           OR action = ${filters.action ?? null})
      AND (${filters.resourceType ?? null}::text IS NULL
           OR resource_type = ${filters.resourceType ?? null})
      AND (${filters.resourceId ?? null}::text IS NULL
           OR resource_id = ${filters.resourceId ?? null})
    ORDER BY created_at DESC
    LIMIT ${limit}
    OFFSET ${offset}
  `
  return rows as unknown as AuditLogRecord[]
}

export async function auditStats(
  sql: SqlClient,
  sinceDays = 30,
): Promise<{ action: string; count: number }[]> {
  const rows = await sql`
    SELECT action, COUNT(*)::int AS count
    FROM audit_log
    WHERE created_at > NOW() - INTERVAL '1 day' * ${sinceDays}
    GROUP BY action
    ORDER BY count DESC
  `
  return rows as unknown as { action: string; count: number }[]
}
