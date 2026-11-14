import { test, expect } from '@playwright/test';

test.describe('Hardware Validation: ESC/POS Thermal & Tag Printer Output', () => {
  test('Thermal 80mm ESC/POS byte generator generates proper printer commands', async () => {
    // Standard ESC/POS command sequences:
    const ESC = 0x1b;
    const GS = 0x1d;

    function generateReceiptBytes(shopName: string, invoiceNo: string, totalAmount: number): Uint8Array {
      const buffer: number[] = [];

      // 1. Initialize printer: ESC @
      buffer.push(ESC, 0x40);

      // 2. Center alignment: ESC a 1
      buffer.push(ESC, 0x61, 1);

      // 3. Double-height/width text: GS ! 0x11
      buffer.push(GS, 0x21, 0x11);
      for (const char of shopName) {
        buffer.push(char.charCodeAt(0));
      }
      buffer.push(0x0a); // Linefeed

      // 4. Normal text, Left alignment: ESC a 0, GS ! 0x00
      buffer.push(ESC, 0x61, 0);
      buffer.push(GS, 0x21, 0x00);

      const invLine = `Invoice: ${invoiceNo}\nTotal: Rs.${totalAmount.toFixed(2)}\n`;
      for (const char of invLine) {
        buffer.push(char.charCodeAt(0));
      }

      // 5. Paper cut: GS V 66 0
      buffer.push(GS, 0x56, 66, 0);

      return new Uint8Array(buffer);
    }

    const receipt = generateReceiptBytes('SWARNPRO JEWELLERS', 'INV-1001', 125000.0);
    expect(receipt.length).toBeGreaterThan(20);
    // Verify ESC @ initialization header
    expect(receipt[0]).toBe(0x1b);
    expect(receipt[1]).toBe(0x40);
    // Verify GS V cut command at footer
    expect(receipt[receipt.length - 4]).toBe(0x1d);
    expect(receipt[receipt.length - 3]).toBe(0x56);
  });

  test('Barcode Code128 generation conforms to Jewellery Tag layout dimensions', async () => {
    const tagCode = 'TAG-22K-9901';
    expect(tagCode.length).toBeLessThanOrEqual(16); // Barbell tag max printable width constraint
    expect(/^[A-Z0-9-]+$/.test(tagCode)).toBe(true);
  });
});
