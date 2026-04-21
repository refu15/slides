// ============================================================
// Sentry 初期化（Workers / Node / Edge 共通、依存は動的 import）
//   エラーキャプチャを統一するための薄いラッパ。
//   DSN 未設定時は noop。
// ============================================================

export interface SentryConfig {
  dsn?: string
  environment?: string
  release?: string
  tracesSampleRate?: number
}

export interface CapturedError {
  captured: boolean
  eventId?: string
}

/**
 * Cloudflare Workers 向け Sentry 初期化。
 * @sentry/cloudflare パッケージが入っていない環境でも安全に no-op する。
 */
export function initSentry(config: SentryConfig = {}): {
  captureException: (e: unknown, context?: Record<string, unknown>) => CapturedError
} {
  const dsn = config.dsn ?? (
    typeof process !== 'undefined' ? process.env.SENTRY_DSN : undefined
  )

  if (!dsn) {
    return {
      captureException: (e) => {
        console.error('[sentry/noop]', (e as Error)?.message ?? e)
        return { captured: false }
      },
    }
  }

  // DSN が設定されている場合はこのクロージャで Sentry を遅延ロードする
  // Workers の場合はユーザー側で @sentry/cloudflare を設定、
  // Node の場合は @sentry/node を設定するフォルダ別の前提。
  return {
    captureException: (e, context = {}) => {
      try {
        // 実装側で Sentry が利用可能ならグローバル Sentry を使用
        const Sentry = (globalThis as any).Sentry
        if (Sentry?.captureException) {
          const eventId = Sentry.captureException(e, { extra: context })
          return { captured: true, eventId }
        }
      } catch {
        /* noop */
      }
      console.error('[sentry]', (e as Error)?.message ?? e, context)
      return { captured: false }
    },
  }
}

/**
 * Worker からエラー報告を送る最小 HTTP 実装（@sentry/cloudflare なしで動作）。
 * 使う場合は captureException ではなくこちらを直接呼ぶ。
 */
export async function sendToSentryDirect(
  dsn: string,
  event: {
    message: string
    level?: 'error' | 'warning' | 'info'
    extra?: Record<string, unknown>
  },
): Promise<void> {
  try {
    const match = dsn.match(/^https:\/\/([^@]+)@([^/]+)\/(\d+)$/)
    if (!match) return
    const [, publicKey, host, projectId] = match
    const body = {
      event_id: crypto.randomUUID().replace(/-/g, ''),
      timestamp: new Date().toISOString(),
      level: event.level ?? 'error',
      message: { formatted: event.message },
      extra: event.extra ?? {},
      platform: 'javascript',
    }
    await fetch(`https://${host}/api/${projectId}/store/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Sentry-Auth': `Sentry sentry_version=7, sentry_key=${publicKey}`,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(3_000),
    })
  } catch (e) {
    console.warn('[sentry] send failed:', (e as Error).message)
  }
}
