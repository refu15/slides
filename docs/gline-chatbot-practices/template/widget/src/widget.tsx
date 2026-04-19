import { useState, useRef, useEffect, useCallback } from 'preact/hooks'

interface Props {
  apiUrl: string
  tenantId: string
}

interface Message {
  role: 'user' | 'assistant'
  content: string
  escalated?: boolean
}

const WELCOME_TEXT = 'こんにちは！G-LINE の採用担当AIです。会社のこと、お仕事のこと、応募のこと — 何でもお気軽にお尋ねください。私は代表の考え方を学んでいるので、率直にお答えします。'

const QUICK_REPLIES = [
  '御社の事業内容を教えて',
  '未経験でも応募できますか？',
  '面接を予約したいです',
  '代表はどんな人ですか？',
]

export function ChatbotApp({ apiUrl, tenantId }: Props) {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: WELCOME_TEXT },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [showApply, setShowApply] = useState(false)
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
              <div class="gline-subtitle">AI が代表の考えで答えます</div>
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
              <a
                class="gline-apply-btn"
                href={`#apply?tenant=${tenantId}`}
                onClick={() => sendEvent('apply_click')}
              >
                応募フォームへ →
              </a>
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
