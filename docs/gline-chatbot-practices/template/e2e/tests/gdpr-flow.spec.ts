import { expect, test } from '@playwright/test';

import {
  clearTestDatabase,
  closeTestDatabase,
  getRecordedGdprRequestCount,
  recordGdprRequest,
  setupTestDatabase,
} from '../fixtures/db-helper';
import { installApiMocks } from '../fixtures/mock-api';

test('GDPR削除フォームから /api/gdpr 成功レスポンスを確認する', async ({ page }) => {
  const email = 'privacy-request@example.com';
  const db = await setupTestDatabase();

  try {
    await clearTestDatabase(db);

    await installApiMocks(page, {
      onGdpr: async ({ body, response }) => {
        if (!db.enabled) {
          return;
        }

        const bodyEmail =
          typeof body.email === 'string'
            ? body.email
            : typeof body.targetEmail === 'string'
              ? body.targetEmail
              : email;

        const requestId =
          typeof response.requestId === 'string' ? response.requestId : 'gdpr_unknown';

        await recordGdprRequest(db, bodyEmail, requestId);
      },
    });

    await page.goto('/fixtures/test-page.html');

    await page.getByLabel('削除対象メールアドレス').fill(email);

    const responsePromise = page.waitForResponse((response) => {
      return response.url().includes('/api/gdpr') && response.request().method() === 'POST';
    });

    await page.getByRole('button', { name: '削除依頼を送信' }).click();
    const response = await responsePromise;

    expect(response.ok()).toBeTruthy();

    const resultText = (await page.locator('#gdpr-result').textContent()) ?? '{}';
    const result = JSON.parse(resultText) as {
      ok?: boolean;
      requestId?: string;
      status?: string;
    };

    expect(result.ok).toBe(true);
    expect(result.requestId).toMatch(/^gdpr_/);
    expect(result.status).toBe('accepted');

    if (db.enabled) {
      await expect.poll(async () => getRecordedGdprRequestCount(db, email)).toBe(1);
    }
  } finally {
    await closeTestDatabase(db);
  }
});
