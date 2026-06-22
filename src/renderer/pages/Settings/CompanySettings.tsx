import React, { useEffect, useState } from 'react';
import { useCompanyStore } from '../../store/useCompanyStore';
import { useTabStore } from '../../store/useTabStore';
import { Settings, Printer, Save, Undo2, LogOut, CheckSquare } from 'lucide-react';

interface BookColumn {
  sr: number;
  colName: string;
  colNewName: string;
  rptCol: 'Y' | 'N';
  showCol: 'Y' | 'N';
}

const DEFAULT_COLUMNS: BookColumn[] = [
  { sr: 1, colName: 'BagWt', colNewName: 'BagWt', rptCol: 'N', showCol: 'N' },
  { sr: 2, colName: 'Color', colNewName: 'Color', rptCol: 'N', showCol: 'N' },
  { sr: 3, colName: 'Counter', colNewName: 'Counter', rptCol: 'Y', showCol: 'Y' },
  { sr: 4, colName: 'Design', colNewName: 'Design', rptCol: 'N', showCol: 'Y' },
  { sr: 5, colName: 'Fine', colNewName: 'Fine', rptCol: 'N', showCol: 'N' },
  { sr: 6, colName: 'Ght%', colNewName: 'Ght%', rptCol: 'N', showCol: 'N' },
  { sr: 7, colName: 'GhtWt', colNewName: 'GhtWt', rptCol: 'N', showCol: 'N' },
  { sr: 8, colName: 'Image', colNewName: 'Image', rptCol: 'Y', showCol: 'Y' },
  { sr: 9, colName: 'ItAmt', colNewName: 'ItAmt', rptCol: 'N', showCol: 'N' },
  { sr: 10, colName: 'ItRate', colNewName: 'ItRate', rptCol: 'N', showCol: 'N' },
  { sr: 11, colName: 'KrCod', colNewName: 'KrCod', rptCol: 'Y', showCol: 'Y' },
  { sr: 12, colName: 'KrFine', colNewName: 'KrFine', rptCol: 'N', showCol: 'N' },
  { sr: 13, colName: 'KrGht', colNewName: 'KrGht', rptCol: 'N', showCol: 'N' },
  { sr: 14, colName: 'KrGht%', colNewName: 'KrGht%', rptCol: 'N', showCol: 'N' },
  { sr: 15, colName: 'KrLAmt', colNewName: 'KrLAmt', rptCol: 'N', showCol: 'N' },
  { sr: 16, colName: 'KrLRate', colNewName: 'KrLRate', rptCol: 'N', showCol: 'N' },
  { sr: 17, colName: 'KrNwt', colNewName: 'KrNwt', rptCol: 'N', showCol: 'N' },
  { sr: 18, colName: 'KrOthAmt', colNewName: 'KrOthAmt', rptCol: 'N', showCol: 'N' },
  { sr: 19, colName: 'KrOthWt', colNewName: 'KrOthWt', rptCol: 'N', showCol: 'N' },
  { sr: 20, colName: 'KrTouch', colNewName: 'KrTouch', rptCol: 'Y', showCol: 'N' },
];

