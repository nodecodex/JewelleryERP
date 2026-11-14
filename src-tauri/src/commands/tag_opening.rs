use crate::db::DbState;
use rusqlite::params;
use serde_json::Value;
use tauri::State;
use uuid::Uuid;

#[tauri::command]
pub fn get_tag_opening_vouchers(company_id: String, db: State<'_, DbState>) -> Result<Vec<Value>, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare(
            "SELECT id, company_id, vch_no, vch_date, it_type, print_file_name,
                    total_pcs, total_gr_wt, total_ls_wt, total_net_wt, total_lbr_amt, total_oth_amt, total_mrp,
                    hu_wt, huld2, huld3, huld4, employee, vch_desc, lable_skip, created_at, updated_at
             FROM tag_opening_vouchers WHERE company_id = ?1 ORDER BY vch_date DESC, vch_no DESC",
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
                "it_type": row.get::<_, String>(4)?,
                "print_file_name": row.get::<_, Option<String>>(5)?,
                "total_pcs": row.get::<_, i64>(6)?,
                "total_gr_wt": row.get::<_, f64>(7)?,
                "total_ls_wt": row.get::<_, f64>(8)?,
                "total_net_wt": row.get::<_, f64>(9)?,
                "total_lbr_amt": row.get::<_, f64>(10)?,
                "total_oth_amt": row.get::<_, f64>(11)?,
                "total_mrp": row.get::<_, f64>(12)?,
                "hu_wt": row.get::<_, Option<f64>>(13)?,
                "huld2": row.get::<_, Option<f64>>(14)?,
                "huld3": row.get::<_, Option<f64>>(15)?,
                "huld4": row.get::<_, Option<f64>>(16)?,
                "employee": row.get::<_, Option<String>>(17)?,
                "vch_desc": row.get::<_, Option<String>>(18)?,
                "lable_skip": row.get::<_, Option<i64>>(19)?,
                "items": [],
                "accessories": [],
            }))
        })
        .map_err(|e| e.to_string())?;

    let mut vouchers = Vec::new();
    for r in rows {
        if let Ok(mut vch) = r {
            let v_id = vch["id"].as_str().unwrap().to_string();
            // Fetch items
            let mut item_stmt = conn
                .prepare(
                    "SELECT id, voucher_id, sr, it_code, tag_no, counter, design, size, huld,
                            pcs, gr_wt, ls_wt, net_wt, lbr_percent, l_type, lbr_rate, lbr_amt, oth_amt, pr_cost, mrp
                     FROM tag_opening_items WHERE voucher_id = ?1 ORDER BY sr ASC",
                )
                .map_err(|e| e.to_string())?;

            let item_rows = item_stmt
                .query_map(params![v_id], |ir| {
                    Ok(serde_json::json!({
                        "id": ir.get::<_, String>(0)?,
                        "voucher_id": ir.get::<_, String>(1)?,
                        "sr": ir.get::<_, i64>(2)?,
                        "it_code": ir.get::<_, String>(3)?,
                        "tag_no": ir.get::<_, String>(4)?,
                        "counter": ir.get::<_, Option<String>>(5)?,
                        "design": ir.get::<_, Option<String>>(6)?,
                        "size": ir.get::<_, Option<String>>(7)?,
                        "huld": ir.get::<_, Option<String>>(8)?,
                        "pcs": ir.get::<_, i64>(9)?,
                        "gr_wt": ir.get::<_, f64>(10)?,
                        "ls_wt": ir.get::<_, f64>(11)?,
                        "net_wt": ir.get::<_, f64>(12)?,
                        "lbr_percent": ir.get::<_, Option<f64>>(13)?,
                        "l_type": ir.get::<_, Option<String>>(14)?,
                        "lbr_rate": ir.get::<_, Option<f64>>(15)?,
                        "lbr_amt": ir.get::<_, Option<f64>>(16)?,
                        "oth_amt": ir.get::<_, Option<f64>>(17)?,
                        "pr_cost": ir.get::<_, Option<f64>>(18)?,
                        "mrp": ir.get::<_, Option<f64>>(19)?,
                    }))
                })
                .map_err(|e| e.to_string())?;

            let mut items_vec = Vec::new();
            for it in item_rows {
                if let Ok(item_val) = it {
                    items_vec.push(item_val);
                }
            }
            vch["items"] = serde_json::json!(items_vec);
            vouchers.push(vch);
        }
    }
    Ok(vouchers)
}

