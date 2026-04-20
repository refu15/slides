// ============================================================
// ペルソナ自動学習パイプライン
// 実行: npx tsx scripts/analyze-persona.mts
// ============================================================

import fs from 'node:fs'
import path from 'node:path'
import { ingest } from '../lib/rag.ts'
import { sql, closeDb } from '../lib/db.ts'
import { PersonaAnalysisSchema, type PersonaAnalysis } from '../pipeline/schema.ts'

const GEMINI_API_KEY = process.env.GEMINI_API_KEY
const DATABASE_URL = process.env.DATABASE_URL

if (!GEMINI_API_KEY) {
  console.error('[analyze-persona] ERROR: GEMINI_API_KEY が設定されていません。')
  console.error('  export GEMINI_API_KEY=<your-key> を実行してから再試行してください。')
  process.exit(1)
}

if (!DATABASE_URL) {
  console.error('[analyze-persona] ERROR: DATABASE_URL が設定されていません。')
  console.error('  export DATABASE_URL=<postgres://...> を実行してから再試行してください。')
  process.exit(1)
}

const ROOT = path.resolve(import.meta.dirname, "..")
const SOURCES_DIR = path.join(ROOT, "rag_sources")
const PROMPTS_DIR = path.join(ROOT, "pipeline", "prompts")
const PERSONA_PATH = path.join(ROOT, "prompts", "sanbo-persona.md")
const TMP_DIR = path.join(ROOT, "tmp")
const OUT_ANALYSIS = path.join(TMP_DIR, "persona-analysis.json")
const OUT_PROPOSED = path.join(TMP_DIR, "persona-proposed.md")
const OUT_DIFF = path.join(TMP_DIR, "persona-diff.md")
const MAX_CHARS_PER_REQUEST = 1_500_000

function loadSources(): Array<{ filename: string; text: string }> {
  if (!fs.existsSync(SOURCES_DIR)) {
    console.warn('[analyze-persona] rag_sources/ が存在しません。空のまま続行します。')
    return []
  }
  const files = fs.readdirSync(SOURCES_DIR)
    .filter(f => (f.endsWith('.txt') || f.endsWith('.md')) && f !== 'README.md')
    .sort()
  if (files.length === 0) {
    console.warn('[analyze-persona] rag_sources/ にテキストファイルがありません。')
    return []
  }
  return files.map(f => ({
    filename: f,
    text: fs.readFileSync(path.join(SOURCES_DIR, f), "utf8"),
  }))
}

function loadExtractPrompt(): string {
  const promptPath = path.join(PROMPTS_DIR, "extract.md")
  if (!fs.existsSync(promptPath)) throw new Error("extract.md が見つかりません: " + promptPath)
  return fs.readFileSync(promptPath, "utf8")
}

function splitIntoChunks(text: string, maxChars: number): string[] {
  if (text.length <= maxChars) return [text]
  const chunks: string[] = []
  let i = 0
  while (i < text.length) { chunks.push(text.slice(i, i + maxChars)); i += maxChars }
  return chunks
}

interface GeminiResponse {
  candidates: Array<{ content: { parts: Array<{ text: string }>; role: string }; finishReason: string }>
}

async function callGemini(prompt: string): Promise<string> {
  const url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro-preview-05-06:generateContent?key=" + GEMINI_API_KEY
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: prompt }] }], generationConfig: { temperature: 0.2, maxOutputTokens: 8192, responseMimeType: "application/json" } }),
    signal: AbortSignal.timeout(120_000),
  })
  if (!res.ok) { const b = await res.text().catch(() => ""); throw new Error("Gemini エラー: " + res.status + " " + b.slice(0, 300)) }
  const json = (await res.json()) as GeminiResponse
  const text = json.candidates?.[0]?.content?.parts?.[0]?.text ?? ""
  if (!text) throw new Error("Gemini から空のレスポンス")
  return text
}

