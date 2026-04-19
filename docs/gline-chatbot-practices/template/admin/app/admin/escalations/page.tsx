import { sql } from '@/lib/db'
import { Breadcrumb } from '@/components/breadcrumb'
import { Badge } from '@/components/ui/badge'
import { formatDateTime } from '@/lib/utils'
import { EscalationActions } from './client'

export const dynamic = 'force-dynamic'
export const revalidate = 0

interface EscalationRow {
  id: string
  session_id: string
  reason: string
  trigger_message: string
  status: string
  resolved_at: Date | null
  created_at: Date
}

interface ReasonStat {
  reason: string
  count: number
}

const STATUS_LABELS: Record<string, string> = {
  open: '未対応',
  in_progress: '対応中',
  resolved: '解決済み',
  dropped: '対応不要',
}

const STATUS_VARIANTS: Record<string, 'destructive' | 'warning' | 'success' | 'secondary'> = {
  open: 'destructive',
  in_progress: 'warning',
  resolved: 'success',
  dropped: 'secondary',
}

async function getEscalations(status?: string) {
  const db = sql()
  if (status) {
    return db<EscalationRow[]>`
      SELECT * FROM escalations WHERE status = ${status} ORDER BY created_at DESC
    `
  }
  return db<EscalationRow[]>`SELECT * FROM escalations ORDER BY created_at DESC`
}

async function getReasonStats() {
  const db = sql()
  return db<ReasonStat[]>`
    SELECT reason, COUNT(*) as count
    FROM escalations
    WHERE status != 'dropped'
    GROUP BY reason
    ORDER BY count DESC
  `
}

export default async function EscalationsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const params = await searchParams
  const [escalations, reasonStats] = await Promise.all([
    getEscalations(params.status),
    getReasonStats(),
  ])

  const statusOptions = ['', 'open', 'in_progress', 'resolved', 'dropped']

  return (
    <div>
      <Breadcrumb items={[{ label: 'エスカレーション' }]} />
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">エスカレーション対応キュー</h1>
        <span className="text-sm text-gray-500">{escalations.length} 件</span>
      </div>

      {reasonStats.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {reasonStats.slice(0, 4).map((s) => (
            <div key={s.reason} className="bg-white dark:bg-gray-900 border rounded-lg p-3">
              <p className="text-xs text-gray-500 truncate">{s.reason}</p>
              <p className="text-xl font-bold mt-1">{s.count}</p>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2 mb-4">
        {statusOptions.map((s) => (
          <a
            key={s}
            href={s ? `/admin/escalations?status=${s}` : '/admin/escalations'}
            className={`px-3 py-1 text-sm rounded-full border transition-colors ${
              params.status === s || (!params.status && !s)
                ? 'bg-[#0f3460] text-white border-[#0f3460]'
                : 'hover:bg-gray-50'
            }`}
          >
            {s ? STATUS_LABELS[s] : '全て'}
          </a>
        ))}
      </div>

      <div className="rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-500">セッション</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">理由</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">トリガーメッセージ</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">ステータス</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">作成日時</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {escalations.map((esc) => (
              <tr key={esc.id} className="bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800">
                <td className="px-4 py-3 font-mono text-xs text-gray-500">
                  {esc.session_id.substring(0, 12)}...
                </td>
                <td className="px-4 py-3">
                  <Badge variant="outline">{esc.reason}</Badge>
                </td>
                <td className="px-4 py-3 max-w-xs">
                  <p className="text-xs text-gray-700 dark:text-gray-300 line-clamp-2">
                    {esc.trigger_message}
                  </p>
                </td>
                <td className="px-4 py-3">
                  <Badge variant={STATUS_VARIANTS[esc.status] ?? 'outline'}>
                    {STATUS_LABELS[esc.status] ?? esc.status}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-gray-500 text-xs">{formatDateTime(esc.created_at)}</td>
                <td className="px-4 py-3">
                  <EscalationActions id={esc.id} currentStatus={esc.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {escalations.length === 0 && (
          <div className="p-8 text-center text-gray-500">データがありません</div>
        )}
      </div>
    </div>
  )
}