#[tauri::command]
pub fn create_tag_opening_voucher(
    voucher: Value,
    items: Vec<Value>,
    accessories: Vec<Value>,
    db: State<'_, DbState>,
) -> Result<Value, String> {
    let mut conn = db.lock().map_err(|e| e.to_string())?;
    let voucher_id = Uuid::new_v4().to_string();
    let company_id = voucher["company_id"].as_str().ok_or("Missing company_id")?;
    let vch_no = voucher["vch_no"].as_str().ok_or("Missing vch_no")?;
    let vch_date = voucher["vch_date"].as_str().ok_or("Missing vch_date")?;
    let it_type = voucher["it_type"].as_str().unwrap_or("Gold");

    let tx = conn.transaction().map_err(|e| e.to_string())?;

    tx.execute(
        "INSERT INTO tag_opening_vouchers (
            id, company_id, vch_no, vch_date, it_type, print_file_name,
            total_pcs, total_gr_wt, total_ls_wt, total_net_wt, total_lbr_amt, total_oth_amt, total_mrp,
            hu_wt, huld2, huld3, huld4, employee, vch_desc, lable_skip
        ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18, ?19, ?20)",
        params![
            voucher_id,
            company_id,
            vch_no,
            vch_date,
            it_type,
            voucher["print_file_name"].as_str(),
            voucher["total_pcs"].as_i64().unwrap_or(0),
            voucher["total_gr_wt"].as_f64().unwrap_or(0.0),
            voucher["total_ls_wt"].as_f64().unwrap_or(0.0),
            voucher["total_net_wt"].as_f64().unwrap_or(0.0),
            voucher["total_lbr_amt"].as_f64().unwrap_or(0.0),
            voucher["total_oth_amt"].as_f64().unwrap_or(0.0),
            voucher["total_mrp"].as_f64().unwrap_or(0.0),
            voucher["hu_wt"].as_f64().unwrap_or(0.0),
            voucher["huld2"].as_f64().unwrap_or(0.0),
            voucher["huld3"].as_f64().unwrap_or(0.0),
            voucher["huld4"].as_f64().unwrap_or(0.0),
            voucher["employee"].as_str(),
            voucher["vch_desc"].as_str(),
            voucher["lable_skip"].as_i64().unwrap_or(0),
        ],
    )
    .map_err(|e| e.to_string())?;

    let category = match it_type {
        "Gold" => "Gold Jewellery",
        "Silver" => "Silver Jewellery",
        "Diamond" => "Diamond Jewellery",
        "Platinum" => "Platinum Jewellery",
        "Loose Stones" => "Loose Diamonds",
        _ => "Custom Products",
    };

    for item in &items {
        let item_id = Uuid::new_v4().to_string();
        let tag_no = item["tag_no"].as_str().unwrap_or("");
        let it_code = item["it_code"].as_str().unwrap_or("");
        let gr_wt = item["gr_wt"].as_f64().unwrap_or(0.0);
        let ls_wt = item["ls_wt"].as_f64().unwrap_or(0.0);
        let net_wt = item["net_wt"].as_f64().unwrap_or(0.0);
        let pcs = item["pcs"].as_i64().unwrap_or(1);
        let mrp = item["mrp"].as_f64().unwrap_or(0.0);

        tx.execute(
            "INSERT INTO tag_opening_items (
                id, voucher_id, sr, it_code, tag_no, counter, design, size, huld,
                pcs, gr_wt, ls_wt, net_wt, lbr_percent, l_type, lbr_rate, lbr_amt, oth_amt, pr_cost, mrp
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18, ?19, ?20)",
            params![
                item_id,
                voucher_id,
                item["sr"].as_i64().unwrap_or(1),
                it_code,
                tag_no,
                item["counter"].as_str(),
                item["design"].as_str(),
                item["size"].as_str(),
                item["huld"].as_str(),
                pcs,
                gr_wt,
                ls_wt,
                net_wt,
                item["lbr_percent"].as_f64().unwrap_or(0.0),
                item["l_type"].as_str().unwrap_or("G"),
                item["lbr_rate"].as_f64().unwrap_or(0.0),
                item["lbr_amt"].as_f64().unwrap_or(0.0),
                item["oth_amt"].as_f64().unwrap_or(0.0),
                item["pr_cost"].as_f64().unwrap_or(0.0),
                mrp,
            ],
        )
        .map_err(|e| e.to_string())?;

        // Also upsert into products table so this tag can be scanned at billing counter
        let existing_prod: Option<String> = tx
            .query_row(
                "SELECT id FROM products WHERE company_id = ?1 AND barcode = ?2",
                params![company_id, tag_no],
                |r| r.get(0),
            )
            .ok();

        if let Some(pid) = existing_prod {
            tx.execute(
                "UPDATE products SET
                    name = ?1, weight = ?2, gross_weight = ?3, fine = ?4, stone_weight = ?5,
                    selling_price = ?6, current_stock = ?7, updated_at = CURRENT_TIMESTAMP
                 WHERE id = ?8",
                params![it_code, net_wt, gr_wt, net_wt, ls_wt, mrp, pcs, pid],
            )
            .ok();
        } else {
            let pid = Uuid::new_v4().to_string();
            tx.execute(
                "INSERT INTO products (
                    id, company_id, name, sku, barcode, qr_code, category, weight, tounch,
                    gross_weight, purity, stone_weight, making_charges, making_charges_type,
                    hsn_code, gst_rate, purchase_price, selling_price, current_stock, fine
                ) VALUES (?1, ?2, ?3, ?4, ?5, ?5, ?6, ?7, 100.0, ?8, '22K', ?9, 0.0, 'fixed', '7113', 3.0, 0.0, ?10, ?11, ?7)",
                params![pid, company_id, it_code, tag_no, tag_no, category, net_wt, gr_wt, ls_wt, mrp, pcs],
            )
            .ok();
        }
    }

    for acc in &accessories {
        let acc_id = Uuid::new_v4().to_string();
        tx.execute(
            "INSERT INTO tag_opening_accessories (
                id, voucher_id, sr, it_code, it_name, pcs, kr_wt, kr_ls_percent, weight, con_percent, pw, rate, it_amt, pa_amt, net_amt
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15)",
            params![
                acc_id,
                voucher_id,
                acc["sr"].as_i64().unwrap_or(1),
                acc["it_code"].as_str().unwrap_or(""),
                acc["it_name"].as_str(),
                acc["pcs"].as_i64().unwrap_or(0),
                acc["kr_wt"].as_f64().unwrap_or(0.0),
                acc["kr_ls_percent"].as_f64().unwrap_or(0.0),
                acc["weight"].as_f64().unwrap_or(0.0),
                acc["con_percent"].as_f64().unwrap_or(0.0),
                acc["pw"].as_str().unwrap_or("W"),
                acc["rate"].as_f64().unwrap_or(0.0),
                acc["it_amt"].as_f64().unwrap_or(0.0),
                acc["pa_amt"].as_f64().unwrap_or(0.0),
                acc["net_amt"].as_f64().unwrap_or(0.0),
            ],
        )
        .map_err(|e| e.to_string())?;
    }

    tx.commit().map_err(|e| e.to_string())?;

    let mut res = voucher;
    res["id"] = serde_json::json!(voucher_id);
    res["items"] = serde_json::json!(items);
    res["accessories"] = serde_json::json!(accessories);
    Ok(res)
}

