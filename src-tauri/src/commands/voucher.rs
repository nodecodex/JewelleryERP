use crate::db::DbState;
use crate::models::{Account, JournalEntry, JournalItem};
use rusqlite::params;
use serde_json::Value;
use tauri::State;
use uuid::Uuid;

#[tauri::command]
pub fn get_accounts(company_id: String, db: State<'_, DbState>) -> Result<Vec<Account>, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare(
            "SELECT id, company_id, name, code, parent_group, opening_balance, current_balance, created_at
             FROM accounts WHERE company_id = ?1 ORDER BY name ASC",
        )
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map(params![company_id], |row| {
            Ok(Account {
                id: row.get(0)?,
                company_id: row.get(1)?,
                name: row.get(2)?,
                code: row.get(3)?,
                parent_group: row.get(4)?,
                opening_balance: row.get(5)?,
                current_balance: row.get(6)?,
                created_at: row.get(7)?,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut list = Vec::new();
    for r in rows {
        if let Ok(a) = r {
            list.push(a);
        }
    }
    Ok(list)
}

#[tauri::command]
pub fn create_account(account: Account, db: State<'_, DbState>) -> Result<Account, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    let id = Uuid::new_v4().to_string();

    conn.execute(
        "INSERT INTO accounts (id, company_id, name, code, parent_group, opening_balance, current_balance)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
        params![
            id,
            account.company_id,
            account.name,
            account.code,
            account.parent_group,
            account.opening_balance,
            account.opening_balance,
        ],
    )
    .map_err(|e| e.to_string())?;

    let mut res = account;
    res.id = id;
    Ok(res)
}

#[tauri::command]
pub fn get_vouchers(company_id: String, db: State<'_, DbState>) -> Result<Vec<JournalEntry>, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare(
            "SELECT id, company_id, entry_date, voucher_type, voucher_number, reference_id, narration
             FROM journal_entries WHERE company_id = ?1 ORDER BY entry_date DESC, created_at DESC",
        )
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map(params![company_id], |row| {
            let j_id: String = row.get(0)?;
            Ok((
                j_id.clone(),
                JournalEntry {
                    id: Some(j_id),
                    company_id: row.get(1)?,
                    entry_date: row.get(2)?,
                    voucher_type: row.get(3)?,
                    voucher_number: row.get(4)?,
                    reference_id: row.get(5)?,
                    narration: row.get(6)?,
                    items: Some(Vec::new()),
                },
            ))
        })
        .map_err(|e| e.to_string())?;

    let mut vouchers = Vec::new();
    for r in rows {
        if let Ok((j_id, mut vch)) = r {
            let mut item_stmt = conn
                .prepare("SELECT id, journal_entry_id, account_id, debit, credit FROM journal_items WHERE journal_entry_id = ?1")
                .map_err(|e| e.to_string())?;

            let item_rows = item_stmt
                .query_map(params![j_id], |irow| {
                    Ok(JournalItem {
                        id: Some(irow.get(0)?),
                        journal_entry_id: Some(irow.get(1)?),
                        account_id: irow.get(2)?,
                        debit: irow.get(3)?,
                        credit: irow.get(4)?,
                    })
                })
                .map_err(|e| e.to_string())?;

            let mut items = Vec::new();
            for item in item_rows {
                if let Ok(it) = item {
                    items.push(it);
                }
            }
            vch.items = Some(items);
            vouchers.push(vch);
        }
    }
    Ok(vouchers)
}

#[tauri::command]
pub fn create_voucher(
    voucher: JournalEntry,
    items: Vec<JournalItem>,
    db: State<'_, DbState>,
) -> Result<JournalEntry, String> {
    let mut conn = db.lock().map_err(|e| e.to_string())?;
    let entry_id = Uuid::new_v4().to_string();

    let tx = conn.transaction().map_err(|e| e.to_string())?;

    tx.execute(
        "INSERT INTO journal_entries (id, company_id, entry_date, voucher_type, voucher_number, reference_id, narration)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
        params![
            entry_id,
            voucher.company_id,
            voucher.entry_date,
            voucher.voucher_type,
            voucher.voucher_number,
            voucher.reference_id,
            voucher.narration,
        ],
    )
    .map_err(|e| e.to_string())?;

    for item in &items {
        let item_id = Uuid::new_v4().to_string();
        tx.execute(
            "INSERT INTO journal_items (id, journal_entry_id, account_id, debit, credit)
             VALUES (?1, ?2, ?3, ?4, ?5)",
            params![item_id, entry_id, item.account_id, item.debit, item.credit],
        )
        .map_err(|e| e.to_string())?;

        let balance_change = item.debit - item.credit;
        tx.execute(
            "UPDATE accounts SET current_balance = current_balance + ?1 WHERE id = ?2",
            params![balance_change, item.account_id],
        )
        .ok();
    }

    tx.commit().map_err(|e| e.to_string())?;

    let mut created = voucher;
    created.id = Some(entry_id);
    created.items = Some(items);
    Ok(created)
}

#[tauri::command]
pub fn get_ledger_report(
    company_id: String,
    account_id: String,
    start_date: Option<String>,
    end_date: Option<String>,
    db: State<'_, DbState>,
) -> Result<Vec<Value>, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;

    let account_info: Option<(f64, String, String)> = conn
        .query_row(
            "SELECT opening_balance, name, parent_group FROM accounts WHERE id = ?1 AND company_id = ?2",
            params![account_id, company_id],
            |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?)),
        )
        .ok();

    let (mut running_balance, acc_name, _parent_group) = match account_info {
        Some(info) => info,
        None => return Ok(Vec::new()),
    };

    if let Some(ref s_date) = start_date {
        let prior_change: Option<f64> = conn
            .query_row(
                "SELECT SUM(ji.debit - ji.credit) FROM journal_items ji
                 JOIN journal_entries je ON ji.journal_entry_id = je.id
                 WHERE ji.account_id = ?1 AND je.company_id = ?2 AND je.entry_date < ?3",
                params![account_id, company_id, s_date],
                |r| r.get(0),
            )
            .ok()
            .flatten();

        if let Some(change) = prior_change {
            running_balance += change;
        }
    }

    let mut report = Vec::new();
    report.push(serde_json::json!({
        "id": "opening",
        "date": start_date.clone().unwrap_or_else(|| "".to_string()),
        "voucher_type": "Opening",
        "voucher_number": "-",
        "particulars": format!("Opening Balance ({})", acc_name),
        "debit": if running_balance > 0.0 { running_balance } else { 0.0 },
        "credit": if running_balance < 0.0 { running_balance.abs() } else { 0.0 },
        "balance": running_balance,
    }));

    let mut query = String::from(
        "SELECT je.id, je.entry_date, je.voucher_type, je.voucher_number, je.narration, ji.debit, ji.credit
         FROM journal_items ji
         JOIN journal_entries je ON ji.journal_entry_id = je.id
         WHERE ji.account_id = ?1 AND je.company_id = ?2",
    );

    let mut params_vec: Vec<rusqlite::types::Value> = vec![
        account_id.clone().into(),
        company_id.clone().into(),
    ];

    if let Some(ref s_date) = start_date {
        query.push_str(" AND je.entry_date >= ?3");
        params_vec.push(s_date.clone().into());
    }

    if let Some(ref e_date) = end_date {
        let idx = params_vec.len() + 1;
        query.push_str(&format!(" AND je.entry_date <= ?{}", idx));
        params_vec.push(e_date.clone().into());
    }

    query.push_str(" ORDER BY je.entry_date ASC, je.created_at ASC");

    let mut stmt = conn.prepare(&query).map_err(|e| e.to_string())?;
    let rusqlite_params = rusqlite::params_from_iter(params_vec);

    let rows = stmt
        .query_map(rusqlite_params, |r| {
            Ok((
                r.get::<_, String>(0)?,
                r.get::<_, String>(1)?,
                r.get::<_, String>(2)?,
                r.get::<_, String>(3)?,
                r.get::<_, Option<String>>(4)?,
                r.get::<_, f64>(5)?,
                r.get::<_, f64>(6)?,
            ))
        })
        .map_err(|e| e.to_string())?;

    for row_res in rows {
        if let Ok((id, date, vch_type, vch_no, narration, debit, credit)) = row_res {
            running_balance += debit - credit;
            report.push(serde_json::json!({
                "id": id,
                "date": date,
                "voucher_type": vch_type,
                "voucher_number": vch_no,
                "particulars": narration.unwrap_or_else(|| "-".to_string()),
                "debit": debit,
                "credit": credit,
                "balance": running_balance,
            }));
        }
    }

    Ok(report)
}
