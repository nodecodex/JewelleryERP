export interface Company {
  id: string;
  name: string;
  financial_year_start: string;
  financial_year_end: string;
  gstin?: string;
  pan?: string;
  bank_name?: string;
  bank_account_no?: string;
  bank_ifsc?: string;
  address?: string;
  phone?: string;
  email?: string;
  settings_json?: string;
  created_at?: string;
  updated_at?: string;
}

export interface User {
  id: string;
  company_id: string;
  username: string;
  role: 'Admin' | 'Manager' | 'Accountant' | 'Salesman';
  permissions_json?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Product {
  id: string;
  company_id: string;
  name: string;
  sku: string;
  barcode?: string;
  qr_code?: string;
  category: 'Gold Jewellery' | 'Silver Jewellery' | 'Diamond Jewellery' | 'Platinum Jewellery' | 'Loose Diamonds' | 'Coins' | 'Custom Products';
  weight: number;
  net_weight: number;
  gross_weight: number;
  purity?: string;
  stone_weight: number;
  making_charges: number;
  making_charges_type: 'fixed' | 'per_gram';
  hsn_code?: string;
  gst_rate: number;
  purchase_price: number;
  selling_price: number;
  current_stock: number;
  created_at?: string;
  updated_at?: string;
}

export interface Customer {
  id: string;
  company_id: string;
  name: string;
  mobile: string;
  address?: string;
  pan?: string;
  gstin?: string;
  email?: string;
  loyalty_points: number;
  created_at?: string;
}

export interface Supplier {
  id: string;
  company_id: string;
  name: string;
  mobile: string;
  address?: string;
  pan?: string;
  gstin?: string;
  email?: string;
  created_at?: string;
}

export interface Account {
  id: string;
  company_id: string;
  name: string;
  code: string;
  parent_group: 'Cash' | 'Bank' | 'Capital' | 'Sales' | 'Purchase' | 'Direct Expense' | 'Indirect Expense' | 'Customer Ledger' | 'Supplier Ledger';
  opening_balance: number;
  current_balance: number;
  created_at?: string;
}

export interface SalesInvoice {
  id: string;
  company_id: string;
  invoice_number: string;
  invoice_date: string;
  customer_id?: string;
  invoice_type: 'Retail' | 'Wholesale' | 'GST' | 'Estimate';
  tax_type: 'CGST_SGST' | 'IGST' | 'UTGST' | 'Exempt';
  gross_amount: number;
  discount_amount: number;
  tax_amount: number;
  making_charges_total: number;
  round_off: number;
  net_amount: number;
  payment_mode: 'Cash' | 'Bank' | 'Card' | 'UPI' | 'Mixed';
  paid_amount: number;
  balance_amount: number;
  status: string;
  created_at?: string;
  items?: SalesItem[];
}

export interface SalesItem {
  id: string;
  sales_invoice_id: string;
  product_id?: string;
  product_name: string;
  weight: number;
  net_weight: number;
  gross_weight: number;
  purity?: string;
  making_charges: number;
  rate: number;
  quantity: number;
  tax_rate: number;
  tax_amount: number;
  subtotal: number;
}

export interface JournalEntry {
  id: string;
  company_id: string;
  entry_date: string;
  voucher_type: 'Sales' | 'Purchase' | 'Payment' | 'Receipt' | 'Contra' | 'Journal';
  voucher_number: string;
  reference_id?: string;
  narration?: string;
  items?: JournalItem[];
}

export interface JournalItem {
  id: string;
  journal_entry_id: string;
  account_id: string;
  debit: number;
  credit: number;
}

export interface DailyRate {
  id: string;
  company_id: string;
  rate_date: string;
  gold_rate_24k: number;
  gold_rate_22k: number;
  gold_rate_18k: number;
  silver_rate: number;
  rates_json?: string;
  employee?: string;
  created_at?: string;
}

export interface LicenseStatus {
  activated: boolean;
  deviceId: string;
  licenseKey?: string;
  activationDate?: string;
  expiryDate?: string;
  statusMessage: string;
}

export interface SyncStatus {
  success: boolean;
  message: string;
  lastSyncTime?: string;
}

export interface BackupResult {
  success: boolean;
  filePath?: string;
  message: string;
}

// IPC Channels definition
export interface IpcApi {
  // Company
  getCompanies: () => Promise<Company[]>;
  createCompany: (company: Omit<Company, 'id'>) => Promise<Company>;
  updateCompany: (company: Company) => Promise<void>;
  deleteCompany: (id: string) => Promise<void>;

