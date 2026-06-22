import { BaseRepository } from './base.repository';
import type { PurchaseVoucher, PurchaseItem, PurchaseTag, PurchaseDiamond } from '../../shared/ipc-api';
import * as crypto from 'crypto';

export class PurchaseRepository extends BaseRepository {
  private mapCategory(itCode: string): 'Gold Jewellery' | 'Silver Jewellery' | 'Diamond Jewellery' | 'Platinum Jewellery' | 'Loose Diamonds' | 'Coins' | 'Custom Products' {
    const code = (itCode || '').toLowerCase();
    if (code.includes('silver') || code.startsWith('s')) {
      return 'Silver Jewellery';
    }
    if (code.includes('diamond') || code.startsWith('d')) {
      return 'Diamond Jewellery';
    }
    if (code.includes('platinum') || code.startsWith('p')) {
      return 'Platinum Jewellery';
    }
    if (code.includes('coin') || code.startsWith('c')) {
      return 'Coins';
    }
    if (code.includes('loose') || code.startsWith('l')) {
      return 'Loose Diamonds';
    }
    return 'Gold Jewellery'; // Default
  }

  private mapPurity(itCode: string): string | null {
    const combined = (itCode || '').toUpperCase();
    const kMatch = combined.match(/\b\d{2}K\b/);
    if (kMatch) return kMatch[0];
    const numMatch = combined.match(/\b(916|750|585|999)\b/);
    if (numMatch) return numMatch[0];
    // Try simple regex search for numbers if it starts with G or S
    const numberPart = combined.replace(/[^0-9]/g, '');
    if (numberPart.length >= 2) return numberPart;
    return null;
  }

  public getPurchaseVouchers(companyId: string): PurchaseVoucher[] {
    const vouchers = this.db.prepare(
      'SELECT * FROM purchase_vouchers WHERE company_id = ? ORDER BY vch_date DESC, vch_no DESC'
    ).all(companyId) as PurchaseVoucher[];

    for (const v of vouchers) {
      v.items = this.db.prepare('SELECT * FROM purchase_items WHERE voucher_id = ? ORDER BY sr ASC').all(v.id) as PurchaseItem[];
      v.tags = this.db.prepare('SELECT * FROM purchase_tags WHERE voucher_id = ? ORDER BY sr ASC').all(v.id) as PurchaseTag[];
      v.diamonds = this.db.prepare('SELECT * FROM purchase_diamonds WHERE voucher_id = ? ORDER BY sr ASC').all(v.id) as PurchaseDiamond[];
    }
    return vouchers;
  }

