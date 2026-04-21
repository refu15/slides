import { useState, useRef, useEffect, useCallback } from 'preact/hooks'
/* eslint-disable @typescript-eslint/no-explicit-any */

interface Props {
  apiUrl: string
  tenantId: string
  turnstileSiteKey?: string
}

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, opts: {
        sitekey: string
        callback?: (token: string) => void
        'error-callback'?: () => void
        'expired-callback'?: () => void
        theme?: 'light' | 'dark' | 'auto'
      }) => string
      reset: (widgetId?: string) => void
    }
  }
}

interface Message {
  role: 'user' | 'assistant'
  content: string
  escalated?: boolean
}

const WELCOME_TEXT = 'こんにちは！G-LINE の採用担当AIです。会社のこと、お仕事のこと、応募のこと — 何でもお気軽にお尋ねください。私は代表の考え方を学んでいるので、率直にお答えします。'

function isBusinessHoursJST(now = new Date()): boolean {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Tokyo',
    weekday: 'short',
    hour: '2-digit',
    hour12: false,
  }).formatToParts(now)
  const weekday = parts.find((p) => p.type === 'weekday')?.value ?? ''
  const hour = parseInt(parts.find((p) => p.type === 'hour')?.value ?? '0', 10)
  const isWeekday = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].includes(weekday)
  return isWeekday && hour >= 10 && hour < 17
}

const QUICK_REPLIES = [
  '御社の事業内容を教えて',
  '未経験でも応募できますか？',
  '面接を予約したいです',
  '代表はどんな人ですか？',
]

