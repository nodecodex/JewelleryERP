import { BaseRepository } from './base.repository';
import type { TagOpeningVoucher, TagOpeningItem, TagOpeningAccessory } from '../../shared/ipc-api';
import * as crypto from 'crypto';

export class TagOpeningRepository extends BaseRepository {
  private mapCategory(itType: string): 'Gold Jewellery' | 'Silver Jewellery' | 'Diamond Jewellery' | 'Platinum Jewellery' | 'Loose Diamonds' | 'Coins' | 'Custom Products' {
    switch (itType) {
      case 'Gold':
        return 'Gold Jewellery';
      case 'Silver':
        return 'Silver Jewellery';
      case 'Diamond':
        return 'Diamond Jewellery';
      case 'Platinum':
        return 'Platinum Jewellery';
      case 'Loose Stones':
        return 'Loose Diamonds';
      default:
        return 'Custom Products';
    }
  }

  public getTagOpeningVouchers(companyId: string): TagOpeningVoucher[] {
    const vouchers = this.db.prepare(
      'SELECT * FROM tag_opening_vouchers WHERE company_id = ? ORDER BY vch_date DESC, vch_no DESC'
    ).all(companyId) as TagOpeningVoucher[];

    for (const v of vouchers) {
      v.items = this.db.prepare('SELECT * FROM tag_opening_items WHERE voucher_id = ? ORDER BY sr ASC').all(v.id) as TagOpeningItem[];
      v.accessories = this.db.prepare('SELECT * FROM tag_opening_accessories WHERE voucher_id = ? ORDER BY sr ASC').all(v.id) as TagOpeningAccessory[];
    }
    return vouchers;
  }

