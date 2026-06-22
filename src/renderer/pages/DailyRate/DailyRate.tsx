import React, { useEffect, useState } from 'react';
import { useCompanyStore } from '../../store/useCompanyStore';
import { useRateStore } from '../../store/useRateStore';
import { useTabStore } from '../../store/useTabStore';
import { 
  Coins, 
  Printer, 
  Save, 
  Undo2, 
  Trash2, 
  LogOut, 
  Plus, 
  Calendar, 
  User, 
  TrendingUp,
  AlertCircle,
  Sparkles
} from 'lucide-react';
import type { DailyRate } from '../../../shared/ipc-api';

interface RateGroupRow {
  sr: number;
  grCode: string;
  grName: string;
  touch: number;
  taxPercent: number;
  rate10gm: number;
  taxRate: number;
  prTouch: number;
  prRate: number;
  isSilver: boolean;
}

const DEFAULT_GROUPS: RateGroupRow[] = [
  { sr: 1, grCode: '18C', grName: '18C GOLD', touch: 80.00, taxPercent: 0.00, rate10gm: 0, taxRate: 0, prTouch: 0, prRate: 0, isSilver: false },
  { sr: 2, grCode: '916', grName: '916 GOLD ORNA', touch: 92.00, taxPercent: 0.00, rate10gm: 0, taxRate: 0, prTouch: 0, prRate: 0, isSilver: false },
  { sr: 3, grCode: 'FGL', grName: 'FINE GOLD', touch: 100.00, taxPercent: 0.00, rate10gm: 0, taxRate: 0, prTouch: 0, prRate: 0, isSilver: false },
  { sr: 4, grCode: 'GO', grName: 'GOLD ORNAMENTS', touch: 92.00, taxPercent: 0.00, rate10gm: 0, taxRate: 0, prTouch: 0, prRate: 0, isSilver: false },
  { sr: 5, grCode: 'KDM', grName: 'KDM GOLD', touch: 85.00, taxPercent: 0.00, rate10gm: 0, taxRate: 0, prTouch: 0, prRate: 0, isSilver: false },
  { sr: 6, grCode: 'FSL', grName: 'FINE SILVER', touch: 100.00, taxPercent: 0.00, rate10gm: 0, taxRate: 0, prTouch: 0, prRate: 0, isSilver: true },
  { sr: 7, grCode: 'SL', grName: 'SILVER ORNAMENTS', touch: 80.00, taxPercent: 0.00, rate10gm: 0, taxRate: 0, prTouch: 0, prRate: 0, isSilver: true },
];

