use crate::db::DbState;
use rusqlite::params;
use serde_json::Value;
use tauri::State;
use uuid::Uuid;

#[tauri::command]
pub fn get_device_configurations(company_id: String, db: State<'_, DbState>) -> Result<Vec<Value>, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare(
            "SELECT id, company_id, device_type, connection_mode, port_settings_json, prefix, suffix, is_enabled
             FROM device_configuration WHERE company_id = ?1",
        )
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map(params![company_id], |row| {
            Ok(serde_json::json!({
                "id": row.get::<_, String>(0)?,
                "company_id": row.get::<_, String>(1)?,
                "device_type": row.get::<_, String>(2)?,
                "connection_mode": row.get::<_, String>(3)?,
                "port_settings_json": row.get::<_, Option<String>>(4)?,
                "prefix": row.get::<_, Option<String>>(5)?,
                "suffix": row.get::<_, Option<String>>(6)?,
                "is_enabled": row.get::<_, i64>(7)?,
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
pub fn save_device_configuration(config: Value, db: State<'_, DbState>) -> Result<Value, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    let id = config["id"]
        .as_str()
        .map(|s| s.to_string())
        .unwrap_or_else(|| Uuid::new_v4().to_string());
    let company_id = config["company_id"].as_str().ok_or("Missing company_id")?;
    let device_type = config["device_type"].as_str().ok_or("Missing device_type")?;
    let connection_mode = config["connection_mode"].as_str().unwrap_or("HID_Keyboard");
    let port_settings = config["port_settings_json"].as_str().unwrap_or("{}");
    let prefix = config["prefix"].as_str();
    let suffix = config["suffix"].as_str().unwrap_or("Enter");
    let is_enabled = config["is_enabled"].as_i64().unwrap_or(1);

    conn.execute(
        "INSERT INTO device_configuration (
            id, company_id, device_type, connection_mode, port_settings_json, prefix, suffix, is_enabled, updated_at
        ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, CURRENT_TIMESTAMP)
        ON CONFLICT(company_id, device_type) DO UPDATE SET
            connection_mode = excluded.connection_mode,
            port_settings_json = excluded.port_settings_json,
            prefix = excluded.prefix,
            suffix = excluded.suffix,
            is_enabled = excluded.is_enabled,
            updated_at = CURRENT_TIMESTAMP",
        params![id, company_id, device_type, connection_mode, port_settings, prefix, suffix, is_enabled],
    )
    .map_err(|e| e.to_string())?;

    Ok(config)
}

#[tauri::command]
pub fn get_printer_configurations(company_id: String, db: State<'_, DbState>) -> Result<Vec<Value>, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare(
            "SELECT id, company_id, printer_name, printer_type, label_size, template_json, is_default
             FROM printer_configuration WHERE company_id = ?1",
        )
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map(params![company_id], |row| {
            Ok(serde_json::json!({
                "id": row.get::<_, String>(0)?,
                "company_id": row.get::<_, String>(1)?,
                "printer_name": row.get::<_, String>(2)?,
                "printer_type": row.get::<_, String>(3)?,
                "label_size": row.get::<_, String>(4)?,
                "template_json": row.get::<_, Option<String>>(5)?,
                "is_default": row.get::<_, i64>(6)?,
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
pub fn save_printer_configuration(config: Value, db: State<'_, DbState>) -> Result<Value, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    let id = config["id"]
        .as_str()
        .map(|s| s.to_string())
        .unwrap_or_else(|| Uuid::new_v4().to_string());
    let company_id = config["company_id"].as_str().ok_or("Missing company_id")?;
    let printer_name = config["printer_name"].as_str().ok_or("Missing printer_name")?;
    let printer_type = config["printer_type"].as_str().unwrap_or("Thermal");
    let label_size = config["label_size"].as_str().unwrap_or("A4_Sheet");
    let template_json = config["template_json"].as_str().unwrap_or("{}");
    let is_default = config["is_default"].as_i64().unwrap_or(0);

    if is_default == 1 {
        conn.execute(
            "UPDATE printer_configuration SET is_default = 0 WHERE company_id = ?1 AND label_size = ?2",
            params![company_id, label_size],
        )
        .ok();
    }

    conn.execute(
        "INSERT INTO printer_configuration (
            id, company_id, printer_name, printer_type, label_size, template_json, is_default, updated_at
        ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, CURRENT_TIMESTAMP)
        ON CONFLICT(company_id, printer_name) DO UPDATE SET
            printer_type = excluded.printer_type,
            label_size = excluded.label_size,
            template_json = excluded.template_json,
            is_default = excluded.is_default,
            updated_at = CURRENT_TIMESTAMP",
        params![id, company_id, printer_name, printer_type, label_size, template_json, is_default],
    )
    .map_err(|e| e.to_string())?;

    Ok(config)
}

#[tauri::command]
pub fn log_scan(log: Value, db: State<'_, DbState>) -> Result<Value, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    let id = Uuid::new_v4().to_string();

    conn.execute(
        "INSERT INTO scan_history (
            id, company_id, user_id, device_name, screen_name, scanned_value, scan_type, result_status
        ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
        params![
            id,
            log["company_id"].as_str(),
            log["user_id"].as_str(),
            log["device_name"].as_str().unwrap_or("Generic Scanner"),
            log["screen_name"].as_str().unwrap_or("Any"),
            log["scanned_value"].as_str().unwrap_or(""),
            log["scan_type"].as_str().unwrap_or("Barcode"),
            log["result_status"].as_str().unwrap_or("Success"),
        ],
    )
    .map_err(|e| e.to_string())?;

    let mut res = log;
    res["id"] = serde_json::json!(id);
    Ok(res)
}

#[tauri::command]
pub fn get_scan_history(
    company_id: String,
    limit: Option<i64>,
    db: State<'_, DbState>,
) -> Result<Vec<Value>, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    let l = limit.unwrap_or(50);
    let mut stmt = conn
        .prepare("SELECT id, company_id, scan_time, user_id, device_name, screen_name, scanned_value, scan_type, result_status FROM scan_history WHERE company_id = ?1 ORDER BY scan_time DESC LIMIT ?2")
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map(params![company_id, l], |row| {
            Ok(serde_json::json!({
                "id": row.get::<_, String>(0)?,
                "company_id": row.get::<_, String>(1)?,
                "scan_time": row.get::<_, String>(2)?,
                "user_id": row.get::<_, Option<String>>(3)?,
                "device_name": row.get::<_, Option<String>>(4)?,
                "screen_name": row.get::<_, Option<String>>(5)?,
                "scanned_value": row.get::<_, String>(6)?,
                "scan_type": row.get::<_, String>(7)?,
                "result_status": row.get::<_, String>(8)?,
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
pub fn is_barcode_unique(
    company_id: String,
    barcode: String,
    db: State<'_, DbState>,
) -> Result<bool, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    let prod_cnt: i64 = conn
        .query_row(
            "SELECT count(*) FROM products WHERE company_id = ?1 AND barcode = ?2",
            params![company_id, barcode],
            |r| r.get(0),
        )
        .unwrap_or(0);

    if prod_cnt > 0 {
        return Ok(false);
    }

    let tag_cnt: i64 = conn
        .query_row(
            "SELECT count(*) FROM tag_opening_items toi
             JOIN tag_opening_vouchers tov ON toi.voucher_id = tov.id
             WHERE tov.company_id = ?1 AND toi.tag_no = ?2",
            params![company_id, barcode],
            |r| r.get(0),
        )
        .unwrap_or(0);

    if tag_cnt > 0 {
        return Ok(false);
    }

    Ok(true)
}

#[tauri::command]
pub fn is_qr_unique(
    company_id: String,
    qr_code: String,
    db: State<'_, DbState>,
) -> Result<bool, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    let prod_cnt: i64 = conn
        .query_row(
            "SELECT count(*) FROM products WHERE company_id = ?1 AND qr_code = ?2",
            params![company_id, qr_code],
            |r| r.get(0),
        )
        .unwrap_or(0);

    Ok(prod_cnt == 0)
}

#[tauri::command]
pub fn search_scanned_value(
    company_id: String,
    value: String,
    db: State<'_, DbState>,
) -> Result<Option<Value>, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    let trimmed = value.trim();
    if trimmed.is_empty() {
        return Ok(None);
    }

    // 1. Search Products
    let prod_res = conn.query_row(
        "SELECT id, name, sku, barcode, selling_price, current_stock, gross_weight, fine
         FROM products WHERE company_id = ?1 AND (barcode = ?2 OR qr_code = ?2 OR sku = ?2)",
        params![company_id, trimmed],
        |r| {
            Ok(serde_json::json!({
                "type": "Product",
                "id": r.get::<_, String>(0)?,
                "name": r.get::<_, String>(1)?,
                "code": r.get::<_, Option<String>>(3)?.unwrap_or_else(|| r.get::<_, String>(2).unwrap_or_default()),
                "details": {
                    "selling_price": r.get::<_, f64>(4)?,
                    "current_stock": r.get::<_, i64>(5)?,
                    "gross_weight": r.get::<_, f64>(6)?,
                    "fine": r.get::<_, f64>(7)?,
                }
            }))
        },
    );

    if let Ok(p) = prod_res {
        return Ok(Some(p));
    }

    // 2. Search Tag Opening Items
    let tag_res = conn.query_row(
        "SELECT toi.id, toi.tag_no, toi.it_code, toi.design, toi.gr_wt, toi.net_wt, toi.mrp
         FROM tag_opening_items toi
         JOIN tag_opening_vouchers tov ON toi.voucher_id = tov.id
         WHERE tov.company_id = ?1 AND (toi.tag_no = ?2 OR toi.it_code = ?2)",
        params![company_id, trimmed],
        |r| {
            Ok(serde_json::json!({
                "type": "Tag",
                "id": r.get::<_, String>(0)?,
                "code": r.get::<_, String>(1)?,
                "name": r.get::<_, Option<String>>(3)?.unwrap_or_else(|| r.get::<_, String>(2).unwrap_or_default()),
                "details": {
                    "gr_wt": r.get::<_, f64>(4)?,
                    "net_wt": r.get::<_, f64>(5)?,
                    "mrp": r.get::<_, Option<f64>>(6)?.unwrap_or(0.0),
                    "source": "TagOpening"
                }
            }))
        },
    );

    if let Ok(t) = tag_res {
        return Ok(Some(t));
    }

    Ok(None)
}
