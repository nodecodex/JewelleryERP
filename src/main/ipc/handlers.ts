import { ipcMain, BrowserWindow } from 'electron';

function notifyRendererOfDbUpdate(): void {
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send('database-updated');
  }
}
import { CompanyRepository } from '../repositories/company.repository';
import { ProductRepository } from '../repositories/product.repository';
import { CustomerRepository } from '../repositories/customer.repository';
import { SupplierRepository } from '../repositories/supplier.repository';
import { InvoiceRepository } from '../repositories/invoice.repository';
import { VoucherRepository } from '../repositories/voucher.repository';
import { LedgerRepository } from '../repositories/ledger.repository';
import { RateRepository } from '../repositories/rate.repository';
import { UserRepository } from '../repositories/user.repository';
import { PartyRepository } from '../repositories/party.repository';
import { TaxRepository } from '../repositories/tax.repository';
import { TagOpeningRepository } from '../repositories/tag-opening.repository';
import { LabourRepository } from '../repositories/labour.repository';
import { ItStkLimitRepository } from '../repositories/itstk-limit.repository';
import { PurchaseRepository } from '../repositories/purchase.repository';
import { LedrReportRepository } from '../repositories/ledr-report.repository';
import { ScannerRepository } from '../repositories/scanner.repository';
import { LicenseService } from '../services/license.service';
import { BackupService } from '../services/backup.service';
import { SyncService } from '../services/sync.service';

