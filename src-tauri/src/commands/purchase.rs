use crate::db::DbState;
use rusqlite::params;
use serde_json::Value;
use tauri::State;
use uuid::Uuid;

#[tauri::command]
pub fn get_purchase_vouchers(company_id: String, db: State<'_, DbState>) -> Result<Vec<Value>, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare(
            "SELECT id, company_id, vch_no, vch_date, vch_time, ref_no, party_id, stl_bill_no,
                    employee, bank_name, vch_desc, net_amount, discount_amount, tax_rate_id,
                    tax_amount, tcs_amount, round_off, total_amount, cheque_amount, card_amount,
                    bank_account_id, cash_amount, kasar_amount, outstanding_amount, created_at
             FROM purchase_vouchers WHERE company_id = ?1 ORDER BY vch_date DESC, created_at DESC",
        )
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map(params![company_id], |row| {
            let v_id: String = row.get(0)?;
            Ok(serde_json::json!({
                "id": v_id,
                "company_id": row.get::<_, String>(1)?,
                "vch_no": row.get::<_, String>(2)?,
                "vch_date": row.get::<_, String>(3)?,
                "vch_time": row.get::<_, Option<String>>(4)?,
                "ref_no": row.get::<_, Option<String>>(5)?,
                "party_id": row.get::<_, Option<String>>(6)?,
                "stl_bill_no": row.get::<_, Option<String>>(7)?,
                "employee": row.get::<_, Option<String>>(8)?,
                "bank_name": row.get::<_, Option<String>>(9)?,
                "vch_desc": row.get::<_, Option<String>>(10)?,
                "net_amount": row.get::<_, f64>(11)?,
                "discount_amount": row.get::<_, f64>(12)?,
                "tax_rate_id": row.get::<_, Option<String>>(13)?,
                "tax_amount": row.get::<_, f64>(14)?,
                "tcs_amount": row.get::<_, f64>(15)?,
                "round_off": row.get::<_, f64>(16)?,
                "total_amount": row.get::<_, f64>(17)?,
                "cheque_amount": row.get::<_, f64>(18)?,
                "card_amount": row.get::<_, f64>(19)?,
                "bank_account_id": row.get::<_, Option<String>>(20)?,
                "cash_amount": row.get::<_, f64>(21)?,
                "kasar_amount": row.get::<_, f64>(22)?,
                "outstanding_amount": row.get::<_, f64>(23)?,
                "items": [],
            }))
        })
        .map_err(|e| e.to_string())?;

    let mut vouchers = Vec::new();
    for r in rows {
        if let Ok(mut v) = r {
            let v_id = v["id"].as_str().unwrap().to_string();
            let mut i_stmt = conn
                .prepare(
                    "SELECT id, sr, it_code, it_name, pcs, gr_wt, oth_wt, net_wt, touch, fine, rate, it_amt
                     FROM purchase_items WHERE voucher_id = ?1 ORDER BY sr ASC",
                )
                .map_err(|e| e.to_string())?;

            let item_rows = i_stmt
                .query_map(params![v_id], |ir| {
                    Ok(serde_json::json!({
                        "id": ir.get::<_, String>(0)?,
                        "sr": ir.get::<_, i64>(1)?,
                        "it_code": ir.get::<_, String>(2)?,
                        "it_name": ir.get::<_, String>(3)?,
                        "pcs": ir.get::<_, i64>(4)?,
                        "gr_wt": ir.get::<_, f64>(5)?,
                        "oth_wt": ir.get::<_, f64>(6)?,
                        "net_wt": ir.get::<_, f64>(7)?,
                        "touch": ir.get::<_, f64>(8)?,
                        "fine": ir.get::<_, f64>(9)?,
                        "rate": ir.get::<_, f64>(10)?,
                        "it_amt": ir.get::<_, f64>(11)?,
                    }))
                })
                .map_err(|e| e.to_string())?;

            let mut items = Vec::new();
            for it in item_rows {
                if let Ok(item_val) = it {
                    items.push(item_val);
                }
            }
            v["items"] = serde_json::json!(items);
            vouchers.push(v);
        }
    }
    Ok(vouchers)
}

