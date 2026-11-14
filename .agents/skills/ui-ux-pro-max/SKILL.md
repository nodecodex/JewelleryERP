---
name: ui-ux-pro-max
description: Enterprise-grade UI/UX design and interaction standards for professional desktop ERP, POS, and accounting software. Use when designing, building, or styling high-density data tables, keyboard-first forms, POS billing counters, voucher entry screens, and dark/light desktop accounting themes.
---

# UI/UX Pro Max: Enterprise Desktop ERP Design Standards

This skill defines the highest level of UI/UX craftsmanship for high-velocity desktop business software (Jewellery ERP, POS, Wholesale & Retail Accounting).

## 1. Ergonomic & Density Principles

1. **Information Density**:
   - Cashiers, jewellers, and accountants require maximum visible data without excessive scrolling.
   - Use compact row heights (`py-1.5` to `py-2`), tight cell padding, and mono-spaced fonts (`font-mono`) for numerical values, weights, and currency.
   - Clean tabular alignments: Text left-aligned, numbers right-aligned, status badges centered.

2. **Keyboard-First Navigation (Tally/Marg Style)**:
   - Every primary action MUST be achievable without touching the mouse:
     - `Enter`: Move focus to the next logical input field in tabular forms.
     - `Esc`: Close modal, cancel entry, or return to parent menu.
     - `F1`: Help / Quick Reference.
     - `F2`: Change Date.
     - `F3`: Switch / Select Company.
     - `F4`: Contra Voucher.
     - `F5`: Payment Voucher.
     - `F6`: Receipt Voucher.
     - `F7`: Journal Voucher.
     - `F8`: Sales / Billing Voucher.
     - `F9`: Purchase Voucher.
     - `Ctrl + S`: Instant Save.
     - `Ctrl + P`: Instant Print (A4 / Thermal).

3. **Instant Visual Feedback & Error Prevention**:
   - Highlight active table row and focused input with a prominent high-contrast outline (`ring-2 ring-primary`).
   - Inline real-time mathematical validation: Fine weight recalculation upon changing Tounch or Gross weight must occur at 0ms latency.
   - Distinct badges for metal categories (24K Gold, 22K Gold, 18K Gold, 925 Silver, Diamond).

4. **Desktop Aesthetic Foundations**:
   - Window controls: Compact, integrated Windows title bar with frameless styling.
   - Multi-Tab Support: Working on an invoice while checking a customer's ledger in a separate tab without losing state.
   - Clean Color Themes:
     - **Classic Gold Luxury**: Deep slate background (`#0B0F19`) with warm champagne accents (`#D4AF37`) for boutique jewellery stores.
     - **Accounting High Contrast**: Crisp slate/white with deep navy (`#1E293B`) and forest green/crimson for debit/credit clarity.
