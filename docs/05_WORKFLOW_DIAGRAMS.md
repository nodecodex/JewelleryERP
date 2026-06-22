# 05 - Visual Workflow Documentation

This document contains Mermaid diagrams that map out the processes, workflows, and journeys inside the Jewellery ERP system.

---

## 🏢 Company Setup & Configuration Flow

This flowchart shows the initial setup sequence required when configuring a new client database.

```mermaid
graph TD
    A[Launch ERP Client] --> B[Activate License Key]
    B --> C[Create Company Profile]
    C --> D[Create Financial Year]
    D --> E[Configure GSTIN, PAN & Bank Accounts]
    E --> F[Configure Scanner & Printer Settings]
    F --> G[Initialize Inventory Catalog & Stock]
    G --> H[Ready for Transactions]
```

---

## 📥 Purchase Inward Workflow

This diagram shows the inventory and ledger updates that occur during stock procurement.

```mermaid
sequenceDiagram
    participant User as Store Manager
    participant UI as Purchase Screen
    participant DB as SQLite Database
    participant Ledg as Account Ledgers

    User->>UI: Select Supplier Party
    User->>UI: Enter Item Code, Rates & Weights
    User->>UI: Scan & Assign Barcode Tags
    User->>UI: Click Save (F2)
    activate UI
    UI->>DB: INSERT INTO purchase_vouchers & purchase_items
    UI->>DB: INSERT INTO barcode_master (Status: Active)
    UI->>DB: UPDATE products (Increase current_stock)
    UI->>Ledg: Debit Purchase Account (Gold/Silver cost)
    UI->>Ledg: Credit Supplier Account (A/c Payable)
    DB-->>UI: Commit Transaction Successful
    deactivate UI
    UI-->>User: Show Success Alert & Reload Stock
```

---

## 📤 Sales Billing & Point-of-Sale Checkout

This sequence diagram shows the checkout validation and transaction updates that occur when a sale is finalized.

```mermaid
sequenceDiagram
    participant Sales as Cashier
    participant Scan as Barcode Scanner
    participant UI as Sales Billing Desk
    participant DB as SQLite Database
    participant Ledg as Account Ledgers

    Sales->>UI: Focus 'Tag No' input field
    Scan->>UI: Scan Barcode on Tag
    UI->>DB: SELECT * FROM barcode_master WHERE status = 'Active'
    DB-->>UI: Return Product Data (Weights, Making charges, Purity)
    UI->>UI: Recalculate invoice totals and GST (3%)
    Sales->>UI: Select payment method & click Save
    activate UI
    UI->>DB: INSERT INTO sales_invoices & sales_items
    UI->>DB: UPDATE barcode_master SET status = 'Sold'
    UI->>DB: UPDATE products (Decrease current_stock)
    UI->>Ledg: Debit Cash/Bank/Card Account (Amount Paid)
    UI->>Ledg: Credit Sales Revenue Account (Pre-tax)
    UI->>Ledg: Credit GST Liability Account (Tax)
    DB-->>UI: Commit Transaction Successful
    deactivate UI
    UI-->>Sales: Print Invoice PDF & Reset Grid
```

---

## 📈 Accounting Voucher Balancing Flow

This flowchart shows the validation rules enforced during manual journal entry postings.

```mermaid
graph TD
    A[Click New Voucher Entry] --> B[Select Voucher Type: JV / PV / RV / Contra]
    B --> C[Select Ledger Account Rows]
    C --> D[Enter Debit and Credit amounts]
    D --> E{Debit Total == Credit Total?}
    E -- No --> F[Show Difference Alert & Disable Save Button]
    E -- Yes --> G[Enable Save Button & Display Balanced Status]
    G --> H[Click Save]
    H --> I[Post Journal Entry & Update Account Balances]
    F --> C
```
