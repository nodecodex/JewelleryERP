import { BaseRepository } from './base.repository';

export interface TagRecord {
  source: 'Opening' | 'Purchase';
  tag_no: string;
  it_code: string;
  it_name: string;
  size: string;
  pcs: number;
  gr_wt: number;
  ls_wt: number;
  net_wt: number;
  rate: number;
  lbr_prc: number;
  lbr_type: 'G' | 'F' | 'P';
  lbr_rate: number;
  lbr_amt: number;
  oth_amt: number;
  mrp: number;
  current_stock: number;
  entry_date: string;
  company_id: string;
  voucher_id: string;
  tag_id: string;
}

export interface TagAccessory {
  sr: number;
  it_code: string;
  it_name: string;
  pcs: number;
  weight: number;
  con_percent: number;
  pw: 'P' | 'W';
  rate: number;
  it_amt: number;
  lbr_rate: number;
  lbr_amt: number;
  net_amt: number;
}

export class LedrReportRepository extends BaseRepository {
  public getTagStockReport(companyId: string): TagRecord[] {
    const query = `
      SELECT 
        'Opening' AS source,
        t.tag_no,
        t.it_code,
        COALESCE(t.design, t.it_code) AS it_name,
        COALESCE(t.size, '') AS size,
        t.pcs,
        t.gr_wt,
        t.ls_wt,
        t.net_wt,
        t.pr_cost AS rate,
        t.lbr_percent AS lbr_prc,
        t.l_type AS lbr_type,
        COALESCE(t.lbr_rate, 0.0) AS lbr_rate,
        COALESCE(t.lbr_amt, 0.0) AS lbr_amt,
        COALESCE(t.oth_amt, 0.0) AS oth_amt,
        COALESCE(t.mrp, 0.0) AS mrp,
        COALESCE(p.current_stock, 0) AS current_stock,
        v.vch_date AS entry_date,
        v.company_id,
        v.id AS voucher_id,
        t.id AS tag_id
      FROM tag_opening_items t
      LEFT JOIN tag_opening_vouchers v ON t.voucher_id = v.id
      LEFT JOIN products p ON t.tag_no = p.barcode AND v.company_id = p.company_id
      WHERE v.company_id = ?

      UNION ALL

      SELECT 
        'Purchase' AS source,
        t.tag_no,
        t.it_code,
        COALESCE(t.design, t.it_code) AS it_name,
        COALESCE(t.size, '') AS size,
        t.pcs,
        t.gr_wt,
        t.ls_wt,
        t.net_wt,
        t.pr_cost AS rate,
        t.lbr_percent AS lbr_prc,
        t.ltype AS lbr_type,
        COALESCE(t.lbr_rate, 0.0) AS lbr_rate,
        COALESCE(t.lbr_amt, 0.0) AS lbr_amt,
        COALESCE(t.oth_amt, 0.0) AS oth_amt,
        COALESCE(t.mrp, 0.0) AS mrp,
        COALESCE(p.current_stock, 0) AS current_stock,
        v.vch_date AS entry_date,
        v.company_id,
        v.id AS voucher_id,
        t.id AS tag_id
      FROM purchase_tags t
      LEFT JOIN purchase_vouchers v ON t.voucher_id = v.id
      LEFT JOIN products p ON t.tag_no = p.barcode AND v.company_id = p.company_id
      WHERE v.company_id = ?
    `;

    return this.db.prepare(query).all(companyId, companyId) as TagRecord[];
  }

  public getTagAccessories(source: string, voucherId: string, tagId: string): TagAccessory[] {
    if (source === 'Opening') {
      const query = `
        SELECT 
          sr,
          it_code,
          COALESCE(it_name, '') AS it_name,
          COALESCE(pcs, 0) AS pcs,
          COALESCE(weight, 0.0) AS weight,
          COALESCE(con_percent, 0.0) AS con_percent,
          COALESCE(pw, 'W') AS pw,
          COALESCE(rate, 0.0) AS rate,
          COALESCE(it_amt, 0.0) AS it_amt,
          0.0 AS lbr_rate,
          0.0 AS lbr_amt,
          COALESCE(net_amt, 0.0) AS net_amt
        FROM tag_opening_accessories 
        WHERE voucher_id = ?
        ORDER BY sr ASC
      `;
      return this.db.prepare(query).all(voucherId) as TagAccessory[];
    } else {
      const query = `
        SELECT 
          sr,
          it_code,
          COALESCE(it_name, '') AS it_name,
          COALESCE(pcs, 0) AS pcs,
          COALESCE(kr_wt, 0.0) AS weight,
          0.0 AS con_percent,
          'W' AS pw,
          0.0 AS rate,
          0.0 AS it_amt,
          0.0 AS lbr_rate,
          0.0 AS lbr_amt,
          0.0 AS net_amt
        FROM purchase_diamonds 
        WHERE purchase_tag_id = ?
        ORDER BY sr ASC
      `;
      return this.db.prepare(query).all(tagId) as TagAccessory[];
    }
  }