  public createTagOpeningVoucher(
    voucher: Omit<TagOpeningVoucher, 'id'>,
    items: Omit<TagOpeningItem, 'id' | 'voucher_id'>[],
    accessories: Omit<TagOpeningAccessory, 'id' | 'voucher_id'>[]
  ): TagOpeningVoucher {
    const voucherId = crypto.randomUUID();

    const insertVoucher = this.db.prepare(`
      INSERT INTO tag_opening_vouchers (
        id, company_id, vch_no, vch_date, it_type, print_file_name,
        total_pcs, total_gr_wt, total_ls_wt, total_net_wt, total_lbr_amt, total_oth_amt, total_mrp,
        hu_wt, huld2, huld3, huld4, employee, vch_desc, lable_skip
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertItem = this.db.prepare(`
      INSERT INTO tag_opening_items (
        id, voucher_id, sr, it_code, tag_no, counter, design, size, huld,
        pcs, gr_wt, ls_wt, net_wt, lbr_percent, l_type, lbr_rate, lbr_amt, oth_amt, pr_cost, mrp
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertAccessory = this.db.prepare(`
      INSERT INTO tag_opening_accessories (
        id, voucher_id, sr, it_code, it_name, pcs, kr_wt, kr_ls_percent, weight, con_percent, pw, rate, it_amt, pa_amt, net_amt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const selectProduct = this.db.prepare('SELECT id FROM products WHERE company_id = ? AND barcode = ?');
    
    const insertProduct = this.db.prepare(`
      INSERT INTO products (
        id, company_id, name, sku, barcode, qr_code, category, weight, net_weight, gross_weight,
        purity, stone_weight, making_charges, making_charges_type, hsn_code, gst_rate, purchase_price, selling_price, current_stock
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const updateProduct = this.db.prepare(`
      UPDATE products SET
        name = ?,
        sku = ?,
        category = ?,
        weight = ?,
        net_weight = ?,
        gross_weight = ?,
        purity = ?,
        stone_weight = ?,
        making_charges = ?,
        making_charges_type = ?,
        purchase_price = ?,
        selling_price = ?,
        current_stock = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);

    const tx = this.db.transaction(() => {
      // 1. Insert Voucher
      insertVoucher.run(
        voucherId,
        voucher.company_id,
        voucher.vch_no,
        voucher.vch_date,
        voucher.it_type,
        voucher.print_file_name,
        voucher.total_pcs,
        voucher.total_gr_wt,
        voucher.total_ls_wt,
        voucher.total_net_wt,
        voucher.total_lbr_amt,
        voucher.total_oth_amt,
        voucher.total_mrp,
        voucher.hu_wt || 0.0,
        voucher.huld2 || 0.0,
        voucher.huld3 || 0.0,
        voucher.huld4 || 0.0,
        voucher.employee || null,
        voucher.vch_desc || null,
        voucher.lable_skip || 0
      );

      // 2. Insert Items and Upsert Products
      for (const item of items) {
        const itemId = crypto.randomUUID();
        insertItem.run(
          itemId,
          voucherId,
          item.sr,
          item.it_code,
          item.tag_no,
          item.counter || null,
          item.design || null,
          item.size || null,
          item.huld || null,
          item.pcs,
          item.gr_wt,
          item.ls_wt,
          item.net_wt,
          item.lbr_percent || 0.0,
          item.l_type || 'G',
          item.lbr_rate || 0.0,
          item.lbr_amt || 0.0,
          item.oth_amt || 0.0,
          item.pr_cost || 0.0,
          item.mrp || 0.0
        );

        // Upsert corresponding product
        const prod = selectProduct.get(voucher.company_id, item.tag_no) as { id: string } | undefined;
        const prodName = item.design || `${item.it_code} ${item.tag_no}`;
        const prodCat = this.mapCategory(voucher.it_type);
        const mcType = item.l_type === 'P' ? 'fixed' : 'per_gram'; // Standard mapping: P is piece/fixed, G/F is gram

        if (prod) {
          updateProduct.run(
            prodName,
            item.it_code,
            prodCat,
            item.net_wt,
            item.net_wt,
            item.gr_wt,
            item.it_code.replace(/[^0-9]/g, '') || null, // try to extract purity number
            item.ls_wt,
            item.lbr_rate || 0.0,
            mcType,
            item.pr_cost || 0.0,
            item.mrp || 0.0,
            item.pcs,
            prod.id
          );
        } else {
          const prodId = crypto.randomUUID();
          insertProduct.run(
            prodId,
            voucher.company_id,
            prodName,
            item.it_code,
            item.tag_no,
            item.tag_no,
            prodCat,
            item.net_wt,
            item.net_wt,
            item.gr_wt,
            item.it_code.replace(/[^0-9]/g, '') || null,
            item.ls_wt,
            item.lbr_rate || 0.0,
            mcType,
            '7113', // default HSN
            3.0,    // default GST
            item.pr_cost || 0.0,
            item.mrp || 0.0,
            item.pcs
          );
        }
      }

      // 3. Insert Accessories
      for (const acc of accessories) {
        const accId = crypto.randomUUID();
        insertAccessory.run(
          accId,
          voucherId,
          acc.sr,
          acc.it_code,
          acc.it_name || null,
          acc.pcs || 0,
          acc.kr_wt || 0.0,
          acc.kr_ls_percent || 0.0,
          acc.weight || 0.0,
          acc.con_percent || 0.0,
          acc.pw || 'W',
          acc.rate || 0.0,
          acc.it_amt || 0.0,
          acc.pa_amt || 0.0,
          acc.net_amt || 0.0
        );
      }
    });

    tx();

    const created = this.db.prepare('SELECT * FROM tag_opening_vouchers WHERE id = ?').get(voucherId) as TagOpeningVoucher;
    created.items = this.db.prepare('SELECT * FROM tag_opening_items WHERE voucher_id = ? ORDER BY sr ASC').all(voucherId) as TagOpeningItem[];
    created.accessories = this.db.prepare('SELECT * FROM tag_opening_accessories WHERE voucher_id = ? ORDER BY sr ASC').all(voucherId) as TagOpeningAccessory[];
    return created;
  }

  public updateTagOpeningVoucher(
    voucher: TagOpeningVoucher,
    items: Omit<TagOpeningItem, 'id' | 'voucher_id'>[],
    accessories: Omit<TagOpeningAccessory, 'id' | 'voucher_id'>[]
  ): void {
    const updateVoucher = this.db.prepare(`
      UPDATE tag_opening_vouchers SET
        vch_no = ?,
        vch_date = ?,
        it_type = ?,
        print_file_name = ?,
        total_pcs = ?,
        total_gr_wt = ?,
        total_ls_wt = ?,
        total_net_wt = ?,
        total_lbr_amt = ?,
        total_oth_amt = ?,
        total_mrp = ?,
        hu_wt = ?,
        huld2 = ?,
        huld3 = ?,
        huld4 = ?,
        employee = ?,
        vch_desc = ?,
        lable_skip = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);

    // Fetch existing tag items to check for deletions
    const existingItems = this.db.prepare('SELECT tag_no FROM tag_opening_items WHERE voucher_id = ?').all(voucher.id) as { tag_no: string }[];
    const updatedTagNos = new Set(items.map((i) => i.tag_no));
    const deletedTagNos = existingItems.filter((i) => !updatedTagNos.has(i.tag_no)).map((i) => i.tag_no);

    const deleteItems = this.db.prepare('DELETE FROM tag_opening_items WHERE voucher_id = ?');
    const deleteAccessories = this.db.prepare('DELETE FROM tag_opening_accessories WHERE voucher_id = ?');
    const deleteProducts = this.db.prepare('DELETE FROM products WHERE company_id = ? AND barcode = ?');

    const insertItem = this.db.prepare(`
      INSERT INTO tag_opening_items (
        id, voucher_id, sr, it_code, tag_no, counter, design, size, huld,
        pcs, gr_wt, ls_wt, net_wt, lbr_percent, l_type, lbr_rate, lbr_amt, oth_amt, pr_cost, mrp
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertAccessory = this.db.prepare(`
      INSERT INTO tag_opening_accessories (
        id, voucher_id, sr, it_code, it_name, pcs, kr_wt, kr_ls_percent, weight, con_percent, pw, rate, it_amt, pa_amt, net_amt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const selectProduct = this.db.prepare('SELECT id FROM products WHERE company_id = ? AND barcode = ?');
    const insertProduct = this.db.prepare(`
      INSERT INTO products (
        id, company_id, name, sku, barcode, qr_code, category, weight, net_weight, gross_weight,
        purity, stone_weight, making_charges, making_charges_type, hsn_code, gst_rate, purchase_price, selling_price, current_stock
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const updateProduct = this.db.prepare(`
      UPDATE products SET
        name = ?,
        sku = ?,
        category = ?,
        weight = ?,
        net_weight = ?,
        gross_weight = ?,
        purity = ?,
        stone_weight = ?,
        making_charges = ?,
        making_charges_type = ?,
        purchase_price = ?,
        selling_price = ?,
        current_stock = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);

    const tx = this.db.transaction(() => {
      // 1. Update Voucher
      updateVoucher.run(
        voucher.vch_no,
        voucher.vch_date,
        voucher.it_type,
        voucher.print_file_name,
        voucher.total_pcs,
        voucher.total_gr_wt,
        voucher.total_ls_wt,
        voucher.total_net_wt,
        voucher.total_lbr_amt,
        voucher.total_oth_amt,
        voucher.total_mrp,
        voucher.hu_wt || 0.0,
        voucher.huld2 || 0.0,
        voucher.huld3 || 0.0,
        voucher.huld4 || 0.0,
        voucher.employee || null,
        voucher.vch_desc || null,
        voucher.lable_skip || 0,
        voucher.id
      );

      // 2. Delete deleted items' products
      for (const tagNo of deletedTagNos) {
        deleteProducts.run(voucher.company_id, tagNo);
      }

      // 3. Clear existing items and accessories
      deleteItems.run(voucher.id);
      deleteAccessories.run(voucher.id);

      // 4. Re-insert items and upsert products
      for (const item of items) {
        const itemId = crypto.randomUUID();
        insertItem.run(
          itemId,
          voucher.id,
          item.sr,
          item.it_code,
          item.tag_no,
          item.counter || null,
          item.design || null,
          item.size || null,
          item.huld || null,
          item.pcs,
          item.gr_wt,
          item.ls_wt,
          item.net_wt,
          item.lbr_percent || 0.0,
          item.l_type || 'G',
          item.lbr_rate || 0.0,
          item.lbr_amt || 0.0,
          item.oth_amt || 0.0,
          item.pr_cost || 0.0,
          item.mrp || 0.0
        );

        // Upsert product
        const prod = selectProduct.get(voucher.company_id, item.tag_no) as { id: string } | undefined;
        const prodName = item.design || `${item.it_code} ${item.tag_no}`;
        const prodCat = this.mapCategory(voucher.it_type);
        const mcType = item.l_type === 'P' ? 'fixed' : 'per_gram';

        if (prod) {
          updateProduct.run(
            prodName,
            item.it_code,
            prodCat,
            item.net_wt,
            item.net_wt,
            item.gr_wt,
            item.it_code.replace(/[^0-9]/g, '') || null,
            item.ls_wt,
            item.lbr_rate || 0.0,
            mcType,
            item.pr_cost || 0.0,
            item.mrp || 0.0,
            item.pcs,
            prod.id
          );
        } else {
          const prodId = crypto.randomUUID();
          insertProduct.run(
            prodId,
            voucher.company_id,
            prodName,
            item.it_code,
            item.tag_no,
            item.tag_no,
            prodCat,
            item.net_wt,
            item.net_wt,
            item.gr_wt,
            item.it_code.replace(/[^0-9]/g, '') || null,
            item.ls_wt,
            item.lbr_rate || 0.0,
            mcType,
            '7113',
            3.0,
            item.pr_cost || 0.0,
            item.mrp || 0.0,
            item.pcs
          );
        }
      }

      // 5. Re-insert accessories
      for (const acc of accessories) {
        const accId = crypto.randomUUID();
        insertAccessory.run(
          accId,
          voucher.id,
          acc.sr,
          acc.it_code,
          acc.it_name || null,
          acc.pcs || 0,
          acc.kr_wt || 0.0,
          acc.kr_ls_percent || 0.0,
          acc.weight || 0.0,
          acc.con_percent || 0.0,
          acc.pw || 'W',
          acc.rate || 0.0,
          acc.it_amt || 0.0,
          acc.pa_amt || 0.0,
          acc.net_amt || 0.0
        );
      }
    });

    tx();
  }

  public deleteTagOpeningVoucher(id: string): void {
    // 1. Fetch company_id and items to delete corresponding products
    const voucher = this.db.prepare('SELECT company_id FROM tag_opening_vouchers WHERE id = ?').get(id) as { company_id: string } | undefined;
    if (!voucher) return;

    const items = this.db.prepare('SELECT tag_no FROM tag_opening_items WHERE voucher_id = ?').all(id) as { tag_no: string }[];
    const deleteProducts = this.db.prepare('DELETE FROM products WHERE company_id = ? AND barcode = ?');

    const tx = this.db.transaction(() => {
      // 2. Delete products
      for (const item of items) {
        deleteProducts.run(voucher.company_id, item.tag_no);
      }
      
      // 3. Delete voucher (cascades to items and accessories via ON DELETE CASCADE)
      this.db.prepare('DELETE FROM tag_opening_vouchers WHERE id = ?').run(id);
    });

    tx();
  }
}
