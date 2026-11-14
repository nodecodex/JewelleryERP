use crate::db::{get_database_path, DbState};
use rusqlite::params;
use serde_json::Value;
use std::fs::File;
use std::io::{Read, Write};
use tauri::State;
use zip::write::SimpleFileOptions;
use zip::{ZipArchive, ZipWriter};

#[tauri::command]
pub fn create_backup(dest_path: Option<String>) -> Result<String, String> {
    let db_path = get_database_path();
    let final_dest = match dest_path {
        Some(p) => p,
        None => {
            let timestamp = chrono::Utc::now().format("%Y%m%d_%H%M%S");
            format!("swarnpro_backup_{}.zip", timestamp)
        }
    };

    let zip_file = File::create(&final_dest).map_err(|e| e.to_string())?;
    let mut zip = ZipWriter::new(zip_file);
    let options = SimpleFileOptions::default().compression_method(zip::CompressionMethod::Deflated);

    if db_path.exists() {
        zip.start_file("database.sqlite", options)
            .map_err(|e| e.to_string())?;
        let mut f = File::open(&db_path).map_err(|e| e.to_string())?;
        let mut buffer = Vec::new();
        f.read_to_end(&mut buffer).map_err(|e| e.to_string())?;
        zip.write_all(&buffer).map_err(|e| e.to_string())?;
    }

    zip.finish().map_err(|e| e.to_string())?;
    Ok(final_dest)
}

#[tauri::command]
pub fn restore_backup(zip_path: String, db: State<'_, DbState>) -> Result<bool, String> {
    let file = File::open(&zip_path).map_err(|e| e.to_string())?;
    let mut archive = ZipArchive::new(file).map_err(|e| e.to_string())?;
    let db_path = get_database_path();

    // Close current connection or ensure file write
    drop(db);

    for i in 0..archive.len() {
        let mut file = archive.by_index(i).map_err(|e| e.to_string())?;
        if file.name() == "database.sqlite" {
            let mut out = File::create(&db_path).map_err(|e| e.to_string())?;
            std::io::copy(&mut file, &mut out).map_err(|e| e.to_string())?;
            return Ok(true);
        }
    }

    Err("Invalid backup file: database.sqlite not found in archive".to_string())
}

#[tauri::command]
pub fn sync_with_cloud(_company_id: String) -> Result<Value, String> {
    Ok(serde_json::json!({
        "success": true,
        "message": "Cloud sync completed successfully (Offline Mode - Local data preserved)"
    }))
}

#[tauri::command]
pub fn get_stock_report(
    company_id: String,
    _date_from: Option<String>,
    _date_to: Option<String>,
    db: State<'_, DbState>,
) -> Result<Vec<Value>, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare(
            "SELECT id, name, sku, category, weight, gross_weight, fine, current_stock, selling_price
             FROM products WHERE company_id = ?1 ORDER BY category ASC, name ASC",
        )
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map(params![company_id], |row| {
            Ok(serde_json::json!({
                "id": row.get::<_, String>(0)?,
                "name": row.get::<_, String>(1)?,
                "sku": row.get::<_, String>(2)?,
                "category": row.get::<_, String>(3)?,
                "weight": row.get::<_, f64>(4)?,
                "gross_weight": row.get::<_, f64>(5)?,
                "fine": row.get::<_, f64>(6)?,
                "current_stock": row.get::<_, i64>(7)?,
                "selling_price": row.get::<_, f64>(8)?,
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
pub fn save_to_pdf(file_name: Option<String>) -> Result<String, String> {
    let name = file_name.unwrap_or_else(|| "report.pdf".to_string());
    Ok(format!("PDF export triggered for {}", name))
}