  // Products / Inventory
  getProducts: (companyId: string) => Promise<Product[]>;
  getProductByBarcode: (companyId: string, barcode: string) => Promise<Product | null>;
  createProduct: (product: Omit<Product, 'id'>) => Promise<Product>;
  updateProduct: (product: Product) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;

  // Customers
  getCustomers: (companyId: string) => Promise<Customer[]>;
  createCustomer: (customer: Omit<Customer, 'id'>) => Promise<Customer>;
  updateCustomer: (customer: Customer) => Promise<void>;

  // Suppliers
  getSuppliers: (companyId: string) => Promise<Supplier[]>;
  createSupplier: (supplier: Omit<Supplier, 'id'>) => Promise<Supplier>;
  updateSupplier: (supplier: Supplier) => Promise<void>;

  // Sales / Billing
  createInvoice: (invoice: Omit<SalesInvoice, 'id'>, items: Omit<SalesItem, 'id' | 'sales_invoice_id'>[]) => Promise<SalesInvoice>;
  getInvoices: (companyId: string) => Promise<SalesInvoice[]>;
  getNextInvoiceNumber: (companyId: string, type: string) => Promise<string>;
  deleteInvoice: (id: string) => Promise<void>;
  getTagStockReport: (companyId: string) => Promise<any[]>;
  getTagAccessories: (source: string, voucherId: string, tagId: string) => Promise<any[]>;

  // Vouchers / Accounting
  getAccounts: (companyId: string) => Promise<Account[]>;
  createAccount: (account: Omit<Account, 'id' | 'current_balance'>) => Promise<Account>;
  createVoucher: (voucher: Omit<JournalEntry, 'id'>, items: Omit<JournalItem, 'id' | 'journal_entry_id'>[]) => Promise<JournalEntry>;
  getVouchers: (companyId: string) => Promise<JournalEntry[]>;
  getLedgerReport: (companyId: string, accountId: string, startDate?: string, endDate?: string) => Promise<any[]>;

  // DB Sync Event
  onDatabaseUpdated: (callback: () => void) => () => void;

  // Gold & Silver Rates
  getDailyRates: (companyId: string) => Promise<DailyRate[]>;
  saveDailyRates: (rate: Omit<DailyRate, 'id'>) => Promise<DailyRate>;

  // Licensing
  getDeviceId: () => Promise<string>;
  getLicenseStatus: () => Promise<LicenseStatus>;
  activateLicense: (key: string) => Promise<LicenseStatus>;

  // Backup & Restore
  createBackup: (destPath?: string) => Promise<BackupResult>;
  restoreBackup: (zipPath: string) => Promise<BackupResult>;

  // Cloud Sync
  syncWithCloud: (companyId: string) => Promise<SyncStatus>;

  // Users Management
  getUsers: (companyId: string) => Promise<User[]>;
  createUser: (user: Omit<User, 'id'> & { password_plain: string }) => Promise<User>;
  updateUserPermissions: (id: string, permissionsJson: string) => Promise<void>;
  updateUserPassword: (id: string, oldPasswordPlain: string, newPasswordPlain: string) => Promise<{ success: boolean; message: string }>;
  deleteUser: (id: string) => Promise<void>;

  // Party Management
  getParties: (companyId: string) => Promise<Party[]>;
  createParty: (party: Omit<Party, 'id'>) => Promise<Party>;
  updateParty: (party: Party) => Promise<void>;
  deleteParty: (id: string) => Promise<void>;

