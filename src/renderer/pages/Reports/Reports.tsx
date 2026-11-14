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
    <div className="flex flex-col h-full bg-background text-foreground overflow-hidden">
      {/* SCREEN HEADER */}
      <div className="px-3.5 lg:px-4 py-2 border-b border-border flex justify-between items-center shrink-0 bg-card">
        <div>
          <h2 className="text-base lg:text-lg font-bold flex items-center gap-2 text-foreground tracking-tight">
            <FileText className="h-4.5 w-4.5 text-primary" />
            <span>Financial Statements & Audit Books</span>
          </h2>
          <p className="text-[11px] text-muted-foreground">Statutory balance sheet, trading profit & loss account, and GST tax records.</p>
        </div>
      </div>

      {/* Tabs bar */}
      <div className="px-3.5 lg:px-4 pt-2 bg-secondary/20 border-b border-border flex gap-1 select-none shrink-0">
        <button
          onClick={() => setActiveReportTab('pl')}
          className={`px-3 py-1.5 text-xs font-bold transition-all border-t border-x rounded-t-md cursor-pointer ${
            activeReportTab === 'pl' 
              ? 'bg-card border-border border-t-2 border-t-primary text-foreground shadow-xs' 
              : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-secondary/40'
          }`}
        >
          Profit & Loss Statement
        </button>
        <button
          onClick={() => setActiveReportTab('bs')}
          className={`px-3 py-1.5 text-xs font-bold transition-all border-t border-x rounded-t-md cursor-pointer ${
            activeReportTab === 'bs' 
              ? 'bg-card border-border border-t-2 border-t-primary text-foreground shadow-xs' 
              : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-secondary/40'
          }`}
        >
          Balance Sheet
        </button>
        <button
          onClick={() => setActiveReportTab('tax')}
          className={`px-3 py-1.5 text-xs font-bold transition-all border-t border-x rounded-t-md cursor-pointer ${
            activeReportTab === 'tax' 
              ? 'bg-card border-border border-t-2 border-t-primary text-foreground shadow-xs' 
              : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-secondary/40'
          }`}
        >
          GST Sales Tax Log
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 lg:p-3.5">
        {activeReportTab === 'pl' && (
          <div className="bg-card text-card-foreground border border-border rounded-lg max-w-3xl mx-auto shadow-2xs overflow-hidden">
            <div className="bg-secondary/40 px-3.5 py-2 border-b border-border flex justify-between items-center">
              <h3 className="font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 text-foreground">
                <TrendingUp className="h-4 w-4 text-emerald-500" />
                <span>Trading Profit & Loss Account</span>
              </h3>
              <button
                onClick={handleExportPL}
                className="flex items-center gap-1 px-2.5 py-1 bg-secondary hover:bg-primary hover:text-primary-foreground text-[10px] font-bold uppercase tracking-wider rounded border border-border transition-all cursor-pointer"
              >
                <Download className="h-3 w-3" />
                <span>Export CSV</span>
              </button>
            </div>

            <div className="p-4 divide-y divide-border/40 text-xs font-bold font-mono space-y-2">
              <div className="flex justify-between py-1 text-foreground text-xs font-bold font-sans uppercase">
                <span>Sales Revenue (Turnover):</span>
                <span className="font-mono font-extrabold tabular-nums">₹{salesRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between py-1 text-muted-foreground">
                <span className="font-sans">Less: Purchases (Cost of Stock Goods):</span>
                <span className="text-rose-500 font-extrabold tabular-nums">-₹{costOfGoodsSold.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between py-1 text-muted-foreground">
                <span className="font-sans">Less: Direct Wages & Manufacturing:</span>
                <span className="text-rose-500 font-extrabold tabular-nums">-₹{directExpenses.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between py-1.5 border-t border-border text-sm font-extrabold text-foreground uppercase font-sans">
                <span>Gross Profit Margin (GP):</span>
                <span className={grossProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400 font-mono tabular-nums' : 'text-rose-600 font-mono tabular-nums'}>
                  ₹{grossProfit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between py-1 text-muted-foreground">
                <span className="font-sans">Less: Indirect Operating & Admin Expenses:</span>
                <span className="text-rose-500 font-extrabold tabular-nums">-₹{indirectExpenses.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between py-2 border-t border-border text-base font-extrabold text-primary uppercase font-sans">
                <span>Net Profit / (Loss) for Period:</span>
                <span className={netProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400 font-mono text-lg tabular-nums' : 'text-rose-600 font-mono text-lg tabular-nums'}>
                  ₹{netProfit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>
        )}

        {activeReportTab === 'bs' && (
          <div className="bg-card text-card-foreground border border-border rounded-lg max-w-4xl mx-auto shadow-2xs overflow-hidden">
            <div className="bg-secondary/40 px-3.5 py-2 border-b border-border flex justify-between items-center">
              <h3 className="font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 text-foreground">
                <DollarSign className="h-4 w-4 text-primary" />
                <span>Balance Sheet Statement</span>
              </h3>
              <button
                onClick={handleExportBS}
                className="flex items-center gap-1 px-2.5 py-1 bg-secondary hover:bg-primary hover:text-primary-foreground text-[10px] font-bold uppercase tracking-wider rounded border border-border transition-all cursor-pointer"
              >
                <Download className="h-3 w-3" />
                <span>Export CSV</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border font-sans">
              {/* ASSETS */}
              <div className="p-4 space-y-2.5">
                <h4 className="font-extrabold text-[10px] text-muted-foreground uppercase tracking-wider border-b border-border pb-1">Assets & Properties</h4>
                <div className="space-y-1.5 text-xs font-bold font-mono text-foreground">
                  <div className="flex justify-between border-b border-border/40 pb-1">
                    <span className="font-sans text-muted-foreground">Cash-in-Hand Balance:</span>
                    <span className="tabular-nums">₹{cashAsset.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between border-b border-border/40 pb-1">
                    <span className="font-sans text-muted-foreground">Bank Account Balance:</span>
                    <span className="tabular-nums">₹{bankAsset.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between border-b border-border/40 pb-1">
                    <span className="font-sans text-muted-foreground">Customer Receivables:</span>
                    <span className="tabular-nums">₹{customerReceivables.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between border-t border-border pt-1.5 text-xs font-extrabold text-foreground uppercase font-sans">
                    <span>Total Assets Ledger:</span>
                    <span className="font-mono tabular-nums">₹{totalAssets.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </div>

              {/* LIABILITIES & EQUITIES */}
              <div className="p-4 space-y-2.5">
                <h4 className="font-extrabold text-[10px] text-muted-foreground uppercase tracking-wider border-b border-border pb-1">Liabilities & Equities</h4>
                <div className="space-y-1.5 text-xs font-bold font-mono text-foreground">
                  <div className="flex justify-between border-b border-border/40 pb-1">
                    <span className="font-sans text-muted-foreground">Capital Account Ledger:</span>
                    <span className="tabular-nums">₹{capitalEquity.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between border-b border-border/40 pb-1">
                    <span className="font-sans text-muted-foreground">Supplier Payables:</span>
                    <span className="tabular-nums">₹{(-supplierPayables).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between border-b border-border/40 pb-1 text-emerald-600 dark:text-emerald-400">
                    <span className="font-sans">Current Period Net Profit:</span>
                    <span className="font-extrabold tabular-nums">₹{netProfit.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between border-t border-border pt-1.5 text-xs font-extrabold text-foreground uppercase font-sans">
                    <span>Total Liab & Capital:</span>
                    <span className="font-mono tabular-nums">₹{totalLiabilitiesEquity.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeReportTab === 'tax' && (
          <div className="erp-table-container rounded-lg border border-border overflow-hidden bg-card shadow-2xs flex flex-col">
            <div className="bg-secondary/40 px-3.5 py-2 border-b border-border">
              <h3 className="font-bold text-xs uppercase tracking-wider text-foreground">GST Sales Tax Log Registry</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="ag-grid-dense-table w-full text-xs">
                <thead>
                  <tr className="bg-secondary/40 border-b border-border text-[10.5px] uppercase tracking-wider text-muted-foreground">
                    <th className="py-2 px-3 text-left w-28">Invoice Date</th>
                    <th className="py-2 px-3 text-left w-36">Invoice Number</th>
                    <th className="py-2 px-3 text-left w-36">Customer Account</th>
                    <th className="py-2 px-3 text-right">Taxable Gross (₹)</th>
                    <th className="py-2 px-3 text-right">GST (₹)</th>
                    <th className="py-2 px-3 text-right">Grand Total (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40 font-medium">
                  {invoices.filter(i => i.invoice_type !== 'Estimate').length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-muted-foreground/40 italic">
                        No GST sales tax invoices generated to date.
                      </td>
                    </tr>
                  ) : (
                    invoices
                      .filter(i => i.invoice_type !== 'Estimate')
                      .map((inv) => (
                        <tr key={inv.id} className="hover:bg-muted/40 transition-colors">
                          <td className="py-1.5 px-3 font-mono text-muted-foreground tabular-nums">{inv.invoice_date}</td>
                          <td className="py-1.5 px-3 font-mono font-bold text-foreground">{inv.invoice_number}</td>
                          <td className="py-1.5 px-3">{inv.customer_id ? 'Registered Ledger' : 'Cash Counter'}</td>
                          <td className="py-1.5 px-3 text-right font-mono tabular-nums">₹{inv.gross_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                          <td className="py-1.5 px-3 text-right font-mono text-primary tabular-nums">₹{inv.tax_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                          <td className="py-1.5 px-3 text-right font-mono font-bold text-foreground tabular-nums">₹{inv.net_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                        </tr>
                      ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
