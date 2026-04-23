import { sql, requireKey } from '@/lib/db'
import { Breadcrumb } from '@/components/breadcrumb'
import { Badge } from '@/components/ui/badge'
import { formatDateTime } from '@/lib/utils'

export const dynamic = 'force-dynamic'
export const revalidate = 0

interface AppointmentRow {
  id: string
  applicant_id: string
  scheduled_at: Date
  location: string
  status: string
  notified_at: Date | null
  created_at: Date
  applicant_name: string
}

const STATUS_LABELS: Record<string, string> = {
  pending: '確認待ち',
  confirmed: '確定',
  cancelled: 'キャンセル',
  completed: '完了',
}

const STATUS_VARIANTS: Record<string, 'default' | 'success' | 'destructive' | 'secondary' | 'warning'> = {
  pending: 'warning',
  confirmed: 'success',
  cancelled: 'destructive',
  completed: 'secondary',
}

async function getAppointments(status?: string, year?: number, month?: number) {
  const db = sql()
  const key = requireKey()

  let rows: AppointmentRow[]
  if (status) {
    rows = await db<AppointmentRow[]>`
      SELECT a.*, pgp_sym_decrypt(ap.name_enc, ${key}) AS applicant_name
      FROM appointments a
      JOIN applicants ap ON ap.id = a.applicant_id
      WHERE a.status = ${status}
        AND ap.deleted_at IS NULL
      ORDER BY a.scheduled_at
    `
  } else {
    rows = await db<AppointmentRow[]>`
      SELECT a.*, pgp_sym_decrypt(ap.name_enc, ${key}) AS applicant_name
      FROM appointments a
      JOIN applicants ap ON ap.id = a.applicant_id
      WHERE ap.deleted_at IS NULL
      ORDER BY a.scheduled_at
    `
  }
  return rows
}

export default async function AppointmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; year?: string; month?: string }>
}) {
  const params = await searchParams
  const appointments = await getAppointments(params.status)

  const statusOptions = ['', 'pending', 'confirmed', 'cancelled', 'completed']

  return (
    <div>
      <Breadcrumb items={[{ label: '面接予約' }]} />
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">面接予約一覧</h1>
        <span className="text-sm text-gray-500">{appointments.length} 件</span>
      </div>

      <div className="flex gap-2 mb-4">
        {statusOptions.map((s) => (
          <a
            key={s}
            href={s ? `/admin/appointments?status=${s}` : '/admin/appointments'}
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
              <th className="px-4 py-3 text-left font-medium text-gray-500">応募者名</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">予約日時</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">場所</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">ステータス</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">通知済み</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">作成日</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {appointments.map((apt) => (
              <tr key={apt.id} className="bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800">
                <td className="px-4 py-3 pii-protected font-medium">{apt.applicant_name}</td>
                <td className="px-4 py-3">{formatDateTime(apt.scheduled_at)}</td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{apt.location}</td>
                <td className="px-4 py-3">
                  <Badge variant={STATUS_VARIANTS[apt.status] ?? 'outline'}>
                    {STATUS_LABELS[apt.status] ?? apt.status}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-gray-500">
                  {apt.notified_at ? formatDateTime(apt.notified_at) : '未通知'}
                </td>
                <td className="px-4 py-3 text-gray-500">{formatDateTime(apt.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {appointments.length === 0 && (
          <div className="p-8 text-center text-gray-500">データがありません</div>
        )}
      </div>
    </div>
  )
}
