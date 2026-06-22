# Jewel_ACC Desktop ERP - UI Design & Styling Standards

Every component, page, master registry, form, and table in this application must strictly adhere to this desktop-first design system. Reject any SaaS card-heavy layout or responsive web dashboards.

---

## 1. Window Layout Structure
* **Regions**: Every screen is hosted inside a 5-region native desktop frame:
  1. **Top Menu Bar**: Dropdown menus (File, Masters, Transactions, Reports, Help) in slate-900.
  2. **Ribbon Toolbar**: High-density action buttons with keyboard legends (e.g. `[F3] Sales Bill`).
  3. **Collapsible Sidebar**: Slate Navy (`#070D18`) navigation grouping Masters, Transactions, and Books.
  4. **Workspace Tabs**: Horizontal gray tabs with a luxury gold active underline (`#d4af37`).
  5. **Status Bar**: Bottom footer panel showing licensing status, ticking clock, and active company context.
* **Workspace Padding**: The standard canvas viewport padding is `p-3 bg-[#eef1f6] h-full overflow-y-auto`.

---

## 2. Typography & Fonts
* **Luxury Serif (`Cinzel`)**: Reserved for brand headers, main company title banners, and active company workspace headers.
* **Interface Sans (`Inter`)**: Used for labels, input forms, dropdown selectors, menus, and normal system texts.
* **Data Monospace (`JetBrains Mono`)**: Used for numerical fields, currency values, quantities, stock warnings, date strings, ledger balances, and product barcodes.

---

## 3. Color Palette & Native Styles
* **Canvas Background**: Flat Cool Gray (`#eef1f6`).
* **Sidebar Background**: Rich Dark Navy (`#070D18`).
* **Workspace Panels**: White card backgrounds (`#ffffff`) with thin, solid borders (`border-slate-350` or `#cbd5e1`).
* **Luxury Accent**: Gold Accent color (`#d4af37` or `#c5a059`) for active status indicators, totals highlights, active focus states, and primary button labels.
* **Border Radii**: Flat desktop-sharp edges (`rounded-[2px]`). Do not use large rounded borders (like `rounded-lg` or `rounded-xl`).

---

## 4. Input Forms Design
* **Fixed Column Grids**: Do not use responsive prefixes (like `sm:grid-cols-2 md:grid-cols-3`) for input panels. Use direct, fixed column divisions (e.g. `grid grid-cols-12 gap-3` with specific `col-span-4`, `col-span-6` tags) so they do not stack vertically inside Electron windows.
* **Logical Sub-Panels**: Group input controls into distinct, labeled sub-panels (e.g. Company Details, Tax Parameters, Bank Accounts) styled with a slate-50 background and thin borders.
* **Horizontal Alignments**: In master details panes, labels should sit to the left of the input boxes in a grid row rather than stacked above.
* **Styling Classes**:
  * Label headers: `.erp-label` (9px bold uppercase slate-500, letter spacing `0.5px`).
  * Form controls: `.erp-input` (flat border inputs with focus indicators, size 11px).

---

## 5. Data Grids & Lists (AG Grid Style)
* **Table Selector**: Wrap all lists in `.ag-grid-dense-table`.
* **Table Styling Guidelines**:
  * Row padding must be tight (`py-1.5 px-2` or `p-1.5`).
  * Header columns must have a slate background, uppercase labels, and clear sorting indicator buttons.
  * Thin light border lines (`border-slate-150` or `#cbd5e1`) must be visible between columns and rows.
  * Zebra striping is mandatory (`tr:nth-child(even)` is gray, `tr:nth-child(odd)` is white).
  * Selected rows must be highlighted in light red (`bg-rose-100/75 text-rose-900 border-l-[3px] border-l-amber-500`).

---

## 6. Keyboard Shortcuts
* Action items must show their key legends using the `<span className="keyboard-key">Key</span>` badge (e.g. `<span className="keyboard-key">F2</span>` next to the Save trigger).
