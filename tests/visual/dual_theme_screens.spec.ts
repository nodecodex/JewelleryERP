import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

test.describe('Desktop Dual-Theme (Dark & Light) Visual Verification', () => {
  const screenshotsDir = path.resolve('tests/screenshots/dual_theme');

  test.beforeAll(() => {
    if (!fs.existsSync(screenshotsDir)) {
      fs.mkdirSync(screenshotsDir, { recursive: true });
    }
  });

  const themes: Array<'dark' | 'light'> = ['dark', 'light'];

  for (const themeMode of themes) {
    test(`Capture all screens in ${themeMode.toUpperCase()} mode (1920x1080)`, async ({ page }) => {
      await page.setViewportSize({ width: 1920, height: 1080 });

      // Navigate to app and set theme in localStorage before reloading
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

      // Wait for app header
      await page.waitForSelector('header', { timeout: 15000 });
      await page.waitForTimeout(600);

      const openScreen = async (label: string) => {
        const btn = page.locator('aside button').filter({ hasText: label }).first();
        if (await btn.isVisible()) {
          await btn.click();
          await page.waitForTimeout(500);
        }
      };

      // 1. Dashboard
      await page.screenshot({ path: path.join(screenshotsDir, `01_dashboard_${themeMode}.png`) });

      // 2. Sales Billing Desk
      await openScreen('Sales Billing Desk');
      await page.screenshot({ path: path.join(screenshotsDir, `02_billing_${themeMode}.png`) });

      // 3. Sales Tax Invoice (Full JewelACC Voucher)
      await openScreen('Sales (Tax Invoice)');
      await page.screenshot({ path: path.join(screenshotsDir, `03_sales_invoice_${themeMode}.png`) });

      // 4. Purchase Invoicing
      await openScreen('Purchase Invoicing');
      await page.screenshot({ path: path.join(screenshotsDir, `04_purchase_${themeMode}.png`) });

      // 5. Inventory Catalog
      await openScreen('Inventory Catalog');
      await page.screenshot({ path: path.join(screenshotsDir, `05_inventory_${themeMode}.png`) });

      // 6. Ledger Vouchers (Accounting)
      await openScreen('Ledger Vouchers');
      await page.screenshot({ path: path.join(screenshotsDir, `06_accounting_${themeMode}.png`) });

      // 7. Ledr Report (Tag Stock)
      await openScreen('Ledr Report (Tag Stock)');
      await page.screenshot({ path: path.join(screenshotsDir, `07_tag_stock_ledr_${themeMode}.png`) });

      // 8. Stock Report
      await openScreen('Stock Report');
      await page.screenshot({ path: path.join(screenshotsDir, `08_stock_report_${themeMode}.png`) });

      // 9. Daily Rate
      await openScreen('Daily Rate');
      await page.screenshot({ path: path.join(screenshotsDir, `09_daily_rate_${themeMode}.png`) });

      // 10. Company Master
      await openScreen('Company Master');
      await page.screenshot({ path: path.join(screenshotsDir, `10_company_master_${themeMode}.png`) });

      // 11. Party Master
      await openScreen('Party Master');
      await page.screenshot({ path: path.join(screenshotsDir, `11_party_master_${themeMode}.png`) });

      // 12. Tax Master
      await openScreen('Tax Master');
      await page.screenshot({ path: path.join(screenshotsDir, `12_tax_master_${themeMode}.png`) });

      // 13. Financial Reports
      await openScreen('Financial Reports');
      await page.screenshot({ path: path.join(screenshotsDir, `13_financial_reports_${themeMode}.png`) });
    });
  }
});
