import * as crypto from 'crypto';

export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS companies (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    financial_year_start TEXT NOT NULL,
    financial_year_end TEXT NOT NULL,
    gstin TEXT,
    pan TEXT,
    bank_name TEXT,
    bank_account_no TEXT,
    bank_ifsc TEXT,
    address TEXT,
    phone TEXT,
    email TEXT,
    settings_json TEXT DEFAULT '{}',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    company_id TEXT REFERENCES companies(id) ON DELETE CASCADE,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('Admin', 'Manager', 'Accountant', 'Salesman')),
    permissions_json TEXT DEFAULT '{}',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    company_id TEXT REFERENCES companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    sku TEXT NOT NULL,
    barcode TEXT,
    qr_code TEXT,
    category TEXT NOT NULL CHECK(category IN ('Gold Jewellery', 'Silver Jewellery', 'Diamond Jewellery', 'Platinum Jewellery', 'Loose Diamonds', 'Coins', 'Custom Products')),
    weight REAL NOT NULL DEFAULT 0.0,
    net_weight REAL NOT NULL DEFAULT 0.0,
    gross_weight REAL NOT NULL DEFAULT 0.0,
    purity TEXT,
    stone_weight REAL NOT NULL DEFAULT 0.0,
    making_charges REAL NOT NULL DEFAULT 0.0,
    making_charges_type TEXT CHECK(making_charges_type IN ('fixed', 'per_gram')) DEFAULT 'fixed',
    hsn_code TEXT,
    gst_rate REAL NOT NULL DEFAULT 0.0,
    purchase_price REAL NOT NULL DEFAULT 0.0,
    selling_price REAL NOT NULL DEFAULT 0.0,
    current_stock INTEGER NOT NULL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(company_id, barcode),
    UNIQUE(company_id, qr_code)
);

