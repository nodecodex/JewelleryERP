import { test } from '@playwright/test';
import fs from 'fs';
import path from 'path';

test.describe('Desktop & Laptop Screens Visual Capture', () => {
  const screenshotsDir = path.resolve('tests/screenshots');

  test.beforeAll(() => {
    if (!fs.existsSync(screenshotsDir)) {
      fs.mkdirSync(screenshotsDir, { recursive: true });
    }
  });

  const viewports = [
    { name: 'laptop_1366x768', width: 1366, height: 768 },
    { name: 'desktop_1920x1080', width: 1920, height: 1080 },
  ];

  for (const vp of viewports) {
    test(`Capture desktop screens on ${vp.name}`, async ({ page }) => {
      // Set viewport for this desktop/laptop test
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto('/');

      // Wait for app header to load
      await page.waitForSelector('header', { timeout: 15000 });
      await page.waitForTimeout(800);

      // Helper function to click sidebar menu item
      const openScreen = async (label: string) => {
        const btn = page.locator('aside button').filter({ hasText: label }).first();
        if (await btn.isVisible()) {
          await btn.click();
          await page.waitForTimeout(600);
        }
      };

      // 1. Dashboard
      await page.screenshot({
        path: path.join(screenshotsDir, `01_dashboard_${vp.name}.png`),
        fullPage: false,
      });

      // 2. Sales Billing Desk
      await openScreen('Sales Billing Desk');
      await page.screenshot({
        path: path.join(screenshotsDir, `02_billing_desk_${vp.name}.png`),
        fullPage: false,
      });

      // 3. Inventory Catalog
      await openScreen('Inventory Catalog');
      await page.screenshot({
        path: path.join(screenshotsDir, `03_inventory_catalog_${vp.name}.png`),
        fullPage: false,
      });

      // 4. Ledger Vouchers (Accounting)
      await openScreen('Ledger Vouchers');
      await page.screenshot({
        path: path.join(screenshotsDir, `04_accounting_vouchers_${vp.name}.png`),
        fullPage: false,
      });

      // 5. Financial Reports (P&L)
      await openScreen('Financial Reports');
      await page.screenshot({
        path: path.join(screenshotsDir, `05_reports_pl_${vp.name}.png`),
        fullPage: false,
      });

      // Balance Sheet Tab
      const bsTab = page.getByRole('button', { name: /Balance Sheet/i });
      if (await bsTab.isVisible()) {
        await bsTab.click();
        await page.waitForTimeout(400);
        await page.screenshot({
          path: path.join(screenshotsDir, `05_reports_balance_sheet_${vp.name}.png`),
          fullPage: false,
        });
      }

      // 6. Sales Tax Invoice (Full JewelACC Voucher)
      await openScreen('Sales (Tax Invoice)');
      await page.screenshot({
        path: path.join(screenshotsDir, `06_sales_tax_invoice_${vp.name}.png`),
        fullPage: false,
      });

      // 7. Company Master
      await openScreen('Company Master');
      await page.screenshot({
        path: path.join(screenshotsDir, `07_company_master_${vp.name}.png`),
        fullPage: false,
      });

      // 8. Party Master
      await openScreen('Party Master');
      await page.screenshot({
        path: path.join(screenshotsDir, `08_party_master_${vp.name}.png`),
        fullPage: false,
      });

      // 9. Daily Rate Master
      await openScreen('Daily Rate');
      await page.screenshot({
        path: path.join(screenshotsDir, `09_daily_rates_${vp.name}.png`),
        fullPage: false,
      });

      // 10. Stock Report
      await openScreen('Stock Report');
      await page.screenshot({
        path: path.join(screenshotsDir, `10_stock_report_${vp.name}.png`),
        fullPage: false,
      });

      // 11. System Secure Lock / Licensing Screen (locked query)
      await page.goto('/?locked=true');
      await page.waitForSelector('text=SYSTEM SECURE LOCK', { timeout: 8000 });
      await page.waitForTimeout(600);
      await page.screenshot({
        path: path.join(screenshotsDir, `11_licensing_locked_${vp.name}.png`),
        fullPage: false,
      });
    });
  }
});
