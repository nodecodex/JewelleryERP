import { invoke } from '@tauri-apps/api/core';
import type { IpcApi } from '../../shared/ipc-api';

const isTauri = typeof window !== 'undefined' && ('__TAURI_INTERNALS__' in window || '__TAURI__' in window);

async function callTauri<T>(cmd: string, args?: Record<string, unknown>, fallback?: T): Promise<T> {
  if (isTauri) {
    return invoke<T>(cmd, args);
  }
  if (fallback !== undefined) {
    return fallback;
  }
  // Safe defaults for browser preview / Playwright testing mode
  return [] as unknown as T;
}

export const tauriApi: IpcApi = {
  // Company
  getCompanies: () => callTauri('get_companies', undefined, []),
  createCompany: (company) => callTauri('create_company', { company }, { ...company, id: 'mock-comp-1' } as any),
  updateCompany: (company) => callTauri('update_company', { company }, company),
  deleteCompany: (id) => callTauri('delete_company', { id }, true),

  // Products
  getProducts: (companyId) => callTauri('get_products', { companyId }, []),
  getProductByBarcode: (companyId, barcode) => callTauri('get_product_by_barcode', { companyId, barcode }, null),
  createProduct: (product) => callTauri('create_product', { product }, { ...product, id: 'mock-prod-1' } as any),
  updateProduct: (product) => callTauri('update_product', { product }, undefined as any),
  deleteProduct: (id) => callTauri('delete_product', { id }, true),

  // Customers
  getCustomers: (companyId) => callTauri('get_customers', { companyId }, []),
  createCustomer: (customer) => callTauri('create_party', { party: customer }, { ...customer, id: 'mock-cust-1' } as any),
  updateCustomer: (customer) => callTauri('update_party', { party: customer }, undefined as any),

  // Suppliers
  getSuppliers: (companyId) => callTauri('get_suppliers', { companyId }, []),
  createSupplier: (supplier) => callTauri('create_party', { party: supplier }, { ...supplier, id: 'mock-supp-1' } as any),
  updateSupplier: (supplier) => callTauri('update_party', { party: supplier }, undefined as any),

  // Invoices
  createInvoice: (invoice, items) => callTauri('create_invoice', { invoice, items }, { ...invoice, id: 'mock-inv-1', items } as any),
  getInvoices: (companyId) => callTauri('get_invoices', { companyId }, []),
  getNextInvoiceNumber: (companyId, invoiceType) => callTauri('get_next_invoice_number', { companyId, invoiceType }, 'INV-1001'),
  deleteInvoice: (id) => callTauri('delete_invoice', { id }, true),
  getTagStockReport: (companyId) => callTauri('get_tag_stock_report', { companyId }, []),
  getTagAccessories: (source, voucherId, tagId) => callTauri('get_tag_accessories', { source, voucherId, tagId }, []),

  // Accounting / Vouchers
  getAccounts: (companyId) => callTauri('get_accounts', { companyId }, []),
  createAccount: (account) => callTauri('create_account', { account }, { ...account, id: 'mock-acc-1' } as any),
  createVoucher: (voucher, items) => callTauri('create_voucher', { voucher, items }, { ...voucher, id: 'mock-vch-1', items } as any),
  getVouchers: (companyId) => callTauri('get_vouchers', { companyId }, []),
  getLedgerReport: (companyId, accountId, startDate, endDate) => callTauri('get_ledger_report', { companyId, accountId, startDate, endDate }, []),

  // DB Sync Event
  onDatabaseUpdated: (_callback) => () => {},

  // Rates
  getDailyRates: (companyId) => callTauri('get_daily_rates', { companyId }, []),
  saveDailyRates: (rate) => callTauri('save_daily_rates', { rate }, { ...rate, id: 'mock-rate-1' } as any),

  // Licensing
  getDeviceId: () => callTauri('get_device_id_command', undefined, 'TEST-DEVICE-ID-12345'),
  getLicenseStatus: async () => {
    const res = await callTauri('get_license_status', undefined, {
      activated: false,
      deviceId: 'TEST-DEVICE-ID-12345',
      isTrial: false,
      isTrialActive: false,
      trialDaysRemaining: 0,
      statusMessage: 'No license activated. Please activate or start a trial.'
    } as any);
    return {
      ...res,
      isTrialActive: res?.isTrialActive ?? (res?.isTrial && (res?.trialDaysRemaining ?? 0) > 0)
    };
  },
  activateLicense: async (key) => {
    const res = await callTauri('activate_license', { key }, {
      activated: true,
      deviceId: 'TEST-DEVICE-ID-12345',
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
      deviceId: 'TEST-DEVICE-ID-12345',
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
    deviceId: 'TEST-DEVICE-ID-12345',
    licenseKey: key,
    isTrial: false,
    isTrialActive: false,
    statusMessage: 'License Recovered'
  } as any),
  requestTransfer: (key, reason) => callTauri('request_transfer', { key, reason }, true),
  onLicenseInvalidated: (_callback) => () => {},

  // Backup
  createBackup: (destPath) => callTauri('create_backup', { destPath }, 'backup.zip'),
  restoreBackup: (zipPath) => callTauri('restore_backup', { zipPath }, true),

  // Sync
  syncWithCloud: (companyId) => callTauri('sync_with_cloud', { companyId }, { success: true } as any),

  // Users
  getUsers: (companyId) => callTauri('get_users', { companyId }, []),
  createUser: (user) => callTauri('create_user', { user }, { ...user, id: 'mock-user-1' } as any),
  updateUserPermissions: (id, permissionsJson) => callTauri('update_user_permissions', { id, permissionsJson }, true),
  updateUserPassword: (id, oldPassword, newPassword) => callTauri('update_user_password', { id, oldPassword, newPassword }, true),
  deleteUser: (id) => callTauri('delete_user', { id }, true),

  // Parties
  getParties: (companyId) => callTauri('get_parties', { companyId }, []),
  createParty: (party) => callTauri('create_party', { party }, { ...party, id: 'mock-party-1' } as any),
  updateParty: (party) => callTauri('update_party', { party }, party),
  deleteParty: (id) => callTauri('delete_party', { id }, true),

  // Taxes
  getTaxes: (companyId) => callTauri('get_taxes', { companyId }, []),
  createTax: (tax) => callTauri('create_tax', { tax }, { ...tax, id: 'mock-tax-1' } as any),
  updateTax: (tax) => callTauri('update_tax', { tax }, tax),
  deleteTax: (id) => callTauri('delete_tax', { id }, true),

  // Tag Opening
  getTagOpeningVouchers: (companyId) => callTauri('get_tag_opening_vouchers', { companyId }, []),
  createTagOpeningVoucher: (voucher, items, accessories) => callTauri('create_tag_opening_voucher', { voucher, items, accessories }, { ...voucher, id: 'mock-tag-vch-1', items, accessories } as any),
  updateTagOpeningVoucher: (voucher, items, accessories) => callTauri('update_tag_opening_voucher', { voucher, items, accessories }, { ...voucher, items, accessories } as any),
  deleteTagOpeningVoucher: (id) => callTauri('delete_tag_opening_voucher', { id }, true),

  // Party Wise Labour
  getPartyWiseLabour: (companyId, partyId) => callTauri('get_party_wise_labour', { companyId, partyId }, []),
  savePartyWiseLabour: (companyId, partyId, entries) => callTauri('save_party_wise_labour', { companyId, partyId, entries }, true),
  deletePartyWiseLabour: (companyId, partyId) => callTauri('delete_party_wise_labour', { companyId, partyId }, true),

  // Item Stock Limit
  getItemStockLimits: (companyId) => callTauri('get_item_stock_limits', { companyId }, []),
  saveItemStockLimit: (companyId, limit, details) => callTauri('save_item_stock_limit', { companyId, limit, details }, { ...limit, details } as any),
  deleteItemStockLimit: (id) => callTauri('delete_item_stock_limit', { id }, true),

  // Purchase Management
  getPurchaseVouchers: (companyId) => callTauri('get_purchase_vouchers', { companyId }, []),
  createPurchaseVoucher: (voucher, items, tags, diamonds) => callTauri('create_purchase_voucher', { voucher, items, tags, diamonds }, { ...voucher, id: 'mock-purch-vch-1', items } as any),
  updatePurchaseVoucher: (voucher, items, tags, diamonds) => callTauri('update_purchase_voucher', { voucher, items, tags, diamonds }, { ...voucher, items } as any),
  deletePurchaseVoucher: (id) => callTauri('delete_purchase_voucher', { id }, true),

  // Stock Report & PDF Utilities
  getStockReport: (companyId, dateFrom, dateTo) => callTauri('get_stock_report', { companyId, dateFrom, dateTo }, []),
  saveToPDF: (fileName) => callTauri('save_to_pdf', { fileName }, `Exported ${fileName}`),

  // Scanner configuration & history
  getDeviceConfigurations: (companyId) => callTauri('get_device_configurations', { companyId }, []),
  saveDeviceConfiguration: (config) => callTauri('save_device_configuration', { config }, config),
  getPrinterConfigurations: (companyId) => callTauri('get_printer_configurations', { companyId }, []),
  savePrinterConfiguration: (config) => callTauri('save_printer_configuration', { config }, config),
  logScan: (log) => callTauri('log_scan', { log }, { ...log, id: 'mock-scan-log-1' } as any),
  getScanHistory: (companyId, limit) => callTauri('get_scan_history', { companyId, limit }, []),
  isBarcodeUnique: (companyId, barcode) => callTauri('is_barcode_unique', { companyId, barcode }, true),
  isQRUnique: (companyId, qrCode) => callTauri('is_qr_unique', { companyId, qrCode }, true),
  searchScannedValue: (companyId, value) => callTauri('search_scanned_value', { companyId, value }, null)
};

// Polyfill window.api automatically if running in Tauri or browser
if (typeof window !== 'undefined') {
  if (!window.api) {
    (window as any).api = tauriApi;
  }
}
