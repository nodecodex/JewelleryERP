import { BaseRepository } from './base.repository';
import type { Party } from '../../shared/ipc-api';
import * as crypto from 'crypto';

export class PartyRepository extends BaseRepository {
  public getParties(companyId: string): Party[] {
    return this.db.prepare(`
      SELECT * FROM parties WHERE company_id = ? ORDER BY code ASC, name ASC
    `).all(companyId) as Party[];
  }

  public createParty(party: Omit<Party, 'id'>): Party {
    const id = crypto.randomUUID();
    const insert = this.db.prepare(`
      INSERT INTO parties (
        id, company_id, code, name, group_id, group_name, mobile, phone,
        contact_person, ac_short, address1, address2, address3, city,
        pin_code, city_area, gst_no, gst_type, pan_no, state, district,
        email, ref_by, opening_amount, opening_amount_type, opening_gold,
        opening_gold_type, opening_silver, opening_silver_type, last_visit, ledger_date
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?
      )
    `);

    insert.run(
      id,
      party.company_id,
      party.code,
      party.name,
      party.group_id || null,
      party.group_name || null,
      party.mobile || null,
      party.phone || null,
      party.contact_person || null,
      party.ac_short || null,
      party.address1 || null,
      party.address2 || null,
      party.address3 || null,
      party.city || null,
      party.pin_code || null,
      party.city_area || null,
      party.gst_no || null,
      party.gst_type || null,
      party.pan_no || null,
      party.state || null,
      party.district || null,
      party.email || null,
      party.ref_by || null,
      party.opening_amount || 0.0,
      party.opening_amount_type || 'Dr',
      party.opening_gold || 0.0,
      party.opening_gold_type || 'Dr',
      party.opening_silver || 0.0,
      party.opening_silver_type || 'Dr',
      party.last_visit || null,
      party.ledger_date || null
    );

    return this.db.prepare('SELECT * FROM parties WHERE id = ?').get(id) as Party;
  }

  public updateParty(party: Party): void {
    const update = this.db.prepare(`
      UPDATE parties SET
        code = ?,
        name = ?,
        group_id = ?,
        group_name = ?,
        mobile = ?,
        phone = ?,
        contact_person = ?,
        ac_short = ?,
        address1 = ?,
        address2 = ?,
        address3 = ?,
        city = ?,
        pin_code = ?,
        city_area = ?,
        gst_no = ?,
        gst_type = ?,
        pan_no = ?,
        state = ?,
        district = ?,
        email = ?,
        ref_by = ?,
        opening_amount = ?,
        opening_amount_type = ?,
        opening_gold = ?,
        opening_gold_type = ?,
        opening_silver = ?,
        opening_silver_type = ?,
        last_visit = ?,
        ledger_date = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);

    update.run(
      party.code,
      party.name,
      party.group_id || null,
      party.group_name || null,
      party.mobile || null,
      party.phone || null,
      party.contact_person || null,
      party.ac_short || null,
      party.address1 || null,
      party.address2 || null,
      party.address3 || null,
      party.city || null,
      party.pin_code || null,
      party.city_area || null,
      party.gst_no || null,
      party.gst_type || null,
      party.pan_no || null,
      party.state || null,
      party.district || null,
      party.email || null,
      party.ref_by || null,
      party.opening_amount || 0.0,
      party.opening_amount_type || 'Dr',
      party.opening_gold || 0.0,
      party.opening_gold_type || 'Dr',
      party.opening_silver || 0.0,
      party.opening_silver_type || 'Dr',
      party.last_visit || null,
      party.ledger_date || null,
      party.id
    );
  }

  public deleteParty(id: string): void {
    this.db.prepare('DELETE FROM parties WHERE id = ?').run(id);
  }
}
