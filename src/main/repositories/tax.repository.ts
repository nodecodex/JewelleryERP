import { BaseRepository } from './base.repository';
import type { Tax } from '../../shared/ipc-api';
import * as crypto from 'crypto';

export class TaxRepository extends BaseRepository {
  public getTaxes(companyId: string): Tax[] {
    // Check if taxes are empty for this company; if so, trigger a query-time seed
    const count = this.db.prepare('SELECT count(*) as cnt FROM taxes WHERE company_id = ?').get(companyId) as { cnt: number };
    if (count && count.cnt === 0) {
      this.seedDefaultTaxesForCompany(companyId);
    }

    return this.db.prepare(`
      SELECT * FROM taxes WHERE company_id = ? ORDER BY code ASC, name ASC
    `).all(companyId) as Tax[];
  }

  public createTax(tax: Omit<Tax, 'id'>): Tax {
    const id = crypto.randomUUID();
    const insert = this.db.prepare(`
      INSERT INTO taxes (
        id, company_id, code, name, tax_type, tax_desc, tax_percent, add_tax_percent, ac_code, ac_name, components_json
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
      )
    `);

    insert.run(
      id,
      tax.company_id,
      tax.code,
      tax.name,
      tax.tax_type || null,
      tax.tax_desc || null,
      tax.tax_percent || 0.0,
      tax.add_tax_percent || 0.0,
      tax.ac_code || null,
      tax.ac_name || null,
      tax.components_json || '[]'
    );

    return this.db.prepare('SELECT * FROM taxes WHERE id = ?').get(id) as Tax;
  }

  public updateTax(tax: Tax): void {
    const update = this.db.prepare(`
      UPDATE taxes SET
        code = ?,
        name = ?,
        tax_type = ?,
        tax_desc = ?,
        tax_percent = ?,
        add_tax_percent = ?,
        ac_code = ?,
        ac_name = ?,
        components_json = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);

    update.run(
      tax.code,
      tax.name,
      tax.tax_type || null,
      tax.tax_desc || null,
      tax.tax_percent || 0.0,
      tax.add_tax_percent || 0.0,
      tax.ac_code || null,
      tax.ac_name || null,
      tax.components_json || '[]',
      tax.id
    );
  }

  public deleteTax(id: string): void {
    this.db.prepare('DELETE FROM taxes WHERE id = ?').run(id);
  }

  private seedDefaultTaxesForCompany(companyId: string): void {
    console.log(`Seeding default taxes for company: ${companyId}...`);
    const defaultTaxes = [
      { code: '00', name: 'TAX FREE', tax_percent: 0.0, add_tax_percent: 0.0, ac_code: '', ac_name: '' },
      { code: '01', name: 'VAT 1 %', tax_percent: 1.0, add_tax_percent: 0.0, ac_code: '', ac_name: '' },
      { code: '02', name: 'CST 1 %', tax_percent: 1.0, add_tax_percent: 0.0, ac_code: '', ac_name: '' },
      { code: '10', name: 'GST 3%', tax_percent: 3.0, add_tax_percent: 0.0, ac_code: '00085', ac_name: 'GST TAX' },
      { code: '11', name: 'GST 5%', tax_percent: 5.0, add_tax_percent: 0.0, ac_code: '00085', ac_name: 'GST TAX' },
      { code: '12', name: 'GST 12%', tax_percent: 12.0, add_tax_percent: 0.0, ac_code: '00085', ac_name: 'GST TAX' },
      { code: '13', name: 'GST 18%', tax_percent: 18.0, add_tax_percent: 0.0, ac_code: '00085', ac_name: 'GST TAX' },
      { code: '14', name: 'GST 28%', tax_percent: 28.0, add_tax_percent: 0.0, ac_code: '00085', ac_name: 'GST TAX' },
      { code: '20', name: 'TCS 0.075%', tax_percent: 0.075, add_tax_percent: 0.0, ac_code: '', ac_name: '' },
      { code: '25', name: 'TDS 0.1%', tax_percent: 0.1, add_tax_percent: 0.0, ac_code: '', ac_name: '' }
    ];

    const insert = this.db.prepare(`
      INSERT INTO taxes (id, company_id, code, name, tax_type, tax_desc, tax_percent, add_tax_percent, ac_code, ac_name, components_json)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const t of defaultTaxes) {
      const id = crypto.randomUUID();
      let components: any[] = [];
      if (t.name.startsWith('GST')) {
        const halfRate = t.tax_percent / 2;
        components = [
          { sr: 1, tax_type: 'SGST', tax_name: `SGST ${halfRate}%`, ac_code: '00085', tax_percent: halfRate },
          { sr: 2, tax_type: 'CGST', tax_name: `CGST ${halfRate}%`, ac_code: '00086', tax_percent: halfRate },
          { sr: 3, tax_type: 'IGST', tax_name: `IGST ${t.tax_percent}%`, ac_code: '00087', tax_percent: t.tax_percent }
        ];
      } else {
        components = [
          { sr: 1, tax_type: t.name, tax_name: t.name, ac_code: t.ac_code, tax_percent: t.tax_percent }
        ];
      }

      insert.run(
        id,
        companyId,
        t.code,
        t.name,
        t.code,
        t.name,
        t.tax_percent,
        t.add_tax_percent,
        t.ac_code,
        t.ac_name,
        JSON.stringify(components)
      );
    }
  }
}
