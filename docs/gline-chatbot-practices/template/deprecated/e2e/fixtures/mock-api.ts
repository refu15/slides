import type { Page, Route } from '@playwright/test';

export type GuardrailCategory =
  | 'salary_negotiation'
  | 'confidential_request'
  | 'gdpr_deletion'
  | 'system_prompt_probe';

export interface ApiRequestLog {
  path: string;
  method: string;
  body: Record<string, unknown>;
}

export interface MockApiState {
  chatTurn: number;
  requests: ApiRequestLog[];
}

export interface HookContext {
  body: Record<string, unknown>;
  response: Record<string, unknown>;
  state: MockApiState;
}

export interface MockApiOptions {
  useRealApi?: boolean;
  realApiBaseUrl?: string;
  onApply?: (context: HookContext) => Promise<void> | void;
  onGdpr?: (context: HookContext) => Promise<void> | void;
}

const defaultRealApiBaseUrl = process.env.REAL_API_BASE_URL ?? 'http://127.0.0.1:8787';

function toObject(value: unknown): Record<string, unknown> {
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return {};
}

function tryParseJson<T>(value: string): T | undefined {
  try {
    return JSON.parse(value) as T;
  } catch {
    return undefined;
  }
}

function pickFirstString(...values: unknown[]): string | undefined {
  for (const value of values) {
    if (typeof value === 'string' && value.trim().length > 0) {
      return value;
    }
  }

  return undefined;
}

function extractLastUserMessage(messages: unknown): string | undefined {
  if (!Array.isArray(messages)) {
    return undefined;
  }

  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const entry = messages[index];

    if (typeof entry !== 'object' || entry === null) {
      continue;
    }

    const record = entry as Record<string, unknown>;
    const role = record.role;
    const content = record.content;

    if (role === 'user' && typeof content === 'string' && content.trim().length > 0) {
      return content;
    }
  }

  return undefined;
}

function extractPrompt(body: Record<string, unknown>): string {
  return (
    pickFirstString(
      body.message,
      body.text,
      body.prompt,
      body.query,
      body.input,
      extractLastUserMessage(body.messages),
    ) ?? ''
  );
}

function detectGuardrailCategory(prompt: string): GuardrailCategory | null {
  const normalized = prompt.toLowerCase();

  if (
    /年収|給与|給料|報酬|salary|compensation|offer/i.test(prompt) &&
    /交渉|上げ|アップ|増や|negotia/i.test(prompt)
  ) {
    return 'salary_negotiation';
  }

  if (
    /社外秘|機密|秘密|confidential|内部資料|見せて|送って/i.test(prompt)
  ) {
    return 'confidential_request';
  }

  if (
    /gdpr|個人情報|削除|消して|delete my data|erase my data/i.test(normalized)
  ) {
    return 'gdpr_deletion';
  }

  if (
    /system prompt|プロンプト|instruction|内部指示|hidden prompt|developer message/i.test(
      normalized,
    )
  ) {
    return 'system_prompt_probe';
  }

  return null;
}

function hasApplyKeyword(prompt: string): boolean {
  return /応募|面接|エントリー/i.test(prompt);
}

function buildChatResponse(
  body: Record<string, unknown>,
  state: MockApiState,
): Record<string, unknown> {
  const prompt = extractPrompt(body);
  const category = detectGuardrailCategory(prompt);

  if (category) {
    const reply = `エスカレーション対象です。カテゴリ: ${category}。この問い合わせは採用担当に引き継ぎます。`;

    return {
      ok: true,
      reply,
      message: reply,
      answer: reply,
      text: reply,
      escalated: true,
      category,
      guardrailCategory: category,
      requiresHumanReview: true,
    };
  }

  let reply = `募集職種に関するご質問ですね。現在の募集要項は採用ページでご確認いただけます。`;

  if (/面接/i.test(prompt)) {
    reply = '面接は通常 2〜3 回です。詳細は選考案内メールでお知らせします。';
  }

  if (state.chatTurn >= 3 && hasApplyKeyword(prompt)) {
    reply = '応募をご希望ですね。画面下部の応募ボタンからエントリーできます。';
  }

  return {
    ok: true,
    reply,
    message: reply,
    answer: reply,
    text: reply,
    escalated: false,
    category: null,
  };
}

