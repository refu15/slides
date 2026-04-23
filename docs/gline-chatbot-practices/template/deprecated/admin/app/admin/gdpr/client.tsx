'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogHeader, DialogTitle, DialogContent, DialogFooter } from '@/components/ui/dialog'
import { searchApplicantByEmail, deleteApplicant } from './actions'
import type { SearchResult } from './actions'

type Step = 'search' | 'confirm' | 'done'

export function GdprClient() {
  const [step, setStep] = useState<Step>('search')
  const [email, setEmail] = useState('')
  const [searchResult, setSearchResult] = useState<{
    found: boolean
    count: number
    emailHash: string
    records: SearchResult[]
    error?: string
  } | null>(null)
  const [confirmEmail, setConfirmEmail] = useState('')
  const [confirmText, setConfirmText] = useState('')
  const [deleteResult, setDeleteResult] = useState<{ success: boolean; deletedCount: number; error?: string } | null>(null)
  const [loading, setLoading] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)

  async function handleSearch(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    const fd = new FormData(e.currentTarget)
    const result = await searchApplicantByEmail(fd)
    setSearchResult(result)
    setEmail(fd.get('email') as string)
    setLoading(false)
    if (result.found) {
      setStep('confirm')
    }
  }

  async function handleDelete(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (confirmText !== '削除します') return
    if (confirmEmail !== email) return

    setLoading(true)
    const fd = new FormData()
    fd.set('email', email)
    fd.set('confirmEmail', confirmEmail)
    fd.set('confirmText', confirmText)
    const result = await deleteApplicant(fd)
    setDeleteResult(result)
    setLoading(false)
    setDialogOpen(false)
    if (result.success) {
      setStep('done')
    }
  }

  function reset() {
    setStep('search')
    setEmail('')
    setSearchResult(null)
    setConfirmEmail('')
    setConfirmText('')
    setDeleteResult(null)
  }

  if (step === 'done' && deleteResult?.success) {
    return (
      <div className="max-w-lg">
        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-green-800 mb-2">削除完了</h2>
          <p className="text-green-700">
            {deleteResult.deletedCount} 件の応募者データを削除しました。
          </p>
          <Button onClick={reset} className="mt-4" variant="outline">
            新しい削除要求を処理する
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-lg">
      {step === 'search' && (
        <div className="bg-white dark:bg-gray-900 border rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">ステップ 1: メールアドレスで検索</h2>
          <form onSubmit={handleSearch} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">削除対象のメールアドレス</label>
              <Input name="email" type="email" placeholder="example@email.com" required />
            </div>
            <Button type="submit" disabled={loading}>
              {loading ? '検索中...' : '検索'}
            </Button>
          </form>

          {searchResult && !searchResult.found && (
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
              {searchResult.error ?? '該当する応募者が見つかりませんでした。'}
            </div>
          )}
        </div>
      )}

      {step === 'confirm' && searchResult?.found && (
        <div className="bg-white dark:bg-gray-900 border rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-2">ステップ 2: 削除内容の確認</h2>
          <div className="bg-red-50 border border-red-200 rounded p-3 mb-4">
            <p className="text-sm text-red-800">
              <strong>{email}</strong> に関連する <strong>{searchResult.count} 件</strong>のデータを物理削除します。
              この操作は取り消しできません。
            </p>
          </div>

          <Button
            variant="destructive"
            onClick={() => setDialogOpen(true)}
            className="w-full"
          >
            削除確認ダイアログを開く
          </Button>
          <Button variant="outline" onClick={reset} className="w-full mt-2">
            キャンセル
          </Button>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogHeader>
          <DialogTitle>最終確認: 個人データ削除</DialogTitle>
        </DialogHeader>
        <DialogContent>
          <form id="delete-form" onSubmit={handleDelete} className="space-y-4">
            <div className="bg-red-50 border border-red-200 rounded p-3 text-sm text-red-800">
              ⚠️ この操作は取り消しできません。削除後、データは復元不可能です。
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                確認: メールアドレスを再入力してください
              </label>
              <Input
                type="email"
                value={confirmEmail}
                onChange={(e) => setConfirmEmail(e.target.value)}
                placeholder={email}
                required
              />
              {confirmEmail && confirmEmail !== email && (
                <p className="text-xs text-red-600 mt-1">メールアドレスが一致しません</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                「削除します」と入力してください
              </label>
              <Input
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="削除します"
                required
              />
              {confirmText && confirmText !== '削除します' && (
                <p className="text-xs text-red-600 mt-1">「削除します」と正確に入力してください</p>
              )}
            </div>
          </form>
        </DialogContent>
        <DialogFooter>
          <Button variant="outline" onClick={() => setDialogOpen(false)}>キャンセル</Button>
          <Button
            type="submit"
            form="delete-form"
            variant="destructive"
            disabled={
              loading ||
              confirmEmail !== email ||
              confirmText !== '削除します'
            }
          >
            {loading ? '削除中...' : '完全削除する'}
          </Button>
        </DialogFooter>
      </Dialog>

      {deleteResult && !deleteResult.success && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-800">
          エラー: {deleteResult.error}
        </div>
      )}
    </div>
  )
}
