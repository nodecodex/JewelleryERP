use crate::db::DbState;
use crate::models::{SalesInvoice, SalesItem};
use rusqlite::params;
use serde_json::Value;
use tauri::State;
use uuid::Uuid;

#[tauri::command]
pub fn get_invoices(company_id: String, db: State<'_, DbState>) -> Result<Vec<SalesInvoice>, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare(
            "SELECT id, company_id, invoice_number, invoice_date, customer_id, invoice_type,
                    tax_type, gross_amount, discount_amount, tax_amount, making_charges_total,
                    round_off, net_amount, payment_mode, paid_amount, balance_amount, status, created_at
             FROM sales_invoices WHERE company_id = ?1 ORDER BY invoice_date DESC, created_at DESC",
        )
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map(params![company_id], |row| {
            let inv_id: String = row.get(0)?;
            Ok((
                inv_id.clone(),
                SalesInvoice {
                    id: Some(inv_id),
                    company_id: row.get(1)?,
                    invoice_number: row.get(2)?,
                    invoice_date: row.get(3)?,
                    customer_id: row.get(4)?,
                    invoice_type: row.get(5)?,
                    tax_type: row.get(6)?,
                    gross_amount: row.get(7)?,
                    discount_amount: row.get(8)?,
                    tax_amount: row.get(9)?,
                    making_charges_total: row.get(10)?,
                    round_off: row.get(11)?,
                    net_amount: row.get(12)?,
                    payment_mode: row.get(13)?,
                    paid_amount: row.get(14)?,
                    balance_amount: row.get(15)?,
                    status: row.get(16)?,
                    created_at: row.get(17)?,
                    items: Some(Vec::new()),
                },
            ))
        })
        .map_err(|e| e.to_string())?;

    let mut invoices = Vec::new();
    for r in rows {
        if let Ok((inv_id, mut inv)) = r {
            let mut item_stmt = conn
                .prepare(
                    "SELECT id, sales_invoice_id, product_id, product_name, weight, net_weight,
                            gross_weight, purity, making_charges, rate, quantity, tax_rate, tax_amount, subtotal
                     FROM sales_items WHERE sales_invoice_id = ?1",
                )
                .map_err(|e| e.to_string())?;

            let item_rows = item_stmt
                .query_map(params![inv_id], |irow| {
                    Ok(SalesItem {
                        id: Some(irow.get(0)?),
                        sales_invoice_id: Some(irow.get(1)?),
                        product_id: irow.get(2)?,
                        product_name: irow.get(3)?,
                        weight: irow.get(4)?,
                        net_weight: irow.get(5)?,
                        gross_weight: irow.get(6)?,
                        purity: irow.get(7)?,
                        making_charges: irow.get(8)?,
                        rate: irow.get(9)?,
                        quantity: irow.get(10)?,
                        tax_rate: irow.get(11)?,
                        tax_amount: irow.get(12)?,
                        subtotal: irow.get(13)?,
                    })
                })
                .map_err(|e| e.to_string())?;

            let mut items = Vec::new();
            for item in item_rows {
                if let Ok(it) = item {
                    items.push(it);
                }
            }
            inv.items = Some(items);
            invoices.push(inv);
        }
    }
    Ok(invoices)
}

#[tauri::command]
pub fn get_next_invoice_number(
    company_id: String,
    invoice_type: Option<String>,
    db: State<'_, DbState>,
) -> Result<String, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    let itype = invoice_type.unwrap_or_else(|| "Retail".to_string());
    let prefix = if itype == "Estimate" { "EST-" } else { "INV-" };
    let like_pattern = format!("{}%", prefix);

    let mut stmt = conn
        .prepare(
            "SELECT invoice_number FROM sales_invoices
             WHERE company_id = ?1 AND invoice_number LIKE ?2
             ORDER BY invoice_number DESC LIMIT 1",
        )
        .map_err(|e| e.to_string())?;

    let last_num_opt: Option<String> = stmt
        .query_row(params![company_id, like_pattern], |row| row.get(0))
        .ok();

    match last_num_opt {
        Some(last_str) => {
            let num_part = last_str.replace(prefix, "");
            let next_num = num_part.parse::<i64>().unwrap_or(1000) + 1;
            Ok(format!("{}{}", prefix, next_num))
        }
        None => Ok(format!("{}1001", prefix)),
    }
}