#[tauri::command]
pub fn update_tag_opening_voucher(
    voucher: Value,
    items: Vec<Value>,
    accessories: Vec<Value>,
    db: State<'_, DbState>,
) -> Result<Value, String> {
    let voucher_id = voucher["id"].as_str().ok_or("Missing voucher id")?.to_string();
    delete_tag_opening_voucher(voucher_id, db.clone())?;
    create_tag_opening_voucher(voucher, items, accessories, db)
}

#[tauri::command]
pub fn delete_tag_opening_voucher(id: String, db: State<'_, DbState>) -> Result<bool, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM tag_opening_vouchers WHERE id = ?1", params![id])
        .map_err(|e| e.to_string())?;
    Ok(true)
}

// Party Wise Labour
#[tauri::command]
pub fn get_party_wise_labour(
    company_id: String,
    party_id: String,
    db: State<'_, DbState>,
) -> Result<Vec<Value>, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare(
            "SELECT id, company_id, party_id, product_id, touch, wastage_percent, ghat_percent,
                    labour_percent, labour_type, labour_rate, item_rate
             FROM party_wise_labour WHERE company_id = ?1 AND party_id = ?2",
        )
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map(params![company_id, party_id], |row| {
            Ok(serde_json::json!({
                "id": row.get::<_, String>(0)?,
                "company_id": row.get::<_, String>(1)?,
                "party_id": row.get::<_, String>(2)?,
                "product_id": row.get::<_, String>(3)?,
                "touch": row.get::<_, f64>(4)?,
                "wastage_percent": row.get::<_, f64>(5)?,
                "ghat_percent": row.get::<_, f64>(6)?,
                "labour_percent": row.get::<_, f64>(7)?,
                "labour_type": row.get::<_, Option<String>>(8)?,
                "labour_rate": row.get::<_, f64>(9)?,
                "item_rate": row.get::<_, f64>(10)?,
            }))
        })
        .map_err(|e| e.to_string())?;

    let mut list = Vec::new();
    for r in rows {
        if let Ok(v) = r {
            list.push(v);
        }
    }
    Ok(list)
}

