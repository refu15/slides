// ============================================================
// Resend 送信ヘルパー
// ============================================================

import type { ReactElement } from 'react'
import { render } from '@react-email/render'
import { Resend } from 'resend'
import ApplyReceived, { type ApplyReceivedProps } from '../templates/apply-received'
import ApplyNotifyAdmin, { type ApplyNotifyAdminProps } from '../templates/apply-notify-admin'
import AppointmentConfirmed, { type AppointmentConfirmedProps } from '../templates/appointment-confirmed'
import GdprAcknowledged, { type GdprAcknowledgedProps } from '../templates/gdpr-acknowledged'
import ReminderD1, { type ReminderD1Props } from '../templates/reminder-d1'

const FROM = 'G-LINE 採用 <no-reply@example.jp>'
const SUBJECT_PREFIX = '【G-LINE 採用】'

let _resend: Resend | null = null
function resend(): Resend {
  if (_resend) return _resend
  const key = process.env.RESEND_API_KEY
  if (!key) throw new Error('RESEND_API_KEY is not set')
  _resend = new Resend(key)
  return _resend
}

async function sendEmail(
  to: string,
  subject: string,
  component: ReactElement,
): Promise<{ id: string }> {
  const html = await render(component)
  const text = await render(component, { plainText: true })
  const res = await resend().emails.send({
    from: FROM,
    to,
    subject: SUBJECT_PREFIX + subject,
    html,
    text,
  })
  if (res.error) throw new Error(`Resend error: ${res.error.message}`)
  return { id: res.data?.id ?? '' }
}

export async function sendApplyReceived(to: string, data: ApplyReceivedProps) {
  return sendEmail(to, 'ご応募ありがとうございます', ApplyReceived(data))
}

export async function sendApplyNotifyAdmin(to: string, data: ApplyNotifyAdminProps) {
  return sendEmail(to, `新規応募：${data.name} 様`, ApplyNotifyAdmin(data))
}

export async function sendAppointmentConfirmed(to: string, data: AppointmentConfirmedProps) {
  return sendEmail(to, '面接日時確定のご連絡', AppointmentConfirmed(data))
}

export async function sendGdprAcknowledged(to: string, data: GdprAcknowledgedProps) {
  return sendEmail(to, '個人情報削除のご依頼を承りました', GdprAcknowledged(data))
}

export async function sendReminderD1(to: string, data: ReminderD1Props) {
  return sendEmail(to, '明日の面接についてのご連絡', ReminderD1(data))
}
