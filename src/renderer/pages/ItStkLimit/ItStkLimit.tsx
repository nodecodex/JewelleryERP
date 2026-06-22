import { useEffect, useState } from 'react';
import { useCompanyStore } from '../../store/useCompanyStore';
import { useItStkLimitStore } from '../../store/useItStkLimitStore';
import { useRateStore } from '../../store/useRateStore';
import { useTabStore } from '../../store/useTabStore';

import { Printer, Save, Undo2, Trash2, LogOut, Coins, Plus, Trash } from 'lucide-react';

interface LocalDetail {
  sr: number;
  from_wt: number | '';
  to_wt: number | '';
  pcs: number | '';
  labour_percent: number | '';
  labour_type: string;
  labour_rate: number | '';
}

export default function ItStkLimitView() {
  const selectedCompany = useCompanyStore((state) => state.selectedCompany);
  const { limits, loadLimits, saveLimit, deleteLimit } = useItStkLimitStore();
  const currentRates = useRateStore((state) => state.currentRates);
  const activeTabId = useTabStore((state) => state.activeTabId);
  const closeTab = useTabStore((state) => state.closeTab);

  // Active workspace state
  const [selectedLimitId, setSelectedLimitId] = useState<string | null>(null);
  const [itemCode, setItemCode] = useState<string>('');
  const [itemName, setItemName] = useState<string>('');
  const [details, setDetails] = useState<LocalDetail[]>([]);
  const [leftSearch, setLeftSearch] = useState<string>('');

  // Load limits list on company select
  useEffect(() => {
    if (selectedCompany) {
      loadLimits(selectedCompany.id);
    }
  }, [selectedCompany]);

  // Set default empty rows on start or selection change
  useEffect(() => {
    if (selectedLimitId) {
      const active = limits.find((item) => item.id === selectedLimitId);
      if (active) {
        setItemCode(active.item_code);
        setItemName(active.item_name);
        const mapped: LocalDetail[] = (active.details || []).map((d) => ({
          sr: d.sr,
          from_wt: d.from_wt !== undefined && d.from_wt !== null ? d.from_wt : '',
          to_wt: d.to_wt !== undefined && d.to_wt !== null ? d.to_wt : '',
          pcs: d.pcs !== undefined && d.pcs !== null ? d.pcs : '',
          labour_percent: d.labour_percent !== undefined && d.labour_percent !== null ? d.labour_percent : '',
          labour_type: d.labour_type || 'N',
          labour_rate: d.labour_rate !== undefined && d.labour_rate !== null ? d.labour_rate : ''
        }));
        // Padding up to 7 rows
        while (mapped.length < 7) {
          mapped.push({
            sr: mapped.length + 1,
            from_wt: '',
            to_wt: '',
            pcs: '',
            labour_percent: '',
            labour_type: 'N',
            labour_rate: ''
          });
        }
        setDetails(mapped);
      }
    } else {
      handleNew();
    }
  }, [selectedLimitId, limits]);

  const handleNew = () => {
    setSelectedLimitId(null);
    setItemCode('');
    setItemName('');
    const defaultRows: LocalDetail[] = Array.from({ length: 7 }, (_, idx) => ({
      sr: idx + 1,
      from_wt: '',
      to_wt: '',
      pcs: '',
      labour_percent: '',
      labour_type: 'N',
      labour_rate: ''
    }));
    setDetails(defaultRows);
  };

  const handleCellChange = (index: number, field: keyof LocalDetail, val: string) => {
    const updated = [...details];
    const row = { ...updated[index] };

    if (field === 'labour_type') {
      row.labour_type = val;
    } else if (field === 'pcs') {
      const parsed = parseInt(val, 10);
      row.pcs = isNaN(parsed) ? '' : parsed;
    } else {
      const parsed = parseFloat(val);
      (row as any)[field] = isNaN(parsed) ? '' : parsed;
    }

    updated[index] = row;
    setDetails(updated);
  };

  const handleAddRow = () => {
    const nextSr = details.length + 1;
    const newRow: LocalDetail = {
      sr: nextSr,
      from_wt: '',
      to_wt: '',
      pcs: '',
      labour_percent: '',
      labour_type: 'N',
      labour_rate: ''
    };
    setDetails([...details, newRow]);
  };

  const handleRemoveRow = (index: number) => {
    if (details.length <= 1) return;
    const updated = details
      .filter((_, idx) => idx !== index)
      .map((row, idx) => ({ ...row, sr: idx + 1 }));
    setDetails(updated);
  };

  const handleSave = async () => {
    if (!selectedCompany) return;
    if (!itemCode.trim() || !itemName.trim()) {
      alert('Please enter both Item Code and Item Name.');
      return;
    }

    // Filter valid detail entries
    const validDetails = details
      .filter((d) => d.from_wt !== '' || d.to_wt !== '' || d.pcs !== '')
      .map((d) => ({
        sr: d.sr,
        from_wt: d.from_wt === '' ? 0.0 : d.from_wt,
        to_wt: d.to_wt === '' ? 0.0 : d.to_wt,
        pcs: d.pcs === '' ? 0 : d.pcs,
        labour_percent: d.labour_percent === '' ? 0.0 : d.labour_percent,
        labour_type: d.labour_type.trim() || 'N',
        labour_rate: d.labour_rate === '' ? 0.0 : d.labour_rate
      }));

    try {
      await saveLimit(
        selectedCompany.id,
        {
          id: selectedLimitId || undefined,
          item_code: itemCode.trim(),
          item_name: itemName.trim()
        },
        validDetails
      );
      alert('Item Stock Limits saved successfully.');
      handleNew();
    } catch (e: any) {
      alert(`Error saving configurations: ${e.message || e}`);
    }
  };

  const handleCancel = () => {
    if (selectedLimitId) {
      // Re-trigger the selection loading effect
      setSelectedLimitId(selectedLimitId);
    } else {
      handleNew();
    }
  };

  const handleDelete = async () => {
    if (!selectedCompany || !selectedLimitId) return;
    if (confirm(`CAUTION: Permanently delete stock limits configurations for "${itemCode} - ${itemName}"?`)) {
      try {
        await deleteLimit(selectedLimitId, selectedCompany.id);
        alert('Configurations deleted successfully.');
        handleNew();
      } catch (e) {
        alert('Error deleting configurations.');
      }
    }
  };

  const handleExit = () => {
    if (activeTabId) {
      closeTab(activeTabId);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // Filter left panel limits list
  const filteredLimits = limits.filter(
    (item) =>
      item.item_code.toLowerCase().includes(leftSearch.toLowerCase()) ||
      item.item_name.toLowerCase().includes(leftSearch.toLowerCase())
  );

  return (
    <div className="p-4 bg-background text-foreground h-full overflow-hidden flex flex-col font-sans select-none no-print transition-colors duration-200">
      
      {/* HEADER SECTION */}
      <div className="bg-card border border-border rounded-lg p-4 shadow-sm grid grid-cols-12 gap-3 items-center shrink-0">
        <div className="col-span-12 flex justify-between items-center border-b border-border pb-2.5 mb-0.5">
          <span className="text-[13px] font-extrabold uppercase tracking-widest text-primary font-luxury flex items-center gap-1.5">
            <Coins className="h-4.5 w-4.5 text-primary" /> Item Stock Limit Master
          </span>
          <span className="text-[9.5px] font-bold text-muted-foreground/60 font-data">PRODUCT WEIGHT RANGES & STOCK LEVELS</span>
        </div>
      </div>

      {/* DUAL WORKSPACE: SEARCH RECORD SIDEBAR + CONFIG MATRIX */}
      <div className="flex-1 grid grid-cols-12 gap-4 overflow-hidden min-h-0 py-3">
        
        {/* LEFT WORKSPACE: Record Search Sidebar */}
        <div className="col-span-4 bg-card border border-border rounded-lg shadow-sm flex flex-col overflow-hidden transition-colors duration-200">
          <div className="bg-secondary/40 dark:bg-slate-900/40 text-foreground px-4 py-3 border-b border-border shrink-0 font-luxury text-[10.5px] font-bold uppercase tracking-wider">
            Search Record
          </div>
          <div className="p-3 border-b border-border shrink-0 bg-muted/20">
            <input
              type="text"
              placeholder="Search code or name..."
              className="w-full bg-card text-foreground border border-border rounded px-3 py-1.5 text-xs focus:outline-none focus:border-primary font-semibold h-7"
              value={leftSearch}
              onChange={(e) => setLeftSearch(e.target.value)}
            />
          </div>
          <div className="flex-1 overflow-auto bg-card">
            <table className="w-full border-collapse text-left text-xs ag-grid-dense-table select-text">
              <thead>
                <tr className="sticky top-0 z-20 bg-muted/60 text-muted-foreground text-[10px] font-bold uppercase border-b border-border">
                  <th className="w-24 px-3 py-2 border-r border-border/40">Code</th>
                  <th className="px-3 py-2">Name</th>
                </tr>
              </thead>
              <tbody className="font-semibold text-foreground/90 font-data divide-y divide-border/30">
                {filteredLimits.length === 0 ? (
                  <tr>
                    <td colSpan={2} className="p-8 text-center text-muted-foreground/50 italic">No records found.</td>
                  </tr>
                ) : (
                  filteredLimits.map((lim) => {
                    const isSelected = selectedLimitId === lim.id;
                    return (
                      <tr
                        key={lim.id}
                        onClick={() => setSelectedLimitId(lim.id)}
                        className={`hover:bg-muted/30 border-b border-border/30 transition-colors cursor-pointer ${
                          isSelected 
                            ? 'bg-primary/10 border-l-2 border-l-primary text-foreground font-bold' 
                            : 'text-muted-foreground/85 hover:text-foreground'
                        }`}
                      >
                        <td className="p-2.5 border-r border-border/40 text-foreground font-data">{lim.item_code}</td>
                        <td className="p-2.5 text-foreground font-sans">{lim.item_name}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          
          <div className="p-3 bg-muted/30 border-t border-border shrink-0">
            <button
              onClick={handleNew}
              className="w-full py-1.5 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs uppercase rounded shadow-sm transition-all active:scale-[0.98] cursor-pointer"
            >
              Add New Template
            </button>
          </div>
        </div>

        {/* RIGHT WORKSPACE: Master/Detail Limits Sheet Grid */}
        <div className="col-span-8 bg-card border border-border rounded-lg shadow-sm flex flex-col overflow-hidden transition-colors duration-200">
          
          {/* Header metadata selection bar */}
          <div className="p-3 border-b border-border shrink-0 bg-muted/20 grid grid-cols-12 gap-3 items-center">
            <div className="col-span-5 flex items-center gap-2">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider whitespace-nowrap">It Code</label>
              <input
                type="text"
                placeholder="e.g. CH916"
                className="w-full px-3 py-1 bg-card border border-border rounded text-xs focus:outline-none focus:border-primary font-bold font-data text-foreground h-7"
                value={itemCode}
                onChange={(e) => setItemCode(e.target.value)}
                disabled={!!selectedLimitId} // Once saved, Code is key and is read-only.
              />
            </div>
            
            <div className="col-span-7 flex items-center gap-2">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider whitespace-nowrap">Name</label>
              <input
                type="text"
                placeholder="e.g. CHAIN 916"
                className="w-full px-3 py-1 bg-card border border-border rounded text-xs focus:outline-none focus:border-primary font-bold text-foreground h-7"
                value={itemName}
                onChange={(e) => setItemName(e.target.value)}
              />
            </div>
          </div>

          <div className="bg-secondary/40 dark:bg-slate-900/40 text-foreground px-4 py-2 border-b border-border flex justify-between items-center shrink-0">
            <span className="text-[10px] font-bold uppercase tracking-wider font-luxury">Limits & Labor Breakdowns</span>
            <button
              onClick={handleAddRow}
              className="flex items-center gap-1 px-3 py-1 bg-primary/10 hover:bg-primary/20 text-primary font-bold text-[9.5px] uppercase tracking-wider rounded transition-all active:scale-95 cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add Limit Row</span>
            </button>
          </div>

          {/* Matrix grid scrollbox */}
          <div className="flex-1 overflow-auto bg-card">
            <table className="w-full border-collapse text-left text-xs ag-grid-dense-table select-text">
              <thead>
                <tr className="sticky top-0 z-20 bg-muted/50 border-b border-border text-muted-foreground text-[10px] font-bold uppercase">
                  <th className="w-10 text-center border-r border-border/40 py-2">Sr</th>
                  <th className="w-24 text-right border-r border-border/40 py-2">FormWt</th>
                  <th className="w-24 text-right border-r border-border/40 py-2">ToWt</th>
                  <th className="w-20 text-center border-r border-border/40 py-2">Pcs</th>
                  <th className="w-20 text-right border-r border-border/40 py-2">Lbr%</th>
                  <th className="w-20 text-center border-r border-border/40 py-2">LType</th>
                  <th className="w-24 text-right border-r border-border/40 py-2">LbrRate</th>
                  <th className="w-10 text-center py-2">Del</th>
                </tr>
              </thead>
              <tbody className="font-semibold text-foreground/90 font-data divide-y divide-border/30">
                {details.map((row, idx) => (
                  <tr key={idx} className="hover:bg-muted/30 border-b border-border/30 transition-colors">
                    {/* Sr */}
                    <td className="text-center font-data text-muted-foreground/60 bg-muted/20 p-2 border-r border-border/40">{row.sr}</td>
                    
                    {/* FormWt */}
                    <td className="p-0.5 border-r border-border/40">
                      <input
                        type="number"
                        step="0.001"
                        placeholder="0.000"
                        className="bg-transparent border-none text-[11.5px] font-data text-right focus:outline-none w-full px-1.5 h-6.5 text-foreground select-text"
                        value={row.from_wt}
                        onChange={(e) => handleCellChange(idx, 'from_wt', e.target.value)}
                      />
                    </td>

                    {/* ToWt */}
                    <td className="p-0.5 border-r border-border/40">
                      <input
                        type="number"
                        step="0.001"
                        placeholder="0.000"
                        className="bg-transparent border-none text-[11.5px] font-data text-right focus:outline-none w-full px-1.5 h-6.5 text-foreground select-text"
                        value={row.to_wt}
                        onChange={(e) => handleCellChange(idx, 'to_wt', e.target.value)}
                      />
                    </td>

                    {/* Pcs */}
                    <td className="p-0.5 border-r border-border/40 text-center">
                      <input
                        type="number"
                        placeholder="0"
                        className="bg-transparent border-none text-[11.5px] font-data text-center focus:outline-none w-full h-6.5 text-foreground select-text"
                        value={row.pcs}
                        onChange={(e) => handleCellChange(idx, 'pcs', e.target.value)}
                      />
                    </td>

                    {/* Lbr% */}
                    <td className="p-0.5 border-r border-border/40">
                      <input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        className="bg-transparent border-none text-[11.5px] font-data text-right focus:outline-none w-full px-1.5 h-6.5 text-foreground select-text"
                        value={row.labour_percent}
                        onChange={(e) => handleCellChange(idx, 'labour_percent', e.target.value)}
                      />
                    </td>

                    {/* LType */}
                    <td className="p-0.5 border-r border-border/40 text-center">
                      <input
                        type="text"
                        placeholder="e.g. N"
                        className="bg-transparent border-none text-[11.5px] font-bold text-center focus:outline-none w-full h-6.5 text-foreground select-text"
                        value={row.labour_type}
                        onChange={(e) => handleCellChange(idx, 'labour_type', e.target.value)}
                      />
                    </td>

                    {/* LbrRate */}
                    <td className="p-0.5 border-r border-border/40">
                      <input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        className="bg-transparent border-none text-[11.5px] font-data text-right focus:outline-none w-full px-1.5 h-6.5 text-foreground select-text"
                        value={row.labour_rate}
                        onChange={(e) => handleCellChange(idx, 'labour_rate', e.target.value)}
                      />
                    </td>

                    {/* Delete Icon */}
                    <td className="p-0.5 text-center">
                      <button
                        type="button"
                        onClick={() => handleRemoveRow(idx)}
                        className="text-rose-500 hover:bg-rose-500/10 rounded-md p-1 transition-colors cursor-pointer"
                        title="Remove row"
                      >
                        <Trash className="h-3.5 w-3.5" />
                      </button>
                    </td>

                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* BOTTOM ACTIONS TOOLBAR */}
          <div className="bg-muted/30 border-t border-border px-4 py-2.5 flex justify-end gap-2.5 shrink-0 select-none rounded-b-lg">
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-card hover:bg-muted text-foreground border border-border hover:border-border/80 rounded font-semibold uppercase shadow-sm transition-all text-xs active:scale-[0.98] cursor-pointer"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>Print</span>
            </button>
            
            <button
              type="button"
              onClick={handleSave}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-primary hover:bg-primary/90 text-primary-foreground border border-transparent rounded font-semibold uppercase shadow-sm transition-all text-xs active:scale-[0.98] cursor-pointer"
            >
              <Save className="h-3.5 w-3.5" />
              <span>Save</span>
            </button>

            <button
              type="button"
              onClick={handleCancel}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-card hover:bg-muted text-foreground border border-border hover:border-border/80 rounded font-semibold uppercase shadow-sm transition-all text-xs active:scale-[0.98] cursor-pointer"
            >
              <Undo2 className="h-3.5 w-3.5" />
              <span>Cancel</span>
            </button>

            <button
              type="button"
              onClick={handleDelete}
              disabled={!selectedLimitId}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-destructive/10 hover:bg-destructive/20 text-destructive border border-destructive/20 hover:border-destructive/30 rounded font-semibold uppercase shadow-sm transition-all text-xs active:scale-[0.98] cursor-pointer disabled:opacity-40 disabled:hover:bg-destructive/10 disabled:active:scale-100"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Delete</span>
            </button>

            <span className="w-px h-6 bg-border self-center mx-1"></span>

            <button
              type="button"
              onClick={handleExit}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-secondary hover:bg-secondary/80 text-secondary-foreground border border-border rounded font-semibold uppercase shadow-sm transition-all text-xs active:scale-[0.98] cursor-pointer"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Exit</span>
            </button>
          </div>

        </div>

      </div>

      {/* ORANGE STATUS FOOTER */}
      <footer className="bg-amber-600/90 dark:bg-amber-700/80 backdrop-blur-md border-t border-amber-500/20 text-white px-4 py-1.5 flex items-center justify-between text-[11.5px] font-semibold shadow-premium shrink-0 select-none transition-all duration-200 rounded-md">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 bg-amber-800/40 border border-amber-500/30 px-2 py-0.5 rounded uppercase text-[9px] tracking-wider">Live Rate</span>
          <span>Fine Gold (999): <strong className="text-amber-100 font-data">₹{currentRates?.gold_rate_24k || '54,669'}</strong></span>
          <span className="opacity-40">|</span>
          <span>Fine Gold (22K): <strong className="text-amber-100 font-data">₹{currentRates?.gold_rate_22k || '50,113'}</strong></span>
          <span className="opacity-40">|</span>
          <span>Fine Silver: <strong className="text-amber-100 font-data">₹{currentRates?.silver_rate || '74,277'}</strong></span>
        </div>
        <div>
          <span>As of: <span className="font-data text-amber-100">{currentRates?.rate_date || new Date().toLocaleDateString()}</span></span>
        </div>
      </footer>

    </div>
  );
}
