// ============================================================
// 1. 現行設定と fetched モデル一覧を比較して切替候補を抽出
// 2. 候補モデルに Eval 50問を投げて自動採点
// 3. 合格かつコスト減なら GitHub Actions 出力に recommend_switch=true を設定
// ============================================================

import fs from 'node:fs'
import path from 'node:path'
import yaml from 'js-yaml'

const CONFIG_PATH = './config/llm.yaml'
const EVAL_PATH = './eval/gline-50cases.json'
const MODELS_PATH = './tmp/gemini-models.json'
const OUT_SUMMARY = './tmp/scan-summary.json'

const cfg = yaml.load(fs.readFileSync(CONFIG_PATH, 'utf8'))
const evalSet = JSON.parse(fs.readFileSync(EVAL_PATH, 'utf8'))
const catalog = JSON.parse(fs.readFileSync(MODELS_PATH, 'utf8'))

// --- 候補抽出 --------------------------------------------------
const current = cfg.current
const currentName = current.model
const includes = cfg.scan.name_includes ?? ['flash-lite']
const excludes = cfg.scan.exclude_names ?? []

const candidates = (catalog.models ?? [])
  .map(m => ({
    name: (m.name ?? '').replace(/^models\//, ''),
    inputLimit: m.inputTokenLimit,
    outputLimit: m.outputTokenLimit,
    supported: m.supportedGenerationMethods ?? [],
  }))
  .filter(m => m.name && m.name !== currentName)
  .filter(m => includes.some(k => m.name.includes(k)))
  .filter(m => !excludes.some(k => m.name.includes(k)))
  .filter(m => (m.supported ?? []).includes('generateContent'))

console.log(`Found ${candidates.length} candidate models (excluding current "${currentName}")`)
for (const c of candidates) console.log(`  · ${c.name}`)

// --- Eval 評価 -------------------------------------------------
const results = []
for (const cand of candidates) {
  console.log(`\n--- Evaluating ${cand.name} ---`)
  const score = await evaluateModel(cand.name, evalSet)
  results.push({ ...cand, score })
  console.log(`  overall score: ${(score.overall * 100).toFixed(1)}%`)
}

// --- 合格判定 --------------------------------------------------
const min = cfg.eval.min_score ?? 0.85
const passed = results
  .filter(r => r.score.overall >= min)
  .sort((a, b) => b.score.overall - a.score.overall)

const best = passed[0] ?? null
const summary = {
  scanned_at: new Date().toISOString(),
  current: currentName,
  candidates: results,
  recommend_switch: Boolean(best),
  recommended_model: best?.name ?? null,
}
fs.mkdirSync('./tmp', { recursive: true })
fs.writeFileSync(OUT_SUMMARY, JSON.stringify(summary, null, 2))

// GitHub Actions の step output に渡す
const ghOut = process.env.GITHUB_OUTPUT
if (ghOut) {
  fs.appendFileSync(ghOut, `recommend_switch=${summary.recommend_switch}\n`)
  fs.appendFileSync(ghOut, `new_model=${summary.recommended_model ?? ''}\n`)
}

console.log(`\nDone. Recommend switch: ${summary.recommend_switch}${best ? ` → ${best.name}` : ''}`)

// ============================================================
// ヘルパ
// ============================================================

async function evaluateModel(modelName, evalSet) {
  const cases = evalSet.cases ?? []
  let totalScore = 0
  let passed = 0
  const perCategory = {}

  for (const tc of cases) {
    const answer = await callGemini(modelName, tc.q)
    const s = scoreCase(answer, tc.expected)
    totalScore += s
    if (s >= 0.8) passed++
    perCategory[tc.category] = perCategory[tc.category] ?? { sum: 0, n: 0 }
    perCategory[tc.category].sum += s
    perCategory[tc.category].n += 1
  }

  return {
    overall: cases.length ? totalScore / cases.length : 0,
    passed,
    total: cases.length,
    perCategory: Object.fromEntries(
      Object.entries(perCategory).map(([k, v]) => [k, v.sum / v.n]),
    ),
  }
}

async function callGemini(model, question) {
  const apiKey = process.env.GEMINI_API_KEY
  const systemPrompt = fs.readFileSync('./prompts/sanbo-persona.md', 'utf8')
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents: [{ role: 'user', parts: [{ text: question }] }],
      generationConfig: { temperature: 0.7, maxOutputTokens: 1024 },
    }),
  })
  if (!res.ok) {
    console.warn(`  [${model}] API error: ${res.status}`)
    return ''
  }
  const json = await res.json()
  return json.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
}

/** 単純な合成スコア (0〜1) */
function scoreCase(answer, expected) {
  if (!answer) return 0
  let hits = 0
  let total = 0

  // must_include_any
  if (expected.must_include_any) {
    total++
    if (expected.must_include_any.some(k => answer.includes(k))) hits++
  }
  // must_not_include
  if (expected.must_not_include) {
    total++
    if (!expected.must_not_include.some(k => answer.includes(k))) hits++
  }
  // length
  if (expected.min_chars || expected.max_chars) {
    total++
    const len = answer.length
    const minOk = !expected.min_chars || len >= expected.min_chars
    const maxOk = !expected.max_chars || len <= expected.max_chars
    if (minOk && maxOk) hits++
  }
  // must_escalate 系（info / 応募フォーム への誘導）
  if (expected.must_escalate || expected.must_escalate_or_redirect) {
    total++
    if (/(info|応募フォーム|お問い合わせ|面接|ご相談)/.test(answer)) hits++
  }
  // must_refuse
  if (expected.must_refuse) {
    total++
    if (/(お答えできません|ご容赦|個別にご相談|お伝えできません)/.test(answer)) hits++
  }
  // tone_check（ゆるいキーワード採点）
  if (expected.tone_check) {
    total++
    const toneKeywords = {
      enthusiastic: ['本気', '心から', '一緒', '全力'],
      warm: ['大丈夫', '気持ち', '寄り添', 'ぜひ'],
      polite: ['です', 'ます'],
      enthusiastic_polite: ['です', 'ます', '思って'],
    }
    const kws = toneKeywords[expected.tone_check] ?? ['です']
    if (kws.some(k => answer.includes(k))) hits++
  }

  return total ? hits / total : 0
}
