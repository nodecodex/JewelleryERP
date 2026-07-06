# 08 - UI Screen & Form Fields Documentation

This document provides field-by-field UI and UX documentation for all 20 screens in the SwarnPro ERP client.

---

## 🔒 1. System Secure Lock Screen (Licensing)
* **Screenshot Placeholder**: `[Licensing System View Screen]`
* **Purpose**: Locks the application on startup if a valid machine-bound licence is not found.
* **Fields**:
  - `Device ID` (Read-only, 64-char hex string showing the hardware fingerprint).
  - `License Key` (Input field, accepts `IV:EncryptedText` signature).
* **Buttons**:
  - `Copy Device ID`: Copies the hardware fingerprint to the clipboard.
  - `Activate License`: Decrypts and validates the entered key.
* **Calculations**: Verifies the license signature and checks for key expiration.
* **Related Screens**: Boot Splash screen.

---

## 📊 2. Main Dashboard
* **Screenshot Placeholder**: `[Dashboard View Screen]`
* **Purpose**: Displays a summary of the business's daily performance.
* **KPI Widgets**:
  - `Today's Sales Total (₹)`
  - `Today's Purchase Inward Total (₹)`
  - `Active Gold Purity Rates (24K / 22K / 18K)`
  - `Active Silver Rate`
  - `Low Inventory Stock Alert List`
  - `Customer Outstanding Accounts Receivable`
* **Related Screens**: All transactional and reporting screens.

---

## 🏢 3. Company Master
* **Screenshot Placeholder**: `[Company Master Screen]`
* **Purpose**: Manages company profiles and financial years.
* **Fields**:
  - `Company Name`, `Financial Year Start`, `Financial Year End`.
  - `GSTIN`, `PAN Number`, `Address`, `Phone`, `Email`.
  - `Bank Details` (Bank Name, Account Number, IFSC Code).
* **Buttons**:
  - `Create Company`, `Update Company`, `Delete Company`.
* **Related Screens**: Company Settings, Dashboard.

---

## 👥 4. Party Master (Suppliers & Customers)
* **Screenshot Placeholder**: `[Party Master Screen]`
* **Purpose**: Manages vendor, supplier, customer, and smith profiles.
* **Fields**:
  - `Code` (Unique identifier), `Name`, `Group Name` (Customer / Supplier / Gold Smith / Karat Smith).
  - `Mobile`, `Phone`, `Email`, `PAN`, `GSTIN`, `Address`.
  - `Opening Balance` (Debit/Credit Type), `Opening Gold Wt (Dr/Cr)`, `Opening Silver Wt (Dr/Cr)`.
* **Buttons**:
  - `Save Party`, `Edit Party`, `Delete Party`.
* **Related Screens**: Purchase Invoicing, Sales Billing Desk.

---

## 📄 5. Tax Master
* **Screenshot Placeholder**: `[Tax Master Screen]`
* **Purpose**: Manages tax codes and ledger account mappings.
* **Fields**:
  - `Tax Code`, `Tax Name`, `Tax Percent (%)`, `Additional Tax (%)`.
  - `Account Ledger Code` (Maps to chart of accounts).
* **Buttons**:
  - `Save Tax Profile`, `Delete Tax Profile`.
* **Tables**: Displays the default seeded GST rate list.
* **Related Screens**: Purchase Invoicing, Sales Billing.

---

## 🗃️ 6. Inventory Catalog (Product Master)
* **Screenshot Placeholder**: `[Inventory Catalog Screen]`
* **Purpose**: Manages the product catalog.
* **Fields**:
  - `Product Name`, `SKU`, `Barcode`, `QR Code`.
  - `Category` (Gold, Silver, Diamond, Platinum, Coins, Custom Products).
  - `Gross Weight`, `Stone Weight`, `Net Weight`, `Purity`, `Making Charges`, `Making Charge Type` (Fixed / Per Gram).
  - `HSN Code`, `GST Rate (%)`, `Purchase Price`, `Selling Price`, `Current Stock`.
* **Buttons**:
  - `Save Product`, `Delete Product`, `Generate Tag Barcode`.
