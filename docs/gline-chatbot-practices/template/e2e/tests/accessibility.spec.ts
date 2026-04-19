import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

import { installApiMocks } from '../fixtures/mock-api';

test('widget と fixture page に WCAG 2.1 AA 違反がない', async ({ page }) => {
  await installApiMocks(page);

  await page.goto('/fixtures/test-page.html');
  await expect(page.locator('.gline-fab')).toBeVisible();

  await page.locator('.gline-fab').click();
  await expect(page.locator('.gline-input')).toBeVisible();

  // axe injection handled by AxeBuilder

  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  expect(results.violations).toEqual([]);
});
