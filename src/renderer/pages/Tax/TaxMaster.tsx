import React, { useEffect, useState } from 'react';
import { useCompanyStore } from '../../store/useCompanyStore';
import { useTabStore } from '../../store/useTabStore';
import { useTaxStore } from '../../store/useTaxStore';
import type { Tax, TaxComponent } from '../../../shared/ipc-api';
import { 
  Plus, 
  Search, 
  Printer, 
  Save, 
  Undo2, 
  Trash2, 
  LogOut,
  FolderOpen
} from 'lucide-react';

export default function TaxMasterView() {
  const selectedCompany = useCompanyStore((state) => state.selectedCompany);
  const closeTab = useTabStore((state) => state.closeTab);
  const activeTabId = useTabStore((state) => state.activeTabId);
  const { taxes, loadTaxes, createTax, updateTax, deleteTax } = useTaxStore();

  // Records state
  const [selectedRecord, setSelectedRecord] = useState<Tax | null>(null);
  const [globalFilter, setGlobalFilter] = useState('');

  // Form fields
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [taxType, setTaxType] = useState('');
  const [taxDesc, setTaxDesc] = useState('');
  const [taxPercent, setTaxPercent] = useState('0.00');
  const [addTaxPercent, setAddTaxPercent] = useState('0.00');
  const [acCode, setAcCode] = useState('');
  const [acName, setAcName] = useState('');

  // Components breakdown table
  const [components, setComponents] = useState<TaxComponent[]>([
    { sr: 1, tax_type: '', tax_name: '', ac_code: '', tax_percent: 0 },
    { sr: 2, tax_type: '', tax_name: '', ac_code: '', tax_percent: 0 },
    { sr: 3, tax_type: '', tax_name: '', ac_code: '', tax_percent: 0 },
    { sr: 4, tax_type: '', tax_name: '', ac_code: '', tax_percent: 0 }
  ]);

  useEffect(() => {
    if (selectedCompany) {
      loadTaxes(selectedCompany.id);
    }
  }, [selectedCompany]);

  useEffect(() => {
    if (taxes.length > 0 && !selectedRecord) {
      setSelectedRecord(taxes[0]);
      populateForm(taxes[0]);
    }
  }, [taxes, selectedRecord]);

  const populateForm = (rec: Tax | null) => {
    if (rec) {
      setCode(rec.code);
      setName(rec.name);
      setTaxType(rec.tax_type || '');
      setTaxDesc(rec.tax_desc || '');
      setTaxPercent(Number(rec.tax_percent || 0).toFixed(2));
      setAddTaxPercent(Number(rec.add_tax_percent || 0).toFixed(2));
      setAcCode(rec.ac_code || '');
      setAcName(rec.ac_name || '');
      
      try {
        const parsed = JSON.parse(rec.components_json || '[]');
        // Pad to 4 rows for visual stability
        const padded = [...parsed];
        while (padded.length < 4) {
          padded.push({ sr: padded.length + 1, tax_type: '', tax_name: '', ac_code: '', tax_percent: 0 });
        }
        setComponents(padded);
      } catch {
        resetComponentsTable();
      }
    } else {
      setCode('');
      setName('');
      setTaxType('');
      setTaxDesc('');
      setTaxPercent('0.00');
      setAddTaxPercent('0.00');
      setAcCode('');
      setAcName('');
      resetComponentsTable();
    }
  };

  const resetComponentsTable = () => {
    setComponents([
      { sr: 1, tax_type: '', tax_name: '', ac_code: '', tax_percent: 0 },
      { sr: 2, tax_type: '', tax_name: '', ac_code: '', tax_percent: 0 },
      { sr: 3, tax_type: '', tax_name: '', ac_code: '', tax_percent: 0 },
      { sr: 4, tax_type: '', tax_name: '', ac_code: '', tax_percent: 0 }
    ]);
  };

  const handleSelectRecord = (rec: Tax) => {
    setSelectedRecord(rec);
    populateForm(rec);
  };

  const handleNewRecord = () => {
    setSelectedRecord(null);
    populateForm(null);
    setCode(String(Math.floor(10 + Math.random() * 89))); // Auto code suggestion
  };

  // Helper to dynamically calculate CGST/SGST/IGST breakdown when main Tax % changes
  const handlePrimaryPercentChange = (val: string) => {
    setTaxPercent(val);
    const rateNum = parseFloat(val) || 0;
    
    // Auto-update Description if empty or matching old patterns
    if (!taxDesc || taxDesc.toUpperCase().startsWith('GST') || taxDesc === 'TAX FREE' || taxDesc.startsWith('VAT')) {
      if (rateNum === 0) {
        setTaxDesc('TAX FREE');
        setName('TAX FREE');
      } else {
        setTaxDesc(`GST ${rateNum}%`);
        setName(`GST ${rateNum}%`);
      }
    }

    // Auto-calculate components breakdown for GST-like records
    if (rateNum > 0) {
      const halfRate = parseFloat((rateNum / 2).toFixed(3));
      const newComponents = [
        { sr: 1, tax_type: 'SGST', tax_name: `SGST ${halfRate}%`, ac_code: '00085', tax_percent: halfRate },
        { sr: 2, tax_type: 'CGST', tax_name: `CGST ${halfRate}%`, ac_code: '00086', tax_percent: halfRate },
        { sr: 3, tax_type: 'IGST', tax_name: `IGST ${rateNum}%`, ac_code: '00087', tax_percent: rateNum },
        { sr: 4, tax_type: '', tax_name: '', ac_code: '', tax_percent: 0 }
      ];
      setComponents(newComponents);
      setAcCode('00085');
      setAcName('GST TAX');
    } else {
      setComponents([
        { sr: 1, tax_type: 'TAX FREE', tax_name: 'TAX FREE', ac_code: '', tax_percent: 0 },
        { sr: 2, tax_type: '', tax_name: '', ac_code: '', tax_percent: 0 },
        { sr: 3, tax_type: '', tax_name: '', ac_code: '', tax_percent: 0 },
        { sr: 4, tax_type: '', tax_name: '', ac_code: '', tax_percent: 0 }
      ]);
      setAcCode('');
      setAcName('');
    }
  };

  const handleComponentCellChange = (index: number, field: keyof TaxComponent, val: any) => {
    const updated = [...components];
    if (field === 'tax_percent') {
      updated[index] = { ...updated[index], [field]: parseFloat(val) || 0 };
    } else {
      updated[index] = { ...updated[index], [field]: val };
    }
    setComponents(updated);
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!name.trim()) {
      alert('Please enter a Tax Description / Name.');
      return;
    }
    if (!code.trim()) {
      alert('Please specify a unique Tax Code.');
      return;
    }
    if (!selectedCompany) return;

    // Filter out empty rows from components list
    const activeComponents = components.filter(c => c.tax_type.trim() || c.tax_name.trim() || c.tax_percent > 0);

    const payload = {
      company_id: selectedCompany.id,
      code: code.trim(),
      name: name.trim(),
      tax_type: taxType.trim() || code.trim(),
      tax_desc: taxDesc.trim() || name.trim(),
      tax_percent: parseFloat(taxPercent) || 0.0,
      add_tax_percent: parseFloat(addTaxPercent) || 0.0,
      ac_code: acCode.trim(),
      ac_name: acName.trim(),
      components_json: JSON.stringify(activeComponents)
    };

    try {
      if (selectedRecord) {
        await updateTax({
          ...selectedRecord,
          ...payload
        });
        alert('Tax parameters updated successfully.');
      } else {
        const created = await createTax(payload);
        setSelectedRecord(created);
        alert('New Tax registry entry created successfully.');
      }
    } catch (err: any) {
      alert(`Error saving tax config: ${err.message || err}`);
    }
  };

  const handleCancel = () => {
    populateForm(selectedRecord);
  };

  const handleDeleteRecord = async () => {
    if (!selectedRecord) return;
    if (selectedRecord.code === '00') {
      alert('Default TAX FREE rule cannot be removed.');
      return;
    }

    if (confirm(`CAUTION: Permanently delete Tax option "${selectedRecord.name}"? This will affect invoice references.`)) {
      try {
        await deleteTax(selectedRecord.id);
        alert('Tax registry entry deleted successfully.');
        setSelectedRecord(null);
        populateForm(null);
      } catch (err) {
        alert('Error removing tax configuration.');
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

  const filteredTaxes = taxes.filter(t => {
    const q = globalFilter.toLowerCase();
    return t.name.toLowerCase().includes(q) || t.code.toLowerCase().includes(q);
  });

  return (
    <div className="p-3 bg-[#eef1f6] h-full overflow-hidden flex flex-col font-sans select-none">
      
      {/* Split Workspace */}
      <div className="flex-1 grid grid-cols-12 gap-3 overflow-hidden min-h-0 pb-2">
        
        {/* Left Side search index list */}
        <div className="col-span-5 bg-white border border-slate-350 rounded-[2px] shadow-sm flex flex-col overflow-hidden">
          <div className="bg-slate-800 text-slate-100 px-3 py-1.5 border-b border-slate-900 flex justify-between items-center shrink-0">
            <span className="text-[10px] font-bold uppercase tracking-wider font-luxury">SEARCH RECORD</span>
            <button
              onClick={handleNewRecord}
              className="flex items-center gap-1 px-2 py-0.5 bg-amber-500 hover:bg-amber-600 text-white font-bold text-[9px] uppercase tracking-wider rounded-[2px] border border-amber-600 transition-colors"
            >
              <Plus className="h-3 w-3" />
              <span>New Tax</span>
            </button>
          </div>

          <div className="p-2 border-b border-slate-200 bg-slate-50 shrink-0">
            <div className="flex items-center gap-1.5 bg-white border border-slate-300 rounded-[2px] px-2 py-1 focus-within:border-amber-500 focus-within:ring-1 focus-within:ring-amber-500/20">
              <Search className="h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search by code or description..."
                className="bg-transparent border-none text-[11px] focus:outline-none w-full font-semibold select-text"
                value={globalFilter}
                onChange={(e) => setGlobalFilter(e.target.value)}
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead className="bg-slate-100 border-b border-slate-200 sticky top-0 z-10 text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="p-2 border border-slate-200 text-center w-20">Code</th>
                  <th className="p-2 border border-slate-200">Name / Description</th>
                </tr>
              </thead>
              <tbody className="font-semibold text-slate-700 font-data">
                {filteredTaxes.length === 0 ? (
                  <tr>
                    <td colSpan={2} className="p-6 text-center text-slate-400 italic font-sans">
                      No tax records found.
                    </td>
                  </tr>
                ) : (
                  filteredTaxes.map((t) => {
                    const isSelected = selectedRecord?.id === t.id;
                    return (
                      <tr 
                        key={t.id}
                        onClick={() => handleSelectRecord(t)}
                        className={`cursor-pointer border-b border-slate-150 transition-colors ${
                          isSelected 
                            ? 'bg-rose-100/75 text-rose-900 border-l-[3px] border-l-amber-500' 
                            : 'hover:bg-slate-50'
                        }`}
                      >
                        <td className="p-1.5 border border-slate-200 text-center font-data text-amber-700">{t.code}</td>
                        <td className="p-1.5 border border-slate-200 font-sans font-bold text-slate-800">{t.name}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Side config form panel */}
        <div className="col-span-7 bg-white border border-slate-350 rounded-[2px] shadow-sm flex flex-col overflow-hidden">
          
          {/* Mockup custom orange/peach banner */}
          <div className="bg-amber-50 border-b border-amber-100 px-4 py-2 flex items-center justify-center shrink-0">
            <span className="text-[13px] font-extrabold uppercase tracking-widest text-amber-800 font-luxury">Tax Master</span>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <form onSubmit={handleSave} className="space-y-4">
              
              {/* Form Grid */}
              <div className="grid grid-cols-12 gap-x-4 gap-y-2.5 max-w-2xl">
                
                {/* Tax Type / Code */}
                <div className="col-span-12 grid grid-cols-12 gap-1 items-center">
                  <label className="col-span-3 text-[10px] font-bold text-slate-500 text-right pr-3 uppercase">Tax Type</label>
                  <div className="col-span-3">
                    <input 
                      type="text" 
                      required
                      placeholder="e.g. 10"
                      className="erp-input font-data text-amber-700 font-bold select-text" 
                      value={code}
                      onChange={(e) => {
                        setCode(e.target.value);
                        setTaxType(e.target.value);
                      }}
                    />
                  </div>
                </div>

                {/* Tax Desc */}
                <div className="col-span-12 grid grid-cols-12 gap-1 items-center">
                  <label className="col-span-3 text-[10px] font-bold text-slate-500 text-right pr-3 uppercase">Tax Desc</label>
                  <div className="col-span-8">
                    <input 
                      type="text" 
                      required
                      placeholder="GST Description Name"
                      className="erp-input font-bold select-text" 
                      value={taxDesc}
                      onChange={(e) => {
                        setTaxDesc(e.target.value);
                        setName(e.target.value);
                      }}
                    />
                  </div>
                </div>

                {/* Tax % and Add Tax % */}
                <div className="col-span-12 grid grid-cols-12 gap-1 items-center">
                  <label className="col-span-3 text-[10px] font-bold text-slate-500 text-right pr-3 uppercase">Tax %</label>
                  <div className="col-span-3">
                    <input 
                      type="number" 
                      step="0.001"
                      className="erp-input font-data text-right select-text" 
                      value={taxPercent}
                      onChange={(e) => handlePrimaryPercentChange(e.target.value)}
                    />
                  </div>
                  <label className="col-span-2 text-[10px] font-bold text-slate-500 text-right pr-3 uppercase">Add Tax %</label>
                  <div className="col-span-3">
                    <input 
                      type="number" 
                      step="0.001"
                      className="erp-input font-data text-right select-text" 
                      value={addTaxPercent}
                      onChange={(e) => setAddTaxPercent(e.target.value)}
                    />
                  </div>
                </div>

                {/* Ac Code and name info */}
                <div className="col-span-12 grid grid-cols-12 gap-1 items-center">
                  <label className="col-span-3 text-[10px] font-bold text-slate-500 text-right pr-3 uppercase">Ac Code</label>
                  <div className="col-span-3">
                    <input 
                      type="text" 
                      placeholder="Ledger Code"
                      className="erp-input font-data select-text" 
                      value={acCode}
                      onChange={(e) => setAcCode(e.target.value)}
                    />
                  </div>
                  <div className="col-span-5">
                    <input 
                      type="text" 
                      placeholder="Ledger Posting Account"
                      className="erp-input font-sans text-slate-500 bg-slate-50 border-slate-200 select-text" 
                      value={acName}
                      onChange={(e) => setAcName(e.target.value)}
                    />
                  </div>
                </div>

              </div>

              {/* Sub components breakdown table */}
              <div className="pt-2">
                <span className="text-[9.5px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Tax Breakdown Components Table
                </span>
                <div className="border border-slate-300 rounded-[2px] overflow-hidden shadow-xs max-w-2xl bg-white">
                  <table className="w-full border-collapse text-left text-xs ag-grid-dense-table">
                    <thead>
                      <tr>
                        <th className="w-12 text-center">Sr</th>
                        <th className="w-28">Tax Type</th>
                        <th>Tax Name</th>
                        <th className="w-24">Ac Code</th>
                        <th className="w-24 text-right">Tax %</th>
                      </tr>
                    </thead>
                    <tbody className="font-semibold text-slate-700 font-data">
                      {components.map((c, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50">
                          <td className="text-center font-data text-slate-400 bg-slate-50 border-r border-slate-200 p-1">{c.sr}</td>
                          <td className="p-0.5 border-r border-slate-200">
                            <input
                              type="text"
                              placeholder="e.g. CGST"
                              className="bg-transparent border-none text-[11px] font-bold focus:outline-none w-full px-1.5 h-6 select-text"
                              value={c.tax_type}
                              onChange={(e) => handleComponentCellChange(idx, 'tax_type', e.target.value)}
                            />
                          </td>
                          <td className="p-0.5 border-r border-slate-200">
                            <input
                              type="text"
                              placeholder="e.g. CGST 1.5%"
                              className="bg-transparent border-none text-[11px] font-sans font-semibold focus:outline-none w-full px-1.5 h-6 select-text"
                              value={c.tax_name}
                              onChange={(e) => handleComponentCellChange(idx, 'tax_name', e.target.value)}
                            />
                          </td>
                          <td className="p-0.5 border-r border-slate-200">
                            <input
                              type="text"
                              placeholder="00085"
                              className="bg-transparent border-none text-[11px] font-data text-center focus:outline-none w-full px-1.5 h-6 select-text"
                              value={c.ac_code}
                              onChange={(e) => handleComponentCellChange(idx, 'ac_code', e.target.value)}
                            />
                          </td>
                          <td className="p-0.5">
                            <input
                              type="number"
                              step="0.001"
                              placeholder="0.00"
                              className="bg-transparent border-none text-[11px] font-data text-right focus:outline-none w-full px-1.5 h-6 select-text"
                              value={c.tax_percent || ''}
                              onChange={(e) => handleComponentCellChange(idx, 'tax_percent', e.target.value)}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

            </form>
          </div>

          {/* Bottom Button Action bar */}
          <div className="bg-slate-100 border-t border-slate-300 p-2 flex justify-between items-center shrink-0 select-none">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1 bg-white hover:bg-slate-50 border border-slate-350 text-slate-700 font-bold text-xs uppercase tracking-wider rounded-[2px] shadow-xs transition-colors"
            >
              <Printer className="h-4 w-4 text-slate-500" />
              <span>Print</span>
            </button>

            <div className="flex gap-2">
              <button
                onClick={() => handleSave()}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 border border-emerald-700 text-white font-bold text-xs uppercase tracking-wider rounded-[2px] shadow-xs transition-colors"
              >
                <Save className="h-4 w-4" />
                <span>Save</span>
              </button>

              <button
                onClick={handleCancel}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-white hover:bg-slate-50 border border-slate-350 text-slate-700 font-bold text-xs uppercase tracking-wider rounded-[2px] shadow-xs transition-colors"
              >
                <Undo2 className="h-4 w-4 text-slate-500" />
                <span>Cancel</span>
              </button>

              <button
                onClick={handleDeleteRecord}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-rose-600 hover:bg-rose-700 border border-rose-700 text-white font-bold text-xs uppercase tracking-wider rounded-[2px] shadow-xs transition-colors"
              >
                <Trash2 className="h-4 w-4" />
                <span>Delete</span>
              </button>

              <button
                onClick={handleExit}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-slate-700 hover:bg-slate-800 border border-slate-850 text-white font-bold text-xs uppercase tracking-wider rounded-[2px] shadow-xs transition-colors"
              >
                <LogOut className="h-4 w-4" />
                <span>Exit</span>
              </button>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
