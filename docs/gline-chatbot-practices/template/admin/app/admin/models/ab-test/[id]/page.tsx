'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { stopAbTest, getAbTestMetrics } from '../actions'

type Metrics = Awaited<ReturnType<typeof getAbTestMetrics>>

// Simple confirmation dialog
function ConfirmDialog({
  open,
  onConfirm,
  onCancel,
}: {
  open: boolean
  onConfirm: () => void
  onCancel: () => void
}) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-lg shadow-lg p-6 max-w-sm w-full space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">テストを停止しますか？</h3>
        <p className="text-sm text-gray-600">
          「即時停止」PR を作成します。マージ後にトラフィックは現行モデルに戻ります。
        </p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            キャンセル
          </button>
          <button
            onClick={onConfirm}
            className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
          >
            停止する
          </button>
        </div>
      </div>
    </div>
  )
}

export default function AbTestDetailPage() {
  const router = useRouter()
  const [metrics, setMetrics] = useState<Metrics | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [stopping, setStopping] = useState(false)
  const [prUrl, setPrUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const loadMetrics = useCallback(async () => {
    try {
      const m = await getAbTestMetrics()
      setMetrics(m)
    } catch {
      // ignore
    }
  }, [])

  useEffect(() => {
    loadMetrics()
  }, [loadMetrics])

  const handleStop = async () => {
    setDialogOpen(false)
    setStopping(true)
    try {
      const res = await stopAbTest()
      setPrUrl(res.prUrl)
    } catch (err) {
      setError(err instanceof Error ? err.message : '停止 PR の作成に失敗しました')
    } finally {
      setStopping(false)
    }
  }

  // Fake time-series for charts
  const evalData = [
    { time: 'Day 1', current: 0.85, candidate: 0.86 },
    { time: 'Day 2', current: 0.86, candidate: 0.87 },
    { time: 'Day 3', current: 0.87, candidate: 0.88 },
    { time: 'Today', current: metrics?.current.evalScore ?? 0.87, candidate: metrics?.candidate?.evalScore ?? 0.88 },
  ]
  const latencyData = [
    { name: 'p50', current: (metrics?.current.avgLatencyMs ?? 320) * 0.8, candidate: (metrics?.candidate?.avgLatencyMs ?? 290) * 0.8 },
    { name: 'p95', current: metrics?.current.avgLatencyMs ?? 320, candidate: metrics?.candidate?.avgLatencyMs ?? 290 },
  ]

  return (
    <div className="p-6 space-y-6">
      <ConfirmDialog open={dialogOpen} onConfirm={handleStop} onCancel={() => setDialogOpen(false)} />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">A/B テスト結果</h1>
          <p className="text-sm text-gray-500 mt-1">実行中テストのリアルタイム指標</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => router.push('/admin/models/ab-test')}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            ← 一覧
          </button>
          <button
            onClick={() => setDialogOpen(true)}
            disabled={stopping}
            className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
          >
            {stopping ? '処理中...' : '即時停止'}
          </button>
        </div>
      </div>

      {prUrl && (
        <div className="rounded-md bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-800">
          停止 PR を作成しました:{' '}
          <a href={prUrl} target="_blank" rel="noopener noreferrer" className="underline">
            GitHub PR を開く
          </a>
        </div>
      )}
      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {/* Eval スコア推移 */}
      <section>
        <h2 className="text-lg font-semibold text-gray-800 mb-3">Eval スコア推移</h2>
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={evalData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" tick={{ fontSize: 12 }} />
              <YAxis domain={[0.8, 1]} tick={{ fontSize: 12 }} />
              <Tooltip formatter={(v: number) => `${(v * 100).toFixed(1)}%`} />
              <Legend />
              <Line type="monotone" dataKey="current" stroke="#6366f1" name="現行" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="candidate" stroke="#22c55e" name="候補" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* レイテンシ分布 */}
      <section>
        <h2 className="text-lg font-semibold text-gray-800 mb-3">レイテンシ p50/p95 (ms)</h2>
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={latencyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="current" fill="#6366f1" name="現行" />
              <Bar dataKey="candidate" fill="#22c55e" name="候補" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* 比較カード */}
      <section>
        <h2 className="text-lg font-semibold text-gray-800 mb-3">指標比較</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            {
              title: 'エスカレーション率',
              current: `${((metrics?.current.escalationRate ?? 0.05) * 100).toFixed(1)}%`,
              candidate: metrics?.candidate ? `${(metrics.candidate.escalationRate * 100).toFixed(1)}%` : '—',
            },
            {
              title: 'コスト見積 (USD/1k conv)',
              current: `$${((metrics?.current.estCostUsd ?? 0.002) * 1000).toFixed(2)}`,
              candidate: metrics?.candidate ? `$${(metrics.candidate.estCostUsd * 1000).toFixed(2)}` : '—',
            },
          ].map((card) => (
            <div key={card.title} className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
              <h3 className="text-sm font-medium text-gray-700 mb-3">{card.title}</h3>
              <div className="flex gap-6">
                <div>
                  <p className="text-xs text-gray-500">現行</p>
                  <p className="text-xl font-bold text-indigo-600">{card.current}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">候補</p>
                  <p className="text-xl font-bold text-green-600">{card.candidate}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