* **Related Screens**: Sales Billing, Purchase Invoicing.

---

## 🏷️ 7. Stock Tag Opening
* **Screenshot Placeholder**: `[Stock Tag Opening Screen]`
* **Purpose**: Registers opening inventory and tags.
* **Fields**:
  - `Voucher No` (Auto-generated), `Voucher Date`, `Metal Type` (Gold, Silver, Diamond).
  - `Print File Name` (Tag label format).
  - `Voucher Description` (Memo).
* **Voucher Items Table**:
  - `Tag No`, `Design`, `Gross Wt`, `Stone Wt`, `Net Wt`, `Labour Rate`, `Labour Type` (G/F/P), `MRP`.
* **Accessories Table**:
  - `Charge Code`, `Name`, `Rate`, `Pcs`, `Weight`, `Labour Amt`, `Net Amount`.
* **Buttons**:
  - `Save Voucher`, `Delete Voucher`, `Add Tag Row`, `Print Tags`.
* **Calculations**: Auto-calculates net weights, total pieces, and aggregate voucher totals.
* **Related Screens**: Stock Report.

---

## 🛠️ 8. Labour Rates (Party-Wise Labour Settings)
* **Screenshot Placeholder**: `[Labour Rates Screen]`
* **Purpose**: Configures custom labour rates and wastage percentages for specific parties.
* **Fields**:
  - `Party ID` (Dropdown to select supplier/smith).
* **Labour Mapping Table**:
  - `Product Category`, `Touch Purity`, `Wastage (%)`, `Labour Type` (G/P/F), `Labour Rate (₹)`, `Item Metal Rate (₹)`.
* **Buttons**:
  - `Save Party Labour Profile`, `Delete Party Labour Profile`.
* **Related Screens**: Party Master, Purchase Invoicing.

---

## 🪙 9. Daily Rate (Metal Rates Entry)
* **Screenshot Placeholder**: `[Daily Rate Screen]`
* **Purpose**: Logs daily Gold and Silver rates.
* **Fields**:
  - `Gold 24K Rate (per 10g)`, `Gold 22K Rate (per 10g)`, `Gold 18K Rate (per 10g)`, `Silver Rate (per 1kg)`.
  - `Employee Code` (Person logging the rates).
* **Buttons**:
  - `Save Daily Rates`.
* **Related Screens**: Dashboard, Sales Billing Desk.

---

## 🛒 10. Sales Billing Desk & POS Checkout
* **Screenshot Placeholder**: `[Sales Billing Desk Screen]`
* **Purpose**: Showroom checkout screen.
* **Fields**:
  - `Voucher No` (Auto-generated), `Voucher Date`, `Voucher Time`.
  - `Customer Code` (Dropdown), `Customer Name` (Auto-filled).
  - `Ref No`, `Salesman Code`.
  - `Discount Amount (₹)`, `TCS Rate (%)`, `GST Rate (%)`.
  - `Payment Fields` (Cash, Card, Cheque, Scheme, Order Adjustments, Kasar).
* **Main Scan Grid Table**:
  - `Barcode Tag`, `Item Code`, `Design`, `Gross Wt`, `Stone Wt`, `Net Wt`, `Rate`, `Making Charge Rate`, `Making Charge Amt`, `Total Value`.
* **Return Metal Grid Table**:
  - `Return Item Code` (OG/OS), `Description`, `Gross Wt`, `Net Wt`, `Touch Purity (%)`, `Fine Wt`, `Rate`, `Net Value (Credit)`.
* **Buttons**:
  - `Save (F2)`, `New Transaction`, `Print Invoice (F12)`, `Add Row`, `Delete Row`, `Cancel`.
* **Calculations**: Auto-calculates invoice totals, GST, TCS, exchange credits, and outstanding balances.
* **Shortcuts**: `F2` to Save, `F12` to Print.
* **Related Screens**: Party Master, Stock Report, Day Book.

---

