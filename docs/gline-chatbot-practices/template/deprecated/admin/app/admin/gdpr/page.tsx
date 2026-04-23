import { Breadcrumb } from '@/components/breadcrumb'
import { GdprClient } from './client'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default function GdprPage() {
  return (
    <div>
      <Breadcrumb items={[{ label: 'GDPR削除処理' }]} />
      <h1 className="text-2xl font-bold mb-2">GDPR 削除要求処理</h1>
      <p className="text-sm text-gray-500 mb-6">
        応募者からの個人情報削除要求を処理します。削除は取り消しできません。
      </p>
      <GdprClient />
    </div>
  )
}
