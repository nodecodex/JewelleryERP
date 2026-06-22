# 12 - Missing Features & Gap Analysis Report

This document compares the current software implementation with the requirements defined in the **Product Requirement Document (PRD)**. It identifies functional gaps and provides recommendations for future development.

---

## 🔍 PRD Requirement Gap Analysis

| PRD Module Requirement | Codebase Implementation Status | Identified Gaps | Business Impact |
| :--- | :--- | :--- | :--- |
| **Wholesale Invoicing** | **Partially Implemented** | The sales invoicing screen supports Retail, GST, and Estimate invoices, but lacks wholesale pricing discount tiers and multi-currency billing. | Wholesale trade orders must be processed manually or customized outside the invoice templates. |
| **Daily Metal Rate Updates** | **Partially Implemented** | Daily rates must be entered manually. The auto-update rate feature from online APIs is missing. | Cashiers must update prices manually every morning. |
| **Webcam QR Scanner** | **Mocked / Missing** | The UI allows you to select "Webcam" as a connection interface, but the video stream parser and barcode capture library are missing. | Webcam-based QR scanning is unavailable. |
| **Database Encryption** | **Missing** | The SQLite database is stored in an unencrypted format. The anti-piracy requirement for database encryption is missing. | The database file can be accessed or modified using standard SQL database viewers, posing a security risk. |
| **Cloud Merge Sync** | **Mocked / Missing** | The cloud sync service compiles and pushes data payloads, but lacks merge conflict resolution logic and local database reconciliation. | Synchronization is one-way (push only). Data changes from other branches are not merged. |
| **Complete Backups** | **Partially Implemented** | The backup service compresses the SQLite database file, but does not back up settings, company assets, images, or documents. | Attachments and product images are not backed up. |
| **Anti-Tampering** | **Missing** | The licensing module decrypts keys to verify access, but lacks anti-tamper safeguards to prevent runtime debugging. | The licensing checks can be bypassed using runtime instrumentation tools. |

---

## 🛠️ Recommendations for Future Development

### 1. Enable Database Encryption (SQLCipher)
* **Goal**: Protect company transactions, user passwords, and customer lists from unauthorized access.
* **Action**:
  - Replace the `better-sqlite3` wrapper with `@journeyapps/sqlcipher` or similar wrappers.
  - Implement a dynamic database encryption key generation system using the machine's hardware GUID.

### 2. Implement a Webcam QR Stream Capture Library (jsQR / Html5Qrcode)
* **Goal**: Support webcam-based QR scanning for counters that do not have dedicated hardware scanner guns.
* **Action**:
  - Integrate a library like `html5-qrcode` or `jsqr` in `ScannerSettings.tsx` to handle webcam video streams.
  - Set up a video preview modal to capture and parse frames, and dispatch events to the `window.api.logScan` IPC channel.

### 3. Implement Online Metal Rate Integration (API Integration)
* **Goal**: Auto-update daily gold and silver rates.
* **Action**:
  - Integrate a metal rate API (e.g. BullionRates or MetalpriceAPI) in `rate.repository.ts`.
  - Fetch current prices on startup, apply local markup settings, and populate the daily rates table.

### 4. Implement Local Database Merging and Conflict Resolution
* **Goal**: Support multi-branch cloud sync synchronization.
* **Action**:
  - Add sync metadata columns (such as `device_id`, `updated_at`, and `is_deleted`) to all database tables.
  - Update the sync service to fetch remote transactions and merge records locally using a conflict resolution strategy (e.g. Last-Write-Wins).
