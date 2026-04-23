import { expect, test, type Page } from '@playwright/test';

import { installApiMocks } from '../fixtures/mock-api';

async function openWidget(page: Page): Promise<void> {
  await page.goto('/fixtures/test-page.html');
  await expect(page.locator('.gline-fab')).toBeVisible();
  await page.locator('.gline-fab').click();
  await expect(page.locator('.gline-input')).toBeVisible();
}

async function sendMessage(page: Page, text: string): Promise<void> {
  const assistantMessages = page.locator('.gline-msg-assistant');
  const beforeCount = await assistantMessages.count();

  await page.locator('.gline-input').fill(text);

  const responsePromise = page.waitForResponse((response) => {
    return response.url().includes('/api/chat') && response.request().method() === 'POST';
  });

  await page.locator('.gline-send').click();
  await responsePromise;

  await expect(assistantMessages).toHaveCount(beforeCount + 1);
}

test('FABクリックから3ターン会話後に応募CTAが表示される', async ({ page }) => {
  await installApiMocks(page);
  await openWidget(page);

  await sendMessage(page, '募集職種を教えてください。');
  await expect(page.locator('.gline-msg-assistant').last()).toContainText('募集職種');

  await sendMessage(page, '面接フローを教えてください。');
  await expect(page.locator('.gline-msg-assistant').last()).toContainText('面接');

  await sendMessage(page, '応募したいです。エントリー方法を教えてください。');
  await expect(page.locator('.gline-msg-assistant').last()).toContainText('応募');

  await expect(page.locator('.gline-apply-btn')).toBeVisible();
});
