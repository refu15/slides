import { describe, it, expect } from 'vitest'
import {
  isBusinessHours,
  nextBusinessDay,
  outsideHoursMessage,
  outsideHoursNotice,
} from '../lib/business-hours.ts'

// JST の特定時刻を表す Date を作るヘルパ
function jst(isoLocal: string): Date {
  // ローカルを JST とみなして Date を作成（JST=UTC+9）
  return new Date(`${isoLocal}+09:00`)
}

describe('isBusinessHours', () => {
  it('平日 11:00 JST は営業時間内', () => {
    expect(isBusinessHours(jst('2026-04-20T11:00:00'))).toBe(true) // 月曜
    expect(isBusinessHours(jst('2026-04-21T11:00:00'))).toBe(true) // 火曜
    expect(isBusinessHours(jst('2026-04-24T16:59:00'))).toBe(true) // 金曜
  })

  it('平日 09:59 JST は営業時間外', () => {
    expect(isBusinessHours(jst('2026-04-20T09:59:00'))).toBe(false)
  })

  it('平日 17:00 JST は営業時間外（開始 <= < 終了）', () => {
    expect(isBusinessHours(jst('2026-04-20T17:00:00'))).toBe(false)
    expect(isBusinessHours(jst('2026-04-20T18:30:00'))).toBe(false)
  })

  it('土日は営業時間外', () => {
    expect(isBusinessHours(jst('2026-04-25T12:00:00'))).toBe(false) // 土
    expect(isBusinessHours(jst('2026-04-26T12:00:00'))).toBe(false) // 日
  })

  it('祝日リストに入っている日は営業時間外', () => {
    const holidays = ['2026-05-05']
    expect(isBusinessHours(jst('2026-05-05T11:00:00'), { holidays })).toBe(false)
  })

  it('カスタム営業時間に対応', () => {
    expect(
      isBusinessHours(jst('2026-04-20T20:00:00'), { startHour: 9, endHour: 22 }),
    ).toBe(true)
  })
})

describe('nextBusinessDay', () => {
  it('土曜 12:00 の翌営業日は月曜', () => {
    const d = nextBusinessDay(jst('2026-04-25T12:00:00'))
    expect(d).toBe('2026-04-27')
  })

  it('平日 18:00 の翌営業日は翌日', () => {
    const d = nextBusinessDay(jst('2026-04-20T18:00:00'))
    expect(d).toBe('2026-04-21')
  })

  it('平日営業時間内なら当日を返す', () => {
    const d = nextBusinessDay(jst('2026-04-20T11:00:00'))
    expect(d).toBe('2026-04-20')
  })
})

describe('メッセージ', () => {
  it('営業時間外メッセージに info メールが含まれる', () => {
    const msg = outsideHoursMessage('info@example.com')
    expect(msg).toContain('info@example.com')
    expect(msg).toContain('翌営業日')
  })

  it('営業時間外注釈は短くする', () => {
    const note = outsideHoursNotice('info@example.com')
    expect(note.length).toBeLessThan(100)
    expect(note).toContain('info@example.com')
  })
})
