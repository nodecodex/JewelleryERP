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
        alert(`Barcode/QR "${data.value}" did not match any tag or inventory item.`);
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
    alert(res.message);
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
    <div className="flex flex-col h-full bg-[#eef1f6] text-slate-800 p-2 font-sans select-none no-print overflow-y-auto text-xs">
      
      {/* HEADER SECTION WITH FILTERS */}
      <div className="bg-white border border-slate-300 rounded-[2px] p-2 shadow-sm shrink-0 flex flex-col gap-2 mb-1.5 no-print">
        
        {/* Banner Strip */}
        <div className="bg-orange-500 text-white py-1 px-4 text-center font-bold text-sm tracking-wider uppercase rounded-[1px] flex justify-between items-center shadow-inner mb-1 bg-gradient-to-r from-orange-500 to-amber-500">
          <label className="flex items-center gap-1.5 text-[10px] select-none cursor-pointer">
            <input 
              type="checkbox" 
              className="h-3 w-3 accent-amber-500 cursor-pointer"
              checked={grossWiseWeight}
              onChange={(e) => setGrossWiseWeight(e.target.checked)}
            />
            <span>Gross Wise Weight</span>
          </label>
          <span className="font-extrabold font-luxury tracking-widest text-[13px]">Stock Report</span>
          <span className="text-[10px] opacity-75 font-data">Tag Valuation Ledger</span>
        </div>

        {/* Filters Grid Row 1 */}
        <div className="grid grid-cols-12 gap-2 items-center">
          {/* Dates */}
          <div className="col-span-3 flex items-center gap-1">
            <span className="text-[9.5px] font-bold text-slate-500 uppercase w-10 shrink-0">Date</span>
            <input
              type="date"
              className="w-1/2 h-7 border border-slate-300 rounded-[2px] text-xs font-bold text-slate-700 px-1 bg-slate-50 focus:bg-white focus:outline-none"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
            <span className="text-slate-400 font-bold">-</span>
            <input
              type="date"
              className="w-1/2 h-7 border border-slate-300 rounded-[2px] text-xs font-bold text-slate-700 px-1 bg-slate-50 focus:bg-white focus:outline-none"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </div>

          {/* Item Type Dropdown */}
          <div className="col-span-3 flex items-center gap-1">
            <span className="text-[9.5px] font-bold text-slate-500 uppercase w-16 shrink-0">Item Type</span>
            <select
              className="w-full h-7 border border-slate-300 rounded-[2px] text-xs font-bold bg-slate-50 cursor-pointer px-1 focus:bg-white focus:outline-none"
              value={itemType}
              onChange={(e) => setItemType(e.target.value as ItemTypeFilter)}
            >
              <option value="All">All Metals</option>
              <option value="Gold">Gold</option>
              <option value="Silver">Silver</option>
              <option value="Diamond">Diamond</option>
            </select>
          </div>

          {/* Gr Code Input */}
          <div className="col-span-2.5 flex items-center gap-1.5">
            <span className="text-[9.5px] font-bold text-slate-500 uppercase w-12 shrink-0">Gr Code</span>
            <input
              type="text"
              placeholder="e.g. 916"
              className="w-full h-7 border border-slate-300 rounded-[2px] font-bold text-slate-700 bg-slate-50 focus:bg-white focus:outline-none px-2 uppercase"
              value={grCode}
              onChange={(e) => setGrCode(e.target.value)}
            />
          </div>

          {/* Safe Name Dropdown */}
          <div className="col-span-3.5 flex items-center gap-1.5">
            <span className="text-[9.5px] font-bold text-slate-500 uppercase w-16 shrink-0">Safe Name</span>
            <select
              className="w-full h-7 border border-slate-300 rounded-[2px] text-xs font-bold bg-slate-50 cursor-pointer px-1 focus:bg-white focus:outline-none"
              value={safeName}
              onChange={(e) => setSafeName(e.target.value)}
            >
              <option value="All">ALL SAFES</option>
              <option value="Vault 1">MAIN VAULT</option>
              <option value="Showroom">SHOWROOM COUNTER</option>
            </select>
          </div>
        </div>

        {/* Filters Grid Row 2 */}
        <div className="grid grid-cols-12 gap-2 items-center border-t border-slate-200 pt-1.5">
          
          {/* Search Item field */}
          <div className="col-span-3.5 flex items-center gap-1">
            <span className="text-[9.5px] font-bold text-slate-500 uppercase w-10 shrink-0">Item</span>
            <div className="relative w-full">
              <input
                type="text"
                placeholder="Advance Search"
                className="w-full h-7 border border-slate-300 rounded-[2px] pl-6 pr-2 text-xs"
                value={searchItem}
                onChange={(e) => setSearchItem(e.target.value)}
              />
              <Search className="absolute left-2 top-2 h-3 w-3 text-slate-400" />
            </div>
          </div>

          {/* Stock Type Dropdown */}
          <div className="col-span-2.5 flex items-center gap-1">
            <span className="text-[9.5px] font-bold text-slate-500 uppercase w-16 shrink-0 whitespace-nowrap">Stock Type</span>
            <select
              className="w-full h-7 border border-slate-300 rounded-[2px] text-xs font-bold bg-slate-50 cursor-pointer px-1 focus:bg-white focus:outline-none"
              value={stockType}
              onChange={(e) => setStockType(e.target.value as StockTypeFilter)}
            >
              <option value="All">All Stock</option>
              <option value="Opening">Opening Bal</option>
              <option value="Inward">Inwards Only</option>
              <option value="Purchase">Purchase Desk</option>
              <option value="Sales">Sales desk</option>
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
      <div className="bg-slate-200 border border-slate-300 rounded-t-[2px] h-9 flex items-center px-4 gap-1.5 shrink-0 select-none no-print">
        {(['Group', 'Product', 'Item', 'Design', 'Safe', 'Counter', 'Trading'] as ActiveTabType[]).map((tab) => {
          const isActive = tab === activeTab;
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`h-7 px-5 text-[11px] font-bold rounded-[2px] uppercase shadow-sm border transition-all cursor-pointer ${
                isActive
                  ? 'bg-white border-slate-300 text-amber-600 font-extrabold'
                  : 'bg-slate-100 hover:bg-slate-50 border-slate-300 text-slate-600'
              }`}
            >
              {tab}
            </button>
          );
        })}
      </div>

      {/* TABLE GRID SUMMARY WRAPPED WITH DETAILS DRAWER */}
      <div className="flex gap-2 flex-1 overflow-hidden select-text min-h-[350px] w-full">
        <div className="bg-white border-l border-r border-b border-slate-300 rounded-b-[2px] shadow-sm flex-1 overflow-auto flex flex-col">
          
          {/* Printable Header - Shown only during printing/saving PDF */}
          <div className="hidden print:block text-center py-4 border-b border-slate-300 bg-slate-50">
            <h1 className="text-lg font-extrabold uppercase font-luxury tracking-widest text-slate-800">
              {selectedCompany?.name || 'JEWEL ACC'}
            </h1>
            <p className="text-xs text-slate-500 uppercase font-bold tracking-wider mt-1">
              Stock Report Statement ({activeTab} Analysis)
            </p>
            <p className="text-[10px] text-slate-400 font-data mt-0.5">
              Duration: {dateFrom} to {dateTo}
            </p>
          </div>

          <div className="flex-1 overflow-y-auto">
            <table className="w-full border-collapse text-left text-xs table-fixed min-w-[950px]">
              <thead>
                <tr className="sticky top-0 z-20 bg-slate-200 border-b border-slate-300 text-[9px] font-bold text-slate-600 uppercase select-none">
                  <th className="w-[45px] border-r border-slate-300 px-2 py-1.5 text-center">SrNo</th>
                  <th className="border-r border-slate-300 px-3 py-1.5 text-left min-w-[140px]">Item Name</th>
                  <th className="w-[50px] border-r border-slate-300 px-1 py-1.5 text-center">OpPcs</th>
                  <th className="w-[75px] border-r border-slate-300 px-2 py-1.5 text-right">OpWt</th>
                  <th className="w-[50px] border-r border-slate-300 px-1 py-1.5 text-center bg-slate-100/40">PrPcs</th>
                  <th className="w-[75px] border-r border-slate-300 px-2 py-1.5 text-right bg-slate-100/40">PrWt</th>
                  <th className="w-[50px] border-r border-slate-300 px-1 py-1.5 text-center">InPcs</th>
                  <th className="w-[75px] border-r border-slate-300 px-2 py-1.5 text-right">InWt</th>
                  <th className="w-[50px] border-r border-slate-300 px-1 py-1.5 text-center">OuPcs</th>
                  <th className="w-[75px] border-r border-slate-300 px-2 py-1.5 text-right">OuWt</th>
                  <th className="w-[50px] border-r border-slate-300 px-1 py-1.5 text-center bg-amber-50/20">SIPcs</th>
                  <th className="w-[75px] border-r border-slate-300 px-2 py-1.5 text-right bg-amber-50/20">SIWt</th>
                  <th className="w-[60px] border-r border-slate-300 px-1 py-1.5 text-center bg-orange-50/40 text-orange-800">CIPcs</th>
                  <th className="w-[85px] text-right px-3 py-1.5 bg-orange-50/40 text-orange-800">CIWt</th>
                </tr>
              </thead>
              <tbody className="font-semibold text-slate-800 font-data select-text">
                {gridRows.map((row) => (
                  <tr
                    key={row.srNo}
                    id={`stock-row-${row.srNo}`}
                    className={`border-b border-slate-200 hover:bg-slate-50 transition-all h-[28px] ${
                      highlightedRowIndex === row.srNo ? 'bg-amber-100 border-l-4 border-l-amber-500 scale-[1.005] shadow-sm' : ''
                    }`}
                  >
                    <td className="text-center text-slate-400 border-r border-slate-200">{row.srNo}</td>
                    <td className="px-3 border-r border-slate-200 font-sans font-bold text-slate-700 uppercase tracking-tight">{row.itemName}</td>
                    <td className="text-center border-r border-slate-200 text-slate-500">{row.opPcs || ''}</td>
                    <td className="text-right px-2 border-r border-slate-200 text-slate-500">{row.opWt > 0 ? row.opWt.toFixed(3) : ''}</td>
                    <td className="text-center border-r border-slate-200 bg-slate-100/10 text-slate-600">{row.prPcs || ''}</td>
                    <td className="text-right px-2 border-r border-slate-200 bg-slate-100/10 text-slate-600">{row.prWt > 0 ? row.prWt.toFixed(3) : ''}</td>
                    <td className="text-center border-r border-slate-200 text-slate-600">{row.inPcs || ''}</td>
                    <td className="text-right px-2 border-r border-slate-200 text-slate-600">{row.inWt > 0 ? row.inWt.toFixed(3) : ''}</td>
                    <td className="text-center border-r border-slate-200 text-slate-500">{row.ouPcs || ''}</td>
                    <td className="text-right px-2 border-r border-slate-200 text-slate-500">{row.ouWt > 0 ? row.ouWt.toFixed(3) : ''}</td>
                    <td className="text-center border-r border-slate-200 bg-amber-50/5 text-slate-700">{row.siPcs || ''}</td>
                    <td className="text-right px-2 border-r border-slate-200 bg-amber-50/5 text-slate-700">{row.siWt > 0 ? row.siWt.toFixed(3) : ''}</td>
                    
                    {/* Closing Stock Balances */}
                    <td className="text-center border-r border-slate-200 bg-orange-50/10 text-orange-700 font-extrabold">
                      {row.ciPcs}
                    </td>
                    <td className="text-right px-3 bg-orange-50/10 text-orange-700 font-extrabold">
                      {row.ciWt.toFixed(3)}
                    </td>
                  </tr>
                ))}
                {isLoading && (
                  <tr>
                    <td colSpan={14} className="text-center py-8 font-bold text-slate-400">Loading stock records and balances...</td>
                  </tr>
                )}
                {!isLoading && gridRows.length === 0 && (
                  <tr>
                    <td colSpan={14} className="text-center py-8 font-bold text-slate-400">No stock movements found matching current filters.</td>
                  </tr>
                )}
              </tbody>
              {/* Totals Row aligned to columns */}
              <tfoot>
                <tr className="bg-slate-200 border-t border-slate-300 font-bold text-slate-700 font-data h-[26px] select-none">
                  <td colSpan={2} className="px-3 text-left uppercase text-[9.5px] font-extrabold text-slate-500">Totals :</td>
                  <td className="text-center border-r border-slate-300 font-bold">{totalOpPcs || ''}</td>
                  <td className="text-right border-r border-slate-300 px-2 font-bold">{totalOpWt > 0 ? totalOpWt.toFixed(3) : ''}</td>
                  <td className="text-center border-r border-slate-300 font-bold bg-slate-250/20">{totalPrPcs || ''}</td>
                  <td className="text-right border-r border-slate-300 px-2 font-bold bg-slate-250/20">{totalPrWt > 0 ? totalPrWt.toFixed(3) : ''}</td>
                  <td className="text-center border-r border-slate-300 font-bold">{totalInPcs || ''}</td>
                  <td className="text-right border-r border-slate-300 px-2 font-bold">{totalInWt > 0 ? totalInWt.toFixed(3) : ''}</td>
                  <td className="text-center border-r border-slate-300 font-bold">{totalOuPcs || ''}</td>
                  <td className="text-right border-r border-slate-300 px-2 font-bold">{totalOuWt > 0 ? totalOuWt.toFixed(3) : ''}</td>
                  <td className="text-center border-r border-slate-300 font-bold bg-amber-250/10">{totalSIPcs || ''}</td>
                  <td className="text-right border-r border-slate-300 px-2 font-bold bg-amber-250/10">{totalSIWt > 0 ? totalSIWt.toFixed(3) : ''}</td>
                  
                  {/* Closing grand totals */}
                  <td className="text-center border-r border-slate-300 font-extrabold text-orange-700 bg-orange-100/30">{totalCIPcs}</td>
                  <td className="text-right px-3 font-extrabold text-orange-700 bg-orange-100/30">{totalCIWt.toFixed(3)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Side Panel for Image Preview and Item details */}
        {scannedItemDetails && (
          <div className="w-80 bg-white border border-slate-300 rounded-[2px] shadow-md flex flex-col no-print shrink-0">
            <div className="bg-slate-800 text-slate-100 px-3 py-2 border-b border-slate-900 flex justify-between items-center">
              <span className="font-bold text-xs uppercase tracking-wider font-luxury text-slate-100">Scanned Item Details</span>
              <button 
                onClick={() => { setScannedItemDetails(null); setHighlightedRowIndex(null); }}
                className="text-[10px] text-slate-400 hover:text-white uppercase font-bold"
              >
                Close [✕]
              </button>
            </div>
            <div className="p-3 space-y-3.5 flex-1 overflow-y-auto">
              <div className="w-full h-32 bg-slate-100 border border-slate-200 rounded-[2px] flex items-center justify-center relative overflow-hidden">
                <div className="text-center p-4">
                  <div className="mx-auto w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center mb-1 text-amber-600 font-extrabold text-sm uppercase">
                    {scannedItemDetails.type.substring(0,2)}
                  </div>
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Catalog Photo Preview</span>
                  <p className="text-[9px] text-slate-400 mt-0.5">High-Resolution RFID Asset Capture</p>
                </div>
              </div>

              <div className="space-y-2 text-[11px]">
                <div className="flex justify-between border-b border-slate-100 pb-1">
                  <span className="text-slate-400 font-bold uppercase text-[9.5px]">Entity Type</span>
                  <span className="font-bold text-slate-800 uppercase">{scannedItemDetails.type}</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 pb-1">
                  <span className="text-slate-400 font-bold uppercase text-[9.5px]">Item Code / SKU</span>
                  <span className="font-mono font-bold text-slate-900">{scannedItemDetails.code}</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 pb-1">
                  <span className="text-slate-400 font-bold uppercase text-[9.5px]">Design Description</span>
                  <span className="font-bold text-amber-700 uppercase">{scannedItemDetails.name}</span>
                </div>
                {scannedItemDetails.details.weight !== undefined && (
                  <div className="flex justify-between border-b border-slate-100 pb-1">
                    <span className="text-slate-400 font-bold uppercase text-[9.5px]">Gross Weight</span>
                    <span className="font-mono font-bold text-slate-800">{scannedItemDetails.details.weight || scannedItemDetails.details.gr_wt} g</span>
                  </div>
                )}
                {scannedItemDetails.details.net_weight !== undefined && (
                  <div className="flex justify-between border-b border-slate-100 pb-1">
                    <span className="text-slate-400 font-bold uppercase text-[9.5px]">Net Weight</span>
                    <span className="font-mono font-bold text-slate-800">{scannedItemDetails.details.net_weight || scannedItemDetails.details.net_wt} g</span>
                  </div>
                )}
                {scannedItemDetails.details.purity && (
                  <div className="flex justify-between border-b border-slate-100 pb-1">
                    <span className="text-slate-400 font-bold uppercase text-[9.5px]">Purity (Carat)</span>
                    <span className="font-bold text-slate-700">{scannedItemDetails.details.purity || scannedItemDetails.details.size}</span>
                  </div>
                )}
                {(scannedItemDetails.details.selling_price !== undefined || scannedItemDetails.details.mrp !== undefined) && (
                  <div className="flex justify-between border-b border-slate-100 pb-1">
                    <span className="text-slate-400 font-bold uppercase text-[9.5px]">Market Selling Price</span>
                    <span className="font-mono font-bold text-emerald-700">₹{(scannedItemDetails.details.selling_price || scannedItemDetails.details.mrp || 0).toLocaleString()}</span>
                  </div>
                )}
                {scannedItemDetails.details.current_stock !== undefined && (
                  <div className="flex justify-between border-b border-slate-100 pb-1">
                    <span className="text-slate-400 font-bold uppercase text-[9.5px]">Active Inventory Stock</span>
                    <span className={`font-bold ${scannedItemDetails.details.current_stock > 0 ? 'text-emerald-600' : 'text-rose-500'}`}>{scannedItemDetails.details.current_stock} pcs</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ACTION BUTTONS RIBBON */}
      <div className="bg-slate-100 border border-slate-300 rounded-[2px] px-4 py-2 flex items-center justify-end gap-1.5 shrink-0 select-none mt-1.5 shadow-sm no-print">
        
        {/* Print (Window) */}
        <button
          onClick={handlePrint}
          className="flex items-center gap-1.5 px-4 h-8 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-[2px] uppercase shadow-sm transition-all text-xs cursor-pointer active:scale-95"
        >
          <Printer className="h-4 w-4 text-slate-400" />
          <span>Print</span>
        </button>

        {/* PDF Export */}
        <button
          onClick={handleExportPDF}
          className="flex items-center gap-1.5 px-4 h-8 bg-rose-600 hover:bg-rose-700 text-white border border-rose-700 rounded-[2px] uppercase shadow-sm transition-all text-xs font-bold cursor-pointer active:scale-95"
        >
          <FileText className="h-4 w-4 text-white" />
          <span>PDF Export</span>
        </button>

        {/* Excel Export */}
        <button
          onClick={handleExcelExport}
          className="flex items-center gap-1.5 px-4 h-8 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-[2px] uppercase shadow-sm transition-all text-xs cursor-pointer active:scale-95"
        >
          <FileSpreadsheet className="h-4 w-4 text-slate-400" />
          <span>Excel</span>
        </button>

        {/* Cancel (Reset) */}
        <button
          onClick={handleCancel}
          className="flex items-center gap-1.5 px-4 h-8 bg-white hover:bg-slate-50 text-slate-600 border border-slate-300 rounded-[2px] uppercase shadow-sm transition-all text-xs cursor-pointer active:scale-95"
        >
          <Undo2 className="h-4 w-4 text-slate-400" />
          <span>Cancel</span>
        </button>

        <div className="h-6 w-px bg-slate-300 mx-2" />

        {/* Exit */}
        <button
          onClick={handleExit}
          className="flex items-center gap-1.5 px-4 h-8 bg-slate-800 hover:bg-slate-700 text-white border border-slate-900 rounded-[2px] uppercase shadow-sm transition-all text-xs cursor-pointer active:scale-95"
        >
          <LogOut className="h-4 w-4 text-amber-500" />
          <span>Exit</span>
        </button>

      </div>

    </div>
  );
}
