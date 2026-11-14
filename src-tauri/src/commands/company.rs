use crate::db::DbState;
use crate::models::Company;
use rusqlite::params;
use tauri::State;
use uuid::Uuid;

#[tauri::command]
pub fn get_companies(db: State<'_, DbState>) -> Result<Vec<Company>, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare("SELECT id, name, financial_year_start, financial_year_end, gstin, pan, bank_name, bank_account_no, bank_ifsc, address, phone, email, settings_json, created_at, updated_at FROM companies ORDER BY name ASC")
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map([], |row| {
            Ok(Company {
                id: row.get(0)?,
                name: row.get(1)?,
                financial_year_start: row.get(2)?,
                financial_year_end: row.get(3)?,
                gstin: row.get(4)?,
                pan: row.get(5)?,
                bank_name: row.get(6)?,
                bank_account_no: row.get(7)?,
                bank_ifsc: row.get(8)?,
                address: row.get(9)?,
                phone: row.get(10)?,
                email: row.get(11)?,
                settings_json: row.get(12)?,
                created_at: row.get(13)?,
                updated_at: row.get(14)?,
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
pub fn create_company(company: Company, db: State<'_, DbState>) -> Result<Company, String> {
    let mut conn = db.lock().map_err(|e| e.to_string())?;
    let id = Uuid::new_v4().to_string();
    let settings = company.settings_json.clone().unwrap_or_else(|| "{}".to_string());

    let tx = conn.transaction().map_err(|e| e.to_string())?;

    tx.execute(
        "INSERT INTO companies (
            id, name, financial_year_start, financial_year_end, gstin, pan,
            bank_name, bank_account_no, bank_ifsc, address, phone, email, settings_json
        ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13)",
        params![
            id,
            company.name,
            company.financial_year_start,
            company.financial_year_end,
            company.gstin,
            company.pan,
            company.bank_name,
            company.bank_account_no,
            company.bank_ifsc,
            company.address,
            company.phone,
            company.email,
            settings,
        ],
    )
    .map_err(|e| e.to_string())?;

    // Seed default ledger accounts for this company
    let default_accounts = [
        ("Cash in Hand", "CASH", "Cash"),
        ("Bank Account", "BANK", "Bank"),
        ("Sales Account", "SALES", "Sales"),
        ("Purchase Account", "PURCHASE", "Purchase"),
        ("CGST Input Account", "CGST_IN", "Direct Expense"),
        ("SGST Input Account", "SGST_IN", "Direct Expense"),
        ("IGST Input Account", "IGST_IN", "Direct Expense"),
        ("CGST Output Account", "CGST_OUT", "Indirect Expense"),
        ("SGST Output Account", "SGST_OUT", "Indirect Expense"),
        ("IGST Output Account", "IGST_OUT", "Indirect Expense"),
        ("Capital Account", "CAPITAL", "Capital"),
    ];

    for (acc_name, acc_code, parent) in default_accounts {
        let acc_id = Uuid::new_v4().to_string();
        let short_id = if id.len() >= 8 { &id[..8] } else { &id };
        let full_code = format!("{}_{}", acc_code, short_id);
        tx.execute(
            "INSERT INTO accounts (id, company_id, name, code, parent_group, opening_balance, current_balance)
             VALUES (?1, ?2, ?3, ?4, ?5, 0.0, 0.0)",
            params![acc_id, id, acc_name, full_code, parent],
        )
        .map_err(|e| e.to_string())?;
    }

    tx.commit().map_err(|e| e.to_string())?;

    let mut stmt = conn
        .prepare("SELECT id, name, financial_year_start, financial_year_end, gstin, pan, bank_name, bank_account_no, bank_ifsc, address, phone, email, settings_json, created_at, updated_at FROM companies WHERE id = ?1")
        .map_err(|e| e.to_string())?;

    let created = stmt
        .query_row(params![id], |row| {
            Ok(Company {
                id: row.get(0)?,
                name: row.get(1)?,
                financial_year_start: row.get(2)?,
                financial_year_end: row.get(3)?,
                gstin: row.get(4)?,
                pan: row.get(5)?,
                bank_name: row.get(6)?,
                bank_account_no: row.get(7)?,
                bank_ifsc: row.get(8)?,
                address: row.get(9)?,
                phone: row.get(10)?,
                email: row.get(11)?,
                settings_json: row.get(12)?,
                created_at: row.get(13)?,
                updated_at: row.get(14)?,
            })
        })
        .map_err(|e| e.to_string())?;

    Ok(created)
}

#[tauri::command]
pub fn update_company(company: Company, db: State<'_, DbState>) -> Result<Company, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    let settings = company.settings_json.clone().unwrap_or_else(|| "{}".to_string());

    conn.execute(
        "UPDATE companies SET
            name = ?1, financial_year_start = ?2, financial_year_end = ?3,
            gstin = ?4, pan = ?5, bank_name = ?6, bank_account_no = ?7, bank_ifsc = ?8,
            address = ?9, phone = ?10, email = ?11, settings_json = ?12, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?13",
        params![
            company.name,
            company.financial_year_start,
            company.financial_year_end,
            company.gstin,
            company.pan,
            company.bank_name,
            company.bank_account_no,
            company.bank_ifsc,
            company.address,
            company.phone,
            company.email,
            settings,
            company.id,
        ],
    )
    .map_err(|e| e.to_string())?;

    Ok(company)
}

#[tauri::command]
pub fn delete_company(id: String, db: State<'_, DbState>) -> Result<bool, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM companies WHERE id = ?1", params![id])
        .map_err(|e| e.to_string())?;
    Ok(true)
}
