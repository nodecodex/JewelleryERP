import { BaseRepository } from './base.repository';
import * as crypto from 'crypto';

export interface DeviceConfig {
  id?: string;
  company_id: string;
  device_type: 'Barcode_Scanner' | 'QR_Scanner';
  connection_mode: 'HID_Keyboard' | 'Virtual_COM' | 'Webcam';
  port_settings_json?: string;
  prefix?: string;
  suffix?: string;
  is_enabled: number;
}

export interface PrinterConfig {
  id?: string;
  company_id: string;
  printer_name: string;
  printer_type: 'Thermal' | 'Laser_Inkjet' | 'Label_Printer';
  label_size: 'Tag_Label' | 'Sticker_Label' | 'A4_Sheet';
  template_json?: string;
  is_default: number;
}

export interface ScanLog {
  id?: string;
  company_id: string;
  user_id?: string | null;
  device_name?: string;
  screen_name?: string;
  scanned_value: string;
  scan_type: 'Barcode' | 'QR';
  result_status: 'Success' | 'Not_Found' | 'Error';
}

export interface ScanSearchResult {
  type: 'Product' | 'Tag' | 'PurchaseVoucher' | 'SalesVoucher' | 'Customer' | 'Supplier';
  id: string;
  code: string;
  name: string;
  details: any;
}

export class ScannerRepository extends BaseRepository {
  
  // ─── DEVICE CONFIGURATION ──────────────────────────────────────────────────
  
  public getDeviceConfigurations(companyId: string): DeviceConfig[] {
    const rows = this.db.prepare('SELECT * FROM device_configuration WHERE company_id = ?').all(companyId) as DeviceConfig[];
    return rows;
  }

  public saveDeviceConfiguration(config: Omit<DeviceConfig, 'id'> & { id?: string }): DeviceConfig {
    const id = config.id || crypto.randomUUID();
    const insert = this.db.prepare(`
      INSERT INTO device_configuration (
        id, company_id, device_type, connection_mode, port_settings_json, prefix, suffix, is_enabled, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(company_id, device_type) DO UPDATE SET
        connection_mode = excluded.connection_mode,
        port_settings_json = excluded.port_settings_json,
        prefix = excluded.prefix,
        suffix = excluded.suffix,
        is_enabled = excluded.is_enabled,
        updated_at = CURRENT_TIMESTAMP
    `);
    
    insert.run(
      id,
      config.company_id,
      config.device_type,
      config.connection_mode,
      config.port_settings_json || '{}',
      config.prefix || null,
      config.suffix || 'Enter',
      config.is_enabled
    );

    const saved = this.db.prepare('SELECT * FROM device_configuration WHERE company_id = ? AND device_type = ?').get(config.company_id, config.device_type) as DeviceConfig;
    return saved;
  }

  // ─── PRINTER CONFIGURATION ──────────────────────────────────────────────────

  public getPrinterConfigurations(companyId: string): PrinterConfig[] {
    return this.db.prepare('SELECT * FROM printer_configuration WHERE company_id = ?').all(companyId) as PrinterConfig[];
  }

  public savePrinterConfiguration(config: Omit<PrinterConfig, 'id'> & { id?: string }): PrinterConfig {
    const id = config.id || crypto.randomUUID();
    
    // If setting as default, clear any other default printer of the same label size
    if (config.is_default === 1) {
      this.db.prepare('UPDATE printer_configuration SET is_default = 0 WHERE company_id = ? AND label_size = ?')
        .run(config.company_id, config.label_size);
    }

    const insert = this.db.prepare(`
      INSERT INTO printer_configuration (
        id, company_id, printer_name, printer_type, label_size, template_json, is_default, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(company_id, printer_name) DO UPDATE SET
        printer_type = excluded.printer_type,
        label_size = excluded.label_size,
        template_json = excluded.template_json,
        is_default = excluded.is_default,
        updated_at = CURRENT_TIMESTAMP
    `);

    insert.run(
      id,
      config.company_id,
      config.printer_name,
      config.printer_type,
      config.label_size,
      config.template_json || '{}',
      config.is_default
    );

    return this.db.prepare('SELECT * FROM printer_configuration WHERE id = ?').get(id) as PrinterConfig;
  }

  // ─── SCAN LOGGING & HISTORY ──────────────────────────────────────────────────