function mergeAnalyses(analyses: PersonaAnalysis[]): PersonaAnalysis {
  if (analyses.length === 0) return {
    catchphrases: [],
    style_metrics: { avg_sentence_length: 0, politeness_level: 3, passion_level: 3 },
    values: [], signature_stories: [], avoid_topics: [], few_shot_examples: [],
    proposed_persona_changes: { additions: [], removals: [], modifications: [] },
  }
  if (analyses.length === 1) return analyses[0]
  const phraseMap = new Map<string, { count: number; examples: string[] }>()
  for (const a of analyses) for (const cp of a.catchphrases) {
    const e = phraseMap.get(cp.phrase)
    if (e) { e.count += cp.count; e.examples = [...new Set([...e.examples, ...cp.examples])].slice(0, 3) }
    else phraseMap.set(cp.phrase, { count: cp.count, examples: cp.examples })
  }
  const catchphrases = Array.from(phraseMap.entries())
    .map(([phrase, v]) => ({ phrase, count: v.count, examples: v.examples }))
    .sort((a, b) => b.count - a.count)
  const avg = (fn: (a: PersonaAnalysis) => number) => Math.round(analyses.reduce((s, a) => s + fn(a), 0) / analyses.length * 10) / 10
  const sm = {
    avg_sentence_length: Math.round(analyses.reduce((s, a) => s + a.style_metrics.avg_sentence_length, 0) / analyses.length),
    politeness_level: avg(a => a.style_metrics.politeness_level),
    passion_level: avg(a => a.style_metrics.passion_level),
  }
  const dedup = (arr: string[]) => [...new Set(arr)]
  return {
    catchphrases, style_metrics: sm,
    values: dedup(analyses.flatMap(a => a.values)),
    signature_stories: analyses.flatMap(a => a.signature_stories).filter((s, i, arr) => arr.findIndex(x => x.title === s.title) === i),
    avoid_topics: dedup(analyses.flatMap(a => a.avoid_topics)),
    few_shot_examples: analyses.flatMap(a => a.few_shot_examples).filter((e, i, arr) => arr.findIndex(x => x.q === e.q) === i).slice(0, 10),
    proposed_persona_changes: {
      additions: dedup(analyses.flatMap(a => a.proposed_persona_changes.additions)),
      removals: dedup(analyses.flatMap(a => a.proposed_persona_changes.removals)),
      modifications: dedup(analyses.flatMap(a => a.proposed_persona_changes.modifications)),
    },
  }
}

function buildProposedPersona(analysis: PersonaAnalysis, currentPersona: string): string {
  const L: string[] = []
  L.push("# sanbo-persona.md 改訂案")
  L.push("")
  L.push("> このファイルは analyze-persona.mts が自動生成した改訂案です。prompts/sanbo-persona.md に反映前に確認してください。")
  L.push(""); L.push("---"); L.push("")
  L.push("## 現在のペルソナ"); L.push(""); L.push(currentPersona.trim()); L.push(""); L.push("---"); L.push("")
  L.push("## 提案される変更"); L.push("")
  const { additions, removals, modifications } = analysis.proposed_persona_changes
  if (additions.length > 0) { L.push("### 追加提案"); additions.forEach(a => L.push("- " + a)); L.push("") }
  if (removals.length > 0) { L.push("### 削除提案"); removals.forEach(r => L.push("- " + r)); L.push("") }
  if (modifications.length > 0) { L.push("### 修正提案"); modifications.forEach(m => L.push("- " + m)); L.push("") }
  L.push("---"); L.push("")
  L.push("## キャッチフレーズ Top 10"); L.push("")
  analysis.catchphrases.slice(0, 10).forEach(cp => { L.push("- **" + cp.phrase + "** (" + cp.count + " 回)"); cp.examples.slice(0, 2).forEach(ex => L.push("  - 例: " + ex)) })
  L.push(""); L.push("## スタイル指標"); L.push("")
  L.push("- 平均文長: " + analysis.style_metrics.avg_sentence_length + " 文字")
  L.push("- 丁寧度: " + analysis.style_metrics.politeness_level + " / 5")
  L.push("- 情熱レベル: " + analysis.style_metrics.passion_level + " / 5")
  L.push("")
  if (analysis.values.length > 0) { L.push("## 価値観・信念"); L.push(""); analysis.values.forEach(v => L.push("- " + v)); L.push("") }
  if (analysis.few_shot_examples.length > 0) {
    L.push("## Few-shot 対話例"); L.push("")
    analysis.few_shot_examples.forEach((ex, i) => { L.push("### 例 " + (i+1)); L.push("**Q:** " + ex.q); L.push(""); L.push("**A:** " + ex.a); L.push("") })
  }
  return L.join("\n")
}

function buildDiffReport(analysis: PersonaAnalysis): string {
  const L: string[] = []
  L.push("# ペルソナ差分レポート")
  L.push("> 生成日時: " + new Date().toISOString())
  L.push("")
  const { additions, removals, modifications } = analysis.proposed_persona_changes
  if (additions.length + removals.length + modifications.length === 0) {
    L.push("現在のペルソナと原稿の乖離は検出されませんでした。")
    return L.join("\n")
  }
  L.push("## サマリー")
  L.push("- 追加: " + additions.length + " 件 / 削除: " + removals.length + " 件 / 修正: " + modifications.length + " 件")
  L.push("")
  if (additions.length > 0) { L.push("## 追加提案"); additions.forEach(a => L.push("- " + a)); L.push("") }
  if (removals.length > 0) { L.push("## 削除提案"); removals.forEach(r => L.push("- " + r)); L.push("") }
  if (modifications.length > 0) { L.push("## 修正提案"); modifications.forEach(m => L.push("- " + m)); L.push("") }
  L.push("---"); L.push(""); L.push("詳細は tmp/persona-proposed.md を参照してください。")
  return L.join("\n")
}

