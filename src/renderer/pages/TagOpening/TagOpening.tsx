import { useEffect, useState } from 'react';
import { useCompanyStore } from '../../store/useCompanyStore';
import { useTagOpeningStore } from '../../store/useTagOpeningStore';
import { useRateStore } from '../../store/useRateStore';
import { useTabStore } from '../../store/useTabStore';
import type { TagOpeningVoucher, TagOpeningAccessory } from '../../../shared/ipc-api';
import { 
  Plus, 
  Trash2, 
  Save, 
  Undo2, 
  LogOut, 
  ChevronLeft, 
  ChevronRight, 
  Camera, 
  ImageIcon, 
  Scissors 
} from 'lucide-react';

interface LocalItem {
  sr: number;
  it_code: string;
  tag_no: string;
  counter: string;
  design: string;
  size: string;
  huld: string;
  pcs: number;
  gr_wt: number;
  ls_wt: number;
  net_wt: number;
  lbr_percent: number;
  l_type: 'G' | 'F' | 'P';
  lbr_rate: number;
  lbr_amt: number;
  oth_amt: number;
  pr_cost: number;
  mrp: number;
  accessories: Omit<TagOpeningAccessory, 'id' | 'voucher_id'>[];
}

export default function TagOpeningView() {
  const selectedCompany = useCompanyStore((state) => state.selectedCompany);
  const closeTab = useTabStore((state) => state.closeTab);
  const activeTabId = useTabStore((state) => state.activeTabId);
  const currentRates = useRateStore((state) => state.currentRates);

  const { vouchers, loadVouchers, createVoucher, updateVoucher, deleteVoucher } = useTagOpeningStore();

  // Mode & navigation
  const [activeVoucherId, setActiveVoucherId] = useState<string | null>(null);
  const [vchNo, setVchNo] = useState('');
  const [vchDate, setVchDate] = useState(new Date().toISOString().split('T')[0]);
  const [itType, setItType] = useState<'Gold' | 'Silver' | 'Diamond' | 'Platinum' | 'Loose Stones' | 'Others'>('Gold');
  const [printFileName, setPrintFileName] = useState('QrPrint10');

  // Narrations / Employee details
  const [employee, setEmployee] = useState('');
  const [vchDesc, setVchDesc] = useState('');
  const [lableSkip, setLableSkip] = useState(0);

  // HUID fields
  const [huWt, setHuWt] = useState(0.0);
  const [huld2, setHuld2] = useState(0.0);
  const [huld3, setHuld3] = useState(0.0);
  const [huld4, setHuld4] = useState(0.0);

  // Main table items list
  const [items, setItems] = useState<LocalItem[]>([]);
  const [selectedItemIndex, setSelectedItemIndex] = useState<number>(0);

  // Load vouchers list
  useEffect(() => {
    if (selectedCompany) {
      loadVouchers(selectedCompany.id);
      generateNextVchNo();
    }
  }, [selectedCompany]);

  // Set default empty rows for main grid
  useEffect(() => {
    if (items.length === 0) {
      resetGrids();
    }
  }, [activeVoucherId]);

  const resetGrids = () => {
    const defaultItems: LocalItem[] = Array.from({ length: 5 }, (_, idx) => ({
      sr: idx + 1,
      it_code: '',
      tag_no: '',
      counter: '001',
      design: '',
      size: '',
      huld: '',
      pcs: 0,
      gr_wt: 0,
      ls_wt: 0,
      net_wt: 0,
      lbr_percent: 0,
      l_type: 'G',
      lbr_rate: 0,
      lbr_amt: 0,
      oth_amt: 0,
      pr_cost: 0,
      mrp: 0,
      accessories: [
        { sr: 1, it_code: '', it_name: '', pcs: 0, kr_wt: 0, kr_ls_percent: 0, weight: 0, con_percent: 0, pw: 'W', rate: 0, it_amt: 0, pa_amt: 0, net_amt: 0 },
        { sr: 2, it_code: '', it_name: '', pcs: 0, kr_wt: 0, kr_ls_percent: 0, weight: 0, con_percent: 0, pw: 'W', rate: 0, it_amt: 0, pa_amt: 0, net_amt: 0 },
        { sr: 3, it_code: '', it_name: '', pcs: 0, kr_wt: 0, kr_ls_percent: 0, weight: 0, con_percent: 0, pw: 'W', rate: 0, it_amt: 0, pa_amt: 0, net_amt: 0 }
      ]
    }));
    setItems(defaultItems);
    setSelectedItemIndex(0);
  };

  const generateNextVchNo = () => {
    if (vouchers.length === 0) {
      setVchNo('00001');
      return;
    }
    // Sort vouchers by vch_no
    const sorted = [...vouchers].sort((a, b) => b.vch_no.localeCompare(a.vch_no));
    const lastNum = parseInt(sorted[0].vch_no, 10) || 0;
    const nextNum = lastNum + 1;
    setVchNo(String(nextNum).padStart(5, '0'));
  };

  const getDayOfWeek = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { weekday: 'long' });
  };

  // Main grid calculations
  const calculateItemRow = (row: LocalItem) => {
    // 1. LsWt is sum of weights of its accessories
    const sumLsWt = row.accessories.reduce((s, acc) => s + (acc.weight || 0.0), 0.0);
    const sumOthAmt = row.accessories.reduce((s, acc) => s + (acc.net_amt || 0.0), 0.0);

    const netWt = Math.max(0, row.gr_wt - sumLsWt);
    let lbrAmt = 0;
    if (row.l_type === 'G') {
      lbrAmt = netWt * row.lbr_rate;
    } else if (row.l_type === 'P') {
      lbrAmt = row.pcs * row.lbr_rate;
    } else {
      // Fixed labor amount
      lbrAmt = row.lbr_rate;
    }

    return {
      ...row,
      ls_wt: parseFloat(sumLsWt.toFixed(3)),
      oth_amt: parseFloat(sumOthAmt.toFixed(2)),
      net_wt: parseFloat(netWt.toFixed(3)),
      lbr_amt: parseFloat(lbrAmt.toFixed(2))
    };
  };

  const handleMainCellChange = (index: number, field: keyof LocalItem, val: any) => {
    const updated = [...items];
    let row = { ...updated[index] };

    if (field === 'pcs') {
      row.pcs = parseInt(val, 10) || 0;
    } else if (field === 'gr_wt' || field === 'lbr_percent' || field === 'lbr_rate' || field === 'pr_cost' || field === 'mrp') {
      row[field] = parseFloat(val) || 0.0;
    } else {
      (row as any)[field] = val;
    }

    row = calculateItemRow(row);
    updated[index] = row;
    setItems(updated);
  };

  const handleAccessoryCellChange = (accIdx: number, field: keyof TagOpeningAccessory, val: any) => {
    const updatedItems = [...items];
    const activeItem = { ...updatedItems[selectedItemIndex] };
    const updatedAccs = [...activeItem.accessories];
    const acc = { ...updatedAccs[accIdx] };

    if (field === 'pcs') {
      acc.pcs = parseInt(val, 10) || 0;
    } else if (field === 'weight' || field === 'rate' || field === 'net_amt' || field === 'kr_wt' || field === 'kr_ls_percent' || field === 'con_percent' || field === 'it_amt' || field === 'pa_amt') {
      acc[field] = parseFloat(val) || 0.0;
    } else {
      (acc as any)[field] = val;
    }

    // Auto-calculate accessory net amount if rate & weight/pcs entered
    if (field === 'rate' || field === 'weight' || field === 'pcs' || field === 'pw') {
      const multiplier = acc.pw === 'P' ? (acc.pcs || 1) : (acc.weight || 0.0);
      acc.net_amt = parseFloat((multiplier * (acc.rate || 0.0)).toFixed(2));
      acc.it_amt = acc.net_amt;
      acc.pa_amt = acc.net_amt;
    }

    updatedAccs[accIdx] = acc;
    activeItem.accessories = updatedAccs;

    const recalculatedItem = calculateItemRow(activeItem);
    updatedItems[selectedItemIndex] = recalculatedItem;
    setItems(updatedItems);
  };

  const insertMainRow = () => {
    const nextSr = items.length + 1;
    const newRow: LocalItem = {
      sr: nextSr,
      it_code: '',
      tag_no: '',
      counter: '001',
      design: '',
      size: '',
      huld: '',
      pcs: 0,
      gr_wt: 0,
      ls_wt: 0,
      net_wt: 0,
      lbr_percent: 0,
      l_type: 'G',
      lbr_rate: 0,
      lbr_amt: 0,
      oth_amt: 0,
      pr_cost: 0,
      mrp: 0,
      accessories: [
        { sr: 1, it_code: '', it_name: '', pcs: 0, kr_wt: 0, kr_ls_percent: 0, weight: 0, con_percent: 0, pw: 'W', rate: 0, it_amt: 0, pa_amt: 0, net_amt: 0 },
        { sr: 2, it_code: '', it_name: '', pcs: 0, kr_wt: 0, kr_ls_percent: 0, weight: 0, con_percent: 0, pw: 'W', rate: 0, it_amt: 0, pa_amt: 0, net_amt: 0 },
        { sr: 3, it_code: '', it_name: '', pcs: 0, kr_wt: 0, kr_ls_percent: 0, weight: 0, con_percent: 0, pw: 'W', rate: 0, it_amt: 0, pa_amt: 0, net_amt: 0 }
      ]
    };
    setItems([...items, newRow]);
  };

  const removeMainRow = (index: number) => {
    if (items.length <= 1) return;
    const updated = items.filter((_, idx) => idx !== index).map((row, idx) => ({ ...row, sr: idx + 1 }));
    setItems(updated);
    setSelectedItemIndex(Math.max(0, selectedItemIndex - 1));
  };

  const insertAccessoryRow = () => {
    const updated = [...items];
    const active = { ...updated[selectedItemIndex] };
    const nextSr = active.accessories.length + 1;
    const newAcc: Omit<TagOpeningAccessory, 'id' | 'voucher_id'> = {
      sr: nextSr,
      it_code: '',
      it_name: '',
      pcs: 0,
      kr_wt: 0,
      kr_ls_percent: 0,
      weight: 0,
      con_percent: 0,
      pw: 'W',
      rate: 0,
      it_amt: 0,
      pa_amt: 0,
      net_amt: 0
    };
    active.accessories = [...active.accessories, newAcc];
    updated[selectedItemIndex] = calculateItemRow(active);
    setItems(updated);
  };

  // Totals calculations
  const totalPcs = items.reduce((s, i) => s + (i.it_code ? i.pcs : 0), 0);
  const totalGrWt = items.reduce((s, i) => s + (i.it_code ? i.gr_wt : 0.0), 0.0);
  const totalLsWt = items.reduce((s, i) => s + (i.it_code ? i.ls_wt : 0.0), 0.0);
  const totalNetWt = items.reduce((s, i) => s + (i.it_code ? i.net_wt : 0.0), 0.0);
  const totalLbrAmt = items.reduce((s, i) => s + (i.it_code ? i.lbr_amt : 0.0), 0.0);
  const totalOthAmt = items.reduce((s, i) => s + (i.it_code ? i.oth_amt : 0.0), 0.0);
  const totalMrp = items.reduce((s, i) => s + (i.it_code ? i.mrp : 0.0), 0.0);

  // Voucher Save
  const handleSave = async () => {
    if (!selectedCompany) return;
    const activeItems = items.filter((i) => i.it_code.trim() && i.tag_no.trim() && i.pcs > 0);
    if (activeItems.length === 0) {
      alert('Voucher must contain at least one valid line item with Tag No & Pcs.');
      return;
    }

    const voucherPayload = {
      company_id: selectedCompany.id,
      vch_no: vchNo,
      vch_date: vchDate,
      it_type: itType,
      print_file_name: printFileName,
      total_pcs: totalPcs,
      total_gr_wt: parseFloat(totalGrWt.toFixed(3)),
      total_ls_wt: parseFloat(totalLsWt.toFixed(3)),
      total_net_wt: parseFloat(totalNetWt.toFixed(3)),
      total_lbr_amt: parseFloat(totalLbrAmt.toFixed(2)),
      total_oth_amt: parseFloat(totalOthAmt.toFixed(2)),
      total_mrp: parseFloat(totalMrp.toFixed(2)),
      hu_wt: huWt,
      huld2: huld2,
      huld3: huld3,
      huld4: huld4,
      employee,
      vch_desc: vchDesc,
      lable_skip: lableSkip
    };

    // Flatten items and accessories for insert payload
    const itemsPayload = activeItems.map((item) => ({
      sr: item.sr,
      it_code: item.it_code.trim(),
      tag_no: item.tag_no.trim(),
      counter: item.counter,
      design: item.design,
      size: item.size,
      huld: item.huld,
      pcs: item.pcs,
      gr_wt: item.gr_wt,
      ls_wt: item.ls_wt,
      net_wt: item.net_wt,
      lbr_percent: item.lbr_percent,
      l_type: item.l_type,
      lbr_rate: item.lbr_rate,
      lbr_amt: item.lbr_amt,
      oth_amt: item.oth_amt,
      pr_cost: item.pr_cost,
      mrp: item.mrp
    }));

    const accessoriesPayload: any[] = [];
    activeItems.forEach((item) => {
      const itemAccs = item.accessories.filter((a) => a.it_code.trim());
      itemAccs.forEach((acc) => {
        accessoriesPayload.push({
          sr: acc.sr,
          it_code: acc.it_code.trim(),
          it_name: acc.it_name || acc.it_code,
          pcs: acc.pcs,
          kr_wt: acc.kr_wt,
          kr_ls_percent: acc.kr_ls_percent,
          weight: acc.weight,
          con_percent: acc.con_percent,
          pw: acc.pw,
          rate: acc.rate,
          it_amt: acc.it_amt,
          pa_amt: acc.pa_amt,
          net_amt: acc.net_amt
        });
      });
    });

    try {
      if (activeVoucherId) {
        await updateVoucher(
          { id: activeVoucherId, ...voucherPayload },
          itemsPayload,
          accessoriesPayload
        );
        alert('Opening Stock Voucher updated successfully.');
      } else {
        await createVoucher(voucherPayload, itemsPayload, accessoriesPayload);
        alert('Opening Stock Voucher created successfully.');
      }
      handleNew();
    } catch (e: any) {
      alert(`Error saving stock: ${e.message || e}`);
    }
  };

  const handleNew = () => {
    setActiveVoucherId(null);
    setEmployee('');
    setVchDesc('');
    setLableSkip(0);
    setHuWt(0);
    setHuld2(0);
    setHuld3(0);
    setHuld4(0);
    resetGrids();
    generateNextVchNo();
  };

  const handleCancel = () => {
    if (activeVoucherId) {
      const v = vouchers.find((x) => x.id === activeVoucherId);
      if (v) loadVoucherIntoFields(v);
    } else {
      handleNew();
    }
  };

  const handleDelete = async () => {
    if (!activeVoucherId) return;
    if (confirm(`CAUTION: Permanently delete Tag Opening Voucher #${vchNo}? This will remove corresponding inventory tags.`)) {
      try {
        await deleteVoucher(activeVoucherId);
        alert('Voucher deleted successfully.');
        handleNew();
      } catch (e) {
        alert('Error deleting voucher.');
      }
    }
  };

  const handleExit = () => {
    if (activeTabId) {
      closeTab(activeTabId);
    }
  };

  // Navigation functions
  const loadVoucherIntoFields = (v: TagOpeningVoucher) => {
    setActiveVoucherId(v.id);
    setVchNo(v.vch_no);
    setVchDate(v.vch_date);
    setItType(v.it_type);
    setPrintFileName(v.print_file_name);
    setEmployee(v.employee || '');
    setVchDesc(v.vch_desc || '');
    setLableSkip(v.lable_skip || 0);
    setHuWt(v.hu_wt || 0);
    setHuld2(v.huld2 || 0);
    setHuld3(v.huld3 || 0);
    setHuld4(v.huld4 || 0);

    // Reconstruct items with accessories map
    const newItems: LocalItem[] = (v.items || []).map((item) => {
      // Find accessories matching item sr (or code matching if sr is different, let's filter by it_code if items link)
      // Since it_code links item codes, let's link by item's accessories
      // Let's filter accessories by voucher and item code
      const itemAccs = (v.accessories || []).filter((a) => a.it_code === item.it_code || a.sr === item.sr);
      const padded = [...itemAccs];
      while (padded.length < 3) {
        padded.push({ sr: padded.length + 1, it_code: '', it_name: '', pcs: 0, kr_wt: 0, kr_ls_percent: 0, weight: 0, con_percent: 0, pw: 'W', rate: 0, it_amt: 0, pa_amt: 0, net_amt: 0 } as any);
      }

      return {
        sr: item.sr,
        it_code: item.it_code,
        tag_no: item.tag_no,
        counter: item.counter || '001',
        design: item.design || '',
        size: item.size || '',
        huld: item.huld || '',
        pcs: item.pcs,
        gr_wt: item.gr_wt,
        ls_wt: item.ls_wt,
        net_wt: item.net_wt,
        lbr_percent: item.lbr_percent || 0,
        l_type: item.l_type || 'G',
        lbr_rate: item.lbr_rate || 0,
        lbr_amt: item.lbr_amt || 0,
        oth_amt: item.oth_amt || 0,
        pr_cost: item.pr_cost || 0,
        mrp: item.mrp || 0,
        accessories: padded
      };
    });

    while (newItems.length < 5) {
      newItems.push({
        sr: newItems.length + 1,
        it_code: '',
        tag_no: '',
        counter: '001',
        design: '',
        size: '',
        huld: '',
        pcs: 0,
        gr_wt: 0,
        ls_wt: 0,
        net_wt: 0,
        lbr_percent: 0,
        l_type: 'G',
        lbr_rate: 0,
        lbr_amt: 0,
        oth_amt: 0,
        pr_cost: 0,
        mrp: 0,
        accessories: [
          { sr: 1, it_code: '', it_name: '', pcs: 0, kr_wt: 0, kr_ls_percent: 0, weight: 0, con_percent: 0, pw: 'W', rate: 0, it_amt: 0, pa_amt: 0, net_amt: 0 },
          { sr: 2, it_code: '', it_name: '', pcs: 0, kr_wt: 0, kr_ls_percent: 0, weight: 0, con_percent: 0, pw: 'W', rate: 0, it_amt: 0, pa_amt: 0, net_amt: 0 },
          { sr: 3, it_code: '', it_name: '', pcs: 0, kr_wt: 0, kr_ls_percent: 0, weight: 0, con_percent: 0, pw: 'W', rate: 0, it_amt: 0, pa_amt: 0, net_amt: 0 }
        ]
      });
    }

    setItems(newItems);
    setSelectedItemIndex(0);
  };

  const handlePrev = () => {
    if (vouchers.length === 0) return;
    let idx = vouchers.length - 1;
    if (activeVoucherId) {
      const currIdx = vouchers.findIndex((v) => v.id === activeVoucherId);
      if (currIdx > 0) idx = currIdx - 1;
    }
    loadVoucherIntoFields(vouchers[idx]);
  };

  const handleNext = () => {
    if (vouchers.length === 0) return;
    if (activeVoucherId) {
      const currIdx = vouchers.findIndex((v) => v.id === activeVoucherId);
      if (currIdx < vouchers.length - 1) {
        loadVoucherIntoFields(vouchers[currIdx + 1]);
      } else {
        handleNew();
      }
    }
  };

  const selectedItem = items[selectedItemIndex];

  return (
    <div className="p-2 bg-background text-foreground h-full overflow-hidden flex flex-col font-sans select-none no-print transition-colors duration-200">
      
      {/* 1. VOUCHER CONFIG MASTER HEADER PANEL */}
      <div className="bg-card text-card-foreground border border-border rounded-lg p-2.5 shadow-sm grid grid-cols-12 gap-2.5 items-center shrink-0 transition-colors duration-200">
        
        {/* Header Title: Opening Stock */}
        <div className="col-span-12 flex justify-between items-center border-b border-border/60 pb-1.5 mb-1 select-none">
          <span className="text-xs font-extrabold uppercase tracking-widest text-primary font-luxury">Opening Stock</span>
          <span className="text-[9.5px] font-bold text-muted-foreground font-data">TAG OPENING VOUCHER CONTROL</span>
        </div>

        {/* Voucher Fields */}
        <div className="col-span-12 grid grid-cols-12 gap-2.5 items-center">
          
          <div className="col-span-2 flex items-center gap-1.5">
            <label className="text-[9.5px] font-bold text-muted-foreground uppercase tracking-wider whitespace-nowrap">Vch No</label>
            <div className="flex gap-1 w-full">
              <input
                type="text"
                className="w-full !px-2.5 !py-1 border border-border rounded text-center font-data font-bold text-foreground bg-card !h-8 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                value={vchNo}
                onChange={(e) => setVchNo(e.target.value)}
              />
              <button
                type="button"
                onClick={generateNextVchNo}
                className="px-2.5 bg-secondary hover:bg-secondary/80 border border-border rounded text-[10px] font-bold text-secondary-foreground flex items-center justify-center shrink-0 cursor-pointer !h-8 transition-colors shadow-sm active:scale-95"
                title="Generate next sequential number"
              >
                F1
              </button>
            </div>
          </div>

          <div className="col-span-3 flex items-center gap-1.5">
            <label className="text-[9.5px] font-bold text-muted-foreground uppercase tracking-wider whitespace-nowrap">Vch Date</label>
            <input
              type="date"
              className="w-full !px-2.5 !py-1 border border-border rounded text-xs text-foreground bg-card !h-8 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 font-bold"
              value={vchDate}
              onChange={(e) => setVchDate(e.target.value)}
            />
          </div>

          <div className="col-span-2">
            <span className="!h-8 flex items-center justify-center bg-muted/65 border border-border px-3 rounded text-[11px] font-bold text-muted-foreground font-sans uppercase shadow-sm select-none">
              {getDayOfWeek(vchDate)}
            </span>
          </div>

          <div className="col-span-2 flex items-center gap-1.5">
            <label className="text-[9.5px] font-bold text-muted-foreground uppercase tracking-wider whitespace-nowrap">It Type</label>
            <select
              className="w-full !px-2.5 !py-1 border border-border rounded text-xs text-foreground bg-card !h-8 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 font-bold cursor-pointer"
              value={itType}
              onChange={(e) => setItType(e.target.value as any)}
            >
              <option value="Gold">Gold</option>
              <option value="Silver">Silver</option>
              <option value="Diamond">Diamond</option>
              <option value="Platinum">Platinum</option>
              <option value="Loose Stones">Loose Stones</option>
              <option value="Others">Others</option>
            </select>
          </div>

          <div className="col-span-3 flex items-center gap-1.5">
            <label className="text-[9.5px] font-bold text-muted-foreground uppercase tracking-wider whitespace-nowrap leading-none">Print File Name</label>
            <select
              className="w-full !px-2.5 !py-1 border border-border rounded text-xs text-foreground bg-card !h-8 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 font-bold cursor-pointer"
              value={printFileName}
              onChange={(e) => setPrintFileName(e.target.value)}
            >
              <option value="QrPrint10">QrPrint10</option>
              <option value="TagPrint3x1">TagPrint3x1</option>
              <option value="TagPrint2x1">TagPrint2x1</option>
            </select>
            <button
              type="button"
              className="px-3 !h-8 bg-primary hover:bg-primary/95 text-primary-foreground font-bold rounded border border-transparent text-[10px] uppercase tracking-wider transition-colors cursor-pointer shadow-sm active:scale-95 flex items-center justify-center shrink-0"
            >
              Set
            </button>
          </div>

        </div>

      </div>

      {/* 2. SPLIT WORKSPACE: Main Items Grid & Sub-Accessories Grid */}
      <div className="flex-1 grid grid-cols-12 gap-2 overflow-hidden min-h-[160px] py-1">
        
        {/* LEFT PANEL: Tag Opening Items Table (col-span-9) */}
        <div className="col-span-9 bg-card text-card-foreground border border-border rounded-lg shadow-sm flex flex-col overflow-hidden min-h-[160px] transition-colors duration-200">
          
          <div className="bg-secondary/40 px-3 py-1 border-b border-border flex justify-between items-center shrink-0">
            <span className="text-[10px] font-bold uppercase tracking-wider font-luxury text-foreground/80">Tag Opening Details List</span>
            <button
              onClick={insertMainRow}
              className="flex items-center gap-1 px-2.5 py-1 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-[10px] uppercase tracking-wider rounded transition-all cursor-pointer shadow-sm"
            >
              <Plus className="h-3 w-3" />
              <span>Insert Line</span>
            </button>
          </div>

          {/* Spreadsheet-like Table Grid */}
          <div className="flex-1 overflow-auto bg-card">
            <table className="w-full border-collapse text-left text-xs ag-grid-dense-table select-text">
              <thead>
                <tr className="sticky top-0 z-20 bg-muted/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-border">
                  <th className="w-10 text-center px-1.5 py-2 text-[10px] font-extrabold text-foreground/80 uppercase tracking-wider border-r border-border/40">Sr</th>
                  <th className="w-20 text-left px-1.5 py-2 text-[10px] font-extrabold text-foreground/80 uppercase tracking-wider border-r border-border/40">ItCode</th>
                  <th className="w-24 text-left px-1.5 py-2 text-[10px] font-extrabold text-foreground/80 uppercase tracking-wider border-r border-border/40">TagNo</th>
                  <th className="w-12 text-center px-1.5 py-2 text-[10px] font-extrabold text-foreground/80 uppercase tracking-wider border-r border-border/40">Counter</th>
                  <th className="text-left px-1.5 py-2 text-[10px] font-extrabold text-foreground/80 uppercase tracking-wider border-r border-border/40">Design / Description</th>
                  <th className="w-10 text-center px-1.5 py-2 text-[10px] font-extrabold text-foreground/80 uppercase tracking-wider border-r border-border/40">Size</th>
                  <th className="w-16 text-left px-1.5 py-2 text-[10px] font-extrabold text-foreground/80 uppercase tracking-wider border-r border-border/40">Huld</th>
                  <th className="w-10 text-center px-1.5 py-2 text-[10px] font-extrabold text-foreground/80 uppercase tracking-wider border-r border-border/40">Pcs</th>
                  <th className="w-14 text-right px-1.5 py-2 text-[10px] font-extrabold text-foreground/80 uppercase tracking-wider border-r border-border/40">GrWt</th>
                  <th className="w-14 text-right px-1.5 py-2 text-[10px] font-extrabold text-foreground/80 uppercase tracking-wider border-r border-border/40">LsWt</th>
                  <th className="w-14 text-right px-1.5 py-2 text-[10px] font-extrabold text-foreground/80 uppercase tracking-wider border-r border-border/40">NetWt</th>
                  <th className="w-12 text-right px-1.5 py-2 text-[10px] font-extrabold text-foreground/80 uppercase tracking-wider border-r border-border/40">Lbr%</th>
                  <th className="w-12 text-center px-1.5 py-2 text-[10px] font-extrabold text-foreground/80 uppercase tracking-wider border-r border-border/40">LType</th>
                  <th className="w-14 text-right px-1.5 py-2 text-[10px] font-extrabold text-foreground/80 uppercase tracking-wider border-r border-border/40">LbrRate</th>
                  <th className="w-16 text-right px-1.5 py-2 text-[10px] font-extrabold text-foreground/80 uppercase tracking-wider border-r border-border/40">LbrAmt</th>
                  <th className="w-14 text-right px-1.5 py-2 text-[10px] font-extrabold text-foreground/80 uppercase tracking-wider border-r border-border/40">OthAmt</th>
                  <th className="w-16 text-right px-1.5 py-2 text-[10px] font-extrabold text-foreground/80 uppercase tracking-wider border-r border-border/40">PrCost</th>
                  <th className="w-18 text-right px-1.5 py-2 text-[10px] font-extrabold text-foreground/80 uppercase tracking-wider border-r border-border/40">Mrp</th>
                  <th className="w-10 text-center px-1.5 py-2 text-[10px] font-extrabold text-foreground/80 uppercase tracking-wider">Del</th>
                </tr>
              </thead>
              <tbody className="font-semibold text-foreground font-data">
                {items.map((row, idx) => {
                  const isSelected = selectedItemIndex === idx;
                  return (
                    <tr 
                      key={idx}
                      onClick={() => setSelectedItemIndex(idx)}
                      className={`border-b border-border/45 transition-colors h-7 ${
                        isSelected 
                          ? 'bg-primary/10 border-l-[3px] border-l-primary font-bold' 
                          : 'hover:bg-muted/50'
                      }`}
                    >
                      {/* Sr */}
                      <td className="text-center font-data text-muted-foreground/60 bg-muted/25 dark:bg-slate-900/35 px-1.5 py-1 border-r border-border/40 h-7 select-none text-[11px]">{row.sr}</td>
                      
                      {/* ItCode */}
                      <td className="p-0 border-r border-border/40 h-7">
                        <input
                          type="text"
                          placeholder="e.g. TP916"
                          className="!bg-transparent !border-none !shadow-none !h-7 !py-0.5 !px-1.5 text-[11.5px] font-bold focus:outline-none w-full uppercase select-text text-foreground placeholder:text-muted-foreground/35 focus:!ring-0"
                          value={row.it_code}
                          onChange={(e) => handleMainCellChange(idx, 'it_code', e.target.value)}
                        />
                      </td>

                      {/* TagNo */}
                      <td className="p-0 border-r border-border/40 h-7">
                        <input
                          type="text"
                          placeholder="e.g. TPG00001"
                          className="!bg-transparent !border-none !shadow-none !h-7 !py-0.5 !px-1.5 text-[11.5px] font-data focus:outline-none w-full select-text text-foreground placeholder:text-muted-foreground/35 focus:!ring-0"
                          value={row.tag_no}
                          onChange={(e) => handleMainCellChange(idx, 'tag_no', e.target.value)}
                        />
                      </td>

                      {/* Counter */}
                      <td className="p-0 border-r border-border/40 h-7 text-center">
                        <input
                          type="text"
                          className="!bg-transparent !border-none !shadow-none !h-7 !py-0.5 !px-1.5 text-[11.5px] font-data text-center focus:outline-none w-full select-text text-foreground focus:!ring-0"
                          value={row.counter}
                          onChange={(e) => handleMainCellChange(idx, 'counter', e.target.value)}
                        />
                      </td>

                      {/* Design */}
                      <td className="p-0 border-r border-border/40 h-7">
                        <input
                          type="text"
                          placeholder="Ornament details..."
                          className="!bg-transparent !border-none !shadow-none !h-7 !py-0.5 !px-1.5 text-[11.5px] font-sans focus:outline-none w-full select-text text-foreground placeholder:text-muted-foreground/35 focus:!ring-0"
                          value={row.design}
                          onChange={(e) => handleMainCellChange(idx, 'design', e.target.value)}
                        />
                      </td>

                      {/* Size */}
                      <td className="p-0 border-r border-border/40 h-7 text-center">
                        <input
                          type="text"
                          className="!bg-transparent !border-none !shadow-none !h-7 !py-0.5 !px-1.5 text-[11.5px] font-data text-center focus:outline-none w-full select-text text-foreground focus:!ring-0"
                          value={row.size}
                          onChange={(e) => handleMainCellChange(idx, 'size', e.target.value)}
                        />
                      </td>

                      {/* Huld */}
                      <td className="p-0 border-r border-border/40 h-7">
                        <input
                          type="text"
                          className="!bg-transparent !border-none !shadow-none !h-7 !py-0.5 !px-1.5 text-[11.5px] font-data focus:outline-none w-full select-text text-foreground focus:!ring-0"
                          value={row.huld}
                          onChange={(e) => handleMainCellChange(idx, 'huld', e.target.value)}
                        />
                      </td>

                      {/* Pcs */}
                      <td className="p-0 border-r border-border/40 h-7 text-center font-data">
                        <input
                          type="number"
                          className="!bg-transparent !border-none !shadow-none !h-7 !py-0.5 !px-1.5 text-[11.5px] font-data text-center focus:outline-none w-full select-text text-foreground focus:!ring-0"
                          value={row.pcs || ''}
                          onChange={(e) => handleMainCellChange(idx, 'pcs', e.target.value)}
                        />
                      </td>

                      {/* GrWt */}
                      <td className="p-0 border-r border-border/40 h-7 text-right font-data">
                        <input
                          type="number"
                          step="0.001"
                          placeholder="0.000"
                          className="!bg-transparent !border-none !shadow-none !h-7 !py-0.5 !px-1.5 text-[11.5px] font-data text-right focus:outline-none w-full select-text text-foreground placeholder:text-muted-foreground/35 focus:!ring-0"
                          value={row.gr_wt || ''}
                          onChange={(e) => handleMainCellChange(idx, 'gr_wt', e.target.value)}
                        />
                      </td>

                      {/* LsWt (Read-Only) */}
                      <td className="px-1.5 py-1 border-r border-border/40 text-right font-data text-muted-foreground bg-muted/10 dark:bg-slate-900/10 text-[11px] h-7">
                        {row.ls_wt > 0 ? row.ls_wt.toFixed(3) : '-'}
                      </td>

                      {/* NetWt (Read-Only) */}
                      <td className="px-1.5 py-1 border-r border-border/40 text-right font-data text-foreground font-bold bg-muted/20 dark:bg-slate-900/20 text-[11px] h-7">
                        {row.net_wt > 0 ? row.net_wt.toFixed(3) : '-'}
                      </td>

                      {/* Lbr% */}
                      <td className="p-0 border-r border-border/40 h-7 text-right font-data">
                        <input
                          type="number"
                          step="0.01"
                          className="!bg-transparent !border-none !shadow-none !h-7 !py-0.5 !px-1.5 text-[11.5px] font-data text-right focus:outline-none w-full select-text text-foreground focus:!ring-0"
                          value={row.lbr_percent || ''}
                          onChange={(e) => handleMainCellChange(idx, 'lbr_percent', e.target.value)}
                        />
                      </td>

                      {/* LType */}
                      <td className="p-0 border-r border-border/40 h-7 text-center">
                        <select
                          className="!bg-transparent !border-none !shadow-none !h-7 !p-0 text-[11px] font-bold focus:outline-none cursor-pointer text-foreground text-center focus:!ring-0"
                          value={row.l_type}
                          onChange={(e) => handleMainCellChange(idx, 'l_type', e.target.value)}
                        >
                          <option value="G">G</option>
                          <option value="F">F</option>
                          <option value="P">P</option>
                        </select>
                      </td>

                      {/* LbrRate */}
                      <td className="p-0 border-r border-border/40 h-7 text-right font-data">
                        <input
                          type="number"
                          step="0.01"
                          className="!bg-transparent !border-none !shadow-none !h-7 !py-0.5 !px-1.5 text-[11.5px] font-data text-right focus:outline-none w-full select-text text-foreground focus:!ring-0"
                          value={row.lbr_rate || ''}
                          onChange={(e) => handleMainCellChange(idx, 'lbr_rate', e.target.value)}
                        />
                      </td>

                      {/* LbrAmt (Read-Only) */}
                      <td className="px-1.5 py-1 border-r border-border/40 text-right font-data text-muted-foreground bg-muted/10 dark:bg-slate-900/10 text-[11px] h-7">
                        {row.lbr_amt > 0 ? `₹${row.lbr_amt.toLocaleString()}` : '-'}
                      </td>

                      {/* OthAmt (Read-Only) */}
                      <td className="px-1.5 py-1 border-r border-border/40 text-right font-data text-muted-foreground bg-muted/10 dark:bg-slate-900/10 text-[11px] h-7">
                        {row.oth_amt > 0 ? `₹${row.oth_amt.toLocaleString()}` : '-'}
                      </td>

                      {/* PrCost */}
                      <td className="p-0 border-r border-border/40 h-7 text-right font-data">
                        <input
                          type="number"
                          step="0.01"
                          className="!bg-transparent !border-none !shadow-none !h-7 !py-0.5 !px-1.5 text-[11.5px] font-data text-right focus:outline-none w-full select-text text-foreground focus:!ring-0"
                          value={row.pr_cost || ''}
                          onChange={(e) => handleMainCellChange(idx, 'pr_cost', e.target.value)}
                        />
                      </td>

                      {/* Mrp */}
                      <td className="p-0 border-r border-border/40 h-7 text-right font-data">
                        <input
                          type="number"
                          step="0.01"
                          className="!bg-transparent !border-none !shadow-none !h-7 !py-0.5 !px-1.5 text-[11.5px] font-data text-right focus:outline-none w-full select-text text-foreground focus:!ring-0"
                          value={row.mrp || ''}
                          onChange={(e) => handleMainCellChange(idx, 'mrp', e.target.value)}
                        />
                      </td>

                      {/* Del */}
                      <td className="text-center font-sans h-7">
                        <button
                          type="button"
                          onClick={() => removeMainRow(idx)}
                          className="text-xs text-destructive hover:text-destructive/85 font-bold p-0.5 hover:bg-destructive/10 rounded cursor-pointer transition-all flex items-center justify-center mx-auto"
                          title="Remove line"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Aggregates Totals bar in layout */}
          <div className="bg-secondary/60 text-secondary-foreground p-2.5 flex justify-between items-center text-xs font-bold font-data border-t border-border shrink-0 transition-colors duration-200">
            <span className="uppercase tracking-widest text-primary font-luxury font-bold">Vch Totals:</span>
            <div className="flex gap-5 text-right font-semibold">
              <div>
                <span className="text-[9px] text-muted-foreground block uppercase font-bold">Total Pcs</span>
                <span className="text-foreground">{totalPcs}</span>
              </div>
              <div className="border-l border-border pl-4">
                <span className="text-[9px] text-muted-foreground block uppercase font-bold">Gr Wt</span>
                <span className="text-foreground">{totalGrWt.toFixed(3)}g</span>
              </div>
              <div className="border-l border-border pl-4">
                <span className="text-[9px] text-muted-foreground block uppercase font-bold">Ls Wt</span>
                <span className="text-foreground">{totalLsWt.toFixed(3)}g</span>
              </div>
              <div className="border-l border-border pl-4">
                <span className="text-[9px] text-muted-foreground block uppercase font-bold">Net Wt</span>
                <span className="text-primary font-bold">{totalNetWt.toFixed(3)}g</span>
              </div>
              <div className="border-l border-border pl-4">
                <span className="text-[9px] text-muted-foreground block uppercase font-bold">Lbr Amt</span>
                <span className="text-foreground">₹{totalLbrAmt.toLocaleString()}</span>
              </div>
              <div className="border-l border-border pl-4">
                <span className="text-[9px] text-muted-foreground block uppercase font-bold">Oth Amt</span>
                <span className="text-foreground">₹{totalOthAmt.toLocaleString()}</span>
              </div>
              <div className="border-l border-border pl-4">
                <span className="text-[9px] text-muted-foreground block uppercase font-bold">Total MRP</span>
                <span className="text-primary font-bold">₹{totalMrp.toLocaleString()}</span>
              </div>
            </div>
          </div>

        </div>

        {/* RIGHT PANEL: Accessory breakdown sub-table & Image preview mockup (col-span-3) */}
        <div className="col-span-3 bg-card text-card-foreground border border-border rounded-lg shadow-sm flex flex-col overflow-hidden min-h-[160px] transition-colors duration-200">
          
          {/* Main header for the detail side */}
          <div className="bg-secondary/40 px-3 py-1 border-b border-border flex justify-between items-center shrink-0">
            <span className="text-[10px] font-bold uppercase tracking-wider font-luxury text-foreground/80">Accessory Breakdown</span>
            <span className="text-[9px] font-data text-muted-foreground">SR: {selectedItem ? selectedItem.sr : '-'}</span>
          </div>

          <div className="p-2 border-b border-border/60 bg-muted/20 flex justify-between items-center shrink-0">
            <span className="text-[10px] text-muted-foreground font-bold uppercase select-none">Accessories details</span>
            <button
              type="button"
              onClick={insertAccessoryRow}
              className="px-2.5 py-0.5 bg-secondary hover:bg-secondary/80 text-secondary-foreground font-bold text-[9px] uppercase tracking-wider rounded border border-border cursor-pointer transition-colors"
            >
              + Add
            </button>
          </div>

          {/* Accessory Grid */}
          <div className="flex-1 overflow-y-auto bg-card">
            {selectedItem ? (
              <table className="w-full border-collapse text-left text-xs ag-grid-dense-table select-text">
                <thead>
                  <tr className="bg-muted/80 dark:bg-slate-900/80 border-b border-border">
                    <th className="w-8 text-center p-1.5 text-[9.5px] font-extrabold text-foreground/80 uppercase font-sans border-r border-border/40">Sr</th>
                    <th className="w-16 p-1.5 text-[9.5px] font-extrabold text-foreground/80 uppercase font-sans border-r border-border/40">Code</th>
                    <th className="p-1.5 text-[9.5px] font-extrabold text-foreground/80 uppercase font-sans border-r border-border/40">ItName</th>
                    <th className="w-12 text-right p-1.5 text-[9.5px] font-extrabold text-foreground/80 uppercase font-sans border-r border-border/40">Wt/Pcs</th>
                    <th className="w-12 text-center p-1.5 text-[9.5px] font-extrabold text-foreground/80 uppercase font-sans border-r border-border/40">P/W</th>
                    <th className="w-14 text-right p-1.5 text-[9.5px] font-extrabold text-foreground/80 uppercase font-sans border-r border-border/40">Rate</th>
                    <th className="w-16 text-right p-1.5 text-[9.5px] font-extrabold text-foreground/80 uppercase font-sans">NetAmt</th>
                  </tr>
                </thead>
                <tbody className="font-semibold text-foreground font-data">
                  {selectedItem.accessories.map((acc, accIdx) => (
                    <tr key={accIdx} className="hover:bg-muted/40 border-b border-border/40 h-7">
                      <td className="text-center text-muted-foreground/60 bg-muted/25 dark:bg-slate-900/35 px-1 py-1 border-r border-border/40 h-7 select-none text-[10.5px]">{acc.sr}</td>
                      <td className="p-0 border-r border-border/40 h-7">
                        <input
                          type="text"
                          placeholder="e.g. HM"
                          className="!bg-transparent !border-none !shadow-none !h-7 !py-0.5 !px-1.5 text-[10.5px] font-bold focus:outline-none w-full uppercase select-text text-foreground placeholder:text-muted-foreground/35 focus:!ring-0"
                          value={acc.it_code}
                          onChange={(e) => handleAccessoryCellChange(accIdx, 'it_code', e.target.value)}
                        />
                      </td>
                      <td className="p-0 border-r border-border/40 h-7">
                        <input
                          type="text"
                          placeholder="Moti, Beads..."
                          className="!bg-transparent !border-none !shadow-none !h-7 !py-0.5 !px-1.5 text-[10.5px] font-sans focus:outline-none w-full select-text text-foreground placeholder:text-muted-foreground/35 focus:!ring-0"
                          value={acc.it_name || ''}
                          onChange={(e) => handleAccessoryCellChange(accIdx, 'it_name', e.target.value)}
                        />
                      </td>
                      <td className="p-0 border-r border-border/40 h-7 text-right font-data">
                        <input
                          type="number"
                          step="0.001"
                          placeholder="0.00"
                          className="!bg-transparent !border-none !shadow-none !h-7 !py-0.5 !px-1.5 text-[10.5px] font-data text-right focus:outline-none w-full select-text text-foreground placeholder:text-muted-foreground/35 focus:!ring-0"
                          value={acc.pw === 'P' ? (acc.pcs || '') : (acc.weight || '')}
                          onChange={(e) => handleAccessoryCellChange(accIdx, acc.pw === 'P' ? 'pcs' : 'weight', e.target.value)}
                        />
                      </td>
                      <td className="p-0 border-r border-border/40 h-7 text-center">
                        <select
                          className="!bg-transparent !border-none !shadow-none !h-7 !p-0 text-[10.5px] font-bold focus:outline-none cursor-pointer text-foreground text-center focus:!ring-0"
                          value={acc.pw}
                          onChange={(e) => handleAccessoryCellChange(accIdx, 'pw', e.target.value)}
                        >
                          <option value="W">W</option>
                          <option value="P">P</option>
                        </select>
                      </td>
                      <td className="p-0 border-r border-border/40 h-7 text-right font-data">
                        <input
                          type="number"
                          step="0.01"
                          className="!bg-transparent !border-none !shadow-none !h-7 !py-0.5 !px-1.5 text-[10.5px] font-data text-right focus:outline-none w-full select-text text-foreground focus:!ring-0"
                          value={acc.rate || ''}
                          onChange={(e) => handleAccessoryCellChange(accIdx, 'rate', e.target.value)}
                        />
                      </td>
                      <td className="px-1.5 py-1 text-right font-data text-foreground bg-muted/10 dark:bg-slate-900/10 text-[10.5px] h-7">
                        {(acc.net_amt || 0) > 0 ? `₹${(acc.net_amt || 0).toLocaleString()}` : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="p-8 text-center text-muted-foreground italic select-none">
                Select an item row on the left to edit accessories.
              </div>
            )}
          </div>

          {/* Right bottom image mock block */}
          <div className="p-3 bg-muted/20 border-t border-border flex flex-col items-center select-none shrink-0">
            <div className="w-full h-32 border border-border bg-muted/40 flex flex-col items-center justify-center relative overflow-hidden rounded-lg shadow-inner">
              <span className="text-[10px] font-sans font-bold text-muted-foreground uppercase tracking-widest block mb-1">Tag Product Image</span>
              <span className="text-[8px] font-sans text-muted-foreground/65 font-bold block">(SKIPPED IN SCHEMA)</span>
            </div>
            <div className="flex w-full mt-2 gap-1 bg-card border border-border p-1 rounded-md shadow-sm">
              <button type="button" className="flex-1 py-1 hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center rounded transition-colors cursor-pointer" title="Capture Image">
                <Camera className="h-4 w-4" />
              </button>
              <button type="button" className="flex-1 py-1 hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center rounded transition-colors cursor-pointer" title="Select File">
                <ImageIcon className="h-4 w-4" />
              </button>
              <button type="button" className="flex-1 py-1 hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center rounded transition-colors cursor-pointer" title="Crop Image">
                <Scissors className="h-4 w-4" />
              </button>
            </div>
          </div>

        </div>

      </div>

      {/* 3. FOOTER HUIDS & BOTTOM NARRATION BAR */}
      <div className="bg-card text-card-foreground border border-border rounded-lg p-3 shadow-sm space-y-3 shrink-0 select-none mt-2 transition-colors duration-200">
        
        {/* HUID weights */}
        <div className="grid grid-cols-12 gap-3 items-center text-xs font-bold font-data">
          
          <div className="col-span-3 flex items-center gap-1.5">
            <span className="text-[9.5px] font-bold text-muted-foreground uppercase tracking-wider w-12 text-right pr-1.5 block">HuWt</span>
            <input
              type="number"
              step="0.001"
              placeholder="0.000"
              className="w-full !px-2.5 !py-1 border border-border rounded text-right font-data text-foreground bg-card !h-8 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
              value={huWt || ''}
              onChange={(e) => setHuWt(parseFloat(e.target.value) || 0.0)}
            />
          </div>

          <div className="col-span-3 flex items-center gap-1.5">
            <span className="text-[9.5px] font-bold text-muted-foreground uppercase tracking-wider w-12 text-right pr-1.5 block">Huld2</span>
            <input
              type="number"
              step="0.001"
              placeholder="0.000"
              className="w-full !px-2.5 !py-1 border border-border rounded text-right font-data text-foreground bg-card !h-8 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
              value={huld2 || ''}
              onChange={(e) => setHuld2(parseFloat(e.target.value) || 0.0)}
            />
          </div>

          <div className="col-span-3 flex items-center gap-1.5">
            <span className="text-[9.5px] font-bold text-muted-foreground uppercase tracking-wider w-12 text-right pr-1.5 block">Huld3</span>
            <input
              type="number"
              step="0.001"
              placeholder="0.000"
              className="w-full !px-2.5 !py-1 border border-border rounded text-right font-data text-foreground bg-card !h-8 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
              value={huld3 || ''}
              onChange={(e) => setHuld3(parseFloat(e.target.value) || 0.0)}
            />
          </div>

          <div className="col-span-3 flex items-center gap-1.5">
            <span className="text-[9.5px] font-bold text-muted-foreground uppercase tracking-wider w-12 text-right pr-1.5 block">Huld4</span>
            <input
              type="number"
              step="0.001"
              placeholder="0.000"
              className="w-full !px-2.5 !py-1 border border-border rounded text-right font-data text-foreground bg-card !h-8 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
              value={huld4 || ''}
              onChange={(e) => setHuld4(parseFloat(e.target.value) || 0.0)}
            />
          </div>

        </div>

        {/* Employee, Vch Desc, Label Skip */}
        <div className="grid grid-cols-12 gap-3 items-center">
          
          <div className="col-span-4 flex items-center gap-2">
            <label className="text-[9.5px] font-bold text-muted-foreground uppercase tracking-wider whitespace-nowrap">Employee</label>
            <input
              type="text"
              placeholder="Operator Name"
              className="w-full !px-2.5 !py-1 border border-border rounded text-xs text-foreground bg-card !h-8 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 font-bold"
              value={employee}
              onChange={(e) => setEmployee(e.target.value)}
            />
          </div>

          <div className="col-span-6 flex items-center gap-2">
            <label className="text-[9.5px] font-bold text-muted-foreground uppercase tracking-wider whitespace-nowrap">Vch Desc</label>
            <input
              type="text"
              placeholder="Voucher narrative / comments..."
              className="w-full !px-2.5 !py-1 border border-border rounded text-xs text-foreground bg-card !h-8 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 font-semibold"
              value={vchDesc}
              onChange={(e) => setVchDesc(e.target.value)}
            />
          </div>

          <div className="col-span-2 flex items-center gap-2">
            <label className="text-[9.5px] font-bold text-muted-foreground uppercase tracking-wider whitespace-nowrap">Lable Skip</label>
            <input
              type="number"
              className="w-full !px-2.5 !py-1 border border-border rounded text-center font-data text-foreground bg-card !h-8 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 font-bold"
              value={lableSkip || ''}
              onChange={(e) => setLableSkip(parseInt(e.target.value, 10) || 0)}
            />
          </div>

        </div>

      </div>

      {/* 4. BUTTONS TOOLBAR SECTION */}
      <div className="bg-muted/35 border border-border px-4 py-2 flex items-center justify-between shrink-0 select-none mt-2 rounded-lg transition-colors duration-200">
        <div className="flex items-center gap-1.5">
          {/* Navigation */}
          <button 
            type="button" 
            onClick={handlePrev}
            className="flex items-center justify-center p-1.5 bg-secondary hover:bg-secondary/80 text-secondary-foreground rounded text-xs transition-colors shrink-0 cursor-pointer border border-border shadow-sm !h-8 w-8 active:scale-95" 
            title="Load previous voucher"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button 
            type="button" 
            onClick={handleNext}
            className="flex items-center justify-center p-1.5 bg-secondary hover:bg-secondary/80 text-secondary-foreground rounded text-xs transition-colors shrink-0 mr-4 cursor-pointer border border-border shadow-sm !h-8 w-8 active:scale-95" 
            title="Load next voucher"
          >
            <ChevronRight className="h-4 w-4" />
          </button>

          <span className="text-[10px] font-extrabold tracking-wider text-muted-foreground uppercase">
            {activeVoucherId ? 'EDITING RECORD' : 'NEW RECORD'}
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 font-semibold">
          <button
            onClick={handleSave}
            className="flex items-center gap-1.5 px-4 !py-1 bg-primary hover:bg-primary/95 text-primary-foreground border border-transparent rounded font-semibold uppercase shadow-sm transition-all text-xs active:scale-95 cursor-pointer !h-8"
          >
            <Save className="h-3.5 w-3.5" />
            <span>Save</span>
          </button>

          <button
            onClick={handleCancel}
            className="flex items-center gap-1.5 px-4 !py-1 bg-card hover:bg-muted text-foreground border border-border hover:border-border/80 rounded font-semibold uppercase shadow-sm transition-all text-xs active:scale-95 cursor-pointer !h-8"
          >
            <Undo2 className="h-3.5 w-3.5 text-muted-foreground" />
            <span>Cancel</span>
          </button>

          <button
            onClick={handleDelete}
            disabled={!activeVoucherId}
            className="flex items-center gap-1.5 px-4 !py-1 bg-destructive/10 hover:bg-destructive/20 text-destructive border border-destructive/20 hover:border-destructive/30 rounded font-semibold uppercase shadow-sm transition-all text-xs active:scale-95 cursor-pointer disabled:opacity-40 disabled:hover:bg-destructive/10 disabled:active:scale-100 !h-8"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Delete</span>
          </button>

          <button
            onClick={handleNew}
            className="flex items-center gap-1.5 px-4 !py-1 bg-card hover:bg-muted text-foreground border border-border hover:border-border/80 rounded font-semibold uppercase shadow-sm transition-all text-xs active:scale-95 cursor-pointer !h-8"
          >
            <Plus className="h-3.5 w-3.5 text-muted-foreground" />
            <span>New</span>
          </button>

          <button
            onClick={handleExit}
            className="flex items-center gap-1.5 px-4 !py-1 bg-secondary hover:bg-secondary/80 text-secondary-foreground border border-border rounded font-semibold uppercase shadow-sm transition-all text-xs active:scale-95 cursor-pointer !h-8"
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
          <span>Fine Gold: <strong className="text-amber-100 font-data">₹{currentRates ? currentRates.gold_rate_24k.toLocaleString() : 'Not Set'}</strong></span>
          <span className="opacity-40">|</span>
          <span>Fine Silver: <strong className="text-amber-100 font-data">₹{currentRates ? currentRates.silver_rate.toLocaleString() : 'Not Set'}</strong></span>
        </div>
        <div className="flex items-center gap-2">
          <span>Rate Date: <span className="font-data text-amber-100">{currentRates ? currentRates.rate_date : new Date().toLocaleDateString()}</span></span>
          <span className="opacity-40">|</span>
          <span className="flex items-center gap-1">
            <input type="checkbox" defaultChecked className="h-3.5 w-3.5 accent-amber-650 cursor-pointer" /> Whatsapp Open
          </span>
        </div>
      </footer>

    </div>
  );
}