  public getStockReport(companyId: string, dateFrom: string, dateTo: string): any[] {
    const query = `
      SELECT 
        it_name,
        SUM(op_pcs) AS op_pcs,
        SUM(op_wt) AS op_wt,
        SUM(pr_pcs) AS pr_pcs,
        SUM(pr_wt) AS pr_wt,
        SUM(in_pcs) AS in_pcs,
        SUM(in_wt) AS in_wt,
        SUM(ou_pcs) AS ou_pcs,
        SUM(ou_wt) AS ou_wt,
        SUM(si_pcs) AS si_pcs,
        SUM(si_wt) AS si_wt
      FROM (
        -- 1. Opening Stock from Opening Vouchers
        SELECT 
          COALESCE(t.design, t.it_code) AS it_name,
          SUM(t.pcs) AS op_pcs,
          SUM(t.net_wt) AS op_wt,
          0 AS pr_pcs, 0.0 AS pr_wt,
          0 AS in_pcs, 0.0 AS in_wt,
          0 AS ou_pcs, 0.0 AS ou_wt,
          0 AS si_pcs, 0.0 AS si_wt
        FROM tag_opening_items t
        LEFT JOIN tag_opening_vouchers v ON t.voucher_id = v.id
        WHERE v.company_id = ? AND v.vch_date < ?
        GROUP BY it_name

        UNION ALL

        -- 2. Opening Stock from Purchases
        SELECT 
          COALESCE(t.design, t.it_code) AS it_name,
          SUM(t.pcs) AS op_pcs,
          SUM(t.net_wt) AS op_wt,
          0 AS pr_pcs, 0.0 AS pr_wt,
          0 AS in_pcs, 0.0 AS in_wt,
          0 AS ou_pcs, 0.0 AS ou_wt,
          0 AS si_pcs, 0.0 AS si_wt
        FROM purchase_tags t
        LEFT JOIN purchase_vouchers v ON t.voucher_id = v.id
        WHERE v.company_id = ? AND v.vch_date < ?
        GROUP BY it_name

        UNION ALL

        -- 3. Opening Stock from Sales (Subtracted)
        SELECT 
          t.product_name AS it_name,
          SUM(-t.quantity) AS op_pcs,
          SUM(-t.net_weight) AS op_wt,
          0 AS pr_pcs, 0.0 AS pr_wt,
          0 AS in_pcs, 0.0 AS in_wt,
          0 AS ou_pcs, 0.0 AS ou_wt,
          0 AS si_pcs, 0.0 AS si_wt
        FROM sales_items t
        LEFT JOIN sales_invoices v ON t.sales_invoice_id = v.id
        WHERE v.company_id = ? AND v.invoice_date < ?
        GROUP BY it_name

        UNION ALL

        -- 4. Purchases within Date Range
        SELECT 
          COALESCE(t.design, t.it_code) AS it_name,
          0 AS op_pcs, 0.0 AS op_wt,
          SUM(t.pcs) AS pr_pcs,
          SUM(t.net_wt) AS pr_wt,
          0 AS in_pcs, 0.0 AS in_wt,
          0 AS ou_pcs, 0.0 AS ou_wt,
          0 AS si_pcs, 0.0 AS si_wt
        FROM purchase_tags t
        LEFT JOIN purchase_vouchers v ON t.voucher_id = v.id
        WHERE v.company_id = ? AND v.vch_date BETWEEN ? AND ?
        GROUP BY it_name

        UNION ALL

        -- 5. Inward (Opening Items entered in range)
        SELECT 
          COALESCE(t.design, t.it_code) AS it_name,
          0 AS op_pcs, 0.0 AS op_wt,
          0 AS pr_pcs, 0.0 AS pr_wt,
          SUM(t.pcs) AS in_pcs,
          SUM(t.net_wt) AS in_wt,
          0 AS ou_pcs, 0.0 AS ou_wt,
          0 AS si_pcs, 0.0 AS si_wt
        FROM tag_opening_items t
        LEFT JOIN tag_opening_vouchers v ON t.voucher_id = v.id
        WHERE v.company_id = ? AND v.vch_date BETWEEN ? AND ?
        GROUP BY it_name

        UNION ALL

        -- 6. Sales within Date Range
        SELECT 
          t.product_name AS it_name,
          0 AS op_pcs, 0.0 AS op_wt,
          0 AS pr_pcs, 0.0 AS pr_wt,
          0 AS in_pcs, 0.0 AS in_wt,
          0 AS ou_pcs, 0.0 AS ou_wt,
          SUM(t.quantity) AS si_pcs,
          SUM(t.net_weight) AS si_wt
        FROM sales_items t
        LEFT JOIN sales_invoices v ON t.sales_invoice_id = v.id
        WHERE v.company_id = ? AND v.invoice_date BETWEEN ? AND ?
        GROUP BY it_name
      )
      GROUP BY it_name
      ORDER BY it_name ASC
    `;
    
    return this.db.prepare(query).all(
      companyId, dateFrom,
      companyId, dateFrom,
      companyId, dateFrom,
      companyId, dateFrom, dateTo,
      companyId, dateFrom, dateTo,
      companyId, dateFrom, dateTo
    );
  }
}
