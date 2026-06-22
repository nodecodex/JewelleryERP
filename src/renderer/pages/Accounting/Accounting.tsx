import React, { useEffect, useState } from 'react';
import { useCompanyStore } from '../../store/useCompanyStore';
import { useVoucherStore } from '../../store/useVoucherStore';
import type { Account, JournalEntry } from '../../../shared/ipc-api';
import { FileSpreadsheet, Plus, AlertCircle, CheckCircle } from 'lucide-react';

interface VoucherItemInput {
  account_id: string;
  debit: number;
  credit: number;
}

export default function AccountingView() {
  const selectedCompany = useCompanyStore((state) => state.selectedCompany);
  const { vouchers, accounts, loadVouchers, loadAccounts, createVoucher } = useVoucherStore();

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
      alert('Voucher is not balanced. Total debits must equal total credits.');
      return;
    }
    if (items.some((i) => !i.account_id)) {
      alert('Please select an account for all voucher rows.');
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
      alert(`Error saving voucher: ${err.message || err}`);
    }
  };

  return (
    <div className="p-3 bg-[#eef1f6] h-full overflow-y-auto max-h-[calc(100vh-105px)] font-sans">
      <div className="flex justify-between items-center border-b border-slate-300 pb-2 mb-3">
        <div>
          <h2 className="text-sm font-bold flex items-center gap-1.5 text-slate-800 uppercase tracking-wider font-luxury">
            <FileSpreadsheet className="h-4.5 w-4.5 text-amber-500" />
            <span>Double-Entry Vouchers Registry</span>
          </h2>
          <p className="text-[10px] text-slate-500 font-semibold uppercase">Post and reconcile ledger journal accounts.</p>
        </div>
        {!isFormOpen && (
          <button
            onClick={() => {
              generateVoucherNumber();
              setIsFormOpen(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-[2px] text-xs uppercase border border-slate-900 shadow-sm transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>New Voucher Entry</span>
          </button>
        )}
      </div>

      {isFormOpen ? (
        <form onSubmit={handleSubmit} className="bg-white border border-slate-350 rounded-[2px] p-4 space-y-4 max-w-4xl mx-auto shadow-sm">
          <div className="bg-slate-800 text-slate-100 px-3 py-1.5 -mx-4 -mt-4 border-b border-slate-900 flex justify-between items-center">
            <h3 className="font-bold text-xs uppercase tracking-wider font-luxury">
              Post New Accounting Voucher
            </h3>
            <span className="text-[9px] text-amber-400 font-bold font-data">STATUS: UNPOSTED</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="erp-label block mb-1">Voucher Type *</label>
              <select
                className="erp-input border-slate-300 bg-white font-bold"
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
              <label className="erp-label block mb-1 font-data">Voucher No *</label>
              <input
                type="text"
                required
                className="erp-input border-slate-300 bg-white font-data"
                value={voucherNumber}
                onChange={(e) => setVoucherNumber(e.target.value)}
              />
            </div>

            <div>
              <label className="erp-label block mb-1">Posting Date *</label>
              <input
                type="date"
                required
                className="erp-input border-slate-300 bg-white font-data text-xs"
                value={entryDate}
                onChange={(e) => setEntryDate(e.target.value)}
              />
            </div>
          </div>

          {/* Double-entry grid section */}
          <div className="space-y-2.5 border-t border-slate-200 pt-3">
            <div className="grid grid-cols-12 gap-2 px-1 text-[9px] font-bold text-slate-400 uppercase tracking-wider">
              <div className="col-span-6">Account Ledger Account Name</div>
              <div className="col-span-2.5 text-right">Debit Amt (₹)</div>
              <div className="col-span-2.5 text-right">Credit Amt (₹)</div>
              <div className="col-span-1 text-center">Delete</div>
            </div>
            
            <div className="space-y-2">
              {items.map((item, index) => (
                <div key={index} className="grid grid-cols-12 gap-2 items-center">
                  <div className="col-span-6">
                    <select
                      required
                      className="erp-input border-slate-300 bg-white text-xs font-bold focus:outline-none"
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
                      className="erp-input border-slate-350 bg-white text-right font-data"
                      value={item.debit || ''}
                      onChange={(e) => handleItemChange(index, 'debit', e.target.value)}
                    />
                  </div>
                  <div className="col-span-2.5">
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      className="erp-input border-slate-355 bg-white text-right font-data"
                      value={item.credit || ''}
                      onChange={(e) => handleItemChange(index, 'credit', e.target.value)}
                    />
                  </div>
                  <div className="col-span-1 text-center">
                    {items.length > 2 ? (
                      <button
                        type="button"
                        onClick={() => handleRemoveItemRow(index)}
                        className="text-xs text-rose-500 hover:text-rose-600 font-bold uppercase"
                      >
                        Del
                      </button>
                    ) : (
                      <span className="text-[10px] text-slate-300 font-bold">-</span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={handleAddItemRow}
              className="px-2.5 py-1 text-xs text-amber-600 hover:text-amber-700 hover:underline font-extrabold uppercase flex items-center gap-0.5"
            >
              <span>+ Insert Ledger Row</span>
            </button>
          </div>

          {/* Balanced state notifier */}
          <div className="bg-slate-50 border border-slate-200 p-3 rounded-[2px] flex items-center justify-between font-data text-xs">
            <div className="flex gap-6 font-bold text-slate-600">
              <div className="flex items-center gap-1">
                <span>TOTAL DEBITS:</span>
                <span className="text-slate-900">₹{totalDebits.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex items-center gap-1">
                <span>TOTAL CREDITS:</span>
                <span className="text-slate-900">₹{totalCredits.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
            {isBalanced ? (
              <span className="text-[11px] text-emerald-600 font-bold flex items-center gap-1 uppercase tracking-wider bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-[2px]">
                <CheckCircle className="h-3.5 w-3.5" /> Balanced
              </span>
            ) : (
              <span className="text-[11px] text-rose-600 font-bold flex items-center gap-1 uppercase tracking-wider bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-[2px]">
                <AlertCircle className="h-3.5 w-3.5" /> Diff: ₹{Math.abs(totalDebits - totalCredits).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            )}
          </div>

          <div className="space-y-1">
            <label className="erp-label block mb-1">Voucher Narration / Memo Description</label>
            <textarea
              rows={2}
              placeholder="Enter accounting transaction details and reference tags..."
              className="w-full bg-white border border-slate-300 p-2 rounded-[2px] text-xs focus:outline-none focus:border-amber-500 font-semibold"
              value={narration}
              onChange={(e) => setNarration(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2 border-t border-slate-200 pt-3">
            <button
              type="button"
              onClick={() => setIsFormOpen(false)}
              className="px-3 py-1.5 border border-slate-300 text-slate-700 hover:bg-slate-50 font-bold rounded-[2px] text-xs uppercase"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!isBalanced}
              className="px-4 py-1.5 bg-amber-500 hover:bg-amber-600 disabled:bg-slate-200 disabled:text-slate-400 disabled:border-slate-300 text-white font-extrabold rounded-[2px] text-xs uppercase border border-amber-600 shadow-sm transition-all"
            >
              Post Ledger Voucher
            </button>
          </div>
        </form>
      ) : (
        <div className="bg-white border border-slate-350 rounded-[2px] overflow-hidden shadow-sm">
          <div className="bg-slate-800 text-slate-100 px-3 py-2 border-b border-slate-900">
            <h3 className="font-bold text-xs uppercase tracking-wider font-luxury">Vouchers Day Book Registry</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="ag-grid-dense-table font-sans">
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
              <tbody className="font-semibold text-slate-700 bg-white">
                {vouchers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-400 italic font-medium">
                      No double-entry vouchers recorded. Click 'New Voucher Entry' to log transaction ledger.
                    </td>
                  </tr>
                ) : (
                  vouchers.map((v) => {
                    const debitTotal = v.items?.reduce((s, i) => s + i.debit, 0) || 0;
                    const creditTotal = v.items?.reduce((s, i) => s + i.credit, 0) || 0;
                    return (
                      <tr key={v.id} className="border-b border-slate-150">
                        <td className="p-1.5 font-data text-xs">{v.entry_date}</td>
                        <td className="p-1.5 font-data text-xs text-slate-850 font-bold">{v.voucher_number}</td>
                        <td className="p-1.5">
                          <span className={`px-2 py-0.5 rounded-[2px] text-[9.5px] font-bold border uppercase tracking-wider ${
                            v.voucher_type === 'Payment' ? 'bg-rose-50 border-rose-200 text-rose-700' :
                            v.voucher_type === 'Receipt' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' :
                            v.voucher_type === 'Contra' ? 'bg-blue-50 border-blue-200 text-blue-700' :
                            'bg-amber-50 border-amber-200 text-amber-700'
                          }`}>
                            {v.voucher_type}
                          </span>
                        </td>
                        <td className="p-1.5 text-xs">
                          <p className="text-slate-800 font-semibold">{v.narration || '-'}</p>
                          <span className="text-[9px] text-slate-400 font-data uppercase font-bold">Ref: {v.reference_id || 'Manual Entry'}</span>
                        </td>
                        <td className="p-1.5 text-right font-data text-slate-900">₹{debitTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                        <td className="p-1.5 text-right font-data text-slate-900">₹{creditTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
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
  );
}
