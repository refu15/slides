import { headers } from 'next/headers'
import { sql } from '@/lib/db'
import { readAuditLogs, auditStats, writeAuditLog } from '@/lib/audit'
import { Breadcrumb } from '@/components/breadcrumb'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const ACTION_LABELS: Record<string, string> = {
  view_applicant: '応募者閲覧',
  decrypt_pii: 'PII 復号',
  gdpr_delete: 'GDPR 削除',
  faq_edit: 'FAQ 編集',
  faq_publish_toggle: 'FAQ 公開切替',
  escalation_update: 'エスカレーション更新',
  persona_approve: 'ペルソナ採用',
  persona_reject: 'ペルソナ却下',
  persona_edit_commit: 'ペルソナ微修正',
  few_shot_add: 'Few-shot 追加',
  model_config_change: 'モデル設定変更',
  ab_test_start: 'A/B テスト開始',
  ab_test_stop: 'A/B テスト停止',
  export_data: 'データエクスポート',
}

function formatMetadata(metadata: Record<string, unknown>): string {
  if (!metadata || Object.keys(metadata).length === 0) return '-'
  return Object.entries(metadata)
    .map(([k, v]) => `${k}: ${typeof v === 'string' ? v : JSON.stringify(v)}`)
    .join(', ')
}

export default async function AuditPage() {
  const q = sql()
  const hdr = await headers()
  const viewerEmail = hdr.get('cf-access-authenticated-user-email') ?? 'dev@local'

  const logs = await readAuditLogs(q, { sinceDays: 90, limit: 200 })
  const stats = await auditStats(q, 30)

  // この閲覧自体も監査ログに記録（Meta操作）
  await writeAuditLog(q, {
    actorEmail: viewerEmail,
    action: 'view_applicant',
    resourceType: 'audit_log',
    metadata: { accessed_count: logs.length },
  })

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: 'ダッシュボード', href: '/admin' },
          { label: '監査ログ' },
        ]}
      />

      <div>
        <h1 className="text-2xl font-bold">監査ログ</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          全 PII 操作の記録（APPI 第20条 / ISO 27001 A.12.4.1 対応）。直近90日分を表示。
        </p>
      </div>

      {/* アクション別集計 */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-6">
        {stats.map((s) => (
          <Card key={s.action} className="p-4">
            <div className="text-xs text-muted-foreground">
              {ACTION_LABELS[s.action] ?? s.action}
            </div>
            <div className="mt-1 text-2xl font-bold">{s.count}</div>
            <div className="text-xs text-muted-foreground">件（30日）</div>
          </Card>
        ))}
      </div>

      {/* ログ一覧 */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50 text-left text-xs">
                <th className="p-3 font-medium">日時</th>
                <th className="p-3 font-medium">実行者</th>
                <th className="p-3 font-medium">アクション</th>
                <th className="p-3 font-medium">リソース</th>
                <th className="p-3 font-medium">メタデータ</th>
                <th className="p-3 font-medium">IP</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} className="border-b border-border hover:bg-muted/30">
                  <td className="p-3 font-mono text-xs whitespace-nowrap">
                    {new Date(log.created_at).toLocaleString('ja-JP')}
                  </td>
                  <td className="p-3 text-xs">{log.actor_email}</td>
                  <td className="p-3">
                    <Badge variant="outline" className="text-xs">
                      {ACTION_LABELS[log.action] ?? log.action}
                    </Badge>
                  </td>
                  <td className="p-3 font-mono text-xs">
                    {log.resource_type ?? '-'}
                    {log.resource_id ? (
                      <span className="ml-2 text-muted-foreground">
                        #{log.resource_id.slice(0, 8)}
                      </span>
                    ) : null}
                  </td>
                  <td className="p-3 text-xs text-muted-foreground max-w-md truncate">
                    {formatMetadata(log.metadata)}
                  </td>
                  <td className="p-3 font-mono text-xs text-muted-foreground">
                    {log.ip_address ?? '-'}
                  </td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-muted-foreground">
                    該当する監査ログがありません
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="text-xs text-muted-foreground">
        ※ 保存期間: 3年。法令に基づく開示請求時のみ外部提供可能。app_admin ロールのみ閲覧可。
      </div>
    </div>
  )
}
