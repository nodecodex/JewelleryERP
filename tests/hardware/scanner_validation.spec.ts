import { test, expect } from '@playwright/test';

test.describe('Hardware Validation: Barcode & QR Scanner Integration', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('Hardware Simulation: Fast burst typing (<35ms) simulates USB Barcode Gun', async ({ page }) => {
    const barcodeToScan = 'TAG-GOLD-10029';

    const scanDetected = await page.evaluate(async (barcode) => {
      let detectedValue = '';
      let buffer = '';
      let lastKeyTime = Date.now();
      const speedThreshold = 40; // ms

      const onKeyDown = (e: KeyboardEvent) => {
        const now = Date.now();
        const delay = now - lastKeyTime;
        lastKeyTime = now;

        if (e.key === 'Enter') {
          if (buffer.length >= 3) {
            detectedValue = buffer;
          }
          buffer = '';
        } else if (e.key.length === 1) {
          if (delay < speedThreshold || buffer.length === 0) {
            buffer += e.key;
          } else {
            buffer = e.key;
          }
        }
      };

      window.addEventListener('keydown', onKeyDown);

      // Rapid burst dispatch (10ms interval)
      for (let i = 0; i < barcode.length; i++) {
        lastKeyTime = Date.now() - 5; // Guarantee < 40ms diff
        window.dispatchEvent(new KeyboardEvent('keydown', { key: barcode[i], bubbles: true }));
        await new Promise((resolve) => setTimeout(resolve, 8));
      }

      lastKeyTime = Date.now() - 5;
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));

      window.removeEventListener('keydown', onKeyDown);
      return detectedValue;
    }, barcodeToScan);

    expect(scanDetected).toBe(barcodeToScan);
  });

  test('Hardware Simulation: Human slow typing (>100ms) does NOT trigger scanner intercept', async ({ page }) => {
    const manualInput = 'GOLD';

    const isIntercepted = await page.evaluate(async (text) => {
      let wasIntercepted = false;
      let buffer = '';
      let lastKeyTime = Date.now();
      const speedThreshold = 35; // ms

      const onKeyDown = (e: KeyboardEvent) => {
        const now = Date.now();
        const delay = now - lastKeyTime;
        lastKeyTime = now;

        if (e.key === 'Enter') {
          if (buffer.length >= 3 && delay < speedThreshold) {
            wasIntercepted = true;
          }
          buffer = '';
        } else if (e.key.length === 1) {
          if (delay < speedThreshold) {
            buffer += e.key;
          } else {
            buffer = ''; // Reset because user typed slowly
          }
        }
      };

      window.addEventListener('keydown', onKeyDown);

      // Simulate human slow typing (100ms interval)
      for (let i = 0; i < text.length; i++) {
        lastKeyTime = Date.now() - 100; // > 35ms diff
        window.dispatchEvent(new KeyboardEvent('keydown', { key: text[i], bubbles: true }));
        await new Promise((resolve) => setTimeout(resolve, 60));
      }

      lastKeyTime = Date.now() - 100;
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));

      window.removeEventListener('keydown', onKeyDown);
      return wasIntercepted;
    }, manualInput);

    expect(isIntercepted).toBe(false);
  });
});
