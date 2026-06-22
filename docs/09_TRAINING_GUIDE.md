# 09 - Feature Training & Role Onboarding Guide

This guide is designed to train new employees on the Jewellery ERP. It is structured by user role and provides step-by-step guides for each module.

---

## 🎓 Onboarding Paths by User Role

### 1. Showroom Salesman
* **Training Focus**: POS Invoicing, Barcode Scanning, and Cash Desk operations.
* **Onboarding Steps**:
  - Module 5: Sales Entry & Point-of-Sale Checkout
  - Module 8: Barcode & QR Scanner Diagnostics

### 2. Store & Inventory Manager
* **Training Focus**: Inventory Cataloging, Purchase Inwards, and Stock Tracking.
* **Onboarding Steps**:
  - Module 3: Inventory Catalog Setup
  - Module 4: Purchase Entry & Stock Inward
  - Module 7: Day Book & Stock Reports

### 3. Showroom Accountant
* **Training Focus**: Ledger entries, journal vouchers, accounts reconciliation, and tax logs.
* **Onboarding Steps**:
  - Module 5: Old Metal Exchange Credit Calculations
  - Module 6: Ledger Vouchers & Journal Postings
  - Module 7: Financial Statements & GST Reports

### 4. System Administrator
* **Training Focus**: Installations, database upgrades, hardware licensing, backups, and restores.
* **Onboarding Steps**:
  - Module 1: Company Profile Setup
  - Module 2: User Rights & Permissions (RBAC)
  - Module 9: Database Gzip Backups & Cloud Sync
  - Module 10: Troubleshooting & Crash Recovery

---

## 🛠️ Step-by-Step Module Guides

---

### Module 1: Company Profile Setup
* **Purpose**: Configures the business profile, default financial years, tax settings, and banking details.
* **Business Use Case**: Setting up a new branch or creating a new company profile at the start of a financial year.
* **Required Setup**: Obtain the business's GSTIN, PAN, and active bank account details.
* **Step-by-Step Usage**:
  1. Open the **Company Master** screen.
  2. Click **Create Company**.
  3. Enter the company name, address, phone number, and financial year start date.
  4. Enter the GSTIN and bank details.
  5. Click **Save Company**.
* **Example**:
  - Company: *Aditya Gold Palace*
  - Financial Year: *2026-04-01 to 2027-03-31*
  - GSTIN: *27AAAAA0000A1Z5*
* **Output**: A new company profile is created in the database and is selectable in the workspace dropdown.
* **Dependencies**: Secure license key activation.
* **Common Errors**: Incorrect financial year date formats. Enter dates using the format `YYYY-MM-DD`.
* **Tip**: You can configure default invoice prefixes (e.g. `INV26/`) in Company Settings.

---

### Module 2: User Rights & Roles
* **Purpose**: Manages user accounts and sets role-based permissions (RBAC).
* **Business Use Case**: Setting up user accounts for new cashiers or managers, restricting access to sensitive financial records.
* **Required Setup**: Select the company workspace.
* **Step-by-Step Usage**:
  1. Open the **User Rights** screen.
  2. Click **Create New User**.
  3. Enter a username, password, and select a role (Admin, Manager, Accountant, Salesman).
  4. Customize permissions by checking or unchecking specific screen access flags.
  5. Click **Save Permissions**.
* **Example**:
  - Username: *cashier_rohit*
  - Role: *Salesman* (with access restricted to Sales Billing and Scanner Settings).
* **Output**: User credentials and permissions are saved in the `users` table.
* **Dependencies**: Company workspace must be selected.
* **Common Errors**: Reusing existing usernames. Usernames must be unique across the database.
* **Tip**: Admins can reset user passwords by selecting the user profile and clicking **Reset Password**.

---

### Module 3: Inventory Catalog Setup
* **Purpose**: Manages products, categories, SKU numbers, and default weights.
* **Business Use Case**: Registering new items in the inventory database.
* **Required Setup**: Define the product categories and tax rates.
* **Step-by-Step Usage**:
  1. Open the **Inventory Catalog** screen.
  2. Enter the product name, SKU, and select a category (e.g. Gold Jewellery).
  3. Enter the Gross, Stone, and Net weights.
  4. Set the default making charges (Fixed or Per Gram).
  5. Click **Save Product**.
