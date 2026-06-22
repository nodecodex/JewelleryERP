import React, { useEffect, useState } from 'react';
import { useCompanyStore } from '../../store/useCompanyStore';
import { useVoucherStore } from '../../store/useVoucherStore';
import { useInvoiceStore } from '../../store/useInvoiceStore';
import type { Account, SalesInvoice } from '../../../shared/ipc-api';
import { FileText, Download, DollarSign, TrendingUp, Layers, Coins } from 'lucide-react';

export default function ReportsView() {
  const selectedCompany = useCompanyStore((state) => state.selectedCompany);
  const { accounts, loadAccounts } = useVoucherStore();
  const { invoices, loadInvoices } = useInvoiceStore();
  const [activeReportTab, setActiveReportTab] = useState<'pl' | 'bs' | 'tax'>('pl');

  useEffect(() => {
    if (selectedCompany) {
      loadAccounts(selectedCompany.id);
      loadInvoices(selectedCompany.id);
    }
  }, [selectedCompany]);

  // 1. Calculate P&L values
  const getAccountGroupBalance = (group: string) => {
    // Standard asset/expense is positive, revenue/liability negative, so flip revenue
    const matches = accounts.filter((a) => a.parent_group === group);
    const sum = matches.reduce((s, a) => s + a.current_balance, 0);
    return group === 'Sales' ? -sum : sum;
  };

  const salesRevenue = getAccountGroupBalance('Sales');
  const costOfGoodsSold = getAccountGroupBalance('Purchase');
  const directExpenses = getAccountGroupBalance('Direct Expense');
  const indirectExpenses = getAccountGroupBalance('Indirect Expense');

  const grossProfit = salesRevenue - costOfGoodsSold - directExpenses;
  const netProfit = grossProfit - indirectExpenses;

  // 2. Calculate Balance Sheet values
  const cashAsset = getAccountGroupBalance('Cash');
  const bankAsset = getAccountGroupBalance('Bank');
  const customerReceivables = accounts
    .filter((a) => a.parent_group === 'Customer Ledger')
    .reduce((s, a) => s + a.current_balance, 0);

  const supplierPayables = accounts
    .filter((a) => a.parent_group === 'Supplier Ledger')
    .reduce((s, a) => s + a.current_balance, 0); // Credit sum is negative receivables, so payables is positive

  const capitalEquity = -accounts
    .filter((a) => a.parent_group === 'Capital')
    .reduce((s, a) => s + a.current_balance, 0);

  // Total assets
  const totalAssets = cashAsset + bankAsset + customerReceivables;
  // Total liabilities & equity
  const totalLiabilitiesEquity = capitalEquity + (-supplierPayables) + netProfit; // Add Net Profit to equity context

  // Export to CSV
  const exportToCSV = (title: string, headers: string[], rows: any[][]) => {
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += headers.join(",") + "\r\n";
    rows.forEach((r) => {
      csvContent += r.map((cell) => `"${cell}"`).join(",") + "\r\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${title.replace(/\s+/g, '_')}_report.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportPL = () => {
    const headers = ['Metric Name', 'Amount (₹)'];
    const rows = [
      ['Sales Revenue', salesRevenue],
      ['Cost of Goods Sold (Purchases)', costOfGoodsSold],
      ['Direct Manufacturing Expenses', directExpenses],
      ['Gross Profit Margin', grossProfit],
      ['Indirect Operating Expenses', indirectExpenses],
      ['Net Profit / Loss', netProfit],
    ];
    exportToCSV('Profit_And_Loss', headers, rows);
  };

  const handleExportBS = () => {
    const headers = ['Asset Type', 'Asset Amt (₹)', 'Liability / Equity', 'Liability Amt (₹)'];
    const rows = [
      ['Cash Asset Balance', cashAsset, 'Capital Account', capitalEquity],
      ['Bank Account Balance', bankAsset, 'Supplier Payables', -supplierPayables],
      ['Customer Receivables', customerReceivables, 'Period Net Profit', netProfit],
      ['Total Assets', totalAssets, 'Total Liabilities & Equity', totalLiabilitiesEquity],
    ];
    exportToCSV('Balance_Sheet', headers, rows);
  };

  return (
    <div className="p-3 bg-[#eef1f6] h-full overflow-y-auto max-h-[calc(100vh-105px)] font-sans">
      <div className="flex justify-between items-center border-b border-slate-300 pb-2 mb-3">
        <div>
          <h2 className="text-sm font-bold flex items-center gap-1.5 text-slate-800 uppercase tracking-wider font-luxury">
            <FileText className="h-4.5 w-4.5 text-amber-500" />
            <span>Financial Statements & Books</span>
          </h2>
          <p className="text-[10px] text-slate-500 font-semibold uppercase">Generate statutory balance sheets, P&L accounts, and tax books.</p>
        </div>
      </div>

      {/* Tabs bar */}
      <div className="flex border-b border-slate-300 gap-0.5 select-none mb-3">
        <button
          onClick={() => setActiveReportTab('pl')}
          className={`px-3 py-1 text-xs font-bold transition-all border-x border-t rounded-t-[2px] cursor-pointer relative top-[1px] ${
            activeReportTab === 'pl' 
              ? 'bg-white border-slate-350 border-t-amber-500 border-t-2 border-b-white text-slate-800 font-extrabold z-10' 
              : 'bg-slate-200 border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
          }`}
        >
          Profit & Loss Statement
        </button>
        <button
          onClick={() => setActiveReportTab('bs')}
          className={`px-3 py-1 text-xs font-bold transition-all border-x border-t rounded-t-[2px] cursor-pointer relative top-[1px] ${
            activeReportTab === 'bs' 
              ? 'bg-white border-slate-350 border-t-amber-500 border-t-2 border-b-white text-slate-800 font-extrabold z-10' 
              : 'bg-slate-200 border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
          }`}
        >
          Balance Sheet
        </button>
        <button
          onClick={() => setActiveReportTab('tax')}
          className={`px-3 py-1 text-xs font-bold transition-all border-x border-t rounded-t-[2px] cursor-pointer relative top-[1px] ${
            activeReportTab === 'tax' 
              ? 'bg-white border-slate-350 border-t-amber-500 border-t-2 border-b-white text-slate-800 font-extrabold z-10' 
              : 'bg-slate-200 border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
          }`}
        >
          GST Sales Tax Log
        </button>
      </div>

      {activeReportTab === 'pl' && (
        <div className="bg-white border border-slate-350 rounded-[2px] max-w-3xl mx-auto shadow-sm overflow-hidden">
          <div className="bg-slate-800 text-slate-100 px-3 py-1.5 border-b border-slate-900 flex justify-between items-center">
            <h3 className="font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 font-luxury">
              <TrendingUp className="h-4 w-4 text-emerald-500" />
              <span>Profit & Loss Statement Account</span>
            </h3>
            <button
              onClick={handleExportPL}
              className="flex items-center gap-1 px-2 py-0.5 bg-slate-700 hover:bg-slate-600 text-[10px] text-white font-bold uppercase tracking-wider rounded-[2px] transition-all"
            >
              <Download className="h-3 w-3 text-amber-400" />
              <span>Export CSV</span>
            </button>
          </div>

          <div className="p-4 divide-y divide-slate-150 text-xs font-bold text-slate-650 font-data space-y-2.5">
            <div className="flex justify-between py-1.5 text-slate-800 text-xs font-bold font-sans uppercase">
              <span>Sales Revenue (Turnover):</span>
              <span className="font-data font-extrabold">₹{salesRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between py-1.5 text-slate-550">
              <span>Less: Purchases (Cost of Stock Goods):</span>
              <span className="text-rose-500 font-extrabold">-₹{costOfGoodsSold.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between py-1.5 text-slate-550">
              <span>Less: Direct Wages & Manufacturing:</span>
              <span className="text-rose-500 font-extrabold">-₹{directExpenses.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between py-2 border-t border-slate-300 text-sm font-extrabold text-slate-850 uppercase font-sans">
              <span>Gross Profit Margin (GP):</span>
              <span className={grossProfit >= 0 ? 'text-emerald-600 font-data' : 'text-rose-600 font-data'}>
                ₹{grossProfit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex justify-between py-1.5 text-slate-550">
              <span>Less: Indirect Operating & Admin Expenses:</span>
              <span className="text-rose-500 font-extrabold">-₹{indirectExpenses.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between py-2.5 border-t-2 border-double border-slate-400 text-base font-extrabold text-amber-600 uppercase font-sans">
              <span>Net Profit / (Loss) for Period:</span>
              <span className={netProfit >= 0 ? 'text-emerald-600 font-data text-lg' : 'text-rose-600 font-data text-lg'}>
                ₹{netProfit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>
      )}

      {activeReportTab === 'bs' && (
        <div className="bg-white border border-slate-350 rounded-[2px] max-w-4xl mx-auto shadow-sm overflow-hidden">
          <div className="bg-slate-800 text-slate-100 px-3 py-1.5 border-b border-slate-900 flex justify-between items-center">
            <h3 className="font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 font-luxury">
              <DollarSign className="h-4 w-4 text-amber-500" />
              <span>Balance Sheet Statement</span>
            </h3>
            <button
              onClick={handleExportBS}
              className="flex items-center gap-1 px-2 py-0.5 bg-slate-700 hover:bg-slate-600 text-[10px] text-white font-bold uppercase tracking-wider rounded-[2px] transition-all"
            >
              <Download className="h-3 w-3 text-amber-400" />
              <span>Export CSV</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-300 font-sans">
            {/* ASSETS */}
            <div className="p-4 space-y-3">
              <h4 className="font-extrabold text-[10px] text-slate-500 uppercase tracking-wider border-b border-slate-200 pb-1">Assets & Properties</h4>
              <div className="space-y-2 text-xs font-bold font-data text-slate-650">
                <div className="flex justify-between border-b border-slate-100 pb-1.5">
                  <span>Cash-in-Hand Balance:</span>
                  <span className="text-slate-800">₹{cashAsset.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 pb-1.5">
                  <span>Bank Account Balance:</span>
                  <span className="text-slate-800">₹{bankAsset.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 pb-1.5">
                  <span>Customer Receivables:</span>
                  <span className="text-slate-800">₹{customerReceivables.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between border-t border-slate-350 pt-2 text-xs font-extrabold text-slate-850 uppercase font-sans">
                  <span>Total Assets Ledger:</span>
                  <span>₹{totalAssets.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
            </div>

            {/* LIABILITIES & EQUITIES */}
            <div className="p-4 space-y-3">
              <h4 className="font-extrabold text-[10px] text-slate-500 uppercase tracking-wider border-b border-slate-200 pb-1">Liabilities & Equities</h4>
              <div className="space-y-2 text-xs font-bold font-data text-slate-650">
                <div className="flex justify-between border-b border-slate-100 pb-1.5">
                  <span>Capital Account Ledger:</span>
                  <span className="text-slate-800">₹{capitalEquity.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 pb-1.5">
                  <span>Supplier Payables:</span>
                  <span className="text-slate-800">₹{(-supplierPayables).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 pb-1.5 text-emerald-600">
                  <span>Current Period Net Profit:</span>
                  <span className="font-extrabold">₹{netProfit.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between border-t border-slate-350 pt-2 text-xs font-extrabold text-slate-850 uppercase font-sans">
                  <span>Total Liab & Capital:</span>
                  <span>₹{totalLiabilitiesEquity.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeReportTab === 'tax' && (
        <div className="bg-white border border-slate-350 rounded-[2px] overflow-hidden shadow-sm">
          <div className="bg-slate-800 text-slate-100 px-3 py-2 border-b border-slate-900">
            <h3 className="font-bold text-xs uppercase tracking-wider font-luxury text-amber-500">GST Sales Tax Log Registry</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="ag-grid-dense-table font-sans">
              <thead>
                <tr>
                  <th className="p-2 w-28">Invoice Date</th>
                  <th className="p-2 w-36">Invoice Number</th>
                  <th className="p-2 w-36">Customer Account</th>
                  <th className="p-2 text-right">Taxable Gross Amount (₹)</th>
                  <th className="p-2 text-right">Tax Collected amount (₹)</th>
                  <th className="p-2 text-right">Grand Total amount (₹)</th>
                </tr>
              </thead>
              <tbody className="font-semibold text-slate-700 bg-white">
                {invoices.filter(i => i.invoice_type !== 'Estimate').length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-400 italic font-medium">
                      No GST sales tax invoices generated to date.
                    </td>
                  </tr>
                ) : (
                  invoices
                    .filter(i => i.invoice_type !== 'Estimate')
                    .map((inv) => (
                      <tr key={inv.id} className="border-b border-slate-150">
                        <td className="p-1.5 font-data text-xs">{inv.invoice_date}</td>
                        <td className="p-1.5 font-data text-xs text-slate-850 font-bold">{inv.invoice_number}</td>
                        <td className="p-1.5 font-sans text-xs">{inv.customer_id ? 'Registered Ledger' : 'Cash Counter'}</td>
                        <td className="p-1.5 text-right font-data">₹{inv.gross_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                        <td className="p-1.5 text-right font-data text-amber-600">₹{inv.tax_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                        <td className="p-1.5 text-right font-data font-bold text-slate-900">₹{inv.net_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                      </tr>
                    ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
