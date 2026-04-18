// ============================================================
// LLM Adapter Layer
// モデル切替は config/llm.yaml を書き換えるだけで完結する。
// ============================================================

import fs from 'node:fs'
import path from 'node:path'
import yaml from 'js-yaml'

export type Role = 'system' | 'user' | 'assistant'
export interface Message { role: Role; content: string }
export interface LLMOptions {
  temperature?: number
  maxTokens?: number
  topP?: number
}
export interface LLMResponse {
  content: string
  model: string
  provider: string
  usage: { inputTokens: number; outputTokens: number }
}

export interface LLMProvider {
  readonly name: string
  chat(messages: Message[], opts?: LLMOptions): Promise<LLMResponse>
}

interface ModelConfig {
  provider: 'google' | 'openai' | 'anthropic'
  model: string
  temperature?: number
  max_output_tokens?: number
  top_p?: number
  system_prompt_path?: string
}

interface AppConfig {
  current: ModelConfig
  fallback_chain: ModelConfig[]
  ab_test?: {
    enabled: boolean
    candidate_model: string | null
    candidate_provider: 'google' | 'openai' | 'anthropic' | null
    traffic_percentage: number
  }
}

// ------------------------------------------------------------
// Providers
// ------------------------------------------------------------

class GeminiProvider implements LLMProvider {
  readonly name = 'google'
  constructor(private cfg: ModelConfig) {}

  async chat(messages: Message[], opts: LLMOptions = {}): Promise<LLMResponse> {
    const apiKey = requireEnv('GEMINI_API_KEY')
    // Gemini は system は contents とは別枠で送る
    const system = messages.filter(m => m.role === 'system').map(m => m.content).join('\n')
    const contents = messages
      .filter(m => m.role !== 'system')
      .map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      }))

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.cfg.model}:generateContent`
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        contents,
        systemInstruction: system ? { parts: [{ text: system }] } : undefined,
        generationConfig: {
          temperature: opts.temperature ?? this.cfg.temperature,
          maxOutputTokens: opts.maxTokens ?? this.cfg.max_output_tokens,
          topP: opts.topP ?? this.cfg.top_p,
        },
      }),
    })
    if (!res.ok) throw new Error(`Gemini ${res.status}: ${await res.text()}`)
    const json = await res.json() as any
    const text = json.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
    return {
      content: text,
      model: this.cfg.model,
      provider: this.name,
      usage: {
        inputTokens: json.usageMetadata?.promptTokenCount ?? 0,
        outputTokens: json.usageMetadata?.candidatesTokenCount ?? 0,
      },
    }
  }
}

class OpenAIProvider implements LLMProvider {
  readonly name = 'openai'
  constructor(private cfg: ModelConfig) {}

  async chat(messages: Message[], opts: LLMOptions = {}): Promise<LLMResponse> {
    const apiKey = requireEnv('OPENAI_API_KEY')
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: this.cfg.model,
        messages,
        temperature: opts.temperature ?? this.cfg.temperature,
        max_tokens: opts.maxTokens ?? this.cfg.max_output_tokens,
        top_p: opts.topP ?? this.cfg.top_p,
      }),
    })
    if (!res.ok) throw new Error(`OpenAI ${res.status}: ${await res.text()}`)
    const json = await res.json() as any
    return {
      content: json.choices?.[0]?.message?.content ?? '',
      model: this.cfg.model,
      provider: this.name,
      usage: {
        inputTokens: json.usage?.prompt_tokens ?? 0,
        outputTokens: json.usage?.completion_tokens ?? 0,
      },
    }
  }
}

class AnthropicProvider implements LLMProvider {
  readonly name = 'anthropic'
  constructor(private cfg: ModelConfig) {}

  async chat(messages: Message[], opts: LLMOptions = {}): Promise<LLMResponse> {
    const apiKey = requireEnv('ANTHROPIC_API_KEY')
    const system = messages.filter(m => m.role === 'system').map(m => m.content).join('\n')
    const rest = messages.filter(m => m.role !== 'system')
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: this.cfg.model,
        system: system || undefined,
        messages: rest,
        temperature: opts.temperature ?? this.cfg.temperature,
        max_tokens: opts.maxTokens ?? this.cfg.max_output_tokens ?? 1024,
      }),
    })
    if (!res.ok) throw new Error(`Anthropic ${res.status}: ${await res.text()}`)
    const json = await res.json() as any
    return {
      content: json.content?.[0]?.text ?? '',
      model: this.cfg.model,
      provider: this.name,
      usage: {
        inputTokens: json.usage?.input_tokens ?? 0,
        outputTokens: json.usage?.output_tokens ?? 0,
      },
    }
  }
}

// ------------------------------------------------------------
// Factory & Fallback
// ------------------------------------------------------------

const providerMap = {
  google: GeminiProvider,
  openai: OpenAIProvider,
  anthropic: AnthropicProvider,
} as const

function requireEnv(name: string): string {
  const v = process.env[name]
  if (!v) throw new Error(`Missing env var: ${name}`)
  return v
}

let _config: AppConfig | null = null
export function loadConfig(configPath = './config/llm.yaml'): AppConfig {
  if (_config) return _config
  const raw = fs.readFileSync(path.resolve(configPath), 'utf8')
  _config = yaml.load(raw) as AppConfig
  return _config
}

export function clearConfigCache() {
  _config = null
}

export function createProvider(cfg: ModelConfig): LLMProvider {
  const Ctor = providerMap[cfg.provider]
  if (!Ctor) throw new Error(`Unknown provider: ${cfg.provider}`)
  return new Ctor(cfg)
}

/**
 * A/B テスト対応つきの単発呼び出し。
 * 現行モデルで失敗したら fallback_chain を順に試行する。
 */
export async function chatWithFallback(
  messages: Message[],
  opts: LLMOptions = {},
  userId?: string,
): Promise<LLMResponse> {
  const cfg = loadConfig()
  const current = pickCurrentModel(cfg, userId)
  const chain = [current, ...cfg.fallback_chain]
  let lastErr: unknown
  for (const m of chain) {
    try {
      return await createProvider(m).chat(messages, opts)
    } catch (e) {
      lastErr = e
      console.warn(`[${m.provider}/${m.model}] failed: ${(e as Error).message} — trying next`)
    }
  }
  throw new Error(`All providers failed. Last error: ${String(lastErr)}`)
}

/** A/B テスト有効時は userId のハッシュで割当を決定 */
function pickCurrentModel(cfg: AppConfig, userId?: string): ModelConfig {
  const ab = cfg.ab_test
  if (!ab?.enabled || !ab.candidate_model || !ab.candidate_provider) return cfg.current
  const bucket = userId ? hashBucket(userId) : Math.random() * 100
  if (bucket < ab.traffic_percentage) {
    return {
      ...cfg.current,
      provider: ab.candidate_provider,
      model: ab.candidate_model,
    }
  }
  return cfg.current
}

function hashBucket(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return h % 100
}

/** システムプロンプトを config から読み込んで先頭に挿入する補助 */
export function withSystemPrompt(messages: Message[]): Message[] {
  const cfg = loadConfig()
  const p = cfg.current.system_prompt_path
  if (!p) return messages
  const sys = fs.readFileSync(path.resolve(p), 'utf8')
  return [{ role: 'system', content: sys }, ...messages]
}
