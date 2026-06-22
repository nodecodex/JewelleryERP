# 02 - Master User Manual & Calculation Guide

This manual defines the business concepts and calculation policies used by the Jewellery ERP. A consistent understanding of these calculations is required to prevent inventory discrepancies, tax audits, and ledger imbalances.

---

## 📖 Glossary of Domain Terms

Jewellery retail and wholesale operations use specialized weight and rate concepts. Below is a detailed glossary:

| Term | Symbol / Code | Description | Business Impact |
| :--- | :---: | :--- | :--- |
| **Gross Weight** | `gr_wt` | The total raw weight of the item including metal, stones, enamel, lacquer, and tags. | Primary weight measured at the counter scale. |
| **Other Weight** | `oth_wt` / `ls_wt` | The weight of non-precious elements (diamonds, gemstones, beads, dust, lacquer). | Deducted from Gross Weight to calculate Net metal weight. |
| **Net Weight** | `net_wt` | The actual precious metal weight (Gold, Silver, Platinum) in the ornament. | Net Weight = Gross Weight - Other/Stone Weight. |
| **Purity / Touch** | `touch` | The percentage of pure gold or silver in the alloy (e.g., 91.6% for 22 Karat, 75.0% for 18 Karat). | Determines the equivalent amount of 24 Karat fine metal. |
| **Wastage %** | `wastage_percent` | A percentage allowance added to Net Weight to cover melting, polishing, and manufacturing losses. | Increases the fine weight charge to the customer. |
| **Fine Weight** | `fine` | The equivalent weight of pure 24K metal inside the ornament after purity and wastage adjustments. | Fine Weight = Net Weight × (Purity % + Wastage %) / 100. |
| **Metal Rate** | `rate` / `it_rate` | The market rate per gram of precious metal (usually per 10 grams for Gold, per 1 kg for Silver). | The base cost factor applied to Fine Weight. |
| **Making Charges** | `lamt` / `lbr_amt` | The cost of labour to manufacture the ornament. Can be calculated per gram, per piece, or as a flat rate. | Added to the metal cost. |
| **Extra Charges** | `oth_amt` | Supplementary costs such as Hallmarking charges (HM) and Rhodium plating charges (RD). | Added to the total transaction value. |
| **Exchange Credits** | `net_amt` (Return) | The trade-in value of old metal brought by the customer. | Directly reduces the cash amount due from the customer. |
| **GST** | `tax_amount` | Goods and Services Tax. Standard rate is 3% for precious metals and jewellery in India. | Collected on the net taxable amount (Sales - Discount). |
| **TCS** | `tcs_amount` | Tax Collected at Source. Applicable under Section 206C(1F) on cash purchases over threshold limits (usually 1%). | Added to the invoice total. |

---

## 🧮 Mathematical Formulas & Calculations

The ERP automatically executes the following calculations on transactions:

### 1. Net Weight Calculation
The net precious metal weight is calculated by subtracting stone weight (`ls_wt`) or other weight (`oth_wt`) from the gross scale weight (`gr_wt`):
$$\text{Net Weight } (net\_wt) = gr\_wt - ls\_wt$$
*(Note: Net weight can never be negative. If gross weight is less than other weight, the system caps the net weight at `0.000`.)*

### 2. Fine Metal Weight Calculation
Fine metal weight represents the equivalent weight of 99.9% pure metal. It is calculated as:
$$\text{Fine Weight } (fine) = \frac{net\_wt \times (\text{Touch} + \text{Wastage \%})}{100}$$
*Example: A 22K (91.6% purity) gold ring has a net weight of 10.00 grams and wastage is set at 2.4%.*
$$fine = \frac{10.00 \times (91.6 + 2.4)}{100} = \frac{10.00 \times 94.0}{100} = 9.40 \text{ grams (Fine Gold equivalent)}$$

### 3. Labour / Making Charges Calculation
Making charges are calculated based on three types:
* **Per Gram (`G`)**: Charges scale linearly with the Net Weight:
  $$\text{Labour Amount } (lamt) = net\_wt \times \text{Labour Rate } (lrate)$$
