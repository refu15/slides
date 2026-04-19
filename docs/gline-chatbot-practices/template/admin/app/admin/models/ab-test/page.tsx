import Link from 'next/link'
import { getAbTestStatus, getAbTestMetrics } from './actions'

export default async function AbTestPage() {
  const [status, metrics] = await Promise.all([getAbTestStatus(), getAbTestMetrics()])

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">A/B テスト管理</h1>
          <p className="text-sm text-gray-500 mt-1">実行中のテストと過去の履歴</p>
        </div>
        <Link
          href="/admin/models/ab-test/new"
          className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          + 新規テスト開始
        </Link>
      </div>

      {/* 実行中テスト */}
      <section>
        <h2 className="text-lg font-semibold text-gray-800 mb-3">実行中テスト</h2>
        {status.enabled ? (
          <div className="rounded-lg border border-green-200 bg-green-50 p-5 shadow-sm space-y-3">
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">実行中</span>
              <span className="text-sm font-medium text-gray-800">
                {status.candidateProvider}/{status.candidateModel}
              </span>
              <span className="text-sm text-gray-500">— {status.trafficPercentage}% トラフィック</span>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 text-sm">
              <div><span className="text-gray-500">開始日:</span> <span className="font-medium">{status.startDate ?? '—'}</span></div>
              <div><span className="text-gray-500">停止日:</span> <span className="font-medium">{status.stopDate ?? '—'}</span></div>
            </div>
            {/* スコアサマリ */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 mt-2">
              {[
                { label: '現行 Eval', value: `${(metrics.current.evalScore * 100).toFixed(1)}%` },
                { label: '候補 Eval', value: metrics.candidate ? `${(metrics.candidate.evalScore * 100).toFixed(1)}%` : '—' },
                { label: '現行 レイテンシ', value: `${metrics.current.avgLatencyMs}ms` },
                { label: '候補 レイテンシ', value: metrics.candidate ? `${metrics.candidate.avgLatencyMs}ms` : '—' },
              ].map((item) => (
                <div key={item.label} className="rounded-md bg-white border border-gray-200 p-3">
                  <p className="text-xs text-gray-500">{item.label}</p>
                  <p className="text-lg font-bold text-gray-900 mt-0.5">{item.value}</p>
                </div>
              ))}
            </div>
            <div className="pt-2">
              <Link href="/admin/models/ab-test/current" className="text-sm text-blue-600 hover:underline">
                詳細結果を見る →
              </Link>
            </div>
          </div>
        ) : (
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-6 text-center">
            <p className="text-sm text-gray-500">現在実行中の A/B テストはありません。</p>
            <Link href="/admin/models/ab-test/new" className="mt-2 inline-block text-sm text-blue-600 hover:underline">
              テストを開始する →
            </Link>
          </div>
        )}
      </section>

      {/* 過去履歴（プレースホルダ） */}
      <section>
        <h2 className="text-lg font-semibold text-gray-800 mb-3">過去の履歴</h2>
        <div className="rounded-lg border border-gray-200 bg-white p-6 text-center">
          <p className="text-sm text-gray-400">履歴データは GitHub PR からトラッキングされます（今後実装予定）</p>
        </div>
      </section>
    </div>
  )
}