## 📥 11. Purchase Invoicing
* **Screenshot Placeholder**: `[Purchase Invoicing Screen]`
* **Purpose**: Saves purchase transactions and registers barcodes.
* **Fields**:
  - `Voucher No`, `Voucher Date`, `Voucher Time`.
  - `Supplier Party Code`, `Supplier Name` (Auto-filled).
  - `Reference Invoice No` (From manufacturer).
  - `Payment Fields` (Cash, Bank Account ID, Card, Kasar).
* **Summary Grid Table**:
  - `Category Code`, `Category Name`, `Pcs`, `Gross Wt`, `Stone Wt`, `Net Wt`, `Rate`, `Making Charge Amt`, `Total Value`.
* **Detailed Tag Grid Table**:
  - `Barcode Tag`, `Gross Wt`, `Stone Wt`, `Net Wt`, `Labour Type` (G/F/P), `Labour Rate`, `Labour Amt`, `MRP`.
* **Diamond Grid Table**:
  - `Diamond Code`, `Clarity`, `Color`, `Weight (Carats)`, `Pcs`.
* **Buttons**:
  - `Save (F2)`, `New Voucher`, `Add Row`, `Delete Voucher`, `Prev Voucher`, `Next Voucher`.
* **Shortcuts**: `F2` to Save, `F1` to toggle the sidebar search log.
* **Related Screens**: Party Master, Stock Report, Day Book.

---

## 📓 12. Ledger Vouchers (Double-Entry Accounting)
* **Screenshot Placeholder**: `[Ledger Vouchers Screen]`
* **Purpose**: Posts double-entry transaction vouchers.
* **Fields**:
  - `Voucher Type` (Journal / Payment / Receipt / Contra).
  - `Voucher No`, `Voucher Date`, `Narration (Memo)`.
* **Voucher Allocation Table**:
  - `Account Ledger Name` (Dropdown), `Debit Amt (₹)`, `Credit Amt (₹)`.
* **Buttons**:
  - `Post Ledger Voucher`, `Add Ledger Row`, `Cancel`.
* **Calculations**: Verifies that total debits equal total credits.
* **Related Screens**: Day Book, Financial Reports.

---

## 📦 13. Stock Report (Tag Valuation Ledger)
* **Screenshot Placeholder**: `[Stock Report Screen]`
* **Purpose**: Displays stock levels and valuations.
* **Filters**:
  - `Date Range` (From/To), `Item Type` (Gold, Silver, Diamond, All).
  - `Stock Type` (All, Opening, Inward, Purchase, Sales).
  - `Safe Name` (Dropdown), `Table Name` (Dropdown), `Group Code`, `Product Code`, `Search Item`.
* **Main Stock Grid Table**:
  - `SrNo`, `Item Name`, `Opening Pcs/Wt`, `Purchase Pcs/Wt`, `Inward Pcs/Wt`, `Outward Pcs/Wt`, `Sales Pcs/Wt`, `Closing Pcs/Wt`.
* **Details Side Drawer**:
  - Displays the image preview, weight, purity, and active stock levels for the selected row.
* **Buttons**:
  - `Print`, `PDF Export`, `Excel Export (CSV)`, `Cancel`.
* **Related Screens**: Sales Billing, Purchase Invoicing.

---

## 📊 14. Ledr Report (Tag Stock Ledger)
* **Screenshot Placeholder**: `[Ledr Report Screen]`
* **Purpose**: Displays detailed ledger listings for individual tagged items.
* **Filters**:
  - `Date Range` (From/To), `Tag Status` (In Tag / Out Tag / All), `Tag Search`, `Item Type` (Gold/Silver/Diamond), `Product Code`, `Group Code`.
* **Main Tag Grid Table**:
  - `Tag No`, `Item Name`, `Size`, `Pcs`, `Gross Wt`, `Net Wt`, `Metal Rate`, `Labour Rate`, `Labour Amt`, `MRP`.
* **Active Tag Fields Table**:
  - Displays the detailed metadata for the selected tag row.
* **Hallmark & Rodiam Extra Charges Table**:
  - Lists the accessories and charges mapped to the tag.
* **Buttons**:
  - `Print`, `Excel Export (CSV)`.
* **Related Screens**: Stock Report.

---

