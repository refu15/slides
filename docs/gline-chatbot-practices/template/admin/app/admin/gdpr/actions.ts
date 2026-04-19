'use server'

import { sql } from '@/lib/db'
import { z } from 'zod'
import { createHash } from 'crypto'

const searchSchema = z.object({
  email: z.string().email(),
})

const deleteSchema = z.object({
  email: z.string().email(),
  confirmEmail: z.string().email(),
  confirmText: z.string(),
})

export interface SearchResult {
  id: string
  email_hash: string
  created_at: Date
  requested_deletion: boolean
}

export async function searchApplicantByEmail(formData: FormData): Promise<{
  found: boolean
  count: number
  emailHash: string
  records: SearchResult[]
  error?: string
}> {
  const parsed = searchSchema.safeParse({ email: formData.get('email') })
  if (!parsed.success) {
    return { found: false, count: 0, emailHash: '', records: [], error: '有効なメールアドレスを入力してください' }
  }

  const emailHash = createHash('sha256').update(parsed.data.email.toLowerCase()).digest('hex')
  const db = sql()
  const rows = await db<SearchResult[]>`
    SELECT id, email_hash, created_at, requested_deletion
    FROM applicants
    WHERE email_hash = ${emailHash} AND deleted_at IS NULL
  `

  return {
    found: rows.length > 0,
    count: rows.length,
    emailHash,
    records: rows,
  }
}

export async function deleteApplicant(formData: FormData): Promise<{
  success: boolean
  deletedCount: number
  error?: string
}> {
  const parsed = deleteSchema.safeParse({
    email: formData.get('email'),
    confirmEmail: formData.get('confirmEmail'),
    confirmText: formData.get('confirmText'),
  })

  if (!parsed.success) {
    return { success: false, deletedCount: 0, error: '入力内容が不正です' }
  }

  if (parsed.data.email !== parsed.data.confirmEmail) {
    return { success: false, deletedCount: 0, error: 'メールアドレスが一致しません' }
  }

  if (parsed.data.confirmText !== '削除します') {
    return { success: false, deletedCount: 0, error: '「削除します」と正確に入力してください' }
  }

  const emailHash = createHash('sha256').update(parsed.data.email.toLowerCase()).digest('hex')
  const db = sql()

  const deleted = await db<{ id: string }[]>`
    DELETE FROM applicants
    WHERE email_hash = ${emailHash}
    RETURNING id
  `

  return { success: true, deletedCount: deleted.length }
}
