use crate::db::DbState;
use crate::models::{Customer, Party, Supplier};
use rusqlite::params;
use tauri::State;
use uuid::Uuid;

#[tauri::command]
pub fn get_parties(company_id: String, db: State<'_, DbState>) -> Result<Vec<Party>, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare(
            "SELECT id, company_id, code, name, group_id, group_name, mobile, phone,
                    contact_person, ac_short, address1, address2, address3, city, pin_code,
                    city_area, gst_no, gst_type, pan_no, state, district, email, ref_by,
                    opening_amount, opening_amount_type, opening_gold, opening_gold_type,
                    opening_silver, opening_silver_type, last_visit, ledger_date, created_at, updated_at
             FROM parties WHERE company_id = ?1 ORDER BY name ASC",
        )
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map(params![company_id], |row| {
            Ok(Party {
                id: row.get(0)?,
                company_id: row.get(1)?,
                code: row.get(2)?,
                name: row.get(3)?,
                group_id: row.get(4)?,
                group_name: row.get(5)?,
                mobile: row.get(6)?,
                phone: row.get(7)?,
                contact_person: row.get(8)?,
                ac_short: row.get(9)?,
                address1: row.get(10)?,
                address2: row.get(11)?,
                address3: row.get(12)?,
                city: row.get(13)?,
                pin_code: row.get(14)?,
                city_area: row.get(15)?,
                gst_no: row.get(16)?,
                gst_type: row.get(17)?,
                pan_no: row.get(18)?,
                state: row.get(19)?,
                district: row.get(20)?,
                email: row.get(21)?,
                ref_by: row.get(22)?,
                opening_amount: row.get(23)?,
                opening_amount_type: row.get(24)?,
                opening_gold: row.get(25)?,
                opening_gold_type: row.get(26)?,
                opening_silver: row.get(27)?,
                opening_silver_type: row.get(28)?,
                last_visit: row.get(29)?,
                ledger_date: row.get(30)?,
                created_at: row.get(31)?,
                updated_at: row.get(32)?,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut list = Vec::new();
    for r in rows {
        if let Ok(p) = r {
            list.push(p);
        }
    }
    Ok(list)
}

#[tauri::command]
pub fn create_party(party: Party, db: State<'_, DbState>) -> Result<Party, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    let id = party.id.clone().unwrap_or_else(|| Uuid::new_v4().to_string());

    conn.execute(
        "INSERT INTO parties (
            id, company_id, code, name, group_id, group_name, mobile, phone,
            contact_person, ac_short, address1, address2, address3, city, pin_code,
            city_area, gst_no, gst_type, pan_no, state, district, email, ref_by,
            opening_amount, opening_amount_type, opening_gold, opening_gold_type,
            opening_silver, opening_silver_type, last_visit, ledger_date
        ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18, ?19, ?20, ?21, ?22, ?23, ?24, ?25, ?26, ?27, ?28, ?29, ?30, ?31)",
        params![
            id,
            party.company_id,
            party.code,
            party.name,
            party.group_id,
            party.group_name,
            party.mobile,
            party.phone,
            party.contact_person,
            party.ac_short,
            party.address1,
            party.address2,
            party.address3,
            party.city,
            party.pin_code,
            party.city_area,
            party.gst_no,
            party.gst_type,
            party.pan_no,
            party.state,
            party.district,
            party.email,
            party.ref_by,
            party.opening_amount.unwrap_or(0.0),
            party.opening_amount_type.clone().unwrap_or_else(|| "Dr".to_string()),
            party.opening_gold.unwrap_or(0.0),
            party.opening_gold_type.clone().unwrap_or_else(|| "Dr".to_string()),
            party.opening_silver.unwrap_or(0.0),
            party.opening_silver_type.clone().unwrap_or_else(|| "Dr".to_string()),
            party.last_visit,
            party.ledger_date,
        ],
    )
    .map_err(|e| e.to_string())?;

    let mut res = party;
    res.id = Some(id);
    Ok(res)
}

#[tauri::command]
pub fn update_party(party: Party, db: State<'_, DbState>) -> Result<Party, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    let id = party.id.clone().ok_or("Party ID is required for update")?;

    conn.execute(
        "UPDATE parties SET
            code = ?1, name = ?2, group_id = ?3, group_name = ?4, mobile = ?5,
            phone = ?6, contact_person = ?7, ac_short = ?8, address1 = ?9, address2 = ?10,
            address3 = ?11, city = ?12, pin_code = ?13, city_area = ?14, gst_no = ?15,
            gst_type = ?16, pan_no = ?17, state = ?18, district = ?19, email = ?20,
            ref_by = ?21, opening_amount = ?22, opening_amount_type = ?23,
            opening_gold = ?24, opening_gold_type = ?25, opening_silver = ?26,
            opening_silver_type = ?27, last_visit = ?28, ledger_date = ?29,
            updated_at = CURRENT_TIMESTAMP
         WHERE id = ?30",
        params![
            party.code,
            party.name,
            party.group_id,
            party.group_name,
            party.mobile,
            party.phone,
            party.contact_person,
            party.ac_short,
            party.address1,
            party.address2,
            party.address3,
            party.city,
            party.pin_code,
            party.city_area,
            party.gst_no,
            party.gst_type,
            party.pan_no,
            party.state,
            party.district,
            party.email,
            party.ref_by,
            party.opening_amount,
            party.opening_amount_type,
            party.opening_gold,
            party.opening_gold_type,
            party.opening_silver,
            party.opening_silver_type,
            party.last_visit,
            party.ledger_date,
            id,
        ],
    )
    .map_err(|e| e.to_string())?;

    Ok(party)
}

#[tauri::command]
pub fn delete_party(id: String, db: State<'_, DbState>) -> Result<bool, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM parties WHERE id = ?1", params![id])
        .map_err(|e| e.to_string())?;
    Ok(true)
}

// Customers & Suppliers Compatibility Wrappers
#[tauri::command]
pub fn get_customers(company_id: String, db: State<'_, DbState>) -> Result<Vec<Customer>, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare(
            "SELECT id, company_id, name, mobile, address1, pan_no, gst_no, email, 0 as loyalty_points, created_at
             FROM parties WHERE company_id = ?1 ORDER BY name ASC",
        )
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map(params![company_id], |row| {
            Ok(Customer {
                id: row.get(0)?,
                company_id: row.get(1)?,
                name: row.get(2)?,
                mobile: row.get(3)?,
                address: row.get(4)?,
                pan: row.get(5)?,
                gstin: row.get(6)?,
                email: row.get(7)?,
                loyalty_points: row.get(8)?,
                created_at: row.get(9)?,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut list = Vec::new();
    for r in rows {
        if let Ok(c) = r {
            list.push(c);
        }
    }
    Ok(list)
}

#[tauri::command]
pub fn get_suppliers(company_id: String, db: State<'_, DbState>) -> Result<Vec<Supplier>, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare(
            "SELECT id, company_id, name, mobile, address1, pan_no, gst_no, email, created_at
             FROM parties WHERE company_id = ?1 ORDER BY name ASC",
        )
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map(params![company_id], |row| {
            Ok(Supplier {
                id: row.get(0)?,
                company_id: row.get(1)?,
                name: row.get(2)?,
                mobile: row.get(3)?,
                address: row.get(4)?,
                pan: row.get(5)?,
                gstin: row.get(6)?,
                email: row.get(7)?,
                created_at: row.get(8)?,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut list = Vec::new();
    for r in rows {
        if let Ok(s) = r {
            list.push(s);
        }
    }
    Ok(list)
}
