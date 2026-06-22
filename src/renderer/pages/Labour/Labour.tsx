import { useEffect, useState } from 'react';
import { useCompanyStore } from '../../store/useCompanyStore';
import { usePartyStore } from '../../store/usePartyStore';
import { useProductStore } from '../../store/useProductStore';
import { useLabourStore } from '../../store/useLabourStore';
import { useRateStore } from '../../store/useRateStore';
import { useTabStore } from '../../store/useTabStore';
import type { Party, PartyWiseLabour } from '../../../shared/ipc-api';
import { Printer, Save, Undo2, Trash2, LogOut, Coins } from 'lucide-react';

interface GridRow {
  product_id: string;
  sku: string;
  name: string;
  touch: number | '';
  wastage_percent: number | '';
  ghat_percent: number | '';
  labour_percent: number | '';
  labour_type: string;
  labour_rate: number | '';
  item_rate: number | '';
}

export default function LabourView() {
  const selectedCompany = useCompanyStore((state) => state.selectedCompany);
  const { parties, loadParties } = usePartyStore();
  const { products, loadProducts } = useProductStore();
  const { getPartyWiseLabour, savePartyWiseLabour, deletePartyWiseLabour, isLoading } = useLabourStore();
  const currentRates = useRateStore((state) => state.currentRates);
  const activeTabId = useTabStore((state) => state.activeTabId);
  const closeTab = useTabStore((state) => state.closeTab);

  // Active state
  const [selectedPartyId, setSelectedPartyId] = useState<string>('');
  const [selectedParty, setSelectedParty] = useState<Party | null>(null);
  const [gridRows, setGridRows] = useState<GridRow[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Load parties and products on mount or company change
  useEffect(() => {
    if (selectedCompany) {
      loadParties(selectedCompany.id);
      loadProducts(selectedCompany.id);
    }
  }, [selectedCompany]);

  // Load labor rates when selected party changes
  useEffect(() => {
    if (selectedCompany && selectedPartyId) {
      const party = parties.find((p) => p.id === selectedPartyId) || null;
      setSelectedParty(party);
      fetchAndMapLabour(selectedPartyId);
    } else {
      setSelectedParty(null);
      setGridRows([]);
    }
  }, [selectedPartyId, products]);

  const fetchAndMapLabour = async (partyId: string) => {
    if (!selectedCompany) return;
    const customRates = await getPartyWiseLabour(selectedCompany.id, partyId);
    const customMap = new Map<string, PartyWiseLabour>();
    for (const r of customRates) {
      customMap.set(r.product_id, r);
    }

    const rows: GridRow[] = products.map((prod) => {
      const custom = customMap.get(prod.id);
      return {
        product_id: prod.id,
        sku: prod.sku,
        name: prod.name,
        touch: custom?.touch !== undefined ? custom.touch : '',
        wastage_percent: custom?.wastage_percent !== undefined ? custom.wastage_percent : '',
        ghat_percent: custom?.ghat_percent !== undefined ? custom.ghat_percent : '',
        labour_percent: custom?.labour_percent !== undefined ? custom.labour_percent : '',
        labour_type: custom?.labour_type || '',
        labour_rate: custom?.labour_rate !== undefined ? custom.labour_rate : '',
        item_rate: custom?.item_rate !== undefined ? custom.item_rate : ''
      };
    });
    setGridRows(rows);
  };

  const handleCellChange = (index: number, field: keyof GridRow, val: string) => {
    const updated = [...gridRows];
    const row = { ...updated[index] };

    if (field === 'labour_type') {
      row.labour_type = val;
    } else {
      const parsed = val === '' ? '' : parseFloat(val);
      (row as any)[field] = isNaN(parsed as any) ? '' : parsed;
    }

    updated[index] = row;
    setGridRows(updated);
  };

  const handleSave = async () => {
    if (!selectedCompany) return;
    if (!selectedPartyId) {
      alert('Please select a party first.');
      return;
    }

    // Filter out rows that have customized values
    const entriesToSave = gridRows
      .filter((row) => {
        return (
          row.touch !== '' ||
          row.wastage_percent !== '' ||
          row.ghat_percent !== '' ||
          row.labour_percent !== '' ||
          row.labour_type.trim() !== '' ||
          row.labour_rate !== '' ||
          row.item_rate !== ''
        );
      })
      .map((row) => ({
        product_id: row.product_id,
        touch: row.touch === '' ? 0.0 : row.touch,
        wastage_percent: row.wastage_percent === '' ? 0.0 : row.wastage_percent,
        ghat_percent: row.ghat_percent === '' ? 0.0 : row.ghat_percent,
        labour_percent: row.labour_percent === '' ? 0.0 : row.labour_percent,
        labour_type: row.labour_type.trim() || undefined,
        labour_rate: row.labour_rate === '' ? 0.0 : row.labour_rate,
        item_rate: row.item_rate === '' ? 0.0 : row.item_rate
      }));

    try {
      await savePartyWiseLabour(selectedCompany.id, selectedPartyId, entriesToSave);
      alert('Party Wise Labour configurations saved successfully.');
      fetchAndMapLabour(selectedPartyId);
    } catch (e: any) {
      alert(`Error saving configuration: ${e.message || e}`);
    }
  };

  const handleCancel = () => {
    if (selectedPartyId) {
      fetchAndMapLabour(selectedPartyId);
    }
  };

  const handleDelete = async () => {
    if (!selectedCompany || !selectedPartyId) return;
    if (confirm(`Are you sure you want to delete all custom configurations for ${selectedParty?.name}?`)) {
      try {
        await deletePartyWiseLabour(selectedCompany.id, selectedPartyId);
        alert('Configurations deleted successfully.');
        fetchAndMapLabour(selectedPartyId);
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

  // Filtered rows for catalog search
  const filteredRows = gridRows.filter(
    (row) =>
      row.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
      row.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-3 bg-background text-foreground h-full overflow-hidden flex flex-col font-sans select-none no-print transition-colors duration-200">
      
      {/* 1. MASTER HEADER PANEL */}
      <div className="bg-card text-card-foreground border border-border rounded-lg p-3 shadow-sm flex flex-col gap-2 shrink-0 transition-colors duration-200">
        <div className="flex justify-between items-center border-b border-border/60 pb-1.5">
          <span className="text-xs font-extrabold uppercase tracking-widest text-primary font-luxury flex items-center gap-1.5">
            <Coins className="h-4.5 w-4.5 text-primary" /> Party Wise Labour Settings
          </span>
          <span className="text-[9.5px] font-bold text-muted-foreground font-data">PARTY-PRODUCT RATE CONFIG</span>
        </div>

        <div className="grid grid-cols-12 gap-3 items-center">
          {/* Party Dropdown Selection */}
          <div className="col-span-4 flex items-center gap-1.5">
            <label className="text-[9.5px] font-bold text-muted-foreground uppercase tracking-wider whitespace-nowrap">Select Party</label>
            <select
              className="w-full px-2 py-0.5 border border-border rounded text-xs text-foreground bg-card h-7 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 font-bold cursor-pointer"
              value={selectedPartyId}
              onChange={(e) => setSelectedPartyId(e.target.value)}
            >
              <option value="">-- Choose Party Ledger --</option>
              {parties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.code})
                </option>
              ))}
            </select>
          </div>

          {/* Read Only Details */}
          <div className="col-span-3 flex items-center gap-1.5">
            <label className="text-[9.5px] font-bold text-muted-foreground uppercase tracking-wider whitespace-nowrap">Party Code</label>
            <input
              type="text"
              readOnly
              className="w-full px-2 py-0.5 border border-border rounded text-xs text-muted-foreground bg-muted/50 h-7 text-center font-bold font-data focus:outline-none"
              value={selectedParty?.code || ''}
            />
          </div>

          <div className="col-span-3 flex items-center gap-1.5">
            <label className="text-[9.5px] font-bold text-muted-foreground uppercase tracking-wider whitespace-nowrap">Party Name</label>
            <input
              type="text"
              readOnly
              className="w-full px-2 py-0.5 border border-border rounded text-xs text-muted-foreground bg-muted/50 h-7 font-sans font-bold focus:outline-none"
              value={selectedParty?.name || ''}
            />
          </div>

          {/* Catalog Search Input */}
          <div className="col-span-2">
            <input
              type="text"
              placeholder="Search product..."
              className="w-full px-2 py-0.5 border border-border rounded text-xs text-foreground bg-card h-7 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              disabled={!selectedPartyId}
            />
          </div>
        </div>
      </div>

      {/* 2. SPREADSHEET LABOUR GRID */}
      <div className="flex-1 bg-card text-card-foreground border border-border rounded-lg shadow-sm flex flex-col overflow-hidden my-2.5 transition-colors duration-200">
        <div className="bg-secondary/40 px-3 py-1.5 border-b border-border flex justify-between items-center shrink-0">
          <span className="text-[10px] font-bold uppercase tracking-wider font-luxury text-foreground/80">Configuration Matrix</span>
          {isLoading && (
            <span className="text-[9px] text-amber-500 font-bold uppercase tracking-widest animate-pulse">Loading settings...</span>
          )}
        </div>

        <div className="flex-1 overflow-auto bg-card">
          {!selectedPartyId ? (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground italic p-8 select-none">
              <Coins className="h-8 w-8 text-muted-foreground/40 mb-2 animate-bounce" />
              <span>Please select a party from the dropdown above to configure labor rates.</span>
            </div>
          ) : filteredRows.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground italic p-8 select-none">
              <span>No products matching search or catalog is empty.</span>
            </div>
          ) : (
            <table className="w-full border-collapse text-left text-xs ag-grid-dense-table select-text">
              <thead>
                <tr className="sticky top-0 z-20 bg-secondary/80 dark:bg-slate-900/80 backdrop-blur-xs border-b border-border">
                  <th className="w-12 text-center">Sr</th>
                  <th className="w-32">Pr Code</th>
                  <th>Pr Name</th>
                  <th className="w-24 text-right">Touch</th>
                  <th className="w-24 text-right">West%</th>
                  <th className="w-24 text-right">Ghat%</th>
                  <th className="w-24 text-right">Lbr%</th>
                  <th className="w-24 text-center">LbrType</th>
                  <th className="w-28 text-right">LbrRate</th>
                  <th className="w-28 text-right">ItRate</th>
                </tr>
              </thead>
              <tbody className="font-semibold text-foreground font-data">
                {filteredRows.map((row, idx) => (
                  <tr key={row.product_id} className="hover:bg-muted/50 border-b border-border/40 transition-colors bg-card">
                    {/* Sr */}
                    <td className="text-center font-data text-muted-foreground/60 bg-muted/20 p-1 border-r border-border/50">{idx + 1}</td>
                    
                    {/* SKU */}
                    <td className="p-1.5 border-r border-border/50 text-foreground font-data">{row.sku}</td>

                    {/* Name */}
                    <td className="p-1.5 border-r border-border/50 text-foreground font-sans">{row.name}</td>

                    {/* Touch */}
                    <td className="p-0.5 border-r border-border/50">
                      <input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        className="bg-transparent border-none text-[11px] font-data text-right focus:outline-none w-full px-1 h-6 select-text text-foreground placeholder:text-muted-foreground/45"
                        value={row.touch}
                        onChange={(e) => handleCellChange(idx, 'touch', e.target.value)}
                      />
                    </td>

                    {/* Wastage% */}
                    <td className="p-0.5 border-r border-border/50">
                      <input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        className="bg-transparent border-none text-[11px] font-data text-right focus:outline-none w-full px-1 h-6 select-text text-foreground placeholder:text-muted-foreground/45"
                        value={row.wastage_percent}
                        onChange={(e) => handleCellChange(idx, 'wastage_percent', e.target.value)}
                      />
                    </td>

                    {/* Ghat% */}
                    <td className="p-0.5 border-r border-border/50">
                      <input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        className="bg-transparent border-none text-[11px] font-data text-right focus:outline-none w-full px-1 h-6 select-text text-foreground placeholder:text-muted-foreground/45"
                        value={row.ghat_percent}
                        onChange={(e) => handleCellChange(idx, 'ghat_percent', e.target.value)}
                      />
                    </td>

                    {/* Labour% */}
                    <td className="p-0.5 border-r border-border/50">
                      <input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        className="bg-transparent border-none text-[11px] font-data text-right focus:outline-none w-full px-1 h-6 select-text text-foreground placeholder:text-muted-foreground/45"
                        value={row.labour_percent}
                        onChange={(e) => handleCellChange(idx, 'labour_percent', e.target.value)}
                      />
                    </td>

                    {/* Labour Type */}
                    <td className="p-0.5 border-r border-border/50 text-center">
                      <input
                        type="text"
                        placeholder="e.g. N"
                        maxLength={5}
                        className="bg-transparent border-none text-[11px] font-bold text-center focus:outline-none w-full h-6 select-text text-foreground placeholder:text-muted-foreground/45"
                        value={row.labour_type}
                        onChange={(e) => handleCellChange(idx, 'labour_type', e.target.value)}
                      />
                    </td>

                    {/* Labour Rate */}
                    <td className="p-0.5 border-r border-border/50">
                      <input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        className="bg-transparent border-none text-[11px] font-data text-right focus:outline-none w-full px-1 h-6 select-text text-foreground placeholder:text-muted-foreground/45"
                        value={row.labour_rate}
                        onChange={(e) => handleCellChange(idx, 'labour_rate', e.target.value)}
                      />
                    </td>

                    {/* Item Rate */}
                    <td className="p-0.5">
                      <input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        className="bg-transparent border-none text-[11px] font-data text-right focus:outline-none w-full px-1 h-6 select-text text-foreground placeholder:text-muted-foreground/45"
                        value={row.item_rate}
                        onChange={(e) => handleCellChange(idx, 'item_rate', e.target.value)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* BOTTOM ACTION BAR */}
        <div className="bg-muted/35 border border-border px-4 py-2 flex items-center justify-end shrink-0 select-none gap-2.5 rounded-lg">
          <button
            type="button"
            onClick={handlePrint}
            disabled={!selectedPartyId}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-card hover:bg-muted text-foreground disabled:opacity-40 disabled:hover:bg-card border border-border hover:border-border/80 rounded font-semibold uppercase shadow-sm transition-all text-xs active:scale-[0.98] cursor-pointer"
          >
            <Printer className="h-3.5 w-3.5 text-muted-foreground" />
            <span>Print</span>
          </button>
          
          <button
            type="button"
            onClick={handleSave}
            disabled={!selectedPartyId}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-primary hover:bg-primary/90 text-primary-foreground border border-transparent rounded font-semibold uppercase shadow-sm transition-all text-xs active:scale-[0.98] cursor-pointer disabled:opacity-40 disabled:hover:bg-primary disabled:active:scale-100"
          >
            <Save className="h-3.5 w-3.5" />
            <span>Save</span>
          </button>

          <button
            type="button"
            onClick={handleCancel}
            disabled={!selectedPartyId}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-card hover:bg-muted text-foreground border border-border hover:border-border/80 rounded font-semibold uppercase shadow-sm transition-all text-xs active:scale-[0.98] cursor-pointer disabled:opacity-40 disabled:hover:bg-card disabled:active:scale-100"
          >
            <Undo2 className="h-3.5 w-3.5 text-muted-foreground" />
            <span>Cancel</span>
          </button>

          <button
            type="button"
            onClick={handleDelete}
            disabled={!selectedPartyId}
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

      {/* STATUS FOOTER BAR */}
      <footer className="bg-amber-600/90 dark:bg-amber-700/80 backdrop-blur-md border-t border-amber-500/20 text-white px-4 py-1.5 flex items-center justify-between text-[11.5px] font-semibold shadow-premium shrink-0 select-none mt-2 rounded-lg transition-all duration-200">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 bg-amber-800/40 border border-amber-500/30 px-2 py-0.5 rounded uppercase text-[9px] tracking-wider">Live Rate Footer</span>
          <span>Fine Gold (999): <strong className="text-amber-100 font-data">₹{currentRates?.gold_rate_24k || '54,669'}</strong></span>
          <span className="opacity-40">|</span>
          <span>Fine Gold (22K): <strong className="text-amber-100 font-data">₹{currentRates?.gold_rate_22k || '50,113'}</strong></span>
          <span className="opacity-40">|</span>
          <span>Fine Silver: <strong className="text-amber-100 font-data">₹{currentRates?.silver_rate || '74,277'}</strong></span>
        </div>
        <div>
          <span>Rate Date: <span className="font-data text-amber-100">{currentRates?.rate_date || new Date().toLocaleDateString()}</span></span>
        </div>
      </footer>

    </div>
  );
}
