import { BaseRepository } from './base.repository';
import type { SalesInvoice, SalesItem } from '../../shared/ipc-api';
import * as crypto from 'crypto';

export class InvoiceRepository extends BaseRepository {
  public getInvoices(companyId: string): SalesInvoice[] {
    const invoices = this.db.prepare('SELECT * FROM sales_invoices WHERE company_id = ? ORDER BY invoice_date DESC, created_at DESC').all(companyId) as SalesInvoice[];
    
    for (const inv of invoices) {
      inv.items = this.db.prepare('SELECT * FROM sales_items WHERE sales_invoice_id = ?').all(inv.id) as SalesItem[];
    }
    
    return invoices;
  }

  public getNextInvoiceNumber(companyId: string, type: string): string {
    const prefix = type === 'Estimate' ? 'EST-' : 'INV-';
    const row = this.db.prepare(`
      SELECT invoice_number FROM sales_invoices 
      WHERE company_id = ? AND invoice_number LIKE ? 
      ORDER BY invoice_number DESC LIMIT 1
    `).get(companyId, `${prefix}%`) as { invoice_number: string } | undefined;

    if (!row) {
      return `${prefix}1001`;
    }

    const lastNumStr = row.invoice_number.replace(prefix, '');
    const lastNum = parseInt(lastNumStr, 10);
    return `${prefix}${lastNum + 1}`;
  }

