import { BaseRepository } from './base.repository';
import type { JournalEntry, JournalItem } from '../../shared/ipc-api';
import * as crypto from 'crypto';

export class VoucherRepository extends BaseRepository {
  public getVouchers(companyId: string): JournalEntry[] {
    const vouchers = this.db.prepare('SELECT * FROM journal_entries WHERE company_id = ? ORDER BY entry_date DESC, created_at DESC').all(companyId) as JournalEntry[];
    for (const v of vouchers) {
      v.items = this.db.prepare('SELECT * FROM journal_items WHERE journal_entry_id = ?').all(v.id) as JournalItem[];
    }
    return vouchers;
  }

  public createVoucher(
    voucher: Omit<JournalEntry, 'id'>,
    items: Omit<JournalItem, 'id' | 'journal_entry_id'>[]
  ): JournalEntry {
    const entryId = crypto.randomUUID();

    const insertEntry = this.db.prepare(`
      INSERT INTO journal_entries (id, company_id, entry_date, voucher_type, voucher_number, reference_id, narration)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const insertItem = this.db.prepare(`
      INSERT INTO journal_items (id, journal_entry_id, account_id, debit, credit)
      VALUES (?, ?, ?, ?, ?)
    `);

    const updateAccountBalance = this.db.prepare(`
      UPDATE accounts SET current_balance = current_balance + ? WHERE id = ?
    `);

    const voucherTx = this.db.transaction(() => {
      insertEntry.run(
        entryId,
        voucher.company_id,
        voucher.entry_date,
        voucher.voucher_type,
        voucher.voucher_number,
        voucher.reference_id || null,
        voucher.narration || null
      );

      for (const item of items) {
        const itemId = crypto.randomUUID();
        insertItem.run(
          itemId,
          entryId,
          item.account_id,
          item.debit,
          item.credit
        );

        // Update balances: Asset/Liability double entry rules
        // Debits increase balances of Asset accounts (like Cash, Bank, Customer receivables).
        // Credits increase balances of liability, equity, and income accounts (we represent them as negative in our standard ledger format, so debit - credit is the net change for assets, and credit - debit for liabilities, but keeping a single global system debit (+) and credit (-) simplifies calculations).
        // Let's use the standard rule: account balance increases by debit and decreases by credit.
        const balanceChange = item.debit - item.credit;
        updateAccountBalance.run(balanceChange, item.account_id);
      }
    });

    voucherTx();

    const created = this.db.prepare('SELECT * FROM journal_entries WHERE id = ?').get(entryId) as JournalEntry;
    created.items = this.db.prepare('SELECT * FROM journal_items WHERE journal_entry_id = ?').all(entryId) as JournalItem[];
    return created;
  }
}
