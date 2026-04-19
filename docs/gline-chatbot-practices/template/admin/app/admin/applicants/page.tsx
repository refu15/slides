import { sql, requireKey } from '@/lib/db'
import { Breadcrumb } from '@/components/breadcrumb'
import { formatDate, formatDateTime } from '@/lib/utils'

export const dynamic = 'force-dynamic'
export const revalidate = 0

interface ApplicantRow {
  id: string
  name: string
  email: string
  phone: string | null
  preferred_date: string | null
  notes: string | null
  requested_deletion: boolean
  created_at: Date
}

async function getApplicants() {
  const db = sql()
  const key = requireKey()
  return db<ApplicantRow[]>`
    SELECT
      id,
      pgp_sym_decrypt(name_enc, ${key}) AS name,
      pgp_sym_decrypt(email_enc, ${key}) AS email,
      CASE WHEN phone_enc IS NULL THEN NULL
           ELSE pgp_sym_decrypt(phone_enc, ${key}) END AS phone,
      preferred_date, notes, requested_deletion, created_at
    FROM applicants
    WHERE deleted_at IS NULL
    ORDER BY created_at DESC
  `
}

export default async function ApplicantsPage() {
  const applicants = await getApplicants()

  return (
    <div>
      <Breadcrumb items={[{ label: '応募者一覧' }]} />
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">応募者一覧</h1>
        <span className="text-sm text-gray-500">{applicants.length} 件</span>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4 text-sm text-amber-800">
        ⚠️ 個人情報が含まれます。この画面のコンテンツはコピー禁止です。
      </div>

      <div className="rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-500">氏名</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">メール</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">電話</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">希望日</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">備考</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">登録日</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {applicants.map((a) => (
              <tr key={a.id} className="bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800">
                <td className="px-4 py-3 pii-protected font-medium">{a.name}</td>
                <td className="px-4 py-3 pii-protected text-gray-600 dark:text-gray-400">{a.email}</td>
                <td className="px-4 py-3 pii-protected text-gray-600 dark:text-gray-400">{a.phone ?? '—'}</td>
                <td className="px-4 py-3">{formatDate(a.preferred_date)}</td>
                <td className="px-4 py-3 max-w-xs truncate text-gray-600 dark:text-gray-400">{a.notes ?? '—'}</td>
                <td className="px-4 py-3 text-gray-500">{formatDateTime(a.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {applicants.length === 0 && (
          <div className="p-8 text-center text-gray-500">データがありません</div>
        )}
      </div>
    </div>
  )
}
