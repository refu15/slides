'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { approvePersona, rejectPersona, editAndCommitPersona } from './actions'

interface Props {
  prNumber: number
  currentContent: string
  proposedContent: string
  prHtmlUrl: string
}

export function PersonaActionsUI({ prNumber, currentContent, proposedContent, prHtmlUrl }: Props) {
  const [pending, startTransition] = useTransition()
  const [rejectReason, setRejectReason] = useState('')
  const [rejectOpen, setRejectOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [editContent, setEditContent] = useState(proposedContent)
  const [toast, setToast] = useState<string | null>(null)

  const notify = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 4000)
  }

  const handleApprove = () => {
    startTransition(async () => {
      const r = await approvePersona(prNumber)
      notify(r.ok ? `✅ 採用しました（${r.sha.slice(0, 7)}）` : `❌ ${r.error}`)
    })
  }

  const handleReject = () => {
    if (!rejectReason.trim()) return
    startTransition(async () => {
      const r = await rejectPersona(prNumber, rejectReason)
      notify(r.ok ? '🗑 却下しました' : `❌ ${r.error}`)
      if (r.ok) {
        setRejectOpen(false)
        setRejectReason('')
      }
    })
  }

  const handleEdit = () => {
    startTransition(async () => {
      const r = await editAndCommitPersona(prNumber, editContent)
      notify(r.ok ? `✏️ 修正をコミットしました（${r.sha.slice(0, 7)}）` : `❌ ${r.error}`)
      if (r.ok) setEditOpen(false)
    })
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Button onClick={handleApprove} disabled={pending} variant="default">
          🟢 採用（merge）
        </Button>

        <Button disabled={pending} variant="destructive" onClick={() => setRejectOpen(true)}>
          🔴 却下
        </Button>
        <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>却下理由を入力</DialogTitle>
            </DialogHeader>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="例: 口調が硬すぎる / 固有名詞が間違っている 等"
              rows={6}
              maxLength={1000}
              className="w-full rounded-md border border-border bg-background p-3 text-sm"
            />
            <div className="text-xs text-muted-foreground">
              理由は PR コメントとして記録され、次回の persona 分析プロンプトに注入されます。
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setRejectOpen(false)}>キャンセル</Button>
              <Button variant="destructive" onClick={handleReject} disabled={pending || !rejectReason.trim()}>
                却下して close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Button disabled={pending} variant="outline" onClick={() => setEditOpen(true)}>
          ✏️ 微修正
        </Button>
        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>ペルソナ Markdown を直接編集</DialogTitle>
            </DialogHeader>
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              rows={24}
              className="w-full rounded-md border border-border bg-background p-3 font-mono text-xs leading-relaxed"
            />
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditOpen(false)}>キャンセル</Button>
              <Button onClick={handleEdit} disabled={pending}>
                PR ブランチへ commit
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <a
          href={prHtmlUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground underline underline-offset-2 hover:text-foreground"
        >
          GitHub で開く ↗
        </a>
      </div>

      {toast && (
        <div className="rounded-md border border-border bg-muted/50 p-3 text-sm">
          {toast}
        </div>
      )}

      <div className="text-xs text-muted-foreground">
        ※ 採用すると <code>main</code> に squash merge されます。却下は PR を close するのみ。
      </div>
    </div>
  )
}