#[tauri::command]
pub fn save_party_wise_labour(
    company_id: String,
    party_id: String,
    entries: Vec<Value>,
    db: State<'_, DbState>,
) -> Result<bool, String> {
    let mut conn = db.lock().map_err(|e| e.to_string())?;
    let tx = conn.transaction().map_err(|e| e.to_string())?;

    tx.execute(
        "DELETE FROM party_wise_labour WHERE company_id = ?1 AND party_id = ?2",
        params![company_id, party_id],
    )
    .map_err(|e| e.to_string())?;

    for entry in entries {
        let entry_id = Uuid::new_v4().to_string();
        let prod_id = entry["product_id"].as_str().unwrap_or("");
        tx.execute(
            "INSERT INTO party_wise_labour (
                id, company_id, party_id, product_id, touch, wastage_percent, ghat_percent,
                labour_percent, labour_type, labour_rate, item_rate
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)",
            params![
                entry_id,
                company_id,
                party_id,
                prod_id,
                entry["touch"].as_f64().unwrap_or(0.0),
                entry["wastage_percent"].as_f64().unwrap_or(0.0),
                entry["ghat_percent"].as_f64().unwrap_or(0.0),
                entry["labour_percent"].as_f64().unwrap_or(0.0),
                entry["labour_type"].as_str(),
                entry["labour_rate"].as_f64().unwrap_or(0.0),
                entry["item_rate"].as_f64().unwrap_or(0.0),
            ],
        )
        .ok();
    }

    tx.commit().map_err(|e| e.to_string())?;
    Ok(true)
}

#[tauri::command]
pub fn delete_party_wise_labour(
    company_id: String,
    party_id: String,
    db: State<'_, DbState>,
) -> Result<bool, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "DELETE FROM party_wise_labour WHERE company_id = ?1 AND party_id = ?2",
        params![company_id, party_id],
    )
    .map_err(|e| e.to_string())?;
    Ok(true)
}

