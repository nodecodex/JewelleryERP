use crate::db::DbState;
use crate::models::Tax;
use rusqlite::params;
use tauri::State;
use uuid::Uuid;

#[tauri::command]
pub fn get_taxes(company_id: String, db: State<'_, DbState>) -> Result<Vec<Tax>, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare(
            "SELECT id, company_id, code, name, tax_type, tax_desc, tax_percent, add_tax_percent,
                    ac_code, ac_name, components_json, created_at, updated_at
             FROM taxes WHERE company_id = ?1 ORDER BY code ASC",
        )
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map(params![company_id], |row| {
            Ok(Tax {
                id: row.get(0)?,
                company_id: row.get(1)?,
                code: row.get(2)?,
                name: row.get(3)?,
                tax_type: row.get(4)?,
                tax_desc: row.get(5)?,
                tax_percent: row.get(6)?,
                add_tax_percent: row.get(7)?,
                ac_code: row.get(8)?,
                ac_name: row.get(9)?,
                components_json: row.get(10)?,
                created_at: row.get(11)?,
                updated_at: row.get(12)?,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut list = Vec::new();
    for r in rows {
        if let Ok(t) = r {
            list.push(t);
        }
    }
    Ok(list)
}

#[tauri::command]
pub fn create_tax(tax: Tax, db: State<'_, DbState>) -> Result<Tax, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    let id = tax.id.clone().unwrap_or_else(|| Uuid::new_v4().to_string());
    let comp_json = tax
        .components_json
        .clone()
        .unwrap_or_else(|| "[]".to_string());

    conn.execute(
        "INSERT INTO taxes (
            id, company_id, code, name, tax_type, tax_desc, tax_percent, add_tax_percent,
            ac_code, ac_name, components_json
        ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)",
        params![
            id,
            tax.company_id,
            tax.code,
            tax.name,
            tax.tax_type,
            tax.tax_desc,
            tax.tax_percent,
            tax.add_tax_percent,
            tax.ac_code,
            tax.ac_name,
            comp_json,
        ],
    )
    .map_err(|e| e.to_string())?;

    let mut res = tax;
    res.id = Some(id);
    Ok(res)
}

#[tauri::command]
pub fn update_tax(tax: Tax, db: State<'_, DbState>) -> Result<Tax, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    let id = tax.id.clone().ok_or("Tax ID is required for update")?;
    let comp_json = tax
        .components_json
        .clone()
        .unwrap_or_else(|| "[]".to_string());

    conn.execute(
        "UPDATE taxes SET
            code = ?1, name = ?2, tax_type = ?3, tax_desc = ?4, tax_percent = ?5,
            add_tax_percent = ?6, ac_code = ?7, ac_name = ?8, components_json = ?9,
            updated_at = CURRENT_TIMESTAMP
         WHERE id = ?10",
        params![
            tax.code,
            tax.name,
            tax.tax_type,
            tax.tax_desc,
            tax.tax_percent,
            tax.add_tax_percent,
            tax.ac_code,
            tax.ac_name,
            comp_json,
            id,
        ],
    )
    .map_err(|e| e.to_string())?;

    Ok(tax)
}

#[tauri::command]
pub fn delete_tax(id: String, db: State<'_, DbState>) -> Result<bool, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM taxes WHERE id = ?1", params![id])
        .map_err(|e| e.to_string())?;
    Ok(true)
}
