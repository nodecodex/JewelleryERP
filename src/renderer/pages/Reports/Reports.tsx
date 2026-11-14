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
    <div className="flex flex-col h-full bg-black text-white overflow-hidden">
      {/* SCREEN HEADER */}
      <div className="px-4 py-2.5 border-b border-[#262626] flex justify-between items-center shrink-0 bg-[#181818]">
        <div>
          <h2 className="text-sm font-bold flex items-center gap-2 text-white uppercase tracking-wider">
            <FileText className="h-4 w-4 text-[#FFC000]" />
            <span>FINANCIAL STATEMENTS & AUDIT BOOKS</span>
          </h2>
          <p className="text-[10px] text-[#7D7D7D] uppercase tracking-wider mt-0.5">Statutory balance sheet, trading profit & loss account, and GST tax records.</p>
        </div>
      </div>

      {/* Tabs bar */}
      <div className="px-4 pt-2 bg-[#121212] border-b border-[#262626] flex gap-1 select-none shrink-0">
        <button
          onClick={() => setActiveReportTab('pl')}
          className={`px-4 py-2 text-xs font-bold uppercase tracking-wider transition-colors border-t-2 rounded-none cursor-pointer ${
            activeReportTab === 'pl' 
              ? 'bg-[#202020] border-t-[#FFC000] text-white border-x border-[#262626]' 
              : 'border-t-transparent text-[#7D7D7D] hover:text-white hover:bg-[#181818]'
          }`}
        >
          Profit & Loss Statement
        </button>
        <button
          onClick={() => setActiveReportTab('bs')}
          className={`px-4 py-2 text-xs font-bold uppercase tracking-wider transition-colors border-t-2 rounded-none cursor-pointer ${
            activeReportTab === 'bs' 
              ? 'bg-[#202020] border-t-[#FFC000] text-white border-x border-[#262626]' 
              : 'border-t-transparent text-[#7D7D7D] hover:text-white hover:bg-[#181818]'
          }`}
        >
          Balance Sheet
        </button>
        <button
          onClick={() => setActiveReportTab('tax')}
          className={`px-4 py-2 text-xs font-bold uppercase tracking-wider transition-colors border-t-2 rounded-none cursor-pointer ${
            activeReportTab === 'tax' 
              ? 'bg-[#202020] border-t-[#FFC000] text-white border-x border-[#262626]' 
              : 'border-t-transparent text-[#7D7D7D] hover:text-white hover:bg-[#181818]'
          }`}
        >
          GST Sales Tax Log
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3.5 bg-black">
        {activeReportTab === 'pl' && (
          <div className="bg-[#181818] border border-[#2c2c2c] rounded-none max-w-3xl mx-auto overflow-hidden">
            <div className="bg-[#121212] px-4 py-2.5 border-b border-[#262626] flex justify-between items-center">
              <h3 className="font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 text-white">
                <TrendingUp className="h-4 w-4 text-emerald-400" />
                <span>Trading Profit & Loss Account</span>
              </h3>
              <button
                onClick={handleExportPL}
                className="flex items-center gap-1.5 px-3 py-1 bg-transparent hover:bg-white/10 text-[10px] font-bold uppercase tracking-wider rounded-none border border-white/50 text-white transition-colors cursor-pointer"
              >
                <Download className="h-3 w-3" />
                <span>Export CSV</span>
              </button>
            </div>

            <div className="p-4 divide-y divide-[#262626] text-xs font-bold font-mono space-y-2">
              <div className="flex justify-between py-1.5 text-white text-xs font-bold uppercase">
                <span className="font-sans">Sales Revenue (Turnover):</span>
                <span className="font-mono font-extrabold text-[#FFC000] tabular-nums">₹{salesRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between py-1.5 text-[#7D7D7D]">
                <span className="font-sans">Less: Purchases (Cost of Stock Goods):</span>
                <span className="text-rose-400 font-extrabold tabular-nums">-₹{costOfGoodsSold.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between py-1.5 text-[#7D7D7D]">
                <span className="font-sans">Less: Direct Wages & Manufacturing:</span>
                <span className="text-rose-400 font-extrabold tabular-nums">-₹{directExpenses.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between py-2 border-t border-[#262626] text-sm font-extrabold text-white uppercase font-sans">
                <span>Gross Profit Margin (GP):</span>
                <span className={grossProfit >= 0 ? 'text-emerald-400 font-mono tabular-nums' : 'text-rose-400 font-mono tabular-nums'}>
                  ₹{grossProfit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between py-1.5 text-[#7D7D7D]">
                <span className="font-sans">Less: Indirect Operating & Admin Expenses:</span>
                <span className="text-rose-400 font-extrabold tabular-nums">-₹{indirectExpenses.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between py-3 border-t-2 border-[#FFC000] text-base font-extrabold text-[#FFC000] uppercase font-sans">
                <span>Net Profit / (Loss) for Period:</span>
                <span className={netProfit >= 0 ? 'text-emerald-400 font-mono text-xl tabular-nums' : 'text-rose-400 font-mono text-xl tabular-nums'}>
                  ₹{netProfit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>
        )}

        {activeReportTab === 'bs' && (
          <div className="bg-[#181818] border border-[#2c2c2c] rounded-none max-w-4xl mx-auto overflow-hidden">
            <div className="bg-[#121212] px-4 py-2.5 border-b border-[#262626] flex justify-between items-center">
              <h3 className="font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 text-white">
                <DollarSign className="h-4 w-4 text-[#FFC000]" />
                <span>Balance Sheet Statement</span>
              </h3>
              <button
                onClick={handleExportBS}
                className="flex items-center gap-1.5 px-3 py-1 bg-transparent hover:bg-white/10 text-[10px] font-bold uppercase tracking-wider rounded-none border border-white/50 text-white transition-colors cursor-pointer"
              >
                <Download className="h-3 w-3" />
                <span>Export CSV</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-[#262626] font-sans">
              {/* ASSETS */}
              <div className="p-4 space-y-3">
                <h4 className="font-extrabold text-[10px] text-[#7D7D7D] uppercase tracking-wider border-b border-[#262626] pb-1.5">Assets & Properties</h4>
                <div className="space-y-2 text-xs font-bold font-mono text-white">
                  <div className="flex justify-between border-b border-[#262626] pb-1.5">
                    <span className="font-sans text-[#7D7D7D]">Cash-in-Hand Balance:</span>
                    <span className="tabular-nums">₹{cashAsset.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between border-b border-[#262626] pb-1.5">
                    <span className="font-sans text-[#7D7D7D]">Bank Account Balance:</span>
                    <span className="tabular-nums">₹{bankAsset.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between border-b border-[#262626] pb-1.5">
                    <span className="font-sans text-[#7D7D7D]">Customer Receivables:</span>
                    <span className="tabular-nums text-[#FFC000]">₹{customerReceivables.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between border-t border-[#262626] pt-2 text-xs font-extrabold text-white uppercase font-sans">
                    <span>Total Assets Ledger:</span>
                    <span className="font-mono text-[#FFC000] tabular-nums">₹{totalAssets.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </div>

              {/* LIABILITIES & EQUITIES */}
              <div className="p-4 space-y-3">
                <h4 className="font-extrabold text-[10px] text-[#7D7D7D] uppercase tracking-wider border-b border-[#262626] pb-1.5">Liabilities & Equities</h4>
                <div className="space-y-2 text-xs font-bold font-mono text-white">
                  <div className="flex justify-between border-b border-[#262626] pb-1.5">
                    <span className="font-sans text-[#7D7D7D]">Capital Account Ledger:</span>
                    <span className="tabular-nums">₹{capitalEquity.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between border-b border-[#262626] pb-1.5">
                    <span className="font-sans text-[#7D7D7D]">Supplier Payables:</span>
                    <span className="tabular-nums">₹{(-supplierPayables).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between border-b border-[#262626] pb-1.5 text-emerald-400">
                    <span className="font-sans">Current Period Net Profit:</span>
                    <span className="font-extrabold tabular-nums">₹{netProfit.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between border-t border-[#262626] pt-2 text-xs font-extrabold text-white uppercase font-sans">
                    <span>Total Liab & Capital:</span>
                    <span className="font-mono text-[#FFC000] tabular-nums">₹{totalLiabilitiesEquity.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeReportTab === 'tax' && (
          <div className="erp-table-container rounded-none border border-[#262626] overflow-hidden bg-[#202020] flex flex-col">
            <div className="bg-[#181818] px-4 py-2.5 border-b border-[#262626]">
              <h3 className="font-bold text-xs uppercase tracking-wider text-white">GST Sales Tax Log Registry</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="ag-grid-dense-table w-full text-xs">
                <thead>
                  <tr className="bg-[#181818] border-b border-[#262626] text-[10.5px] uppercase tracking-wider text-[#7D7D7D]">
                    <th className="py-2.5 px-3 text-left w-28">Invoice Date</th>
                    <th className="py-2.5 px-3 text-left w-36">Invoice Number</th>
                    <th className="py-2.5 px-3 text-left w-36">Customer Account</th>
                    <th className="py-2.5 px-3 text-right">Taxable Gross (₹)</th>
                    <th className="py-2.5 px-3 text-right">GST (₹)</th>
                    <th className="py-2.5 px-3 text-right">Grand Total (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#262626] font-medium text-white">
                  {invoices.filter(i => i.invoice_type !== 'Estimate').length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-[#7D7D7D] uppercase text-xs">
                        No GST sales tax invoices generated to date.
                      </td>
                    </tr>
                  ) : (
                    invoices
                      .filter(i => i.invoice_type !== 'Estimate')
                      .map((inv) => (
                        <tr key={inv.id} className="hover:bg-[#282828] transition-colors">
                          <td className="py-2 px-3 font-mono text-[#7D7D7D] tabular-nums">{inv.invoice_date}</td>
                          <td className="py-2 px-3 font-mono font-bold text-[#FFC000]">{inv.invoice_number}</td>
                          <td className="py-2 px-3 uppercase">{inv.customer_id ? 'Registered Ledger' : 'Cash Counter'}</td>
                          <td className="py-2 px-3 text-right font-mono tabular-nums">₹{inv.gross_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                          <td className="py-2 px-3 text-right font-mono text-[#29ABE2] tabular-nums">₹{inv.tax_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-white tabular-nums">₹{inv.net_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
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
