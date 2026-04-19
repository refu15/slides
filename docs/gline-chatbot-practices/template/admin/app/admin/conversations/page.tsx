import { sql } from '@/lib/db'
import { Breadcrumb } from '@/components/breadcrumb'
import { Badge } from '@/components/ui/badge'
import { formatDateTime } from '@/lib/utils'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const PAGE_SIZE = 20

interface ConvRow {
  id: number
  session_id: string
  turn_index: number
  role: string
  content_preview: string
  model: string | null
  tokens_in: number
  tokens_out: number
  created_at: Date
}

async function getConversations(page: number) {
  const db = sql()
  const offset = (page - 1) * PAGE_SIZE
  const rows = await db<ConvRow[]>`
    SELECT * FROM v_anonymized_conversations
    ORDER BY session_id, turn_index
    LIMIT ${PAGE_SIZE} OFFSET ${offset}
  `
  const [{ count }] = await db<{ count: number }[]>`
    SELECT COUNT(*) as count FROM v_anonymized_conversations
  `
  return { rows, total: Number(count) }
}

export default async function ConversationsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  const params = await searchParams
  const page = Math.max(1, parseInt(params.page ?? '1', 10))
  const { rows, total } = await getConversations(page)
  const totalPages = Math.ceil(total / PAGE_SIZE)

  const roleColor: Record<string, string> = {
    user: 'default',
    assistant: 'success',
    system: 'secondary',
  }

  return (
    <div>
      <Breadcrumb items={[{ label: '会話ログ' }]} />
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">会話ログ（匿名化）</h1>
        <span className="text-sm text-gray-500">全 {total.toLocaleString()} 件</span>
      </div>

      <div className="rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-500">セッション</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">順序</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">役割</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">内容（先頭500文字）</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">モデル</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">日時</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((row) => (
              <tr key={row.id} className="bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800">
                <td className="px-4 py-3 font-mono text-xs text-gray-500 max-w-[120px] truncate">
                  {row.session_id.substring(0, 12)}...
                </td>
                <td className="px-4 py-3">{row.turn_index}</td>
                <td className="px-4 py-3">
                  <Badge variant={(roleColor[row.role] as 'default' | 'success' | 'secondary') ?? 'outline'}>
                    {row.role}
                  </Badge>
                </td>
                <td className="px-4 py-3 max-w-xs">
                  <p className="text-xs text-gray-700 dark:text-gray-300 line-clamp-2">
                    {row.content_preview}
                  </p>
                </td>
                <td className="px-4 py-3 text-xs text-gray-500">{row.model ?? '—'}</td>
                <td className="px-4 py-3 text-gray-500 text-xs">{formatDateTime(row.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && (
          <div className="p-8 text-center text-gray-500">データがありません</div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4">
          {page > 1 && (
            <a href={`?page=${page - 1}`} className="px-3 py-1 border rounded text-sm hover:bg-gray-50">
              前へ
            </a>
          )}
          <span className="text-sm text-gray-500">{page} / {totalPages}</span>
          {page < totalPages && (
            <a href={`?page=${page + 1}`} className="px-3 py-1 border rounded text-sm hover:bg-gray-50">
              次へ
            </a>
          )}
        </div>
      )}
    </div>
  )
}
