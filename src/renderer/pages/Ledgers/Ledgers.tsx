import React, { useEffect, useState } from 'react';
import { useCompanyStore } from '../../store/useCompanyStore';
import { useVoucherStore } from '../../store/useVoucherStore';
import type { Account } from '../../../shared/ipc-api';
import { History, Search, Calendar, FileText } from 'lucide-react';

export default function LedgersView() {
  const selectedCompany = useCompanyStore((state) => state.selectedCompany);
  const { accounts, loadAccounts } = useVoucherStore();
  const [selectedAccountId, setSelectedAccountId] = useState('');
  
  // Filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Report details
  const [report, setReport] = useState<any[]>([]);

  useEffect(() => {
    if (selectedCompany) {
      loadAccounts(selectedCompany.id);
    }
  }, [selectedCompany]);

  useEffect(() => {
    if (accounts.length > 0 && !selectedAccountId) {
      setSelectedAccountId(accounts[0].id);
    }
  }, [accounts, selectedAccountId]);

  useEffect(() => {
    if (selectedCompany && selectedAccountId) {
      loadLedgerReport();
    } else {
      setReport([]);
    }
  }, [selectedCompany, selectedAccountId, startDate, endDate]);

  const loadLedgerReport = async () => {
    if (!selectedCompany || !selectedAccountId) return;
    try {
      const logs = await (window as any).api.getLedgerReport(
        selectedCompany.id,
        selectedAccountId,
        startDate || undefined,
        endDate || undefined
      );
      setReport(logs);
    } catch (e) {
      console.error(e);
    }
  };

  const selectedAccountDetails = accounts.find((a) => a.id === selectedAccountId);

  return (
    <div className="p-3 bg-background h-full overflow-y-auto  font-sans">
      <div className="flex justify-between items-center border-b border-border pb-2 mb-3">
        <div>
          <h2 className="text-sm font-bold flex items-center gap-1.5 text-foreground uppercase tracking-wider font-luxury">
            <History className="h-4.5 w-4.5 text-amber-500" />
            <span>Ledger Books & Statements</span>
          </h2>
          <p className="text-[10px] text-muted-foreground font-semibold uppercase">Reconcile transaction histories and ledger sheets.</p>
        </div>
      </div>

      {/* Filter panel */}
      <div className="bg-card border border-border p-3 rounded-sm shadow-sm grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
        <div>
          <label className="erp-label block mb-1">Select Account Ledger</label>
          <select
            className="erp-input border-border bg-card font-bold focus:outline-none"
            value={selectedAccountId}
            onChange={(e) => setSelectedAccountId(e.target.value)}
          >
            <option value="">-- Select Account --</option>
            {accounts.map((acc) => (
              <option key={acc.id} value={acc.id}>
                {acc.name} ({acc.parent_group})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="erp-label block mb-1">From Date</label>
          <input
            type="date"
            className="erp-input border-border bg-card font-data text-xs"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>

        <div>
          <label className="erp-label block mb-1">To Date</label>
          <input
            type="date"
            className="erp-input border-border bg-card font-data text-xs"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>
      </div>

      {/* Ledger Report Output */}
      {selectedAccountDetails ? (
        <div className="space-y-3">
          <div className="flex justify-between items-center bg-card p-3 rounded-sm border border-border shadow-sm">
            <div>
              <h3 className="font-bold text-xs uppercase text-foreground tracking-wider font-luxury">{selectedAccountDetails.name}</h3>
              <p className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider mt-0.5">GROUP: {selectedAccountDetails.parent_group}</p>
            </div>
            <div className="text-right">
              <span className="text-[9px] text-muted-foreground font-bold uppercase tracking-wider block">Outstanding Balance</span>
              <span className="font-mono font-extrabold text-sm text-amber-600">
                ₹{selectedAccountDetails.current_balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          <div className="bg-card border border-border rounded-sm overflow-hidden shadow-sm">
            <div className="bg-card text-foreground px-3 py-1.5 border-b border-border">
              <h3 className="font-bold text-xs uppercase tracking-wider font-luxury">Statement Ledger Entries</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="ag-grid-dense-table font-sans">
                <thead>
                  <tr>
                    <th className="p-2 w-28">Posting Date</th>
                    <th className="p-2 w-32">Voucher Type</th>
                    <th className="p-2 w-36">Voucher Number</th>
                    <th className="p-2">Narration Summary & Remarks</th>
                    <th className="p-2 text-right w-36">Debit (+)</th>
                    <th className="p-2 text-right w-36">Credit (-)</th>
                    <th className="p-2 text-right w-36">Running Balance</th>
                  </tr>
                </thead>
                <tbody className="font-semibold text-foreground bg-card">
                  {report.length <= 1 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-450 italic font-medium">
                        No transactions registered for this account ledger during the selected timeframe.
                      </td>
                    </tr>
                  ) : (
                    report.map((row, index) => {
                      const isOpening = row.voucher_type === 'Opening Balance';
                      return (
                        <tr 
                          key={index} 
                          className={`border-b border-border ${
                            isOpening ? 'bg-secondary/20 font-bold border-b-2 border-border' : ''
                          }`}
                        >
                          <td className="p-1.5 font-data text-xs">{row.entry_date}</td>
                          <td className="p-1.5 font-sans text-xs">
                            {isOpening ? (
                              <span className="font-extrabold text-amber-600 uppercase tracking-wider text-[10px]">{row.voucher_type}</span>
                            ) : (
                              row.voucher_type
                            )}
                          </td>
                          <td className="p-1.5 font-data text-xs">{row.voucher_number || '-'}</td>
                          <td className="p-1.5 text-xs text-muted-foreground max-w-xs truncate">{row.narration || '-'}</td>
                          <td className="p-1.5 text-right font-data text-emerald-600">
                            {row.debit > 0 ? `₹${row.debit.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '-'}
                          </td>
                          <td className="p-1.5 text-right font-data text-rose-500">
                            {row.credit > 0 ? `₹${row.credit.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '-'}
                          </td>
                          <td className={`p-1.5 text-right font-data font-bold ${row.balance < 0 ? 'text-rose-600' : 'text-slate-900'}`}>
                            ₹{row.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center p-12 text-center bg-card border border-border rounded-sm shadow-sm">
          <FileText className="h-10 w-10 text-muted-foreground mb-2.5 animate-pulse" />
          <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">
            Select a specific account ledger from the filter toolbar above to view the book entries.
          </p>
        </div>
      )}
    </div>
  );
}
