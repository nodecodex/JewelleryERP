import { useEffect, useState } from 'react';
import { useCompanyStore } from '../../store/useCompanyStore';
import { useRateStore } from '../../store/useRateStore';
import { useTabStore } from '../../store/useTabStore';
import type { TagRecord, TagAccessory } from '../../../main/repositories/ledr-report.repository';
import {
  FileSpreadsheet,
  Printer,
  FileText,
  Undo2,
  Trash2,
  LogOut,
  Search,
  Plus
} from 'lucide-react';

type TagFilterType = 'IN' | 'OUT' | 'ALL';
type ThemeAccent = 'orange' | 'gold' | 'slate' | 'classic';

interface TagDetail extends TagRecord {
  tot_amt: number;
}

export default function LedrReportView() {
  const selectedCompany = useCompanyStore((state) => state.selectedCompany);
  const closeTab = useTabStore((state) => state.closeTab);
  const activeTabId = useTabStore((state) => state.activeTabId);
  const currentRates = useRateStore((state) => state.currentRates);

  // Styling Accent Theme
  const [themeAccent, setThemeAccent] = useState<ThemeAccent>('orange');

  // Filter States
  const [dateFrom, setDateFrom] = useState('2020-09-12');
  const [dateTo, setDateTo] = useState('2022-09-12');
  const [filterType, setFilterType] = useState<TagFilterType>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [itemType, setItemType] = useState('Gold');
  const [prCode, setPrCode] = useState('');
  const [prCodeDesc, setPrCodeDesc] = useState('');
  const [grCode, setGrCode] = useState('');
  const [grCodeDesc, setGrCodeDesc] = useState('');

  // Data List
  const [tags, setTags] = useState<TagRecord[]>([]);
  const [filteredTags, setFilteredTags] = useState<TagRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Selection states
  const [selectedTag, setSelectedTag] = useState<TagRecord | null>(null);
  const [tagDetails, setTagDetails] = useState<TagDetail | null>(null);
  const [tagAccessories, setTagAccessories] = useState<TagAccessory[]>([]);

  // Summary Inputs
  const [lbrRateInput, setLbrRateInput] = useState('');
  const [lbrPercentInput, setLbrPercentInput] = useState('627 Kb'); // Matches screenshot placeholder
  const [taxRate, setTaxRate] = useState(3.0); // 3% GST Default

  // Fallback rates if store rates are null
  const defaultGoldRate = currentRates ? currentRates.gold_rate_22k : 53186;
  const defaultSilverRate = currentRates ? currentRates.silver_rate : 60206;

  // Load tags on mount/company change
  useEffect(() => {
    if (selectedCompany) {
      loadReportData();
    }
  }, [selectedCompany]);

  const loadReportData = async () => {
    if (!selectedCompany) return;
    setIsLoading(true);
    try {
      const data = await (window as any).api.getTagStockReport(selectedCompany.id);
      setTags(data);
      setIsLoading(false);

      // Select first tag by default if items exist
      if (data.length > 0) {
        selectActiveTag(data[0]);
      }
    } catch (e) {
      console.error('Failed to load tag stock report:', e);
      setIsLoading(false);
    }
  };

  // Run filters whenever dependencies change
  useEffect(() => {
    let result = [...tags];

    // Date filters
    if (dateFrom) {
      result = result.filter(t => t.entry_date >= dateFrom);
    }
    if (dateTo) {
      result = result.filter(t => t.entry_date <= dateTo);
    }

    // In Tag / Out Tag status filters
    if (filterType === 'IN') {
      result = result.filter(t => t.current_stock > 0);
    } else if (filterType === 'OUT') {
      result = result.filter(t => t.current_stock <= 0);
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(t => 
        t.tag_no.toLowerCase().includes(q) || 
        t.it_code.toLowerCase().includes(q) || 
        t.it_name.toLowerCase().includes(q)
      );
    }

    // Item type filter
    if (itemType) {
      const typeLow = itemType.toLowerCase();
      result = result.filter(t => {
        const cat = t.it_code.toLowerCase();
        if (typeLow === 'gold') return cat.includes('gold') || cat.startsWith('g') || cat.includes('chain') || cat.includes('mangal');
        if (typeLow === 'silver') return cat.includes('silver') || cat.startsWith('s');
        if (typeLow === 'diamond') return cat.includes('diamond') || cat.startsWith('d');
        return true;
      });
    }

    // Pr Code filter
    if (prCode.trim()) {
      result = result.filter(t => t.it_code.toLowerCase().includes(prCode.toLowerCase()));
    }

    // Gr Code filter (checks huld/counter)
    if (grCode.trim()) {
      result = result.filter(t => t.tag_no.toLowerCase().includes(grCode.toLowerCase()));
    }

    setFilteredTags(result);

    // Update active selections if not visible in filtered result anymore
    if (result.length > 0) {
      if (!selectedTag || !result.find(t => t.tag_no === selectedTag.tag_no)) {
        selectActiveTag(result[0]);
      }
    } else {
      setSelectedTag(null);
      setTagDetails(null);
      setTagAccessories([]);
    }
  }, [tags, dateFrom, dateTo, filterType, searchQuery, itemType, prCode, grCode]);

  // Load details and charges for active tag
  const selectActiveTag = async (tag: TagRecord) => {
    setSelectedTag(tag);
    setLbrRateInput(tag.lbr_rate > 0 ? String(tag.lbr_rate) : '');

    try {
      // Fetch associated charges/accessories
      const accessories = await (window as any).api.getTagAccessories(tag.source, tag.voucher_id, tag.tag_id);
      
      // If no accessories exist in DB, provide default hallmark & rodiam charges rows to match layout
      if (accessories.length === 0) {
        const defaultCharges: TagAccessory[] = [
          {
            sr: 1,
            it_code: 'RD',
            it_name: 'RODIAM CHARGES',
            pcs: 1,
            weight: 0.000,
            con_percent: 0.0,
            pw: 'W',
            rate: 300.00,
            it_amt: 300.00,
            lbr_rate: 0.0,
            lbr_amt: 0.0,
            net_amt: 300.00
          },
          {
            sr: 2,
            it_code: 'HM',
            it_name: 'HALL MARK CHARGES',
            pcs: 1,
            weight: 0.000,
            con_percent: 0.0,
            pw: 'P',
            rate: 200.00,
            it_amt: 200.00,
            lbr_rate: 0.0,
            lbr_amt: 0.0,
            net_amt: 200.00
          }
        ];
        setTagAccessories(defaultCharges);
        updateTagDetails(tag, defaultCharges);
      } else {
        setTagAccessories(accessories);
        updateTagDetails(tag, accessories);
      }
    } catch (e) {
      console.error('Failed to load tag details:', e);
    }
  };

  // Sync Table 2 values based on Table 3 charges
  const updateTagDetails = (tag: TagRecord, accessories: TagAccessory[]) => {
    const accTotalAmt = accessories.reduce((sum, item) => sum + item.net_amt, 0);
    const lbrRateVal = parseFloat(lbrRateInput) || tag.lbr_rate || 0.0;
    
    // Recalculate LbrAmt
    let lbrAmt = 0;
    if (tag.lbr_type === 'G') {
      lbrAmt = tag.net_wt * lbrRateVal;
    } else if (tag.lbr_type === 'P') {
      lbrAmt = tag.pcs * lbrRateVal;
    } else {
      lbrAmt = lbrRateVal;
    }

    const itAmtVal = tag.rate;
    const totAmtVal = itAmtVal + lbrAmt + accTotalAmt;

    const updatedDetail = {
      ...tag,
      lbr_rate: lbrRateVal,
      lbr_amt: parseFloat(lbrAmt.toFixed(2)),
      oth_amt: parseFloat(accTotalAmt.toFixed(2)),
      tot_amt: parseFloat(totAmtVal.toFixed(2))
    };

    setTagDetails(updatedDetail);
  };

  // Handle manual edits in Charges Grid cells
  const handleChargeCellChange = (index: number, field: keyof TagAccessory, value: any) => {
    const updated = [...tagAccessories];
    const item = { ...updated[index] };

    if (field === 'pcs') {
      item.pcs = parseInt(value, 10) || 0;
    } else if (['weight', 'con_percent', 'rate', 'it_amt', 'lbr_rate', 'lbr_amt'].includes(field)) {
      (item as any)[field] = parseFloat(value) || 0.0;
    } else {
      (item as any)[field] = value;
    }

    // Recalculate cell amounts
    const itAmt = item.pw === 'P' ? item.pcs * item.rate : item.weight * item.rate;
    item.it_amt = parseFloat(itAmt.toFixed(2));
    item.net_amt = parseFloat((itAmt + item.lbr_amt).toFixed(2));

    updated[index] = item;
    setTagAccessories(updated);

    if (selectedTag) {
      updateTagDetails(selectedTag, updated);
    }
  };

  const insertChargeRow = () => {
    const nextSr = tagAccessories.length + 1;
    const newRow: TagAccessory = {
      sr: nextSr,
      it_code: '',
      it_name: '',
      pcs: 1,
      weight: 0.000,
      con_percent: 0.0,
      pw: 'W',
      rate: 0.00,
      it_amt: 0.00,
      lbr_rate: 0.0,
      lbr_amt: 0.0,
      net_amt: 0.00
    };
    const updated = [...tagAccessories, newRow];
    setTagAccessories(updated);
    if (selectedTag) {
      updateTagDetails(selectedTag, updated);
    }
  };

  // Main sums for Table 1 footer
  const totalPcs = filteredTags.reduce((sum, t) => sum + t.pcs, 0);
  const totalGrWt = filteredTags.reduce((sum, t) => sum + t.gr_wt, 0);
  const totalNetWt = filteredTags.reduce((sum, t) => sum + t.net_wt, 0);

  // Table 3 totals
  const chargeTotalAmt = tagAccessories.reduce((sum, a) => sum + a.net_amt, 0);

  // Summary computations
  const summaryNetAmt = tagDetails ? tagDetails.tot_amt : 0.0;
  const summaryTax = summaryNetAmt * (taxRate / 100);
  const summaryTotal = summaryNetAmt + summaryTax;

  // React to Labour rate edits inside summary card
  useEffect(() => {
    if (selectedTag) {
      updateTagDetails(selectedTag, tagAccessories);
    }
  }, [lbrRateInput]);

  // Actions
  const handleExit = () => {
    if (activeTabId) {
      closeTab(activeTabId);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // CSV Excel Export
  const handleExcelExport = () => {
    if (filteredTags.length === 0) return;
    const headers = ['Tag No', 'Itm Name', 'Size', 'Pcs', 'GrWt', 'NetWt', 'Rate', 'LbrPrc', 'LRate', 'LbrAmt', 'OthAmt', 'Mrp'];
    const rows = filteredTags.map(t => [
      t.tag_no,
      t.it_name,
      t.size,
      t.pcs,
      t.gr_wt,
      t.net_wt,
      t.rate,
      t.lbr_prc,
      t.lbr_rate,
      t.lbr_amt,
      t.oth_amt,
      t.mrp
    ]);
    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `tag_stock_report_${dateFrom}_to_${dateTo}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const themeAccentColors = {
    orange: '30 100% 50%',   // #ff8c00
    gold: '35 45% 45%',       // #c5a059
    slate: '215 25% 27%',     // #334155
    classic: '217 91% 60%'    // #3b82f6
  };

  return (
    <div
      style={{
        ['--primary' as any]: themeAccentColors[themeAccent],
        ['--ring' as any]: themeAccentColors[themeAccent],
      }}
      className="flex flex-col h-full bg-[#eef1f6] text-slate-800 p-2 font-sans select-none no-print overflow-y-auto text-xs"
    >
      {/* HEADER FILTER SECTION */}
      <div className="bg-white border border-slate-300 rounded-[2px] p-2 shadow-sm shrink-0 flex flex-col gap-2 mb-1.5">
        
        {/* Banner Strip */}
        <div className="bg-orange-500 text-white py-1 px-4 text-center font-bold text-sm tracking-wider uppercase rounded-[1px] flex justify-between items-center shadow-inner" style={{ backgroundColor: `hsl(${themeAccentColors[themeAccent]})` }}>
          <span className="text-[10px] opacity-75">JEWEL ACC Reports</span>
          <span className="font-extrabold font-luxury tracking-widest text-[13px]">Tag Stock Report</span>
          <span className="text-[10px] opacity-75 font-data">Consolidated Tag Ledger</span>
        </div>

        {/* Filters bar */}
        <div className="grid grid-cols-12 gap-2 items-center">
          
          {/* Dates */}
          <div className="col-span-2.5 flex items-center gap-1">
            <input
              type="date"
              className="w-1/2 h-7 border border-slate-300 rounded-[2px] text-xs font-bold text-slate-700 px-1"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
            <span className="text-slate-400 font-bold">-</span>
            <input
              type="date"
              className="w-1/2 h-7 border border-slate-300 rounded-[2px] text-xs font-bold text-slate-700 px-1"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </div>

          {/* Tag Filter Search box */}
          <div className="col-span-3.5 flex items-center gap-1.5 pl-2">
            <span className="text-[10px] font-bold text-slate-500 uppercase whitespace-nowrap">Tag Filter</span>
            <div className="relative w-full">
              <input
                type="text"
                placeholder="Tag Search"
                className="w-full h-7 border border-slate-300 rounded-[2px] pl-6 pr-2 text-xs"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <Search className="absolute left-2 top-2 h-3 w-3 text-slate-400" />
            </div>
          </div>

          {/* Pr Code */}
          <div className="col-span-3 flex items-center gap-1.5">
            <span className="text-[10px] font-bold text-slate-500 uppercase whitespace-nowrap">Pr Code</span>
            <input
              type="text"
              placeholder="Code"
              className="w-16 h-7 border border-slate-300 rounded-[2px] text-center font-bold font-data text-slate-700 bg-white"
              value={prCode}
              onChange={(e) => {
                setPrCode(e.target.value);
                setPrCodeDesc(e.target.value ? `${e.target.value.toUpperCase()} DETAILS` : '');
              }}
            />
            <input
              type="text"
              className="flex-1 h-7 border border-slate-300 bg-slate-50 rounded-[2px] text-xs font-semibold px-2 text-slate-500"
              value={prCodeDesc}
              disabled
            />
          </div>

          {/* Item Type dropdown */}
          <div className="col-span-3 flex items-center gap-1.5 justify-end">
            <span className="text-[10px] font-bold text-slate-500 uppercase whitespace-nowrap">Item Type</span>
            <select
              className="w-full h-7 border border-slate-300 rounded-[2px] text-xs font-bold bg-white cursor-pointer px-1.5"
              value={itemType}
              onChange={(e) => setItemType(e.target.value)}
            >
              <option value="Gold">Gold</option>
              <option value="Silver">Silver</option>
              <option value="Diamond">Diamond</option>
              <option value="All">All Types</option>
            </select>
          </div>

        </div>

        {/* Buttons Row & Gr Code */}
        <div className="grid grid-cols-12 gap-2 items-center border-t border-slate-200 pt-1.5">
          
          {/* Status Buttons */}
          <div className="col-span-6 flex gap-1 items-center">
            <button
              onClick={() => setFilterType('IN')}
              className={`flex-1 h-7 text-xs font-bold border rounded-[2px] uppercase transition-all ${
                filterType === 'IN'
                  ? 'bg-slate-700 text-white border-transparent'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
              }`}
            >
              In Tag
            </button>
            <button
              onClick={() => setFilterType('OUT')}
              className={`flex-1 h-7 text-xs font-bold border rounded-[2px] uppercase transition-all ${
                filterType === 'OUT'
                  ? 'bg-slate-700 text-white border-transparent'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
              }`}
            >
              Out Tag
            </button>
            <button
              onClick={() => setFilterType('ALL')}
              className={`flex-1 h-7 text-xs font-bold border rounded-[2px] uppercase transition-all ${
                filterType === 'ALL'
                  ? 'bg-slate-700 text-white border-transparent'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
              }`}
            >
              Stock Tag
            </button>
          </div>

          {/* Gr Code */}
          <div className="col-span-6 flex items-center gap-1.5 justify-end pl-8">
            <span className="text-[10px] font-bold text-slate-500 uppercase whitespace-nowrap">Gr Code</span>
            <input
              type="text"
              placeholder="Group"
              className="w-20 h-7 border border-slate-300 rounded-[2px] text-center font-bold font-data text-slate-700 bg-white"
              value={grCode}
              onChange={(e) => {
                setGrCode(e.target.value);
                setGrCodeDesc(e.target.value ? `COUNTER GROUP ${e.target.value.toUpperCase()}` : '');
              }}
            />
            <input
              type="text"
              className="w-56 h-7 border border-slate-300 bg-slate-50 rounded-[2px] text-xs font-semibold px-2 text-slate-500"
              value={grCodeDesc}
              disabled
            />
          </div>

        </div>

      </div>

      {/* TABLE 1: MAIN STOCK GRID & IMAGE Split */}
      <div className="bg-white border border-slate-300 rounded-[2px] shadow-sm flex shrink-0 h-[280px] overflow-hidden mb-1.5">
        
        {/* Table 1 (Left Area) */}
        <div className="flex-1 overflow-auto">
          <table className="w-full border-collapse text-left text-xs table-fixed min-w-[750px]">
            <thead>
              <tr className="sticky top-0 z-20 bg-slate-200 border-b border-slate-300 text-[10px] font-bold text-slate-600 uppercase select-none">
                <th className="w-[85px] border-r border-slate-300 px-2 py-1">Tag No</th>
                <th className="border-r border-slate-300 px-2 py-1 text-left min-w-[120px]">Itm Name</th>
                <th className="w-[50px] border-r border-slate-300 px-1 py-1 text-center">Size</th>
                <th className="w-[40px] border-r border-slate-300 px-1 py-1 text-center">Pcs</th>
                <th className="w-[60px] border-r border-slate-300 px-1 py-1 text-right">Grwt</th>
                <th className="w-[60px] border-r border-slate-300 px-1 py-1 text-right">Net Wt</th>
                <th className="w-[75px] border-r border-slate-300 px-1 py-1 text-right">Rate</th>
                <th className="w-[55px] border-r border-slate-300 px-1 py-1 text-center">Lbr Prc</th>
                <th className="w-[50px] border-r border-slate-300 px-1 py-1 text-center">LRate</th>
                <th className="w-[80px] border-r border-slate-300 px-1 py-1 text-right">Lbr Amt</th>
                <th className="w-[65px] border-r border-slate-300 px-1 py-1 text-right">Oth Amt</th>
                <th className="w-[90px] text-right px-2 py-1">Mrp</th>
              </tr>
            </thead>
            <tbody className="font-semibold text-slate-800 font-data select-text">
              {filteredTags.map((row) => {
                const isSelected = selectedTag?.tag_no === row.tag_no;
                return (
                  <tr
                    key={row.tag_no}
                    onClick={() => selectActiveTag(row)}
                    onDoubleClick={() => alert(`Tag details opened for: ${row.tag_no}`)}
                    className={`border-b border-slate-200 transition-colors h-[25px] cursor-pointer ${
                      isSelected
                        ? 'bg-slate-100 border-l-[3px] border-l-orange-500 font-bold'
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    <td className="px-2 font-bold text-slate-700 border-r border-slate-200">{row.tag_no}</td>
                    <td className="px-2 font-sans text-slate-700 border-r border-slate-200">{row.it_name}</td>
                    <td className="text-center font-data border-r border-slate-200">{row.size || '-'}</td>
                    <td className="text-center font-data border-r border-slate-200">{row.pcs}</td>
                    <td className="text-right px-1 font-data border-r border-slate-200">{row.gr_wt.toFixed(2)}</td>
                    <td className="text-right px-1 font-data border-r border-slate-200">{row.net_wt.toFixed(2)}</td>
                    <td className="text-right px-1 font-data border-r border-slate-200">₹{Math.round(row.rate).toLocaleString()}</td>
                    <td className="text-center font-data border-r border-slate-200">{row.lbr_prc || 0}%</td>
                    <td className="text-center font-data border-r border-slate-200">{row.lbr_rate || 0}</td>
                    <td className="text-right px-1 font-data border-r border-slate-200">₹{Math.round(row.lbr_amt).toLocaleString()}</td>
                    <td className="text-right px-1 font-data border-r border-slate-200">₹{Math.round(row.oth_amt).toLocaleString()}</td>
                    <td className="text-right px-2 font-data">₹{Math.round(row.mrp).toLocaleString()}</td>
                  </tr>
                );
              })}
              {isLoading && (
                <tr>
                  <td colSpan={12} className="text-center py-4 font-bold text-slate-400">Loading Tag Ledger database records...</td>
                </tr>
              )}
              {!isLoading && filteredTags.length === 0 && (
                <tr>
                  <td colSpan={12} className="text-center py-4 font-bold text-slate-400">No tag opening or purchase entries matching criteria.</td>
                </tr>
              )}
            </tbody>
            {/* Totals footer aligned under Table 1 */}
            <tfoot>
              <tr className="bg-slate-200 border-t border-slate-300 font-bold text-slate-700 font-data h-[25px] select-none">
                <td colSpan={3} className="px-2 text-left uppercase text-[9.5px] font-extrabold text-slate-500">Tag Totals :</td>
                <td className="text-center border-r border-slate-300 font-bold">{totalPcs}</td>
                <td className="text-right border-r border-slate-300 px-1 font-bold">{totalGrWt.toFixed(2)}</td>
                <td className="text-right border-r border-slate-300 px-1 font-bold">{totalNetWt.toFixed(2)}</td>
                <td colSpan={6}></td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* IMAGE PREVIEW PANEL (Right Area) */}
        <div className="w-[260px] border-l border-slate-300 flex overflow-hidden shrink-0 select-none bg-slate-50 relative">
          
          {/* Image */}
          <div className="flex-1 flex items-center justify-center p-2 relative h-full">
            <img
              src="https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=240&auto=format&fit=crop&q=60"
              alt="Tag stock preview"
              className="h-full w-full object-cover border border-slate-200 rounded-[2px]"
            />
            <div className="absolute inset-0 bg-black/10 select-none pointer-events-none" />
          </div>

          {/* Action Columns layout buttons */}
          <div className="w-10 bg-slate-100 border-l border-slate-200 flex flex-col gap-1 items-center py-2 shrink-0">
            {['MI', 'SD', 'IC'].map((act) => (
              <button
                key={act}
                onClick={() => alert(`Trigger action ${act}`)}
                className="w-7 h-7 bg-white hover:bg-slate-200 text-[10px] font-bold text-slate-700 border border-slate-300 rounded-[2px] cursor-pointer flex items-center justify-center shadow-sm"
              >
                {act}
              </button>
            ))}
            <div className="h-px bg-slate-300 w-5 my-1" />
            {['C', 'S', 'D'].map((act) => (
              <button
                key={act}
                onClick={() => alert(`Tag catalog trigger: ${act}`)}
                className="w-7 h-7 bg-white hover:bg-slate-200 text-[10px] font-bold text-slate-700 border border-slate-300 rounded-[2px] cursor-pointer flex items-center justify-center shadow-sm"
              >
                {act}
              </button>
            ))}
          </div>

        </div>

      </div>

      {/* TABLE 2: SELECTED TAG DETAILS GRID */}
      <div className="bg-white border border-slate-300 rounded-[2px] shadow-sm flex flex-col shrink-0 h-[74px] overflow-hidden mb-1.5">
        <div className="bg-slate-100 px-2.5 py-0.5 border-b border-slate-200 text-[9px] font-bold text-slate-500 uppercase shrink-0 tracking-wide select-none">
          Active Stock Tag Fields Summary
        </div>
        <div className="flex-1 overflow-x-auto overflow-y-hidden">
          <table className="w-full border-collapse text-left text-xs table-fixed min-w-[980px]">
            <thead>
              <tr className="bg-slate-200/60 border-b border-slate-200 text-[9px] font-bold text-slate-500 uppercase select-none">
                <th className="w-[25px] text-center border-r border-slate-200">Sr</th>
                <th className="w-[80px] border-r border-slate-200 px-1">TagNo</th>
                <th className="w-[70px] border-r border-slate-200 px-1">ItCode</th>
                <th className="border-r border-slate-200 px-1.5 text-left min-w-[100px]">Design</th>
                <th className="w-[40px] border-r border-slate-200 px-1 text-center">Size</th>
                <th className="w-[30px] border-r border-slate-200 px-1 text-center">Pcs</th>
                <th className="w-[50px] border-r border-slate-200 px-1 text-right">GrWt</th>
                <th className="w-[45px] border-r border-slate-200 px-1 text-right">LsWt</th>
                <th className="w-[50px] border-r border-slate-200 px-1 text-right">NetWt</th>
                <th className="w-[60px] border-r border-slate-200 px-1 text-right">ItRate</th>
                <th className="w-[70px] border-r border-slate-200 px-1 text-right">ItAmt</th>
                <th className="w-[40px] border-r border-slate-200 px-1 text-center">LType</th>
                <th className="w-[60px] border-r border-slate-200 px-1 text-right">LbrRate</th>
                <th className="w-[70px] border-r border-slate-200 px-1 text-right">LbrAmt</th>
                <th className="w-[50px] border-r border-slate-200 px-1 text-right">OthAmt</th>
                <th className="w-[80px] border-r border-slate-200 px-1 text-right">TotAmt</th>
                <th className="w-[40px] border-r border-slate-200 px-1 text-center">Tax%</th>
                <th className="w-[80px] text-right px-2">NetAmt</th>
              </tr>
            </thead>
            <tbody className="font-semibold text-slate-700 font-data select-text">
              {tagDetails ? (
                <tr className="bg-slate-50 border-b border-slate-200 h-[24px]">
                  <td className="text-center text-slate-400 border-r border-slate-200 text-[10px]">1</td>
                  <td className="px-1 border-r border-slate-200 text-slate-700 font-bold">{tagDetails.tag_no}</td>
                  <td className="px-1 border-r border-slate-200 uppercase">{tagDetails.it_code}</td>
                  <td className="px-1.5 border-r border-slate-200 font-sans">{tagDetails.it_name}</td>
                  <td className="text-center border-r border-slate-200">{tagDetails.size || '-'}</td>
                  <td className="text-center border-r border-slate-200">{tagDetails.pcs}</td>
                  <td className="text-right px-1 border-r border-slate-200">{tagDetails.gr_wt.toFixed(3)}</td>
                  <td className="text-right px-1 border-r border-slate-200">{tagDetails.ls_wt.toFixed(3)}</td>
                  <td className="text-right px-1 border-r border-slate-200 font-bold">{tagDetails.net_wt.toFixed(3)}</td>
                  <td className="text-right px-1 border-r border-slate-200">₹{tagDetails.rate.toFixed(2)}</td>
                  <td className="text-right px-1 border-r border-slate-200">₹{tagDetails.rate.toFixed(2)}</td>
                  <td className="text-center border-r border-slate-200 text-[10px]">{tagDetails.lbr_type}</td>
                  <td className="text-right px-1 border-r border-slate-200">₹{tagDetails.lbr_rate.toFixed(2)}</td>
                  <td className="text-right px-1 border-r border-slate-200">₹{tagDetails.lbr_amt.toFixed(2)}</td>
                  <td className="text-right px-1 border-r border-slate-200 text-slate-500">₹{tagDetails.oth_amt.toFixed(2)}</td>
                  <td className="text-right px-1 border-r border-slate-200 text-amber-700 font-bold">₹{tagDetails.tot_amt.toFixed(2)}</td>
                  <td className="text-center border-r border-slate-200 font-data">3.00%</td>
                  <td className="text-right px-2 font-extrabold text-orange-600">₹{tagDetails.tot_amt.toFixed(2)}</td>
                </tr>
              ) : (
                <tr>
                  <td colSpan={18} className="text-center py-2 text-slate-400 font-semibold">Select a tag from the main grid to view details.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* TABLE 3: CHARGES / EXTRA ITEMS GRID & SUMMARY Split */}
      <div className="flex shrink-0 h-[160px] gap-2 overflow-hidden mb-1.5">
        
        {/* Table 3 (Charges / Extra Items Grid) */}
        <div className="flex-1 bg-white border border-slate-300 rounded-[2px] shadow-sm flex flex-col overflow-hidden">
          <div className="bg-slate-100 px-2.5 py-0.5 border-b border-slate-200 flex justify-between items-center text-[10px] font-bold text-slate-500 uppercase shrink-0 tracking-wide select-none">
            <span>Hallmark & Rodiam Extra Charges List</span>
            <button
              onClick={insertChargeRow}
              className="px-2 py-0.5 bg-slate-700 hover:bg-slate-800 text-white text-[8px] font-bold uppercase tracking-wider rounded-[1px] cursor-pointer transition-colors"
            >
              + Add Charge
            </button>
          </div>
          <div className="flex-1 overflow-auto">
            <table className="border-collapse text-left text-xs table-fixed min-w-[620px] w-full">
              <thead>
                <tr className="bg-slate-200 border-b border-slate-300 text-[9px] font-bold text-slate-500 uppercase select-none">
                  <th className="w-[30px] text-center border-r border-slate-300 py-1">Sr</th>
                  <th className="w-[50px] border-r border-slate-300 px-1">ItCode</th>
                  <th className="border-r border-slate-300 px-1.5 text-left min-w-[90px]">ItName</th>
                  <th className="w-[35px] border-r border-slate-300 px-1 text-center">Pcs</th>
                  <th className="w-[55px] border-r border-slate-300 px-1 text-right">Weight</th>
                  <th className="w-[45px] border-r border-slate-300 px-1 text-center">Con%</th>
                  <th className="w-[40px] border-r border-slate-300 px-1 text-center">P/W</th>
                  <th className="w-[60px] border-r border-slate-300 px-1 text-right">Rate</th>
                  <th className="w-[70px] border-r border-slate-300 px-1 text-right">ItAmt</th>
                  <th className="w-[55px] border-r border-slate-300 px-1 text-right">LbrRate</th>
                  <th className="w-[65px] border-r border-slate-300 px-1 text-right">LbrAmt</th>
                  <th className="w-[85px] text-right px-2">NetAmt</th>
                </tr>
              </thead>
              <tbody className="font-semibold text-slate-700 font-data">
                {tagAccessories.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 border-b border-slate-200 h-[24px]">
                    <td className="text-center text-slate-400 bg-slate-50/50 border-r border-slate-200 text-[10px]">{row.sr}</td>
                    
                    {/* ItCode */}
                    <td className="p-0 border-r border-slate-200">
                      <input
                        type="text"
                        placeholder="Code"
                        className="w-full h-[23px] !border-none !rounded-none !shadow-none !px-1 text-[11px] font-bold text-slate-700 bg-transparent focus:bg-white focus:outline-none uppercase"
                        value={row.it_code}
                        onChange={(e) => handleChargeCellChange(idx, 'it_code', e.target.value)}
                      />
                    </td>

                    {/* ItName */}
                    <td className="p-0 border-r border-slate-200">
                      <input
                        type="text"
                        placeholder="Description"
                        className="w-full h-[23px] !border-none !rounded-none !shadow-none !px-1.5 text-[11px] text-slate-700 bg-transparent focus:bg-white focus:outline-none"
                        value={row.it_name}
                        onChange={(e) => handleChargeCellChange(idx, 'it_name', e.target.value)}
                      />
                    </td>

                    {/* Pcs */}
                    <td className="p-0 border-r border-slate-200 text-center">
                      <input
                        type="number"
                        className="w-full h-[23px] !border-none !rounded-none !shadow-none !px-1 text-center font-data text-slate-700 bg-transparent focus:bg-white focus:outline-none"
                        value={row.pcs || ''}
                        onChange={(e) => handleChargeCellChange(idx, 'pcs', e.target.value)}
                      />
                    </td>

                    {/* Weight */}
                    <td className="p-0 border-r border-slate-200 text-right">
                      <input
                        type="number"
                        step="0.001"
                        placeholder="0.000"
                        className="w-full h-[23px] !border-none !rounded-none !shadow-none !px-1 text-right font-data text-slate-700 bg-transparent focus:bg-white focus:outline-none"
                        value={row.weight || ''}
                        onChange={(e) => handleChargeCellChange(idx, 'weight', e.target.value)}
                      />
                    </td>

                    {/* Con% */}
                    <td className="p-0 border-r border-slate-200 text-center">
                      <input
                        type="number"
                        className="w-full h-[23px] !border-none !rounded-none !shadow-none !px-1 text-center font-data text-slate-700 bg-transparent focus:bg-white focus:outline-none"
                        value={row.con_percent || ''}
                        onChange={(e) => handleChargeCellChange(idx, 'con_percent', e.target.value)}
                      />
                    </td>

                    {/* P/W */}
                    <td className="p-0 border-r border-slate-200 text-center">
                      <select
                        className="w-full h-[23px] !border-none !rounded-none !shadow-none !p-0 text-center font-bold text-slate-700 bg-transparent focus:bg-white focus:outline-none cursor-pointer"
                        value={row.pw}
                        onChange={(e) => handleChargeCellChange(idx, 'pw', e.target.value)}
                      >
                        <option value="W">W</option>
                        <option value="P">P</option>
                      </select>
                    </td>

                    {/* Rate */}
                    <td className="p-0 border-r border-slate-200 text-right">
                      <input
                        type="number"
                        className="w-full h-[23px] !border-none !rounded-none !shadow-none !px-1 text-right font-data text-slate-700 bg-transparent focus:bg-white focus:outline-none"
                        value={row.rate || ''}
                        onChange={(e) => handleChargeCellChange(idx, 'rate', e.target.value)}
                      />
                    </td>

                    {/* ItAmt (ReadOnly) */}
                    <td className="px-1 text-right border-r border-slate-200 font-data text-slate-500 bg-slate-50/20 text-[10.5px]">
                      {row.it_amt > 0 ? row.it_amt.toFixed(2) : '-'}
                    </td>

                    {/* LbrRate */}
                    <td className="p-0 border-r border-slate-200 text-right">
                      <input
                        type="number"
                        className="w-full h-[23px] !border-none !rounded-none !shadow-none !px-1 text-right font-data text-slate-700 bg-transparent focus:bg-white focus:outline-none"
                        value={row.lbr_rate || ''}
                        onChange={(e) => handleChargeCellChange(idx, 'lbr_rate', e.target.value)}
                      />
                    </td>

                    {/* LbrAmt */}
                    <td className="p-0 border-r border-slate-200 text-right">
                      <input
                        type="number"
                        className="w-full h-[23px] !border-none !rounded-none !shadow-none !px-1 text-right font-data text-slate-700 bg-transparent focus:bg-white focus:outline-none"
                        value={row.lbr_amt || ''}
                        onChange={(e) => handleChargeCellChange(idx, 'lbr_amt', e.target.value)}
                      />
                    </td>

                    {/* NetAmt */}
                    <td className="px-2 text-right font-data text-slate-800 font-bold bg-slate-100/30 text-[10.5px]">
                      {row.net_amt > 0 ? row.net_amt.toFixed(2) : '-'}
                    </td>

                  </tr>
                ))}
              </tbody>
              {/* Table 3 totals footer */}
              <tfoot>
                <tr className="bg-slate-200 border-t border-slate-300 text-[9px] font-bold text-slate-600 font-data h-[24px]">
                  <td colSpan={11} className="px-2 uppercase font-bold text-slate-500 text-left">Charges Total:</td>
                  <td className="text-right text-slate-700 font-bold px-2">₹{chargeTotalAmt.toFixed(2)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* SUMMARY PANEL (BOTTOM RIGHT) */}
        <div className="w-[360px] bg-white border border-slate-300 rounded-[2px] p-2.5 shadow-sm shrink-0 flex flex-col justify-between overflow-hidden">
          <div className="grid grid-cols-12 gap-2 text-[10.5px] font-bold text-slate-700 items-center">
            
            {/* TagNo */}
            <span className="col-span-3 text-slate-400">TagNo</span>
            <input
              type="text"
              className="col-span-3 h-5.5 text-center font-bold bg-slate-50 border border-slate-300 rounded-[2px]"
              value={tagDetails ? tagDetails.tag_no : ''}
              disabled
            />

            {/* Net Amt */}
            <span className="col-span-3 text-slate-400 text-right pr-2">Net Amt</span>
            <span className="col-span-3 text-right font-data font-bold text-slate-800">₹{summaryNetAmt.toFixed(2)}</span>

            {/* Lbr Rate input */}
            <span className="col-span-3 text-slate-400">Lbr Rate</span>
            <input
              type="number"
              className="col-span-3 h-5.5 text-center font-data border border-slate-300 rounded-[2px]"
              value={lbrRateInput}
              onChange={(e) => setLbrRateInput(e.target.value)}
            />

            {/* Tax */}
            <span className="col-span-3 text-slate-400 text-right pr-2">Tax (3%)</span>
            <span className="col-span-3 text-right font-data text-slate-600">₹{summaryTax.toFixed(2)}</span>

            {/* Lbr % */}
            <span className="col-span-3 text-slate-400">Lbr %</span>
            <input
              type="text"
              className="col-span-3 h-5.5 text-center font-data border border-slate-300 rounded-[2px]"
              value={lbrPercentInput}
              onChange={(e) => setLbrPercentInput(e.target.value)}
            />

            {/* Total (Highlighted gold/orange) */}
            <span className="col-span-3 text-amber-800 uppercase text-[10px] text-right pr-2 font-extrabold font-luxury">Total</span>
            <span className="col-span-3 text-right font-data font-extrabold text-[12px] text-amber-700 bg-amber-50 rounded-[1px] px-1 py-0.5 border border-amber-200">
              ₹{summaryTotal.toFixed(2)}
            </span>

          </div>
        </div>

      </div>

      {/* BOTTOM ACTION TOOLBAR */}
      <div className="bg-slate-100 border border-slate-300 rounded-[2px] px-4 py-1.5 flex items-center justify-between shrink-0 select-none shadow-sm">
        
        {/* Indicators */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-extrabold tracking-wider text-slate-500 uppercase bg-white px-2 py-1.5 border border-slate-200 rounded-[2px] font-data">
            Tag Stock Ledger Registry
          </span>
        </div>

        {/* Buttons */}
        <div className="flex gap-1.5 font-semibold">
          
          {/* Summary */}
          <button
            onClick={() => alert(`Tag stock ledger entries: ${filteredTags.length} records. Pcs: ${totalPcs}, GrWt: ${totalGrWt.toFixed(2)}g, NetWt: ${totalNetWt.toFixed(2)}g.`)}
            className="flex items-center gap-1 px-3 h-8 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-[2px] uppercase shadow-sm transition-all text-[11px] cursor-pointer"
          >
            <FileText className="h-3.5 w-3.5 text-slate-400" />
            <span>Summary</span>
          </button>

          {/* Print */}
          <button
            onClick={handlePrint}
            className="flex items-center gap-1 px-3.5 h-8 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-[2px] uppercase shadow-sm transition-all text-[11px] cursor-pointer"
          >
            <Printer className="h-3.5 w-3.5 text-slate-400" />
            <span>Print</span>
          </button>

          {/* Excel */}
          <button
            onClick={handleExcelExport}
            className="flex items-center gap-1.5 px-4 h-8 bg-slate-700 text-white font-bold uppercase rounded-[2px] shadow-sm transition-all text-[11px] cursor-pointer hover:bg-slate-800"
            style={{ backgroundColor: `hsl(${themeAccentColors[themeAccent]})` }}
          >
            <FileSpreadsheet className="h-3.5 w-3.5" />
            <span>Excel</span>
          </button>

          {/* Cancel */}
          <button
            onClick={loadReportData}
            className="flex items-center gap-1 px-3.5 h-8 bg-white hover:bg-slate-50 text-slate-600 border border-slate-300 rounded-[2px] uppercase shadow-sm transition-all text-[11px] cursor-pointer"
          >
            <Undo2 className="h-3.5 w-3.5 text-slate-400" />
            <span>Cancel</span>
          </button>

          {/* Delete */}
          <button
            onClick={() => alert('Only ledger administrators can delete registered tags.')}
            className="flex items-center gap-1 px-3.5 h-8 bg-red-600 hover:bg-red-700 text-white rounded-[2px] uppercase shadow-sm transition-all text-[11px] cursor-pointer"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Delete</span>
          </button>

          {/* Exit */}
          <button
            onClick={handleExit}
            className="flex items-center gap-1 px-3.5 h-8 bg-slate-200 hover:bg-slate-300 text-slate-700 border border-slate-300 rounded-[2px] uppercase shadow-sm transition-all text-[11px] cursor-pointer"
          >
            <LogOut className="h-3.5 w-3.5 text-slate-500" />
            <span>Exit</span>
          </button>

        </div>
      </div>

      {/* STATUS FOOTER BAR */}
      <footer className="bg-slate-800 text-slate-300 px-4 py-1.5 flex items-center justify-between text-[10.5px] font-semibold shrink-0 select-none mt-1 rounded-[2px] shadow-inner select-none">
        
        {/* Live Rates */}
        <div className="flex items-center gap-3">
          
          {/* Accent changer */}
          <div className="flex items-center gap-1 border-r border-slate-700 pr-3.5">
            <span className="text-[9px] text-slate-500 uppercase">Theme</span>
            <select
              value={themeAccent}
              onChange={(e) => setThemeAccent(e.target.value as ThemeAccent)}
              className="h-5 py-0 px-1 border border-slate-700 rounded-[1px] bg-slate-900 text-slate-300 font-bold cursor-pointer text-[10px]"
            >
              <option value="orange">Orange (Default)</option>
              <option value="gold">Gold (Luxe)</option>
              <option value="slate">Slate Classic</option>
              <option value="classic">Tally Blue</option>
            </select>
          </div>

          <label className="flex items-center gap-1 text-[10px] text-slate-400 select-none cursor-pointer">
            <input type="checkbox" defaultChecked className="h-3 w-3 accent-amber-500 cursor-pointer" />
            <span>Live Rate</span>
          </label>

          <span className="opacity-40">|</span>

          <span>Fine Gold: <strong className="text-amber-400 font-data">₹{defaultGoldRate.toLocaleString()}</strong></span>
          
          <span className="opacity-40">|</span>
          
          <span>Fine Silver: <strong className="text-slate-100 font-data">₹{defaultSilverRate.toLocaleString()}</strong></span>
        </div>

        {/* System parameters */}
        <div className="flex items-center gap-3">
          <span>Rate Date: <span className="font-data text-amber-200/95">{currentRates?.rate_date || '01-06-2022 07:56'}</span></span>
          <span className="opacity-40">|</span>
          <span>Service End: <span className="font-data text-emerald-400">01/01/2030</span></span>
          <span className="opacity-40">|</span>
          <label className="flex items-center gap-1 select-none text-[10px] text-slate-400 cursor-pointer">
            <input type="checkbox" defaultChecked className="h-3 w-3 accent-emerald-500 cursor-pointer" />
            <span>Whatsapp Open</span>
          </label>
        </div>

      </footer>

    </div>
  );
}