#[tauri::command]
pub fn create_purchase_voucher(
    voucher: Value,
    items: Vec<Value>,
    tags: Option<Vec<Value>>,
    _diamonds: Option<Vec<Value>>,
    db: State<'_, DbState>,
) -> Result<Value, String> {
    let mut conn = db.lock().map_err(|e| e.to_string())?;
    let voucher_id = Uuid::new_v4().to_string();
    let company_id = voucher["company_id"].as_str().ok_or("Missing company_id")?;
    let vch_no = voucher["vch_no"].as_str().ok_or("Missing vch_no")?;
    let vch_date = voucher["vch_date"].as_str().ok_or("Missing vch_date")?;

    let tx = conn.transaction().map_err(|e| e.to_string())?;

    tx.execute(
        "INSERT INTO purchase_vouchers (
            id, company_id, vch_no, vch_date, vch_time, ref_no, party_id, stl_bill_no,
            employee, bank_name, vch_desc, net_amount, discount_amount, tax_rate_id,
            tax_amount, tcs_amount, round_off, total_amount, cheque_amount, card_amount,
            bank_account_id, cash_amount, kasar_amount, outstanding_amount
        ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18, ?19, ?20, ?21, ?22, ?23, ?24)",
        params![
            voucher_id,
            company_id,
            vch_no,
            vch_date,
            voucher["vch_time"].as_str(),
            voucher["ref_no"].as_str(),
            voucher["party_id"].as_str(),
            voucher["stl_bill_no"].as_str(),
            voucher["employee"].as_str(),
            voucher["bank_name"].as_str(),
            voucher["vch_desc"].as_str(),
            voucher["net_amount"].as_f64().unwrap_or(0.0),
            voucher["discount_amount"].as_f64().unwrap_or(0.0),
            voucher["tax_rate_id"].as_str(),
            voucher["tax_amount"].as_f64().unwrap_or(0.0),
            voucher["tcs_amount"].as_f64().unwrap_or(0.0),
            voucher["round_off"].as_f64().unwrap_or(0.0),
            voucher["total_amount"].as_f64().unwrap_or(0.0),
            voucher["cheque_amount"].as_f64().unwrap_or(0.0),
            voucher["card_amount"].as_f64().unwrap_or(0.0),
            voucher["bank_account_id"].as_str(),
            voucher["cash_amount"].as_f64().unwrap_or(0.0),
            voucher["kasar_amount"].as_f64().unwrap_or(0.0),
            voucher["outstanding_amount"].as_f64().unwrap_or(0.0),
        ],
    )
    .map_err(|e| e.to_string())?;

    for item in &items {
        let item_id = Uuid::new_v4().to_string();
        tx.execute(
            "INSERT INTO purchase_items (
                id, voucher_id, sr, it_code, it_name, pcs, gr_wt, oth_wt, net_wt, touch,
                wastage_percent, fine, con_rate, con_percent, rate, it_amt, ltype, lrate, lamt
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18, ?19)",
            params![
                item_id,
                voucher_id,
                item["sr"].as_i64().unwrap_or(1),
                item["it_code"].as_str().unwrap_or(""),
                item["it_name"].as_str().unwrap_or(""),
                item["pcs"].as_i64().unwrap_or(0),
                item["gr_wt"].as_f64().unwrap_or(0.0),
                item["oth_wt"].as_f64().unwrap_or(0.0),
                item["net_wt"].as_f64().unwrap_or(0.0),
                item["touch"].as_f64().unwrap_or(0.0),
                item["wastage_percent"].as_f64().unwrap_or(0.0),
                item["fine"].as_f64().unwrap_or(0.0),
                item["con_rate"].as_f64().unwrap_or(0.0),
                item["con_percent"].as_f64().unwrap_or(0.0),
                item["rate"].as_f64().unwrap_or(0.0),
                item["it_amt"].as_f64().unwrap_or(0.0),
                item["ltype"].as_str().unwrap_or("G"),
                item["lrate"].as_f64().unwrap_or(0.0),
                item["lamt"].as_f64().unwrap_or(0.0),
            ],
        )
        .map_err(|e| e.to_string())?;
    }

    if let Some(tag_list) = tags {
        for tag in tag_list {
            let tag_id = Uuid::new_v4().to_string();
            tx.execute(
                "INSERT INTO purchase_tags (
                    id, purchase_item_id, voucher_id, sr, it_code, tag_no, counter, design, size, huld,
                    pcs, gr_wt, ls_wt, net_wt, lbr_percent, ltype, lbr_rate, lbr_amt, oth_amt, pr_cost, mrp, remark
                ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18, ?19, ?20, ?21, ?22)",
                params![
                    tag_id,
                    tag["purchase_item_id"].as_str(),
                    voucher_id,
                    tag["sr"].as_i64().unwrap_or(1),
                    tag["it_code"].as_str().unwrap_or(""),
                    tag["tag_no"].as_str().unwrap_or(""),
                    tag["counter"].as_str(),
                    tag["design"].as_str(),
                    tag["size"].as_str(),
                    tag["huld"].as_str(),
                    tag["pcs"].as_i64().unwrap_or(1),
                    tag["gr_wt"].as_f64().unwrap_or(0.0),
                    tag["ls_wt"].as_f64().unwrap_or(0.0),
                    tag["net_wt"].as_f64().unwrap_or(0.0),
                    tag["lbr_percent"].as_f64().unwrap_or(0.0),
                    tag["ltype"].as_str().unwrap_or("G"),
                    tag["lbr_rate"].as_f64().unwrap_or(0.0),
                    tag["lbr_amt"].as_f64().unwrap_or(0.0),
                    tag["oth_amt"].as_f64().unwrap_or(0.0),
                    tag["pr_cost"].as_f64().unwrap_or(0.0),
                    tag["mrp"].as_f64().unwrap_or(0.0),
                    tag["remark"].as_str(),
                ],
            )
            .ok();
        }
    }

    tx.commit().map_err(|e| e.to_string())?;

    let mut res = voucher;
    res["id"] = serde_json::json!(voucher_id);
    res["items"] = serde_json::json!(items);
    Ok(res)
}

#[tauri::command]
pub fn update_purchase_voucher(
    voucher: Value,
    items: Vec<Value>,
    tags: Option<Vec<Value>>,
    diamonds: Option<Vec<Value>>,
    db: State<'_, DbState>,
) -> Result<Value, String> {
    let voucher_id = voucher["id"].as_str().ok_or("Missing voucher id")?.to_string();
    delete_purchase_voucher(voucher_id, db.clone())?;
    create_purchase_voucher(voucher, items, tags, diamonds, db)
}

#[tauri::command]
pub fn delete_purchase_voucher(id: String, db: State<'_, DbState>) -> Result<bool, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM purchase_vouchers WHERE id = ?1", params![id])
        .map_err(|e| e.to_string())?;
    Ok(true)
}
