import { BaseRepository } from './base.repository';
import type { Supplier } from '../../shared/ipc-api';
import * as crypto from 'crypto';

export class SupplierRepository extends BaseRepository {
  public getSuppliers(companyId: string): Supplier[] {
    const rows = this.db.prepare('SELECT * FROM suppliers WHERE company_id = ? ORDER BY name ASC').all(companyId) as Supplier[];
    return rows;
  }

  public createSupplier(supplier: Omit<Supplier, 'id'>): Supplier {
    const id = crypto.randomUUID();
    const insert = this.db.prepare(`
      INSERT INTO suppliers (
        id, company_id, name, mobile, address, pan, gstin, email
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const createTx = this.db.transaction(() => {
      insert.run(
        id,
        supplier.company_id,
        supplier.name,
        supplier.mobile,
        supplier.address || null,
        supplier.pan || null,
        supplier.gstin || null,
        supplier.email || null
      );

      // Create a supplier general ledger account automatically
      const insertAccount = this.db.prepare(`
        INSERT INTO accounts (id, company_id, name, code, parent_group, opening_balance, current_balance)
        VALUES (?, ?, ?, ?, 'Supplier Ledger', 0.0, 0.0)
      `);
      const cleanMobile = supplier.mobile.replace(/\s+/g, '');
      const code = `SUPP_${cleanMobile}_${id.substring(0, 4)}`;
      insertAccount.run(crypto.randomUUID(), supplier.company_id, `${supplier.name} Ledger`, code);
    });

    createTx();

    const created = this.db.prepare('SELECT * FROM suppliers WHERE id = ?').get(id) as Supplier;
    return created;
  }

  public updateSupplier(supplier: Supplier): void {
    const update = this.db.prepare(`
      UPDATE suppliers SET
        name = ?,
        mobile = ?,
        address = ?,
        pan = ?,
        gstin = ?,
        email = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);

    update.run(
      supplier.name,
      supplier.mobile,
      supplier.address || null,
      supplier.pan || null,
      supplier.gstin || null,
      supplier.email || null,
      supplier.id
    );
  }
}
