import { contextBridge, ipcRenderer } from 'electron';
import type { IpcApi } from '../shared/ipc-api';

const api: IpcApi = {
  // Company
  getCompanies: () => ipcRenderer.invoke('getCompanies'),
  createCompany: (company) => ipcRenderer.invoke('createCompany', company),
  updateCompany: (company) => ipcRenderer.invoke('updateCompany', company),
  deleteCompany: (id) => ipcRenderer.invoke('deleteCompany', id),

  // Products
  getProducts: (companyId) => ipcRenderer.invoke('getProducts', companyId),
  getProductByBarcode: (companyId, barcode) => ipcRenderer.invoke('getProductByBarcode', companyId, barcode),
  createProduct: (product) => ipcRenderer.invoke('createProduct', product),
  updateProduct: (product) => ipcRenderer.invoke('updateProduct', product),
  deleteProduct: (id) => ipcRenderer.invoke('deleteProduct', id),

  // Customers
  getCustomers: (companyId) => ipcRenderer.invoke('getCustomers', companyId),
  createCustomer: (customer) => ipcRenderer.invoke('createCustomer', customer),
  updateCustomer: (customer) => ipcRenderer.invoke('updateCustomer', customer),

  // Suppliers
  getSuppliers: (companyId) => ipcRenderer.invoke('getSuppliers', companyId),
  createSupplier: (supplier) => ipcRenderer.invoke('createSupplier', supplier),
  updateSupplier: (supplier) => ipcRenderer.invoke('updateSupplier', supplier),

  // Invoices
  createInvoice: (invoice, items) => ipcRenderer.invoke('createInvoice', invoice, items),
  getInvoices: (companyId) => ipcRenderer.invoke('getInvoices', companyId),
  getNextInvoiceNumber: (companyId, type) => ipcRenderer.invoke('getNextInvoiceNumber', companyId, type),
  deleteInvoice: (id) => ipcRenderer.invoke('deleteInvoice', id),
  getTagStockReport: (companyId) => ipcRenderer.invoke('getTagStockReport', companyId),
  getTagAccessories: (source, voucherId, tagId) => ipcRenderer.invoke('getTagAccessories', source, voucherId, tagId),

  // Accounting / Vouchers
  getAccounts: (companyId) => ipcRenderer.invoke('getAccounts', companyId),
  createAccount: (account) => ipcRenderer.invoke('createAccount', account),
  createVoucher: (voucher, items) => ipcRenderer.invoke('createVoucher', voucher, items),
  getVouchers: (companyId) => ipcRenderer.invoke('getVouchers', companyId),
  getLedgerReport: (companyId, accountId, startDate, endDate) => ipcRenderer.invoke('getLedgerReport', companyId, accountId, startDate, endDate),

  // DB Sync Event
  onDatabaseUpdated: (callback) => {
    const listener = () => callback();
    ipcRenderer.on('database-updated', listener);
    return () => {
      ipcRenderer.removeListener('database-updated', listener);
    };
  },

  // Rates
  getDailyRates: (companyId) => ipcRenderer.invoke('getDailyRates', companyId),
  saveDailyRates: (rate) => ipcRenderer.invoke('saveDailyRates', rate),

  // Licensing
  getDeviceId: () => ipcRenderer.invoke('getDeviceId'),
  getLicenseStatus: () => ipcRenderer.invoke('getLicenseStatus'),
  activateLicense: (key) => ipcRenderer.invoke('activateLicense', key),
  startTrial: () => ipcRenderer.invoke('startTrial'),
  recoverLicense: (key, mobile) => ipcRenderer.invoke('recoverLicense', key, mobile),
  requestTransfer: (key, reason) => ipcRenderer.invoke('requestTransfer', key, reason),
  onLicenseInvalidated: (callback) => {
    const listener = () => callback();
    ipcRenderer.on('license-invalidated', listener);
    return () => {
      ipcRenderer.removeListener('license-invalidated', listener);
    };
  },

  // Backup
  createBackup: (destPath) => ipcRenderer.invoke('createBackup', destPath),
  restoreBackup: (zipPath) => ipcRenderer.invoke('restoreBackup', zipPath),

  // Sync
  syncWithCloud: (companyId) => ipcRenderer.invoke('syncWithCloud', companyId),

  // Users
  getUsers: (companyId) => ipcRenderer.invoke('getUsers', companyId),
  createUser: (user) => ipcRenderer.invoke('createUser', user),
  updateUserPermissions: (id, permissionsJson) => ipcRenderer.invoke('updateUserPermissions', id, permissionsJson),
  updateUserPassword: (id, oldPassword, newPassword) => ipcRenderer.invoke('updateUserPassword', id, oldPassword, newPassword),
  deleteUser: (id) => ipcRenderer.invoke('deleteUser', id),

  // Parties
  getParties: (companyId) => ipcRenderer.invoke('getParties', companyId),
  createParty: (party) => ipcRenderer.invoke('createParty', party),
  updateParty: (party) => ipcRenderer.invoke('updateParty', party),
  deleteParty: (id) => ipcRenderer.invoke('deleteParty', id),

  // Taxes
  getTaxes: (companyId) => ipcRenderer.invoke('getTaxes', companyId),
  createTax: (tax) => ipcRenderer.invoke('createTax', tax),
  updateTax: (tax) => ipcRenderer.invoke('updateTax', tax),
  deleteTax: (id) => ipcRenderer.invoke('deleteTax', id),

  // Tag Opening
  getTagOpeningVouchers: (companyId) => ipcRenderer.invoke('getTagOpeningVouchers', companyId),
  createTagOpeningVoucher: (voucher, items, accessories) => ipcRenderer.invoke('createTagOpeningVoucher', voucher, items, accessories),
  updateTagOpeningVoucher: (voucher, items, accessories) => ipcRenderer.invoke('updateTagOpeningVoucher', voucher, items, accessories),
  deleteTagOpeningVoucher: (id) => ipcRenderer.invoke('deleteTagOpeningVoucher', id),

  // Party Wise Labour
  getPartyWiseLabour: (companyId, partyId) => ipcRenderer.invoke('getPartyWiseLabour', companyId, partyId),
  savePartyWiseLabour: (companyId, partyId, entries) => ipcRenderer.invoke('savePartyWiseLabour', companyId, partyId, entries),
  deletePartyWiseLabour: (companyId, partyId) => ipcRenderer.invoke('deletePartyWiseLabour', companyId, partyId),

  // Item Stock Limit
  getItemStockLimits: (companyId) => ipcRenderer.invoke('getItemStockLimits', companyId),
  saveItemStockLimit: (companyId, limit, details) => ipcRenderer.invoke('saveItemStockLimit', companyId, limit, details),
  deleteItemStockLimit: (id) => ipcRenderer.invoke('deleteItemStockLimit', id),

  // Purchase Management
  getPurchaseVouchers: (companyId) => ipcRenderer.invoke('getPurchaseVouchers', companyId),
  createPurchaseVoucher: (voucher, items, tags, diamonds) => ipcRenderer.invoke('createPurchaseVoucher', voucher, items, tags, diamonds),
  updatePurchaseVoucher: (voucher, items, tags, diamonds) => ipcRenderer.invoke('updatePurchaseVoucher', voucher, items, tags, diamonds),
  deletePurchaseVoucher: (id) => ipcRenderer.invoke('deletePurchaseVoucher', id),

  // Stock Report & PDF Utilities
  getStockReport: (companyId, dateFrom, dateTo) => ipcRenderer.invoke('getStockReport', companyId, dateFrom, dateTo),
  saveToPDF: (fileName) => ipcRenderer.invoke('save-to-pdf', fileName),

  // Scanner configuration & history
  getDeviceConfigurations: (companyId) => ipcRenderer.invoke('getDeviceConfigurations', companyId),
  saveDeviceConfiguration: (config) => ipcRenderer.invoke('saveDeviceConfiguration', config),
  getPrinterConfigurations: (companyId) => ipcRenderer.invoke('getPrinterConfigurations', companyId),
  savePrinterConfiguration: (config) => ipcRenderer.invoke('savePrinterConfiguration', config),
  logScan: (log) => ipcRenderer.invoke('logScan', log),
  getScanHistory: (companyId, limit) => ipcRenderer.invoke('getScanHistory', companyId, limit),
  isBarcodeUnique: (companyId, barcode) => ipcRenderer.invoke('isBarcodeUnique', companyId, barcode),
  isQRUnique: (companyId, qrCode) => ipcRenderer.invoke('isQRUnique', companyId, qrCode),
  searchScannedValue: (companyId, value) => ipcRenderer.invoke('searchScannedValue', companyId, value)
};

contextBridge.exposeInMainWorld('api', api);

