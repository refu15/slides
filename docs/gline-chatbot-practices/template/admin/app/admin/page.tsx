import { Suspense } from 'react'
import { sql } from '@/lib/db'
import { Breadcrumb } from '@/components/breadcrumb'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Users, MessageSquare, AlertTriangle, TrendingUp } from 'lucide-react'

export const dynamic = 'force-dynamic'
export const revalidate = 0

async function getKpiData() {
  const db = sql()
  const rows = await db<{ week: Date; unique_users: number; total_questions: number; apply_clicks: number; escalations: number; appointments_made: number; apply_conversion_pct: number }[]>`
    SELECT * FROM v_kpi_weekly LIMIT 1
  `
  return rows[0] ?? null
}

async function DashboardContent() {
  const kpi = await getKpiData()

  const stats = [
    {
      label: '今週の利用者数',
      value: kpi?.unique_users ?? 0,
      icon: Users,
      color: 'text-blue-600',
      bg: 'bg-blue-50 dark:bg-blue-950',
    },
    {
      label: '総質問数',
      value: kpi?.total_questions ?? 0,
      icon: MessageSquare,
      color: 'text-green-600',
      bg: 'bg-green-50 dark:bg-green-950',
    },
    {
      label: 'エスカレーション数',
      value: kpi?.escalations ?? 0,
      icon: AlertTriangle,
      color: 'text-orange-600',
      bg: 'bg-orange-50 dark:bg-orange-950',
    },
    {
      label: '応募転換率',
      value: `${kpi?.apply_conversion_pct ?? 0}%`,
      icon: TrendingUp,
      color: 'text-purple-600',
      bg: 'bg-purple-50 dark:bg-purple-950',
    },
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat) => (
        <Card key={stat.label}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-full ${stat.bg}`}>
                <stat.icon className={`h-6 w-6 ${stat.color}`} />
              </div>
              <div>
                <p className="text-sm text-gray-500">{stat.label}</p>
                <p className="text-2xl font-bold">{stat.value}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

export default function DashboardPage() {
  return (
    <div>
      <Breadcrumb items={[{ label: 'ダッシュボード' }]} />
      <h1 className="text-2xl font-bold mb-6">ダッシュボード</h1>
      <Suspense fallback={<div>読み込み中...</div>}>
        <DashboardContent />
      </Suspense>
    </div>
  )
}
