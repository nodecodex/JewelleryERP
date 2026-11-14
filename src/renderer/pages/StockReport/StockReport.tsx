import React, { useEffect, useState } from 'react';
import { useCompanyStore } from '../../store/useCompanyStore';
import { useTabStore } from '../../store/useTabStore';
import { 
  FileSpreadsheet, 
  Printer, 
  FileText, 
  Undo2, 
  LogOut, 
  Search, 
  Calendar,
  Layers,
  ChevronDown
} from 'lucide-react';
import { useHardwareScanner } from '../../hooks/useHardwareScanner';
import { useDialog } from '../../components/ui/DialogProvider';

type ItemTypeFilter = 'Gold' | 'Silver' | 'Diamond' | 'All';
type StockTypeFilter = 'All' | 'Opening' | 'Inward' | 'Sales' | 'Purchase';
type ActiveTabType = 'Group' | 'Product' | 'Item' | 'Design' | 'Safe' | 'Counter' | 'Trading';

interface RawStockRecord {
  it_name: string;
  op_pcs: number;
  op_wt: number;
  pr_pcs: number;
  pr_wt: number;
  in_pcs: number;
  in_wt: number;
  ou_pcs: number;
  ou_wt: number;
  si_pcs: number;
  si_wt: number;
}

interface StockGridRow {
  srNo: number;
  itemName: string;
  opPcs: number;
  opWt: number;
  prPcs: number;
  prWt: number;
  inPcs: number;
  inWt: number;
  ouPcs: number;
  ouWt: number;
  siPcs: number;
  siWt: number;
  ciPcs: number;
  ciWt: number;
}

