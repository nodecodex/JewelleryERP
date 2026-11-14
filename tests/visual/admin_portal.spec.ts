import { test } from '@playwright/test';
import path from 'path';

test.describe('Admin Portal Visual Capture', () => {
  const screenshotsDir = path.resolve('tests/screenshots');
  const adminHtmlPath = 'file:///' + path.resolve('licensing-server/src/admin-dashboard.html').replace(/\\/g, '/');

  test('Capture Admin Portal Screens', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto(adminHtmlPath);

    // 1. Login Screen
    await page.waitForSelector('#login-screen', { state: 'visible' });
    await page.waitForTimeout(500);
    await page.screenshot({
      path: path.join(screenshotsDir, 'admin_01_login_1920x1080.png'),
    });

    // Mock session and test data to visualize dashboard & tabs
    await page.evaluate(() => {
      // Mock session
      sessionStorage.setItem('SPERP_admin_token', 'mock_admin_token_jwt');
      sessionStorage.setItem('SPERP_admin_user', 'admin');
      
      // Inject mock data into tables
      window.allCustomers = [
        { _id: 'cust1', name: 'Jagjit Singh', mobile: '+918607836607', email: 'jagjit2994@gmail.com', createdAt: '2026-09-20T12:09:00Z' },
        { _id: 'cust2', name: 'Srinivas Jewellers', mobile: '+919876543210', email: 'owner@jewellers.com', createdAt: '2026-10-15T10:00:00Z' }
      ];

      window.allLicenses = [
        { _id: 'lic1', customer_name: 'Jagjit Singh', customer_mobile: '+918607836607', license_key: 'SPERP-357T-MWY8-2PST-1T97K', license_type: 'lifetime', status: 'issued' }
      ];

      window.allTrials = [
        { _id: 'trial1', device_hash: '0C5579BAC3CC963730931776E1A383DC55126128347B51588FCED4C66000BAE56', os_platform: 'win32', installation_date: '2026-09-20T13:00:00Z', expiry_date: '2026-09-23T13:00:00Z', is_expired: true }
      ];

      window.allTransfers = [];
      window.allAudits = [
        { action_type: 'LICENSE_GENERATED', details: 'Generated lifetime license for Jagjit Singh', performed_by: 'admin', createdAt: '2026-09-20T12:15:00Z' }
      ];

      window.stats = {
        totalCommercial: 1,
        activeCommercial: 1,
        trialUsers: 1,
        expiredTrials: 1,
        pendingTransfers: 0
      };

      // Show App
      window.showApp('admin');
      window.renderAll();
    });

    await page.waitForTimeout(500);

    // 2. Dashboard Panel
    await page.screenshot({
      path: path.join(screenshotsDir, 'admin_02_dashboard_1920x1080.png'),
    });

    // 3. Licenses & Generator Panel
    await page.click('button.nav-item:has-text("Licenses & Generator")');
    await page.waitForTimeout(300);
    await page.screenshot({
      path: path.join(screenshotsDir, 'admin_03_licenses_1920x1080.png'),
    });

    // 4. Customer Master Panel
    await page.click('button.nav-item:has-text("Customer Master")');
    await page.waitForTimeout(300);
    await page.screenshot({
      path: path.join(screenshotsDir, 'admin_04_customers_1920x1080.png'),
    });

    // 5. Trial History Panel
    await page.click('button.nav-item:has-text("Trial History")');
    await page.waitForTimeout(300);
    await page.screenshot({
      path: path.join(screenshotsDir, 'admin_05_trials_1920x1080.png'),
    });

    // 6. Delete Confirmation Modal
    await page.evaluate(() => {
      window.openConfirmModal({
        title: 'DELETE CUSTOMER PROFILE',
        message: 'Are you sure you want to permanently delete this customer profile? All associated licenses will also be deleted from the database.',
        targetInfo: 'Customer: Srinivas Jewellers (+91 98765 43210)',
        confirmText: 'Delete Customer',
        isDanger: true,
        onConfirm: () => {}
      });
    });
    await page.waitForSelector('#confirm-modal-overlay.active', { state: 'visible' });
    await page.waitForTimeout(300);
    await page.screenshot({
      path: path.join(screenshotsDir, 'admin_06_delete_modal_1920x1080.png'),
    });
  });
});
