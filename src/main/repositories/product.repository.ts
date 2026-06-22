import { BaseRepository } from './base.repository';
import type { Product } from '../../shared/ipc-api';
import * as crypto from 'crypto';

export class ProductRepository extends BaseRepository {
  public getProducts(companyId: string): Product[] {
    const rows = this.db.prepare('SELECT * FROM products WHERE company_id = ? ORDER BY name ASC').all(companyId) as Product[];
    return rows;
  }

  public getProductByBarcode(companyId: string, barcode: string): Product | null {
    const row = this.db.prepare('SELECT * FROM products WHERE company_id = ? AND (barcode = ? OR qr_code = ?)').get(companyId, barcode, barcode) as Product | undefined;
    return row || null;
  }

  public createProduct(product: Omit<Product, 'id'>): Product {
    const id = crypto.randomUUID();
    const barcode = product.barcode || `BAR-${Date.now()}`;
    const qrCode = product.qr_code || `QR-${Date.now()}`;

    const insert = this.db.prepare(`
      INSERT INTO products (
        id, company_id, name, sku, barcode, qr_code, category,
        weight, net_weight, gross_weight, purity, stone_weight,
        making_charges, making_charges_type, hsn_code, gst_rate,
        purchase_price, selling_price, current_stock
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insert.run(
      id,
      product.company_id,
      product.name,
      product.sku,
      barcode,
      qrCode,
      product.category,
      product.weight,
      product.net_weight,
      product.gross_weight,
      product.purity || null,
      product.stone_weight,
      product.making_charges,
      product.making_charges_type,
      product.hsn_code || null,
      product.gst_rate,
      product.purchase_price,
      product.selling_price,
      product.current_stock
    );

    const created = this.db.prepare('SELECT * FROM products WHERE id = ?').get(id) as Product;
    return created;
  }

  public updateProduct(product: Product): void {
    const update = this.db.prepare(`
      UPDATE products SET
        name = ?,
        sku = ?,
        barcode = ?,
        qr_code = ?,
        category = ?,
        weight = ?,
        net_weight = ?,
        gross_weight = ?,
        purity = ?,
        stone_weight = ?,
        making_charges = ?,
        making_charges_type = ?,
        hsn_code = ?,
        gst_rate = ?,
        purchase_price = ?,
        selling_price = ?,
        current_stock = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);

    update.run(
      product.name,
      product.sku,
      product.barcode || null,
      product.qr_code || null,
      product.category,
      product.weight,
      product.net_weight,
      product.gross_weight,
      product.purity || null,
      product.stone_weight,
      product.making_charges,
      product.making_charges_type,
      product.hsn_code || null,
      product.gst_rate,
      product.purchase_price,
      product.selling_price,
      product.current_stock,
      product.id
    );
  }

  public deleteProduct(id: string): void {
    this.db.prepare('DELETE FROM products WHERE id = ?').run(id);
  }
}
