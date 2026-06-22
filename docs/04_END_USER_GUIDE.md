# 04 - Showroom Floor & End User Guide

This guide is written for counter sales staff, warehouse managers, cashiers, and showroom administrators. It explains the step-by-step procedures for daily showroom operations.

---

## 🌅 Daily Showroom Opening Routine

Before creating invoices or receiving stock, you must configure the precious metal prices for the day.

```mermaid
graph LR
    A[Launch ERP] --> B[Enter Login Credentials]
    B --> C[Open Daily Rate Screen]
    C --> D[Enter Gold 24K, 22K, 18K & Silver Rates]
    D --> E[Save Daily Rates]
    E --> F[Ready to Create Invoices & Purchases]
```

### How to Update Daily Rates
1. Select **Daily Rate** from the **Masters** section in the left sidebar.
2. The current dates and rate fields are displayed.
3. Enter the current rate per gram:
   - **Gold 24K Rate**: (e.g. ₹6,200)
   - **Gold 22K Rate**: (e.g. ₹5,680)
   - **Gold 18K Rate**: (e.g. ₹4,650)
   - **Silver Rate**: (e.g. ₹75.00)
4. Click **Save Daily Rates**.
5. *Note: If "Live Rate Sync" is enabled on the Purchase and Sales screens, the system automatically pulls these rates for calculations based on the item category.*

---

## 📦 Stock Tag Initialization & Tag Opening Vouchers

Before using barcode scanners at checkout, new items and old inventory must be registered in the catalog and tagged.

### How to Initialize Stock Tag Opening Vouchers
1. Open the **Stock Tag Opening** screen under **Masters** in the sidebar.
2. Click **New Voucher**.
3. Select the metal type (e.g. Gold, Silver, Diamond).
4. In the items table:
   - **Tag Number**: Enter a unique code or scan an empty barcode tag.
   - **Weight**: Enter the Gross Weight and Stone/Other Weight. The system automatically calculates the Net Weight.
   - **Labour Charges**: Set the making charge type (Fixed, Per Gram, or Per Piece) and enter the labour rate.
   - **Design/Counter**: Enter the item style description and assign its location counter.
5. Click **Save Voucher**. This registers the barcodes and adds the items to the inventory stock reports.

---

## 📥 Purchase Entry & Stock Inward Workflow

When new ornaments are purchased from manufacturers or suppliers, use the Purchase Invoicing screen to update stock levels.

```
Create Supplier Account
    ↓
Open Purchase Invoicing Screen
    ↓
Enter Invoice Numbers & Select Supplier
    ↓
Add Items to Summary Row
    ↓
Generate Detailed Tags for the Items (Weight, Labour, Size)
    ↓
Add Diamond details (if applicable)
    ↓
Save Purchase Voucher (Stock updates and supplier ledger balance is updated)
```

### Step-by-Step Purchase Inward
1. Select **Purchase Invoicing** from the **Transactions** section in the sidebar.
2. Click **New**.
3. Select the supplier name from the **Supplier Party** dropdown list.
4. Enter the manufacturer invoice number in the **Ref No** field.
5. In the **Summary Grid** (top table):
   - Enter the item category code (e.g., `G22K` for 22K Gold, `SIL` for Silver).
   - Enter the estimated rate per gram.
6. In the **Detailed Tag Grid** (middle table):
   - Click **Add Tag Row**.
   - Scan the barcode to assign a barcode tag.
   - Enter the gross weight, stone weight, and labour charges for that item.
7. If the item contains diamonds:
   - Select the tag row in the middle table.
   - Go to the **Diamond Grid** (bottom table) and click **Add Diamond Row**.
   - Enter the color, clarity, piece count, and weight in carats.
8. Set payment details at the bottom of the screen (e.g. enter cash paid, cheque details, or leave as outstanding).
9. Click **Save** (or press **F2**). The system updates the supplier ledger and adds the tags to active inventory.

---

## 📤 Sales Billing & Point-of-Sale Checkout

The Sales Billing screen is used for customer checkouts. It handles scan validation, trade-in exchange credits, and ledger updates.

### Step-by-Step Sales Invoice Creation
1. Select **Sales Billing Desk** from the **Transactions** section in the sidebar.
2. Select the customer. Use **Walk-in Cash Customer** for guest accounts, or select a registered customer by entering their mobile number or account code.
3. **Scan Barcode Tags**: Click inside the **Tag No** field in the table and scan the barcode.
4. The system:
   - Retrieves the item details from inventory.
   - populates the gross/net weights, description, and labour charges.
   - Calculates the row amount based on the daily rate.
5. **Trade-In / Exchange Credits**: If the customer is returning old jewellery for exchange:
   - Go to the **Return Metals Grid** (middle tab).
   - Enter the item code (`OG` for Old Gold, `OS` for Old Silver), weight, touch purity, and exchange rate. The calculated credit reduces the invoice total.
6. **Payment Allocation**: At the bottom right:
   - Allocate the remaining balance to payment methods: Cash, Card, Cheque, or Scheme adjustment.
7. Click **Save** to post the transaction.
8. Click **Print** to print the invoice (supports A4 Laser prints, Thermal receipts, and Jewellery Tag labels).
9. The invoice status is updated to "Paid" (if the balance is zero) and the item is marked as "Sold" in the database.
