import { BaseRepository } from './base.repository';
import type { Customer } from '../../shared/ipc-api';
import * as crypto from 'crypto';

export class CustomerRepository extends BaseRepository {
  public getCustomers(companyId: string): Customer[] {
    const rows = this.db.prepare('SELECT * FROM customers WHERE company_id = ? ORDER BY name ASC').all(companyId) as Customer[];
    return rows;
  }

  public createCustomer(customer: Omit<Customer, 'id'>): Customer {
    const id = crypto.randomUUID();
    const insert = this.db.prepare(`
      INSERT INTO customers (
        id, company_id, name, mobile, address, pan, gstin, email, loyalty_points
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const createTx = this.db.transaction(() => {
      insert.run(
        id,
        customer.company_id,
        customer.name,
        customer.mobile,
        customer.address || null,
        customer.pan || null,
        customer.gstin || null,
        customer.email || null,
        customer.loyalty_points || 0
      );

      // Create a customer general ledger account automatically
      const insertAccount = this.db.prepare(`
        INSERT INTO accounts (id, company_id, name, code, parent_group, opening_balance, current_balance)
        VALUES (?, ?, ?, ?, 'Customer Ledger', 0.0, 0.0)
      `);
      // Code format: CUST_MOBILE_SUBSTR
      const cleanMobile = customer.mobile.replace(/\s+/g, '');
      const code = `CUST_${cleanMobile}_${id.substring(0, 4)}`;
      insertAccount.run(crypto.randomUUID(), customer.company_id, `${customer.name} Ledger`, code);
    });

    createTx();

    const created = this.db.prepare('SELECT * FROM customers WHERE id = ?').get(id) as Customer;
    return created;
  }

  public updateCustomer(customer: Customer): void {
    const update = this.db.prepare(`
      UPDATE customers SET
        name = ?,
        mobile = ?,
        address = ?,
        pan = ?,
        gstin = ?,
        email = ?,
        loyalty_points = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);

    update.run(
      customer.name,
      customer.mobile,
      customer.address || null,
      customer.pan || null,
      customer.gstin || null,
      customer.email || null,
      customer.loyalty_points,
      customer.id
    );
  }
}