* **Example**:
  - Product: *22K Gold Bangle*
  - SKU: *GB-098*
  - Gross Weight: *12.500g*, Net Weight: *12.500g*
  - Making Charges: *₹450 per gram*
* **Output**: The product is saved to the `products` table and added to stock reports.
* **Dependencies**: Company Master.
* **Common Errors**: Entering the wrong making charge type (e.g. setting as Fixed instead of Per Gram).
* **Tip**: Leave the barcode field blank during initial setup. The barcode will be generated during stock inward operations.

---

### Module 4: Purchase Entry & Stock Inward
* **Purpose**: Saves purchase transactions and registers barcodes.
* **Business Use Case**: Registering new inventory purchases from manufacturers.
* **Required Setup**: Add the supplier's account to the Party Master.
* **Step-by-Step Usage**:
  1. Open the **Purchase Invoicing** screen and click **New**.
  2. Select the supplier name and enter the reference invoice number.
  3. In the summary table, enter the category code, pieces, and rate.
  4. In the detailed tag table, click **Add Tag Row** and scan or enter the tag number.
  5. Enter the weights, purity, and making charges for each tag.
  6. Allocate payments (Cash, Card, Cheque, or Outstanding) and click **Save**.
* **Example**:
  - Supplier: *Mumbai Gold Wholesalers*
  - Item: *Gold Chain 22K*, Qty: *5 Pcs*, Weight: *50.00g*
  - Generated Tags: *GC-001 to GC-005*
* **Output**: Updates the supplier ledger and adds the tags to active inventory.
* **Dependencies**: Party Master, Products Catalog.
* **Common Errors**: Saving the transaction without generating tags for summary rows.
* **Tip**: Press `F1` to toggle the sidebar log and search through past purchase invoices.

---

### Module 5: Sales Entry & Point-of-Sale Checkout
* **Purpose**: Creates sales invoices and processes checkouts.
* **Business Use Case**: Processing customer checkouts at counter POS terminals.
* **Required Setup**: Daily rates must be updated.
* **Step-by-Step Usage**:
  1. Open the **Sales Billing Desk** screen.
  2. Select the customer or use **Walk-in Cash Customer**.
  3. Click the barcode tag input field and scan the barcode.
  4. Enter discount amounts (if applicable).
  5. If the customer is returning old metal for exchange:
     - Go to the **Return Metals** tab.
     - Enter the item code, weight, touch purity, and rate.
  6. Enter the payment details at the bottom of the screen.
  7. Click **Save (F2)**.
* **Example**:
  - Customer: *Aditi Sharma*
  - Scanned Tag: *GC-001* (22K Gold Chain, Weight: 10.00g, Value: ₹58,000).
  - Exchange: *Old gold ring*, Net Weight: *4.00g* (Touch: 80%, Credit Value: ₹16,000).
  - Total Paid: *₹42,000 Cash*.
* **Output**: Saves the sales invoice, updates the customer ledger, marks the tag as sold, and decreases inventory stock levels.
* **Dependencies**: Barcode Master, Daily Rates.
* **Common Errors**: Scanning sold or inactive barcodes. The system will display a warning and block the scan.
* **Tip**: Press `F12` to print a copy of the invoice.

---

### Module 6: Ledger Vouchers & Journal Postings
* **Purpose**: Posts double-entry journal, receipt, payment, and contra vouchers.
* **Business Use Case**: Reconciling supplier payments, cash deposits, and daily expenses.
* **Required Setup**: Configure the Chart of Accounts.
* **Step-by-Step Usage**:
  1. Open the **Ledger Vouchers** screen.
  2. Select the voucher type (e.g. Payment).
  3. Select the debit ledger account (e.g. Supplier Ledger) and enter the debit amount.
  4. Select the credit ledger account (e.g. Cash Account) and enter the credit amount.
  5. Verify that the dynamic difference indicator displays **Balanced**.
  6. Enter a narration and click **Post Ledger Voucher**.
* **Example**:
  - Payment: *Debit Supplier A/c ₹50,000 \| Credit Bank A/c ₹50,000*
* **Output**: Updates the respective ledger balances.
* **Dependencies**: Chart of Accounts.
* **Common Errors**: The save button is disabled if total debits do not equal total credits.
* **Tip**: Use the Contra voucher type when depositing cash into bank accounts or withdrawing cash from bank accounts.