#[tauri::command]
pub fn create_invoice(
    invoice: SalesInvoice,
    items: Vec<SalesItem>,
    db: State<'_, DbState>,
) -> Result<SalesInvoice, String> {
    let mut conn = db.lock().map_err(|e| e.to_string())?;
    let invoice_id = Uuid::new_v4().to_string();
    let itype = invoice
        .invoice_type
        .clone()
        .unwrap_or_else(|| "Retail".to_string());
    let invoice_num = if invoice.invoice_number.trim().is_empty() {
        let prefix = if itype == "Estimate" { "EST-" } else { "INV-" };
        format!("{}{}", prefix, chrono::Utc::now().timestamp_millis())
    } else {
        invoice.invoice_number.clone()
    };

    let tx = conn.transaction().map_err(|e| e.to_string())?;

    // 1. Insert Sales Invoice
    tx.execute(
        "INSERT INTO sales_invoices (
            id, company_id, invoice_number, invoice_date, customer_id, invoice_type,
            tax_type, gross_amount, discount_amount, tax_amount, making_charges_total,
            round_off, net_amount, payment_mode, paid_amount, balance_amount, status
        ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17)",
        params![
            invoice_id,
            invoice.company_id,
            invoice_num,
            invoice.invoice_date,
            invoice.customer_id,
            itype,
            invoice.tax_type.clone().unwrap_or_else(|| "CGST_SGST".to_string()),
            invoice.gross_amount,
            invoice.discount_amount,
            invoice.tax_amount,
            invoice.making_charges_total,
            invoice.round_off.unwrap_or(0.0),
            invoice.net_amount,
            invoice.payment_mode.clone().unwrap_or_else(|| "Cash".to_string()),
            invoice.paid_amount.unwrap_or(0.0),
            invoice.balance_amount.unwrap_or(0.0),
            invoice.status.clone().unwrap_or_else(|| "Paid".to_string()),
        ],
    )
    .map_err(|e| e.to_string())?;

    // 2. Insert Sales Items and Decrement Product Stock
    for item in &items {
        let item_id = Uuid::new_v4().to_string();
        tx.execute(
            "INSERT INTO sales_items (
                id, sales_invoice_id, product_id, product_name, weight, net_weight, gross_weight,
                purity, making_charges, rate, quantity, tax_rate, tax_amount, subtotal
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14)",
            params![
                item_id,
                invoice_id,
                item.product_id,
                item.product_name,
                item.weight,
                item.net_weight,
                item.gross_weight,
                item.purity,
                item.making_charges,
                item.rate,
                item.quantity,
                item.tax_rate,
                item.tax_amount,
                item.subtotal,
            ],
        )
        .map_err(|e| e.to_string())?;

        // Decrement product current_stock if product_id is set
        if let Some(ref pid) = item.product_id {
            tx.execute(
                "UPDATE products SET current_stock = current_stock - ?1 WHERE id = ?2",
                params![item.quantity, pid],
            )
            .ok();
        }
    }

    // 3. Double-entry Journal Entry
    let journal_id = Uuid::new_v4().to_string();
    tx.execute(
        "INSERT INTO journal_entries (id, company_id, entry_date, voucher_type, voucher_number, reference_id, narration)
         VALUES (?1, ?2, ?3, 'Sales', ?4, ?5, ?6)",
        params![
            journal_id,
            invoice.company_id,
            invoice.invoice_date,
            format!("VCH-{}", invoice_num),
            invoice_id,
            format!("Sales Invoice {}", invoice_num),
        ],
    )
    .map_err(|e| e.to_string())?;

    // Find accounts for posting
    let cash_acc_id: Option<String> = tx
        .query_row(
            "SELECT id FROM accounts WHERE company_id = ?1 AND code LIKE 'CASH_%' LIMIT 1",
            params![invoice.company_id],
            |r| r.get(0),
        )
        .ok();

    let sales_acc_id: Option<String> = tx
        .query_row(
            "SELECT id FROM accounts WHERE company_id = ?1 AND code LIKE 'SALES_%' LIMIT 1",
            params![invoice.company_id],
            |r| r.get(0),
        )
        .ok();

    if let (Some(cash_id), Some(sales_id)) = (cash_acc_id, sales_acc_id) {
        // Debit Cash / Bank (Net Amount)
        tx.execute(
            "INSERT INTO journal_items (id, journal_entry_id, account_id, debit, credit)
             VALUES (?1, ?2, ?3, ?4, 0.0)",
            params![Uuid::new_v4().to_string(), journal_id, cash_id, invoice.net_amount],
        )
        .ok();

        tx.execute(
            "UPDATE accounts SET current_balance = current_balance + ?1 WHERE id = ?2",
            params![invoice.net_amount, cash_id],
        )
        .ok();

        // Credit Sales Account
        tx.execute(
            "INSERT INTO journal_items (id, journal_entry_id, account_id, debit, credit)
             VALUES (?1, ?2, ?3, 0.0, ?4)",
            params![Uuid::new_v4().to_string(), journal_id, sales_id, invoice.net_amount],
        )
        .ok();

        tx.execute(
            "UPDATE accounts SET current_balance = current_balance + ?1 WHERE id = ?2",
            params![invoice.net_amount, sales_id],
        )
        .ok();
    }

    tx.commit().map_err(|e| e.to_string())?;

    let mut created = invoice;
    created.id = Some(invoice_id);
    created.invoice_number = invoice_num;
    created.items = Some(items);

    Ok(created)
}

