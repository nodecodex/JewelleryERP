Aap Antigravity IDE / Claude Code / Codex ko niche wala professional PRD + Master Prompt de sakte ho. Is prompt ka purpose hai ki AI aapko screenshot ke basis par step-by-step enterprise-grade Electron.js SwarnPro ERP software banakar de.

---

# 💎 SwarnPro ERP Desktop Software (Electron.js) - Complete Product Requirement Document

## Project Overview

Build a professional desktop-based SwarnPro ERP Software using Electron.js for Windows.

The software will be primarily designed for Jewellery Shops, Gold Traders, Silver Traders, and Jewellery Manufacturers.

The application must work completely offline by default and should not require an internet connection for daily operations.

The UI/UX should be similar to traditional desktop ERP applications like Tally, Marg ERP, Busy, and the provided screenshot.

The software should be scalable so it can later support cloud synchronization, multi-branch management, online backups, and subscription licensing.

---

# Tech Stack

## Desktop

* Electron.js
* React.js
* TypeScript
* Vite

## UI

* Tailwind CSS
* Shadcn UI
* React Hook Form
* Zod Validation

## State Management

* Zustand

## Local Database

Primary Database:

* SQLite

Alternative:

* Better SQLite3

---

## Cloud Database (Optional Sync)

* PostgreSQL

or

* MongoDB

---

## Backend For Sync

* Node.js
* Express.js
* TypeScript

---

# Software Modules

---

## 1. Company Management

Features:

* Create Company
* Edit Company
* Delete Company
* Multiple Companies
* Financial Year Management
* GST Information
* PAN Information
* Bank Details
* Company Settings

---

## 2. Inventory Management

### Categories

* Gold Jewellery
* Silver Jewellery
* Diamond Jewellery
* Platinum Jewellery
* Loose Diamonds
* Coins
* Custom Products

### Product Fields

* Product Name
* SKU
* Barcode
* QR Code
* Category
* Weight
* Net Weight
* Gross Weight
* Purity
* Stone Weight
* Making Charges
* HSN Code
* GST Rate
* Purchase Price
* Selling Price
* Current Stock

---

## 3. Barcode & QR Scanner Integration

Requirements:

Software should support:

* USB Barcode Scanner
* QR Code Scanner
* Webcam QR Scanner

Flow:

When barcode is scanned:

* Automatically identify product
* Fetch product details
* Auto-fill inventory form
* Auto-fill billing form

Supported formats:

* QR
* Code128
* EAN13
* EAN8
* UPC

---

## 4. Purchase Module

Features:

* Purchase Entry
* Purchase Return
* Supplier Management
* Supplier Ledger
* Purchase Reports

---

## 5. Sales Module

Features:

* Retail Billing
* Wholesale Billing
* GST Billing
* Estimate Billing
* Invoice Printing

---

## 6. Customer Management

Fields:

* Customer Name
* Mobile Number
* Address
* PAN Number
* GST Number
* Email

Features:

* Purchase History
* Due Amount
* Loyalty Tracking

---

## 7. Accounting Module

Features:

* Cash Book
* Bank Book
* Journal Entry
* Payment Voucher
* Receipt Voucher
* Contra Voucher
* Expense Tracking

---

## 8. Ledger Management

Features:

* Customer Ledger
* Supplier Ledger
* Cash Ledger
* Bank Ledger

---

## 9. Gold & Silver Rate Module

Features:

* Daily Gold Rate
* Daily Silver Rate
* Historical Rates
* Auto Rate Update (Optional Online)

---

## 10. Reports

Generate:

* Stock Report
* Purchase Report
* Sales Report
* Profit Loss
* Balance Sheet
* GST Reports
* Customer Report
* Supplier Report

Export:

* PDF
* Excel
* CSV

---

# Offline First Architecture

Important:

Software must be designed as Offline First.

All features must work without internet.

All data should be stored locally in SQLite.

No internet dependency for:

* Billing
* Inventory
* Accounting
* Reports

---

# Cloud Sync Module

Add a dedicated button:

"Sync With Cloud"

Purpose:

When user clicks:

1. Detect internet connection
2. Upload local changes
3. Download cloud changes
4. Resolve conflicts
5. Show sync status

Sync should be optional.

Offline users should never be forced to use cloud.

---

# Backup & Restore Module

Add a dedicated Backup Center.

Features:

## Backup

One-click backup of:

* SQLite Database
* Settings
* Company Data
* Images
* Documents

Generate:

* ZIP File

Destination:

* Local Folder
* USB Drive

---

## Restore

Restore from:

* Backup ZIP

Restore everything automatically.

---

# Licensing System

Software will be sold commercially.

Implement secure licensing.

---

## Activation Flow

After installation:

User sees:

Activate License

Input:

* License Key

Example:

XXXX-XXXX-XXXX-XXXX

---

## Hardware Lock

Generate Device Fingerprint using:

* CPU ID
* Motherboard ID
* Disk Serial
* Windows SID

Combined hash:

Device ID

---

## Activation Process

Step 1

Client sends Device ID.

Step 2

Admin generates License Key.

Step 3

Client enters License Key.

Step 4

License permanently binds to that machine.

---

## Restrictions

License can be:

* Activated only once
* Used on one computer only

---

## Validation

Store:

* Device ID
* License Key
* Activation Date

Encrypted locally.

---

## Anti-Piracy

Implement:

* License Encryption
* Device Binding
* Tamper Detection
* Database Encryption

---

# User Roles

## Admin

Full Access

---

## Manager

Inventory + Billing

---

## Accountant

Accounting + Reports

---

## Salesman

Billing Only

---

# Printing System

Support:

* A4 Invoice
* Thermal Printer
* Barcode Printing
* QR Printing
* Jewellery Tags

---

# Dashboard

Show:

* Today's Sales
* Today's Purchase
* Gold Rate
* Silver Rate
* Low Stock Alerts
* Outstanding Amounts

---

# UI Requirements

Design should resemble:

* Tally ERP
* Busy Accounting
* Marg ERP
* Traditional Windows ERP

Features:

* Left Sidebar
* Top Menu
* Multi Tab Support
* Desktop Feel
* Keyboard Shortcuts
* Professional Enterprise Layout

Use provided screenshot as reference for layout structure.

---

# Development Instructions For AI

Follow these rules:

1. Create modular architecture.
2. Use clean code principles.
3. Use Repository Pattern.
4. Use TypeScript everywhere.
5. Use scalable folder structure.
6. Generate complete source code.
7. Generate database schema.
8. Generate migrations.
9. Generate reusable components.
10. Build each module independently.
11. Provide implementation step-by-step.
12. Never use mock data.
13. Create production-ready code only.

---

# Expected Output

Build a production-ready SwarnPro ERP Desktop Software capable of:

* Offline operation
* Barcode scanning
* QR scanning
* Billing
* Inventory
* Accounting
* Reports
* Backup/Restore
* Cloud Sync
* License Activation
* Multi-company support

The software should be commercially deployable and ready to sell to multiple clients with machine-bound license activation.