  public createInvoice(
    invoice: Omit<SalesInvoice, 'id'>,
    items: Omit<SalesItem, 'id' | 'sales_invoice_id'>[]
  ): SalesInvoice {
    const invoiceId = crypto.randomUUID();
    const invoiceNumber = invoice.invoice_number || this.getNextInvoiceNumber(invoice.company_id, invoice.invoice_type);

    const insertInvoice = this.db.prepare(`
      INSERT INTO sales_invoices (
        id, company_id, invoice_number, invoice_date, customer_id, invoice_type,
        tax_type, gross_amount, discount_amount, tax_amount, making_charges_total,
        round_off, net_amount, payment_mode, paid_amount, balance_amount, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertItem = this.db.prepare(`
      INSERT INTO sales_items (
        id, sales_invoice_id, product_id, product_name, weight, net_weight, gross_weight,
        purity, making_charges, rate, quantity, tax_rate, tax_amount, subtotal
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const updateStock = this.db.prepare(`
      UPDATE products SET current_stock = current_stock - ? WHERE id = ?
    `);

    // Fetch account helper
    const getAccountByCode = this.db.prepare('SELECT id, parent_group FROM accounts WHERE company_id = ? AND code LIKE ?');
    const updateAccountBalance = this.db.prepare('UPDATE accounts SET current_balance = current_balance + ? WHERE id = ?');

    // Run transaction
    const invoiceTx = this.db.transaction(() => {
      // 1. Save Sales Invoice record
      insertInvoice.run(
        invoiceId,
        invoice.company_id,
        invoiceNumber,
        invoice.invoice_date,
        invoice.customer_id || null,
        invoice.invoice_type,
        invoice.tax_type,
        invoice.gross_amount,
        invoice.discount_amount,
        invoice.tax_amount,
        invoice.making_charges_total,
        invoice.round_off || 0.0,
        invoice.net_amount,
        invoice.payment_mode,
        invoice.paid_amount || 0.0,
        invoice.balance_amount || 0.0,
        invoice.status || 'Paid'
      );

      // 2. Save invoice line items & adjust stock
      for (const item of items) {
        const itemId = crypto.randomUUID();
        insertItem.run(
          itemId,
          invoiceId,
          item.product_id || null,
          item.product_name,
          item.weight,
          item.net_weight,
          item.gross_weight,
          item.purity || null,
          item.making_charges,
          item.rate,
          item.quantity,
          item.tax_rate,
          item.tax_amount,
          item.subtotal
        );

        if (item.product_id) {
          updateStock.run(item.quantity, item.product_id);
        }
      }

      // 3. Create Double Entry Accounting Vouchers (if not an Estimate)
      if (invoice.invoice_type !== 'Estimate') {
        const voucherId = crypto.randomUUID();
        const nextVoucherNo = `SV-${Date.now().toString().slice(-6)}`;

        // Save main journal entry
        this.db.prepare(`
          INSERT INTO journal_entries (id, company_id, entry_date, voucher_type, voucher_number, reference_id, narration)
          VALUES (?, ?, ?, 'Sales', ?, ?, ?)
        `).run(
          voucherId,
          invoice.company_id,
          invoice.invoice_date,
          nextVoucherNo,
          invoiceId,
          `Sales Invoice #${invoiceNumber}`
        );

        const insertJournalItem = this.db.prepare(`
          INSERT INTO journal_items (id, journal_entry_id, account_id, debit, credit)
          VALUES (?, ?, ?, ?, ?)
        `);

        // Resolve Sales Account
        const salesAcc = getAccountByCode.get(invoice.company_id, `SALES_%`) as { id: string } | undefined;
        if (salesAcc) {
          // Credit sales (credit is negative for sales revenue)
          insertJournalItem.run(crypto.randomUUID(), voucherId, salesAcc.id, 0.0, invoice.gross_amount + invoice.making_charges_total);
          updateAccountBalance.run(-(invoice.gross_amount + invoice.making_charges_total), salesAcc.id);
        }

        // Resolve Tax Account (Output GST)
        if (invoice.tax_amount > 0) {
          let taxCodePattern = 'CGST_OUT_%'; // default
          if (invoice.tax_type === 'IGST') {
            taxCodePattern = 'IGST_OUT_%';
          }
          const taxAcc = getAccountByCode.get(invoice.company_id, taxCodePattern) as { id: string } | undefined;
          
          if (taxAcc) {
            insertJournalItem.run(crypto.randomUUID(), voucherId, taxAcc.id, 0.0, invoice.tax_amount);
            updateAccountBalance.run(-invoice.tax_amount, taxAcc.id);
          }
        }

        // Resolve Payment Account (Debit Cash/Bank for paid amount)
        if (invoice.paid_amount > 0) {
          const payPattern = invoice.payment_mode === 'Bank' ? 'BANK_%' : 'CASH_%';
          const payAcc = getAccountByCode.get(invoice.company_id, payPattern) as { id: string } | undefined;
          if (payAcc) {
            insertJournalItem.run(crypto.randomUUID(), voucherId, payAcc.id, invoice.paid_amount, 0.0);
            updateAccountBalance.run(invoice.paid_amount, payAcc.id);
          }
        }

        // Resolve Customer Account (Debit Customer ledger for unpaid balance)
        if (invoice.balance_amount > 0 && invoice.customer_id) {
          // Fetch customer's specific ledger from parties table
          const cust = this.db.prepare('SELECT name, mobile FROM parties WHERE id = ?').get(invoice.customer_id) as { name: string; mobile: string } | undefined;
          if (cust) {
            const cleanMobile = (cust.mobile || 'NOMOBILE').replace(/\s+/g, '');
            let custAcc = getAccountByCode.get(invoice.company_id, `CUST_${cleanMobile}_%`) as { id: string } | undefined;
            if (!custAcc) {
              const custAccId = crypto.randomUUID();
              const custAccCode = `CUST_${cleanMobile}_${invoice.customer_id.substring(0, 4)}`;
              this.db.prepare(`
                INSERT INTO accounts (id, company_id, name, code, parent_group, opening_balance, current_balance)
                VALUES (?, ?, ?, ?, 'Customer Ledger', 0.0, 0.0)
              `).run(custAccId, invoice.company_id, `${cust.name} Ledger`, custAccCode);
              custAcc = { id: custAccId };
            }
            insertJournalItem.run(crypto.randomUUID(), voucherId, custAcc.id, invoice.balance_amount, 0.0);
            updateAccountBalance.run(invoice.balance_amount, custAcc.id);
          }
        }

        // Resolve Discount Allowed Account (Debit Discount Allowed for discount_amount)
        if (invoice.discount_amount > 0) {
          let discAcc = getAccountByCode.get(invoice.company_id, 'DISCOUNT_ALLOWED_%') as { id: string } | undefined;
          if (!discAcc) {
            const discId = crypto.randomUUID();
            this.db.prepare(`
              INSERT INTO accounts (id, company_id, name, code, parent_group, opening_balance, current_balance)
              VALUES (?, ?, 'Discount Allowed', ?, 'Indirect Expense', 0.0, 0.0)
            `).run(discId, invoice.company_id, `DISCOUNT_ALLOWED_${invoice.company_id.substring(0, 8)}`);
            discAcc = { id: discId };
          }
          insertJournalItem.run(crypto.randomUUID(), voucherId, discAcc.id, invoice.discount_amount, 0.0);
          updateAccountBalance.run(invoice.discount_amount, discAcc.id);
        }

        // Resolve Round Off Account
        if (invoice.round_off !== 0) {
          let rofAcc = getAccountByCode.get(invoice.company_id, 'ROUND_OFF_%') as { id: string } | undefined;
          if (!rofAcc) {
            const rofId = crypto.randomUUID();
            this.db.prepare(`
              INSERT INTO accounts (id, company_id, name, code, parent_group, opening_balance, current_balance)
              VALUES (?, ?, 'Round Off Account', ?, 'Indirect Expense', 0.0, 0.0)
            `).run(rofId, invoice.company_id, `ROUND_OFF_${invoice.company_id.substring(0, 8)}`);
            rofAcc = { id: rofId };
          }
          if (invoice.round_off > 0) {
            insertJournalItem.run(crypto.randomUUID(), voucherId, rofAcc.id, 0.0, invoice.round_off);
            updateAccountBalance.run(-invoice.round_off, rofAcc.id);
          } else {
            insertJournalItem.run(crypto.randomUUID(), voucherId, rofAcc.id, -invoice.round_off, 0.0);
            updateAccountBalance.run(-invoice.round_off, rofAcc.id);
          }
        }
      }
    });

    invoiceTx();

    const created = this.db.prepare('SELECT * FROM sales_invoices WHERE id = ?').get(invoiceId) as SalesInvoice;
    created.items = this.db.prepare('SELECT * FROM sales_items WHERE sales_invoice_id = ?').all(invoiceId) as SalesItem[];
    return created;
  }

  public deleteInvoice(id: string): void {
    const invoice = this.db.prepare('SELECT * FROM sales_invoices WHERE id = ?').get(id) as SalesInvoice | undefined;
    if (!invoice) return;

    const items = this.db.prepare('SELECT * FROM sales_items WHERE sales_invoice_id = ?').all(id) as SalesItem[];

    // Revert stock helper
    const updateStock = this.db.prepare(`
      UPDATE products SET current_stock = current_stock + ? WHERE id = ?
    `);

    // Revert account balance helper
    const updateAccountBalance = this.db.prepare('UPDATE accounts SET current_balance = current_balance + ? WHERE id = ?');

    const deleteTx = this.db.transaction(() => {
      // 1. Revert product stocks
      for (const item of items) {
        if (item.product_id) {
          updateStock.run(item.quantity, item.product_id);
        }
      }

      // 2. Revert double-entry accounting ledger entries (only if not an Estimate)
      if (invoice.invoice_type !== 'Estimate') {
        // Find associated journal entries
        const journalEntries = this.db.prepare(`
          SELECT id FROM journal_entries WHERE company_id = ? AND reference_id = ?
        `).all(invoice.company_id, id) as Array<{ id: string }>;

        for (const entry of journalEntries) {
          // Revert account balances according to journal items
          const jItems = this.db.prepare('SELECT * FROM journal_items WHERE journal_entry_id = ?').all(entry.id) as Array<{ account_id: string; debit: number; credit: number }>;
          
          for (const ji of jItems) {
            // Revert changes: subtract debit from current_balance, add credit to current_balance
            const change = ji.credit - ji.debit;
            updateAccountBalance.run(change, ji.account_id);
          }

          // Delete journal entry (which cascades to journal_items)
          this.db.prepare('DELETE FROM journal_entries WHERE id = ?').run(entry.id);
        }
      }

      // 3. Delete Sales Invoice (which cascades to sales_items)
      this.db.prepare('DELETE FROM sales_invoices WHERE id = ?').run(id);
    });

    deleteTx();
  }
}