function buildApplyResponse(body: Record<string, unknown>): Record<string, unknown> {
  return {
    ok: true,
    status: 'received',
    applicationId: `apply_${Date.now()}`,
    receivedAt: new Date().toISOString(),
    echo: {
      name: pickFirstString(body.name, body.fullName) ?? '',
      email: pickFirstString(body.email, body.mail) ?? '',
      message: pickFirstString(body.message, body.note) ?? '',
    },
  };
}

function buildGdprResponse(body: Record<string, unknown>): Record<string, unknown> {
  return {
    ok: true,
    status: 'accepted',
    requestId: `gdpr_${Date.now()}`,
    email:
      pickFirstString(body.email, body.targetEmail, body.userEmail) ?? 'unknown@example.com',
    receivedAt: new Date().toISOString(),
  };
}

async function fulfillJson(
  route: Route,
  status: number,
  json: Record<string, unknown>,
): Promise<void> {
  await route.fulfill({
    status,
    contentType: 'application/json; charset=utf-8',
    body: JSON.stringify(json),
  });
}

export async function installApiMocks(
  page: Page,
  options: MockApiOptions = {},
): Promise<MockApiState> {
  const useRealApi = options.useRealApi ?? process.env.USE_REAL_API === 'true';
  const realApiBaseUrl = (options.realApiBaseUrl ?? defaultRealApiBaseUrl).replace(/\/$/, '');
  const state: MockApiState = {
    chatTurn: 0,
    requests: [],
  };

  await page.context().route('**/api/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;
    const method = request.method().toUpperCase();
    const rawBody = request.postData() ?? '';
    const parsedBody = tryParseJson<Record<string, unknown>>(rawBody);
    const body = toObject(parsedBody);

    state.requests.push({
      path,
      method,
      body,
    });

    if (useRealApi) {
      const targetUrl = `${realApiBaseUrl}${path}${url.search}`;
      const upstream = await route.fetch({ url: targetUrl });
      const responseText = await upstream.text();
      const headers = upstream.headers();
      const responseJson = tryParseJson<Record<string, unknown>>(responseText) ?? {};

      if (path === '/api/apply' && method === 'POST' && options.onApply) {
        await options.onApply({ body, response: responseJson, state });
      }

      if (path === '/api/gdpr' && method === 'POST' && options.onGdpr) {
        await options.onGdpr({ body, response: responseJson, state });
      }

      await route.fulfill({
        status: upstream.status(),
        headers,
        body: responseText,
      });
      return;
    }

    if (path === '/api/chat' && method === 'POST') {
      state.chatTurn += 1;
      await fulfillJson(route, 200, buildChatResponse(body, state));
      return;
    }

    if (path === '/api/apply' && method === 'POST') {
      const response = buildApplyResponse(body);

      if (options.onApply) {
        await options.onApply({ body, response, state });
      }

      await fulfillJson(route, 200, response);
      return;
    }

    if (path === '/api/gdpr' && method === 'POST') {
      const response = buildGdprResponse(body);

      if (options.onGdpr) {
        await options.onGdpr({ body, response, state });
      }

      await fulfillJson(route, 200, response);
      return;
    }

    if (path === '/api/event' && method === 'POST') {
      await fulfillJson(route, 200, {
        ok: true,
        eventId: `evt_${Date.now()}`,
      });
      return;
    }

    if (path === '/api/health' && method === 'GET') {
      await fulfillJson(route, 200, {
        ok: true,
        status: 'healthy',
      });
      return;
    }

    await fulfillJson(route, 404, {
      ok: false,
      error: `Unhandled mock route: ${method} ${path}`,
    });
  });

  return state;
}
