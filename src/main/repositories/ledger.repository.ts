import { BaseRepository } from './base.repository';
import type { Account } from '../../shared/ipc-api';
import * as crypto from 'crypto';

export class LedgerRepository extends BaseRepository {
  public getAccounts(companyId: string): Account[] {
    const rows = this.db.prepare('SELECT * FROM accounts WHERE company_id = ? ORDER BY name ASC').all(companyId) as Account[];
    return rows;
  }

  public createAccount(account: Omit<Account, 'id' | 'current_balance'>): Account {
    const id = crypto.randomUUID();
    const insert = this.db.prepare(`
      INSERT INTO accounts (id, company_id, name, code, parent_group, opening_balance, current_balance)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    insert.run(
      id,
      account.company_id,
      account.name,
      account.code,
      account.parent_group,
      account.opening_balance || 0.0,
      account.opening_balance || 0.0 // opening balance is initial current balance
    );

    const created = this.db.prepare('SELECT * FROM accounts WHERE id = ?').get(id) as Account;
    return created;
  }

  public getLedgerReport(
    companyId: string,
    accountId: string,
    startDate?: string,
    endDate?: string
  ): any[] {
    // 1. Fetch account info
    const account = this.db.prepare('SELECT opening_balance, name, parent_group FROM accounts WHERE id = ? AND company_id = ?').get(accountId, companyId) as { opening_balance: number, name: string, parent_group: string } | undefined;
    
    if (!account) {
      return [];
    }

    // 2. Query transactions before startDate to find the Opening Balance for this period
    let openingPeriodBalance = account.opening_balance;
    if (startDate) {
      const priorTx = this.db.prepare(`
        SELECT SUM(ji.debit - ji.credit) as net_change
        FROM journal_items ji
        JOIN journal_entries je ON ji.journal_entry_id = je.id
        WHERE ji.account_id = ? AND je.company_id = ? AND je.entry_date < ?
      `).get(accountId, companyId, startDate) as { net_change: number | null } | undefined;
      
      if (priorTx && priorTx.net_change !== null) {
        openingPeriodBalance += priorTx.net_change;
      }
    }

    // 3. Query transactions within the period
    let query = `
      SELECT je.entry_date, je.voucher_type, je.voucher_number, je.narration, ji.debit, ji.credit
      FROM journal_items ji
      JOIN journal_entries je ON ji.journal_entry_id = je.id
      WHERE ji.account_id = ? AND je.company_id = ?
    `;
    const params: any[] = [accountId, companyId];

    if (startDate) {
      query += ` AND je.entry_date >= ?`;
      params.push(startDate);
    }
    if (endDate) {
      query += ` AND je.entry_date <= ?`;
      params.push(endDate);
    }

    query += ` ORDER BY je.entry_date ASC, je.created_at ASC`;

    const txRows = this.db.prepare(query).all(...params) as any[];

    // 4. Calculate running balances
    let runningBalance = openingPeriodBalance;
    const report: any[] = [];

    // Push initial opening balance row
    report.push({
      entry_date: startDate || 'Opening',
      voucher_type: 'Opening Balance',
      voucher_number: '-',
      narration: 'Opening balance for the period',
      debit: 0.0,
      credit: 0.0,
      balance: runningBalance
    });

    for (const row of txRows) {
      runningBalance += (row.debit - row.credit);
      report.push({
        entry_date: row.entry_date,
        voucher_type: row.voucher_type,
        voucher_number: row.voucher_number,
        narration: row.narration,
        debit: row.debit,
        credit: row.credit,
        balance: runningBalance
      });
    }

    return report;
  }
}
