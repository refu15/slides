// ============================================================
// RAG 検索レイヤー
// - Gemini text-embedding-004（768次元）でクエリを埋込
// - pgvector HNSW で Top-K 近傍検索
// ============================================================

import { sql } from './db.ts'

const EMBED_MODEL = 'text-embedding-004'
const EMBED_DIM = 768

export interface RagHit {
  id: string
  source: string
  chunk_text: string
  similarity: number
}

/** 質問文を 768 次元ベクトルに埋め込む */
export async function embed(text: string): Promise<number[]> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error('GEMINI_API_KEY is not set')

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${EMBED_MODEL}:embedContent`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({
        content: { parts: [{ text }] },
        taskType: 'RETRIEVAL_QUERY',
      }),
    },
  )
  if (!res.ok) throw new Error(`Embed failed: ${res.status} ${await res.text()}`)
  const json = (await res.json()) as { embedding: { values: number[] } }
  const vec = json.embedding.values
  if (vec.length !== EMBED_DIM) {
    throw new Error(`Unexpected embedding dim: ${vec.length}, expected ${EMBED_DIM}`)
  }
  return vec
}

/** 近傍検索 (Top-K)。similarity は 0..1（1 が完全一致） */
export async function search(query: string, k = 5, minSimilarity = 0.55): Promise<RagHit[]> {
  const qvec = await embed(query)
  const vecLit = `[${qvec.join(',')}]`
  const q = sql()
  const rows = await q`
    SELECT
      id::text,
      source,
      chunk_text,
      1 - (embedding <=> ${vecLit}::vector) AS similarity
    FROM rag_chunks
    ORDER BY embedding <=> ${vecLit}::vector
    LIMIT ${k}
  `
  return (rows as RagHit[]).filter(h => h.similarity >= minSimilarity)
}

/** RAG 結果を System Prompt に流し込む用の整形 */
export function formatContext(hits: RagHit[]): string {
  if (hits.length === 0) return ''
  const lines = hits.map((h, i) =>
    `[資料${i + 1} / 出典: ${h.source} / 関連度: ${h.similarity.toFixed(2)}]\n${h.chunk_text}`,
  )
  return `以下は代表の発言・会社資料からの抜粋です。回答はこの内容に忠実に作成してください。\n\n${lines.join('\n\n')}`
}

/** 原稿をチャンクに分割（500〜600トークン目安） */
export function chunk(text: string, maxChars = 800, overlapChars = 100): string[] {
  const chunks: string[] = []
  let i = 0
  while (i < text.length) {
    const end = Math.min(text.length, i + maxChars)
    chunks.push(text.slice(i, end))
    i = end - overlapChars
    if (i >= text.length) break
  }
  return chunks
}

/** チャンクを埋込して DB に INSERT（RETRIEVAL_DOCUMENT タスクを指定） */
export async function ingest(input: {
  source: string
  sourceRef?: string
  text: string
}): Promise<number> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error('GEMINI_API_KEY is not set')

  const pieces = chunk(input.text)
  const q = sql()
  let inserted = 0

  for (const piece of pieces) {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${EMBED_MODEL}:embedContent`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify({
          content: { parts: [{ text: piece }] },
          taskType: 'RETRIEVAL_DOCUMENT',
        }),
      },
    )
    if (!res.ok) {
      console.warn(`  skip (${res.status}):`, piece.slice(0, 40))
      continue
    }
    const json = (await res.json()) as { embedding: { values: number[] } }
    const vecLit = `[${json.embedding.values.join(',')}]`
    await q`
      INSERT INTO rag_chunks (source, source_ref, chunk_text, embedding, tokens)
      VALUES (
        ${input.source},
        ${input.sourceRef ?? null},
        ${piece},
        ${vecLit}::vector,
        ${Math.round(piece.length / 2)}
      )
    `
    inserted++
  }
  return inserted
}