export default function CompanySettingsView() {
  const { selectedCompany, updateCompany } = useCompanyStore();
  const closeTab = useTabStore((state) => state.closeTab);
  const activeTabId = useTabStore((state) => state.activeTabId);

  // Left Section Table Column configuration
  const [bookColumns, setBookColumns] = useState<BookColumn[]>(DEFAULT_COLUMNS);
  const [bookColSet, setBookColSet] = useState('TAG_DETL');

  // Right Section Settings States
  const [labourType, setLabourType] = useState('Gross Wise');
  const [rateCutRate, setRateCutRate] = useState('G Gram Wise');
  const [gstTaxRof, setGstTaxRof] = useState('2');
  const [slRowChange, setSlRowChange] = useState('N');
  const [slLbrRateGen, setSlLbrRateGen] = useState('N');
  const [dailyRateOpen, setDailyRateOpen] = useState('N');
  const [reminderOpen, setReminderOpen] = useState('No');
  const [fineStkRpt, setFineStkRpt] = useState('Net Wise');
  const [openingDhiran, setOpeningDhiran] = useState('Yes');
  const [dhrnInterestType, setDhrnInterestType] = useState('Month Wise');
  const [dhiranIntPct, setDhiranIntPct] = useState('2.00');

  const [helpSearch, setHelpSearch] = useState('Selected Col');
  const [ledrSumm, setLedrSumm] = useState('No');
  const [stkRptGN, setStkRptGN] = useState('Net Wise');
  const [salesRateRof, setSalesRateRof] = useState('0');
  const [salesLbrRof, setSalesLbrRof] = useState('0');
  const [purcWithLbr, setPurcWithLbr] = useState('Yes');
  const [whTouchSave, setWhTouchSave] = useState('No');
  const [panCardValue, setPanCardValue] = useState('200000');
  const [duplicatePrint, setDuplicatePrint] = useState('No');

  // Load active company's settings
  useEffect(() => {
    if (selectedCompany) {
      try {
        const settings = JSON.parse(selectedCompany.settings_json || '{}');
        
        // Load columns grid
        if (settings.book_columns && Array.isArray(settings.book_columns)) {
          setBookColumns(settings.book_columns);
        } else {
          setBookColumns(DEFAULT_COLUMNS);
        }

        if (settings.bookColSet) setBookColSet(settings.bookColSet);
        if (settings.labourType) setLabourType(settings.labourType);
        if (settings.rateCutRate) setRateCutRate(settings.rateCutRate);
        if (settings.gstTaxRof) setGstTaxRof(settings.gstTaxRof);
        if (settings.slRowChange) setSlRowChange(settings.slRowChange);
        if (settings.slLbrRateGen) setSlLbrRateGen(settings.slLbrRateGen);
        if (settings.dailyRateOpen) setDailyRateOpen(settings.dailyRateOpen);
        if (settings.reminderOpen) setReminderOpen(settings.reminderOpen);
        if (settings.fineStkRpt) setFineStkRpt(settings.fineStkRpt);
        if (settings.openingDhiran) setOpeningDhiran(settings.openingDhiran);
        if (settings.dhrnInterestType) setDhrnInterestType(settings.dhrnInterestType);
        if (settings.dhiranIntPct) setDhiranIntPct(settings.dhiranIntPct);

        if (settings.helpSearch) setHelpSearch(settings.helpSearch);
        if (settings.ledrSumm) setLedrSumm(settings.ledrSumm);
        if (settings.stkRptGN) setStkRptGN(settings.stkRptGN);
        if (settings.salesRateRof) setSalesRateRof(settings.salesRateRof);
        if (settings.salesLbrRof) setSalesLbrRof(settings.salesLbrRof);
        if (settings.purcWithLbr) setPurcWithLbr(settings.purcWithLbr);
        if (settings.whTouchSave) setWhTouchSave(settings.whTouchSave);
        if (settings.panCardValue) setPanCardValue(String(settings.panCardValue));
        if (settings.duplicatePrint) setDuplicatePrint(settings.duplicatePrint);
      } catch (err) {
        console.error('Failed to parse company settings payload:', err);
        resetToDefaults();
      }
    }
  }, [selectedCompany]);

  const resetToDefaults = () => {
    setBookColumns(DEFAULT_COLUMNS);
    setBookColSet('TAG_DETL');
    setLabourType('Gross Wise');
    setRateCutRate('G Gram Wise');
    setGstTaxRof('2');
    setSlRowChange('N');
    setSlLbrRateGen('N');
    setDailyRateOpen('N');
    setReminderOpen('No');
    setFineStkRpt('Net Wise');
    setOpeningDhiran('Yes');
    setDhrnInterestType('Month Wise');
    setDhiranIntPct('2.00');
    setHelpSearch('Selected Col');
    setLedrSumm('No');
    setStkRptGN('Net Wise');
    setSalesRateRof('0');
    setSalesLbrRof('0');
    setPurcWithLbr('Yes');
    setWhTouchSave('No');
    setPanCardValue('200000');
    setDuplicatePrint('No');
  };

  const handleColumnChange = (sr: number, field: keyof BookColumn, value: any) => {
    setBookColumns(
      bookColumns.map(col => col.sr === sr ? { ...col, [field]: value } : col)
    );
  };

  const handleSave = async () => {
    if (!selectedCompany) {
      alert('Please select a company workspace first.');
      return;
    }

    try {
      // Fetch current settings block to prevent wiping other properties
      const currentSettings = JSON.parse(selectedCompany.settings_json || '{}');
      
      const newSettings = {
        ...currentSettings,
        bookColSet,
        book_columns: bookColumns,
        labourType,
        rateCutRate,
        gstTaxRof,
        slRowChange,
        slLbrRateGen,
        dailyRateOpen,
        reminderOpen,
        fineStkRpt,
        openingDhiran,
        dhrnInterestType,
        dhiranIntPct,
        helpSearch,
        ledrSumm,
        stkRptGN,
        salesRateRof,
        salesLbrRof,
        purcWithLbr,
        whTouchSave,
        panCardValue: parseInt(panCardValue) || 200000,
        duplicatePrint
      };

      const payload = {
        ...selectedCompany,
        settings_json: JSON.stringify(newSettings)
      };

      await updateCompany(payload);
      alert(`Company "${selectedCompany.name}" settings saved successfully.`);
    } catch (err) {
      console.error(err);
      alert('Failed to update company setting options.');
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

  if (!selectedCompany) {
    return (
      <div className="p-3 bg-[#eef1f6] h-full overflow-hidden flex items-center justify-center font-sans">
        <div className="bg-white border border-slate-350 rounded-[2px] p-6 max-w-sm text-center space-y-3 shadow-md">
          <p className="text-rose-500 font-extrabold uppercase text-xs tracking-wider">WORKSPACE SELECTION REQUIRED</p>
          <p className="text-slate-500 text-[11px] font-semibold">Please select an active company in the top selector to configure its individual business settings.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 bg-[#eef1f6] h-full overflow-hidden flex flex-col font-sans select-none">
      
      {/* 1. Main Workspace Panel */}
      <div className="flex-1 grid grid-cols-12 gap-3 overflow-hidden min-h-0 pb-2">
        
        {/* LEFT CARD: Custom Book Columns Registry (col-span-5) */}
        <div className="col-span-5 bg-white border border-slate-350 rounded-[2px] shadow-sm flex flex-col overflow-hidden">
          
          <div className="bg-[#070D18] text-[#d4af37] px-3 py-2 border-b border-slate-950 flex justify-between items-center shrink-0">
            <span className="text-[10px] font-bold uppercase tracking-wider font-luxury">Column Customizer</span>
            <div className="flex items-center gap-1">
              <CheckSquare className="h-3.5 w-3.5 text-amber-500" />
              <span className="text-[9px] font-mono text-slate-400">BOOK FIELD NAMES</span>
            </div>
          </div>

          {/* Book Col Set dropdown */}
          <div className="p-2 border-b border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <label className="erp-label">Book Col Set</label>
              <select
                className="erp-input w-28 border-slate-300 font-bold"
                value={bookColSet}
                onChange={(e) => setBookColSet(e.target.value)}
              >
                <option value="TAG_DETL">TAG_DETL</option>
                <option value="VAT_DETL">VAT_DETL</option>
                <option value="GST_DETL">GST_DETL</option>
              </select>
            </div>
            <button className="px-2 py-0.5 border border-amber-600 bg-amber-50 hover:bg-amber-100/50 text-amber-700 font-extrabold text-[9px] uppercase tracking-wider rounded-[2px] transition-colors">
              Column Set
            </button>
          </div>

          {/* Columns Grid Table */}
          <div className="flex-1 overflow-y-auto">
            <table className="ag-grid-dense-table w-full border-collapse">
              <thead className="sticky top-0 bg-slate-100 border-b border-slate-200 z-10 text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="p-2 border border-slate-200 text-center w-10">Sr</th>
                  <th className="p-2 border border-slate-200 text-left">ColName</th>
                  <th className="p-2 border border-slate-200 text-left">ColNewName</th>
                  <th className="p-2 border border-slate-200 text-center w-14">RptCol</th>
                  <th className="p-2 border border-slate-200 text-center w-14">ShowCol</th>
                </tr>
              </thead>
              <tbody className="font-semibold text-slate-700 font-data">
                {bookColumns.map((col) => (
                  <tr key={col.sr} className="hover:bg-slate-50 border-b border-slate-150 text-[11px]">
                    <td className="p-1 border border-slate-200 text-center text-slate-500 text-[10px]">{col.sr}</td>
                    <td className="p-1 border border-slate-200 font-sans text-slate-500 font-medium">{col.colName}</td>
                    <td className="p-1 border border-slate-200 font-sans">
                      <input
                        type="text"
                        className="erp-input h-6 font-bold py-0.5 select-text"
                        value={col.colNewName}
                        onChange={(e) => handleColumnChange(col.sr, 'colNewName', e.target.value)}
                      />
                    </td>
                    <td className="p-1 border border-slate-200 text-center">
                      <select
                        className="erp-input h-6 py-0 font-bold text-[10px] text-center"
                        value={col.rptCol}
                        onChange={(e) => handleColumnChange(col.sr, 'rptCol', e.target.value as any)}
                      >
                        <option value="Y">Y</option>
                        <option value="N">N</option>
                      </select>
                    </td>
                    <td className="p-1 border border-slate-200 text-center">
                      <select
                        className="erp-input h-6 py-0 font-bold text-[10px] text-center"
                        value={col.showCol}
                        onChange={(e) => handleColumnChange(col.sr, 'showCol', e.target.value as any)}
                      >
                        <option value="Y">Y</option>
                        <option value="N">N</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* RIGHT CARD: Company settings controls list (col-span-7) */}
        <div className="col-span-7 bg-white border border-slate-350 rounded-[2px] shadow-sm flex flex-col overflow-hidden">
          
          <div className="bg-amber-500/15 border-b border-amber-500/30 py-2 text-center shrink-0">
            <h1 className="text-sm font-extrabold uppercase text-amber-700 tracking-widest font-luxury">
              Company Config Parameters
            </h1>
          </div>

          {/* Parameters grid scroll wrapper */}
          <div className="flex-1 overflow-y-auto p-3 grid grid-cols-2 gap-x-4 gap-y-2.5">
            
            {/* COLUMN 1 */}
            <div className="space-y-2.5 border-r border-slate-200 pr-4">
              
              <div className="flex items-center justify-between gap-1">
                <span className="erp-label w-32 truncate">Labour Type Set</span>
                <div className="flex gap-1 flex-1">
                  <select className="erp-input h-7 py-0.5 flex-1" value={labourType} onChange={(e) => setLabourType(e.target.value)}>
                    <option value="Gross Wise">Gross Wise</option>
                    <option value="Net Wise">Net Wise</option>
                    <option value="Item Wise">Item Wise</option>
                    <option value="Purity Wise">Purity Wise</option>
                  </select>
                  <button className="px-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-[2px] text-[8px] font-bold uppercase shrink-0">Lbr Type Set</button>
                </div>
              </div>

              <div className="flex items-center justify-between gap-1">
                <span className="erp-label w-32 truncate">Rate Cut Rate</span>
                <div className="flex gap-1 flex-1">
                  <select className="erp-input h-7 py-0.5 flex-1" value={rateCutRate} onChange={(e) => setRateCutRate(e.target.value)}>
                    <option value="G Gram Wise">G Gram Wise</option>
                    <option value="Net Weight Wise">Net Weight Wise</option>
                    <option value="Purity Wise">Purity Wise</option>
                  </select>
                  <button className="px-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-[2px] text-[8px] font-bold uppercase shrink-0">Rate Type Set</button>
                </div>
              </div>

              <div className="flex items-center justify-between gap-1">
                <span className="erp-label w-32 truncate">Gst Tax Rof</span>
                <div className="flex gap-1 flex-1">
                  <select className="erp-input h-7 py-0.5 flex-1 font-data" value={gstTaxRof} onChange={(e) => setGstTaxRof(e.target.value)}>
                    <option value="2">2 Decimal</option>
                    <option value="0">0 Decimal</option>
                    <option value="1">1 Decimal</option>
                  </select>
                  <button className="px-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-[2px] text-[8px] font-bold uppercase shrink-0">Tax Rof Set</button>
                </div>
              </div>

              <div className="flex items-center justify-between gap-1">
                <span className="erp-label w-32 truncate">SI Row Change</span>
                <div className="flex gap-1 flex-1">
                  <select className="erp-input h-7 py-0.5 flex-1 font-data" value={slRowChange} onChange={(e) => setSlRowChange(e.target.value)}>
                    <option value="N">No (Locked)</option>
                    <option value="Y">Yes (Editable)</option>
                  </select>
                  <button className="px-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-[2px] text-[8px] font-bold uppercase shrink-0">Change Set</button>
                </div>
              </div>

              <div className="flex items-center justify-between gap-1">
                <span className="erp-label w-32 truncate">SI Lbr Rate Gen</span>
                <div className="flex gap-1 flex-1">
                  <select className="erp-input h-7 py-0.5 flex-1 font-data" value={slLbrRateGen} onChange={(e) => setSlLbrRateGen(e.target.value)}>
                    <option value="N">No (Manual)</option>
                    <option value="Y">Yes (Auto)</option>
                  </select>
                  <button className="px-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-[2px] text-[8px] font-bold uppercase shrink-0">Lbr Rate Gen</button>
                </div>
              </div>

              <div className="flex items-center justify-between gap-1">
                <span className="erp-label w-32 truncate">Daily Rate Open</span>
                <div className="flex gap-1 flex-1">
                  <select className="erp-input h-7 py-0.5 flex-1 font-data" value={dailyRateOpen} onChange={(e) => setDailyRateOpen(e.target.value)}>
                    <option value="N">No (Manual)</option>
                    <option value="Y">Yes (Startup)</option>
                  </select>
                  <button className="px-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-[2px] text-[8px] font-bold uppercase shrink-0">Daily Rate Set</button>
                </div>
              </div>

              <div className="flex items-center justify-between gap-1">
                <span className="erp-label w-32 truncate">Reminder Open</span>
                <div className="flex gap-1 flex-1">
                  <select className="erp-input h-7 py-0.5 flex-1" value={reminderOpen} onChange={(e) => setReminderOpen(e.target.value)}>
                    <option value="No">No</option>
                    <option value="Yes">Yes (Startup)</option>
                  </select>
                  <button className="px-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-[2px] text-[8px] font-bold uppercase shrink-0">Reminder Set</button>
                </div>
              </div>

              <div className="flex items-center justify-between gap-1">
                <span className="erp-label w-32 truncate">Fine Stk Rpt</span>
                <div className="flex gap-1 flex-1">
                  <select className="erp-input h-7 py-0.5 flex-1" value={fineStkRpt} onChange={(e) => setFineStkRpt(e.target.value)}>
                    <option value="Net Wise">Net Wise</option>
                    <option value="Gross Wise">Gross Wise</option>
                  </select>
                  <button className="px-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-[2px] text-[8px] font-bold uppercase shrink-0">Stock Type Set</button>
                </div>
              </div>

              <div className="flex items-center justify-between gap-1">
                <span className="erp-label w-32 truncate">Opening Dhiran</span>
                <div className="flex gap-1 flex-1">
                  <select className="erp-input h-7 py-0.5 flex-1" value={openingDhiran} onChange={(e) => setOpeningDhiran(e.target.value)}>
                    <option value="Yes">Yes (Enabled)</option>
                    <option value="No">No (Disabled)</option>
                  </select>
                  <button className="px-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-[2px] text-[8px] font-bold uppercase shrink-0">Dhiran Set</button>
                </div>
              </div>

              <div className="flex items-center justify-between gap-1">
                <span className="erp-label w-32 truncate">Dhrn Int Type</span>
                <div className="flex gap-1 flex-1">
                  <select className="erp-input h-7 py-0.5 flex-1" value={dhrnInterestType} onChange={(e) => setDhrnInterestType(e.target.value)}>
                    <option value="Month Wise">Month Wise</option>
                    <option value="Year Wise">Year Wise</option>
                    <option value="Daily Wise">Daily Wise</option>
                  </select>
                  <button className="px-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-[2px] text-[8px] font-bold uppercase shrink-0">Dhrn Type Set</button>
                </div>
              </div>

              <div className="flex items-center justify-between gap-1">
                <span className="erp-label w-32 truncate">Dhiran Int %</span>
                <div className="flex gap-1 flex-1">
                  <select className="erp-input h-7 py-0.5 flex-1 font-data" value={dhiranIntPct} onChange={(e) => setDhiranIntPct(e.target.value)}>
                    <option value="2.00">2.00%</option>
                    <option value="1.50">1.50%</option>
                    <option value="1.00">1.00%</option>
                    <option value="2.50">2.50%</option>
                    <option value="3.00">3.00%</option>
                  </select>
                  <button className="px-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-[2px] text-[8px] font-bold uppercase shrink-0">Dhrn Int % Set</button>
                </div>
              </div>

            </div>

            {/* COLUMN 2 */}
            <div className="space-y-2.5">
              
              <div className="flex items-center justify-between gap-1">
                <span className="erp-label w-32 truncate">Help Search</span>
                <div className="flex gap-1 flex-1">
                  <select className="erp-input h-7 py-0.5 flex-1" value={helpSearch} onChange={(e) => setHelpSearch(e.target.value)}>
                    <option value="Selected Col">Selected Col</option>
                    <option value="All Columns">All Columns</option>
                    <option value="Description Wise">Description Wise</option>
                  </select>
                  <button className="px-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-[2px] text-[8px] font-bold uppercase shrink-0">Help Set</button>
                </div>
              </div>

              <div className="flex items-center justify-between gap-1">
                <span className="erp-label w-32 truncate">Ledr Summ</span>
                <div className="flex gap-1 flex-1">
                  <select className="erp-input h-7 py-0.5 flex-1" value={ledrSumm} onChange={(e) => setLedrSumm(e.target.value)}>
                    <option value="No">No</option>
                    <option value="Yes">Yes</option>
                  </select>
                  <button className="px-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-[2px] text-[8px] font-bold uppercase shrink-0">Ledger Set</button>
                </div>
              </div>

              <div className="flex items-center justify-between gap-1">
                <span className="erp-label w-32 truncate">Stk Rpt G/N</span>
                <div className="flex gap-1 flex-1">
                  <select className="erp-input h-7 py-0.5 flex-1" value={stkRptGN} onChange={(e) => setStkRptGN(e.target.value)}>
                    <option value="Net Wise">Net Wise</option>
                    <option value="Gross Wise">Gross Wise</option>
                    <option value="Both">Both</option>
                  </select>
                  <button className="px-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-[2px] text-[8px] font-bold uppercase shrink-0">Stk Rpt Set</button>
                </div>
              </div>

              <div className="flex items-center justify-between gap-1">
                <span className="erp-label w-32 truncate">Sales Rate Rof</span>
                <div className="flex gap-1 flex-1">
                  <select className="erp-input h-7 py-0.5 flex-1 font-data" value={salesRateRof} onChange={(e) => setSalesRateRof(e.target.value)}>
                    <option value="0">0 Decimal</option>
                    <option value="2">2 Decimal</option>
                    <option value="1">1 Decimal</option>
                  </select>
                  <button className="px-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-[2px] text-[8px] font-bold uppercase shrink-0">Rate Rof Set</button>
                </div>
              </div>

              <div className="flex items-center justify-between gap-1">
                <span className="erp-label w-32 truncate">Sales Lbr Rof</span>
                <div className="flex gap-1 flex-1">
                  <select className="erp-input h-7 py-0.5 flex-1 font-data" value={salesLbrRof} onChange={(e) => setSalesLbrRof(e.target.value)}>
                    <option value="0">0 Decimal</option>
                    <option value="2">2 Decimal</option>
                    <option value="1">1 Decimal</option>
                  </select>
                  <button className="px-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-[2px] text-[8px] font-bold uppercase shrink-0">Lbr Rof Set</button>
                </div>
              </div>

              <div className="flex items-center justify-between gap-1">
                <span className="erp-label w-32 truncate">Purc With Lbr</span>
                <div className="flex gap-1 flex-1">
                  <select className="erp-input h-7 py-0.5 flex-1" value={purcWithLbr} onChange={(e) => setPurcWithLbr(e.target.value)}>
                    <option value="Yes">Yes</option>
                    <option value="No">No</option>
                  </select>
                  <button className="px-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-[2px] text-[8px] font-bold uppercase shrink-0">Purc + Lbr Set</button>
                </div>
              </div>

              <div className="flex items-center justify-between gap-1">
                <span className="erp-label w-32 truncate">Wh Touch Save</span>
                <div className="flex gap-1 flex-1">
                  <select className="erp-input h-7 py-0.5 flex-1" value={whTouchSave} onChange={(e) => setWhTouchSave(e.target.value)}>
                    <option value="No">No</option>
                    <option value="Yes">Yes</option>
                  </select>
                  <button className="px-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-[2px] text-[8px] font-bold uppercase shrink-0">Auto Tch Set</button>
                </div>
              </div>

              <div className="flex items-center justify-between gap-1">
                <span className="erp-label w-32 truncate">PanCard Value</span>
                <div className="flex gap-1 flex-1">
                  <input
                    type="number"
                    className="erp-input h-7 py-0.5 flex-1 font-data select-text"
                    value={panCardValue}
                    onChange={(e) => setPanCardValue(e.target.value)}
                  />
                  <button className="px-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-[2px] text-[8px] font-bold uppercase shrink-0">Sale Pan Value</button>
                </div>
              </div>

              <div className="flex items-center justify-between gap-1">
                <span className="erp-label w-32 truncate">Duplicat Print</span>
                <div className="flex gap-1 flex-1">
                  <select className="erp-input h-7 py-0.5 flex-1" value={duplicatePrint} onChange={(e) => setDuplicatePrint(e.target.value)}>
                    <option value="No">No</option>
                    <option value="Yes">Yes</option>
                  </select>
                  <button className="px-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-[2px] text-[8px] font-bold uppercase shrink-0">Duplicate Print</button>
                </div>
              </div>

            </div>

          </div>

          <div className="bg-slate-50 border-t border-slate-200 p-2.5 text-center text-[9.5px] text-slate-500 font-semibold uppercase tracking-wider shrink-0 select-none">
            Active Workspace context: <span className="text-amber-700 font-bold">{selectedCompany.name}</span>
          </div>

        </div>

      </div>

      {/* 2. BOTTOM ACTIONS TOOLBAR */}
      <footer className="bg-slate-100 border border-slate-350 rounded-[2px] p-1.5 flex justify-end gap-2.5 shrink-0 shadow-sm select-none">
        
        {/* Print Button */}
        <button
          onClick={handlePrint}
          className="flex items-center gap-1.5 px-3 py-1 bg-white hover:bg-slate-50 border border-slate-300 rounded-[2px] text-xs font-bold text-slate-700 uppercase tracking-wide transition-all shadow-xs"
        >
          <Printer className="h-4 w-4 text-slate-500" />
          <span>Print</span>
        </button>

        {/* Save Button */}
        <button
          onClick={handleSave}
          className="flex items-center gap-1.5 px-3 py-1 bg-white hover:bg-slate-50 border border-slate-300 rounded-[2px] text-xs font-bold text-slate-700 uppercase tracking-wide transition-all shadow-xs"
        >
          <Save className="h-4 w-4 text-emerald-600" />
          <span className="text-emerald-700">Save</span>
        </button>

        {/* Cancel Button */}
        <button
          onClick={resetToDefaults}
          className="flex items-center gap-1.5 px-3 py-1 bg-white hover:bg-slate-50 border border-slate-300 rounded-[2px] text-xs font-bold text-slate-700 uppercase tracking-wide transition-all shadow-xs"
        >
          <Undo2 className="h-4 w-4 text-amber-600" />
          <span className="text-amber-700">Cancel</span>
        </button>

        {/* Exit Button */}
        <button
          onClick={handleExit}
          className="flex items-center gap-1.5 px-3 py-1 bg-white hover:bg-slate-50 border border-slate-300 rounded-[2px] text-xs font-bold text-slate-700 uppercase tracking-wide transition-all shadow-xs"
        >
          <LogOut className="h-4 w-4 text-slate-600" />
          <span>Exit</span>
        </button>

      </footer>

    </div>
  );
}
