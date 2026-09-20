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
    <div className="flex flex-col h-full bg-background overflow-hidden transition-colors duration-200">
      <div className="px-6 py-4 border-b border-border flex items-center justify-between shrink-0 bg-card text-foreground shadow-sm">
        <div>
          <h2 className="text-lg font-bold tracking-wide font-luxury text-primary flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            DOUBLE-ENTRY VOUCHERS REGISTRY
          </h2>
          <p className="text-[12px] text-muted-foreground mt-0.5">Post and reconcile ledger journal accounts.</p>
        </div>
        {!isFormOpen && (
          <button
            onClick={() => {
              generateVoucherNumber();
              setIsFormOpen(true);
            }}
            className="btn btn-primary"
          >
            <Plus className="h-4 w-4 mr-1" />
            New Voucher Entry
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
        {isFormOpen ? (
          <form onSubmit={handleSubmit} className="surface-premium bg-card p-0 mx-auto max-w-4xl overflow-hidden shadow-sm">
            <div className="bg-primary text-primary-foreground px-4 py-2 border-b border-border flex justify-between items-center">
              <h3 className="font-bold text-[12px] uppercase tracking-wider font-luxury">
                Post New Accounting Voucher
              </h3>
              <span className="text-[10px] text-primary-foreground/80 font-bold font-data">STATUS: UNPOSTED</span>
            </div>

            <div className="p-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="erp-label">Voucher Type *</label>
                  <select
                    className="erp-input w-full"
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
                  <label className="erp-label">Voucher No *</label>
                  <input
                    type="text"
                    required
                    className="erp-input w-full font-data"
                    value={voucherNumber}
                    onChange={(e) => setVoucherNumber(e.target.value)}
                  />
                </div>

                <div>
                  <label className="erp-label">Posting Date *</label>
                  <input
                    type="date"
                    required
                    className="erp-input w-full font-data"
                    value={entryDate}
                    onChange={(e) => setEntryDate(e.target.value)}
                  />
                </div>
              </div>

              {/* Double-entry grid section */}
              <div className="border-t border-border pt-4">
                <div className="grid grid-cols-12 gap-2 px-2 text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">
                  <div className="col-span-6">Account Ledger</div>
                  <div className="col-span-2 text-right">Debit Amt (₹)</div>
                  <div className="col-span-3 text-right">Credit Amt (₹)</div>
                  <div className="col-span-1 text-center"></div>
                </div>
                
                <div className="space-y-2">
                  {items.map((item, index) => (
                    <div key={index} className="grid grid-cols-12 gap-2 items-center">
                      <div className="col-span-6">
                        <select
                          required
                          className="erp-input w-full"
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
                      <div className="col-span-2">
                        <input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          className="erp-input w-full text-right font-data"
                          value={item.debit || ''}
                          onChange={(e) => handleItemChange(index, 'debit', e.target.value)}
                        />
                      </div>
                      <div className="col-span-3">
                        <input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          className="erp-input w-full text-right font-data"
                          value={item.credit || ''}
                          onChange={(e) => handleItemChange(index, 'credit', e.target.value)}
                        />
                      </div>
                      <div className="col-span-1 flex justify-center">
                        {items.length > 2 ? (
                          <button
                            type="button"
                            onClick={() => handleRemoveItemRow(index)}
                            className="btn-icon text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        ) : (
                          <span className="text-muted-foreground/30 font-bold">-</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={handleAddItemRow}
                  className="mt-3 text-[11px] text-primary hover:underline font-bold uppercase tracking-widest flex items-center gap-1"
                >
                  + Insert Ledger Row
                </button>
              </div>

              {/* Balanced state notifier */}
              <div className="bg-secondary/20 border border-border p-3 flex items-center justify-between font-data text-xs mt-4">
                <div className="flex gap-8 font-bold text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] tracking-widest uppercase">Total Debits:</span>
                    <span className="text-foreground text-[14px]">₹{totalDebits.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] tracking-widest uppercase">Total Credits:</span>
                    <span className="text-foreground text-[14px]">₹{totalCredits.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
                {isBalanced ? (
                  <span className="text-[11px] text-success font-bold flex items-center gap-1 uppercase tracking-wider bg-success/10 border border-success/20 px-2 py-0.5 rounded">
                    <CheckCircle className="h-4 w-4" /> Balanced
                  </span>
                ) : (
                  <span className="text-[11px] text-destructive font-bold flex items-center gap-1 uppercase tracking-wider bg-destructive/10 border border-destructive/20 px-2 py-0.5 rounded">
                    <AlertCircle className="h-4 w-4" /> Diff: ₹{Math.abs(totalDebits - totalCredits).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                )}
              </div>

              <div className="space-y-1">
                <label className="erp-label">Voucher Narration / Memo Description</label>
                <textarea
                  rows={2}
                  placeholder="Enter accounting transaction details and reference tags..."
                  className="erp-input w-full h-auto"
                  value={narration}
                  onChange={(e) => setNarration(e.target.value)}
                />
              </div>

              <div className="flex justify-end gap-3 border-t border-border pt-4">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!isBalanced}
                  className="btn btn-primary shadow-premium px-8"
                >
                  Post Ledger Voucher
                </button>
              </div>
            </div>
          </form>
        ) : (
          <div className="surface-premium bg-card overflow-hidden">
            <div className="p-4 border-b border-border">
              <h3 className="font-bold text-[13px] uppercase tracking-wider font-luxury">Vouchers Day Book Registry</h3>
            </div>
            <div className="erp-table-container border-t-0 rounded-none">
              <table className="ag-grid-dense-table border-t-0">
                <thead>
                  <tr>
                    <th className="p-2 w-28">Posting Date</th>
                    <th className="p-2 w-36">Voucher Number</th>
                    <th className="p-2 w-32">Voucher Type</th>
                    <th className="p-2">Narration Summary & Details</th>
                    <th className="p-2 text-right w-36">Total Debit (₹)</th>
                    <th className="p-2 text-right w-36">Total Credit (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {vouchers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-muted-foreground italic font-medium">
                        No double-entry vouchers recorded. Click 'New Voucher Entry' to log transaction ledger.
                      </td>
                    </tr>
                  ) : (
                    vouchers.map((v) => {
                      const debitTotal = v.items?.reduce((s, i) => s + i.debit, 0) || 0;
                      const creditTotal = v.items?.reduce((s, i) => s + i.credit, 0) || 0;
                      return (
                        <tr key={v.id}>
                          <td className="p-2 font-data text-muted-foreground">{v.entry_date}</td>
                          <td className="p-2 font-data font-bold text-foreground">{v.voucher_number}</td>
                          <td className="p-2">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wider ${
                              v.voucher_type === 'Payment' ? 'bg-destructive/10 border-destructive/20 text-destructive' :
                              v.voucher_type === 'Receipt' ? 'bg-success/10 border-success/20 text-success' :
                              v.voucher_type === 'Contra' ? 'bg-info/10 border-info/20 text-info' :
                              'bg-warning/10 border-warning/20 text-warning'
                            }`}>
                              {v.voucher_type}
                            </span>
                          </td>
                          <td className="p-2 text-[12px]">
                            <p className="text-foreground font-semibold">{v.narration || '-'}</p>
                            <span className="text-[10px] text-muted-foreground font-data uppercase font-bold">Ref: {v.reference_id || 'Manual Entry'}</span>
                          </td>
                          <td className="p-2 text-right font-data font-bold text-foreground">₹{debitTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                          <td className="p-2 text-right font-data font-bold text-foreground">₹{creditTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
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
