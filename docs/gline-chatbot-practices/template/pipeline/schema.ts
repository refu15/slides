// ============================================================
// ペルソナ分析結果の型定義（zod スキーマ）
//   Gemini 2.5 Pro が pipeline/prompts/extract.md に従って出力する JSON を検証する。
// ============================================================

import { z } from 'zod'

export const CatchphraseSchema = z.object({
  phrase: z.string().min(1),
  count: z.number().int().nonnegative(),
  examples: z.array(z.string()),
})

export const StyleMetricsSchema = z.object({
  avg_sentence_length: z.number().int().nonnegative(),
  politeness_level: z.number().min(1).max(5),
  passion_level: z.number().min(1).max(5),
})

export const SignatureStorySchema = z.object({
  title: z.string().min(1),
  summary: z.string().min(1),
})

export const FewShotExampleSchema = z.object({
  q: z.string().min(1),
  a: z.string().min(1),
})

export const ProposedPersonaChangesSchema = z.object({
  additions: z.array(z.string()),
  removals: z.array(z.string()),
  modifications: z.array(z.string()),
})

export const PersonaAnalysisSchema = z.object({
  catchphrases: z.array(CatchphraseSchema),
  style_metrics: StyleMetricsSchema,
  values: z.array(z.string()),
  signature_stories: z.array(SignatureStorySchema),
  avoid_topics: z.array(z.string()),
  few_shot_examples: z.array(FewShotExampleSchema),
  proposed_persona_changes: ProposedPersonaChangesSchema,
})

export type Catchphrase = z.infer<typeof CatchphraseSchema>
export type StyleMetrics = z.infer<typeof StyleMetricsSchema>
export type SignatureStory = z.infer<typeof SignatureStorySchema>
export type FewShotExample = z.infer<typeof FewShotExampleSchema>
export type ProposedPersonaChanges = z.infer<typeof ProposedPersonaChangesSchema>
export type PersonaAnalysis = z.infer<typeof PersonaAnalysisSchema>