* **Per Piece (`P`)**: Charges scale with the quantity count of items:
  $$\text{Labour Amount } (lamt) = \text{Pieces } (pcs) \times \text{Labour Rate } (lrate)$$
* **Fixed Flat Rate (`F`)**: A single flat charge regardless of weight or pieces:
  $$\text{Labour Amount } (lamt) = \text{Labour Rate } (lrate)$$

### 4. Sales Invoicing Valuation
For each item in the sales invoice, the item subtotal (`tot_amt`) is calculated as:
$$tot\_amt = (net\_wt \times it\_rate) + lbr\_amt + ght\_amt + oth\_amt$$
*Where:*
- $net\_wt \times it\_rate$ is the base metal cost.
- $lbr\_amt$ is the total making charge for the row.
- $ght\_amt$ is the wastage/ghat cost buffer.
- $oth\_amt$ is the sum of hallmark/rhodium charges.

### 5. Old Gold / Silver Exchange Credits
Old metal returned by the customer is evaluated based on its estimated melting purity (touch). Wastage is not added; instead, a lower rate is usually applied:
$$\text{Exchange Credit } (net\_amt) = (net\_wt \times \frac{\text{Estimated Touch}}{100}) \times \text{Exchange Rate}$$
*Example: Customer returns an old gold chain weighing 10.00g at 80% touch. The current exchange rate is ₹5,000 per gram.*
$$\text{Exchange Credit} = (10.00 \times 0.80) \times 5,000 = 8.00 \times 5,000 = \text{₹}40,000$$

### 6. Taxes, TCS, Round-Offs, and Outstanding Balance
The final invoice totals are calculated sequentially:
1. **Taxable Amount**:
   $$\text{Taxable Amount } (taxableAmt) = \sum(tot\_amt) - \text{Discount Amount } (discAmt)$$
2. **GST Collection**:
   $$\text{Tax Amount } (taxAmt) = taxableAmt \times \frac{\text{GST Rate (usually 3.0)}}{100}$$
3. **TCS Collection**:
   $$\text{TCS Amount } (tcsAmt) = (taxableAmt + taxAmt) \times \frac{\text{TCS Rate \%}}{100}$$
4. **Grand Invoice Total**:
   $$\text{Raw Total } = taxableAmt + taxAmt + tcsAmt$$
   $$\text{Rounded Invoice Total } (totalAmt) = \text{Math.round}(\text{Raw Total})$$
   $$\text{Round Off } (rofAmt) = totalAmt - \text{Raw Total}$$
5. **Outstanding Ledger Balance**:
   $$\text{Outstanding Balance } (osAmt) = totalAmt - \text{Total Payments Received}$$
   *Where:*
   $$\text{Total Payments Received} = \text{Cash} + \text{Card} + \text{Cheque/Bank} + \text{Exchange Credits} + \text{Scheme Adjustments} + \text{Order Adjustments}$$

---

## 🚨 Common Mistakes & Best Practices

### Common Mistakes
1. **Confusing Gross and Net Weight**: Entering stone weights in the gross weight field without recording them in the stone weight field. This inflates the precious metal weight, resulting in incorrect calculations.
2. **Incorrect Labour Type Selection**: Selecting "Per Gram (`G`)" instead of "Fixed (`F`)" for items like rings, which charges the labour rate for every gram of weight and overcharges the customer.
3. **Mismatched Tax Types**: Selecting "IGST" (Inter-State GST) for a local walk-in cash customer instead of "CGST_SGST". This causes compliance errors in GST returns.
4. **Incorrect Return Metal Codes**: Using generic tags for old gold returns. Use the standard codes (e.g. `OG` for Old Gold, `OS` for Old Silver) so that the system separates the credits into the correct gold/silver reports.

### Best Practices
1. **Daily Rate Synchronizations**: Update the gold and silver rates every morning before creating invoices or purchases.
2. **Verify Balanced Vouchers**: When creating manual journal vouchers, ensure total debits equal total credits. Use the dynamic "Difference" label at the bottom of the voucher screen to verify balancing.
3. **Scanners Wedge Focus**: When scanning barcodes at checkout, click inside the target input box first to ensure the scanner input is captured correctly.
