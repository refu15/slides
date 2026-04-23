'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogHeader, DialogTitle, DialogContent, DialogFooter } from '@/components/ui/dialog'
import { formatDateTime } from '@/lib/utils'
import { createFaq, updateFaq, toggleFaqPublished } from './actions'

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

interface FaqClientProps {
  faqs: FaqRow[]
  categories: string[]
  currentCategory?: string
}

export function FaqClient({ faqs, categories, currentCategory }: FaqClientProps) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<FaqRow | null>(null)

  const filtered = faqs.filter(
    (f) =>
      f.question.includes(search) ||
      f.answer.includes(search) ||
      f.category.includes(search)
  )

  function openNew() {
    setEditTarget(null)
    setDialogOpen(true)
  }

  function openEdit(faq: FaqRow) {
    setEditTarget(faq)
    setDialogOpen(true)
  }

  async function handleToggle(id: string, current: boolean) {
    await toggleFaqPublished(id, !current)
    router.refresh()
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    if (editTarget) {
      await updateFaq(editTarget.id, fd)
    } else {
      await createFaq(fd)
    }
    setDialogOpen(false)
    router.refresh()
  }

  return (
    <div>
      <div className="flex gap-3 mb-4">
        <Input
          placeholder="質問・回答を検索..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <Select
          value={currentCategory ?? ''}
          onChange={(e) => router.push(e.target.value ? `/admin/faq?category=${e.target.value}` : '/admin/faq')}
          className="max-w-[180px]"
        >
          <option value="">全カテゴリ</option>
          {categories.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </Select>
        <Button onClick={openNew} className="ml-auto">+ 新規追加</Button>
      </div>

      <div className="rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-500">優先度</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">カテゴリ</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">質問</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">状態</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">更新日時</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filtered.map((faq) => (
              <tr key={faq.id} className="bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800">
                <td className="px-4 py-3">{faq.priority}</td>
                <td className="px-4 py-3">
                  <Badge variant="outline">{faq.category}</Badge>
                </td>
                <td className="px-4 py-3 max-w-xs truncate">{faq.question}</td>
                <td className="px-4 py-3">
                  <Badge variant={faq.published ? 'success' : 'secondary'}>
                    {faq.published ? '公開中' : '非公開'}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-gray-500">{formatDateTime(faq.updated_at)}</td>
                <td className="px-4 py-3 flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => openEdit(faq)}>編集</Button>
                  <Button
                    size="sm"
                    variant={faq.published ? 'secondary' : 'default'}
                    onClick={() => handleToggle(faq.id, faq.published)}
                  >
                    {faq.published ? '非公開' : '公開'}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="p-8 text-center text-gray-500">データがありません</div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogHeader>
          <DialogTitle>{editTarget ? 'FAQ編集' : 'FAQ新規作成'}</DialogTitle>
        </DialogHeader>
        <DialogContent>
          <form id="faq-form" onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">カテゴリ</label>
              <Input name="category" defaultValue={editTarget?.category ?? ''} required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">質問</label>
              <textarea
                name="question"
                className="w-full border rounded-md p-2 text-sm min-h-[60px] dark:bg-gray-800"
                defaultValue={editTarget?.question ?? ''}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">回答</label>
              <textarea
                name="answer"
                className="w-full border rounded-md p-2 text-sm min-h-[100px] dark:bg-gray-800"
                defaultValue={editTarget?.answer ?? ''}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">キーワード（カンマ区切り）</label>
              <Input name="keywords" defaultValue={editTarget?.keywords.join(', ') ?? ''} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">優先度</label>
                <Input name="priority" type="number" defaultValue={editTarget?.priority ?? 100} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">公開状態</label>
                <Select name="published" defaultValue={String(editTarget?.published ?? true)}>
                  <option value="true">公開</option>
                  <option value="false">非公開</option>
                </Select>
              </div>
            </div>
          </form>
        </DialogContent>
        <DialogFooter>
          <Button variant="outline" onClick={() => setDialogOpen(false)}>キャンセル</Button>
          <Button type="submit" form="faq-form">保存</Button>
        </DialogFooter>
      </Dialog>
    </div>
  )
}