CREATE TABLE IF NOT EXISTS customers (
    id TEXT PRIMARY KEY,
    company_id TEXT REFERENCES companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    mobile TEXT NOT NULL,
    address TEXT,
    pan TEXT,
    gstin TEXT,
    email TEXT,
    loyalty_points INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS suppliers (
    id TEXT PRIMARY KEY,
    company_id TEXT REFERENCES companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    mobile TEXT NOT NULL,
    address TEXT,
    pan TEXT,
    gstin TEXT,
    email TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS accounts (
    id TEXT PRIMARY KEY,
    company_id TEXT REFERENCES companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    code TEXT NOT NULL,
    parent_group TEXT NOT NULL CHECK(parent_group IN ('Cash', 'Bank', 'Capital', 'Sales', 'Purchase', 'Direct Expense', 'Indirect Expense', 'Customer Ledger', 'Supplier Ledger')),
    opening_balance REAL DEFAULT 0.0,
    current_balance REAL DEFAULT 0.0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(company_id, code)
);

CREATE TABLE IF NOT EXISTS sales_invoices (
    id TEXT PRIMARY KEY,
    company_id TEXT REFERENCES companies(id) ON DELETE CASCADE,
    invoice_number TEXT NOT NULL,
    invoice_date TEXT NOT NULL,
    customer_id TEXT REFERENCES parties(id),
    invoice_type TEXT CHECK(invoice_type IN ('Retail', 'Wholesale', 'GST', 'Estimate')) DEFAULT 'Retail',
    tax_type TEXT CHECK(tax_type IN ('CGST_SGST', 'IGST', 'UTGST', 'Exempt')) DEFAULT 'CGST_SGST',
    gross_amount REAL NOT NULL DEFAULT 0.0,
    discount_amount REAL NOT NULL DEFAULT 0.0,
    tax_amount REAL NOT NULL DEFAULT 0.0,
    making_charges_total REAL NOT NULL DEFAULT 0.0,
    round_off REAL DEFAULT 0.0,
    net_amount REAL NOT NULL DEFAULT 0.0,
    payment_mode TEXT CHECK(payment_mode IN ('Cash', 'Bank', 'Card', 'UPI', 'Mixed')) DEFAULT 'Cash',
    paid_amount REAL DEFAULT 0.0,
    balance_amount REAL DEFAULT 0.0,
    status TEXT DEFAULT 'Unpaid',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(company_id, invoice_number)
);

CREATE TABLE IF NOT EXISTS sales_items (
    id TEXT PRIMARY KEY,
    sales_invoice_id TEXT REFERENCES sales_invoices(id) ON DELETE CASCADE,
    product_id TEXT REFERENCES products(id),
    product_name TEXT NOT NULL,
    weight REAL NOT NULL,
    net_weight REAL NOT NULL,
    gross_weight REAL NOT NULL,
    purity TEXT,
    making_charges REAL NOT NULL DEFAULT 0.0,
    rate REAL NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    tax_rate REAL NOT NULL DEFAULT 0.0,
    tax_amount REAL NOT NULL DEFAULT 0.0,
    subtotal REAL NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS journal_entries (
    id TEXT PRIMARY KEY,
    company_id TEXT REFERENCES companies(id) ON DELETE CASCADE,
    entry_date TEXT NOT NULL,
    voucher_type TEXT CHECK(voucher_type IN ('Sales', 'Purchase', 'Payment', 'Receipt', 'Contra', 'Journal')) NOT NULL,
    voucher_number TEXT NOT NULL,
    reference_id TEXT,
    narration TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(company_id, voucher_type, voucher_number)
);

CREATE TABLE IF NOT EXISTS journal_items (
    id TEXT PRIMARY KEY,
    journal_entry_id TEXT REFERENCES journal_entries(id) ON DELETE CASCADE,
    account_id TEXT REFERENCES accounts(id),
    debit REAL NOT NULL DEFAULT 0.0,
    credit REAL NOT NULL DEFAULT 0.0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS daily_rates (
    id TEXT PRIMARY KEY,
    company_id TEXT REFERENCES companies(id) ON DELETE CASCADE,
    rate_date TEXT NOT NULL,
    gold_rate_24k REAL NOT NULL,
    gold_rate_22k REAL NOT NULL,
    gold_rate_18k REAL NOT NULL,
    silver_rate REAL NOT NULL,
    rates_json TEXT,
    employee TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(company_id, rate_date)
);

CREATE TABLE IF NOT EXISTS parties (
    id TEXT PRIMARY KEY,
    company_id TEXT REFERENCES companies(id) ON DELETE CASCADE,
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    group_id TEXT,
    group_name TEXT,
    mobile TEXT,
    phone TEXT,
    contact_person TEXT,
    ac_short TEXT,
    address1 TEXT,
    address2 TEXT,
    address3 TEXT,
    city TEXT,
    pin_code TEXT,
    city_area TEXT,
    gst_no TEXT,
    gst_type TEXT,
    pan_no TEXT,
    state TEXT,
    district TEXT,
    email TEXT,
    ref_by TEXT,
    opening_amount REAL DEFAULT 0.0,
    opening_amount_type TEXT DEFAULT 'Dr',
    opening_gold REAL DEFAULT 0.0,
    opening_gold_type TEXT DEFAULT 'Dr',
    opening_silver REAL DEFAULT 0.0,
    opening_silver_type TEXT DEFAULT 'Dr',
    last_visit TEXT,
    ledger_date TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(company_id, code)
);

CREATE TABLE IF NOT EXISTS taxes (
    id TEXT PRIMARY KEY,
    company_id TEXT REFERENCES companies(id) ON DELETE CASCADE,
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    tax_type TEXT,
    tax_desc TEXT,
    tax_percent REAL NOT NULL DEFAULT 0.0,
    add_tax_percent REAL NOT NULL DEFAULT 0.0,
    ac_code TEXT,
    ac_name TEXT,
    components_json TEXT DEFAULT '[]',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(company_id, code)
);

CREATE TABLE IF NOT EXISTS tag_opening_vouchers (
    id TEXT PRIMARY KEY,
    company_id TEXT REFERENCES companies(id) ON DELETE CASCADE,
    vch_no TEXT NOT NULL,
    vch_date TEXT NOT NULL,
    it_type TEXT CHECK(it_type IN ('Gold', 'Silver', 'Diamond', 'Platinum', 'Loose Stones', 'Others')) DEFAULT 'Gold',
    print_file_name TEXT DEFAULT 'QrPrint10',
    total_pcs INTEGER NOT NULL DEFAULT 0,
    total_gr_wt REAL NOT NULL DEFAULT 0.0,
    total_ls_wt REAL NOT NULL DEFAULT 0.0,
    total_net_wt REAL NOT NULL DEFAULT 0.0,
    total_lbr_amt REAL NOT NULL DEFAULT 0.0,
    total_oth_amt REAL NOT NULL DEFAULT 0.0,
    total_mrp REAL NOT NULL DEFAULT 0.0,
    hu_wt REAL DEFAULT 0.0,
    huld2 REAL DEFAULT 0.0,
    huld3 REAL DEFAULT 0.0,
    huld4 REAL DEFAULT 0.0,
    employee TEXT,
    vch_desc TEXT,
    lable_skip INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(company_id, vch_no)
);

CREATE TABLE IF NOT EXISTS tag_opening_items (
    id TEXT PRIMARY KEY,
    voucher_id TEXT REFERENCES tag_opening_vouchers(id) ON DELETE CASCADE,
    sr INTEGER NOT NULL,
    it_code TEXT NOT NULL,
    tag_no TEXT NOT NULL,
    counter TEXT,
    design TEXT,
    size TEXT,
    huld TEXT,
    pcs INTEGER NOT NULL DEFAULT 1,
    gr_wt REAL NOT NULL DEFAULT 0.0,
    ls_wt REAL NOT NULL DEFAULT 0.0,
    net_wt REAL NOT NULL DEFAULT 0.0,
    lbr_percent REAL DEFAULT 0.0,
    l_type TEXT CHECK(l_type IN ('G', 'F', 'P')) DEFAULT 'G',
    lbr_rate REAL DEFAULT 0.0,
    lbr_amt REAL DEFAULT 0.0,
    oth_amt REAL DEFAULT 0.0,
    pr_cost REAL DEFAULT 0.0,
    mrp REAL DEFAULT 0.0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tag_opening_accessories (
    id TEXT PRIMARY KEY,
    voucher_id TEXT REFERENCES tag_opening_vouchers(id) ON DELETE CASCADE,
    sr INTEGER NOT NULL,
    it_code TEXT NOT NULL,
    it_name TEXT,
    pcs INTEGER DEFAULT 0,
    kr_wt REAL DEFAULT 0.0,
    kr_ls_percent REAL DEFAULT 0.0,
    weight REAL DEFAULT 0.0,
    con_percent REAL DEFAULT 0.0,
    pw TEXT CHECK(pw IN ('P', 'W')) DEFAULT 'W',
    rate REAL DEFAULT 0.0,
    it_amt REAL DEFAULT 0.0,
    pa_amt REAL DEFAULT 0.0,
    net_amt REAL DEFAULT 0.0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS party_wise_labour (
    id TEXT PRIMARY KEY,
    company_id TEXT REFERENCES companies(id) ON DELETE CASCADE,
    party_id TEXT REFERENCES parties(id) ON DELETE CASCADE,
    product_id TEXT REFERENCES products(id) ON DELETE CASCADE,
    touch REAL DEFAULT 0.0,
    wastage_percent REAL DEFAULT 0.0,
    ghat_percent REAL DEFAULT 0.0,
    labour_percent REAL DEFAULT 0.0,
    labour_type TEXT,
    labour_rate REAL DEFAULT 0.0,
    item_rate REAL DEFAULT 0.0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(company_id, party_id, product_id)
);

CREATE TABLE IF NOT EXISTS item_stock_limits (
    id TEXT PRIMARY KEY,
    company_id TEXT REFERENCES companies(id) ON DELETE CASCADE,
    item_code TEXT NOT NULL,
    item_name TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(company_id, item_code)
);

CREATE TABLE IF NOT EXISTS item_stock_limit_details (
    id TEXT PRIMARY KEY,
    limit_id TEXT REFERENCES item_stock_limits(id) ON DELETE CASCADE,
    sr INTEGER NOT NULL,
    from_wt REAL NOT NULL DEFAULT 0.0,
    to_wt REAL NOT NULL DEFAULT 0.0,
    pcs INTEGER NOT NULL DEFAULT 0,
    labour_percent REAL NOT NULL DEFAULT 0.0,
    labour_type TEXT,
    labour_rate REAL NOT NULL DEFAULT 0.0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS purchase_vouchers (
    id TEXT PRIMARY KEY,
    company_id TEXT REFERENCES companies(id) ON DELETE CASCADE,
    vch_no TEXT NOT NULL,
    vch_date TEXT NOT NULL,
    vch_time TEXT,
    ref_no TEXT,
    party_id TEXT REFERENCES parties(id),
    stl_bill_no TEXT,
    employee TEXT,
    bank_name TEXT,
    vch_desc TEXT,
    net_amount REAL DEFAULT 0.0,
    discount_amount REAL DEFAULT 0.0,
    tax_rate_id TEXT,
    tax_amount REAL DEFAULT 0.0,
    tcs_amount REAL DEFAULT 0.0,
    round_off REAL DEFAULT 0.0,
    total_amount REAL DEFAULT 0.0,
    cheque_amount REAL DEFAULT 0.0,
    card_amount REAL DEFAULT 0.0,
    bank_account_id TEXT,
    cash_amount REAL DEFAULT 0.0,
    kasar_amount REAL DEFAULT 0.0,
    outstanding_amount REAL DEFAULT 0.0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(company_id, vch_no)
);

CREATE TABLE IF NOT EXISTS purchase_items (
    id TEXT PRIMARY KEY,
    voucher_id TEXT REFERENCES purchase_vouchers(id) ON DELETE CASCADE,
    sr INTEGER NOT NULL,
    it_code TEXT NOT NULL,
    it_name TEXT NOT NULL,
    pcs INTEGER NOT NULL DEFAULT 0,
    gr_wt REAL DEFAULT 0.0,
    oth_wt REAL DEFAULT 0.0,
    net_wt REAL DEFAULT 0.0,
    touch REAL DEFAULT 0.0,
    wastage_percent REAL DEFAULT 0.0,
    fine REAL DEFAULT 0.0,
    con_rate REAL DEFAULT 0.0,
    con_percent REAL DEFAULT 0.0,
    rate REAL DEFAULT 0.0,
    it_amt REAL DEFAULT 0.0,
    ltype TEXT CHECK(ltype IN ('G', 'F', 'P')) DEFAULT 'G',
    lrate REAL DEFAULT 0.0,
    lamt REAL DEFAULT 0.0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS purchase_tags (
    id TEXT PRIMARY KEY,
    purchase_item_id TEXT REFERENCES purchase_items(id) ON DELETE CASCADE,
    voucher_id TEXT REFERENCES purchase_vouchers(id) ON DELETE CASCADE,
    sr INTEGER NOT NULL,
    it_code TEXT NOT NULL,
    tag_no TEXT NOT NULL,
    counter TEXT,
    design TEXT,
    size TEXT,
    huld TEXT,
    pcs INTEGER NOT NULL DEFAULT 1,
    gr_wt REAL DEFAULT 0.0,
    ls_wt REAL DEFAULT 0.0,
    net_wt REAL DEFAULT 0.0,
    lbr_percent REAL DEFAULT 0.0,
    ltype TEXT CHECK(ltype IN ('G', 'F', 'P')) DEFAULT 'G',
    lbr_rate REAL DEFAULT 0.0,
    lbr_amt REAL DEFAULT 0.0,
    oth_amt REAL DEFAULT 0.0,
    pr_cost REAL DEFAULT 0.0,
    mrp REAL DEFAULT 0.0,
    remark TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS purchase_diamonds (
    id TEXT PRIMARY KEY,
    purchase_tag_id TEXT REFERENCES purchase_tags(id) ON DELETE CASCADE,
    voucher_id TEXT REFERENCES purchase_vouchers(id) ON DELETE CASCADE,
    sr INTEGER NOT NULL,
    it_code TEXT NOT NULL,
    it_name TEXT NOT NULL,
    dm_color TEXT,
    dm_origin TEXT,
    dm_remark TEXT,
    dm_sf_no TEXT,
    pcs INTEGER DEFAULT 0,
    kr_wt REAL DEFAULT 0.0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS license_info (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    license_key TEXT,
    device_id TEXT NOT NULL,
    activation_date TEXT,
    expiry_date TEXT,
    license_type TEXT DEFAULT 'trial',
    activation_token TEXT,
    trial_started_at TEXT,
    trial_expiry_at TEXT,
    last_verified_at TEXT,
    last_active_time TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS barcode_master (
    id TEXT PRIMARY KEY,
    company_id TEXT REFERENCES companies(id) ON DELETE CASCADE,
    barcode_value TEXT NOT NULL,
    entity_type TEXT NOT NULL CHECK(entity_type IN ('Product', 'Tag', 'PurchaseVoucher', 'SalesVoucher', 'Customer', 'Supplier')),
    entity_id TEXT NOT NULL,
    status TEXT NOT NULL CHECK(status IN ('Active', 'Sold', 'Damaged', 'Returned')) DEFAULT 'Active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(company_id, barcode_value)
);

CREATE TABLE IF NOT EXISTS qr_master (
    id TEXT PRIMARY KEY,
    company_id TEXT REFERENCES companies(id) ON DELETE CASCADE,
    qr_value TEXT NOT NULL,
    item_id TEXT,
    tag_no TEXT,
    weight REAL NOT NULL DEFAULT 0.0,
    fine_weight REAL NOT NULL DEFAULT 0.0,
    purity TEXT,
    price REAL NOT NULL DEFAULT 0.0,
    metadata_json TEXT DEFAULT '{}',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(company_id, qr_value)
);

CREATE TABLE IF NOT EXISTS scan_history (
    id TEXT PRIMARY KEY,
    company_id TEXT REFERENCES companies(id) ON DELETE CASCADE,
    scan_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    device_name TEXT,
    screen_name TEXT,
    scanned_value TEXT NOT NULL,
    scan_type TEXT CHECK(scan_type IN ('Barcode', 'QR')) NOT NULL,
    result_status TEXT CHECK(result_status IN ('Success', 'Not_Found', 'Error')) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS device_configuration (
    id TEXT PRIMARY KEY,
    company_id TEXT REFERENCES companies(id) ON DELETE CASCADE,
    device_type TEXT CHECK(device_type IN ('Barcode_Scanner', 'QR_Scanner')) NOT NULL,
    connection_mode TEXT CHECK(connection_mode IN ('HID_Keyboard', 'Virtual_COM', 'Webcam')) NOT NULL DEFAULT 'HID_Keyboard',
    port_settings_json TEXT DEFAULT '{}',
    prefix TEXT,
    suffix TEXT DEFAULT 'Enter',
    is_enabled INTEGER DEFAULT 1,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(company_id, device_type)
);

CREATE TABLE IF NOT EXISTS printer_configuration (
    id TEXT PRIMARY KEY,
    company_id TEXT REFERENCES companies(id) ON DELETE CASCADE,
    printer_name TEXT NOT NULL,
    printer_type TEXT CHECK(printer_type IN ('Thermal', 'Laser_Inkjet', 'Label_Printer')) NOT NULL,
    label_size TEXT CHECK(label_size IN ('Tag_Label', 'Sticker_Label', 'A4_Sheet')) NOT NULL,
    template_json TEXT DEFAULT '{}',
    is_default INTEGER DEFAULT 0,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(company_id, printer_name)
);
`;

export function runMigrations(db: any) {
  // Execute database initialization queries
  db.exec(SCHEMA_SQL);

  // Dynamically check and add license_info table if it does not exist (pre-existing DBs)
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS license_info (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        license_key TEXT,
        device_id TEXT NOT NULL,
        activation_date TEXT,
        expiry_date TEXT,
        license_type TEXT DEFAULT 'trial',
        activation_token TEXT,
        trial_started_at TEXT,
        trial_expiry_at TEXT,
        last_verified_at TEXT,
        last_active_time TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Check and add new columns to license_info if it already existed
    const info = db.prepare("PRAGMA table_info(license_info)").all() as Array<{ name: string; notnull: number }>;
    const cols = info.map(i => i.name);

    const newCols = [
      { name: 'license_type', type: "TEXT DEFAULT 'trial'" },
      { name: 'activation_token', type: 'TEXT' },
      { name: 'trial_started_at', type: 'TEXT' },
      { name: 'trial_expiry_at', type: 'TEXT' },
      { name: 'last_verified_at', type: 'TEXT' },
      { name: 'last_active_time', type: 'TEXT' }
    ];

    for (const c of newCols) {
      if (!cols.includes(c.name)) {
        console.log(`Migration: Adding column '${c.name}' to table 'license_info'...`);
        db.exec(`ALTER TABLE license_info ADD COLUMN ${c.name} ${c.type}`);
      }
    }

    // Recreate table if license_key is NOT NULL (to support trial mode where key is empty) OR if legacy license_payload_signature column exists
    const licenseKeyCol = info.find(i => i.name === 'license_key');
    const hasPayloadSig = cols.includes('license_payload_signature');
    if ((licenseKeyCol && licenseKeyCol.notnull === 1) || hasPayloadSig) {
      console.log("Migration: Recreating license_info to sanitize constraints and fields...");
      db.exec("PRAGMA foreign_keys = OFF");
      db.transaction(() => {
        db.exec("ALTER TABLE license_info RENAME TO _license_info_old");
        db.exec(`
          CREATE TABLE license_info (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            license_key TEXT,
            device_id TEXT NOT NULL,
            activation_date TEXT,
            expiry_date TEXT,
            license_type TEXT DEFAULT 'trial',
            activation_token TEXT,
            trial_started_at TEXT,
            trial_expiry_at TEXT,
            last_verified_at TEXT,
            last_active_time TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `);
        
        // Dynamically copy columns that exist in the old table to avoid errors like "no such column"
        const targetCols = [
          'id', 'license_key', 'device_id', 'activation_date', 'expiry_date',
          'license_type', 'activation_token', 'trial_started_at', 'trial_expiry_at',
          'last_verified_at', 'last_active_time', 'created_at'
        ];
        const commonCols = cols.filter(c => targetCols.includes(c));
        const colsStr = commonCols.join(', ');
        
        db.exec(`
          INSERT INTO license_info (${colsStr})
          SELECT ${colsStr} FROM _license_info_old
        `);
        db.exec("DROP TABLE _license_info_old");
      })();
      db.exec("PRAGMA foreign_keys = ON");
      console.log("Migration: license_info table successfully upgraded.");
    }
  } catch (err: any) {
    console.error('Failed to create or upgrade license_info table during migration:', err?.message || err);
    // Fallback: force-drop any NOT NULL constraint on license_key by recreating with a safe schema
    try {
      db.exec(`
        CREATE TABLE IF NOT EXISTS license_info (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          license_key TEXT,
          device_id TEXT NOT NULL,
          activation_date TEXT,
          expiry_date TEXT,
          license_type TEXT DEFAULT 'trial',
          activation_token TEXT,
          trial_started_at TEXT,
          trial_expiry_at TEXT,
          last_verified_at TEXT,
          last_active_time TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `);
    } catch (e2) { /* table may already exist with correct schema */ }
  }

  // Dynamically check and migrate customer_id foreign key referencing customers to parties
  try {
    const fkList = db.prepare("PRAGMA foreign_key_list(sales_invoices)").all() as Array<{ table: string, from: string, to: string }>;
    const customerFk = fkList.find(fk => fk.from === 'customer_id' && fk.table === 'customers');
    if (customerFk) {
      console.log("Migration: sales_invoices.customer_id is referencing 'customers'. Migrating to reference 'parties'...");
      
      db.exec("PRAGMA foreign_keys = OFF");
      
      db.transaction(() => {
        // Rename table
        db.exec("ALTER TABLE sales_invoices RENAME TO _sales_invoices_old");
        
        // Create new table
        db.exec(`
          CREATE TABLE sales_invoices (
            id TEXT PRIMARY KEY,
            company_id TEXT REFERENCES companies(id) ON DELETE CASCADE,
            invoice_number TEXT NOT NULL,
            invoice_date TEXT NOT NULL,
            customer_id TEXT REFERENCES parties(id),
            invoice_type TEXT CHECK(invoice_type IN ('Retail', 'Wholesale', 'GST', 'Estimate')) DEFAULT 'Retail',
            tax_type TEXT CHECK(tax_type IN ('CGST_SGST', 'IGST', 'UTGST', 'Exempt')) DEFAULT 'CGST_SGST',
            gross_amount REAL NOT NULL DEFAULT 0.0,
            discount_amount REAL NOT NULL DEFAULT 0.0,
            tax_amount REAL NOT NULL DEFAULT 0.0,
            making_charges_total REAL NOT NULL DEFAULT 0.0,
            round_off REAL DEFAULT 0.0,
            net_amount REAL NOT NULL DEFAULT 0.0,
            payment_mode TEXT CHECK(payment_mode IN ('Cash', 'Bank', 'Card', 'UPI', 'Mixed')) DEFAULT 'Cash',
            paid_amount REAL DEFAULT 0.0,
            balance_amount REAL DEFAULT 0.0,
            status TEXT DEFAULT 'Unpaid',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(company_id, invoice_number)
          )
        `);
        
        // Copy data
        db.exec("INSERT INTO sales_invoices SELECT * FROM _sales_invoices_old");
        
        // Drop old table
        db.exec("DROP TABLE _sales_invoices_old");
      })();
      
      db.exec("PRAGMA foreign_keys = ON");
      console.log("Migration: sales_invoices customer_id foreign key constraint successfully migrated to parties(id).");
    }
  } catch (err) {
    console.error('Failed to migrate sales_invoices customer_id foreign key constraint:', err);
  }

  // Dynamically check and add missing columns in companies table to support database upgrades
  try {
    const tableInfo = db.prepare("PRAGMA table_info(companies)").all() as Array<{ name: string }>;
    const columns = tableInfo.map(info => info.name);

    const requiredColumns = [
      { name: 'bank_name', type: 'TEXT' },
      { name: 'bank_account_no', type: 'TEXT' },
      { name: 'bank_ifsc', type: 'TEXT' },
      { name: 'pan', type: 'TEXT' },
      { name: 'gstin', type: 'TEXT' },
      { name: 'address', type: 'TEXT' },
      { name: 'phone', type: 'TEXT' },
      { name: 'email', type: 'TEXT' },
      { name: 'settings_json', type: "TEXT DEFAULT '{}'" }
    ];

    for (const col of requiredColumns) {
      if (!columns.includes(col.name)) {
        console.log(`Migration: Adding column '${col.name}' to table 'companies'...`);
        db.exec(`ALTER TABLE companies ADD COLUMN ${col.name} ${col.type}`);
      }
    }
  } catch (err) {
    console.error('Failed to execute companies table auto-migration:', err);
  }

  // Dynamically check and add permissions_json to users table
  try {
    const tableInfo = db.prepare("PRAGMA table_info(users)").all() as Array<{ name: string }>;
    const columns = tableInfo.map(info => info.name);

    if (!columns.includes('permissions_json')) {
      console.log("Migration: Adding column 'permissions_json' to table 'users'...");
      db.exec("ALTER TABLE users ADD COLUMN permissions_json TEXT DEFAULT '{}'");
    }
  } catch (err) {
    console.error('Failed to execute users table auto-migration:', err);
  }

  // Dynamically check and add rates_json and employee to daily_rates table
  try {
    const tableInfo = db.prepare("PRAGMA table_info(daily_rates)").all() as Array<{ name: string }>;
    const columns = tableInfo.map(info => info.name);

    if (!columns.includes('rates_json')) {
      console.log("Migration: Adding column 'rates_json' to table 'daily_rates'...");
      db.exec("ALTER TABLE daily_rates ADD COLUMN rates_json TEXT");
    }
    if (!columns.includes('employee')) {
      console.log("Migration: Adding column 'employee' to table 'daily_rates'...");
      db.exec("ALTER TABLE daily_rates ADD COLUMN employee TEXT");
    }
  } catch (err) {
    console.error('Failed to execute daily_rates table auto-migration:', err);
  }

  // Seed default taxes if empty
  try {
    const count = db.prepare("SELECT count(*) as cnt FROM taxes").get() as { cnt: number };
    if (count && count.cnt === 0) {
      console.log("Migration: Seeding default taxes...");
      const defaultTaxes = [
        { code: '00', name: 'TAX FREE', tax_percent: 0.0, add_tax_percent: 0.0, ac_code: '', ac_name: '' },
        { code: '01', name: 'VAT 1 %', tax_percent: 1.0, add_tax_percent: 0.0, ac_code: '', ac_name: '' },
        { code: '02', name: 'CST 1 %', tax_percent: 1.0, add_tax_percent: 0.0, ac_code: '', ac_name: '' },
        { code: '10', name: 'GST 3%', tax_percent: 3.0, add_tax_percent: 0.0, ac_code: '00085', ac_name: 'GST TAX' },
        { code: '11', name: 'GST 5%', tax_percent: 5.0, add_tax_percent: 0.0, ac_code: '00085', ac_name: 'GST TAX' },
        { code: '12', name: 'GST 12%', tax_percent: 12.0, add_tax_percent: 0.0, ac_code: '00085', ac_name: 'GST TAX' },
        { code: '13', name: 'GST 18%', tax_percent: 18.0, add_tax_percent: 0.0, ac_code: '00085', ac_name: 'GST TAX' },
        { code: '14', name: 'GST 28%', tax_percent: 28.0, add_tax_percent: 0.0, ac_code: '00085', ac_name: 'GST TAX' },
        { code: '20', name: 'TCS 0.075%', tax_percent: 0.075, add_tax_percent: 0.0, ac_code: '', ac_name: '' },
        { code: '25', name: 'TDS 0.1%', tax_percent: 0.1, add_tax_percent: 0.0, ac_code: '', ac_name: '' }
      ];
      
      const insert = db.prepare(`
        INSERT INTO taxes (id, company_id, code, name, tax_type, tax_desc, tax_percent, add_tax_percent, ac_code, ac_name, components_json)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      const companies = db.prepare("SELECT id FROM companies").all() as Array<{ id: string }>;
      for (const comp of companies) {
        for (const t of defaultTaxes) {
          const id = crypto.randomUUID();
          let components: any[] = [];
          if (t.name.startsWith('GST')) {
            const halfRate = t.tax_percent / 2;
            components = [
              { sr: 1, tax_type: 'SGST', tax_name: `SGST ${halfRate}%`, ac_code: '00085', tax_percent: halfRate },
              { sr: 2, tax_type: 'CGST', tax_name: `CGST ${halfRate}%`, ac_code: '00086', tax_percent: halfRate },
              { sr: 3, tax_type: 'IGST', tax_name: `IGST ${t.tax_percent}%`, ac_code: '00087', tax_percent: t.tax_percent }
            ];
          } else {
            components = [
              { sr: 1, tax_type: t.name, tax_name: t.name, ac_code: t.ac_code, tax_percent: t.tax_percent }
            ];
          }
          
          insert.run(
            id,
            comp.id,
            t.code,
            t.name,
            t.code,
            t.name,
            t.tax_percent,
            t.add_tax_percent,
            t.ac_code,
            t.ac_name,
            JSON.stringify(components)
          );
        }
      }
    }
  } catch (err) {
    console.error('Failed to seed default taxes during migration:', err);
  }
}

