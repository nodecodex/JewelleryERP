import { BaseRepository } from './base.repository';
import type { PartyWiseLabour } from '../../shared/ipc-api';
import * as crypto from 'crypto';

export class LabourRepository extends BaseRepository {
  public getPartyWiseLabour(companyId: string, partyId: string): PartyWiseLabour[] {
    return this.db.prepare(`
      SELECT * FROM party_wise_labour 
      WHERE company_id = ? AND party_id = ?
    `).all(companyId, partyId) as PartyWiseLabour[];
  }

  public savePartyWiseLabour(
    companyId: string,
    partyId: string,
    entries: Omit<PartyWiseLabour, 'id' | 'company_id' | 'party_id'>[]
  ): void {
    const deleteOld = this.db.prepare(`
      DELETE FROM party_wise_labour 
      WHERE company_id = ? AND party_id = ?
    `);

    const insertNew = this.db.prepare(`
      INSERT INTO party_wise_labour (
        id, company_id, party_id, product_id, touch, wastage_percent, 
        ghat_percent, labour_percent, labour_type, labour_rate, item_rate
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const tx = this.db.transaction(() => {
      // 1. Clear previous records
      deleteOld.run(companyId, partyId);

      // 2. Insert new records
      for (const entry of entries) {
        // Save only if it has any non-zero custom values
        const hasCustom = 
          entry.touch > 0 || 
          entry.wastage_percent > 0 || 
          entry.ghat_percent > 0 || 
          entry.labour_percent > 0 || 
          (entry.labour_type && entry.labour_type.trim() !== '') || 
          entry.labour_rate > 0 || 
          entry.item_rate > 0;

        if (hasCustom) {
          const id = crypto.randomUUID();
          insertNew.run(
            id,
            companyId,
            partyId,
            entry.product_id,
            entry.touch || 0.0,
            entry.wastage_percent || 0.0,
            entry.ghat_percent || 0.0,
            entry.labour_percent || 0.0,
            entry.labour_type || null,
            entry.labour_rate || 0.0,
            entry.item_rate || 0.0
          );
        }
      }
    });

    tx();
  }

  public deletePartyWiseLabour(companyId: string, partyId: string): void {
    this.db.prepare(`
      DELETE FROM party_wise_labour 
      WHERE company_id = ? AND party_id = ?
    `).run(companyId, partyId);
  }
}