#[tauri::command]
pub fn delete_invoice(id: String, db: State<'_, DbState>) -> Result<bool, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM sales_invoices WHERE id = ?1", params![id])
        .map_err(|e| e.to_string())?;
    Ok(true)
}

#[tauri::command]
pub fn get_tag_stock_report(company_id: String, db: State<'_, DbState>) -> Result<Vec<Value>, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare(
            "SELECT toi.id, toi.tag_no, toi.it_code, toi.pcs, toi.gr_wt, toi.ls_wt, toi.net_wt,
                    toi.lbr_rate, toi.mrp, tov.it_type, tov.vch_date, 'In Stock' as status
             FROM tag_opening_items toi
             JOIN tag_opening_vouchers tov ON toi.voucher_id = tov.id
             WHERE tov.company_id = ?1
             ORDER BY toi.tag_no ASC",
        )
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map(params![company_id], |row| {
            let val = serde_json::json!({
                "id": row.get::<_, String>(0)?,
                "tag_no": row.get::<_, String>(1)?,
                "it_code": row.get::<_, String>(2)?,
                "pcs": row.get::<_, i64>(3)?,
                "gr_wt": row.get::<_, f64>(4)?,
                "ls_wt": row.get::<_, f64>(5)?,
                "net_wt": row.get::<_, f64>(6)?,
                "lbr_rate": row.get::<_, f64>(7)?,
                "mrp": row.get::<_, f64>(8)?,
                "it_type": row.get::<_, String>(9)?,
                "vch_date": row.get::<_, String>(10)?,
                "status": row.get::<_, String>(11)?,
            });
            Ok(val)
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
pub fn get_tag_accessories(
    _source: String,
    voucher_id: String,
    _tag_id: Option<String>,
    db: State<'_, DbState>,
) -> Result<Vec<Value>, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare(
            "SELECT id, sr, it_code, it_name, pcs, kr_wt, weight, rate, net_amt
             FROM tag_opening_accessories WHERE voucher_id = ?1 ORDER BY sr ASC",
        )
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map(params![voucher_id], |row| {
            Ok(serde_json::json!({
                "id": row.get::<_, String>(0)?,
                "sr": row.get::<_, i64>(1)?,
                "it_code": row.get::<_, String>(2)?,
                "it_name": row.get::<_, Option<String>>(3)?,
                "pcs": row.get::<_, i64>(4)?,
                "kr_wt": row.get::<_, f64>(5)?,
                "weight": row.get::<_, f64>(6)?,
                "rate": row.get::<_, f64>(7)?,
                "net_amt": row.get::<_, f64>(8)?,
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
