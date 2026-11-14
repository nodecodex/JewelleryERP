use rusqlite::{params, Connection};
use uuid::Uuid;

fn init_test_db() -> Connection {
    let conn = Connection::open_in_memory().expect("Failed to open in-memory SQLite");
    conn.execute_batch(
        "PRAGMA foreign_keys = ON;
         PRAGMA journal_mode = MEMORY;",
    )
    .expect("PRAGMA setup failed");

    // Load schema
    app_lib::db::schema::run_migrations(&conn).expect("Schema migration failed");
    conn
}

#[test]
fn test_database_initialization_and_company_creation() {
    let mut conn = init_test_db();
    let company_id = Uuid::new_v4().to_string();

    let tx = conn.transaction().expect("Failed to begin transaction");
    tx.execute(
        "INSERT INTO companies (id, name, financial_year_start, financial_year_end, gstin)
         VALUES (?1, 'SwarnPro Test Jewellers', '2026-04-01', '2027-03-31', '24AAACJ1234F1Z5')",
        params![company_id],
    )
    .expect("Failed to insert company");

    // Seed default accounts
    let default_accounts = [
        ("Cash in Hand", "CASH", "Cash"),
        ("Bank Account", "BANK", "Bank"),
        ("Sales Account", "SALES", "Sales"),
        ("Purchase Account", "PURCHASE", "Purchase"),
        ("Capital Account", "CAPITAL", "Capital"),
    ];

    for (name, code, parent) in default_accounts {
        tx.execute(
            "INSERT INTO accounts (id, company_id, name, code, parent_group, opening_balance, current_balance)
             VALUES (?1, ?2, ?3, ?4, ?5, 0.0, 0.0)",
            params![Uuid::new_v4().to_string(), company_id, name, format!("{}_{}", code, &company_id[..8]), parent],
        )
        .expect("Failed to insert account");
    }

    tx.commit().expect("Commit failed");

    // Assert accounts count is 5
    let count: i64 = conn
        .query_row(
            "SELECT count(*) FROM accounts WHERE company_id = ?1",
            params![company_id],
            |r| r.get(0),
        )
        .expect("Query failed");

    assert_eq!(count, 5);
}

#[test]
fn test_sales_invoice_atomic_transaction_with_stock_and_accounting() {
    let mut conn = init_test_db();
    let company_id = Uuid::new_v4().to_string();

    // 1. Create Company
    conn.execute(
        "INSERT INTO companies (id, name, financial_year_start, financial_year_end)
         VALUES (?1, 'Om Jewellers', '2026-04-01', '2027-03-31')",
        params![company_id],
    )
    .unwrap();

    let cash_acc_id = Uuid::new_v4().to_string();
    let sales_acc_id = Uuid::new_v4().to_string();

    conn.execute(
        "INSERT INTO accounts (id, company_id, name, code, parent_group, current_balance)
         VALUES (?1, ?2, 'Cash in Hand', 'CASH_123', 'Cash', 10000.0)",
        params![cash_acc_id, company_id],
    )
    .unwrap();

    conn.execute(
        "INSERT INTO accounts (id, company_id, name, code, parent_group, current_balance)
         VALUES (?1, ?2, 'Sales Account', 'SALES_123', 'Sales', 50000.0)",
        params![sales_acc_id, company_id],
    )
    .unwrap();

    // 2. Create Product with initial stock = 10
    let product_id = Uuid::new_v4().to_string();
    conn.execute(
        "INSERT INTO products (id, company_id, name, sku, category, weight, gross_weight, fine, selling_price, current_stock)
         VALUES (?1, ?2, '22K Gold Bangle', 'SKU-BAN-01', 'Gold Jewellery', 10.5, 10.5, 9.618, 75000.0, 10)",
        params![product_id, company_id],
    )
    .unwrap();

    // 3. Perform Sales Invoice Transaction (Quantity = 2, Net Amount = 150000.0)
    let invoice_id = Uuid::new_v4().to_string();
    let invoice_num = "INV-1001";
    let sold_qty = 2;
    let net_amount = 150000.0;

    let tx = conn.transaction().unwrap();

    // Insert Invoice
    tx.execute(
        "INSERT INTO sales_invoices (id, company_id, invoice_number, invoice_date, gross_amount, net_amount, payment_mode, status)
         VALUES (?1, ?2, ?3, '2026-11-14', ?4, ?4, 'Cash', 'Paid')",
        params![invoice_id, company_id, invoice_num, net_amount],
    )
    .unwrap();

    // Insert Sales Item
    tx.execute(
        "INSERT INTO sales_items (id, sales_invoice_id, product_id, product_name, weight, net_weight, gross_weight, rate, quantity, subtotal)
         VALUES (?1, ?2, ?3, '22K Gold Bangle', 10.5, 10.5, 10.5, 75000.0, ?4, ?5)",
        params![Uuid::new_v4().to_string(), invoice_id, product_id, sold_qty, net_amount],
    )
    .unwrap();

    // Decrement Product Stock
    tx.execute(
        "UPDATE products SET current_stock = current_stock - ?1 WHERE id = ?2",
        params![sold_qty, product_id],
    )
    .unwrap();

    // Journal Entry for double entry
    let journal_id = Uuid::new_v4().to_string();
    tx.execute(
        "INSERT INTO journal_entries (id, company_id, entry_date, voucher_type, voucher_number, reference_id, narration)
         VALUES (?1, ?2, '2026-11-14', 'Sales', 'VCH-INV-1001', ?3, 'Sales Invoice INV-1001')",
        params![journal_id, company_id, invoice_id],
    )
    .unwrap();

    // Debit Cash (+150000)
    tx.execute(
        "INSERT INTO journal_items (id, journal_entry_id, account_id, debit, credit)
         VALUES (?1, ?2, ?3, ?4, 0.0)",
        params![Uuid::new_v4().to_string(), journal_id, cash_acc_id, net_amount],
    )
    .unwrap();
    tx.execute(
        "UPDATE accounts SET current_balance = current_balance + ?1 WHERE id = ?2",
        params![net_amount, cash_acc_id],
    )
    .unwrap();

    // Credit Sales (+150000)
    tx.execute(
        "INSERT INTO journal_items (id, journal_entry_id, account_id, debit, credit)
         VALUES (?1, ?2, ?3, 0.0, ?4)",
        params![Uuid::new_v4().to_string(), journal_id, sales_acc_id, net_amount],
    )
    .unwrap();
    tx.execute(
        "UPDATE accounts SET current_balance = current_balance + ?1 WHERE id = ?2",
        params![net_amount, sales_acc_id],
    )
    .unwrap();

    tx.commit().unwrap();

    // 4. Assertions:
    // A. Stock reduced from 10 to 8
    let updated_stock: i64 = conn
        .query_row(
            "SELECT current_stock FROM products WHERE id = ?1",
            params![product_id],
            |r| r.get(0),
        )
        .unwrap();
    assert_eq!(updated_stock, 8);

    // B. Cash Balance increased from 10000 to 160000
    let updated_cash: f64 = conn
        .query_row(
            "SELECT current_balance FROM accounts WHERE id = ?1",
            params![cash_acc_id],
            |r| r.get(0),
        )
        .unwrap();
    assert_eq!(updated_cash, 160000.0);

    // C. Sales Balance increased from 50000 to 200000
    let updated_sales: f64 = conn
        .query_row(
            "SELECT current_balance FROM accounts WHERE id = ?1",
            params![sales_acc_id],
            |r| r.get(0),
        )
        .unwrap();
    assert_eq!(updated_sales, 200000.0);
}
