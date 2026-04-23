import { expect, test } from '@playwright/test';

import { installApiMocks } from '../fixtures/mock-api';

test('test-page の応募フォームから /api/apply を直叩きできる', async ({ page }) => {
  const state = await installApiMocks(page);

  await page.goto('/fixtures/test-page.html');

  await page.getByLabel('氏名').fill('E2E Applicant');
  await page.getByLabel('メールアドレス').fill('applicant@example.com');
  await page.getByLabel('応募メッセージ').fill('Frontend engineer に応募します。');

  const responsePromise = page.waitForResponse((response) => {
    return response.url().includes('/api/apply') && response.request().method() === 'POST';
  });

  await page.getByRole('button', { name: '応募を送信' }).click();
  const response = await responsePromise;

  expect(response.ok()).toBeTruthy();

  const resultText = (await page.locator('#apply-result').textContent()) ?? '{}';
  const result = JSON.parse(resultText) as {
    ok?: boolean;
    applicationId?: string;
    status?: string;
  };

  expect(result.ok).toBe(true);
  expect(result.applicationId).toMatch(/^apply_/);
  expect(result.status).toBe('received');

  const applyRequest = state.requests.find((request) => request.path === '/api/apply');
  expect(applyRequest).toBeDefined();
  expect(applyRequest?.body).toMatchObject({
    name: 'E2E Applicant',
    email: 'applicant@example.com',
    message: 'Frontend engineer に応募します。',
  });
});
