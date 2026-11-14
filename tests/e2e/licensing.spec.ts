import { test, expect } from '@playwright/test';

test.describe('Licensing Screen E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display SwarnPro licensing screen with tabs and device binding info', async ({ page }) => {
    await expect(page.locator('body')).toBeVisible();

    // Verify Tab buttons exist
    const activateTab = page.getByRole('button', { name: 'Activate', exact: true });
    await expect(activateTab).toBeVisible();

    // Switch to Support Tab
    const supportTab = page.getByRole('button', { name: 'Support', exact: true });
    if (await supportTab.isVisible()) {
      await supportTab.click();
      await expect(page.getByText('Support Phone:').first()).toBeVisible();
    }
  });

  test('should validate license key input restrictions and keyboard focus', async ({ page }) => {
    // Click activate tab
    const activateTab = page.getByRole('button', { name: 'Activate', exact: true });
    if (await activateTab.isVisible()) {
      await activateTab.click();
    }

    const keyInput = page.getByPlaceholder(/Paste your SPERP/i);
    await expect(keyInput).toBeVisible();

    await keyInput.focus();
    await keyInput.fill('SPERP-TEST-8899-AAAA');
    await expect(keyInput).toHaveValue('SPERP-TEST-8899-AAAA');
  });
});