export function registerIpcHandlers(): void {
  // Instantiate Repositories
  const companyRepo = new CompanyRepository();
  const productRepo = new ProductRepository();
  const customerRepo = new CustomerRepository();
  const supplierRepo = new SupplierRepository();
  const invoiceRepo = new InvoiceRepository();
  const voucherRepo = new VoucherRepository();
  const ledgerRepo = new LedgerRepository();
  const rateRepo = new RateRepository();
  const userRepo = new UserRepository();
  const partyRepo = new PartyRepository();
  const taxRepo = new TaxRepository();
  const tagOpeningRepo = new TagOpeningRepository();
  const labourRepo = new LabourRepository();
  const itstkLimitRepo = new ItStkLimitRepository();
  const purchaseRepo = new PurchaseRepository();
  const ledrReportRepo = new LedrReportRepository();
  const scannerRepo = new ScannerRepository();

  // Instantiate Services
  const licenseService = new LicenseService();
  const backupService = new BackupService();
  const syncService = new SyncService();

  // Company API
  ipcMain.handle('getCompanies', async () => {
    return companyRepo.getCompanies();
  });

  ipcMain.handle('createCompany', async (_, company) => {
    const res = await companyRepo.createCompany(company);
    notifyRendererOfDbUpdate();
    return res;
  });

  ipcMain.handle('updateCompany', async (_, company) => {
    const res = await companyRepo.updateCompany(company);
    notifyRendererOfDbUpdate();
    return res;
  });

  ipcMain.handle('deleteCompany', async (_, id) => {
    const res = await companyRepo.deleteCompany(id);
    notifyRendererOfDbUpdate();
    return res;
  });

  // Product API
  ipcMain.handle('getProducts', async (_, companyId) => {
    return productRepo.getProducts(companyId);
  });

  ipcMain.handle('getProductByBarcode', async (_, companyId, barcode) => {
    return productRepo.getProductByBarcode(companyId, barcode);
  });

  ipcMain.handle('createProduct', async (_, product) => {
    const res = await productRepo.createProduct(product);
    notifyRendererOfDbUpdate();
    return res;
  });

  ipcMain.handle('updateProduct', async (_, product) => {
    const res = await productRepo.updateProduct(product);
    notifyRendererOfDbUpdate();
    return res;
  });

  ipcMain.handle('deleteProduct', async (_, id) => {
    const res = await productRepo.deleteProduct(id);
    notifyRendererOfDbUpdate();
    return res;
  });

  // Customer API
  ipcMain.handle('getCustomers', async (_, companyId) => {
    return customerRepo.getCustomers(companyId);
  });

  ipcMain.handle('createCustomer', async (_, customer) => {
    const res = await customerRepo.createCustomer(customer);
    notifyRendererOfDbUpdate();
    return res;
  });

  ipcMain.handle('updateCustomer', async (_, customer) => {
    const res = await customerRepo.updateCustomer(customer);
    notifyRendererOfDbUpdate();
    return res;
  });

  // Supplier API
  ipcMain.handle('getSuppliers', async (_, companyId) => {
    return supplierRepo.getSuppliers(companyId);
  });

  ipcMain.handle('createSupplier', async (_, supplier) => {
    const res = await supplierRepo.createSupplier(supplier);
    notifyRendererOfDbUpdate();
    return res;
  });

  ipcMain.handle('updateSupplier', async (_, supplier) => {
    const res = await supplierRepo.updateSupplier(supplier);
    notifyRendererOfDbUpdate();
    return res;
  });

  // Invoice API
  ipcMain.handle('createInvoice', async (_, invoice, items) => {
    const res = await invoiceRepo.createInvoice(invoice, items);
    notifyRendererOfDbUpdate();
    return res;
  });

  ipcMain.handle('getInvoices', async (_, companyId) => {
    return invoiceRepo.getInvoices(companyId);
  });

  ipcMain.handle('getNextInvoiceNumber', async (_, companyId, type) => {
    return invoiceRepo.getNextInvoiceNumber(companyId, type);
  });

  ipcMain.handle('deleteInvoice', async (_, id) => {
    const res = await invoiceRepo.deleteInvoice(id);
    notifyRendererOfDbUpdate();
    return res;
  });

  ipcMain.handle('getTagStockReport', async (_, companyId) => {
    return ledrReportRepo.getTagStockReport(companyId);
  });

  ipcMain.handle('getTagAccessories', async (_, source, voucherId, tagId) => {
    return ledrReportRepo.getTagAccessories(source, voucherId, tagId);
  });

  // Vouchers / Accounting API
  ipcMain.handle('getAccounts', async (_, companyId) => {
    return ledgerRepo.getAccounts(companyId);
  });

  ipcMain.handle('createAccount', async (_, account) => {
    const res = await ledgerRepo.createAccount(account);
    notifyRendererOfDbUpdate();
    return res;
  });

  ipcMain.handle('createVoucher', async (_, voucher, items) => {
    const res = await voucherRepo.createVoucher(voucher, items);
    notifyRendererOfDbUpdate();
    return res;
  });

  ipcMain.handle('getVouchers', async (_, companyId) => {
    return voucherRepo.getVouchers(companyId);
  });

  ipcMain.handle('getLedgerReport', async (_, companyId, accountId, startDate, endDate) => {
    return ledgerRepo.getLedgerReport(companyId, accountId, startDate, endDate);
  });

  // Daily Metal Rates
  ipcMain.handle('getDailyRates', async (_, companyId) => {
    return rateRepo.getDailyRates(companyId);
  });

  ipcMain.handle('saveDailyRates', async (_, rate) => {
    const res = await rateRepo.saveDailyRates(rate);
    notifyRendererOfDbUpdate();
    return res;
  });

  // Licensing API
  ipcMain.handle('getDeviceId', async () => {
    return licenseService.getDeviceId();
  });

  ipcMain.handle('getLicenseStatus', async () => {
    return licenseService.getLicenseStatus();
  });

  ipcMain.handle('activateLicense', async (_, key) => {
    return licenseService.activateLicense(key);
  });

  // Backup & Restore API
  ipcMain.handle('createBackup', async (_, destPath) => {
    return backupService.createBackup(destPath);
  });

  ipcMain.handle('restoreBackup', async (_, zipPath) => {
    const res = await backupService.restoreBackup(zipPath);
    notifyRendererOfDbUpdate();
    return res;
  });

  // Cloud Sync
  ipcMain.handle('syncWithCloud', async (_, companyId) => {
    const res = await syncService.syncWithCloud(companyId);
    notifyRendererOfDbUpdate();
    return res;
  });

  // Users Management API
  ipcMain.handle('getUsers', async (_, companyId) => {
    return userRepo.getUsers(companyId);
  });

  ipcMain.handle('createUser', async (_, user) => {
    const res = await userRepo.createUser(user);
    notifyRendererOfDbUpdate();
    return res;
  });

  ipcMain.handle('updateUserPermissions', async (_, id, permissionsJson) => {
    const res = await userRepo.updateUserPermissions(id, permissionsJson);
    notifyRendererOfDbUpdate();
    return res;
  });

  ipcMain.handle('updateUserPassword', async (_, id, oldPassword, newPassword) => {
    const res = await userRepo.updateUserPassword(id, oldPassword, newPassword);
    notifyRendererOfDbUpdate();
    return res;
  });

  ipcMain.handle('deleteUser', async (_, id) => {
    const res = await userRepo.deleteUser(id);
    notifyRendererOfDbUpdate();
    return res;
  });

  // Parties Management API
  ipcMain.handle('getParties', async (_, companyId) => {
    return partyRepo.getParties(companyId);
  });

  ipcMain.handle('createParty', async (_, party) => {
    const res = await partyRepo.createParty(party);
    notifyRendererOfDbUpdate();
    return res;
  });

  ipcMain.handle('updateParty', async (_, party) => {
    const res = await partyRepo.updateParty(party);
    notifyRendererOfDbUpdate();
    return res;
  });

  ipcMain.handle('deleteParty', async (_, id) => {
    const res = await partyRepo.deleteParty(id);
    notifyRendererOfDbUpdate();
    return res;
  });

  // Taxes Management API
  ipcMain.handle('getTaxes', async (_, companyId) => {
    return taxRepo.getTaxes(companyId);
  });

  ipcMain.handle('createTax', async (_, tax) => {
    const res = await taxRepo.createTax(tax);
    notifyRendererOfDbUpdate();
    return res;
  });

  ipcMain.handle('updateTax', async (_, tax) => {
    const res = await taxRepo.updateTax(tax);
    notifyRendererOfDbUpdate();
    return res;
  });

  ipcMain.handle('deleteTax', async (_, id) => {
    const res = await taxRepo.deleteTax(id);
    notifyRendererOfDbUpdate();
    return res;
  });

  // Tag Opening API
  ipcMain.handle('getTagOpeningVouchers', async (_, companyId) => {
    return tagOpeningRepo.getTagOpeningVouchers(companyId);
  });

  ipcMain.handle('createTagOpeningVoucher', async (_, voucher, items, accessories) => {
    const res = await tagOpeningRepo.createTagOpeningVoucher(voucher, items, accessories);
    notifyRendererOfDbUpdate();
    return res;
  });

  ipcMain.handle('updateTagOpeningVoucher', async (_, voucher, items, accessories) => {
    const res = await tagOpeningRepo.updateTagOpeningVoucher(voucher, items, accessories);
    notifyRendererOfDbUpdate();
    return res;
  });

  ipcMain.handle('deleteTagOpeningVoucher', async (_, id) => {
    const res = await tagOpeningRepo.deleteTagOpeningVoucher(id);
    notifyRendererOfDbUpdate();
    return res;
  });

  // Party Wise Labour API
  ipcMain.handle('getPartyWiseLabour', async (_, companyId, partyId) => {
    return labourRepo.getPartyWiseLabour(companyId, partyId);
  });

  ipcMain.handle('savePartyWiseLabour', async (_, companyId, partyId, entries) => {
    const res = await labourRepo.savePartyWiseLabour(companyId, partyId, entries);
    notifyRendererOfDbUpdate();
    return res;
  });

  ipcMain.handle('deletePartyWiseLabour', async (_, companyId, partyId) => {
    const res = await labourRepo.deletePartyWiseLabour(companyId, partyId);
    notifyRendererOfDbUpdate();
    return res;
  });

  // Item Stock Limit API
  ipcMain.handle('getItemStockLimits', async (_, companyId) => {
    return itstkLimitRepo.getItemStockLimits(companyId);
  });

  ipcMain.handle('saveItemStockLimit', async (_, companyId, limit, details) => {
    const res = await itstkLimitRepo.saveItemStockLimit(companyId, limit, details);
    notifyRendererOfDbUpdate();
    return res;
  });

  ipcMain.handle('deleteItemStockLimit', async (_, id) => {
    const res = await itstkLimitRepo.deleteItemStockLimit(id);
    notifyRendererOfDbUpdate();
    return res;
  });

  // Purchase API
  ipcMain.handle('getPurchaseVouchers', async (_, companyId) => {
    return purchaseRepo.getPurchaseVouchers(companyId);
  });

  ipcMain.handle('createPurchaseVoucher', async (_, voucher, items, tags, diamonds) => {
    const res = await purchaseRepo.createPurchaseVoucher(voucher, items, tags, diamonds);
    notifyRendererOfDbUpdate();
    return res;
  });

  ipcMain.handle('updatePurchaseVoucher', async (_, voucher, items, tags, diamonds) => {
    const res = await purchaseRepo.updatePurchaseVoucher(voucher, items, tags, diamonds);
    notifyRendererOfDbUpdate();
    return res;
  });

  ipcMain.handle('deletePurchaseVoucher', async (_, id) => {
    const res = await purchaseRepo.deletePurchaseVoucher(id);
    notifyRendererOfDbUpdate();
    return res;
  });

  // Stock Report API
  ipcMain.handle('getStockReport', async (_, companyId, dateFrom, dateTo) => {
    return ledrReportRepo.getStockReport(companyId, dateFrom, dateTo);
  });

  // Native PDF Export API
  ipcMain.handle('save-to-pdf', async (event, fileName) => {
    try {
      const win = BrowserWindow.fromWebContents(event.sender);
      if (!win) return { success: false, message: 'No active window found' };
      
      const { dialog } = require('electron');
      const path = require('path');
      const fs = require('fs');
      
      const { filePath } = await dialog.showSaveDialog(win, {
        title: 'Save Invoice as PDF',
        defaultPath: fileName || 'invoice.pdf',
        filters: [{ name: 'PDF Files', extensions: ['pdf'] }]
      });
      
      if (!filePath) {
        return { success: false, message: 'Save canceled' };
      }
      
      const data = await win.webContents.printToPDF({
        printBackground: true,
        pageSize: 'A4',
        margins: {
          marginType: 'default'
        }
      });
      
      fs.writeFileSync(filePath, data);
      return { success: true, message: `PDF saved successfully to: ${path.basename(filePath)}`, filePath };
    } catch (err: any) {
      console.error('Failed to print to PDF:', err);
      return { success: false, message: err.message || 'Error generating PDF' };
    }
  });

  // Scanner configurations API
  ipcMain.handle('getDeviceConfigurations', async (_, companyId) => {
    return scannerRepo.getDeviceConfigurations(companyId);
  });

  ipcMain.handle('saveDeviceConfiguration', async (_, config) => {
    const res = scannerRepo.saveDeviceConfiguration(config);
    notifyRendererOfDbUpdate();
    return res;
  });

  // Printer configurations API
  ipcMain.handle('getPrinterConfigurations', async (_, companyId) => {
    return scannerRepo.getPrinterConfigurations(companyId);
  });

  ipcMain.handle('savePrinterConfiguration', async (_, config) => {
    const res = scannerRepo.savePrinterConfiguration(config);
    notifyRendererOfDbUpdate();
    return res;
  });

  // Scan logging API
  ipcMain.handle('logScan', async (_, log) => {
    return scannerRepo.logScan(log);
  });

  ipcMain.handle('getScanHistory', async (_, companyId, limit) => {
    return scannerRepo.getScanHistory(companyId, limit);
  });

  // Uniqueness validation API
  ipcMain.handle('isBarcodeUnique', async (_, companyId, barcode) => {
    return scannerRepo.isBarcodeUnique(companyId, barcode);
  });

  ipcMain.handle('isQRUnique', async (_, companyId, qrCode) => {
    return scannerRepo.isQRUnique(companyId, qrCode);
  });

  // Cross-DB Search API
  ipcMain.handle('searchScannedValue', async (_, companyId, value) => {
    return scannerRepo.searchScannedValue(companyId, value);
  });
}