  public logScan(log: Omit<ScanLog, 'id'>): ScanLog {
    const id = crypto.randomUUID();
    const insert = this.db.prepare(`
      INSERT INTO scan_history (
        id, company_id, user_id, device_name, screen_name, scanned_value, scan_type, result_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insert.run(
      id,
      log.company_id,
      log.user_id || null,
      log.device_name || 'Generic Scanner',
      log.screen_name || 'Any',
      log.scanned_value,
      log.scan_type,
      log.result_status
    );

    return this.db.prepare('SELECT * FROM scan_history WHERE id = ?').get(id) as ScanLog;
  }

  public getScanHistory(companyId: string, limit = 50): ScanLog[] {
    return this.db.prepare('SELECT * FROM scan_history WHERE company_id = ? ORDER BY scan_time DESC LIMIT ?')
      .all(companyId, limit) as ScanLog[];
  }

  // ─── UNIQUENESS VALIDATION ──────────────────────────────────────────────────

  public isBarcodeUnique(companyId: string, barcode: string): boolean {
    // Check barcode_master
    const masterCheck = this.db.prepare('SELECT count(*) as cnt FROM barcode_master WHERE company_id = ? AND barcode_value = ?').get(companyId, barcode) as { cnt: number };
    if (masterCheck.cnt > 0) return false;

    // Check products
    const prodCheck = this.db.prepare('SELECT count(*) as cnt FROM products WHERE company_id = ? AND barcode = ?').get(companyId, barcode) as { cnt: number };
    if (prodCheck.cnt > 0) return false;

    // Check tag opening items
    const tagOpenCheck = this.db.prepare(`
      SELECT count(*) as cnt FROM tag_opening_items toi 
      JOIN tag_opening_vouchers tov ON toi.voucher_id = tov.id 
      WHERE tov.company_id = ? AND toi.tag_no = ?
    `).get(companyId, barcode) as { cnt: number };
    if (tagOpenCheck.cnt > 0) return false;

    // Check purchase tags
    const purchTagCheck = this.db.prepare(`
      SELECT count(*) as cnt FROM purchase_tags pt 
      JOIN purchase_vouchers pv ON pt.voucher_id = pv.id 
      WHERE pv.company_id = ? AND pt.tag_no = ?
    `).get(companyId, barcode) as { cnt: number };
    if (purchTagCheck.cnt > 0) return false;

    return true;
  }

  public isQRUnique(companyId: string, qrCode: string): boolean {
    // Check qr_master
    const masterCheck = this.db.prepare('SELECT count(*) as cnt FROM qr_master WHERE company_id = ? AND qr_value = ?').get(companyId, qrCode) as { cnt: number };
    if (masterCheck.cnt > 0) return false;

    // Check products
    const prodCheck = this.db.prepare('SELECT count(*) as cnt FROM products WHERE company_id = ? AND qr_code = ?').get(companyId, qrCode) as { cnt: number };
    if (prodCheck.cnt > 0) return false;

    return true;
  }

  // ─── BARCODE & QR SEARCH WORKFLOW ───────────────────────────────────────────

  public searchScannedValue(companyId: string, value: string): ScanSearchResult | null {
    const trimmed = value.trim();
    if (!trimmed) return null;

    // 1. Search Inventory Products
    const product = this.db.prepare('SELECT * FROM products WHERE company_id = ? AND (barcode = ? OR qr_code = ? OR sku = ?)').get(companyId, trimmed, trimmed, trimmed) as any;
    if (product) {
      return {
        type: 'Product',
        id: product.id,
        code: product.barcode || product.sku,
        name: product.name,
        details: product
      };
    }

    // 2. Search Tag Opening Items (Inventory Tags)
    const tagOpening = this.db.prepare(`
      SELECT toi.*, tov.vch_no, tov.vch_date 
      FROM tag_opening_items toi
      JOIN tag_opening_vouchers tov ON toi.voucher_id = tov.id
      WHERE tov.company_id = ? AND (toi.tag_no = ? OR toi.it_code = ?)
    `).get(companyId, trimmed, trimmed) as any;
    if (tagOpening) {
      return {
        type: 'Tag',
        id: tagOpening.id,
        code: tagOpening.tag_no,
        name: tagOpening.design || tagOpening.it_code,
        details: { ...tagOpening, source: 'TagOpening' }
      };
    }

    // 3. Search Purchase Tags
    const purchaseTag = this.db.prepare(`
      SELECT pt.*, pv.vch_no as voucher_no, pv.vch_date as voucher_date 
      FROM purchase_tags pt
      JOIN purchase_vouchers pv ON pt.voucher_id = pv.id
      WHERE pv.company_id = ? AND (pt.tag_no = ? OR pt.it_code = ?)
    `).get(companyId, trimmed, trimmed) as any;
    if (purchaseTag) {
      return {
        type: 'Tag',
        id: purchaseTag.id,
        code: purchaseTag.tag_no,
        name: purchaseTag.design || purchaseTag.it_code,
        details: { ...purchaseTag, source: 'Purchase' }
      };
    }

    // 4. Search Purchase Vouchers (Voucher Code)
    const purchaseVoucher = this.db.prepare('SELECT * FROM purchase_vouchers WHERE company_id = ? AND (vch_no = ? OR ref_no = ?)').get(companyId, trimmed, trimmed) as any;
    if (purchaseVoucher) {
      return {
        type: 'PurchaseVoucher',
        id: purchaseVoucher.id,
        code: purchaseVoucher.vch_no,
        name: `Purchase Voucher #${purchaseVoucher.vch_no}`,
        details: purchaseVoucher
      };
    }

    // 5. Search Sales Invoices (Invoice Number)
    const salesInvoice = this.db.prepare('SELECT * FROM sales_invoices WHERE company_id = ? AND invoice_number = ?').get(companyId, trimmed) as any;
    if (salesInvoice) {
      return {
        type: 'SalesVoucher',
        id: salesInvoice.id,
        code: salesInvoice.invoice_number,
        name: `Sales Invoice #${salesInvoice.invoice_number}`,
        details: salesInvoice
      };
    }

    // 6. Search Parties (Customers & Suppliers)
    const party = this.db.prepare('SELECT * FROM parties WHERE company_id = ? AND (code = ? OR mobile = ? OR name LIKE ?)').get(companyId, trimmed, trimmed, `%${trimmed}%`) as any;
    if (party) {
      const isSupplier = party.group_name?.toLowerCase().includes('supplier') || party.parent_group?.toLowerCase().includes('supplier');
      return {
        type: isSupplier ? 'Supplier' : 'Customer',
        id: party.id,
        code: party.code,
        name: party.name,
        details: party
      };
    }

    return null;
  }
}
