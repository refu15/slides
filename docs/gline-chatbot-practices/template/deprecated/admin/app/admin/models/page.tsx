import Link from 'next/link'
import * as yaml from 'js-yaml'
import * as fs from 'fs/promises'
import * as path from 'path'
import { getAbTestStatus } from './ab-test/actions'

async function getLlmConfig() {
  try {
    const configPath = process.env.LLM_CONFIG_PATH
      ? path.resolve(process.cwd(), '..', process.env.LLM_CONFIG_PATH)
      : path.resolve(process.cwd(), '..', 'config', 'llm.yaml')
    const raw = await fs.readFile(configPath, 'utf-8')
    return yaml.load(raw) as Record<string, unknown>
  } catch {
    return null
  }
}

export default async function ModelsPage() {
  const [cfg, abStatus] = await Promise.all([getLlmConfig(), getAbTestStatus()])

  const current = cfg?.current as Record<string, unknown> | undefined
  const fallbackChain = cfg?.fallback_chain as Record<string, unknown>[] | undefined

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">モデル管理</h1>
          <p className="text-sm text-gray-500 mt-1">LLM設定と A/B テストを管理します</p>
        </div>
        <Link
          href="/admin/models/ab-test"
          className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          A/B テスト管理 →
        </Link>
      </div>

      {/* 現行モデル */}
      <section>
        <h2 className="text-lg font-semibold text-gray-800 mb-3">現行モデル</h2>
        {current ? (
          <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              { label: 'Provider', value: String(current.provider ?? '—') },
              { label: 'Model', value: String(current.model ?? '—') },
              { label: 'Temperature', value: String(current.temperature ?? '—') },
              { label: 'Max Output Tokens', value: String(current.max_output_tokens ?? '—') },
            ].map((item) => (
              <div key={item.label} className="flex flex-col gap-1">
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">{item.label}</span>
                <span className="text-sm font-semibold text-gray-900">{item.value}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500">設定ファイルを読み込めませんでした。</p>
        )}
      </section>

      {/* フォールバックチェーン */}
      {fallbackChain && fallbackChain.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-gray-800 mb-3">フォールバックチェーン</h2>
          <div className="space-y-2">
            {fallbackChain.map((item, i) => (
              <div key={i} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm flex items-center gap-6">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-100 text-xs font-bold text-gray-600">{i + 1}</span>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 flex-1">
                  {[
                    { label: 'Provider', value: String(item.provider ?? '—') },
                    { label: 'Model', value: String(item.model ?? '—') },
                    { label: 'Temperature', value: String(item.temperature ?? '—') },
                    { label: 'Max Tokens', value: String(item.max_output_tokens ?? '—') },
                  ].map((f) => (
                    <div key={f.label} className="flex flex-col gap-0.5">
                      <span className="text-xs text-gray-500">{f.label}</span>
                      <span className="text-sm font-medium text-gray-800">{f.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* A/B テスト概況 */}
      <section>
        <h2 className="text-lg font-semibold text-gray-800 mb-3">A/B テスト概況</h2>
        <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                abStatus.enabled
                  ? 'bg-green-100 text-green-800'
                  : 'bg-gray-100 text-gray-600'
              }`}
            >
              {abStatus.enabled ? '実行中' : '停止中'}
            </span>
            {abStatus.enabled && abStatus.candidateModel && (
              <span className="text-sm text-gray-700">
                候補: <strong>{abStatus.candidateProvider}/{abStatus.candidateModel}</strong> — {abStatus.trafficPercentage}% トラフィック
              </span>
            )}
          </div>
          <Link href="/admin/models/ab-test/new" className="text-sm text-blue-600 hover:underline">
            新規テスト開始 →
          </Link>
        </div>
      </section>
    </div>
  )
}