// Item Stock Limit
#[tauri::command]
pub fn get_item_stock_limits(company_id: String, db: State<'_, DbState>) -> Result<Vec<Value>, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare("SELECT id, company_id, item_code, item_name FROM item_stock_limits WHERE company_id = ?1")
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map(params![company_id], |row| {
            let l_id: String = row.get(0)?;
            Ok(serde_json::json!({
                "id": l_id,
                "company_id": row.get::<_, String>(1)?,
                "item_code": row.get::<_, String>(2)?,
                "item_name": row.get::<_, String>(3)?,
                "details": [],
            }))
        })
        .map_err(|e| e.to_string())?;

    let mut limits = Vec::new();
    for r in rows {
        if let Ok(mut l) = r {
            let l_id = l["id"].as_str().unwrap().to_string();
            let mut d_stmt = conn
                .prepare(
                    "SELECT id, sr, from_wt, to_wt, pcs, labour_percent, labour_type, labour_rate
                     FROM item_stock_limit_details WHERE limit_id = ?1 ORDER BY sr ASC",
                )
                .map_err(|e| e.to_string())?;

            let d_rows = d_stmt
                .query_map(params![l_id], |dr| {
                    Ok(serde_json::json!({
                        "id": dr.get::<_, String>(0)?,
                        "sr": dr.get::<_, i64>(1)?,
                        "from_wt": dr.get::<_, f64>(2)?,
                        "to_wt": dr.get::<_, f64>(3)?,
                        "pcs": dr.get::<_, i64>(4)?,
                        "labour_percent": dr.get::<_, f64>(5)?,
                        "labour_type": dr.get::<_, Option<String>>(6)?,
                        "labour_rate": dr.get::<_, f64>(7)?,
                    }))
                })
                .map_err(|e| e.to_string())?;

            let mut det_vec = Vec::new();
            for d in d_rows {
                if let Ok(dv) = d {
                    det_vec.push(dv);
                }
            }
            l["details"] = serde_json::json!(det_vec);
            limits.push(l);
        }
    }
    Ok(limits)
}

#[tauri::command]
pub fn save_item_stock_limit(
    company_id: String,
    limit: Value,
    details: Vec<Value>,
    db: State<'_, DbState>,
) -> Result<Value, String> {
    let mut conn = db.lock().map_err(|e| e.to_string())?;
    let limit_id = Uuid::new_v4().to_string();
    let it_code = limit["item_code"].as_str().unwrap_or("");
    let it_name = limit["item_name"].as_str().unwrap_or("");

    let tx = conn.transaction().map_err(|e| e.to_string())?;

    tx.execute(
        "INSERT INTO item_stock_limits (id, company_id, item_code, item_name)
         VALUES (?1, ?2, ?3, ?4)
         ON CONFLICT(company_id, item_code) DO UPDATE SET item_name = excluded.item_name",
        params![limit_id, company_id, it_code, it_name],
    )
    .map_err(|e| e.to_string())?;

    for det in details {
        let det_id = Uuid::new_v4().to_string();
        tx.execute(
            "INSERT INTO item_stock_limit_details (id, limit_id, sr, from_wt, to_wt, pcs, labour_percent, labour_type, labour_rate)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
            params![
                det_id,
                limit_id,
                det["sr"].as_i64().unwrap_or(1),
                det["from_wt"].as_f64().unwrap_or(0.0),
                det["to_wt"].as_f64().unwrap_or(0.0),
                det["pcs"].as_i64().unwrap_or(0),
                det["labour_percent"].as_f64().unwrap_or(0.0),
                det["labour_type"].as_str(),
                det["labour_rate"].as_f64().unwrap_or(0.0),
            ],
        )
        .ok();
    }

    tx.commit().map_err(|e| e.to_string())?;
    Ok(limit)
}

#[tauri::command]
pub fn delete_item_stock_limit(id: String, db: State<'_, DbState>) -> Result<bool, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM item_stock_limits WHERE id = ?1", params![id])
        .map_err(|e| e.to_string())?;
    Ok(true)
}
