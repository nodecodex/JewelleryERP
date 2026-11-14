import React, { useEffect, useState } from 'react';
import { useCompanyStore } from '../../store/useCompanyStore';
import { useVoucherStore } from '../../store/useVoucherStore';
import type { Account, JournalEntry } from '../../../shared/ipc-api';
import { FileSpreadsheet, Plus, AlertCircle, CheckCircle, Trash2 } from 'lucide-react';
import { useDialog } from '../../components/ui/DialogProvider';

interface VoucherItemInput {
  account_id: string;
  debit: number;
  credit: number;
}

export default function AccountingView() {
  const selectedCompany = useCompanyStore((state) => state.selectedCompany);
  const { vouchers, accounts, loadVouchers, loadAccounts, createVoucher } = useVoucherStore();
  const { showToast } = useDialog();

  // Form states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [voucherType, setVoucherType] = useState<'Payment' | 'Receipt' | 'Contra' | 'Journal'>('Journal');
  const [voucherNumber, setVoucherNumber] = useState('');
  const [entryDate, setEntryDate] = useState(new Date().toISOString().split('T')[0]);
  const [narration, setNarration] = useState('');
  const [items, setItems] = useState<VoucherItemInput[]>([
    { account_id: '', debit: 0, credit: 0 },
    { account_id: '', debit: 0, credit: 0 },
  ]);

  useEffect(() => {
    if (selectedCompany) {
      loadAccounts(selectedCompany.id);
      loadVouchers(selectedCompany.id);
      generateVoucherNumber();
    }
  }, [selectedCompany, voucherType, isFormOpen]);

  const generateVoucherNumber = () => {
    const code = voucherType.substring(0, 2).toUpperCase();
    setVoucherNumber(`${code}-${Date.now().toString().slice(-6)}`);
  };

  const handleAddItemRow = () => {
    setItems([...items, { account_id: '', debit: 0, credit: 0 }]);
  };

  const handleRemoveItemRow = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: keyof VoucherItemInput, value: any) => {
    const newItems = [...items];
    if (field === 'account_id') {
      newItems[index].account_id = value;
    } else {
      const numVal = parseFloat(value) || 0;
      newItems[index][field] = numVal;
      // If debit is set, credit is 0, and vice versa (single row entry safety)
      if (field === 'debit' && numVal > 0) {
        newItems[index].credit = 0;
      } else if (field === 'credit' && numVal > 0) {
        newItems[index].debit = 0;
      }
    }
    setItems(newItems);
  };

  const totalDebits = items.reduce((sum, item) => sum + item.debit, 0);
  const totalCredits = items.reduce((sum, item) => sum + item.credit, 0);
  const isBalanced = totalDebits === totalCredits && totalDebits > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCompany) return;
    if (!isBalanced) {
      showToast('Voucher is not balanced. Total debits must equal total credits.', 'warning');
      return;
    }
    if (items.some((i) => !i.account_id)) {
      showToast('Please select an account for all voucher rows.', 'warning');
      return;
    }

    try {
      await createVoucher({
        company_id: selectedCompany.id,
        entry_date: entryDate,
        voucher_type: voucherType,
        voucher_number: voucherNumber,
        narration: narration
      }, items.filter(i => i.debit > 0 || i.credit > 0));

      setIsFormOpen(false);
      setNarration('');
      setItems([
        { account_id: '', debit: 0, credit: 0 },
        { account_id: '', debit: 0, credit: 0 },
      ]);
    } catch (err: any) {
      showToast(`Error saving voucher: ${err.message || err}`, 'error');
    }
  };

  return (
    <div className="flex flex-col h-full bg-background text-foreground overflow-hidden">
      {/* SCREEN HEADER */}
      <div className="px-3.5 lg:px-4 py-2 border-b border-border flex items-center justify-between shrink-0 bg-card">
        <div>
          <h2 className="text-base lg:text-lg font-bold tracking-tight text-foreground flex items-center gap-2">
            <FileSpreadsheet className="h-4.5 w-4.5 text-primary" />
            Double-Entry Accounting & Vouchers
          </h2>
          <p className="text-[11px] text-muted-foreground">General ledger journal entries, contra, cash & bank vouchers.</p>
        </div>
        {!isFormOpen && (
          <button
            onClick={() => {
              generateVoucherNumber();
              setIsFormOpen(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground font-bold rounded-md text-xs uppercase shadow-xs hover:bg-primary/90 transition-all cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>New Voucher (F7)</span>
          </button>
        )}
      </div>

      <div className="flex-1 flex flex-col overflow-hidden p-3 lg:p-3.5">
        {isFormOpen ? (
          <div className="max-w-3xl mx-auto w-full h-full min-h-0 overflow-hidden flex flex-col animate-in fade-in duration-200">
            <form onSubmit={handleSubmit} className="overflow-hidden flex flex-col h-full min-h-0 bg-card text-card-foreground border border-border rounded-lg shadow-2xs">
              <div className="bg-secondary/40 px-4 py-2.5 border-b border-border flex justify-between items-center shrink-0 select-none">
                <h3 className="font-bold text-xs uppercase tracking-wider text-foreground">
                  Post Double-Entry Voucher
                </h3>
                <span className="text-[10px] text-primary font-mono font-bold uppercase">UNPOSTED DRAFT</span>
              </div>

              <div className="p-4 space-y-3.5 overflow-y-auto flex-1 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div>
                    <label className="erp-label text-[10px] block mb-1">Voucher Type *</label>
                    <select
                      className="w-full h-8 px-2 font-bold border border-border rounded text-foreground bg-background focus:outline-none focus:border-primary cursor-pointer"
                      value={voucherType}
                      onChange={(e) => setVoucherType(e.target.value as any)}
                    >
                      <option value="Journal">Journal Voucher (JV)</option>
                      <option value="Payment">Payment Voucher (PV)</option>
                      <option value="Receipt">Receipt Voucher (RV)</option>
                      <option value="Contra">Contra (Cash-Bank)</option>
                    </select>
                  </div>

                  <div>
                    <label className="erp-label text-[10px] block mb-1">Voucher No *</label>
                    <input
                      type="text"
                      required
                      className="w-full h-8 px-2 font-mono font-bold border border-border rounded text-foreground bg-background focus:outline-none focus:border-primary"
                      value={voucherNumber}
                      onChange={(e) => setVoucherNumber(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="erp-label text-[10px] block mb-1">Posting Date *</label>
                    <input
                      type="date"
                      required
                      className="w-full h-8 px-2 font-mono border border-border rounded text-foreground bg-background focus:outline-none focus:border-primary"
                      value={entryDate}
                      onChange={(e) => setEntryDate(e.target.value)}
                    />
                  </div>
                </div>

                {/* Double-entry grid section */}
                <div className="space-y-2 border-t border-border pt-3">
                  <div className="grid grid-cols-12 gap-2 px-1 text-[9.5px] font-bold text-muted-foreground uppercase tracking-wider">
                    <div className="col-span-6">Account Ledger Account Name</div>
                    <div className="col-span-2.5 text-right">Debit Amt (₹)</div>
                    <div className="col-span-2.5 text-right">Credit Amt (₹)</div>
                    <div className="col-span-1 text-center">Action</div>
                  </div>
                  
                  <div className="space-y-1.5">
                    {items.map((item, index) => (
                      <div key={index} className="grid grid-cols-12 gap-2 items-center">
                        <div className="col-span-6">
                          <select
                            required
                            className="w-full h-8 px-2 border border-border rounded text-foreground bg-background text-xs font-semibold focus:outline-none focus:border-primary cursor-pointer"
                            value={item.account_id}
                            onChange={(e) => handleItemChange(index, 'account_id', e.target.value)}
                          >
                            <option value="">-- Select Ledger Account --</option>
                            {accounts.map((acc) => (
                              <option key={acc.id} value={acc.id}>
                                {acc.name} ({acc.parent_group})
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="col-span-2.5">
                          <input
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            className="w-full h-8 px-2 border border-border rounded text-foreground bg-background text-right font-mono"
                            value={item.debit || ''}
                            onChange={(e) => handleItemChange(index, 'debit', e.target.value)}
                          />
                        </div>
                        <div className="col-span-2.5">
                          <input
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            className="w-full h-8 px-2 border border-border rounded text-foreground bg-background text-right font-mono"
                            value={item.credit || ''}
                            onChange={(e) => handleItemChange(index, 'credit', e.target.value)}
                          />
                        </div>
                        <div className="col-span-1 text-center">
                          {items.length > 2 ? (
                            <button
                              type="button"
                              onClick={() => handleRemoveItemRow(index)}
                              className="text-xs text-rose-500 hover:text-rose-600 font-bold uppercase cursor-pointer"
                            >
                              Del
                            </button>
                          ) : (
                            <span className="text-[10px] text-muted-foreground/40 font-bold">-</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={handleAddItemRow}
                    className="px-2 py-1 text-xs text-primary hover:underline font-bold uppercase flex items-center gap-1 cursor-pointer"
                  >
                    <span>+ Insert Ledger Row</span>
                  </button>
                </div>

                {/* Balanced state notifier */}
                <div className="bg-secondary/30 border border-border p-2.5 rounded flex items-center justify-between font-mono text-xs">
                  <div className="flex gap-4 sm:gap-6 font-bold text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] uppercase">Debits:</span>
                      <span className="text-foreground">₹{totalDebits.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] uppercase">Credits:</span>
                      <span className="text-foreground">₹{totalCredits.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                  {isBalanced ? (
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1 uppercase tracking-wider bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
                      <CheckCircle className="h-3 w-3" /> Balanced
                    </span>
                  ) : (
                    <span className="text-[10px] text-rose-600 dark:text-rose-400 font-bold flex items-center gap-1 uppercase tracking-wider bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded">
                      <AlertCircle className="h-3 w-3" /> Diff: ₹{Math.abs(totalDebits - totalCredits).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  )}
                </div>

                <div>
                  <label className="erp-label text-[10px] block mb-1">Voucher Narration / Memo</label>
                  <textarea
                    rows={2}
                    placeholder="Enter accounting transaction details and reference tags..."
                    className="w-full bg-background border border-border p-2 rounded text-xs focus:outline-none focus:border-primary font-medium"
                    value={narration}
                    onChange={(e) => setNarration(e.target.value)}
                  />
                </div>
              </div>

              <div className="bg-secondary/20 px-4 py-2 border-t border-border flex justify-end gap-2 shrink-0 select-none">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-1.5 bg-secondary text-secondary-foreground hover:bg-secondary/80 font-bold rounded text-xs uppercase cursor-pointer transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!isBalanced}
                  className="px-5 py-1.5 bg-primary text-primary-foreground font-bold rounded text-xs uppercase shadow-xs hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all"
                >
                  Post Voucher
                </button>
              </div>
            </form>
          </div>
        ) : (
          <div className="flex-1 erp-table-container rounded-lg border border-border overflow-hidden bg-card shadow-2xs flex flex-col">
            <div className="bg-secondary/40 px-3.5 py-2 border-b border-border flex justify-between items-center shrink-0">
              <h3 className="font-bold text-xs uppercase tracking-wider text-foreground">Day Book & Journal Ledger</h3>
              <span className="text-[10px] font-mono text-muted-foreground uppercase font-bold">Vouchers Count: {vouchers.length}</span>
            </div>
            <div className="flex-1 overflow-y-auto">
              <table className="ag-grid-dense-table w-full text-xs">
                <thead className="sticky top-0 bg-secondary/80 backdrop-blur-xs z-10">
                  <tr className="border-b border-border text-[10.5px] uppercase tracking-wider text-muted-foreground">
                    <th className="py-2 px-3 text-left w-24">Date</th>
                    <th className="py-2 px-3 text-left w-32">Voucher No</th>
                    <th className="py-2 px-3 text-center w-24">Type</th>
                    <th className="py-2 px-3 text-left">Narration & Ledger Accounts</th>
                    <th className="py-2 px-3 text-right w-28">Debit (₹)</th>
                    <th className="py-2 px-3 text-right w-28">Credit (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40 font-medium">
                  {vouchers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-14 text-center text-muted-foreground/40 italic">
                        No double-entry vouchers recorded. Click 'New Voucher' to create transactions.
                      </td>
                    </tr>
                  ) : (
                    vouchers.map((v) => {
                      const debitTotal = v.items?.reduce((s, i) => s + i.debit, 0) || 0;
                      const creditTotal = v.items?.reduce((s, i) => s + i.credit, 0) || 0;
                      return (
                        <tr key={v.id} className="hover:bg-muted/40 transition-colors">
                          <td className="py-1.5 px-3 font-mono text-muted-foreground tabular-nums">{v.entry_date}</td>
                          <td className="py-1.5 px-3 font-mono font-bold text-primary">{v.voucher_number}</td>
                          <td className="py-1.5 px-3 text-center">
                            <span className={`px-2 py-0.5 rounded text-[9.5px] font-bold border uppercase tracking-wider ${
                              v.voucher_type === 'Payment' ? 'bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400' :
                              v.voucher_type === 'Receipt' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400' :
                              v.voucher_type === 'Contra' ? 'bg-blue-500/10 border-blue-500/20 text-blue-600 dark:text-blue-400' :
                              'bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400'
                            }`}>
                              {v.voucher_type}
                            </span>
                          </td>
                          <td className="py-1.5 px-3">
                            <p className="font-semibold text-foreground">{v.narration || '-'}</p>
                            <span className="text-[9.5px] text-muted-foreground font-mono">Ref: {v.reference_id || 'Manual Entry'}</span>
                          </td>
                          <td className="py-1.5 px-3 text-right font-mono font-bold text-foreground tabular-nums">₹{debitTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                          <td className="py-1.5 px-3 text-right font-mono font-bold text-foreground tabular-nums">₹{creditTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                        </tr>
                      );
                    })
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