export default function StockReportView() {
  const selectedCompany = useCompanyStore((state) => state.selectedCompany);
  const { closeTab, activeTabId } = useTabStore();
  const { showToast } = useDialog();

  // Filters State
  const [grossWiseWeight, setGrossWiseWeight] = useState(false);
  const [dateFrom, setDateFrom] = useState('2022-04-01');
  const [dateTo, setDateTo] = useState('2022-12-20');
  const [itemType, setItemType] = useState<ItemTypeFilter>('All');
  const [stockType, setStockType] = useState<StockTypeFilter>('All');
  const [grCode, setGrCode] = useState('');
  const [prCode, setPrCode] = useState('');
  const [safeName, setSafeName] = useState('All');
  const [tableName, setTableName] = useState('All');
  const [tagNo, setTagNo] = useState('');
  const [searchItem, setSearchItem] = useState('');

  // Tabs navigation state
  const [activeTab, setActiveTab] = useState<ActiveTabType>('Item');

  // Raw and Filtered Records
  const [rawRecords, setRawRecords] = useState<RawStockRecord[]>([]);
  const [gridRows, setGridRows] = useState<StockGridRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [highlightedRowIndex, setHighlightedRowIndex] = useState<number | null>(null);
  const [scannedItemDetails, setScannedItemDetails] = useState<any | null>(null);

  useHardwareScanner(async (data) => {
    if (!selectedCompany) return;
    try {
      const res = await (window as any).api.searchScannedValue(selectedCompany.id, data.value);
      if (res) {
        setScannedItemDetails(res);
        const matchIdx = gridRows.findIndex(
          (r) => r.itemName.toLowerCase().includes(res.name.toLowerCase()) || 
                 res.name.toLowerCase().includes(r.itemName.toLowerCase()) ||
                 (res.details.it_code && r.itemName.toLowerCase().includes(res.details.it_code.toLowerCase()))
        );
        if (matchIdx !== -1) {
          setHighlightedRowIndex(gridRows[matchIdx].srNo);
          setTimeout(() => {
            const el = document.getElementById(`stock-row-${gridRows[matchIdx].srNo}`);
            if (el) {
              el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
          }, 100);
        } else {
          setHighlightedRowIndex(null);
        }
      } else {
        showToast(`Barcode/QR "${data.value}" did not match any tag or inventory item.`, 'warning');
        setScannedItemDetails(null);
        setHighlightedRowIndex(null);
      }
    } catch (e) {
      console.error(e);
    }
  }, 'Stock Report');

  // Load stock report data when company or dates change
  const loadStockData = async () => {
    if (!selectedCompany) return;
    setIsLoading(true);
    try {
      const data = await (window as any).api.getStockReport(selectedCompany.id, dateFrom, dateTo);
      setRawRecords(data);
      setIsLoading(false);
    } catch (e) {
      console.error('Failed to fetch stock report data:', e);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadStockData();
  }, [selectedCompany, dateFrom, dateTo]);

  // Aggregate and Filter data dynamically on front-end
  useEffect(() => {
    let records = [...rawRecords];

    // Filter by Item Type (metal category)
    if (itemType !== 'All') {
      const metal = itemType.toLowerCase();
      records = records.filter(r => {
        const name = r.it_name.toLowerCase();
        if (metal === 'gold') return name.includes('gold') || name.includes('18c') || name.includes('916') || name.includes('kdm');
        if (metal === 'silver') return name.includes('silver') || name.includes('fsl') || name.includes('sl');
        if (metal === 'diamond') return name.includes('diamond') || name.includes('dm');
        return true;
      });
    }

    // Filter by Group Code
    if (grCode.trim()) {
      const q = grCode.toLowerCase();
      records = records.filter(r => r.it_name.toLowerCase().includes(q));
    }

    // Filter by Product Code (Pr Code)
    if (prCode.trim()) {
      const q = prCode.toLowerCase();
      records = records.filter(r => r.it_name.toLowerCase().includes(q));
    }

    // Filter by Search Query
    if (searchItem.trim()) {
      const q = searchItem.toLowerCase();
      records = records.filter(r => r.it_name.toLowerCase().includes(q));
    }

    // Dynamically Aggregate depending on the selected ActiveTab Type
    let aggregated: { [key: string]: RawStockRecord } = {};

    records.forEach(r => {
      let key = r.it_name; // Default: group by Item Name

      if (activeTab === 'Group') {
        // Extract Group: e.g., "CHAIN 18C" -> "18C", "BUTTI 916" -> "916", "FINE GOLD" -> "FINE GOLD"
        const matches = r.it_name.match(/(18C|916|KDM|FINE|SL|FSL)/i);
        key = matches ? matches[0].toUpperCase() : 'OTHER GOLD';
        if (r.it_name.toLowerCase().includes('silver')) {
          key = key.includes('SL') ? key : 'SILVER GROUP';
        }
      } else if (activeTab === 'Product') {
        // Group by product category/prefix: "CHAIN 18C" -> "CHAIN", "BANGLES 916" -> "BANGLES"
        const words = r.it_name.split(' ');
        key = words.length > 0 ? words[0] : 'OTHER';
      } else if (activeTab === 'Design') {
        key = r.it_name;
      } else if (activeTab === 'Safe') {
        // Mock safe logic: map certain codes to safes
        key = r.it_name.toLowerCase().includes('silver') ? 'SILVER SAFE' : 'GOLD SAFE A';
      } else if (activeTab === 'Counter') {
        // Mock counter location
        key = r.it_name.toLowerCase().includes('diamond') ? 'COUNTER 3 (DIAMONDS)' : 'COUNTER 1 (ORNAMENTS)';
      } else if (activeTab === 'Trading') {
        // Group into major trading classification
        key = r.it_name.toLowerCase().includes('silver') ? 'SILVER METAL TRADING' : 
              r.it_name.toLowerCase().includes('diamond') ? 'DIAMOND STOCK' : 'GOLD JEWELRY TRADING';
      }

      if (!aggregated[key]) {
        aggregated[key] = {
          it_name: key,
          op_pcs: 0, op_wt: 0,
          pr_pcs: 0, pr_wt: 0,
          in_pcs: 0, in_wt: 0,
          ou_pcs: 0, ou_wt: 0,
          si_pcs: 0, si_wt: 0
        };
      }

      aggregated[key].op_pcs += r.op_pcs;
      aggregated[key].op_wt += r.op_wt;
      aggregated[key].pr_pcs += r.pr_pcs;
      aggregated[key].pr_wt += r.pr_wt;
      aggregated[key].in_pcs += r.in_pcs;
      aggregated[key].in_wt += r.in_wt;
      aggregated[key].ou_pcs += r.ou_pcs;
      aggregated[key].ou_wt += r.ou_wt;
      aggregated[key].si_pcs += r.si_pcs;
      aggregated[key].si_wt += r.si_wt;
    });

    // Map aggregated keys to grid rows with closing balances calculations
    const rows: StockGridRow[] = Object.keys(aggregated).map((key, index) => {
      const row = aggregated[key];
      
      // Closing stock math calculations
      const ciPcs = row.op_pcs + row.pr_pcs + row.in_pcs - row.ou_pcs - row.si_pcs;
      const ciWt = row.op_wt + row.pr_wt + row.in_wt - row.ou_wt - row.si_wt;

      return {
        srNo: index + 1,
        itemName: row.it_name,
        opPcs: row.op_pcs || 0,
        opWt: parseFloat(row.op_wt.toFixed(3)) || 0,
        prPcs: row.pr_pcs || 0,
        prWt: parseFloat(row.pr_wt.toFixed(3)) || 0,
        inPcs: row.in_pcs || 0,
        inWt: parseFloat(row.in_wt.toFixed(3)) || 0,
        ouPcs: row.ou_pcs || 0,
        ouWt: parseFloat(row.ou_wt.toFixed(3)) || 0,
        siPcs: row.si_pcs || 0,
        siWt: parseFloat(row.si_wt.toFixed(3)) || 0,
        ciPcs: ciPcs || 0,
        ciWt: parseFloat(ciWt.toFixed(3)) || 0
      };
    });

    setGridRows(rows);
  }, [rawRecords, itemType, stockType, grCode, prCode, searchItem, activeTab]);

  // Summary statistics for footer
  const totalOpPcs = gridRows.reduce((sum, r) => sum + r.opPcs, 0);
  const totalOpWt = gridRows.reduce((sum, r) => sum + r.opWt, 0);
  const totalPrPcs = gridRows.reduce((sum, r) => sum + r.prPcs, 0);
  const totalPrWt = gridRows.reduce((sum, r) => sum + r.prWt, 0);
  const totalInPcs = gridRows.reduce((sum, r) => sum + r.inPcs, 0);
  const totalInWt = gridRows.reduce((sum, r) => sum + r.inWt, 0);
  const totalOuPcs = gridRows.reduce((sum, r) => sum + r.ouPcs, 0);
  const totalOuWt = gridRows.reduce((sum, r) => sum + r.ouWt, 0);
  const totalSIPcs = gridRows.reduce((sum, r) => sum + r.siPcs, 0);
  const totalSIWt = gridRows.reduce((sum, r) => sum + r.siWt, 0);
  const totalCIPcs = gridRows.reduce((sum, r) => sum + r.ciPcs, 0);
  const totalCIWt = gridRows.reduce((sum, r) => sum + r.ciWt, 0);

  // Actions
  const handlePrint = () => {
    window.print();
  };

  const handleExportPDF = async () => {
    const res = await (window as any).api.saveToPDF(`StockReport_${dateFrom}_to_${dateTo}.pdf`);
    showToast(res.message, res.success ? 'success' : 'error');
  };

  const handleExcelExport = () => {
    if (gridRows.length === 0) return;
    const headers = [
      'SrNo', 'Item Name', 'Opening Pcs', 'Opening Wt', 'Purchase Pcs', 'Purchase Wt', 
      'Inward Pcs', 'Inward Wt', 'Outward Pcs', 'Outward Wt', 'Sales Pcs', 'Sales Wt', 
      'Closing Pcs', 'Closing Wt'
    ];
    const rows = gridRows.map(r => [
      r.srNo, r.itemName, r.opPcs, r.opWt, r.prPcs, r.prWt,
      r.inPcs, r.inWt, r.ouPcs, r.ouWt, r.siPcs, r.siWt,
      r.ciPcs, r.ciWt
    ]);
    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `stock_report_${activeTab}_${dateFrom}_to_${dateTo}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCancel = () => {
    setGrossWiseWeight(false);
    setDateFrom('2022-04-01');
    setDateTo('2022-12-20');
    setItemType('All');
    setStockType('All');
    setGrCode('');
    setPrCode('');
    setSafeName('All');
    setTableName('All');
    setTagNo('');
    setSearchItem('');
    setActiveTab('Item');
  };

  const handleExit = () => {
    if (activeTabId) {
      closeTab(activeTabId);
    }
  };

  return (
    <div className="flex flex-col h-full bg-black text-white p-3 font-sans select-none no-print overflow-y-auto text-xs">
      
      {/* HEADER SECTION WITH FILTERS */}
      <div className="bg-[#181818] text-white border border-[#262626] rounded-none p-3 shrink-0 flex flex-col gap-2 mb-2 no-print">
        
        {/* Banner Strip */}
        <div className="bg-[#121212] border border-[#262626] py-1.5 px-3 rounded-none flex justify-between items-center text-xs mb-1">
          <label className="flex items-center gap-1.5 text-[10.5px] select-none cursor-pointer">
            <input 
              type="checkbox" 
              className="h-3.5 w-3.5 accent-[#FFC000] cursor-pointer"
              checked={grossWiseWeight}
              onChange={(e) => setGrossWiseWeight(e.target.checked)}
            />
            <span className="font-bold text-white uppercase tracking-wider">Gross Wise Weight</span>
          </label>
          <span className="font-extrabold tracking-widest text-xs uppercase text-[#FFC000]">INVENTORY STOCK VALUATION & MOVEMENT</span>
          <span className="text-[10px] font-mono text-[#7D7D7D] uppercase">Tag Valuation Ledger</span>
        </div>

        {/* Filters Grid Row 1 */}
        <div className="grid grid-cols-12 gap-2 items-center">
          {/* Dates */}
          <div className="col-span-3 flex items-center gap-1">
            <span className="text-[9.5px] font-bold text-[#7D7D7D] uppercase w-10 shrink-0">Date</span>
            <input
              type="date"
              className="w-1/2 h-7 border border-[#2c2c2c] rounded-none text-xs font-bold text-white px-1 bg-black focus:border-[#FFC000] focus:outline-none"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
            <span className="text-[#7D7D7D] font-bold">-</span>
            <input
              type="date"
              className="w-1/2 h-7 border border-[#2c2c2c] rounded-none text-xs font-bold text-white px-1 bg-black focus:border-[#FFC000] focus:outline-none"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </div>

          {/* Item Type Dropdown */}
          <div className="col-span-3 flex items-center gap-1">
            <span className="text-[9.5px] font-bold text-[#7D7D7D] uppercase w-16 shrink-0">Item Type</span>
            <select
              className="w-full h-7 border border-[#2c2c2c] rounded-none text-xs font-bold bg-black text-white cursor-pointer px-1 focus:border-[#FFC000] focus:outline-none uppercase"
              value={itemType}
              onChange={(e) => setItemType(e.target.value as ItemTypeFilter)}
            >
              <option value="All" className="bg-[#181818]">All Metals</option>
              <option value="Gold" className="bg-[#181818]">Gold</option>
              <option value="Silver" className="bg-[#181818]">Silver</option>
              <option value="Diamond" className="bg-[#181818]">Diamond</option>
            </select>
          </div>

          {/* Gr Code Input */}
          <div className="col-span-2.5 flex items-center gap-1.5">
            <span className="text-[9.5px] font-bold text-[#7D7D7D] uppercase w-12 shrink-0">Gr Code</span>
            <input
              type="text"
              placeholder="e.g. 916"
              className="w-full h-7 border border-[#2c2c2c] rounded-none font-bold text-white bg-black focus:border-[#FFC000] focus:outline-none px-2 uppercase"
              value={grCode}
              onChange={(e) => setGrCode(e.target.value)}
            />
          </div>

          {/* Safe Name Dropdown */}
          <div className="col-span-3.5 flex items-center gap-1.5">
            <span className="text-[9.5px] font-bold text-[#7D7D7D] uppercase w-16 shrink-0">Safe Name</span>
            <select
              className="w-full h-7 border border-[#2c2c2c] rounded-none text-xs font-bold bg-black text-white cursor-pointer px-1 focus:border-[#FFC000] focus:outline-none uppercase"
              value={safeName}
              onChange={(e) => setSafeName(e.target.value)}
            >
              <option value="All" className="bg-[#181818]">ALL SAFES</option>
              <option value="Vault 1" className="bg-[#181818]">MAIN VAULT</option>
              <option value="Showroom" className="bg-[#181818]">SHOWROOM COUNTER</option>
            </select>
          </div>
        </div>

        {/* Filters Grid Row 2 */}
        <div className="grid grid-cols-12 gap-2 items-center border-t border-[#262626] pt-2">
          
          {/* Search Item field */}
          <div className="col-span-3.5 flex items-center gap-1">
            <span className="text-[9.5px] font-bold text-[#7D7D7D] uppercase w-10 shrink-0">Item</span>
            <div className="relative w-full">
              <input
                type="text"
                placeholder="Advance Search"
                className="w-full h-7 border border-[#2c2c2c] rounded-none pl-6 pr-2 text-xs bg-black text-white uppercase focus:border-[#FFC000] focus:outline-none"
                value={searchItem}
                onChange={(e) => setSearchItem(e.target.value)}
              />
              <Search className="absolute left-2 top-2 h-3 w-3 text-[#7D7D7D]" />
            </div>
          </div>

          {/* Stock Type Dropdown */}
          <div className="col-span-2.5 flex items-center gap-1">
            <span className="text-[9.5px] font-bold text-[#7D7D7D] uppercase w-16 shrink-0 whitespace-nowrap">Stock Type</span>
            <select
              className="w-full h-7 border border-[#2c2c2c] rounded-none text-xs font-bold bg-black text-white cursor-pointer px-1 focus:border-[#FFC000] focus:outline-none uppercase"
              value={stockType}
              onChange={(e) => setStockType(e.target.value as StockTypeFilter)}
            >
              <option value="All" className="bg-[#181818]">All Stock</option>
              <option value="Opening" className="bg-[#181818]">Opening Bal</option>
              <option value="Inward" className="bg-[#181818]">Inwards Only</option>
              <option value="Purchase" className="bg-[#181818]">Purchase Desk</option>
              <option value="Sales" className="bg-[#181818]">Sales desk</option>
            </select>
          </div>

          {/* Pr Code Input */}
          <div className="col-span-2.5 flex items-center gap-1.5">
            <span className="text-[9.5px] font-bold text-slate-500 uppercase w-12 shrink-0">Pr Code</span>
            <input
              type="text"
              placeholder="Code"
              className="w-full h-7 border border-slate-300 rounded-[2px] font-bold text-slate-700 bg-slate-50 focus:bg-white focus:outline-none px-2 uppercase"
              value={prCode}
              onChange={(e) => setPrCode(e.target.value)}
            />
          </div>

          {/* Table Name Dropdown */}
          <div className="col-span-3.5 flex items-center gap-1.5">
            <span className="text-[9.5px] font-bold text-slate-500 uppercase w-16 shrink-0">Table Name</span>
            <select
              className="w-full h-7 border border-slate-300 rounded-[2px] text-xs font-bold bg-slate-50 cursor-pointer px-1 focus:bg-white focus:outline-none"
              value={tableName}
              onChange={(e) => setTableName(e.target.value)}
            >
              <option value="All">ALL TABLES</option>
              <option value="Table 1">SALES DESK 1</option>
              <option value="Table 2">REPAIR COUNTER</option>
            </select>
          </div>
        </div>

      </div>

      {/* TABS CONTROL BAR */}
      <div className="bg-[#181818] border border-[#2c2c2c] h-9 flex items-center px-3 gap-1 shrink-0 select-none no-print">
        {(['Group', 'Product', 'Item', 'Design', 'Safe', 'Counter', 'Trading'] as ActiveTabType[]).map((tab) => {
          const isActive = tab === activeTab;
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`h-7 px-4 text-[11px] font-bold uppercase transition-all cursor-pointer ${
                isActive
                  ? 'bg-[#202020] border-t-2 border-t-[#FFC000] border-x border-b-0 border-[#2c2c2c] text-[#FFC000]'
                  : 'bg-[#121212] hover:bg-[#1a1a1a] border border-[#2c2c2c] text-[#7D7D7D] hover:text-[#969696]'
              }`}
            >
              {tab}
            </button>
          );
        })}
      </div>

      {/* TABLE GRID SUMMARY WRAPPED WITH DETAILS DRAWER */}
      <div className="flex gap-2 flex-1 overflow-hidden select-text min-h-[350px] w-full">
        <div className="bg-[#202020] border border-[#2c2c2c] flex-1 overflow-auto flex flex-col">
          
          {/* Printable Header - Shown only during printing/saving PDF */}
          <div className="hidden print:block text-center py-4 border-b border-[#2c2c2c] bg-[#181818]">
            <h1 className="text-lg font-extrabold uppercase font-luxury tracking-widest text-[#FFC000]">
              {selectedCompany?.name || 'JEWEL ACC'}
            </h1>
            <p className="text-xs text-[#969696] uppercase font-bold tracking-wider mt-1">
              Stock Report Statement ({activeTab} Analysis)
            </p>
            <p className="text-[10px] text-[#7D7D7D] font-mono mt-0.5">
              Duration: {dateFrom} to {dateTo}
            </p>
          </div>

          <div className="flex-1 overflow-y-auto">
            <table className="w-full border-collapse text-left text-xs table-fixed min-w-[950px]">
              <thead>
                <tr className="sticky top-0 z-20 bg-[#181818] border-b border-[#2c2c2c] text-[9px] font-mono font-bold text-[#969696] uppercase select-none tracking-wider">
                  <th className="w-[45px] border-r border-[#2c2c2c] px-2 py-2 text-center">SrNo</th>
                  <th className="border-r border-[#2c2c2c] px-3 py-2 text-left min-w-[140px]">Item Name</th>
                  <th className="w-[50px] border-r border-[#2c2c2c] px-1 py-2 text-center">OpPcs</th>
                  <th className="w-[75px] border-r border-[#2c2c2c] px-2 py-2 text-right">OpWt</th>
                  <th className="w-[50px] border-r border-[#2c2c2c] px-1 py-2 text-center bg-[#141414]">PrPcs</th>
                  <th className="w-[75px] border-r border-[#2c2c2c] px-2 py-2 text-right bg-[#141414]">PrWt</th>
                  <th className="w-[50px] border-r border-[#2c2c2c] px-1 py-2 text-center">InPcs</th>
                  <th className="w-[75px] border-r border-[#2c2c2c] px-2 py-2 text-right">InWt</th>
                  <th className="w-[50px] border-r border-[#2c2c2c] px-1 py-2 text-center">OuPcs</th>
                  <th className="w-[75px] border-r border-[#2c2c2c] px-2 py-2 text-right">OuWt</th>
                  <th className="w-[50px] border-r border-[#2c2c2c] px-1 py-2 text-center bg-[#141414]">SIPcs</th>
                  <th className="w-[75px] border-r border-[#2c2c2c] px-2 py-2 text-right bg-[#141414]">SIWt</th>
                  <th className="w-[60px] border-r border-[#2c2c2c] px-1 py-2 text-center bg-[#181818] text-[#FFC000]">CIPcs</th>
                  <th className="w-[85px] text-right px-3 py-2 bg-[#181818] text-[#FFC000]">CIWt</th>
                </tr>
              </thead>
              <tbody className="font-semibold text-white font-mono text-[11px] select-text">
                {gridRows.map((row) => (
                  <tr
                    key={row.srNo}
                    id={`stock-row-${row.srNo}`}
                    className={`border-b border-[#2c2c2c] hover:bg-[#282828] transition-colors h-[28px] ${
                      highlightedRowIndex === row.srNo ? 'bg-[#2a2412] border-l-2 border-l-[#FFC000]' : ''
                    }`}
                  >
                    <td className="text-center text-[#7D7D7D] border-r border-[#2c2c2c]">{row.srNo}</td>
                    <td className="px-3 border-r border-[#2c2c2c] font-sans font-bold text-white uppercase tracking-tight">{row.itemName}</td>
                    <td className="text-center border-r border-[#2c2c2c] text-[#969696]">{row.opPcs || ''}</td>
                    <td className="text-right px-2 border-r border-[#2c2c2c] text-[#969696]">{row.opWt > 0 ? row.opWt.toFixed(3) : ''}</td>
                    <td className="text-center border-r border-[#2c2c2c] bg-[#181818]/40 text-[#969696]">{row.prPcs || ''}</td>
                    <td className="text-right px-2 border-r border-[#2c2c2c] bg-[#181818]/40 text-[#969696]">{row.prWt > 0 ? row.prWt.toFixed(3) : ''}</td>
                    <td className="text-center border-r border-[#2c2c2c] text-[#969696]">{row.inPcs || ''}</td>
                    <td className="text-right px-2 border-r border-[#2c2c2c] text-[#969696]">{row.inWt > 0 ? row.inWt.toFixed(3) : ''}</td>
                    <td className="text-center border-r border-[#2c2c2c] text-[#969696]">{row.ouPcs || ''}</td>
                    <td className="text-right px-2 border-r border-[#2c2c2c] text-[#969696]">{row.ouWt > 0 ? row.ouWt.toFixed(3) : ''}</td>
                    <td className="text-center border-r border-[#2c2c2c] bg-[#181818]/40 text-[#969696]">{row.siPcs || ''}</td>
                    <td className="text-right px-2 border-r border-[#2c2c2c] bg-[#181818]/40 text-[#969696]">{row.siWt > 0 ? row.siWt.toFixed(3) : ''}</td>
                    
                    {/* Closing Stock Balances */}
                    <td className="text-center border-r border-[#2c2c2c] bg-[#181818] text-[#FFC000] font-bold">
                      {row.ciPcs}
                    </td>
                    <td className="text-right px-3 bg-[#181818] text-[#FFC000] font-bold">
                      {row.ciWt.toFixed(3)}
                    </td>
                  </tr>
                ))}
                {isLoading && (
                  <tr>
                    <td colSpan={14} className="text-center py-8 font-bold text-[#7D7D7D]">Loading stock records and balances...</td>
                  </tr>
                )}
                {!isLoading && gridRows.length === 0 && (
                  <tr>
                    <td colSpan={14} className="text-center py-8 font-bold text-[#7D7D7D]">No stock movements found matching current filters.</td>
                  </tr>
                )}
              </tbody>
              {/* Totals Row aligned to columns */}
              <tfoot>
                <tr className="bg-[#181818] border-t-2 border-[#2c2c2c] font-bold text-white font-mono text-[11px] h-[28px] select-none">
                  <td colSpan={2} className="px-3 text-left uppercase text-[9.5px] font-mono tracking-widest text-[#7D7D7D]">Totals :</td>
                  <td className="text-center border-r border-[#2c2c2c]">{totalOpPcs || ''}</td>
                  <td className="text-right border-r border-[#2c2c2c] px-2">{totalOpWt > 0 ? totalOpWt.toFixed(3) : ''}</td>
                  <td className="text-center border-r border-[#2c2c2c] bg-[#141414]">{totalPrPcs || ''}</td>
                  <td className="text-right border-r border-[#2c2c2c] px-2 bg-[#141414]">{totalPrWt > 0 ? totalPrWt.toFixed(3) : ''}</td>
                  <td className="text-center border-r border-[#2c2c2c]">{totalInPcs || ''}</td>
                  <td className="text-right border-r border-[#2c2c2c] px-2">{totalInWt > 0 ? totalInWt.toFixed(3) : ''}</td>
                  <td className="text-center border-r border-[#2c2c2c]">{totalOuPcs || ''}</td>
                  <td className="text-right border-r border-[#2c2c2c] px-2">{totalOuWt > 0 ? totalOuWt.toFixed(3) : ''}</td>
                  <td className="text-center border-r border-[#2c2c2c] bg-[#141414]">{totalSIPcs || ''}</td>
                  <td className="text-right border-r border-[#2c2c2c] px-2 bg-[#141414]">{totalSIWt > 0 ? totalSIWt.toFixed(3) : ''}</td>
                  
                  {/* Closing grand totals */}
                  <td className="text-center border-r border-[#2c2c2c] font-bold text-[#FFC000] bg-[#121212]">{totalCIPcs}</td>
                  <td className="text-right px-3 font-bold text-[#FFC000] bg-[#121212]">{totalCIWt.toFixed(3)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Side Panel for Image Preview and Item details */}
        {scannedItemDetails && (
          <div className="w-80 bg-[#181818] border border-[#2c2c2c] flex flex-col no-print shrink-0">
            <div className="bg-[#121212] text-white px-3 py-2 border-b border-[#2c2c2c] flex justify-between items-center">
              <span className="font-bold text-xs uppercase tracking-wider font-mono text-[#FFC000]">Scanned Item Details</span>
              <button 
                onClick={() => { setScannedItemDetails(null); setHighlightedRowIndex(null); }}
                className="text-[10px] text-[#7D7D7D] hover:text-white uppercase font-bold"
              >
                Close [✕]
              </button>
            </div>
            <div className="p-3 space-y-3.5 flex-1 overflow-y-auto">
              <div className="w-full h-32 bg-[#202020] border border-[#2c2c2c] flex items-center justify-center relative overflow-hidden">
                <div className="text-center p-4">
                  <div className="mx-auto w-12 h-12 bg-[#2a2412] border border-[#FFC000]/40 flex items-center justify-center mb-1 text-[#FFC000] font-extrabold text-sm uppercase">
                    {scannedItemDetails.type.substring(0,2)}
                  </div>
                  <span className="text-[10px] text-[#969696] font-bold uppercase tracking-wider">Catalog Photo Preview</span>
                  <p className="text-[9px] text-[#7D7D7D] mt-0.5">High-Resolution RFID Asset Capture</p>
                </div>
              </div>

              <div className="space-y-2 text-[11px]">
                <div className="flex justify-between border-b border-[#2c2c2c] pb-1">
                  <span className="text-[#7D7D7D] font-mono uppercase text-[9.5px]">Entity Type</span>
                  <span className="font-bold text-white uppercase">{scannedItemDetails.type}</span>
                </div>
                <div className="flex justify-between border-b border-[#2c2c2c] pb-1">
                  <span className="text-[#7D7D7D] font-mono uppercase text-[9.5px]">Item Code / SKU</span>
                  <span className="font-mono font-bold text-[#FFC000]">{scannedItemDetails.code}</span>
                </div>
                <div className="flex justify-between border-b border-[#2c2c2c] pb-1">
                  <span className="text-[#7D7D7D] font-mono uppercase text-[9.5px]">Design Description</span>
                  <span className="font-bold text-white uppercase">{scannedItemDetails.name}</span>
                </div>
                {scannedItemDetails.details.weight !== undefined && (
                  <div className="flex justify-between border-b border-[#2c2c2c] pb-1">
                    <span className="text-[#7D7D7D] font-mono uppercase text-[9.5px]">Gross Weight</span>
                    <span className="font-mono font-bold text-white">{scannedItemDetails.details.weight || scannedItemDetails.details.gr_wt} g</span>
                  </div>
                )}
                {scannedItemDetails.details.fine !== undefined && (
                  <div className="flex justify-between items-center py-2 border-b border-[#2c2c2c]">
                    <span className="text-[#7D7D7D] font-mono uppercase text-[9.5px]">Fine Weight</span>
                    <span className="font-mono font-bold text-white">{scannedItemDetails.details.fine || scannedItemDetails.details.net_wt} g</span>
                  </div>
                )}
                {scannedItemDetails.details.purity && (
                  <div className="flex justify-between border-b border-[#2c2c2c] pb-1">
                    <span className="text-[#7D7D7D] font-mono uppercase text-[9.5px]">Purity (Carat)</span>
                    <span className="font-bold text-white">{scannedItemDetails.details.purity || scannedItemDetails.details.size}</span>
                  </div>
                )}
                {(scannedItemDetails.details.selling_price !== undefined || scannedItemDetails.details.mrp !== undefined) && (
                  <div className="flex justify-between border-b border-[#2c2c2c] pb-1">
                    <span className="text-[#7D7D7D] font-mono uppercase text-[9.5px]">Market Selling Price</span>
                    <span className="font-mono font-bold text-[#FFC000]">₹{(scannedItemDetails.details.selling_price || scannedItemDetails.details.mrp || 0).toLocaleString()}</span>
                  </div>
                )}
                {scannedItemDetails.details.current_stock !== undefined && (
                  <div className="flex justify-between border-b border-[#2c2c2c] pb-1">
                    <span className="text-[#7D7D7D] font-mono uppercase text-[9.5px]">Active Inventory Stock</span>
                    <span className={`font-bold font-mono ${scannedItemDetails.details.current_stock > 0 ? 'text-[#29ABE2]' : 'text-rose-500'}`}>{scannedItemDetails.details.current_stock} pcs</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ACTION BUTTONS RIBBON */}
      <div className="bg-[#181818] border border-[#2c2c2c] px-3 py-1.5 flex items-center justify-end gap-1.5 shrink-0 select-none mt-2 no-print">
        
        {/* Print (Window) */}
        <button
          onClick={handlePrint}
          className="flex items-center gap-1.5 px-3 h-8 bg-transparent hover:bg-white/5 text-[#969696] hover:text-white border border-white/20 uppercase transition-all text-xs cursor-pointer active:scale-95"
        >
          <Printer className="h-3.5 w-3.5 text-[#969696]" />
          <span>Print</span>
        </button>

        {/* PDF Export */}
        <button
          onClick={handleExportPDF}
          className="flex items-center gap-1.5 px-4 h-8 bg-[#FFC000] hover:bg-[#917300] text-black border border-[#FFC000] uppercase transition-all text-xs font-bold cursor-pointer active:scale-95"
        >
          <FileText className="h-3.5 w-3.5 text-black" />
          <span>PDF Export</span>
        </button>

        {/* Excel Export */}
        <button
          onClick={handleExcelExport}
          className="flex items-center gap-1.5 px-3 h-8 bg-transparent hover:bg-white/5 text-[#969696] hover:text-white border border-white/20 uppercase transition-all text-xs cursor-pointer active:scale-95"
        >
          <FileSpreadsheet className="h-3.5 w-3.5 text-[#969696]" />
          <span>Excel</span>
        </button>

        {/* Cancel (Reset) */}
        <button
          onClick={handleCancel}
          className="flex items-center gap-1.5 px-3 h-8 bg-transparent hover:bg-white/5 text-[#7D7D7D] hover:text-white border border-white/20 uppercase transition-all text-xs cursor-pointer active:scale-95"
        >
          <Undo2 className="h-3.5 w-3.5 text-[#7D7D7D]" />
          <span>Cancel</span>
        </button>

        <div className="h-5 w-px bg-[#2c2c2c] mx-1" />

        {/* Exit */}
        <button
          onClick={handleExit}
          className="flex items-center gap-1.5 px-3 h-8 bg-transparent hover:bg-rose-500/10 text-[#7D7D7D] hover:text-rose-400 border border-white/20 uppercase transition-all text-xs cursor-pointer active:scale-95"
        >
          <LogOut className="h-3.5 w-3.5 text-[#7D7D7D]" />
          <span>Exit</span>
        </button>

      </div>

    </div>
  );
}