function isLeadershipChunk(text: string): boolean {
  return [/私[はがのを]/,/我々[はがのを]/,/僕[はがのを]/,/代表として/,/社長として/,/大切にし/,/信念/,/使命/,/ビジョン/,/本気/,/覚悟/,/挑戦/,/目指す/,/思っています/,/考えています/,/感じています/].some(p => p.test(text))
}

async function main(): Promise<void> {
  console.log('[analyze-persona] 開始')
  fs.mkdirSync(TMP_DIR, { recursive: true })
  const sources = loadSources()
  const combinedText = sources.map(s => "\n\n=== " + s.filename + " ===\n\n" + s.text).join("")
  console.log('[analyze-persona] ソース: ' + sources.length + ' 件 / 合計 ' + combinedText.length.toLocaleString() + ' 文字')
  const extractPromptTemplate = loadExtractPrompt()
  let analysis: PersonaAnalysis
  if (sources.length === 0 || combinedText.trim().length === 0) {
    console.warn('[analyze-persona] 分析対象テキストがありません。空の分析結果を生成します。')
    analysis = mergeAnalyses([])
  } else {
    const chunks = splitIntoChunks(combinedText, MAX_CHARS_PER_REQUEST)
    console.log('[analyze-persona] Gemini: ' + chunks.length + ' リクエストに分割')
    const partialAnalyses: PersonaAnalysis[] = []
    for (let i = 0; i < chunks.length; i++) {
      console.log('[analyze-persona] Gemini 呼び出し ' + (i + 1) + '/' + chunks.length)
      const rawResponse = await callGemini(extractPromptTemplate.replace("{{SOURCE_TEXT}}", chunks[i]))
      let parsed: unknown
      try { parsed = JSON.parse(rawResponse) } catch { console.warn("JSON パース失敗 チャンク " + (i+1)); continue }
      const validated = PersonaAnalysisSchema.safeParse(parsed)
      if (!validated.success) { console.warn("zod 検証失敗 チャンク " + (i+1)); continue }
      partialAnalyses.push(validated.data)
    }
    analysis = mergeAnalyses(partialAnalyses)
  }
  fs.writeFileSync(OUT_ANALYSIS, JSON.stringify(analysis, null, 2), "utf8")
  console.log('[analyze-persona] 分析結果: ' + OUT_ANALYSIS)
  const currentPersona = fs.existsSync(PERSONA_PATH) ? fs.readFileSync(PERSONA_PATH, "utf8") : ""
  if (!currentPersona) console.warn('[analyze-persona] prompts/sanbo-persona.md が見つかりません。')
  fs.writeFileSync(OUT_PROPOSED, buildProposedPersona(analysis, currentPersona), "utf8")
  console.log('[analyze-persona] 改訂案: ' + OUT_PROPOSED)
  fs.writeFileSync(OUT_DIFF, buildDiffReport(analysis), "utf8")
  console.log('[analyze-persona] 差分レポート: ' + OUT_DIFF)
  console.log('[analyze-persona] RAG 再構築...')
  const q = sql()
  try {
    await q`DELETE FROM rag_chunks WHERE source LIKE 'persona:%' OR source LIKE 'rag_source:%'`
    let totalInserted = 0
    for (const source of sources) {
      const leadershipText = source.text.split(/\n{2,}/).filter(isLeadershipChunk).join("\n\n")
      if (!leadershipText.trim()) { console.log("  " + source.filename + ": スキップ"); continue }
      const sourceName = "rag_source:" + path.basename(source.filename, path.extname(source.filename))
      const n = await ingest(q, { source: sourceName, sourceRef: source.filename, text: leadershipText }, { geminiApiKey: GEMINI_API_KEY })
      console.log("  " + source.filename + ": " + n + " チャンク")
      totalInserted += n
    }
    console.log('[analyze-persona] RAG 完了: ' + totalInserted + ' チャンク')
  } finally { await closeDb() }
  console.log('[analyze-persona] 完了')
}

main().catch(err => {
  console.error('[analyze-persona] 予期しないエラー:', (err as Error).message)
  process.exit(1)
})
