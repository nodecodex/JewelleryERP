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
import { useDialog } from '../../components/ui/DialogProvider';

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
  const { showToast, showConfirm } = useDialog();

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
      showToast('Please select a company workspace first.', 'warning');
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
      
      showToast(`Daily Rates for date ${vchDate} saved successfully.`, 'success');
    } catch (err: any) {
      console.error(err);
      showToast(`Error saving daily rates: ${err.message || err}`, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = async () => {
    const confirmed = await showConfirm({
      title: 'Revert Edits',
      message: 'Revert all edits to last saved state?',
      variant: 'warning',
      confirmText: 'Revert',
    });
    if (confirmed) {
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
      showToast('No daily rate record exists to delete for this date.', 'warning');
      return;
    }

    const confirmed = await showConfirm({
      title: 'Delete Daily Rate',
      message: `Are you sure you want to delete daily rates record for: ${vchDate}?`,
      variant: 'danger',
      confirmText: 'Delete',
    });

    if (confirmed) {
      try {
        await saveRates(selectedCompany.id, 0, 0, 0, 0, '[]', '', vchDate);
        showToast('Daily rates cleared for this date.', 'success');
      } catch (err: any) {
        showToast(`Failed to delete daily rates: ${err.message}`, 'error');
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
    <div className="flex flex-col h-full bg-background text-foreground p-3 font-sans select-none no-print overflow-y-auto text-xs">
      
      {/* Header Banner */}
      <div className="bg-secondary border border-border py-2 px-4 rounded-none flex justify-between items-center mb-2.5">
        <span className="text-[10px] font-mono font-bold text-muted-foreground uppercase">Rate Master</span>
        <span className="font-extrabold tracking-widest text-xs uppercase text-[#FFC000]">BULLION & DAILY METAL BOARD</span>
        <span className="text-[10px] font-mono text-muted-foreground uppercase">Live Ticker</span>
      </div>

      <div className="bg-card text-foreground border border-border rounded-none p-3 shrink-0 flex flex-col gap-3 mb-2.5">
        {/* Baseline rates inputs */}
        <div className="grid grid-cols-12 gap-3 items-center">
          
          {/* Voucher Date */}
          <div className="col-span-12 sm:col-span-4 flex items-center gap-2">
            <span className="text-[10.5px] font-bold text-muted-foreground uppercase w-20">Rate Date</span>
            <div className="relative flex-1 flex items-center gap-1">
              <input
                type="date"
                className="w-full h-8 border border-border rounded-none text-xs font-mono font-bold text-foreground px-2 bg-secondary focus:border-[#FFC000] focus:outline-none"
                value={vchDate}
                onChange={(e) => setVchDate(e.target.value)}
              />
              <button 
                onClick={addNewRow}
                title="Add category row (F1 shortcut)"
                className="h-8 px-3 bg-[#FFC000] hover:bg-[#917300] text-black font-extrabold text-[10px] uppercase rounded-none transition-colors cursor-pointer"
              >
                F1
              </button>
            </div>
          </div>

          {/* Gold Rate 10gm */}
          <div className="col-span-12 sm:col-span-4 flex items-center gap-2">
            <span className="text-[10.5px] font-bold text-muted-foreground uppercase w-24">Gold 24K (10g)</span>
            <input
              type="number"
              className="flex-1 h-8 border border-border rounded-none font-mono text-right font-extrabold text-[#FFC000] bg-secondary focus:border-[#FFC000] focus:outline-none px-2.5 text-xs tabular-nums"
              value={goldRate}
              onChange={(e) => setGoldRate(parseFloat(e.target.value) || 0)}
            />
          </div>

          {/* Silver Rate 1Kg */}
          <div className="col-span-12 sm:col-span-4 flex items-center gap-2">
            <span className="text-[10.5px] font-bold text-muted-foreground uppercase w-24">Silver 999 (1Kg)</span>
            <input
              type="number"
              className="flex-1 h-8 border border-border rounded-none font-mono text-right font-extrabold text-foreground bg-secondary focus:border-[#FFC000] focus:outline-none px-2.5 text-xs tabular-nums"
              value={silverRate}
              onChange={(e) => setSilverRate(parseFloat(e.target.value) || 0)}
            />
          </div>

        </div>
      </div>

      {/* Main categories rates Grid */}
      <div className="bg-card border border-border rounded-none shadow-none flex-1 overflow-auto mb-2 flex flex-col min-h-[300px]">
        <div className="flex-1 overflow-y-auto">
          <table className="w-full border-collapse text-left text-xs table-fixed min-w-[850px]">
            <thead>
              <tr className="sticky top-0 z-20 bg-secondary border-b border-border text-[10px] font-bold text-muted-foreground uppercase select-none">
                <th className="w-[40px] border-r border-border px-2 py-2.5 text-center">Sr</th>
                <th className="w-[90px] border-r border-border px-2 py-2.5">GrCode</th>
                <th className="border-r border-border px-3 py-2.5 text-left">GrName</th>
                <th className="w-[80px] border-r border-border px-2 py-2.5 text-center">Metal</th>
                <th className="w-[85px] border-r border-border px-2 py-2.5 text-right">Touch</th>
                <th className="w-[75px] border-r border-border px-2 py-2.5 text-right">Tax%</th>
                <th className="w-[110px] border-r border-border px-2 py-2.5 text-right bg-secondary">Rate10gm</th>
                <th className="w-[110px] border-r border-border px-2 py-2.5 text-right bg-secondary text-[#FFC000]">TaxRate</th>
                <th className="w-[85px] border-r border-border px-2 py-2.5 text-right text-muted-foreground">PrTouch</th>
                <th className="w-[100px] border-r border-border px-2 py-2.5 text-right text-muted-foreground">PrRate</th>
                <th className="w-[50px] px-2 py-2.5 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="font-semibold text-foreground font-mono select-text">
              {groupRows.map((row, index) => (
                <tr 
                  key={index}
                  className="border-b border-border hover:bg-secondary/40 transition-colors h-[32px] items-center"
                >
                  <td className="text-center font-bold text-muted-foreground border-r border-border">{row.sr}</td>
                  
                  {/* GrCode */}
                  <td className="p-0.5 border-r border-border">
                    <input
                      type="text"
                      className="w-full h-full border border-transparent rounded-none hover:border-border focus:border-[#FFC000] focus:bg-secondary focus:outline-none px-1.5 font-bold uppercase text-[11px] text-foreground bg-transparent"
                      value={row.grCode}
                      onChange={(e) => handleCellChange(index, 'grCode', e.target.value)}
                    />
                  </td>

                  {/* GrName */}
                  <td className="p-0.5 border-r border-border">
                    <input
                      type="text"
                      className="w-full h-full border border-transparent rounded-none hover:border-border focus:border-[#FFC000] focus:bg-secondary focus:outline-none px-2 text-[11px] text-foreground bg-transparent uppercase font-sans font-bold"
                      value={row.grName}
                      onChange={(e) => handleCellChange(index, 'grName', e.target.value)}
                    />
                  </td>

                  {/* Metal Selector (Gold/Silver) */}
                  <td className="p-0.5 border-r border-border text-center">
                    <select
                      className="w-full h-full border border-transparent rounded-none hover:border-border focus:border-[#FFC000] focus:bg-secondary focus:outline-none text-center font-bold text-foreground bg-transparent cursor-pointer uppercase text-[11px]"
                      value={row.isSilver ? 'true' : 'false'}
                      onChange={(e) => handleCellChange(index, 'isSilver', e.target.value)}
                    >
                      <option value="false" className="bg-card">Gold</option>
                      <option value="true" className="bg-card">Silver</option>
                    </select>
                  </td>

                  {/* Touch */}
                  <td className="p-0.5 border-r border-border">
                    <input
                      type="number"
                      step="0.01"
                      className="w-full h-full border border-transparent rounded-none hover:border-border focus:border-[#FFC000] focus:bg-secondary focus:outline-none text-right font-mono px-1.5 text-foreground bg-transparent"
                      value={row.touch}
                      onChange={(e) => handleCellChange(index, 'touch', e.target.value)}
                    />
                  </td>

                  {/* Tax% */}
                  <td className="p-0.5 border-r border-border">
                    <input
                      type="number"
                      step="0.01"
                      className="w-full h-full border border-transparent rounded-none hover:border-border focus:border-[#FFC000] focus:bg-secondary focus:outline-none text-right font-mono px-1.5 text-foreground bg-transparent"
                      value={row.taxPercent}
                      onChange={(e) => handleCellChange(index, 'taxPercent', e.target.value)}
                    />
                  </td>

                  {/* Rate10gm */}
                  <td className="px-3 text-right font-bold border-r border-border text-foreground text-[11.5px] font-mono">
                    ₹{row.rate10gm.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>

                  {/* TaxRate */}
                  <td className="px-3 text-right font-bold border-r border-border text-[#FFC000] text-[11.5px] font-mono">
                    ₹{row.taxRate.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>

                  {/* PrTouch */}
                  <td className="px-2 text-right border-r border-border text-muted-foreground font-mono">
                    {row.prTouch > 0 ? `${row.prTouch.toFixed(2)}` : '0.00'}
                  </td>

                  {/* PrRate */}
                  <td className="px-2 text-right border-r border-border text-muted-foreground font-mono">
                    {row.prRate > 0 ? `₹${row.prRate.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '₹0.00'}
                  </td>

                  {/* Delete row */}
                  <td className="text-center p-0.5">
                    <button 
                      onClick={() => deleteRow(index)}
                      className="p-1 hover:bg-rose-500/10 text-muted-foreground hover:text-rose-500 rounded-none transition-colors cursor-pointer"
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
        <div className="bg-secondary px-4 py-2 flex justify-start items-center border-t border-border">
          <button 
            onClick={addNewRow}
            className="flex items-center gap-1.5 px-3 py-1 bg-card border border-border hover:border-[#FFC000] text-foreground font-bold text-[10px] uppercase rounded-none transition-colors tracking-wider cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5 text-[#FFC000]" /> Add New Group Category
          </button>
        </div>
      </div>

      {/* Bottom Employee Information */}
      <div className="bg-card border border-border rounded-none p-3 shrink-0 flex items-center gap-2 mb-2">
        <span className="text-[11px] font-bold text-muted-foreground uppercase w-20">Employee</span>
        <div className="relative flex-1 max-w-sm flex items-center">
          <input
            type="text"
            placeholder="Name or ID"
            className="w-full h-8 border border-border rounded-none px-2.5 font-bold text-foreground bg-secondary focus:border-[#FFC000] focus:outline-none text-xs uppercase"
            value={employee}
            onChange={(e) => setEmployee(e.target.value)}
          />
          <User className="absolute right-2.5 h-3.5 w-3.5 text-muted-foreground" />
        </div>
      </div>

      {/* Button Ribbon Actions */}
      <div className="bg-card border border-border rounded-none px-3 py-2 flex justify-end items-center gap-2 shrink-0 select-none">
        
        {/* Save button */}
        <button 
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-1.5 px-4 h-8 bg-[#FFC000] hover:bg-[#917300] text-black text-xs font-black rounded-none transition-colors uppercase tracking-wider cursor-pointer disabled:opacity-40"
        >
          <Save className="h-3.5 w-3.5 stroke-[3]" /> 
          <span>{isSaving ? 'Saving...' : 'Save (F2)'}</span>
        </button>

        {/* Print button */}
        <button 
          onClick={handlePrint}
          className="flex items-center gap-1.5 px-3 h-8 bg-card hover:bg-secondary text-foreground border border-border text-xs font-bold rounded-none transition-colors uppercase tracking-wider cursor-pointer"
        >
          <Printer className="h-3.5 w-3.5 text-muted-foreground" /> Print
        </button>

        {/* Cancel button */}
        <button 
          onClick={handleCancel}
          className="flex items-center gap-1.5 px-3 h-8 bg-card hover:bg-secondary text-foreground border border-border text-xs font-bold rounded-none transition-colors uppercase tracking-wider cursor-pointer"
        >
          <Undo2 className="h-3.5 w-3.5 text-muted-foreground" /> Cancel
        </button>

        {/* Delete button */}
        <button 
          onClick={handleDelete}
          className="flex items-center gap-1.5 px-3 h-8 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border border-rose-500/30 text-xs font-bold rounded-none transition-colors uppercase tracking-wider cursor-pointer"
        >
          <Trash2 className="h-3.5 w-3.5 text-rose-500" /> Delete
        </button>

        <div className="h-5 w-px bg-border mx-1" />

        {/* Exit button */}
        <button 
          onClick={handleExit}
          className="flex items-center gap-1.5 px-3 h-8 bg-card hover:bg-secondary text-foreground border border-border text-xs font-bold rounded-none transition-colors uppercase tracking-wider cursor-pointer"
        >
          <LogOut className="h-3.5 w-3.5 text-muted-foreground" /> Exit
        </button>

      </div>

    </div>
  );
}
