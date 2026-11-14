use crate::db::DbState;
use crate::models::Product;
use rusqlite::params;
use tauri::State;
use uuid::Uuid;

#[tauri::command]
pub fn get_products(company_id: String, db: State<'_, DbState>) -> Result<Vec<Product>, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare(
            "SELECT id, company_id, name, sku, barcode, qr_code, category, weight, tounch,
                    gross_weight, fine, purity, stone_weight, making_charges, making_charges_type,
                    hsn_code, gst_rate, purchase_price, selling_price, current_stock, created_at, updated_at
             FROM products WHERE company_id = ?1 ORDER BY name ASC",
        )
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map(params![company_id], |row| {
            Ok(Product {
                id: row.get(0)?,
                company_id: row.get(1)?,
                name: row.get(2)?,
                sku: row.get(3)?,
                barcode: row.get(4)?,
                qr_code: row.get(5)?,
                category: row.get(6)?,
                weight: row.get(7)?,
                tounch: row.get(8)?,
                gross_weight: row.get(9)?,
                fine: row.get(10)?,
                purity: row.get(11)?,
                stone_weight: row.get(12)?,
                making_charges: row.get(13)?,
                making_charges_type: row.get(14)?,
                hsn_code: row.get(15)?,
                gst_rate: row.get(16)?,
                purchase_price: row.get(17)?,
                selling_price: row.get(18)?,
                current_stock: row.get(19)?,
                created_at: row.get(20)?,
                updated_at: row.get(21)?,
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
pub fn get_product_by_barcode(
    company_id: String,
    barcode: String,
    db: State<'_, DbState>,
) -> Result<Option<Product>, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare(
            "SELECT id, company_id, name, sku, barcode, qr_code, category, weight, tounch,
                    gross_weight, fine, purity, stone_weight, making_charges, making_charges_type,
                    hsn_code, gst_rate, purchase_price, selling_price, current_stock, created_at, updated_at
             FROM products WHERE company_id = ?1 AND (barcode = ?2 OR qr_code = ?2)",
        )
        .map_err(|e| e.to_string())?;

    let product = stmt
        .query_row(params![company_id, barcode], |row| {
            Ok(Product {
                id: row.get(0)?,
                company_id: row.get(1)?,
                name: row.get(2)?,
                sku: row.get(3)?,
                barcode: row.get(4)?,
                qr_code: row.get(5)?,
                category: row.get(6)?,
                weight: row.get(7)?,
                tounch: row.get(8)?,
                gross_weight: row.get(9)?,
                fine: row.get(10)?,
                purity: row.get(11)?,
                stone_weight: row.get(12)?,
                making_charges: row.get(13)?,
                making_charges_type: row.get(14)?,
                hsn_code: row.get(15)?,
                gst_rate: row.get(16)?,
                purchase_price: row.get(17)?,
                selling_price: row.get(18)?,
                current_stock: row.get(19)?,
                created_at: row.get(20)?,
                updated_at: row.get(21)?,
            })
        })
        .ok();

    Ok(product)
}

#[tauri::command]
pub fn create_product(product: Product, db: State<'_, DbState>) -> Result<Product, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    let id = Uuid::new_v4().to_string();
    let barcode = product
        .barcode
        .clone()
        .unwrap_or_else(|| format!("BAR-{}", chrono::Utc::now().timestamp_millis()));
    let qr_code = product
        .qr_code
        .clone()
        .unwrap_or_else(|| format!("QR-{}", chrono::Utc::now().timestamp_millis()));
    let making_charges_type = product
        .making_charges_type
        .clone()
        .unwrap_or_else(|| "fixed".to_string());

    conn.execute(
        "INSERT INTO products (
            id, company_id, name, sku, barcode, qr_code, category,
            weight, tounch, gross_weight, purity, stone_weight,
            making_charges, making_charges_type, hsn_code, gst_rate,
            purchase_price, selling_price, current_stock, fine
        ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18, ?19, ?20)",
        params![
            id,
            product.company_id,
            product.name,
            product.sku,
            barcode,
            qr_code,
            product.category,
            product.weight,
            product.tounch,
            product.gross_weight,
            product.purity,
            product.stone_weight,
            product.making_charges,
            making_charges_type,
            product.hsn_code,
            product.gst_rate,
            product.purchase_price,
            product.selling_price,
            product.current_stock,
            product.fine,
        ],
    )
    .map_err(|e| e.to_string())?;

    let mut stmt = conn
        .prepare(
            "SELECT id, company_id, name, sku, barcode, qr_code, category, weight, tounch,
                    gross_weight, fine, purity, stone_weight, making_charges, making_charges_type,
                    hsn_code, gst_rate, purchase_price, selling_price, current_stock, created_at, updated_at
             FROM products WHERE id = ?1",
        )
        .map_err(|e| e.to_string())?;

    let created = stmt
        .query_row(params![id], |row| {
            Ok(Product {
                id: row.get(0)?,
                company_id: row.get(1)?,
                name: row.get(2)?,
                sku: row.get(3)?,
                barcode: row.get(4)?,
                qr_code: row.get(5)?,
                category: row.get(6)?,
                weight: row.get(7)?,
                tounch: row.get(8)?,
                gross_weight: row.get(9)?,
                fine: row.get(10)?,
                purity: row.get(11)?,
                stone_weight: row.get(12)?,
                making_charges: row.get(13)?,
                making_charges_type: row.get(14)?,
                hsn_code: row.get(15)?,
                gst_rate: row.get(16)?,
                purchase_price: row.get(17)?,
                selling_price: row.get(18)?,
                current_stock: row.get(19)?,
                created_at: row.get(20)?,
                updated_at: row.get(21)?,
            })
        })
        .map_err(|e| e.to_string())?;

    Ok(created)
}

#[tauri::command]
pub fn update_product(product: Product, db: State<'_, DbState>) -> Result<Product, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    let making_charges_type = product
        .making_charges_type
        .clone()
        .unwrap_or_else(|| "fixed".to_string());

    conn.execute(
        "UPDATE products SET
            name = ?1, sku = ?2, barcode = ?3, qr_code = ?4, category = ?5,
            weight = ?6, tounch = ?7, gross_weight = ?8, fine = ?9, purity = ?10,
            stone_weight = ?11, making_charges = ?12, making_charges_type = ?13,
            hsn_code = ?14, gst_rate = ?15, purchase_price = ?16, selling_price = ?17,
            current_stock = ?18, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?19",
        params![
            product.name,
            product.sku,
            product.barcode,
            product.qr_code,
            product.category,
            product.weight,
            product.tounch,
            product.gross_weight,
            product.fine,
            product.purity,
            product.stone_weight,
            product.making_charges,
            making_charges_type,
            product.hsn_code,
            product.gst_rate,
            product.purchase_price,
            product.selling_price,
            product.current_stock,
            product.id,
        ],
    )
    .map_err(|e| e.to_string())?;

    Ok(product)
}

#[tauri::command]
pub fn delete_product(id: String, db: State<'_, DbState>) -> Result<bool, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM products WHERE id = ?1", params![id])
        .map_err(|e| e.to_string())?;
    Ok(true)
}
