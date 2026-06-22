import { BaseRepository } from './base.repository';
import type { DailyRate } from '../../shared/ipc-api';
import * as crypto from 'crypto';

export class RateRepository extends BaseRepository {
  public getDailyRates(companyId: string): DailyRate[] {
    const rows = this.db.prepare('SELECT * FROM daily_rates WHERE company_id = ? ORDER BY rate_date DESC').all(companyId) as DailyRate[];
    return rows;
  }

  public saveDailyRates(rate: Omit<DailyRate, 'id'>): DailyRate {
    const id = crypto.randomUUID();

    // UPSERT: If rates for the date already exist, update them. Otherwise, insert.
    const upsert = this.db.prepare(`
      INSERT INTO daily_rates (id, company_id, rate_date, gold_rate_24k, gold_rate_22k, gold_rate_18k, silver_rate, rates_json, employee)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(company_id, rate_date) DO UPDATE SET
        gold_rate_24k = excluded.gold_rate_24k,
        gold_rate_22k = excluded.gold_rate_22k,
        gold_rate_18k = excluded.gold_rate_18k,
        silver_rate = excluded.silver_rate,
        rates_json = excluded.rates_json,
        employee = excluded.employee
    `);

    upsert.run(
      id,
      rate.company_id,
      rate.rate_date,
      rate.gold_rate_24k,
      rate.gold_rate_22k,
      rate.gold_rate_18k,
      rate.silver_rate,
      (rate as any).rates_json || null,
      (rate as any).employee || null
    );

    const saved = this.db.prepare('SELECT * FROM daily_rates WHERE company_id = ? AND rate_date = ?').get(rate.company_id, rate.rate_date) as DailyRate;
    return saved;
  }
}