## 📖 15. Day Book & Ledgers
* **Screenshot Placeholder**: `[Day Book Screen]`
* **Purpose**: Displays chronological transaction registries for audits.
* **Filters**:
  - `Date Range` (From/To), `Voucher Type` (All, Sales, Purchase, Receipts, Payments).
* **Registry Table**:
  - `Posting Date`, `Voucher No`, `Voucher Type`, `Narration`, `Debit Amt (₹)`, `Credit Amt (₹)`.
* **Buttons**:
  - `Print Registry`, `Export Registry CSV`.
* **Related Screens**: Ledger Vouchers, Financial Reports.

---

## 📈 16. Financial Reports
* **Screenshot Placeholder**: `[Financial Reports Screen]`
* **Purpose**: Generates Profit & Loss statements and Balance Sheets.
* **Tabs**:
  - `Profit & Loss Statement`, `Balance Sheet`, `GST Sales Tax Log`.
* **Profit & Loss Fields**:
  - `Sales Revenue`, `Cost of Goods Sold (Purchases)`, `Direct Expenses`, `Gross Profit Margin`, `Indirect Expenses`, `Net Profit/Loss`.
* **Balance Sheet Fields**:
  - `Assets` (Cash, Bank, Receivables), `Liabilities & Equity` (Capital, Payables, Net Profit).
* **Buttons**:
  - `Export CSV`.
* **Related Screens**: Day Book, Ledger Vouchers.

---

## ⚙️ 17. Company Settings
* **Screenshot Placeholder**: `[Company Settings Screen]`
* **Purpose**: Configures company parameters.
* **Fields**:
  - `Default Print File Name`, `Invoice prefix`, `Invoice starting index`.
  - `Cloud Sync Endpoint URL`, `Cloud Sync Authorization Token`.
  - `Default Valuation Metal Purity`.
* **Buttons**:
  - `Save Settings`.
* **Related Screens**: Company Master, Admin Settings.

---

## 👥 18. User Rights
* **Screenshot Placeholder**: `[User Rights Screen]`
* **Purpose**: Manages user rights and role-based permissions (RBAC).
* **Fields**:
  - `User Profile Selection` (Admin, Manager, Accountant, Salesman).
  - `Permission Flags` (Toggle read/write/delete access for each screen).
* **Buttons**:
  - `Save User Permissions`, `Create New User`, `Reset Password`.
* **Related Screens**: Admin Settings.

---

## 🔌 19. Hardware Scanner Settings
* **Screenshot Placeholder**: `[Hardware Scanner Settings Screen]`
* **Purpose**: Configures hardware scanners and validates scan speeds.
* **Fields**:
  - `Connection Interface` (USB HID Keyboard Emulation / Virtual COM Port / Webcam).
  - `Serial COM Port` (DropdownCOM1/COM2/COM3), `Baud Rate` (9600 / 115200).
  - `Scanner Prefix`, `Trigger Suffix Key` (Enter / Tab / None).
* **Diagnostics Console**:
  - `Input Test Field` (Captures keystrokes).
  - `Inter-Keystroke Latency Diagnostics Logs` (Displays average input speed in milliseconds).
* **Recent Scans Audit Log Table**:
  - `Time`, `Scanned Value`, `Scan Type` (Barcode/QR), `Screen Name`, `Status`.
* **Buttons**:
  - `Save Hardware Interface`, `Clear Console`, `Refresh`.
* **Related Screens**: Printer Settings, Sales Billing.

---

## 🖨️ 20. Printer Settings
* **Screenshot Placeholder**: `[Printer Settings Screen]`
* **Purpose**: Configures printers and label sizes.
* **Fields**:
  - `Default Printer Spool` (Enter printer name).
  - `Printer Hardware Profile` (Zebra/TVS Barcode Printer, Evolis/Thermal Printer, Generic A4 Laser).
  - `Label Sheet Sizes` (Jewellery Dual Flap Tag, Standard Sticker Sheet, Generic A4 Sheet).
  - `Default Print Spooler` (Checkbox).
* **Buttons**:
  - `Save Printer Profile`, `Print Test Label Tag`.
* **Related Screens**: Scanner Settings, Sales Billing.
