'use server'

import { sql } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

const faqSchema = z.object({
  category: z.string().min(1),
  question: z.string().min(1),
  answer: z.string().min(1),
  keywords: z.string().optional(),
  priority: z.coerce.number().int().min(1).max(999),
  published: z.coerce.boolean(),
})

export async function createFaq(formData: FormData) {
  const parsed = faqSchema.parse({
    category: formData.get('category'),
    question: formData.get('question'),
    answer: formData.get('answer'),
    keywords: formData.get('keywords'),
    priority: formData.get('priority') ?? 100,
    published: formData.get('published') === 'true',
  })

  const keywords = parsed.keywords
    ? parsed.keywords.split(',').map((k) => k.trim()).filter(Boolean)
    : []

  const db = sql()
  await db`
    INSERT INTO faq (category, question, answer, keywords, priority, published)
    VALUES (${parsed.category}, ${parsed.question}, ${parsed.answer}, ${keywords}, ${parsed.priority}, ${parsed.published})
  `
  revalidatePath('/admin/faq')
}

export async function updateFaq(id: string, formData: FormData) {
  const parsed = faqSchema.parse({
    category: formData.get('category'),
    question: formData.get('question'),
    answer: formData.get('answer'),
    keywords: formData.get('keywords'),
    priority: formData.get('priority') ?? 100,
    published: formData.get('published') === 'true',
  })

  const keywords = parsed.keywords
    ? parsed.keywords.split(',').map((k) => k.trim()).filter(Boolean)
    : []

  const db = sql()
  await db`
    UPDATE faq
    SET category = ${parsed.category},
        question = ${parsed.question},
        answer = ${parsed.answer},
        keywords = ${keywords},
        priority = ${parsed.priority},
        published = ${parsed.published},
        updated_at = NOW()
    WHERE id = ${id}
  `
  revalidatePath('/admin/faq')
}

export async function toggleFaqPublished(id: string, published: boolean) {
  const db = sql()
  await db`
    UPDATE faq SET published = ${published}, updated_at = NOW() WHERE id = ${id}
  `
  revalidatePath('/admin/faq')
}