export function ChatbotApp({ apiUrl, tenantId, turnstileSiteKey }: Props) {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: WELCOME_TEXT },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [showApply, setShowApply] = useState(false)
  const [applyFormOpen, setApplyFormOpen] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const sessionIdRef = useRef<string>(getOrCreateSessionId())

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, loading])

  const sendEvent = useCallback(async (type: string, metadata: Record<string, unknown> = {}) => {
    try {
      await fetch(`${apiUrl}/api/event`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Tenant-Id': tenantId },
        body: JSON.stringify({ sessionId: sessionIdRef.current, type, metadata }),
      })
    } catch {}
  }, [apiUrl, tenantId])

  const toggleOpen = useCallback(() => {
    setOpen((prev) => {
      const next = !prev
      if (next) sendEvent('chat_open')
      return next
    })
  }, [sendEvent])

  const send = useCallback(async (text: string) => {
    const trimmed = text.trim()
    if (!trimmed || loading) return

    setMessages((prev) => [...prev, { role: 'user', content: trimmed }])
    setInput('')
    setLoading(true)

    try {
      const history = messages
        .filter((m) => m.content !== WELCOME_TEXT)
        .slice(-6)
        .map((m) => ({ role: m.role, content: m.content }))

      const res = await fetch(`${apiUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Tenant-Id': tenantId },
        body: JSON.stringify({
          sessionId: sessionIdRef.current,
          message: trimmed,
          history,
        }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json() as { reply: string; escalated?: boolean }
      setMessages((prev) => [...prev, {
        role: 'assistant',
        content: data.reply,
        escalated: data.escalated,
      }])

      // 応募導線の推奨（キーワード検出 + 3ターン以上 で表示）
      const totalTurns = messages.filter((m) => m.role === 'user').length + 1
      if (totalTurns >= 3 && /応募|面接|エントリー|申し込み|面接予約/.test(trimmed)) {
        setShowApply(true)
      }
    } catch (e) {
      setMessages((prev) => [...prev, {
        role: 'assistant',
        content: '通信に失敗しました。しばらく待ってからもう一度お試しください。',
      }])
    } finally {
      setLoading(false)
    }
  }, [apiUrl, tenantId, loading, messages])

  return (
    <div class="gline-widget">
      {/* フローティングボタン */}
      {!open && (
        <button
          class="gline-fab"
          onClick={toggleOpen}
          aria-label="採用チャットを開く"
        >
          <span class="gline-fab-icon">💬</span>
          <span class="gline-fab-text">採用のご質問はこちら</span>
        </button>
      )}

      {/* チャットウィンドウ */}
      {open && (
        <div class="gline-window" role="dialog" aria-label="G-LINE 採用チャット">
          <div class="gline-header">
            <div>
              <div class="gline-title">G-LINE 採用相談</div>
              <div class="gline-subtitle">
                AI が代表の考えで答えます
                {!isBusinessHoursJST() && (
                  <span class="gline-badge-off"> ・ 営業時間外</span>
                )}
              </div>
            </div>
            <button class="gline-close" onClick={toggleOpen} aria-label="閉じる">×</button>
          </div>

          <div class="gline-messages" ref={scrollRef}>
            {messages.map((m, i) => (
              <div key={i} class={`gline-msg gline-msg-${m.role}${m.escalated ? ' escalated' : ''}`}>
                {m.content}
              </div>
            ))}
            {loading && <div class="gline-msg gline-msg-assistant gline-loading">考え中…</div>}
          </div>

          {messages.length === 1 && (
            <div class="gline-quick">
              {QUICK_REPLIES.map((q) => (
                <button key={q} class="gline-quick-btn" onClick={() => send(q)}>{q}</button>
              ))}
            </div>
          )}

          {showApply && (
            <div class="gline-apply-cta">
              <button
                class="gline-apply-btn"
                onClick={() => {
                  sendEvent('apply_click')
                  setApplyFormOpen(true)
                }}
              >
                応募フォームを開く →
              </button>
            </div>
          )}

          <form
            class="gline-input-form"
            onSubmit={(e) => { e.preventDefault(); send(input) }}
          >
            <input
              class="gline-input"
              type="text"
              value={input}
              onInput={(e) => setInput((e.target as HTMLInputElement).value)}
              placeholder="メッセージを入力..."
              disabled={loading}
              aria-label="質問を入力"
            />
            <button
              class="gline-send"
              type="submit"
              disabled={loading || !input.trim()}
              aria-label="送信"
            >↑</button>
          </form>

          <div class="gline-footer">
            <small>AI が応答しています。機密情報の送信はお控えください。</small>
          </div>
        </div>
      )}

      {applyFormOpen && (
        <ApplyForm
          apiUrl={apiUrl}
          tenantId={tenantId}
          sessionId={sessionIdRef.current}
          turnstileSiteKey={turnstileSiteKey}
          onClose={() => setApplyFormOpen(false)}
        />
      )}
    </div>
  )
}

// ============================================================
// 応募フォーム（Turnstile 組み込み）
// ============================================================

interface ApplyFormProps {
  apiUrl: string
  tenantId: string
  sessionId: string
  turnstileSiteKey?: string
  onClose: () => void
}

function ApplyForm({ apiUrl, tenantId, sessionId, turnstileSiteKey, onClose }: ApplyFormProps) {
  const [form, setForm] = useState({
    name: '', email: '', phone: '', preferredDate: '', notes: '',
  })
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null)
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null)
  const turnstileRef = useRef<HTMLDivElement>(null)

  // Turnstile レンダー
  useEffect(() => {
    if (!turnstileSiteKey || !turnstileRef.current) return
    const tryRender = () => {
      if (typeof window !== 'undefined' && window.turnstile && turnstileRef.current) {
        window.turnstile.render(turnstileRef.current, {
          sitekey: turnstileSiteKey,
          theme: 'auto',
          callback: (token: string) => setTurnstileToken(token),
          'error-callback': () => setTurnstileToken(null),
          'expired-callback': () => setTurnstileToken(null),
        })
        return true
      }
      return false
    }
    if (!tryRender()) {
      const interval = setInterval(() => {
        if (tryRender()) clearInterval(interval)
      }, 300)
      const timeout = setTimeout(() => clearInterval(interval), 10_000)
      return () => {
        clearInterval(interval)
        clearTimeout(timeout)
      }
    }
  }, [turnstileSiteKey])

  const submit = async (e: Event) => {
    e.preventDefault()
    if (!form.name.trim() || !form.email.trim()) {
      setResult({ ok: false, message: '氏名とメールは必須です' })
      return
    }
    if (turnstileSiteKey && !turnstileToken) {
      setResult({ ok: false, message: 'ボット検知チェックを完了してください' })
      return
    }
    setSending(true)
    setResult(null)
    try {
      const res = await fetch(`${apiUrl}/api/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Tenant-Id': tenantId },
        body: JSON.stringify({
          sessionId,
          ...form,
          ...(turnstileToken ? { turnstileToken } : {}),
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'unknown' })) as { error?: string }
        throw new Error(err.error ?? `HTTP ${res.status}`)
      }
      setResult({ ok: true, message: 'ご応募ありがとうございます。追って担当者からご連絡いたします。' })
      setTimeout(onClose, 3000)
    } catch (e) {
      setResult({ ok: false, message: `送信に失敗しました: ${(e as Error).message}` })
    } finally {
      setSending(false)
    }
  }

  return (
    <div class="gline-modal-backdrop" onClick={onClose}>
      <div class="gline-modal" onClick={(e) => e.stopPropagation()}>
        <div class="gline-modal-header">
          <div class="gline-modal-title">応募フォーム</div>
          <button class="gline-close" onClick={onClose} aria-label="閉じる">×</button>
        </div>

        <form class="gline-apply-form" onSubmit={submit}>
          <label class="gline-label">
            <span>氏名 <span class="gline-required">*</span></span>
            <input
              class="gline-input" type="text" required maxLength={100}
              value={form.name}
              onInput={(e) => setForm({ ...form, name: (e.target as HTMLInputElement).value })}
            />
          </label>
          <label class="gline-label">
            <span>メールアドレス <span class="gline-required">*</span></span>
            <input
              class="gline-input" type="email" required maxLength={254}
              value={form.email}
              onInput={(e) => setForm({ ...form, email: (e.target as HTMLInputElement).value })}
            />
          </label>
          <label class="gline-label">
            <span>電話番号</span>
            <input
              class="gline-input" type="tel" maxLength={20}
              value={form.phone}
              onInput={(e) => setForm({ ...form, phone: (e.target as HTMLInputElement).value })}
            />
          </label>
          <label class="gline-label">
            <span>ご希望日時</span>
            <input
              class="gline-input" type="text" placeholder="例: 5月10日(金) 14:00"
              value={form.preferredDate}
              onInput={(e) => setForm({ ...form, preferredDate: (e.target as HTMLInputElement).value })}
            />
          </label>
          <label class="gline-label">
            <span>相談内容・メッセージ</span>
            <textarea
              class="gline-input" rows={4} maxLength={2000}
              value={form.notes}
              onInput={(e) => setForm({ ...form, notes: (e.target as HTMLTextAreaElement).value })}
            />
          </label>

          {turnstileSiteKey && (
            <div class="gline-turnstile" ref={turnstileRef} />
          )}

          <div class="gline-consent">
            <small>
              送信により<a href="/privacy" target="_blank" rel="noreferrer">プライバシーポリシー</a>に同意したものとみなされます。
            </small>
          </div>

          {result && (
            <div class={`gline-form-result ${result.ok ? 'ok' : 'ng'}`}>
              {result.message}
            </div>
          )}

          <div class="gline-modal-footer">
            <button type="button" class="gline-btn-secondary" onClick={onClose} disabled={sending}>
              キャンセル
            </button>
            <button type="submit" class="gline-btn-primary" disabled={sending}>
              {sending ? '送信中...' : '送信する'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function getOrCreateSessionId(): string {
  const KEY = 'gline-session-id'
  try {
    const existing = sessionStorage.getItem(KEY)
    if (existing) return existing
    const id = crypto.randomUUID()
    sessionStorage.setItem(KEY, id)
    return id
  } catch {
    return `sid-${Date.now()}-${Math.random().toString(36).slice(2)}`
  }
}
