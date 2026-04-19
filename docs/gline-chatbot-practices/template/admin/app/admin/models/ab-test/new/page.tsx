'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { startAbTest } from '../actions'

export default function NewAbTestPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [prUrl, setPrUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [form, setForm] = useState({
    candidateProvider: 'google' as 'google' | 'openai' | 'anthropic',
    candidateModel: '',
    trafficPercentage: 10,
    startDate: '',
    stopDate: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.candidateModel || !form.startDate || !form.stopDate) {
      setError('モデル名・開始日・停止日は必須です')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const result = await startAbTest(form)
      setPrUrl(result.prUrl)
    } catch (err) {
      setError(err instanceof Error ? err.message : '不明なエラーが発生しました')
    } finally {
      setLoading(false)
    }
  }

  if (prUrl) {
    return (
      <div className="p-6 max-w-lg space-y-4">
        <h1 className="text-2xl font-bold text-gray-900">PR が作成されました</h1>
        <p className="text-sm text-gray-600">以下の PR をレビュー・マージすると A/B テストが開始されます。</p>
        <a
          href={prUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          GitHub PR を開く →
        </a>
        <div>
          <button
            onClick={() => router.push('/admin/models/ab-test')}
            className="mt-2 text-sm text-gray-500 hover:underline"
          >
            ← A/B テスト一覧に戻る
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-lg">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">新規 A/B テスト</h1>
        <p className="text-sm text-gray-500 mt-1">候補モデルとトラフィック配分を設定して PR を作成します</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Provider */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">候補 Provider</label>
          <select
            value={form.candidateProvider}
            onChange={(e) => setForm({ ...form, candidateProvider: e.target.value as 'google' | 'openai' | 'anthropic' })}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="google">Google</option>
            <option value="openai">OpenAI</option>
            <option value="anthropic">Anthropic</option>
          </select>
        </div>

        {/* Model name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">候補モデル名</label>
          <input
            type="text"
            placeholder="例: gemini-3-flash"
            value={form.candidateModel}
            onChange={(e) => setForm({ ...form, candidateModel: e.target.value })}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Traffic slider */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            トラフィック配分: <span className="font-bold text-blue-600">{form.trafficPercentage}%</span>
          </label>
          <input
            type="range"
            min={0}
            max={100}
            value={form.trafficPercentage}
            onChange={(e) => setForm({ ...form, trafficPercentage: Number(e.target.value) })}
            className="w-full accent-blue-600"
          />
          <div className="flex justify-between text-xs text-gray-400 mt-0.5">
            <span>0%</span><span>50%</span><span>100%</span>
          </div>
        </div>

        {/* Dates */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">開始日</label>
            <input
              type="date"
              value={form.startDate}
              onChange={(e) => setForm({ ...form, startDate: e.target.value })}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">停止日</label>
            <input
              type="date"
              value={form.stopDate}
              onChange={(e) => setForm({ ...form, stopDate: e.target.value })}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {error && (
          <p className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{error}</p>
        )}

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? '処理中...' : 'テスト開始 (PR を作成)'}
          </button>
          <button
            type="button"
            onClick={() => router.push('/admin/models/ab-test')}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            キャンセル
          </button>
        </div>
      </form>
    </div>
  )
}
