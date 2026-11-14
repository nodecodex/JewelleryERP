use crate::db::DbState;
use crate::models::DailyRate;
use rusqlite::params;
use tauri::State;
use uuid::Uuid;

#[tauri::command]
pub fn get_daily_rates(company_id: String, db: State<'_, DbState>) -> Result<Vec<DailyRate>, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare(
            "SELECT id, company_id, rate_date, gold_rate_24k, gold_rate_22k, gold_rate_18k, silver_rate, rates_json, employee, created_at
             FROM daily_rates WHERE company_id = ?1 ORDER BY rate_date DESC",
        )
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map(params![company_id], |row| {
            Ok(DailyRate {
                id: row.get(0)?,
                company_id: row.get(1)?,
                rate_date: row.get(2)?,
                gold_rate_24k: row.get(3)?,
                gold_rate_22k: row.get(4)?,
                gold_rate_18k: row.get(5)?,
                silver_rate: row.get(6)?,
                rates_json: row.get(7)?,
                employee: row.get(8)?,
                created_at: row.get(9)?,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut list = Vec::new();
    for r in rows {
        if let Ok(rate) = r {
            list.push(rate);
        }
    }
    Ok(list)
}

#[tauri::command]
pub fn save_daily_rates(rate: DailyRate, db: State<'_, DbState>) -> Result<DailyRate, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    let id = rate.id.clone().unwrap_or_else(|| Uuid::new_v4().to_string());
    let r_json = rate.rates_json.clone().unwrap_or_else(|| "{}".to_string());

    conn.execute(
        "INSERT INTO daily_rates (id, company_id, rate_date, gold_rate_24k, gold_rate_22k, gold_rate_18k, silver_rate, rates_json, employee)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)
         ON CONFLICT(company_id, rate_date) DO UPDATE SET
            gold_rate_24k = excluded.gold_rate_24k,
            gold_rate_22k = excluded.gold_rate_22k,
            gold_rate_18k = excluded.gold_rate_18k,
            silver_rate = excluded.silver_rate,
            rates_json = excluded.rates_json,
            employee = excluded.employee",
        params![
            id,
            rate.company_id,
            rate.rate_date,
            rate.gold_rate_24k,
            rate.gold_rate_22k,
            rate.gold_rate_18k,
            rate.silver_rate,
            r_json,
            rate.employee,
        ],
    )
    .map_err(|e| e.to_string())?;

    let mut res = rate;
    res.id = Some(id);
    Ok(res)
}
