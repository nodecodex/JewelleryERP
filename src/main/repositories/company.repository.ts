import { BaseRepository } from './base.repository';
import type { Company } from '../../shared/ipc-api';
import * as crypto from 'crypto';

export class CompanyRepository extends BaseRepository {
  public getCompanies(): Company[] {
    const rows = this.db.prepare('SELECT * FROM companies ORDER BY name ASC').all() as Company[];
    return rows;
  }

  public createCompany(company: Omit<Company, 'id'>): Company {
    const id = crypto.randomUUID();
    const settings = company.settings_json || '{}';

    const insert = this.db.prepare(`
      INSERT INTO companies (
        id, name, financial_year_start, financial_year_end, gstin, pan,
        bank_name, bank_account_no, bank_ifsc, address, phone, email, settings_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    // Create Company within a transaction and initialize default accounts (Cash, Sales, Purchases, GST, etc.)
    const createTx = this.db.transaction(() => {
      insert.run(
        id,
        company.name,
        company.financial_year_start,
        company.financial_year_end,
        company.gstin || null,
        company.pan || null,
        company.bank_name || null,
        company.bank_account_no || null,
        company.bank_ifsc || null,
        company.address || null,
        company.phone || null,
        company.email || null,
        settings
      );

      // Initialize default general ledger accounts for the company
      const defaultAccounts = [
        { name: 'Cash in Hand', code: 'CASH', parent_group: 'Cash' },
        { name: 'Bank Account', code: 'BANK', parent_group: 'Bank' },
        { name: 'Sales Account', code: 'SALES', parent_group: 'Sales' },
        { name: 'Purchase Account', code: 'PURCHASE', parent_group: 'Purchase' },
        { name: 'CGST Input Account', code: 'CGST_IN', parent_group: 'Direct Expense' },
        { name: 'SGST Input Account', code: 'SGST_IN', parent_group: 'Direct Expense' },
        { name: 'IGST Input Account', code: 'IGST_IN', parent_group: 'Direct Expense' },
        { name: 'CGST Output Account', code: 'CGST_OUT', parent_group: 'Indirect Expense' },
        { name: 'SGST Output Account', code: 'SGST_OUT', parent_group: 'Indirect Expense' },
        { name: 'IGST Output Account', code: 'IGST_OUT', parent_group: 'Indirect Expense' },
        { name: 'Capital Account', code: 'CAPITAL', parent_group: 'Capital' }
      ];

      const insertAccount = this.db.prepare(`
        INSERT INTO accounts (id, company_id, name, code, parent_group, opening_balance, current_balance)
        VALUES (?, ?, ?, ?, ?, 0.0, 0.0)
      `);

      for (const acc of defaultAccounts) {
        insertAccount.run(crypto.randomUUID(), id, acc.name, `${acc.code}_${id.substring(0, 8)}`, acc.parent_group);
      }
    });

    createTx();

    const created = this.db.prepare('SELECT * FROM companies WHERE id = ?').get(id) as Company;
    return created;
  }

  public updateCompany(company: Company): void {
    const update = this.db.prepare(`
      UPDATE companies SET
        name = ?,
        financial_year_start = ?,
        financial_year_end = ?,
        gstin = ?,
        pan = ?,
        bank_name = ?,
        bank_account_no = ?,
        bank_ifsc = ?,
        address = ?,
        phone = ?,
        email = ?,
        settings_json = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);

    update.run(
      company.name,
      company.financial_year_start,
      company.financial_year_end,
      company.gstin || null,
      company.pan || null,
      company.bank_name || null,
      company.bank_account_no || null,
      company.bank_ifsc || null,
      company.address || null,
      company.phone || null,
      company.email || null,
      company.settings_json || '{}',
      company.id
    );
  }

  public deleteCompany(id: string): void {
    this.db.prepare('DELETE FROM companies WHERE id = ?').run(id);
  }
}