  // Tax Management
  getTaxes: (companyId: string) => Promise<Tax[]>;
  createTax: (tax: Omit<Tax, 'id'>) => Promise<Tax>;
  updateTax: (tax: Tax) => Promise<void>;
  deleteTax: (id: string) => Promise<void>;

  // Tag Opening (Opening Stock) Management
  getTagOpeningVouchers: (companyId: string) => Promise<TagOpeningVoucher[]>;
  createTagOpeningVoucher: (
    voucher: Omit<TagOpeningVoucher, 'id'>,
    items: Omit<TagOpeningItem, 'id' | 'voucher_id'>[],
    accessories: Omit<TagOpeningAccessory, 'id' | 'voucher_id'>[]
  ) => Promise<TagOpeningVoucher>;
  updateTagOpeningVoucher: (
    voucher: TagOpeningVoucher,
    items: Omit<TagOpeningItem, 'id' | 'voucher_id'>[],
    accessories: Omit<TagOpeningAccessory, 'id' | 'voucher_id'>[]
  ) => Promise<void>;
  deleteTagOpeningVoucher: (id: string) => Promise<void>;

  // Party Wise Labour Management
  getPartyWiseLabour: (companyId: string, partyId: string) => Promise<PartyWiseLabour[]>;
  savePartyWiseLabour: (companyId: string, partyId: string, entries: Omit<PartyWiseLabour, 'id' | 'company_id' | 'party_id'>[]) => Promise<void>;
  deletePartyWiseLabour: (companyId: string, partyId: string) => Promise<void>;

  // Item Stock Limit Management
  getItemStockLimits: (companyId: string) => Promise<ItemStockLimit[]>;
  saveItemStockLimit: (
    companyId: string,
    limit: { id?: string; item_code: string; item_name: string },
    details: Omit<ItemStockLimitDetail, 'id' | 'limit_id'>[]
  ) => Promise<ItemStockLimit>;
  deleteItemStockLimit: (id: string) => Promise<void>;

  // Purchase Management
  getPurchaseVouchers: (companyId: string) => Promise<PurchaseVoucher[]>;
  createPurchaseVoucher: (
    voucher: Omit<PurchaseVoucher, 'id'>,
    items: Omit<PurchaseItem, 'id' | 'voucher_id'>[],
    tags: Omit<PurchaseTag, 'id' | 'voucher_id' | 'purchase_item_id'>[],
    diamonds: Omit<PurchaseDiamond, 'id' | 'voucher_id' | 'purchase_tag_id'>[]
  ) => Promise<PurchaseVoucher>;
  updatePurchaseVoucher: (
    voucher: PurchaseVoucher,
    items: Omit<PurchaseItem, 'id' | 'voucher_id'>[],
    tags: Omit<PurchaseTag, 'id' | 'voucher_id' | 'purchase_item_id'>[],
    diamonds: Omit<PurchaseDiamond, 'id' | 'voucher_id' | 'purchase_tag_id'>[]
  ) => Promise<void>;
  deletePurchaseVoucher: (id: string) => Promise<void>;

  // Stock Report & PDF Utilities
  getStockReport: (companyId: string, dateFrom: string, dateTo: string) => Promise<any[]>;
  saveToPDF: (fileName?: string) => Promise<{ success: boolean; message: string; filePath?: string }>;

  // Scanner configurations
  getDeviceConfigurations: (companyId: string) => Promise<DeviceConfig[]>;
  saveDeviceConfiguration: (config: Omit<DeviceConfig, 'id'> & { id?: string }) => Promise<DeviceConfig>;

  // Printer configurations
  getPrinterConfigurations: (companyId: string) => Promise<PrinterConfig[]>;
  savePrinterConfiguration: (config: Omit<PrinterConfig, 'id'> & { id?: string }) => Promise<PrinterConfig>;