  public createPurchaseVoucher(
    voucher: Omit<PurchaseVoucher, 'id'>,
    items: Omit<PurchaseItem, 'id' | 'voucher_id'>[],
    tags: Omit<PurchaseTag, 'id' | 'voucher_id' | 'purchase_item_id'>[],
    diamonds: Omit<PurchaseDiamond, 'id' | 'voucher_id' | 'purchase_tag_id'>[]
  ): PurchaseVoucher {
    const voucherId = crypto.randomUUID();

    const insertVoucher = this.db.prepare(`
      INSERT INTO purchase_vouchers (
        id, company_id, vch_no, vch_date, vch_time, ref_no, party_id, stl_bill_no,
        employee, bank_name, vch_desc, net_amount, discount_amount, tax_rate_id,
        tax_amount, tcs_amount, round_off, total_amount, cheque_amount, card_amount,
        bank_account_id, cash_amount, kasar_amount, outstanding_amount
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertItem = this.db.prepare(`
      INSERT INTO purchase_items (
        id, voucher_id, sr, it_code, it_name, pcs, gr_wt, oth_wt, net_wt,
        touch, wastage_percent, fine, con_rate, con_percent, rate, it_amt, ltype, lrate, lamt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertTag = this.db.prepare(`
      INSERT INTO purchase_tags (
        id, purchase_item_id, voucher_id, sr, it_code, tag_no, counter, design, size, huld,
        pcs, gr_wt, ls_wt, net_wt, lbr_percent, ltype, lbr_rate, lbr_amt, oth_amt, pr_cost, mrp, remark
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertDiamond = this.db.prepare(`
      INSERT INTO purchase_diamonds (
        id, purchase_tag_id, voucher_id, sr, it_code, it_name, dm_color, dm_origin, dm_remark, dm_sf_no, pcs, kr_wt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
        voucher.vch_time || null,
        voucher.ref_no || null,
        voucher.party_id || null,
        voucher.stl_bill_no || null,
        voucher.employee || null,
        voucher.bank_name || null,
        voucher.vch_desc || null,
        voucher.net_amount || 0.0,
        voucher.discount_amount || 0.0,
        voucher.tax_rate_id || null,
        voucher.tax_amount || 0.0,
        voucher.tcs_amount || 0.0,
        voucher.round_off || 0.0,
        voucher.total_amount || 0.0,
        voucher.cheque_amount || 0.0,
        voucher.card_amount || 0.0,
        voucher.bank_account_id || null,
        voucher.cash_amount || 0.0,
        voucher.kasar_amount || 0.0,
        voucher.outstanding_amount || 0.0
      );

      // 2. Insert Summary Items
      const itCodeToItemIdMap = new Map<string, string>();
      const itemSrToItemIdMap = new Map<number, string>();
      for (const item of items) {
        const itemId = crypto.randomUUID();
        itCodeToItemIdMap.set(item.it_code, itemId);
        itemSrToItemIdMap.set(item.sr, itemId);
        insertItem.run(
          itemId,
          voucherId,
          item.sr,
          item.it_code,
          item.it_name,
          item.pcs,
          item.gr_wt || 0.0,
          item.oth_wt || 0.0,
          item.net_wt || 0.0,
          item.touch || 0.0,
          item.wastage_percent || 0.0,
          item.fine || 0.0,
          item.con_rate || 0.0,
          item.con_percent || 0.0,
          item.rate || 0.0,
          item.it_amt || 0.0,
          item.ltype || 'G',
          item.lrate || 0.0,
          item.lamt || 0.0
        );
      }

      // 3. Insert Tags and Upsert Products
      const tagNoToTagIdMap = new Map<string, string>();
      for (const tag of tags) {
        const tagId = crypto.randomUUID();
        tagNoToTagIdMap.set(tag.tag_no, tagId);
        
        let purchaseItemId = '';
        if (tag.item_sr) {
          purchaseItemId = itemSrToItemIdMap.get(tag.item_sr) || '';
        }
        if (!purchaseItemId) {
          purchaseItemId = itCodeToItemIdMap.get(tag.it_code) || '';
        }
        
        insertTag.run(
          tagId,
          purchaseItemId,
          voucherId,
          tag.sr,
          tag.it_code,
          tag.tag_no,
          tag.counter || null,
          tag.design || null,
          tag.size || null,
          tag.huld || null,
          tag.pcs,
          tag.gr_wt || 0.0,
          tag.ls_wt || 0.0,
          tag.net_wt || 0.0,
          tag.lbr_percent || 0.0,
          tag.ltype || 'G',
          tag.lbr_rate || 0.0,
          tag.lbr_amt || 0.0,
          tag.oth_amt || 0.0,
          tag.pr_cost || 0.0,
          tag.mrp || 0.0,
          tag.remark || null
        );

        // Upsert Product
        const prod = selectProduct.get(voucher.company_id, tag.tag_no) as { id: string } | undefined;
        const prodName = tag.design || `${tag.it_code} ${tag.tag_no}`;
        const prodCat = this.mapCategory(tag.it_code);
        const mcType = tag.ltype === 'P' ? 'fixed' : 'per_gram';
        const purityStr = this.mapPurity(tag.it_code);

        if (prod) {
          updateProduct.run(
            prodName,
            tag.it_code,
            prodCat,
            tag.net_wt || tag.gr_wt || 0.0,
            tag.net_wt || 0.0,
            tag.gr_wt || 0.0,
            purityStr,
            tag.ls_wt || 0.0,
            tag.lbr_rate || 0.0,
            mcType,
            tag.pr_cost || 0.0,
            tag.mrp || 0.0,
            tag.pcs,
            prod.id
          );
        } else {
          const prodId = crypto.randomUUID();
          insertProduct.run(
            prodId,
            voucher.company_id,
            prodName,
            tag.it_code,
            tag.tag_no,
            tag.tag_no, // qr_code defaults to barcode
            prodCat,
            tag.net_wt || tag.gr_wt || 0.0,
            tag.net_wt || 0.0,
            tag.gr_wt || 0.0,
            purityStr,
            tag.ls_wt || 0.0,
            tag.lbr_rate || 0.0,
            mcType,
            '7113', // default HSN
            3.0,    // default GST
            tag.pr_cost || 0.0,
            tag.mrp || 0.0,
            tag.pcs
          );
        }
      }

      // 4. Insert Diamonds
      for (const dm of diamonds) {
        const dmId = crypto.randomUUID();
        const parentTagId = tagNoToTagIdMap.get(dm.tag_no || '') || '';
        insertDiamond.run(
          dmId,
          parentTagId,
          voucherId,
          dm.sr,
          dm.it_code,
          dm.it_name,
          dm.dm_color || null,
          dm.dm_origin || null,
          dm.dm_remark || null,
          dm.dm_sf_no || null,
          dm.pcs || 0,
          dm.kr_wt || 0.0
        );
      }

      // 5. Post double-entry journal entry
      this.postPurchaseJournal(voucherId, voucher.company_id, voucher);
    });

    tx();

    const created = this.db.prepare('SELECT * FROM purchase_vouchers WHERE id = ?').get(voucherId) as PurchaseVoucher;
    created.items = this.db.prepare('SELECT * FROM purchase_items WHERE voucher_id = ? ORDER BY sr ASC').all(voucherId) as PurchaseItem[];
    created.tags = this.db.prepare('SELECT * FROM purchase_tags WHERE voucher_id = ? ORDER BY sr ASC').all(voucherId) as PurchaseTag[];
    created.diamonds = this.db.prepare('SELECT * FROM purchase_diamonds WHERE voucher_id = ? ORDER BY sr ASC').all(voucherId) as PurchaseDiamond[];
    return created;
  }

  public updatePurchaseVoucher(
    voucher: PurchaseVoucher,
    items: Omit<PurchaseItem, 'id' | 'voucher_id'>[],
    tags: Omit<PurchaseTag, 'id' | 'voucher_id' | 'purchase_item_id'>[],
    diamonds: Omit<PurchaseDiamond, 'id' | 'voucher_id' | 'purchase_tag_id'>[]
  ): void {
    const updateVoucher = this.db.prepare(`
      UPDATE purchase_vouchers SET
        vch_no = ?,
        vch_date = ?,
        vch_time = ?,
        ref_no = ?,
        party_id = ?,
        stl_bill_no = ?,
        employee = ?,
        bank_name = ?,
        vch_desc = ?,
        net_amount = ?,
        discount_amount = ?,
        tax_rate_id = ?,
        tax_amount = ?,
        tcs_amount = ?,
        round_off = ?,
        total_amount = ?,
        cheque_amount = ?,
        card_amount = ?,
        bank_account_id = ?,
        cash_amount = ?,
        kasar_amount = ?,
        outstanding_amount = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);

    // Fetch existing tags to delete their corresponding products if they were removed
    const existingTags = this.db.prepare('SELECT tag_no FROM purchase_tags WHERE voucher_id = ?').all(voucher.id) as { tag_no: string }[];
    const updatedTagNos = new Set(tags.map((t) => t.tag_no));
    const deletedTagNos = existingTags.filter((t) => !updatedTagNos.has(t.tag_no)).map((t) => t.tag_no);

    const deleteItems = this.db.prepare('DELETE FROM purchase_items WHERE voucher_id = ?');
    const deleteTags = this.db.prepare('DELETE FROM purchase_tags WHERE voucher_id = ?');
    const deleteDiamonds = this.db.prepare('DELETE FROM purchase_diamonds WHERE voucher_id = ?');
    const deleteProducts = this.db.prepare('DELETE FROM products WHERE company_id = ? AND barcode = ?');

    const insertItem = this.db.prepare(`
      INSERT INTO purchase_items (
        id, voucher_id, sr, it_code, it_name, pcs, gr_wt, oth_wt, net_wt,
        touch, wastage_percent, fine, con_rate, con_percent, rate, it_amt, ltype, lrate, lamt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertTag = this.db.prepare(`
      INSERT INTO purchase_tags (
        id, purchase_item_id, voucher_id, sr, it_code, tag_no, counter, design, size, huld,
        pcs, gr_wt, ls_wt, net_wt, lbr_percent, ltype, lbr_rate, lbr_amt, oth_amt, pr_cost, mrp, remark
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertDiamond = this.db.prepare(`
      INSERT INTO purchase_diamonds (
        id, purchase_tag_id, voucher_id, sr, it_code, it_name, dm_color, dm_origin, dm_remark, dm_sf_no, pcs, kr_wt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
        voucher.vch_time || null,
        voucher.ref_no || null,
        voucher.party_id || null,
        voucher.stl_bill_no || null,
        voucher.employee || null,
        voucher.bank_name || null,
        voucher.vch_desc || null,
        voucher.net_amount || 0.0,
        voucher.discount_amount || 0.0,
        voucher.tax_rate_id || null,
        voucher.tax_amount || 0.0,
        voucher.tcs_amount || 0.0,
        voucher.round_off || 0.0,
        voucher.total_amount || 0.0,
        voucher.cheque_amount || 0.0,
        voucher.card_amount || 0.0,
        voucher.bank_account_id || null,
        voucher.cash_amount || 0.0,
        voucher.kasar_amount || 0.0,
        voucher.outstanding_amount || 0.0,
        voucher.id
      );

      // 2. Delete deleted tags' products
      for (const tagNo of deletedTagNos) {
        deleteProducts.run(voucher.company_id, tagNo);
      }

      // 3. Clear old items, tags, diamonds
      deleteDiamonds.run(voucher.id);
      deleteTags.run(voucher.id);
      deleteItems.run(voucher.id);

      // 4. Re-insert items
      const itCodeToItemIdMap = new Map<string, string>();
      const itemSrToItemIdMap = new Map<number, string>();
      for (const item of items) {
        const itemId = crypto.randomUUID();
        itCodeToItemIdMap.set(item.it_code, itemId);
        itemSrToItemIdMap.set(item.sr, itemId);
        insertItem.run(
          itemId,
          voucher.id,
          item.sr,
          item.it_code,
          item.it_name,
          item.pcs,
          item.gr_wt || 0.0,
          item.oth_wt || 0.0,
          item.net_wt || 0.0,
          item.touch || 0.0,
          item.wastage_percent || 0.0,
          item.fine || 0.0,
          item.con_rate || 0.0,
          item.con_percent || 0.0,
          item.rate || 0.0,
          item.it_amt || 0.0,
          item.ltype || 'G',
          item.lrate || 0.0,
          item.lamt || 0.0
        );
      }

      // 5. Re-insert tags and upsert products
      const tagNoToTagIdMap = new Map<string, string>();
      for (const tag of tags) {
        const tagId = crypto.randomUUID();
        tagNoToTagIdMap.set(tag.tag_no, tagId);
        
        let purchaseItemId = '';
        if (tag.item_sr) {
          purchaseItemId = itemSrToItemIdMap.get(tag.item_sr) || '';
        }
        if (!purchaseItemId) {
          purchaseItemId = itCodeToItemIdMap.get(tag.it_code) || '';
        }
        
        insertTag.run(
          tagId,
          purchaseItemId,
          voucher.id,
          tag.sr,
          tag.it_code,
          tag.tag_no,
          tag.counter || null,
          tag.design || null,
          tag.size || null,
          tag.huld || null,
          tag.pcs,
          tag.gr_wt || 0.0,
          tag.ls_wt || 0.0,
          tag.net_wt || 0.0,
          tag.lbr_percent || 0.0,
          tag.ltype || 'G',
          tag.lbr_rate || 0.0,
          tag.lbr_amt || 0.0,
          tag.oth_amt || 0.0,
          tag.pr_cost || 0.0,
          tag.mrp || 0.0,
          tag.remark || null
        );

        // Upsert Product
        const prod = selectProduct.get(voucher.company_id, tag.tag_no) as { id: string } | undefined;
        const prodName = tag.design || `${tag.it_code} ${tag.tag_no}`;
        const prodCat = this.mapCategory(tag.it_code);
        const mcType = tag.ltype === 'P' ? 'fixed' : 'per_gram';
        const purityStr = this.mapPurity(tag.it_code);

        if (prod) {
          updateProduct.run(
            prodName,
            tag.it_code,
            prodCat,
            tag.net_wt || tag.gr_wt || 0.0,
            tag.net_wt || 0.0,
            tag.gr_wt || 0.0,
            purityStr,
            tag.ls_wt || 0.0,
            tag.lbr_rate || 0.0,
            mcType,
            tag.pr_cost || 0.0,
            tag.mrp || 0.0,
            tag.pcs,
            prod.id
          );
        } else {
          const prodId = crypto.randomUUID();
          insertProduct.run(
            prodId,
            voucher.company_id,
            prodName,
            tag.it_code,
            tag.tag_no,
            tag.tag_no,
            prodCat,
            tag.net_wt || tag.gr_wt || 0.0,
            tag.net_wt || 0.0,
            tag.gr_wt || 0.0,
            purityStr,
            tag.ls_wt || 0.0,
            tag.lbr_rate || 0.0,
            mcType,
            '7113',
            3.0,
            tag.pr_cost || 0.0,
            tag.mrp || 0.0,
            tag.pcs
          );
        }
      }

      // 6. Re-insert diamonds
      for (const dm of diamonds) {
        const dmId = crypto.randomUUID();
        const parentTagId = tagNoToTagIdMap.get(dm.tag_no || '') || '';
        insertDiamond.run(
          dmId,
          parentTagId,
          voucher.id,
          dm.sr,
          dm.it_code,
          dm.it_name,
          dm.dm_color || null,
          dm.dm_origin || null,
          dm.dm_remark || null,
          dm.dm_sf_no || null,
          dm.pcs || 0,
          dm.kr_wt || 0.0
        );
      }

      // 7. Revert old journal entry and post new one
      this.revertPurchaseJournal(voucher.id, voucher.company_id);
      this.postPurchaseJournal(voucher.id, voucher.company_id, voucher);
    });

    tx();
  }

  public deletePurchaseVoucher(id: string): void {
    const voucher = this.db.prepare('SELECT company_id FROM purchase_vouchers WHERE id = ?').get(id) as { company_id: string } | undefined;
    if (!voucher) return;

    const tags = this.db.prepare('SELECT tag_no FROM purchase_tags WHERE voucher_id = ?').all(id) as { tag_no: string }[];
    const deleteProducts = this.db.prepare('DELETE FROM products WHERE company_id = ? AND barcode = ?');

    const tx = this.db.transaction(() => {
      // 1. Delete corresponding products
      for (const tag of tags) {
        deleteProducts.run(voucher.company_id, tag.tag_no);
      }
      // 2. Revert double-entry journal entry
      this.revertPurchaseJournal(id, voucher.company_id);
      // 3. Delete voucher (cascades to items, tags, and diamonds)
      this.db.prepare('DELETE FROM purchase_vouchers WHERE id = ?').run(id);
    });

    tx();
  }

  private postPurchaseJournal(voucherId: string, companyId: string, voucher: Omit<PurchaseVoucher, 'id'>) {
    if (!voucher.vch_no) return;

    const nextVoucherNo = `PV-${Date.now().toString().slice(-6)}`;
    const journalEntryId = crypto.randomUUID();

    // Save main journal entry
    this.db.prepare(`
      INSERT INTO journal_entries (id, company_id, entry_date, voucher_type, voucher_number, reference_id, narration)
      VALUES (?, ?, ?, 'Purchase', ?, ?, ?)
    `).run(
      journalEntryId,
      companyId,
      voucher.vch_date,
      nextVoucherNo,
      voucherId,
      `Purchase Invoice #${voucher.vch_no}`
    );

    const getAccountByCode = this.db.prepare('SELECT id FROM accounts WHERE company_id = ? AND code LIKE ?');
    const updateAccountBalance = this.db.prepare('UPDATE accounts SET current_balance = current_balance + ? WHERE id = ?');
    const insertJournalItem = this.db.prepare(`
      INSERT INTO journal_items (id, journal_entry_id, account_id, debit, credit)
      VALUES (?, ?, ?, ?, ?)
    `);

    // 1. Resolve Purchase Account (Debit Purchase)
    const purchAcc = getAccountByCode.get(companyId, 'PURCHASE_%') as { id: string } | undefined;
    if (purchAcc) {
      const amt = voucher.net_amount || 0.0;
      insertJournalItem.run(crypto.randomUUID(), journalEntryId, purchAcc.id, amt, 0.0);
      updateAccountBalance.run(amt, purchAcc.id);
    }

    // 2. Resolve Tax Account (Debit Input GST)
    const taxAmt = voucher.tax_amount || 0.0;
    if (taxAmt > 0) {
      let isIgst = false;
      if (voucher.tax_rate_id) {
        const taxRecord = this.db.prepare('SELECT tax_type FROM taxes WHERE id = ?').get(voucher.tax_rate_id) as { tax_type: string } | undefined;
        if (taxRecord && taxRecord.tax_type === 'IGST') {
          isIgst = true;
        }
      }

      if (isIgst) {
        const taxAcc = getAccountByCode.get(companyId, 'IGST_IN_%') as { id: string } | undefined;
        if (taxAcc) {
          insertJournalItem.run(crypto.randomUUID(), journalEntryId, taxAcc.id, taxAmt, 0.0);
          updateAccountBalance.run(taxAmt, taxAcc.id);
        }
      } else {
        const cgstAcc = getAccountByCode.get(companyId, 'CGST_IN_%') as { id: string } | undefined;
        const sgstAcc = getAccountByCode.get(companyId, 'SGST_IN_%') as { id: string } | undefined;
        const halfTax = taxAmt / 2;
        if (cgstAcc) {
          insertJournalItem.run(crypto.randomUUID(), journalEntryId, cgstAcc.id, halfTax, 0.0);
          updateAccountBalance.run(halfTax, cgstAcc.id);
        }
        if (sgstAcc) {
          insertJournalItem.run(crypto.randomUUID(), journalEntryId, sgstAcc.id, halfTax, 0.0);
          updateAccountBalance.run(halfTax, sgstAcc.id);
        }
      }
    }

    // 3. Resolve Round Off
    const rofAmt = voucher.round_off || 0.0;
    if (rofAmt !== 0) {
      let rofAcc = getAccountByCode.get(companyId, 'ROUND_OFF_%') as { id: string } | undefined;
      if (!rofAcc) {
        const rofId = crypto.randomUUID();
        this.db.prepare(`
          INSERT INTO accounts (id, company_id, name, code, parent_group, opening_balance, current_balance)
          VALUES (?, ?, 'Round Off Account', ?, 'Indirect Expense', 0.0, 0.0)
        `).run(rofId, companyId, `ROUND_OFF_${companyId.substring(0, 8)}`);
        rofAcc = { id: rofId };
      }
      if (rofAmt > 0) {
        insertJournalItem.run(crypto.randomUUID(), journalEntryId, rofAcc.id, rofAmt, 0.0);
        updateAccountBalance.run(rofAmt, rofAcc.id);
      } else {
        insertJournalItem.run(crypto.randomUUID(), journalEntryId, rofAcc.id, 0.0, -rofAmt);
        updateAccountBalance.run(rofAmt, rofAcc.id);
      }
    }

    // 4. Resolve Cash Paid (Credit Cash)
    const cashAmt = voucher.cash_amount || 0.0;
    if (cashAmt > 0) {
      const cashAcc = getAccountByCode.get(companyId, 'CASH_%') as { id: string } | undefined;
      if (cashAcc) {
        insertJournalItem.run(crypto.randomUUID(), journalEntryId, cashAcc.id, 0.0, cashAmt);
        updateAccountBalance.run(-cashAmt, cashAcc.id);
      }
    }

    // 5. Resolve Bank Paid (Credit Bank)
    const bankAmt = (voucher.cheque_amount || 0.0) + (voucher.card_amount || 0.0);
    if (bankAmt > 0) {
      const bankAcc = getAccountByCode.get(companyId, 'BANK_%') as { id: string } | undefined;
      if (bankAcc) {
        insertJournalItem.run(crypto.randomUUID(), journalEntryId, bankAcc.id, 0.0, bankAmt);
        updateAccountBalance.run(-bankAmt, bankAcc.id);
      }
    }

    // 6. Resolve Supplier Outstanding (Credit Supplier Ledger)
    const outAmt = voucher.outstanding_amount || 0.0;
    if (outAmt > 0 && voucher.party_id) {
      const supplier = this.db.prepare('SELECT name, mobile FROM parties WHERE id = ?').get(voucher.party_id) as { name: string; mobile: string } | undefined;
      if (supplier) {
        const cleanMobile = (supplier.mobile || 'NOMOBILE').replace(/\s+/g, '');
        let suppAcc = getAccountByCode.get(companyId, `SUPP_${cleanMobile}_%`) as { id: string } | undefined;
        if (!suppAcc) {
          const suppAccId = crypto.randomUUID();
          const suppAccCode = `SUPP_${cleanMobile}_${voucher.party_id.substring(0, 4)}`;
          this.db.prepare(`
            INSERT INTO accounts (id, company_id, name, code, parent_group, opening_balance, current_balance)
            VALUES (?, ?, ?, ?, 'Supplier Ledger', 0.0, 0.0)
          `).run(suppAccId, companyId, `${supplier.name} Ledger`, suppAccCode);
          suppAcc = { id: suppAccId };
        }
        insertJournalItem.run(crypto.randomUUID(), journalEntryId, suppAcc.id, 0.0, outAmt);
        updateAccountBalance.run(-outAmt, suppAcc.id);
      }
    }

    // 7. Resolve Discount Received & Kasar (Credit Discount Received)
    const discAmt = (voucher.discount_amount || 0.0) + (voucher.kasar_amount || 0.0);
    if (discAmt > 0) {
      let discAcc = getAccountByCode.get(companyId, 'DISCOUNT_RECEIVED_%') as { id: string } | undefined;
      if (!discAcc) {
        const discId = crypto.randomUUID();
        this.db.prepare(`
          INSERT INTO accounts (id, company_id, name, code, parent_group, opening_balance, current_balance)
          VALUES (?, ?, 'Discount Received', ?, 'Indirect Income', 0.0, 0.0)
        `).run(discId, companyId, `DISCOUNT_RECEIVED_${companyId.substring(0, 8)}`);
        discAcc = { id: discId };
      }
      insertJournalItem.run(crypto.randomUUID(), journalEntryId, discAcc.id, 0.0, discAmt);
      updateAccountBalance.run(-discAmt, discAcc.id);
    }
  }

  private revertPurchaseJournal(voucherId: string, companyId: string) {
    const journalEntries = this.db.prepare(`
      SELECT id FROM journal_entries WHERE company_id = ? AND reference_id = ?
    `).all(companyId, voucherId) as Array<{ id: string }>;

    const updateAccountBalance = this.db.prepare('UPDATE accounts SET current_balance = current_balance + ? WHERE id = ?');

    for (const entry of journalEntries) {
      const jItems = this.db.prepare('SELECT * FROM journal_items WHERE journal_entry_id = ?').all(entry.id) as Array<{ account_id: string; debit: number; credit: number }>;
      
      for (const ji of jItems) {
        const change = ji.credit - ji.debit;
        updateAccountBalance.run(change, ji.account_id);
      }

      this.db.prepare('DELETE FROM journal_entries WHERE id = ?').run(entry.id);
    }
  }
}
