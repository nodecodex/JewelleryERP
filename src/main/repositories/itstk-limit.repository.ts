import { BaseRepository } from './base.repository';
import type { ItemStockLimit, ItemStockLimitDetail } from '../../shared/ipc-api';
import * as crypto from 'crypto';

export class ItStkLimitRepository extends BaseRepository {
  public getItemStockLimits(companyId: string): ItemStockLimit[] {
    const limits = this.db.prepare(`
      SELECT * FROM item_stock_limits 
      WHERE company_id = ? 
      ORDER BY item_code ASC
    `).all(companyId) as ItemStockLimit[];

    const getDetails = this.db.prepare(`
      SELECT * FROM item_stock_limit_details 
      WHERE limit_id = ? 
      ORDER BY sr ASC
    `);

    for (const limit of limits) {
      limit.details = getDetails.all(limit.id) as ItemStockLimitDetail[];
    }

    return limits;
  }

  public saveItemStockLimit(
    companyId: string,
    limit: { id?: string; item_code: string; item_name: string },
    details: Omit<ItemStockLimitDetail, 'id' | 'limit_id'>[]
  ): ItemStockLimit {
    const checkExisting = this.db.prepare(`
      SELECT id FROM item_stock_limits 
      WHERE company_id = ? AND item_code = ?
    `);

    const updateMaster = this.db.prepare(`
      UPDATE item_stock_limits SET 
        item_name = ?, 
        updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `);

    const insertMaster = this.db.prepare(`
      INSERT INTO item_stock_limits (
        id, company_id, item_code, item_name
      ) VALUES (?, ?, ?, ?)
    `);

    const clearDetails = this.db.prepare(`
      DELETE FROM item_stock_limit_details 
      WHERE limit_id = ?
    `);

    const insertDetail = this.db.prepare(`
      INSERT INTO item_stock_limit_details (
        id, limit_id, sr, from_wt, to_wt, pcs, labour_percent, labour_type, labour_rate
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    let limitId = limit.id;

    const tx = this.db.transaction(() => {
      // 1. Resolve limit ID by checking code if not explicitly provided
      if (!limitId) {
        const existing = checkExisting.get(companyId, limit.item_code) as { id: string } | undefined;
        if (existing) {
          limitId = existing.id;
        }
      }

      if (limitId) {
        // Update Master
        updateMaster.run(limit.item_name, limitId);
        // Clear old Details
        clearDetails.run(limitId);
      } else {
        // Insert Master
        limitId = crypto.randomUUID();
        insertMaster.run(limitId, companyId, limit.item_code, limit.item_name);
      }

      // 2. Insert Details
      for (const d of details) {
        const detailId = crypto.randomUUID();
        insertDetail.run(
          detailId,
          limitId,
          d.sr,
          d.from_wt || 0.0,
          d.to_wt || 0.0,
          d.pcs || 0,
          d.labour_percent || 0.0,
          d.labour_type || null,
          d.labour_rate || 0.0
        );
      }
    });

    tx();

    // Fetch and return the full created/updated master with details
    const result = this.db.prepare('SELECT * FROM item_stock_limits WHERE id = ?').get(limitId) as ItemStockLimit;
    result.details = this.db.prepare('SELECT * FROM item_stock_limit_details WHERE limit_id = ? ORDER BY sr ASC').all(limitId) as ItemStockLimitDetail[];
    return result;
  }

  public deleteItemStockLimit(id: string): void {
    const tx = this.db.transaction(() => {
      // Delete details first (cascades via foreign key, but explicit is safer)
      this.db.prepare('DELETE FROM item_stock_limit_details WHERE limit_id = ?').run(id);
      // Delete master
      this.db.prepare('DELETE FROM item_stock_limits WHERE id = ?').run(id);
    });

    tx();
  }
}
