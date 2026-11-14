import { invoke } from '@tauri-apps/api/core';
import type { IpcApi, Company, Product, Customer, DailyRate, Account, SalesInvoice } from '../../shared/ipc-api';

const isTauri = typeof window !== 'undefined' && ('__TAURI_INTERNALS__' in window || '__TAURI__' in window);

async function callTauri<T>(cmd: string, args?: Record<string, unknown>, fallback?: T): Promise<T> {
  if (isTauri) {
    return invoke<T>(cmd, args);
  }
  if (fallback !== undefined) {
    return fallback;
  }
  return [] as unknown as T;
}

// ── Realistic Mock Data for Desktop UI Preview & Playwright Visual Suite ──
const MOCK_COMPANY: Company = {
  id: 'comp-swarnpro-01',
  name: 'SwarnPro Jewellers & Sons (Main Showroom)',
  financial_year_start: '2026-04-01',
  financial_year_end: '2027-03-31',
  gstin: '24AAACJ1234F1Z5',
  pan: 'AAACJ1234F',
  phone: '+91 98765 43210',
  email: 'contact@swarnpro.com',
  address: 'Shop 12-14, Gold Souk Market, Zaveri Bazaar, Mumbai - 400002',
  bank_name: 'HDFC Bank',
  bank_account_no: '50200012345678',
  bank_ifsc: 'HDFC0001234',
  settings_json: JSON.stringify({ printFormat: 'Standard_A4', allowNegativeStock: false }),
  created_at: new Date().toISOString()
};

const MOCK_RATES: DailyRate = {
  id: 'rate-01',
  company_id: 'comp-swarnpro-01',
  rate_date: new Date().toISOString().split('T')[0],
  gold_rate_24k: 76500,
  gold_rate_22k: 70150,
  gold_rate_18k: 57400,
  silver_rate: 91500,
  employee: 'Head Cashier'
};

const MOCK_PRODUCTS: Product[] = [
  {
    id: 'prod-01',
    company_id: 'comp-swarnpro-01',
    name: '22K Traditional Bridal Choker Necklace',
    sku: 'NKL-22K-001',
    barcode: 'TAG-100234',
    qr_code: 'TAG-100234',
    category: 'Gold Jewellery',
    weight: 42.500,
    tounch: 91.6,
    gross_weight: 43.100,
    fine: 38.930,
    purity: '22K (916)',
    stone_weight: 0.600,
    making_charges: 450.0,
    making_charges_type: 'per_gram',
    hsn_code: '7113',
    gst_rate: 3.0,
    purchase_price: 245000,
    selling_price: 286500,
    current_stock: 4,
    created_at: new Date().toISOString()
  },
  {
    id: 'prod-02',
    company_id: 'comp-swarnpro-01',
    name: '22K Antique Temple Kada Bangles Pair',
    sku: 'BNG-22K-004',
    barcode: 'TAG-100235',
    qr_code: 'TAG-100235',
    category: 'Gold Jewellery',
    weight: 28.200,
    tounch: 91.6,
    gross_weight: 28.200,
    fine: 25.831,
    purity: '22K (916)',
    stone_weight: 0.0,
    making_charges: 380.0,
    making_charges_type: 'per_gram',
    hsn_code: '7113',
    gst_rate: 3.0,
    purchase_price: 165000,
    selling_price: 194800,
    current_stock: 6,
    created_at: new Date().toISOString()
  },
  {
    id: 'prod-03',
    company_id: 'comp-swarnpro-01',
    name: '18K Solitaire Diamond Ring (VVS-EF)',
    sku: 'RNG-18K-DIA',
    barcode: 'TAG-100236',
    qr_code: 'TAG-100236',
    category: 'Diamond Jewellery',
    weight: 4.850,
    tounch: 75.0,
    gross_weight: 5.120,
    fine: 3.637,
    purity: '18K (750)',
    stone_weight: 0.270,
    making_charges: 6500.0,
    making_charges_type: 'fixed',
    hsn_code: '7113',
    gst_rate: 3.0,
    purchase_price: 78000,
    selling_price: 98500,
    current_stock: 2,
    created_at: new Date().toISOString()
  },
  {
    id: 'prod-04',
    company_id: 'comp-swarnpro-01',
    name: '925 Sterling Silver Pooja Thali Set',
    sku: 'SLV-THL-001',
    barcode: 'TAG-100237',
    qr_code: 'TAG-100237',
    category: 'Silver Jewellery',
    weight: 350.000,
    tounch: 92.5,
    gross_weight: 350.000,
    fine: 323.750,
    purity: '925 Fine',
    stone_weight: 0.0,
    making_charges: 18.0,
    making_charges_type: 'per_gram',
    hsn_code: '7114',
    gst_rate: 3.0,
    purchase_price: 28000,
    selling_price: 36500,
    current_stock: 8,
    created_at: new Date().toISOString()
  }
];

