// ============================================================
// 監査ログ（audit_log）への書き込みヘルパー
//
// 管理画面の Server Actions から呼び出し、全 PII 操作を記録する。
// APPI 第20条・ISO 27001 A.12.4.1 に対応。
// ============================================================

import type { SqlClient } from './db.ts'

export type AuditAction =
  | 'view_applicant'      // 応募者詳細を開いた
  | 'decrypt_pii'         // 個別復号した
  | 'gdpr_delete'         // GDPR 削除実行
  | 'faq_edit'            // FAQ を編集
  | 'faq_publish_toggle'  // FAQ 公開/非公開切替
  | 'escalation_update'   // エスカレーション状態変更
  | 'persona_approve'     // ペルソナ PR を merge
  | 'persona_reject'      // ペルソナ PR を close
  | 'persona_edit_commit' // ペルソナ微修正 commit
  | 'few_shot_add'        // Few-shot 追加 PR 作成
  | 'model_config_change' // LLM モデル設定変更
  | 'ab_test_start'       // A/B テスト開始
  | 'ab_test_stop'        // A/B テスト停止
  | 'export_data'         // データエクスポート

export interface AuditLogEntry {
  actorEmail: string
  action: AuditAction | string
  resourceType?: 'applicant' | 'faq' | 'conversation' | 'escalation' | 'persona' | 'model' | string
  resourceId?: string
  metadata?: Record<string, unknown>
  ipAddress?: string
  userAgent?: string
}

/**
 * 監査ログを書き込む。
 * 失敗しても呼び出し元の処理は続行（ログ書き込み失敗で業務が止まらない）。
 */
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
    // 監査ログ書き込み失敗は重大なので console.error だが throw はしない
    console.error('[audit] failed to write log:', (e as Error).message, entry)
  }
}

/**
 * 監査ログを読み取る（admin UI 表示用）。
 * RLS で app_admin のみ参照可能。
 */
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

  const rows = await sql<AuditLogRecord[]>`
    SELECT *
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
  return rows
}

/** 集計（ダッシュボード用） */
export async function auditStats(
  sql: SqlClient,
  sinceDays = 30,
): Promise<{ action: string; count: number }[]> {
  const rows = await sql<{ action: string; count: number }[]>`
    SELECT action, COUNT(*)::int AS count
    FROM audit_log
    WHERE created_at > NOW() - INTERVAL '1 day' * ${sinceDays}
    GROUP BY action
    ORDER BY count DESC
  `
  return rows
}
