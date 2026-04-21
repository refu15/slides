// ============================================================
// 営業時間判定（要件定義書 4.1 / 11.4 対応）
//   平日 10:00〜17:00 JST を営業時間とする。
//   営業時間外は専用文言で「翌営業日に返信」と案内。
// ============================================================

export interface BusinessHoursConfig {
  /** 営業曜日（0=日, 1=月, ..., 6=土）。既定は平日のみ */
  weekdays?: number[]
  /** 開始時刻（時、0-23）。既定 10 */
  startHour?: number
  /** 終了時刻（時、0-23）。既定 17 */
  endHour?: number
  /** タイムゾーン。既定 'Asia/Tokyo' */
  timezone?: string
  /** 祝日リスト（YYYY-MM-DD 形式）。指定なしなら無視 */
  holidays?: string[]
}

export const DEFAULT_BUSINESS_HOURS: Required<Omit<BusinessHoursConfig, 'holidays'>> & {
  holidays: string[]
} = {
  weekdays: [1, 2, 3, 4, 5], // 月-金
  startHour: 10,
  endHour: 17,
  timezone: 'Asia/Tokyo',
  holidays: [],
}

/** 現在時刻（または指定時刻）が営業時間内かどうか */
export function isBusinessHours(
  now: Date = new Date(),
  config: BusinessHoursConfig = {},
): boolean {
  const cfg = { ...DEFAULT_BUSINESS_HOURS, ...config }

  // タイムゾーン変換（Intl.DateTimeFormat ベース）
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: cfg.timezone,
    year: 'numeric', month: '2-digit', day: '2-digit',
    weekday: 'short',
    hour: '2-digit', hour12: false,
  }).formatToParts(now)

  const get = (type: string) => parts.find(p => p.type === type)?.value ?? ''
  const year = get('year')
  const month = get('month')
  const day = get('day')
  const hour = parseInt(get('hour'), 10)
  const weekdayStr = get('weekday') // 'Mon', 'Tue', ...
  const weekdayMap: Record<string, number> = {
    Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
  }
  const weekday = weekdayMap[weekdayStr]
  const dateStr = `${year}-${month}-${day}`

  // 祝日判定
  if (cfg.holidays.includes(dateStr)) return false
  // 営業曜日判定
  if (!cfg.weekdays.includes(weekday)) return false
  // 営業時間判定（startHour <= hour < endHour）
  if (hour < cfg.startHour || hour >= cfg.endHour) return false
  return true
}

/** 次の営業日（YYYY-MM-DD 形式、JST）を返す */
export function nextBusinessDay(
  now: Date = new Date(),
  config: BusinessHoursConfig = {},
): string {
  const cfg = { ...DEFAULT_BUSINESS_HOURS, ...config }
  const candidate = new Date(now)

  for (let i = 0; i < 14; i++) {
    candidate.setDate(candidate.getDate() + (i === 0 && isBusinessHours(candidate, config) ? 0 : 1))
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: cfg.timezone,
      year: 'numeric', month: '2-digit', day: '2-digit',
      weekday: 'short',
    }).formatToParts(candidate)
    const get = (type: string) => parts.find(p => p.type === type)?.value ?? ''
    const weekdayMap: Record<string, number> = {
      Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
    }
    const weekday = weekdayMap[get('weekday')]
    const dateStr = `${get('year')}-${get('month')}-${get('day')}`
    if (cfg.weekdays.includes(weekday) && !cfg.holidays.includes(dateStr)) {
      return dateStr
    }
  }
  return '' // 14日見つからないなら諦め
}

/** 営業時間外用の案内文言（要件定義書 11.4） */
export function outsideHoursMessage(notifyEmail = 'info@g-line.co.jp'): string {
  return (
    'ご質問ありがとうございます。' +
    '営業時間外（平日10:00〜17:00 以外）のご連絡は、翌営業日に担当者からご返信いたします。' +
    `お急ぎの場合は ${notifyEmail} までご連絡ください。`
  )
}

/** チャット応答に追加する営業時間外アノテーション（AI 応答の末尾に付与） */
export function outsideHoursNotice(notifyEmail = 'info@g-line.co.jp'): string {
  return (
    '\n\n（ただいま営業時間外です。お急ぎのご相談は ' +
    notifyEmail +
    ' までご連絡ください。）'
  )
}
