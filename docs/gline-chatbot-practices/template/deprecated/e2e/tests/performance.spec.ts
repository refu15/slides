import { expect, test } from '@playwright/test';

import { installApiMocks } from '../fixtures/mock-api';

test('widget の初期FAB表示が 500ms 以内', async ({ page, browserName }) => {
  test.skip(
    browserName !== 'chromium',
    'Performance budget は Chromium の安定した PerformanceEntry 計測で評価する。',
  );

  await installApiMocks(page);
  await page.goto('/fixtures/test-page.html');

  await page.waitForFunction(() => {
    return window.performance.getEntriesByName('gline:fab-visible').length > 0;
  });

  const visibleAt = await page.evaluate(() => {
    const entry = window.performance.getEntriesByName('gline:fab-visible')[0];
    return entry?.startTime ?? Number.POSITIVE_INFINITY;
  });

  expect(visibleAt).toBeLessThanOrEqual(500);
});
