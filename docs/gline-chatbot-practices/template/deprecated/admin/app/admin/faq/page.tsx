import { sql } from '@/lib/db'
import { Breadcrumb } from '@/components/breadcrumb'
import { Badge } from '@/components/ui/badge'
import { formatDateTime } from '@/lib/utils'
import { FaqClient } from './client'

export const dynamic = 'force-dynamic'
export const revalidate = 0

interface FaqRow {
  id: string
  category: string
  question: string
  answer: string
  keywords: string[]
  priority: number
  published: boolean
  updated_at: Date
  created_at: Date
}

async function getFaqs(category?: string) {
  const db = sql()
  if (category) {
    return db<FaqRow[]>`
      SELECT * FROM faq WHERE category = ${category} ORDER BY priority ASC, created_at DESC
    `
  }
  return db<FaqRow[]>`SELECT * FROM faq ORDER BY priority ASC, created_at DESC`
}

async function getCategories() {
  const db = sql()
  const rows = await db<{ category: string }[]>`
    SELECT DISTINCT category FROM faq ORDER BY category
  `
  return rows.map((r) => r.category)
}

export default async function FaqPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>
}) {
  const params = await searchParams
  const [faqs, categories] = await Promise.all([
    getFaqs(params.category),
    getCategories(),
  ])

  return (
    <div>
      <Breadcrumb items={[{ label: 'FAQ管理' }]} />
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">FAQ管理</h1>
      </div>
      <FaqClient faqs={faqs} categories={categories} currentCategory={params.category} />
    </div>
  )
}