const MOCK_CUSTOMERS: Customer[] = [
  {
    id: 'cust-01',
    company_id: 'comp-swarnpro-01',
    name: 'Rajeshbhai J. Shah',
    mobile: '9825012345',
    address: 'B-402, Shivalik Residency, Ahmedabad',
    pan: 'ABCPS1234K',
    gstin: '24ABCPS1234K1Z2',
    loyalty_points: 450
  },
  {
    id: 'cust-02',
    company_id: 'comp-swarnpro-01',
    name: 'Priyanka M. Agarwal',
    mobile: '9909988776',
    address: '14, Silver Oak Bunglows, Surat',
    loyalty_points: 120
  }
];

const MOCK_INVOICES: SalesInvoice[] = [
  {
    id: 'inv-01',
    company_id: 'comp-swarnpro-01',
    invoice_number: 'GST-2026-00142',
    invoice_date: new Date().toISOString().split('T')[0],
    customer_id: 'cust-01',
    invoice_type: 'GST',
    tax_type: 'CGST_SGST',
    gross_amount: 278155,
    discount_amount: 0,
    tax_amount: 8345,
    making_charges_total: 19125,
    round_off: 0,
    net_amount: 286500,
    payment_mode: 'UPI',
    paid_amount: 286500,
    balance_amount: 0,
    status: 'Paid'
  },
  {
    id: 'inv-02',
    company_id: 'comp-swarnpro-01',
    invoice_number: 'GST-2026-00143',
    invoice_date: new Date().toISOString().split('T')[0],
    customer_id: 'cust-02',
    invoice_type: 'GST',
    tax_type: 'CGST_SGST',
    gross_amount: 184080,
    discount_amount: 0,
    tax_amount: 5520,
    making_charges_total: 10720,
    round_off: 0,
    net_amount: 194800,
    payment_mode: 'Cash',
    paid_amount: 194800,
    balance_amount: 0,
    status: 'Paid'
  }
];

const MOCK_ACCOUNTS: Account[] = [
  { id: 'acc-01', company_id: 'comp-swarnpro-01', name: 'Cash in Hand', code: 'CASH', parent_group: 'Cash', opening_balance: 150000, current_balance: 245000 },
  { id: 'acc-02', company_id: 'comp-swarnpro-01', name: 'HDFC Current A/C', code: 'BANK-HDFC', parent_group: 'Bank', opening_balance: 850000, current_balance: 1240000 },
  { id: 'acc-03', company_id: 'comp-swarnpro-01', name: 'Sales Account (Gold)', code: 'SALES-GOLD', parent_group: 'Sales', opening_balance: 0, current_balance: 5840000 },
  { id: 'acc-04', company_id: 'comp-swarnpro-01', name: 'Purchase Account (Bullion)', code: 'PUR-BULLION', parent_group: 'Purchase', opening_balance: 0, current_balance: 4210000 }
];

