'use server'

import { sql } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

const statusValues = ['open', 'in_progress', 'resolved', 'dropped'] as const
const updateSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(statusValues),
})

export async function updateEscalationStatus(id: string, status: string) {
  const parsed = updateSchema.parse({ id, status })
  const db = sql()
  await db`
    UPDATE escalations
    SET status = ${parsed.status},
        resolved_at = ${parsed.status === 'resolved' ? new Date() : null}
    WHERE id = ${parsed.id}
  `
  revalidatePath('/admin/escalations')
}