  // Scan logging
  logScan: (log: Omit<ScanLog, 'id'>) => Promise<ScanLog>;
  getScanHistory: (companyId: string, limit?: number) => Promise<ScanLog[]>;

  // Uniqueness validation
  isBarcodeUnique: (companyId: string, barcode: string) => Promise<boolean>;
  isQRUnique: (companyId: string, qrCode: string) => Promise<boolean>;

  // Cross-DB search
  searchScannedValue: (companyId: string, value: string) => Promise<ScanSearchResult | null>;
}

export interface Party {
  id: string;
  company_id: string;
  code: string;
  name: string;
  group_id?: string;
  group_name?: string;
  mobile?: string;
  phone?: string;
  contact_person?: string;
  ac_short?: string;
  address1?: string;
  address2?: string;
  address3?: string;
  city?: string;
  pin_code?: string;
  city_area?: string;
  gst_no?: string;
  gst_type?: string;
  pan_no?: string;
  state?: string;
  district?: string;
  email?: string;
  ref_by?: string;
  opening_amount?: number;
  opening_amount_type?: 'Dr' | 'Cr';
  opening_gold?: number;
  opening_gold_type?: 'Dr' | 'Cr';
  opening_silver?: number;
  opening_silver_type?: 'Dr' | 'Cr';
  last_visit?: string;
  ledger_date?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Tax {
  id: string;
  company_id: string;
  code: string;
  name: string;
  tax_type?: string;
  tax_desc?: string;
  tax_percent: number;
  add_tax_percent: number;
  ac_code?: string;
  ac_name?: string;
  components_json?: string;
  created_at?: string;
  updated_at?: string;
}

export interface TaxComponent {
  sr: number;
  tax_type: string;
  tax_name: string;
  ac_code: string;
  tax_percent: number;
}

export interface TagOpeningVoucher {
  id: string;
  company_id: string;
  vch_no: string;
  vch_date: string;
  it_type: 'Gold' | 'Silver' | 'Diamond' | 'Platinum' | 'Loose Stones' | 'Others';
  print_file_name: string;
  total_pcs: number;
  total_gr_wt: number;
  total_ls_wt: number;
  total_net_wt: number;
  total_lbr_amt: number;
  total_oth_amt: number;
  total_mrp: number;
  hu_wt?: number;
  huld2?: number;
  huld3?: number;
  huld4?: number;
  employee?: string;
  vch_desc?: string;
  lable_skip?: number;
  created_at?: string;
  updated_at?: string;
  items?: TagOpeningItem[];
  accessories?: TagOpeningAccessory[];
}

export interface TagOpeningItem {
  id: string;
  voucher_id: string;
  sr: number;
  it_code: string;
  tag_no: string;
  counter?: string;
  design?: string;
  size?: string;
  huld?: string;
  pcs: number;
  gr_wt: number;
  ls_wt: number;
  net_wt: number;
  lbr_percent?: number;
  l_type: 'G' | 'F' | 'P';
  lbr_rate?: number;
  lbr_amt?: number;
  oth_amt?: number;
  pr_cost?: number;
  mrp?: number;
  created_at?: string;
}

export interface TagOpeningAccessory {
  id: string;
  voucher_id: string;
  sr: number;
  it_code: string;
  it_name?: string;
  pcs?: number;
  kr_wt?: number;
  kr_ls_percent?: number;
  weight?: number;
  con_percent?: number;
  pw: 'P' | 'W';
  rate?: number;
  it_amt?: number;
  pa_amt?: number;
  net_amt?: number;
  created_at?: string;
}

export interface PartyWiseLabour {
  id: string;
  company_id: string;
  party_id: string;
  product_id: string;
  touch: number;
  wastage_percent: number;
  ghat_percent: number;
  labour_percent: number;
  labour_type?: string;
  labour_rate: number;
  item_rate: number;
  created_at?: string;
  updated_at?: string;
}

export interface ItemStockLimit {
  id: string;
  company_id: string;
  item_code: string;
  item_name: string;
  created_at?: string;
  updated_at?: string;
  details?: ItemStockLimitDetail[];
}

export interface ItemStockLimitDetail {
  id: string;
  limit_id: string;
  sr: number;
  from_wt: number;
  to_wt: number;
  pcs: number;
  labour_percent: number;
  labour_type?: string;
  labour_rate: number;
  created_at?: string;
}

export interface PurchaseVoucher {
  id: string;
  company_id: string;
  vch_no: string;
  vch_date: string;
  vch_time?: string;
  ref_no?: string;
  party_id?: string;
  stl_bill_no?: string;
  employee?: string;
  bank_name?: string;
  vch_desc?: string;
  net_amount?: number;
  discount_amount?: number;
  tax_rate_id?: string;
  tax_amount?: number;
  tcs_amount?: number;
  round_off?: number;
  total_amount?: number;
  cheque_amount?: number;
  card_amount?: number;
  bank_account_id?: string;
  cash_amount?: number;
  kasar_amount?: number;
  outstanding_amount?: number;
  created_at?: string;
  updated_at?: string;
  items?: PurchaseItem[];
  tags?: PurchaseTag[];
  diamonds?: PurchaseDiamond[];
}

export interface PurchaseItem {
  id: string;
  voucher_id: string;
  sr: number;
  it_code: string;
  it_name: string;
  pcs: number;
  gr_wt?: number;
  oth_wt?: number;
  net_wt?: number;
  touch?: number;
  wastage_percent?: number;
  fine?: number;
  con_rate?: number;
  con_percent?: number;
  rate?: number;
  it_amt?: number;
  ltype?: 'G' | 'F' | 'P';
  lrate?: number;
  lamt?: number;
  created_at?: string;
}

export interface PurchaseTag {
  id: string;
  purchase_item_id: string;
  voucher_id: string;
  sr: number;
  it_code: string;
  tag_no: string;
  item_sr?: number;
  counter?: string;
  design?: string;
  size?: string;
  huld?: string;
  pcs: number;
  gr_wt?: number;
  ls_wt?: number;
  net_wt?: number;
  lbr_percent?: number;
  ltype?: 'G' | 'F' | 'P';
  lbr_rate?: number;
  lbr_amt?: number;
  oth_amt?: number;
  pr_cost?: number;
  mrp?: number;
  remark?: string;
  created_at?: string;
}

export interface PurchaseDiamond {
  id: string;
  purchase_tag_id: string;
  voucher_id: string;
  sr: number;
  it_code: string;
  it_name: string;
  tag_no?: string;
  dm_color?: string;
  dm_origin?: string;
  dm_remark?: string;
  dm_sf_no?: string;
  pcs?: number;
  kr_wt?: number;
  created_at?: string;
}

export interface DeviceConfig {
  id?: string;
  company_id: string;
  device_type: 'Barcode_Scanner' | 'QR_Scanner';
  connection_mode: 'HID_Keyboard' | 'Virtual_COM' | 'Webcam';
  port_settings_json?: string;
  prefix?: string;
  suffix?: string;
  is_enabled: number;
}

export interface PrinterConfig {
  id?: string;
  company_id: string;
  printer_name: string;
  printer_type: 'Thermal' | 'Laser_Inkjet' | 'Label_Printer';
  label_size: 'Tag_Label' | 'Sticker_Label' | 'A4_Sheet';
  template_json?: string;
  is_default: number;
}

export interface ScanLog {
  id?: string;
  company_id: string;
  user_id?: string | null;
  device_name?: string;
  screen_name?: string;
  scanned_value: string;
  scan_type: 'Barcode' | 'QR';
  result_status: 'Success' | 'Not_Found' | 'Error';
  scan_time?: string;
}

export interface ScanSearchResult {
  type: 'Product' | 'Tag' | 'PurchaseVoucher' | 'SalesVoucher' | 'Customer' | 'Supplier';
  id: string;
  code: string;
  name: string;
  details: any;
}