export const tauriApi: IpcApi = {
  // Company
  getCompanies: () => callTauri('get_companies', undefined, [MOCK_COMPANY]),
  createCompany: (company) => callTauri('create_company', { company }, { ...company, id: 'mock-comp-1' } as any),
  updateCompany: async (company) => { await callTauri('update_company', { company }, company); },
  deleteCompany: async (id) => { await callTauri('delete_company', { id }, true); },

  // Products
  getProducts: (companyId) => callTauri('get_products', { companyId }, MOCK_PRODUCTS),
  getProductByBarcode: (companyId, barcode) => callTauri('get_product_by_barcode', { companyId, barcode }, MOCK_PRODUCTS.find(p => p.barcode === barcode) || MOCK_PRODUCTS[0]),
  createProduct: (product) => callTauri('create_product', { product }, { ...product, id: 'mock-prod-' + Date.now() } as any),
  updateProduct: async (product) => { await callTauri('update_product', { product }, undefined); },
  deleteProduct: async (id) => { await callTauri('delete_product', { id }, true); },

  // Customers
  getCustomers: (companyId) => callTauri('get_customers', { companyId }, MOCK_CUSTOMERS),
  createCustomer: (customer) => callTauri('create_party', { party: customer }, { ...customer, id: 'mock-cust-' + Date.now() } as any),
  updateCustomer: async (customer) => { await callTauri('update_party', { party: customer }, undefined); },

  // Suppliers
  getSuppliers: (companyId) => callTauri('get_suppliers', { companyId }, [
    { id: 'supp-01', company_id: 'comp-swarnpro-01', name: 'Kalyan Bullion Refinery', mobile: '9824098765', gstin: '24AABCK1234L1Z1' }
  ]),
  createSupplier: (supplier) => callTauri('create_party', { party: supplier }, { ...supplier, id: 'mock-supp-1' } as any),
  updateSupplier: async (supplier) => { await callTauri('update_party', { party: supplier }, undefined); },

  // Invoices
  createInvoice: (invoice, items) => callTauri('create_invoice', { invoice, items }, { ...invoice, id: 'mock-inv-1', items } as any),
  getInvoices: (companyId) => callTauri('get_invoices', { companyId }, MOCK_INVOICES),
  getNextInvoiceNumber: (companyId, invoiceType) => callTauri('get_next_invoice_number', { companyId, invoiceType }, 'GST-2026-00144'),
  deleteInvoice: async (id) => { await callTauri('delete_invoice', { id }, true); },
  getTagStockReport: (companyId) => callTauri('get_tag_stock_report', { companyId }, []),
  getTagAccessories: (source, voucherId, tagId) => callTauri('get_tag_accessories', { source, voucherId, tagId }, []),

  // Accounting / Vouchers
  getAccounts: (companyId) => callTauri('get_accounts', { companyId }, MOCK_ACCOUNTS),
  createAccount: (account) => callTauri('create_account', { account }, { ...account, id: 'mock-acc-1' } as any),
  createVoucher: (voucher, items) => callTauri('create_voucher', { voucher, items }, { ...voucher, id: 'mock-vch-1', items } as any),
  getVouchers: (companyId) => callTauri('get_vouchers', { companyId }, []),
  getLedgerReport: (companyId, accountId, startDate, endDate) => callTauri('get_ledger_report', { companyId, accountId, startDate, endDate }, []),

  // DB Sync Event
  onDatabaseUpdated: (_callback) => () => {},

  // Rates
  getDailyRates: (companyId) => callTauri('get_daily_rates', { companyId }, [MOCK_RATES]),
  saveDailyRates: (rate) => callTauri('save_daily_rates', { rate }, { ...rate, id: 'mock-rate-1' } as any),

  // Licensing
  getDeviceId: () => callTauri('get_device_id_command', undefined, '0C5E79BAC3CC963730931776E1A383DC55126128347B51588FCED4C66'),
  getLicenseStatus: async () => {
    // If testing locked license explicitly via URL
    const isLockedMode = typeof window !== 'undefined' && window.location.search.includes('locked=true');
    const res = await callTauri('get_license_status', undefined, {
      activated: false,
      deviceId: '0C5E79BAC3CC963730931776E1A383DC55126128347B51588FCED4C66',
      isTrial: !isLockedMode,
      isTrialActive: !isLockedMode,
      trialDaysRemaining: isLockedMode ? 0 : 6,
      statusMessage: isLockedMode ? 'No license activated. Please activate or start a trial.' : 'Trial Mode: 6 days remaining.'
    } as any);
    return {
      ...res,
      isTrialActive: res?.isTrialActive ?? (res?.isTrial && (res?.trialDaysRemaining ?? 0) > 0)
    };
  },
  activateLicense: async (key) => {
    const res = await callTauri('activate_license', { key }, {
      activated: true,
      deviceId: '0C5E79BAC3CC963730931776E1A383DC55126128347B51588FCED4C66',
      licenseKey: key,
      isTrial: false,
      isTrialActive: false,
      statusMessage: 'Lifetime Premium License Active'
    } as any);
    return {
      ...res,
      isTrialActive: false
    };
  },
  startTrial: async () => {
    const res = await callTauri('start_trial', undefined, {
      activated: false,
      deviceId: '0C5E79BAC3CC963730931776E1A383DC55126128347B51588FCED4C66',
      isTrial: true,
      isTrialActive: true,
      trialDaysRemaining: 7,
      statusMessage: 'Trial Mode: 7 days remaining.'
    } as any);
    return {
      ...res,
      isTrialActive: res?.isTrialActive ?? true
    };
  },
  recoverLicense: (key, mobile) => callTauri('recover_license', { key, mobile }, {
    activated: true,
    deviceId: '0C5E79BAC3CC963730931776E1A383DC55126128347B51588FCED4C66',
    licenseKey: key,
    isTrial: false,
    isTrialActive: false,
    statusMessage: 'License Recovered'
  } as any),
  requestTransfer: (key, reason) => callTauri('request_transfer', { key, reason }, {
    activated: false,
    deviceId: '0C5E79BAC3CC963730931776E1A383DC55126128347B51588FCED4C66',
    licenseKey: key,
    isTrial: false,
    isTrialActive: false,
    statusMessage: 'Transfer Requested'
  } as any),
  onLicenseInvalidated: (_callback) => () => {},

  // Backup
  createBackup: (destPath) => callTauri('create_backup', { destPath }, {
    success: true,
    path: destPath || 'backup.zip',
    message: 'Backup created successfully'
  }),
  restoreBackup: (zipPath) => callTauri('restore_backup', { zipPath }, {
    success: true,
    path: zipPath,
    message: 'Backup restored successfully'
  }),

  // Sync
  syncWithCloud: (companyId) => callTauri('sync_with_cloud', { companyId }, { success: true } as any),

  // Users
  getUsers: (companyId) => callTauri('get_users', { companyId }, [
    { id: 'usr-01', company_id: companyId, username: 'admin', role: 'Admin', permissions_json: '{"all":true}' }
  ]),
  createUser: (user) => callTauri('create_user', { user }, { ...user, id: 'mock-user-1' } as any),
  updateUserPermissions: async (id, permissionsJson) => { await callTauri('update_user_permissions', { id, permissionsJson }, true); },
  updateUserPassword: (id, oldPassword, newPassword) => callTauri('update_user_password', { id, oldPassword, newPassword }, {
    success: true,
    message: 'Password updated successfully'
  }),
  deleteUser: async (id) => { await callTauri('delete_user', { id }, true); },

  // Parties
  getParties: (companyId) => callTauri('get_parties', { companyId }, [
    { id: 'pty-01', company_id: 'comp-swarnpro-01', code: 'P001', name: 'Rajeshbhai J. Shah', party_type: 'Customer', mobile: '9825012345', city: 'Mumbai' },
    { id: 'pty-02', company_id: 'comp-swarnpro-01', code: 'S001', name: 'Kalyan Bullion Refinery', party_type: 'Supplier', mobile: '9824098765', city: 'Ahmedabad' }
  ]),
  createParty: (party) => callTauri('create_party', { party }, { ...party, id: 'mock-party-1' } as any),
  updateParty: async (party) => { await callTauri('update_party', { party }, party); },
  deleteParty: async (id) => { await callTauri('delete_party', { id }, true); },

  // Taxes
  getTaxes: (companyId) => callTauri('get_taxes', { companyId }, [
    { id: 'tax-01', company_id: 'comp-swarnpro-01', code: 'GST3', name: 'GST 3%', rate: 3.0, tax_percent: 3.0, add_tax_percent: 0.0, cgst_rate: 1.5, sgst_rate: 1.5, igst_rate: 3.0 }
  ]),
  createTax: (tax) => callTauri('create_tax', { tax }, { ...tax, id: 'mock-tax-1' } as any),
  updateTax: async (tax) => { await callTauri('update_tax', { tax }, tax); },
  deleteTax: async (id) => { await callTauri('delete_tax', { id }, true); },

  // Labour
  getPartyWiseLabour: (companyId, partyId) => callTauri('get_party_wise_labour', { companyId, partyId }, []),
  savePartyWiseLabour: async (companyId, partyId, labour) => { await callTauri('save_party_wise_labour', { companyId, partyId, labour }, labour as any); },
  deletePartyWiseLabour: async (companyId, partyId) => { await callTauri('delete_party_wise_labour', { companyId, partyId }, true); },

  // Item Stock Limits
  getItemStockLimits: (companyId) => callTauri('get_item_stock_limits', { companyId }, []),
  saveItemStockLimit: (companyId, limit, details) => callTauri('save_item_stock_limit', { companyId, limit, details }, limit as any),
  deleteItemStockLimit: async (id) => { await callTauri('delete_item_stock_limit', { id }, true); },

  // Tag Opening
  getTagOpeningVouchers: (companyId) => callTauri('get_tag_opening_vouchers', { companyId }, []),
  createTagOpeningVoucher: (voucher, items, accessories) => callTauri('create_tag_opening_voucher', { voucher, items, accessories }, voucher as any),
  updateTagOpeningVoucher: async (voucher, items, accessories) => { await callTauri('update_tag_opening_voucher', { voucher, items, accessories }, voucher as any); },
  deleteTagOpeningVoucher: async (id) => { await callTauri('delete_tag_opening_voucher', { id }, true); },

  // Purchase
  getPurchaseVouchers: (companyId) => callTauri('get_purchase_vouchers', { companyId }, []),
  createPurchaseVoucher: (voucher, items, tags, diamonds) => callTauri('create_purchase_voucher', { voucher, items, tags, diamonds }, voucher as any),
  updatePurchaseVoucher: async (voucher, items, tags, diamonds) => { await callTauri('update_purchase_voucher', { voucher, items, tags, diamonds }, voucher as any); },
  deletePurchaseVoucher: async (id) => { await callTauri('delete_purchase_voucher', { id }, true); },

  // Stock Report & PDF Utilities
  getStockReport: (companyId: string, dateFrom: string, dateTo: string) => callTauri('get_stock_report', { companyId, dateFrom, dateTo }, []),
  saveToPDF: (fileName?: string) => callTauri('save_to_pdf', { fileName }, { success: true, message: 'PDF generated' }),

  // Hardware Scanner configurations
  getDeviceConfigurations: (companyId: string) => callTauri('get_device_configurations', { companyId }, [
    { id: 'dev-01', company_id: companyId, device_type: 'Barcode_Scanner', connection_mode: 'HID_Keyboard', prefix: '', suffix: 'Enter', is_enabled: 1 },
    { id: 'dev-02', company_id: companyId, device_type: 'QR_Scanner', connection_mode: 'HID_Keyboard', prefix: '', suffix: 'Enter', is_enabled: 1 }
  ]),
  saveDeviceConfiguration: (config: any) => callTauri('save_device_configuration', { config }, { ...config, id: config.id || 'dev-' + Date.now() } as any),

  // Hardware Printer configurations
  getPrinterConfigurations: (companyId: string) => callTauri('get_printer_configurations', { companyId }, []),
  savePrinterConfiguration: (config: any) => callTauri('save_printer_configuration', { config }, { ...config, id: config.id || 'prn-' + Date.now() } as any),

  // Scan logging & Uniqueness
  logScan: (log: any) => callTauri('log_scan', { log }, { ...log, id: 'scan-' + Date.now(), scanned_at: new Date().toISOString() } as any),
  getScanHistory: (companyId: string, limit?: number) => callTauri('get_scan_history', { companyId, limit }, []),
  isBarcodeUnique: (companyId: string, barcode: string) => callTauri('is_barcode_unique', { companyId, barcode }, true),
  isQRUnique: (companyId: string, qrCode: string) => callTauri('is_qr_unique', { companyId, qrCode }, true),
  searchScannedValue: (companyId: string, value: string) => callTauri('search_scanned_value', { companyId, value }, null)
};

if (typeof window !== 'undefined') {
  (window as any).api = tauriApi;
}
