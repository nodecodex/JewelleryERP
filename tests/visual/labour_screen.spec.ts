import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

test.describe('Labour Rate Screen Visual Test', () => {
  const screenshotsDir = path.resolve('tests/screenshots/dual_theme');

  for (const themeMode of ['dark', 'light'] as const) {
    test(`Clicking Labour Rates opens properly in ${themeMode.toUpperCase()} mode`, async ({ page }) => {
      await page.setViewportSize({ width: 1920, height: 1080 });
      await page.goto('/');

      await page.evaluate((t) => {
        localStorage.setItem('theme', t);
        if (t === 'dark') {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      }, themeMode);
      await page.reload();

      await page.waitForSelector('header', { timeout: 15000 });
      await page.waitForTimeout(600);

      // Click on Labour Rates in the sidebar
      const labourBtn = page.locator('aside button').filter({ hasText: 'Labour Rates' }).first();
      await expect(labourBtn).toBeVisible();
      await labourBtn.click();
      await page.waitForTimeout(800);

      // Verify that header text "Party Wise Labour Settings" is visible and not blank
      const title = page.locator('text=Party Wise Labour Settings');
      await expect(title).toBeVisible();

      // Capture screenshot
      await page.screenshot({ path: path.join(screenshotsDir, `14_labour_rates_${themeMode}.png`) });
    });
  }
});