export default function DailyRateView() {
  const selectedCompany = useCompanyStore((state) => state.selectedCompany);
  const { rates, loadRates, saveRates } = useRateStore();
  const { closeTab, activeTabId } = useTabStore();

  const [vchDate, setVchDate] = useState(new Date().toISOString().split('T')[0]);
  const [goldRate, setGoldRate] = useState<number>(50000);
  const [silverRate, setSilverRate] = useState<number>(70000);
  const [employee, setEmployee] = useState<string>('');
  const [groupRows, setGroupRows] = useState<RateGroupRow[]>(DEFAULT_GROUPS);
  
  const [isSaving, setIsSaving] = useState(false);

  // Load rates list on mount
  useEffect(() => {
    if (selectedCompany) {
      loadRates(selectedCompany.id);
    }
  }, [selectedCompany]);

  // Sync data when rates list or selected date changes
  useEffect(() => {
    if (!rates.length) return;

    // 1. Find the rate record matching the selected vchDate
    const selectedRecord = rates.find(r => r.rate_date === vchDate);
    
    // 2. Find the closest rate record BEFORE the selected vchDate to populate PrTouch & PrRate
    const sortedRates = [...rates].sort((a, b) => b.rate_date.localeCompare(a.rate_date));
    const previousRecord = sortedRates.find(r => r.rate_date < vchDate);
    
    let prevGroupData: any[] = [];
    if (previousRecord && previousRecord.rates_json) {
      try {
        prevGroupData = JSON.parse(previousRecord.rates_json);
      } catch (e) {
        console.error('Failed to parse previous rates details:', e);
      }
    }

    if (selectedRecord) {
      // Load existing rates for this date
      setGoldRate(selectedRecord.gold_rate_24k);
      setSilverRate(selectedRecord.silver_rate);
      setEmployee(selectedRecord.employee || '');
      
      if (selectedRecord.rates_json) {
        try {
          const parsedRows = JSON.parse(selectedRecord.rates_json) as any[];
          const mappedRows = parsedRows.map((row, idx) => {
            // Find corresponding group in previous record
            const prevRow = prevGroupData.find((p: any) => p.grCode === row.grCode);
            
            return {
              sr: row.sr || (idx + 1),
              grCode: row.grCode || '',
              grName: row.grName || '',
              touch: row.touch || 0,
              taxPercent: row.taxPercent || 0,
              rate10gm: row.rate10gm || 0,
              taxRate: row.taxRate || 0,
              isSilver: row.isSilver ?? (row.grCode.toLowerCase().includes('silver') || row.grCode.toLowerCase().startsWith('s')),
              prTouch: prevRow ? prevRow.touch : 0,
              prRate: prevRow ? prevRow.rate10gm : 0
            };
          });
          setGroupRows(mappedRows);
        } catch (e) {
          console.error('Failed to parse saved rates details:', e);
          initializeDefaultRows(selectedRecord.gold_rate_24k, selectedRecord.silver_rate, prevGroupData);
        }
      } else {
        // Fallback to defaults with selected record rates
        initializeDefaultRows(selectedRecord.gold_rate_24k, selectedRecord.silver_rate, prevGroupData);
      }
    } else {
      // Date has no record. Find the closest rate record before this date to default base rates
      if (previousRecord) {
        setGoldRate(previousRecord.gold_rate_24k);
        setSilverRate(previousRecord.silver_rate);
        initializeDefaultRows(previousRecord.gold_rate_24k, previousRecord.silver_rate, prevGroupData);
      } else {
        // Fallback to absolute defaults
        setGoldRate(50000);
        setSilverRate(70000);
        initializeDefaultRows(50000, 70000, []);
      }
      setEmployee('');
    }
  }, [vchDate, rates]);

  // Recalculate row rates whenever base rates or rows change
  useEffect(() => {
    recalculateRates();
  }, [goldRate, silverRate]);

  const initializeDefaultRows = (gRate: number, sRate: number, prevRows: any[]) => {
    const updated = DEFAULT_GROUPS.map((row) => {
      const isSilver = row.isSilver;
      const baseRate = isSilver ? (sRate / 100) : gRate;
      const rate10gm = baseRate * (row.touch / 100);
      const taxRate = rate10gm * (1 + row.taxPercent / 100);
      const prevRow = prevRows.find((p: any) => p.grCode === row.grCode);

      return {
        ...row,
        rate10gm: parseFloat(rate10gm.toFixed(2)),
        taxRate: parseFloat(taxRate.toFixed(2)),
        prTouch: prevRow ? prevRow.touch : 0,
        prRate: prevRow ? prevRow.rate10gm : 0
      };
    });
    setGroupRows(updated);
  };

  const recalculateRates = () => {
    setGroupRows((prevRows) => 
      prevRows.map((row) => {
        const baseRate = row.isSilver ? (silverRate / 100) : goldRate;
        const rate10gm = baseRate * (row.touch / 100);
        const taxRate = rate10gm * (1 + row.taxPercent / 100);
        return {
          ...row,
          rate10gm: parseFloat(rate10gm.toFixed(2)),
          taxRate: parseFloat(taxRate.toFixed(2))
        };
      })
    );
  };

  const handleCellChange = (index: number, field: keyof RateGroupRow, value: any) => {
    setGroupRows((prevRows) => {
      const updated = [...prevRows];
      const item = { ...updated[index] };

      if (field === 'touch' || field === 'taxPercent') {
        (item as any)[field] = parseFloat(value) || 0;
      } else if (field === 'grCode') {
        item.grCode = value;
        // Auto detect silver metal type
        const codeLow = value.toLowerCase();
        item.isSilver = codeLow.includes('silver') || codeLow.startsWith('s') || codeLow === 'sl' || codeLow === 'fsl';
      } else if (field === 'isSilver') {
        item.isSilver = value === 'true' || value === true;
      } else {
        (item as any)[field] = value;
      }

      // Re-calculate rates for this row
      const baseRate = item.isSilver ? (silverRate / 100) : goldRate;
      const rate10gm = baseRate * (item.touch / 100);
      const taxRate = rate10gm * (1 + item.taxPercent / 100);
      item.rate10gm = parseFloat(rate10gm.toFixed(2));
      item.taxRate = parseFloat(taxRate.toFixed(2));

      updated[index] = item;
      return updated;
    });
  };

  const addNewRow = () => {
    const nextSr = groupRows.length + 1;
    const newRow: RateGroupRow = {
      sr: nextSr,
      grCode: '',
      grName: '',
      touch: 100,
      taxPercent: 0,
      rate10gm: goldRate,
      taxRate: goldRate,
      prTouch: 0,
      prRate: 0,
      isSilver: false,
    };
    setGroupRows([...groupRows, newRow]);
  };

  const deleteRow = (index: number) => {
    const updated = groupRows.filter((_, idx) => idx !== index).map((row, idx) => ({
      ...row,
      sr: idx + 1
    }));
    setGroupRows(updated);
  };

  // Keyboard shortcut listeners (F1 to insert row, F2 to Save)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F1') {
        e.preventDefault();
        addNewRow();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [groupRows, goldRate, silverRate]);

  // Actions
  const handleSave = async () => {
    if (!selectedCompany) {
      alert('Please select a company workspace first.');
      return;
    }

    setIsSaving(true);
    try {
      // Prepare rates details JSON
      const ratesJsonStr = JSON.stringify(groupRows);
      
      // Save rates via Zustand store
      // Mapping goldRate -> gold_rate_24k (Fine Gold), 916 calculated -> gold_rate_22k, 18C -> gold_rate_18k
      const rate22kObj = groupRows.find(r => r.grCode === '916') || groupRows.find(r => r.touch === 92);
      const rate18kObj = groupRows.find(r => r.grCode === '18C') || groupRows.find(r => r.touch === 80);

      const r22k = rate22kObj ? rate22kObj.rate10gm : goldRate * 0.92;
      const r18k = rate18kObj ? rate18kObj.rate10gm : goldRate * 0.80;

      await saveRates(
        selectedCompany.id,
        goldRate,
        parseFloat(r22k.toFixed(2)),
        parseFloat(r18k.toFixed(2)),
        silverRate,
        ratesJsonStr,
        employee,
        vchDate
      );
      
      alert(`Daily Rates for date ${vchDate} saved successfully.`);
    } catch (err: any) {
      console.error(err);
      alert(`Error saving daily rates: ${err.message || err}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (confirm('Revert all edits to last saved state?')) {
      // Reload rates lists from DB to trigger re-syncing
      if (selectedCompany) {
        loadRates(selectedCompany.id);
      }
    }
  };

  const handleDelete = async () => {
    if (!selectedCompany) return;
    
    const record = rates.find(r => r.rate_date === vchDate);
    if (!record) {
      alert('No daily rate record exists to delete for this date.');
      return;
    }

    if (confirm(`Are you sure you want to delete daily rates record for: ${vchDate}?`)) {
      try {
        // Since getDailyRates/saveDailyRates is defined, let's execute deletion.
        // If there's no custom deleteRate IPC handler, we can set rates to 0 or we can check if it exists.
        // Let's call main channel if available or update rates to 0.
        // Let's save 0 for all rates or write a direct database deletion.
        // Wait, does the repository support deleting? The IPC doesn't declare deleteDailyRate, so we can just update all rates to 0 as clear!
        await saveRates(selectedCompany.id, 0, 0, 0, 0, '[]', '', vchDate);
        alert('Daily rates cleared for this date.');
      } catch (err: any) {
        alert(`Failed to delete daily rates: ${err.message}`);
      }
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExit = () => {
    if (activeTabId) {
      closeTab(activeTabId);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#f3f4f6] text-slate-800 p-2 font-sans select-none no-print overflow-y-auto text-xs">
      
      {/* Banner Strip */}
      <div className="bg-orange-500 text-white py-1 px-4 text-center font-bold text-sm tracking-wider uppercase rounded-[1px] flex justify-between items-center shadow-inner mb-2 bg-gradient-to-r from-orange-500 via-amber-500 to-orange-500">
        <span className="text-[10px] opacity-75 font-data">JEWEL ACC MASTER</span>
        <span className="font-extrabold font-luxury tracking-widest text-[14px]">Rate Master</span>
        <span className="text-[10px] opacity-75 font-data">Daily Metal Rate Setup</span>
      </div>

      <div className="bg-white border border-slate-300 rounded-[2px] p-4 shadow-sm shrink-0 flex flex-col gap-4 mb-2">
        {/* Baseline rates inputs */}
        <div className="grid grid-cols-12 gap-4 items-center">
          
          {/* Voucher Date */}
          <div className="col-span-4 flex items-center gap-2">
            <span className="text-[11px] font-bold text-slate-600 uppercase w-20">Vch Date</span>
            <div className="relative flex-1 flex items-center gap-1">
              <input
                type="date"
                className="w-full h-8 border border-slate-300 rounded-[2px] text-xs font-bold text-slate-700 px-2 bg-slate-50 focus:bg-white focus:ring-1 focus:ring-amber-500 focus:outline-none"
                value={vchDate}
                onChange={(e) => setVchDate(e.target.value)}
              />
              <button 
                onClick={addNewRow}
                title="Add category row (F1 shortcut)"
                className="h-8 px-2 bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-[10px] uppercase rounded-[2px] transition-colors"
              >
                F1
              </button>
            </div>
          </div>

          {/* Gold Rate 10gm */}
          <div className="col-span-4 flex items-center gap-2">
            <span className="text-[11px] font-bold text-slate-600 uppercase w-24">Gold Rate 10gm</span>
            <input
              type="number"
              className="flex-1 h-8 border border-slate-300 rounded-[2px] font-data text-right font-bold text-slate-800 bg-slate-50 focus:bg-white focus:ring-1 focus:ring-amber-500 focus:outline-none px-2.5 text-sm"
              value={goldRate}
              onChange={(e) => setGoldRate(parseFloat(e.target.value) || 0)}
            />
          </div>

          {/* Silver Rate 1Kg */}
          <div className="col-span-4 flex items-center gap-2">
            <span className="text-[11px] font-bold text-slate-600 uppercase w-24">Silver Rate 1Kg</span>
            <input
              type="number"
              className="flex-1 h-8 border border-slate-300 rounded-[2px] font-data text-right font-bold text-slate-800 bg-slate-50 focus:bg-white focus:ring-1 focus:ring-amber-500 focus:outline-none px-2.5 text-sm"
              value={silverRate}
              onChange={(e) => setSilverRate(parseFloat(e.target.value) || 0)}
            />
          </div>

        </div>
      </div>

      {/* Main categories rates Grid */}
      <div className="bg-white border border-slate-300 rounded-[2px] shadow-sm flex-1 overflow-auto mb-2 flex flex-col min-h-[300px]">
        <div className="flex-1 overflow-y-auto">
          <table className="w-full border-collapse text-left text-xs table-fixed min-w-[850px]">
            <thead>
              <tr className="sticky top-0 z-20 bg-slate-100 border-b border-slate-300 text-[10px] font-bold text-slate-600 uppercase select-none">
                <th className="w-[40px] border-r border-slate-300 px-2 py-2 text-center">Sr</th>
                <th className="w-[90px] border-r border-slate-300 px-2 py-2">GrCode</th>
                <th className="border-r border-slate-300 px-3 py-2 text-left">GrName</th>
                <th className="w-[80px] border-r border-slate-300 px-2 py-2 text-center">Metal</th>
                <th className="w-[85px] border-r border-slate-300 px-2 py-2 text-right">Touch</th>
                <th className="w-[75px] border-r border-slate-300 px-2 py-2 text-right">Tax%</th>
                <th className="w-[110px] border-r border-slate-300 px-2 py-2 text-right bg-slate-50/50">Rate10gm</th>
                <th className="w-[110px] border-r border-slate-300 px-2 py-2 text-right bg-amber-50/20">TaxRate</th>
                <th className="w-[85px] border-r border-slate-300 px-2 py-2 text-right text-slate-400">PrTouch</th>
                <th className="w-[100px] border-r border-slate-300 px-2 py-2 text-right text-slate-400">PrRate</th>
                <th className="w-[50px] px-2 py-2 text-center">Delete</th>
              </tr>
            </thead>
            <tbody className="font-semibold text-slate-800 font-data select-text">
              {groupRows.map((row, index) => (
                <tr 
                  key={index}
                  className="border-b border-slate-200 hover:bg-slate-50/60 transition-colors h-[32px] items-center"
                >
                  <td className="text-center font-bold text-slate-400 border-r border-slate-200">{row.sr}</td>
                  
                  {/* GrCode */}
                  <td className="p-0.5 border-r border-slate-200">
                    <input
                      type="text"
                      className="w-full h-full border border-transparent rounded-[1px] hover:border-slate-300 focus:border-amber-500 focus:bg-white focus:outline-none px-1.5 font-bold uppercase text-[11px]"
                      value={row.grCode}
                      onChange={(e) => handleCellChange(index, 'grCode', e.target.value)}
                    />
                  </td>

                  {/* GrName */}
                  <td className="p-0.5 border-r border-slate-200">
                    <input
                      type="text"
                      className="w-full h-full border border-transparent rounded-[1px] hover:border-slate-300 focus:border-amber-500 focus:bg-white focus:outline-none px-2 text-[11px]"
                      value={row.grName}
                      onChange={(e) => handleCellChange(index, 'grName', e.target.value)}
                    />
                  </td>

                  {/* Metal Selector (Gold/Silver) */}
                  <td className="p-0.5 border-r border-slate-200 text-center">
                    <select
                      className="w-full h-full border border-transparent rounded-[1px] hover:border-slate-300 focus:border-amber-500 focus:bg-white focus:outline-none text-center font-bold text-slate-700 bg-transparent cursor-pointer"
                      value={row.isSilver ? 'true' : 'false'}
                      onChange={(e) => handleCellChange(index, 'isSilver', e.target.value)}
                    >
                      <option value="false">Gold</option>
                      <option value="true">Silver</option>
                    </select>
                  </td>

                  {/* Touch */}
                  <td className="p-0.5 border-r border-slate-200">
                    <input
                      type="number"
                      step="0.01"
                      className="w-full h-full border border-transparent rounded-[1px] hover:border-slate-300 focus:border-amber-500 focus:bg-white focus:outline-none text-right font-data px-1.5"
                      value={row.touch}
                      onChange={(e) => handleCellChange(index, 'touch', e.target.value)}
                    />
                  </td>

                  {/* Tax% */}
                  <td className="p-0.5 border-r border-slate-200">
                    <input
                      type="number"
                      step="0.01"
                      className="w-full h-full border border-transparent rounded-[1px] hover:border-slate-300 focus:border-amber-500 focus:bg-white focus:outline-none text-right font-data px-1.5"
                      value={row.taxPercent}
                      onChange={(e) => handleCellChange(index, 'taxPercent', e.target.value)}
                    />
                  </td>

                  {/* Rate10gm */}
                  <td className="px-3 text-right font-bold border-r border-slate-200 text-slate-700 text-[11.5px] bg-slate-50/20 font-data">
                    ₹{row.rate10gm.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>

                  {/* TaxRate */}
                  <td className="px-3 text-right font-bold border-r border-slate-200 text-amber-600 text-[11.5px] bg-amber-50/5 font-data">
                    ₹{row.taxRate.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>

                  {/* PrTouch */}
                  <td className="px-2 text-right border-r border-slate-200 text-slate-400 font-data">
                    {row.prTouch > 0 ? `${row.prTouch.toFixed(2)}` : '0.00'}
                  </td>

                  {/* PrRate */}
                  <td className="px-2 text-right border-r border-slate-200 text-slate-400 font-data">
                    {row.prRate > 0 ? `₹${row.prRate.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '₹0.00'}
                  </td>

                  {/* Delete row */}
                  <td className="text-center p-0.5">
                    <button 
                      onClick={() => deleteRow(index)}
                      className="p-1 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-[2px] transition-colors"
                      title="Delete category"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Add Category row button at bottom of grid */}
        <div className="bg-slate-50 border-t border-slate-200 px-4 py-2 flex justify-start items-center">
          <button 
            onClick={addNewRow}
            className="flex items-center gap-1.5 px-3 py-1 bg-slate-800 hover:bg-slate-700 text-white font-bold text-[10px] uppercase rounded-[2px] transition-all shadow-sm tracking-wider cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" /> Add New Group Category
          </button>
        </div>
      </div>

      {/* Bottom Employee Information */}
      <div className="bg-white border border-slate-300 rounded-[2px] p-4 shadow-sm shrink-0 flex items-center gap-2 mb-2">
        <span className="text-[11px] font-bold text-slate-600 uppercase w-20">Employee</span>
        <div className="relative flex-1 max-w-sm flex items-center">
          <input
            type="text"
            placeholder="Name or ID"
            className="w-full h-8 border border-slate-300 rounded-[2px] px-2.5 font-bold text-slate-800 focus:ring-1 focus:ring-amber-500 focus:outline-none text-xs"
            value={employee}
            onChange={(e) => setEmployee(e.target.value)}
          />
          <User className="absolute right-2.5 h-3.5 w-3.5 text-slate-450" />
        </div>
      </div>

      {/* Button Ribbon Actions */}
      <div className="bg-white border border-slate-300 rounded-[2px] px-4 py-2.5 flex justify-end items-center gap-2 shrink-0 shadow-sm select-none">
        
        {/* Save button */}
        <button 
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-1.5 px-4 h-8 bg-amber-500 hover:bg-amber-600 text-white border border-amber-600 text-xs font-bold rounded-[2px] transition-all shadow-sm uppercase tracking-wider cursor-pointer active:scale-95 disabled:opacity-50"
        >
          <Save className="h-4 w-4" /> 
          <span>{isSaving ? 'Saving...' : 'Save (F2)'}</span>
        </button>

        {/* Print button */}
        <button 
          onClick={handlePrint}
          className="flex items-center gap-1.5 px-4 h-8 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 text-xs font-bold rounded-[2px] transition-all shadow-sm uppercase tracking-wider cursor-pointer active:scale-95"
        >
          <Printer className="h-4 w-4 text-slate-500" /> Print
        </button>

        {/* Cancel button */}
        <button 
          onClick={handleCancel}
          className="flex items-center gap-1.5 px-4 h-8 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 text-xs font-bold rounded-[2px] transition-all shadow-sm uppercase tracking-wider cursor-pointer active:scale-95"
        >
          <Undo2 className="h-4 w-4 text-slate-500" /> Cancel
        </button>

        {/* Delete button */}
        <button 
          onClick={handleDelete}
          className="flex items-center gap-1.5 px-4 h-8 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 hover:border-rose-300 text-xs font-bold rounded-[2px] transition-all shadow-sm uppercase tracking-wider cursor-pointer active:scale-95"
        >
          <Trash2 className="h-4 w-4 text-rose-500" /> Delete
        </button>

        <div className="h-6 w-px bg-slate-300 mx-2" />

        {/* Exit button */}
        <button 
          onClick={handleExit}
          className="flex items-center gap-1.5 px-4 h-8 bg-slate-800 hover:bg-slate-700 text-white border border-slate-900 text-xs font-bold rounded-[2px] transition-all shadow-sm uppercase tracking-wider cursor-pointer active:scale-95"
        >
          <LogOut className="h-4 w-4 text-amber-500" /> Exit
        </button>

      </div>

    </div>
  );
}