---

### Module 7: Day Book & Stock Reports
* **Purpose**: Displays chronological transaction lists and stock levels.
* **Business Use Case**: Reconciling accounts and stock at the end of the day.
* **Required Setup**: Select the date range filters.
* **Step-by-Step Usage**:
  - For Day Books:
    1. Select **Day Book** from the sidebar.
    2. Set the date range and click search.
    3. Review the transaction list and ledger postings.
  - For Stock Reports:
    1. Select **Stock Report** from the sidebar.
    2. Set the date range and metal filters.
    3. Review the opening, inward, sales, and closing balances.
* **Output**: Displays tables containing transaction details, stock levels, and valuations.
* **Dependencies**: Sales Invoices, Purchase Vouchers, Journal Entries.
* **Tip**: You can export reports as CSV files by clicking the **Excel** button.

---

### Module 8: Barcode & QR Scanner Diagnostics
* **Purpose**: Configures hardware scanners and validates scan speeds.
* **Business Use Case**: Testing new barcode scanners and troubleshooting scanning issues.
* **Required Setup**: Connect the scanner via USB.
* **Step-by-Step Usage**:
  1. Open the **Scanner Settings** screen.
  2. Select the connection mode (USB HID Keyboard Emulation).
  3. Click inside the **Diagnostics Console Input Field**.
  4. Scan a barcode.
  5. Review the average inter-keystroke delays.
* **Output**: The system logs the scanned values and displays scan speeds.
* **Dependencies**: Connected hardware scanner.
* **Tip**: A hardware scanner typically registers key inputs with average delays under 50ms. Standard typing is much slower (150ms+).

---

### Module 9: Database Backups & Cloud Sync
* **Purpose**: Runs manual database backups and cloud synchronizations.
* **Business Use Case**: Backing up data at the end of the day to prevent data loss.
* **Required Setup**: Verify the internet connection and configure backup folders.
* **Step-by-Step Usage**:
  - For Backups:
    1. Go to the admin settings screen.
    2. Click **Create Backup**.
    3. The system generates a compressed `.db.gz` file and displays a success message containing the file location.
  - For Cloud Sync:
    1. Click the **Sync With Cloud** button on the quick action bar.
    2. The system checks the internet connection, pushes the data payload to the cloud, and updates the sync log.
* **Output**: Displays backup file locations and cloud sync status logs.
* **Dependencies**: Active database state.
* **Tip**: Backups are saved to the user's `Documents` folder by default. Copy backups to a USB drive or external drive for safekeeping.

---

### Module 10: Licensing & Activation
* **Purpose**: Binds the ERP client installation to the local hardware using machine fingerprints, restricting access to authorized workstations.
* **Business Use Case**: Activating newly installed ERP checkout terminals, ensuring commercial nodes are registered and preventing software piracy.
* **Required Setup**: Open the secure lock screen to generate a hardware-bound Device ID.
* **Step-by-Step Usage**:
  1. Install and boot the Jewellery ERP software. If unactivated, the application blocks navigation and displays the **System Secure Lock** screen.
  2. Click **Copy Device ID** to copy the machine's hardware fingerprint (SHA-256 hash of the CPU, Motherboard, and Disk IDs) to the clipboard.
  3. Send the copied Device ID fingerprint to the ERP administrator.
  4. The administrator generates a machine-bound License Key using the AES-256-CBC cipher with the shared secret key.
  5. Enter the generated License Key in the input field on the secure lock screen.
  6. Click **Activate License** to verify the signature and unlock the application.
* **Example**:
  - Device ID: `A6F2B8D9C0E1F2A3B4C5D6E7F8A9B0C1D2E3F4A5B6C7D8E9F0A1B2C3D4E5F6A7`
  - License Key: `5a9e3d8f1c4b2a6e0f3d9c7a5b3e1f0c:2b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5`
* **Output**: Inserts the license record into the local SQLite database (`license_info`), unlocks the interface, and loads the active company workspace.
* **Dependencies**: WMI / CIM PowerShell service access on Windows.
* **Common Errors**:
  - *Verification failed*: The entered License Key was generated for a different computer. Ask the administrator for a new key.
  - *Key expired*: The subscription period has ended. Obtain a new key.
* **Tip**: You can view the active license status in the status bar at the bottom of the screen.

