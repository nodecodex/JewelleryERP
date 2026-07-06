import { ipcMain, BrowserWindow } from 'electron';
import type { IpcMainInvokeEvent } from 'electron';
import { z } from 'zod';

function notifyRendererOfDbUpdate(): void {
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send('database-updated');
  }
}

// Security: Verify IPC sender is allowed
function verifySender(event: IpcMainInvokeEvent): void {
  const isDev = process.env.NODE_ENV === 'development';
  const url = event.senderFrame?.url;
  
  if (!url) throw new Error('Unauthorized IPC: No sender frame url');
  
  const parsed = new URL(url);
  if (isDev && parsed.hostname === 'localhost') return;
  if (parsed.protocol === 'file:' && parsed.pathname.endsWith('index.html')) return;
  
  throw new Error('Unauthorized IPC sender');
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
  ipcMain.handle('getCompanies', async (event) => {
    verifySender(event);
    return companyRepo.getCompanies();
  });

  ipcMain.handle('createCompany', async (event, company) => {
    verifySender(event);
    const res = await companyRepo.createCompany(company);
    notifyRendererOfDbUpdate();
    return res;
  });

  ipcMain.handle('updateCompany', async (event, company) => {
    verifySender(event);
    const res = await companyRepo.updateCompany(company);
    notifyRendererOfDbUpdate();
    return res;
  });

  ipcMain.handle('deleteCompany', async (event, id) => {
    verifySender(event);
    const res = await companyRepo.deleteCompany(id);
    notifyRendererOfDbUpdate();
    return res;
  });

  // Product API
  ipcMain.handle('getProducts', async (event, companyId) => {
    verifySender(event);
    return productRepo.getProducts(companyId);
  });

  ipcMain.handle('getProductByBarcode', async (event, companyId, barcode) => {
    verifySender(event);
    return productRepo.getProductByBarcode(companyId, barcode);
  });

  ipcMain.handle('createProduct', async (event, product) => {
    verifySender(event);
    const res = await productRepo.createProduct(product);
    notifyRendererOfDbUpdate();
    return res;
  });

  ipcMain.handle('updateProduct', async (event, product) => {
    verifySender(event);
    const res = await productRepo.updateProduct(product);
    notifyRendererOfDbUpdate();
    return res;
  });

  ipcMain.handle('deleteProduct', async (event, id) => {
    verifySender(event);
    const res = await productRepo.deleteProduct(id);
    notifyRendererOfDbUpdate();
    return res;
  });

  // Customer API
  ipcMain.handle('getCustomers', async (event, companyId) => {
    verifySender(event);
    return customerRepo.getCustomers(companyId);
  });

  ipcMain.handle('createCustomer', async (event, customer) => {
    verifySender(event);
    const res = await customerRepo.createCustomer(customer);
    notifyRendererOfDbUpdate();
    return res;
  });

  ipcMain.handle('updateCustomer', async (event, customer) => {
    verifySender(event);
    const res = await customerRepo.updateCustomer(customer);
    notifyRendererOfDbUpdate();
    return res;
  });

  // Supplier API
  ipcMain.handle('getSuppliers', async (event, companyId) => {
    verifySender(event);
    return supplierRepo.getSuppliers(companyId);
  });

  ipcMain.handle('createSupplier', async (event, supplier) => {
    verifySender(event);
    const res = await supplierRepo.createSupplier(supplier);
    notifyRendererOfDbUpdate();
    return res;
  });

  ipcMain.handle('updateSupplier', async (event, supplier) => {
    verifySender(event);
    const res = await supplierRepo.updateSupplier(supplier);
    notifyRendererOfDbUpdate();
    return res;
  });

  // Invoice API
  ipcMain.handle('createInvoice', async (event, invoice, items) => {
    verifySender(event);
    const res = await invoiceRepo.createInvoice(invoice, items);
    notifyRendererOfDbUpdate();
    return res;
  });

  ipcMain.handle('getInvoices', async (event, companyId) => {
    verifySender(event);
    return invoiceRepo.getInvoices(companyId);
  });

  ipcMain.handle('getNextInvoiceNumber', async (event, companyId, type) => {
    verifySender(event);
    return invoiceRepo.getNextInvoiceNumber(companyId, type);
  });

  ipcMain.handle('deleteInvoice', async (event, id) => {
    verifySender(event);
    const res = await invoiceRepo.deleteInvoice(id);
    notifyRendererOfDbUpdate();
    return res;
  });

  ipcMain.handle('getTagStockReport', async (event, companyId) => {
    verifySender(event);
    return ledrReportRepo.getTagStockReport(companyId);
  });

  ipcMain.handle('getTagAccessories', async (event, source, voucherId, tagId) => {
    verifySender(event);
    return ledrReportRepo.getTagAccessories(source, voucherId, tagId);
  });

  // Vouchers / Accounting API
  ipcMain.handle('getAccounts', async (event, companyId) => {
    verifySender(event);
    return ledgerRepo.getAccounts(companyId);
  });

  ipcMain.handle('createAccount', async (event, account) => {
    verifySender(event);
    const res = await ledgerRepo.createAccount(account);
    notifyRendererOfDbUpdate();
    return res;
  });

  ipcMain.handle('createVoucher', async (event, voucher, items) => {
    verifySender(event);
    const res = await voucherRepo.createVoucher(voucher, items);
    notifyRendererOfDbUpdate();
    return res;
  });

  ipcMain.handle('getVouchers', async (event, companyId) => {
    verifySender(event);
    return voucherRepo.getVouchers(companyId);
  });

  ipcMain.handle('getLedgerReport', async (event, companyId, accountId, startDate, endDate) => {
    verifySender(event);
    return ledgerRepo.getLedgerReport(companyId, accountId, startDate, endDate);
  });

  // Daily Metal Rates
  ipcMain.handle('getDailyRates', async (event, companyId) => {
    verifySender(event);
    return rateRepo.getDailyRates(companyId);
  });

  ipcMain.handle('saveDailyRates', async (event, rate) => {
    verifySender(event);
    const res = await rateRepo.saveDailyRates(rate);
    notifyRendererOfDbUpdate();
    return res;
  });

  // Licensing API
  ipcMain.handle('getDeviceId', async (event) => {
    verifySender(event);
    return licenseService.getDeviceId();
  });

  ipcMain.handle('getLicenseStatus', async (event) => {
    verifySender(event);
    return licenseService.getLicenseStatus();
  });

  ipcMain.handle('activateLicense', async (event, key) => {
    verifySender(event);
    return licenseService.activateLicense(key);
  });

  ipcMain.handle('startTrial', async (event) => {
    verifySender(event);
    return licenseService.startTrial();
  });

  ipcMain.handle('recoverLicense', async (event, key, mobile) => {
    verifySender(event);
    return licenseService.recoverLicense(key, mobile);
  });

  ipcMain.handle('requestTransfer', async (event, key, reason) => {
    verifySender(event);
    return licenseService.requestTransfer(key, reason);
  });

  // Backup & Restore API
  ipcMain.handle('createBackup', async (event, destPath) => {
    verifySender(event);
    return backupService.createBackup(destPath);
  });

  ipcMain.handle('restoreBackup', async (event, zipPath) => {
    verifySender(event);
    const res = await backupService.restoreBackup(zipPath);
    notifyRendererOfDbUpdate();
    return res;
  });

  // Cloud Sync
  ipcMain.handle('syncWithCloud', async (event, companyId) => {
    verifySender(event);
    const res = await syncService.syncWithCloud(companyId);
    notifyRendererOfDbUpdate();
    return res;
  });

  // Users Management API
  ipcMain.handle('getUsers', async (event, companyId) => {
    verifySender(event);
    return userRepo.getUsers(companyId);
  });

  ipcMain.handle('createUser', async (event, user) => {
    verifySender(event);
    const res = await userRepo.createUser(user);
    notifyRendererOfDbUpdate();
    return res;
  });

  ipcMain.handle('updateUserPermissions', async (event, id, permissionsJson) => {
    verifySender(event);
    const res = await userRepo.updateUserPermissions(id, permissionsJson);
    notifyRendererOfDbUpdate();
    return res;
  });

  ipcMain.handle('updateUserPassword', async (event, id, oldPassword, newPassword) => {
    verifySender(event);
    const res = await userRepo.updateUserPassword(id, oldPassword, newPassword);
    notifyRendererOfDbUpdate();
    return res;
  });

  ipcMain.handle('deleteUser', async (event, id) => {
    verifySender(event);
    const res = await userRepo.deleteUser(id);
    notifyRendererOfDbUpdate();
    return res;
  });

  // Parties Management API
  ipcMain.handle('getParties', async (event, companyId) => {
    verifySender(event);
    return partyRepo.getParties(companyId);
  });

  ipcMain.handle('createParty', async (event, party) => {
    verifySender(event);
    const res = await partyRepo.createParty(party);
    notifyRendererOfDbUpdate();
    return res;
  });

  ipcMain.handle('updateParty', async (event, party) => {
    verifySender(event);
    const res = await partyRepo.updateParty(party);
    notifyRendererOfDbUpdate();
    return res;
  });

  ipcMain.handle('deleteParty', async (event, id) => {
    verifySender(event);
    const res = await partyRepo.deleteParty(id);
    notifyRendererOfDbUpdate();
    return res;
  });

  // Taxes Management API
  ipcMain.handle('getTaxes', async (event, companyId) => {
    verifySender(event);
    return taxRepo.getTaxes(companyId);
  });

  ipcMain.handle('createTax', async (event, tax) => {
    verifySender(event);
    const res = await taxRepo.createTax(tax);
    notifyRendererOfDbUpdate();
    return res;
  });

  ipcMain.handle('updateTax', async (event, tax) => {
    verifySender(event);
    const res = await taxRepo.updateTax(tax);
    notifyRendererOfDbUpdate();
    return res;
  });

  ipcMain.handle('deleteTax', async (event, id) => {
    verifySender(event);
    const res = await taxRepo.deleteTax(id);
    notifyRendererOfDbUpdate();
    return res;
  });

  // Tag Opening API
  ipcMain.handle('getTagOpeningVouchers', async (event, companyId) => {
    verifySender(event);
    return tagOpeningRepo.getTagOpeningVouchers(companyId);
  });

  ipcMain.handle('createTagOpeningVoucher', async (event, voucher, items, accessories) => {
    verifySender(event);
    const res = await tagOpeningRepo.createTagOpeningVoucher(voucher, items, accessories);
    notifyRendererOfDbUpdate();
    return res;
  });

  ipcMain.handle('updateTagOpeningVoucher', async (event, voucher, items, accessories) => {
    verifySender(event);
    const res = await tagOpeningRepo.updateTagOpeningVoucher(voucher, items, accessories);
    notifyRendererOfDbUpdate();
    return res;
  });

  ipcMain.handle('deleteTagOpeningVoucher', async (event, id) => {
    verifySender(event);
    const res = await tagOpeningRepo.deleteTagOpeningVoucher(id);
    notifyRendererOfDbUpdate();
    return res;
  });

  // Party Wise Labour API
  ipcMain.handle('getPartyWiseLabour', async (event, companyId, partyId) => {
    verifySender(event);
    return labourRepo.getPartyWiseLabour(companyId, partyId);
  });

  ipcMain.handle('savePartyWiseLabour', async (event, companyId, partyId, entries) => {
    verifySender(event);
    const res = await labourRepo.savePartyWiseLabour(companyId, partyId, entries);
    notifyRendererOfDbUpdate();
    return res;
  });

  ipcMain.handle('deletePartyWiseLabour', async (event, companyId, partyId) => {
    verifySender(event);
    const res = await labourRepo.deletePartyWiseLabour(companyId, partyId);
    notifyRendererOfDbUpdate();
    return res;
  });

  // Item Stock Limit API
  ipcMain.handle('getItemStockLimits', async (event, companyId) => {
    verifySender(event);
    return itstkLimitRepo.getItemStockLimits(companyId);
  });

  ipcMain.handle('saveItemStockLimit', async (event, companyId, limit, details) => {
    verifySender(event);
    const res = await itstkLimitRepo.saveItemStockLimit(companyId, limit, details);
    notifyRendererOfDbUpdate();
    return res;
  });

  ipcMain.handle('deleteItemStockLimit', async (event, id) => {
    verifySender(event);
    const res = await itstkLimitRepo.deleteItemStockLimit(id);
    notifyRendererOfDbUpdate();
    return res;
  });

  // Purchase API
  ipcMain.handle('getPurchaseVouchers', async (event, companyId) => {
    verifySender(event);
    return purchaseRepo.getPurchaseVouchers(companyId);
  });

  ipcMain.handle('createPurchaseVoucher', async (event, voucher, items, tags, diamonds) => {
    verifySender(event);
    const res = await purchaseRepo.createPurchaseVoucher(voucher, items, tags, diamonds);
    notifyRendererOfDbUpdate();
    return res;
  });

  ipcMain.handle('updatePurchaseVoucher', async (event, voucher, items, tags, diamonds) => {
    verifySender(event);
    const res = await purchaseRepo.updatePurchaseVoucher(voucher, items, tags, diamonds);
    notifyRendererOfDbUpdate();
    return res;
  });

  ipcMain.handle('deletePurchaseVoucher', async (event, id) => {
    verifySender(event);
    const res = await purchaseRepo.deletePurchaseVoucher(id);
    notifyRendererOfDbUpdate();
    return res;
  });

  // Stock Report API
  ipcMain.handle('getStockReport', async (event, companyId, dateFrom, dateTo) => {
    verifySender(event);
    return ledrReportRepo.getStockReport(companyId, dateFrom, dateTo);
  });

  // Native PDF Export API
  ipcMain.handle('save-to-pdf', async (event, fileName) => {
    verifySender(event);
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
  ipcMain.handle('getDeviceConfigurations', async (event, companyId) => {
    verifySender(event);
    return scannerRepo.getDeviceConfigurations(companyId);
  });

  ipcMain.handle('saveDeviceConfiguration', async (event, config) => {
    verifySender(event);
    const res = scannerRepo.saveDeviceConfiguration(config);
    notifyRendererOfDbUpdate();
    return res;
  });

  // Printer configurations API
  ipcMain.handle('getPrinterConfigurations', async (event, companyId) => {
    verifySender(event);
    return scannerRepo.getPrinterConfigurations(companyId);
  });

  ipcMain.handle('savePrinterConfiguration', async (event, config) => {
    verifySender(event);
    const res = scannerRepo.savePrinterConfiguration(config);
    notifyRendererOfDbUpdate();
    return res;
  });

  // Scan logging API
  ipcMain.handle('logScan', async (event, log) => {
    verifySender(event);
    return scannerRepo.logScan(log);
  });

  ipcMain.handle('getScanHistory', async (event, companyId, limit) => {
    verifySender(event);
    return scannerRepo.getScanHistory(companyId, limit);
  });

  // Uniqueness validation API
  ipcMain.handle('isBarcodeUnique', async (event, companyId, barcode) => {
    verifySender(event);
    return scannerRepo.isBarcodeUnique(companyId, barcode);
  });

  ipcMain.handle('isQRUnique', async (event, companyId, qrCode) => {
    verifySender(event);
    return scannerRepo.isQRUnique(companyId, qrCode);
  });

  // Cross-DB Search API
  ipcMain.handle('searchScannedValue', async (event, companyId, value) => {
    verifySender(event);
    return scannerRepo.searchScannedValue(companyId, value);
  });
}
