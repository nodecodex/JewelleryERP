import { useEffect, useState, useRef } from 'react';
import { useCompanyStore } from '../../store/useCompanyStore';
import { usePartyStore } from '../../store/usePartyStore';
import { useRateStore } from '../../store/useRateStore';
import { useTabStore } from '../../store/useTabStore';
import { useInvoiceStore } from '../../store/useInvoiceStore';
import { useHardwareScanner } from '../../hooks/useHardwareScanner';
import type { SalesInvoice, SalesItem } from '../../../shared/ipc-api';
import {
  Plus,
  Trash2,
  Save,
  Undo2,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Printer
} from 'lucide-react';

interface LocalItem {
  sr: number;
  tag_no: string;
  it_code: string;
  ord_no: string;
  design: string;
  size: string;
  huld: string;
  pcs: number;
  gr_wt: number;
  ls_wt: number;
  net_wt: number;
  it_rate: number;
  it_amt: number;
  l_type: 'G' | 'F' | 'P';
  lbr_rate: number;
  lbr_amt: number;
  ght_amt: number;
  oth_amt: number;
  tot_amt: number;
  product_id?: string;
}

interface DiamondItem {
  sr: number;
  it_code: string;
  it_name: string;
  dm_color: string;
  dm_origin: string;
  dm_remark: string;
  dm_sf_no: string;
  pcs: number;
  weight: number;
}

interface ReturnMetalItem {
  sr: number;
  it_code: string;
  it_name: string;
  pcs: number;
  gr_wt: number;
  ls_wt: number;
  net_wt: number;
  touch: number;
  fine: number;
  rate: number;
  net_amt: number;
}

interface OrderAdjustmentItem {
  sr: number;
  ord_no: string;
  ord_amt: number;
}

type ThemeAccent = 'orange' | 'gold' | 'slate' | 'classic';

export default function SalesView() {
  const selectedCompany = useCompanyStore((state) => state.selectedCompany);
  const closeTab = useTabStore((state) => state.closeTab);
  const activeTabId = useTabStore((state) => state.activeTabId);
  const currentRates = useRateStore((state) => state.currentRates);

  const { parties, loadParties } = usePartyStore();
  const { invoices, loadInvoices, createInvoice, deleteInvoice } = useInvoiceStore();

  // Color Theme Accent
  const [themeAccent, setThemeAccent] = useState<ThemeAccent>('orange');

  // Mode & navigation
  const [activeInvoiceId, setActiveInvoiceId] = useState<string | null>(null);
  const [vchNo, setVchNo] = useState('');
  const [vchDate, setVchDate] = useState(new Date().toISOString().split('T')[0]);
  const [vchTime, setVchTime] = useState(new Date().toTimeString().split(' ')[0]);
  const [aprNo1, setAprNo1] = useState('');
  const [aprNo2, setAprNo2] = useState('');
  const [printFileName, setPrintFileName] = useState('SalesBillA4Gst');
  const [refNo, setRefNo] = useState('');
  const [partyCode, setPartyCode] = useState('');
  const [partyName, setPartyName] = useState('Walk-in Cash Customer');

  // Bottom left fields
  const [employee, setEmployee] = useState('001');
  const [employeeName, setEmployeeName] = useState('SELF');
  const [bankName, setBankName] = useState('');
  const [crDay, setCrDay] = useState(0);
  const [vchDesc, setVchDesc] = useState('');

  // Tables state
  const [items, setItems] = useState<LocalItem[]>([]);
  const [selectedItemIndex, setSelectedItemIndex] = useState<number>(0);
  const [diamondItems, setDiamondItems] = useState<{ [itemIdx: number]: DiamondItem[] }>({});
  const [returnMetals, setReturnMetals] = useState<ReturnMetalItem[]>([]);
  const [orderAdjustments, setOrderAdjustments] = useState<OrderAdjustmentItem[]>([]);

  // Right summary panel inputs
  const [discAmt, setDiscAmt] = useState(0);
  const [taxRate, setTaxRate] = useState(3.0); // GST 3% default
  const [tcsRate, setTcsRate] = useState(0.0);
  const [chequeAmt, setChequeAmt] = useState(0);
  const [chequeBank, setChequeBank] = useState('BANK A/C');
  const [cardAmt, setCardAmt] = useState(0);
  const [cardBank, setCardBank] = useState('CARD A/C');
  const [schemeAmt, setSchemeAmt] = useState(0);
  const [cashAmt, setCashAmt] = useState(0);
  const [cashPaidAmt, setCashPaidAmt] = useState(0);
  const [kasarAmt, setKasarAmt] = useState(0);

  // Fallback rates if store rates are not loaded yet (matches screenshot rate date)
  const defaultGoldRate = currentRates ? currentRates.gold_rate_22k : 53186;
  const defaultSilverRate = currentRates ? currentRates.silver_rate : 60206;

  // Time auto-updater
  useEffect(() => {
    const timer = setInterval(() => {
      if (!activeInvoiceId) {
        setVchTime(new Date().toTimeString().split(' ')[0]);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [activeInvoiceId]);

  // Load parties and invoices on company mount
  useEffect(() => {
    if (selectedCompany) {
      loadParties(selectedCompany.id);
      loadInvoices(selectedCompany.id);
    }
  }, [selectedCompany]);

  // Generate next voucher no when invoices list updates
  useEffect(() => {
    if (selectedCompany) {
      generateNextVchNo();
    }
  }, [invoices, selectedCompany]);

  // Initialize empty arrays
  useEffect(() => {
    if (items.length === 0) {
      resetGrids();
    }
  }, [activeInvoiceId]);

  useHardwareScanner((data) => {
    handleBarcodeScan(data.value);
  }, 'Sales Billing');

  const handleBarcodeScan = async (scannedValue: string) => {
    if (!selectedCompany) return;
    try {
      const prod = await (window as any).api.getProductByBarcode(selectedCompany.id, scannedValue);
      if (prod) {
        let emptyRowIdx = items.findIndex((item) => !item.it_code.trim());
        const updated = [...items];
        
        if (emptyRowIdx === -1) {
          const nextSr = items.length + 1;
          const newRow: LocalItem = {
            sr: nextSr, tag_no: '', it_code: '', ord_no: '', design: '', size: '', huld: '',
            pcs: 0, gr_wt: 0, ls_wt: 0, net_wt: 0, it_rate: 0, it_amt: 0, l_type: 'G',
            lbr_rate: 0, lbr_amt: 0, ght_amt: 0, oth_amt: 0, tot_amt: 0
          };
          updated.push(newRow);
          emptyRowIdx = updated.length - 1;
        }

        let row = { ...updated[emptyRowIdx] };
        row.tag_no = scannedValue;
        row.it_code = prod.barcode || prod.sku || '';
        row.design = prod.name;
        row.gr_wt = prod.gross_weight;
        row.ls_wt = prod.stone_weight;
        row.net_wt = prod.net_weight;
        row.pcs = 1;

        let defaultRate = prod.selling_price;
        if (defaultRate === 0 && currentRates) {
          defaultRate = prod.category.includes('Silver') ? currentRates.silver_rate / 1000 : currentRates.gold_rate_22k / 10;
        }
        row.it_rate = defaultRate;
        row.l_type = prod.making_charges_type === 'fixed' ? 'F' : 'G';
        row.lbr_rate = prod.making_charges;
        row.product_id = prod.id;

        row = calculateRowValues(row);
        updated[emptyRowIdx] = row;
        setItems(updated);

        setDiamondItems(prev => {
          const updatedDiamonds = { ...prev };
          if (!updatedDiamonds[emptyRowIdx]) {
            updatedDiamonds[emptyRowIdx] = Array.from({ length: 3 }, (_, idx) => ({
              sr: idx + 1, it_code: '', it_name: '', dm_color: '', dm_origin: '', dm_remark: '', dm_sf_no: '', pcs: 0, weight: 0
            }));
          }
          return updatedDiamonds;
        });
      } else {
        alert(`Barcode/Tag code "${scannedValue}" not found in database.`);
      }
    } catch (e) {
      console.error('Failed search in sales scan:', e);
    }
  };

  const resetGrids = () => {
    // 5 Blank main rows
    const defaultItems: LocalItem[] = Array.from({ length: 5 }, (_, idx) => ({
      sr: idx + 1,
      tag_no: '',
      it_code: '',
      ord_no: '',
      design: '',
      size: '',
      huld: '',
      pcs: 0,
      gr_wt: 0,
      ls_wt: 0,
      net_wt: 0,
      it_rate: 0,
      it_amt: 0,
      l_type: 'G',
      lbr_rate: 0,
      lbr_amt: 0,
      ght_amt: 0,
      oth_amt: 0,
      tot_amt: 0
    }));
    setItems(defaultItems);
    setSelectedItemIndex(0);

    // Diamond details (3 default blank rows per main item index)
    const initialDiamonds: { [key: number]: DiamondItem[] } = {};
    for (let i = 0; i < 10; i++) { // initialize for up to 10 rows
      initialDiamonds[i] = Array.from({ length: 3 }, (_, idx) => ({
        sr: idx + 1,
        it_code: '',
        it_name: '',
        dm_color: '',
        dm_origin: '',
        dm_remark: '',
        dm_sf_no: '',
        pcs: 0,
        weight: 0
      }));
    }
    setDiamondItems(initialDiamonds);

    // Return metals details (3 default blank rows)
    const defaultReturns: ReturnMetalItem[] = Array.from({ length: 3 }, (_, idx) => ({
      sr: idx + 1,
      it_code: '',
      it_name: '',
      pcs: 0,
      gr_wt: 0,
      ls_wt: 0,
      net_wt: 0,
      touch: 0,
      fine: 0,
      rate: 0,
      net_amt: 0
    }));
    setReturnMetals(defaultReturns);

    // Order adjustments details (3 default blank rows)
    const defaultOrders: OrderAdjustmentItem[] = Array.from({ length: 3 }, (_, idx) => ({
      sr: idx + 1,
      ord_no: '',
      ord_amt: 0
    }));
    setOrderAdjustments(defaultOrders);
  };

  const generateNextVchNo = () => {
    if (invoices.length === 0) {
      setVchNo('00001');
      return;
    }
    const sorted = [...invoices].sort((a, b) => b.invoice_number.localeCompare(a.invoice_number));
    const lastNum = parseInt(sorted[0].invoice_number, 10) || 0;
    const nextNum = lastNum + 1;
    setVchNo(String(nextNum).padStart(5, '0'));
  };

  const getDayOfWeek = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { weekday: 'long' });
  };

  const handlePartySelect = (code: string) => {
    setPartyCode(code);
    const p = parties.find((party) => party.code === code);
    if (p) {
      setPartyName(p.name);
    } else {
      setPartyName('Walk-in Cash Customer');
    }
  };

  // Auto computations for Primary Grid
  const calculateRowValues = (row: LocalItem) => {
    const netWt = Math.max(0, row.gr_wt - row.ls_wt);
    const itAmt = netWt * row.it_rate;

    let lbrAmt = 0;
    if (row.l_type === 'G') {
      lbrAmt = netWt * row.lbr_rate;
    } else if (row.l_type === 'P') {
      lbrAmt = row.pcs * row.lbr_rate;
    } else {
      lbrAmt = row.lbr_rate;
    }

    const totAmt = itAmt + lbrAmt + (row.ght_amt || 0.0) + (row.oth_amt || 0.0);

    return {
      ...row,
      net_wt: parseFloat(netWt.toFixed(3)),
      it_amt: parseFloat(itAmt.toFixed(2)),
      lbr_amt: parseFloat(lbrAmt.toFixed(2)),
      tot_amt: parseFloat(totAmt.toFixed(2))
    };
  };

  const handleMainCellChange = (index: number, field: keyof LocalItem, val: any) => {
    const updated = [...items];
    let row = { ...updated[index] };

    if (field === 'pcs') {
      row.pcs = parseInt(val, 10) || 0;
    } else if (['gr_wt', 'ls_wt', 'it_rate', 'lbr_rate', 'ght_amt', 'oth_amt'].includes(field)) {
      (row as any)[field] = parseFloat(val) || 0.0;
    } else {
      (row as any)[field] = val;
    }

    row = calculateRowValues(row);
    updated[index] = row;
    setItems(updated);

    if (field === 'tag_no' && val.trim() && selectedCompany) {
      (window as any).api.getProductByBarcode(selectedCompany.id, val.trim()).then((prod: any) => {
        if (prod) {
          const freshUpdated = [...updated];
          let freshRow = { ...freshUpdated[index] };
          freshRow.tag_no = val;
          freshRow.it_code = prod.barcode || prod.sku || '';
          freshRow.design = prod.name;
          freshRow.gr_wt = prod.gross_weight;
          freshRow.ls_wt = prod.stone_weight;
          freshRow.net_wt = prod.net_weight;
          freshRow.pcs = 1;
          
          let defaultRate = prod.selling_price;
          if (defaultRate === 0 && currentRates) {
            defaultRate = prod.category.includes('Silver') ? currentRates.silver_rate / 1000 : currentRates.gold_rate_22k / 10;
          }
          freshRow.it_rate = defaultRate;
          freshRow.l_type = prod.making_charges_type === 'fixed' ? 'F' : 'G';
          freshRow.lbr_rate = prod.making_charges;
          freshRow.product_id = prod.id;
          
          freshRow = calculateRowValues(freshRow);
          freshUpdated[index] = freshRow;
          setItems(freshUpdated);
        }
      }).catch(console.error);
    }
  };

  // Auto computations for Returns Grid
  const calculateReturnValues = (row: ReturnMetalItem) => {
    const netWt = Math.max(0, row.gr_wt - row.ls_wt);
    const fine = netWt * (row.touch / 100);
    const netAmt = fine * row.rate;

    return {
      ...row,
      net_wt: parseFloat(netWt.toFixed(3)),
      fine: parseFloat(fine.toFixed(3)),
      net_amt: parseFloat(netAmt.toFixed(2))
    };
  };

  const handleReturnCellChange = (index: number, field: keyof ReturnMetalItem, val: any) => {
    const updated = [...returnMetals];
    let row = { ...updated[index] };

    if (field === 'pcs') {
      row.pcs = parseInt(val, 10) || 0;
    } else if (['gr_wt', 'ls_wt', 'touch', 'rate'].includes(field)) {
      (row as any)[field] = parseFloat(val) || 0.0;
    } else {
      (row as any)[field] = val;
    }

    row = calculateReturnValues(row);
    updated[index] = row;
    setReturnMetals(updated);
  };

  const handleDiamondCellChange = (itemIndex: number, dmIdx: number, field: keyof DiamondItem, val: any) => {
    const updatedMap = { ...diamondItems };
    const list = [...(updatedMap[itemIndex] || [])];
    const row = { ...list[dmIdx] };

    if (field === 'pcs') {
      row.pcs = parseInt(val, 10) || 0;
    } else if (field === 'weight') {
      row.weight = parseFloat(val) || 0.0;
    } else {
      (row as any)[field] = val;
    }

    list[dmIdx] = row;
    updatedMap[itemIndex] = list;
    setDiamondItems(updatedMap);
  };

  const handleOrderCellChange = (idx: number, field: keyof OrderAdjustmentItem, val: any) => {
    const updated = [...orderAdjustments];
    const row = { ...updated[idx] };
    if (field === 'ord_amt') {
      row.ord_amt = parseFloat(val) || 0.0;
    } else {
      (row as any)[field] = val;
    }
    updated[idx] = row;
    setOrderAdjustments(updated);
  };

  // Row Manipulation Actions
  const insertMainRow = () => {
    const nextSr = items.length + 1;
    const newRow: LocalItem = {
      sr: nextSr,
      tag_no: '',
      it_code: '',
      ord_no: '',
      design: '',
      size: '',
      huld: '',
      pcs: 0,
      gr_wt: 0,
      ls_wt: 0,
      net_wt: 0,
      it_rate: 0,
      it_amt: 0,
      l_type: 'G',
      lbr_rate: 0,
      lbr_amt: 0,
      ght_amt: 0,
      oth_amt: 0,
      tot_amt: 0
    };
    setItems([...items, newRow]);

    const updatedDiamonds = { ...diamondItems };
    updatedDiamonds[items.length] = Array.from({ length: 3 }, (_, idx) => ({
      sr: idx + 1,
      it_code: '',
      it_name: '',
      dm_color: '',
      dm_origin: '',
      dm_remark: '',
      dm_sf_no: '',
      pcs: 0,
      weight: 0
    }));
    setDiamondItems(updatedDiamonds);
  };

  const removeMainRow = (index: number) => {
    if (items.length <= 1) return;
    const updated = items.filter((_, idx) => idx !== index).map((row, idx) => ({ ...row, sr: idx + 1 }));
    setItems(updated);
    setSelectedItemIndex(Math.max(0, selectedItemIndex - 1));
  };

  const insertReturnRow = () => {
    const nextSr = returnMetals.length + 1;
    const newRow: ReturnMetalItem = {
      sr: nextSr,
      it_code: '',
      it_name: '',
      pcs: 0,
      gr_wt: 0,
      ls_wt: 0,
      net_wt: 0,
      touch: 0,
      fine: 0,
      rate: 0,
      net_amt: 0
    };
    setReturnMetals([...returnMetals, newRow]);
  };

  const insertOrderRow = () => {
    const nextSr = orderAdjustments.length + 1;
    const newRow: OrderAdjustmentItem = {
      sr: nextSr,
      ord_no: '',
      ord_amt: 0
    };
    setOrderAdjustments([...orderAdjustments, newRow]);
  };

  // Calculations & Totals
  const validItems = items.filter((i) => i.it_code.trim());
  const totalPcs = validItems.reduce((s, i) => s + i.pcs, 0);
  const totalGrWt = validItems.reduce((s, i) => s + i.gr_wt, 0);
  const totalLsWt = validItems.reduce((s, i) => s + i.ls_wt, 0);
  const totalNetWt = validItems.reduce((s, i) => s + i.net_wt, 0);
  const totalItAmt = validItems.reduce((s, i) => s + i.it_amt, 0);
  const totalLbrAmt = validItems.reduce((s, i) => s + i.lbr_amt, 0);
  const totalGhtAmt = validItems.reduce((s, i) => s + i.ght_amt, 0);
  const totalOthAmt = validItems.reduce((s, i) => s + i.oth_amt, 0);
  const totalTotAmt = validItems.reduce((s, i) => s + i.tot_amt, 0);

  // Return metals summary (separates Old Gold and Old Silver values by code check)
  const validReturns = returnMetals.filter((r) => r.it_code.trim());
  const returnPcs = validReturns.reduce((s, r) => s + r.pcs, 0);
  const returnGrWt = validReturns.reduce((s, r) => s + r.gr_wt, 0);
  const returnLsWt = validReturns.reduce((s, r) => s + r.ls_wt, 0);
  const returnNetWt = validReturns.reduce((s, r) => s + r.net_wt, 0);
  const returnTotalFine = validReturns.reduce((s, r) => s + r.fine, 0);
  const totalReturnAmt = validReturns.reduce((s, r) => s + r.net_amt, 0);

  // Distribute return metals into gold vs silver
  const oldGoldWt = validReturns.filter(r => r.it_code.toLowerCase().includes('gold') || r.it_code.toLowerCase().includes('g') || r.it_code.toLowerCase() === 'og').reduce((s, r) => s + r.net_wt, 0);
  const oldGoldAmt = validReturns.filter(r => r.it_code.toLowerCase().includes('gold') || r.it_code.toLowerCase().includes('g') || r.it_code.toLowerCase() === 'og').reduce((s, r) => s + r.net_amt, 0);
  
  const oldSilverWt = validReturns.filter(r => r.it_code.toLowerCase().includes('silver') || r.it_code.toLowerCase().includes('s') || r.it_code.toLowerCase() === 'os').reduce((s, r) => s + r.net_wt, 0);
  const oldSilverAmt = validReturns.filter(r => r.it_code.toLowerCase().includes('silver') || r.it_code.toLowerCase().includes('s') || r.it_code.toLowerCase() === 'os').reduce((s, r) => s + r.net_amt, 0);

  // Order Adjustments sum
  const totalOrderAdjAmt = orderAdjustments.filter(o => o.ord_no.trim()).reduce((s, o) => s + o.ord_amt, 0);

  // Accounting Ledger calculations
  const netAmt = totalTotAmt;
  const taxableAmt = Math.max(0, netAmt - discAmt);
  const taxAmt = taxableAmt * (taxRate / 100);
  const tcsAmt = (taxableAmt + taxAmt) * (tcsRate / 100);

  const rawTotal = taxableAmt + taxAmt + tcsAmt;
  const totalAmt = Math.round(rawTotal);
  const rofAmt = parseFloat((totalAmt - rawTotal).toFixed(2));

  // Payments aggregates and outstanding
  const totalPaid = chequeAmt + cardAmt + totalOrderAdjAmt + oldGoldAmt + oldSilverAmt + schemeAmt + cashAmt + kasarAmt - cashPaidAmt;
  const osAmt = Math.max(0, totalAmt - totalPaid);

  // Save voucher details
  const handleSave = async () => {
    if (!selectedCompany) return;
    if (validItems.length === 0) {
      alert('Voucher must contain at least one valid line item with ItCode & Pcs.');
      return;
    }

    const matchedParty = parties.find(p => p.code === partyCode);
    const invoicePayload = {
      company_id: selectedCompany.id,
      invoice_number: vchNo,
      invoice_date: vchDate,
      customer_id: matchedParty?.id || undefined,
      invoice_type: (printFileName.includes('Estimate') ? 'Estimate' : 'GST') as any,
      tax_type: 'CGST_SGST' as any,
      gross_amount: totalItAmt,
      discount_amount: discAmt,
      tax_amount: parseFloat(taxAmt.toFixed(2)),
      making_charges_total: totalLbrAmt,
      round_off: rofAmt,
      net_amount: totalAmt,
      payment_mode: (cashAmt > 0 && (chequeAmt > 0 || cardAmt > 0) ? 'Mixed' : (chequeAmt > 0 ? 'Bank' : (cardAmt > 0 ? 'Card' : 'Cash'))) as any,
      paid_amount: totalPaid,
      balance_amount: osAmt,
      status: osAmt === 0 ? 'Paid' : 'Unpaid'
    };

    const itemsPayload: Omit<SalesItem, 'id' | 'sales_invoice_id'>[] = validItems.map((item) => ({
      product_id: item.product_id || undefined,
      product_name: item.design || item.it_code,
      weight: item.gr_wt,
      net_weight: item.net_wt,
      gross_weight: item.gr_wt,
      purity: item.size || '22K',
      making_charges: item.lbr_amt,
      rate: item.it_rate,
      quantity: item.pcs,
      tax_rate: taxRate,
      tax_amount: parseFloat(((item.tot_amt) * (taxRate / 100)).toFixed(2)),
      subtotal: item.tot_amt
    }));

    try {
      await createInvoice(invoicePayload, itemsPayload);
      alert(`Sales Gold Tax Invoice #${vchNo} saved and ledger entries posted successfully.`);
      handleNew();
    } catch (e: any) {
      alert(`Error saving invoice: ${e.message || e}`);
    }
  };

  const handleNew = () => {
    setActiveInvoiceId(null);
    setRefNo('');
    setPartyCode('');
    setPartyName('Walk-in Cash Customer');
    setEmployee('001');
    setEmployeeName('SELF');
    setBankName('');
    setCrDay(0);
    setVchDesc('');
    setDiscAmt(0);
    setTcsRate(0.0);
    setChequeAmt(0);
    setCardAmt(0);
    setSchemeAmt(0);
    setCashAmt(0);
    setCashPaidAmt(0);
    setKasarAmt(0);
    resetGrids();
    generateNextVchNo();
  };

  const handleCancel = () => {
    handleNew();
  };

  const handleDelete = async () => {
    if (!activeInvoiceId) {
      alert('Cannot delete: No saved voucher is loaded.');
      return;
    }
    if (confirm('Are you sure you want to delete this invoice? This will permanently reverse all product stock and accounting entries.')) {
      try {
        await deleteInvoice(activeInvoiceId);
        alert(`Sales Gold Tax Invoice #${vchNo} has been deleted successfully.`);
        handleNew();
      } catch (e: any) {
        alert(`Error deleting invoice: ${e.message || e}`);
      }
    }
  };

  const handleExit = () => {
    if (activeTabId) {
      closeTab(activeTabId);
    }
  };

  // Navigations
  const loadInvoiceIntoFields = (inv: SalesInvoice) => {
    setActiveInvoiceId(inv.id);
    setVchNo(inv.invoice_number);
    setVchDate(inv.invoice_date);
    setDiscAmt(inv.discount_amount || 0);
    setTaxRate((inv.tax_amount / (inv.gross_amount || 1)) * 100 || 3.0);
    setCashAmt(inv.paid_amount || 0);

    const matchCust = parties.find(p => p.id === inv.customer_id);
    if (matchCust) {
      setPartyCode(matchCust.code);
      setPartyName(matchCust.name);
    } else {
      setPartyCode('');
      setPartyName('Walk-in Cash Customer');
    }

    const reconstructItems: LocalItem[] = (inv.items || []).map((item, idx) => ({
      sr: idx + 1,
      tag_no: '',
      it_code: item.product_name,
      ord_no: '',
      design: item.product_name,
      size: item.purity || '',
      huld: '',
      pcs: item.quantity,
      gr_wt: item.weight,
      ls_wt: item.weight - item.net_weight,
      net_wt: item.net_weight,
      it_rate: item.rate,
      it_amt: item.net_weight * item.rate,
      l_type: 'G',
      lbr_rate: 0,
      lbr_amt: item.making_charges,
      ght_amt: 0,
      oth_amt: 0,
      tot_amt: item.subtotal,
      product_id: item.product_id || undefined
    }));

    while (reconstructItems.length < 5) {
      reconstructItems.push({
        sr: reconstructItems.length + 1,
        tag_no: '',
        it_code: '',
        ord_no: '',
        design: '',
        size: '',
        huld: '',
        pcs: 0,
        gr_wt: 0,
        ls_wt: 0,
        net_wt: 0,
        it_rate: 0,
        it_amt: 0,
        l_type: 'G',
        lbr_rate: 0,
        lbr_amt: 0,
        ght_amt: 0,
        oth_amt: 0,
        tot_amt: 0
      });
    }
    setItems(reconstructItems);
  };

  const handlePrev = () => {
    if (invoices.length === 0) return;
    let idx = invoices.length - 1;
    if (activeInvoiceId) {
      const currIdx = invoices.findIndex((i) => i.id === activeInvoiceId);
      if (currIdx > 0) idx = currIdx - 1;
    }
    loadInvoiceIntoFields(invoices[idx]);
  };

  const handleNext = () => {
    if (invoices.length === 0) return;
    if (activeInvoiceId) {
      const currIdx = invoices.findIndex((i) => i.id === activeInvoiceId);
      if (currIdx < invoices.length - 1) {
        loadInvoiceIntoFields(invoices[currIdx + 1]);
      } else {
        handleNew();
      }
    }
  };

  // Keyboard navigation for spreadsheet cell inputs
  const handleMainGridKeyDown = (e: React.KeyboardEvent<HTMLTableSectionElement>) => {
    const target = e.target as HTMLElement;
    if (!target.classList.contains('main-grid-input')) return;

    const row = parseInt(target.getAttribute('data-row') || '0', 10);
    const col = parseInt(target.getAttribute('data-col-idx') || '0', 10);

    const maxRows = items.length;
    const maxCols = 14;

    let nextRow = row;
    let nextCol = col;

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      nextRow = Math.max(0, row - 1);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      nextRow = Math.min(maxRows - 1, row + 1);
    } else if (e.key === 'ArrowLeft') {
      const input = target as HTMLInputElement;
      if (input.selectionStart === 0 || input.tagName === 'SELECT') {
        e.preventDefault();
        nextCol = Math.max(0, col - 1);
      }
    } else if (e.key === 'ArrowRight') {
      const input = target as HTMLInputElement;
      if (input.selectionStart === undefined || input.selectionStart === input.value.length || input.tagName === 'SELECT') {
        e.preventDefault();
        nextCol = Math.min(maxCols - 1, col + 1);
      }
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      if (col < maxCols - 1) {
        nextCol = col + 1;
      } else {
        if (row < maxRows - 1) {
          nextRow = row + 1;
          nextCol = 0;
        } else {
          insertMainRow();
          setTimeout(() => {
            const el = document.querySelector(`.main-grid-input[data-row="${row + 1}"][data-col-idx="0"]`) as HTMLElement;
            if (el) el.focus();
          }, 50);
          return;
        }
      }
    } else {
      return;
    }

    if (nextRow !== row || nextCol !== col) {
      const el = document.querySelector(`.main-grid-input[data-row="${nextRow}"][data-col-idx="${nextCol}"]`) as HTMLElement;
      if (el) {
        el.focus();
        if (el.tagName === 'INPUT') {
          (el as HTMLInputElement).select();
        }
      }
    }
  };

  const handleDiamondKeyDown = (e: React.KeyboardEvent<HTMLTableSectionElement>) => {
    const target = e.target as HTMLElement;
    if (!target.classList.contains('diamond-grid-input')) return;

    const row = parseInt(target.getAttribute('data-row') || '0', 10);
    const col = parseInt(target.getAttribute('data-col-idx') || '0', 10);

    const list = diamondItems[selectedItemIndex] || [];
    const maxRows = list.length;
    const maxCols = 8;

    let nextRow = row;
    let nextCol = col;

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      nextRow = Math.max(0, row - 1);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      nextRow = Math.min(maxRows - 1, row + 1);
    } else if (e.key === 'ArrowLeft') {
      const input = target as HTMLInputElement;
      if (input.selectionStart === 0) {
        e.preventDefault();
        nextCol = Math.max(0, col - 1);
      }
    } else if (e.key === 'ArrowRight') {
      const input = target as HTMLInputElement;
      if (input.selectionStart === undefined || input.selectionStart === input.value.length) {
        e.preventDefault();
        nextCol = Math.min(maxCols - 1, col + 1);
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (col < maxCols - 1) {
        nextCol = col + 1;
      } else if (row < maxRows - 1) {
        nextRow = row + 1;
        nextCol = 0;
      }
    } else {
      return;
    }

    if (nextRow !== row || nextCol !== col) {
      const el = document.querySelector(`.diamond-grid-input[data-row="${nextRow}"][data-col-idx="${nextCol}"]`) as HTMLElement;
      if (el) {
        el.focus();
        if (el.tagName === 'INPUT') {
          (el as HTMLInputElement).select();
        }
      }
    }
  };

  const handleReturnKeyDown = (e: React.KeyboardEvent<HTMLTableSectionElement>) => {
    const target = e.target as HTMLElement;
    if (!target.classList.contains('return-grid-input')) return;

    const row = parseInt(target.getAttribute('data-row') || '0', 10);
    const col = parseInt(target.getAttribute('data-col-idx') || '0', 10);

    const maxRows = returnMetals.length;
    const maxCols = 7;

    let nextRow = row;
    let nextCol = col;

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      nextRow = Math.max(0, row - 1);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      nextRow = Math.min(maxRows - 1, row + 1);
    } else if (e.key === 'ArrowLeft') {
      const input = target as HTMLInputElement;
      if (input.selectionStart === 0) {
        e.preventDefault();
        nextCol = Math.max(0, col - 1);
      }
    } else if (e.key === 'ArrowRight') {
      const input = target as HTMLInputElement;
      if (input.selectionStart === undefined || input.selectionStart === input.value.length) {
        e.preventDefault();
        nextCol = Math.min(maxCols - 1, col + 1);
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (col < maxCols - 1) {
        nextCol = col + 1;
      } else if (row < maxRows - 1) {
        nextRow = row + 1;
        nextCol = 0;
      }
    } else {
      return;
    }

    if (nextRow !== row || nextCol !== col) {
      const el = document.querySelector(`.return-grid-input[data-row="${nextRow}"][data-col-idx="${nextCol}"]`) as HTMLElement;
      if (el) {
        el.focus();
        if (el.tagName === 'INPUT') {
          (el as HTMLInputElement).select();
        }
      }
    }
  };

  const selectedItem = items[selectedItemIndex];
  const activeDiamonds = diamondItems[selectedItemIndex] || [];

  // Local theme accent settings mapped to HSL
  const themeAccentColors = {
    orange: '30 100% 50%',   // High intensity orange #ff8c00
    gold: '35 45% 45%',       // Luxury Champagne Gold #c5a059
    slate: '215 25% 27%',     // Classic Slate #334155
    classic: '217 91% 60%'    // Tally/JewelACC blue #3b82f6
  };

  return (
    <div
      style={{
        ['--primary' as any]: themeAccentColors[themeAccent],
        ['--ring' as any]: themeAccentColors[themeAccent],
      }}
      className="flex flex-col h-full bg-[#eef1f6] text-slate-800 p-2 font-sans select-none no-print overflow-y-auto text-xs"
    >
      {/* 1. SALES VOUCHER HEADER */}
      <div className="bg-white border border-slate-300 rounded-[2px] p-2 shadow-sm shrink-0 flex flex-col gap-1.5 mb-1.5">
        
        {/* Banner strip */}
        <div className="bg-orange-500 text-white py-1 px-4 text-center font-bold text-sm tracking-wider uppercase rounded-[1px] flex justify-between items-center shadow-inner" style={{ backgroundColor: `hsl(${themeAccentColors[themeAccent]})` }}>
          <span className="text-[10px] opacity-75">JewelACC Suite V2026</span>
          <span className="font-extrabold uppercase font-luxury tracking-widest text-[13px]">Gold Tax Invoice</span>
          <span className="text-[10px] opacity-75 font-data">Offline Mode</span>
        </div>

        {/* Header Fields Grid */}
        <div className="grid grid-cols-12 gap-2 items-center">
          
          {/* Voucher No & F1 */}
          <div className="col-span-2.5 flex items-center gap-1">
            <span className="text-[10px] font-bold text-slate-500 uppercase w-12 shrink-0">Vch No</span>
            <div className="flex gap-0.5 w-full">
              <input
                type="text"
                className="w-full h-7 border border-slate-300 rounded-[2px] text-center font-data font-bold bg-white focus:border-primary px-1.5"
                value={vchNo}
                onChange={(e) => setVchNo(e.target.value)}
              />
              <button
                type="button"
                onClick={generateNextVchNo}
                className="h-7 px-2 bg-slate-200 border border-slate-300 hover:bg-slate-300 rounded-[2px] text-[10px] font-bold text-slate-700 flex items-center justify-center cursor-pointer shadow-sm"
              >
                F1
              </button>
            </div>
          </div>

          {/* Date */}
          <div className="col-span-2.5 flex items-center gap-1">
            <span className="text-[10px] font-bold text-slate-500 uppercase w-12 shrink-0 text-center">Vch Date</span>
            <input
              type="date"
              className="w-full h-7 border border-slate-300 rounded-[2px] text-xs font-bold text-slate-700 px-1"
              value={vchDate}
              onChange={(e) => setVchDate(e.target.value)}
            />
          </div>

          {/* Time */}
          <div className="col-span-1.5">
            <input
              type="text"
              className="w-full h-7 border border-slate-300 rounded-[2px] text-center font-data text-xs text-slate-700 bg-white"
              value={vchTime}
              onChange={(e) => setVchTime(e.target.value)}
            />
          </div>

          {/* Day Name */}
          <div className="col-span-1.5">
            <span className="h-7 flex items-center justify-center bg-slate-100 border border-slate-300 px-2 rounded-[2px] text-[10px] font-bold text-slate-500 font-sans uppercase">
              {getDayOfWeek(vchDate)}
            </span>
          </div>

          {/* Apr No */}
          <div className="col-span-2 flex items-center gap-1">
            <span className="text-[10px] font-bold text-slate-500 uppercase whitespace-nowrap">Apr No</span>
            <div className="flex gap-0.5 w-full">
              <input type="text" className="w-1/2 h-7 border border-slate-300 rounded-[2px] text-center font-data text-xs" value={aprNo1} onChange={(e) => setAprNo1(e.target.value)} />
              <input type="text" className="w-1/2 h-7 border border-slate-300 rounded-[2px] text-center font-data text-xs" value={aprNo2} onChange={(e) => setAprNo2(e.target.value)} />
            </div>
          </div>

          {/* A Box Indicator / Select Print */}
          <div className="col-span-2 flex items-center gap-1 justify-end">
            <span className="w-6 h-7 bg-amber-100 text-amber-700 border border-amber-300 rounded-[2px] font-bold text-center flex items-center justify-center text-[10px]">A</span>
            <select
              className="w-full h-7 border border-slate-300 rounded-[2px] text-xs font-bold bg-white cursor-pointer py-0.5 px-1.5"
              value={printFileName}
              onChange={(e) => setPrintFileName(e.target.value)}
            >
              <option value="SalesBillA4Gst">SalesBillA4Gst</option>
              <option value="SalesBill3Inch">SalesBill3Inch</option>
              <option value="SalesEstimate">SalesEstimate</option>
            </select>
            <button
              type="button"
              className="h-7 px-2.5 bg-slate-700 text-white font-bold rounded-[2px] border border-transparent text-[10px] uppercase cursor-pointer hover:bg-slate-800"
            >
              Set
            </button>
          </div>

        </div>

        {/* Ref & Party Details Row */}
        <div className="grid grid-cols-12 gap-2 items-center border-t border-slate-200 pt-1.5">
          
          {/* Ref No */}
          <div className="col-span-2.5 flex items-center gap-1">
            <span className="text-[10px] font-bold text-slate-500 uppercase w-12 shrink-0">Ref No</span>
            <input
              type="text"
              className="w-full h-7 border border-slate-300 rounded-[2px] text-xs px-2"
              value={refNo}
              onChange={(e) => setRefNo(e.target.value)}
            />
          </div>

          {/* Party Code selection */}
          <div className="col-span-3.5 flex items-center gap-1">
            <span className="text-[10px] font-bold text-slate-500 uppercase w-16 shrink-0 text-center">Party Code</span>
            <select
              className="w-full h-7 border border-slate-300 rounded-[2px] text-xs font-bold bg-white cursor-pointer px-1"
              value={partyCode}
              onChange={(e) => handlePartySelect(e.target.value)}
            >
              <option value="">Walk-in Cash Customer</option>
              {parties.map((p) => (
                <option key={p.id} value={p.code}>{p.code} - {p.name}</option>
              ))}
            </select>
          </div>

          {/* Party Name */}
          <div className="col-span-4 flex items-center gap-1">
            <span className="text-[10px] font-bold text-slate-500 uppercase w-16 shrink-0 text-center">Party Name</span>
            <input
              type="text"
              className="w-full h-7 border border-slate-300 rounded-[2px] text-xs font-bold bg-slate-50"
              value={partyName}
              onChange={(e) => setPartyName(e.target.value)}
              disabled={partyCode !== ''}
            />
          </div>

          {/* Amount Detail summary indicator */}
          <div className="col-span-2 flex items-center justify-end text-slate-400 font-bold tracking-tight text-[11px] font-data pr-1.5">
            : Amt
          </div>

        </div>

      </div>

      {/* 2. PRIMARY SALES ITEM GRID */}
      <div className="bg-white border border-slate-300 rounded-[2px] shadow-sm flex flex-col h-[280px] shrink-0 mb-1.5">
        <div className="bg-slate-100 border-b border-slate-200 py-0.5 px-3 flex justify-between items-center text-[10px] shrink-0 select-none">
          <span className="font-extrabold uppercase text-slate-500 tracking-wide">Ornaments List</span>
          <button
            onClick={insertMainRow}
            className="flex items-center gap-0.5 px-2 py-0.5 bg-slate-700 hover:bg-slate-800 text-white font-bold text-[9px] uppercase tracking-wider rounded-[1px] cursor-pointer shadow-sm transition-all"
          >
            <Plus className="h-2.5 w-2.5" />
            <span>Add Item</span>
          </button>
        </div>

        {/* Table layout with aligned columns */}
        <div className="flex-1 overflow-auto">
          <table className="w-full border-collapse text-left text-xs table-fixed">
            <thead>
              <tr className="sticky top-0 z-20 bg-slate-200 border-b border-slate-300 text-[10px] font-bold text-slate-600 uppercase select-none">
                <th className="w-[30px] text-center border-r border-slate-300 py-1">Sr</th>
                <th className="w-[90px] border-r border-slate-300 px-1 py-1">TagNo</th>
                <th className="w-[90px] border-r border-slate-300 px-1 py-1">ItCode</th>
                <th className="w-[60px] border-r border-slate-300 px-1 py-1 text-center">OrdNo</th>
                <th className="border-r border-slate-300 px-2 py-1 text-left min-w-[120px]">Design</th>
                <th className="w-[50px] border-r border-slate-300 px-1 py-1 text-center">Size</th>
                <th className="w-[70px] border-r border-slate-300 px-1 py-1">Huld</th>
                <th className="w-[40px] border-r border-slate-300 px-1 py-1 text-center">Pcs</th>
                <th className="w-[65px] border-r border-slate-300 px-1 py-1 text-right">GrWt</th>
                <th className="w-[65px] border-r border-slate-300 px-1 py-1 text-right">LsWt</th>
                <th className="w-[65px] border-r border-slate-300 px-1 py-1 text-right">NetWt</th>
                <th className="w-[85px] border-r border-slate-300 px-1 py-1 text-right">ItRate</th>
                <th className="w-[95px] border-r border-slate-300 px-1 py-1 text-right">ItAmt</th>
                <th className="w-[50px] border-r border-slate-300 px-1 py-1 text-center">LType</th>
                <th className="w-[70px] border-r border-slate-300 px-1 py-1 text-right">LbrRate</th>
                <th className="w-[90px] border-r border-slate-300 px-1 py-1 text-right">LbrAmt</th>
                <th className="w-[65px] border-r border-slate-300 px-1 py-1 text-right">GhtAmt</th>
                <th className="w-[65px] border-r border-slate-300 px-1 py-1 text-right">OthAmt</th>
                <th className="w-[110px] border-r border-slate-300 px-1 py-1 text-right">TotAmt</th>
                <th className="w-[35px] text-center">Del</th>
              </tr>
            </thead>
            <tbody className="font-semibold text-slate-800 font-data" onKeyDown={handleMainGridKeyDown}>
              {items.map((row, idx) => {
                const isSelected = selectedItemIndex === idx;
                return (
                  <tr
                    key={idx}
                    onClick={() => setSelectedItemIndex(idx)}
                    className={`border-b border-slate-200 transition-colors h-[26px] ${isSelected
                      ? 'bg-slate-100 border-l-[3px] border-l-orange-500 font-bold'
                      : 'hover:bg-slate-50'
                      }`}
                  >
                    <td className="text-center font-data text-slate-400 bg-slate-50/50 border-r border-slate-200 text-[10px]">{row.sr}</td>
                    
                    {/* TagNo */}
                    <td className="p-0 border-r border-slate-200">
                      <input
                        type="text"
                        placeholder="Tag no"
                        data-row={idx}
                        data-col-idx={0}
                        className="main-grid-input w-full h-[25px] !border-none !rounded-none !shadow-none !px-1 font-bold text-slate-700 bg-transparent focus:bg-white focus:outline-none placeholder:text-slate-300 placeholder:font-normal uppercase"
                        value={row.tag_no}
                        onChange={(e) => handleMainCellChange(idx, 'tag_no', e.target.value)}
                      />
                    </td>

                    {/* ItCode */}
                    <td className="p-0 border-r border-slate-200">
                      <input
                        type="text"
                        placeholder="ItCode"
                        data-row={idx}
                        data-col-idx={1}
                        className="main-grid-input w-full h-[25px] !border-none !rounded-none !shadow-none !px-1 font-bold text-slate-700 bg-transparent focus:bg-white focus:outline-none placeholder:text-slate-300 placeholder:font-normal uppercase"
                        value={row.it_code}
                        onChange={(e) => handleMainCellChange(idx, 'it_code', e.target.value)}
                      />
                    </td>

                    {/* OrdNo */}
                    <td className="p-0 border-r border-slate-200">
                      <input
                        type="text"
                        data-row={idx}
                        data-col-idx={2}
                        className="main-grid-input w-full h-[25px] !border-none !rounded-none !shadow-none !px-1 text-center font-data text-slate-700 bg-transparent focus:bg-white focus:outline-none"
                        value={row.ord_no}
                        onChange={(e) => handleMainCellChange(idx, 'ord_no', e.target.value)}
                      />
                    </td>

                    {/* Design */}
                    <td className="p-0 border-r border-slate-200">
                      <input
                        type="text"
                        data-row={idx}
                        data-col-idx={3}
                        placeholder="Design description"
                        className="main-grid-input w-full h-[25px] !border-none !rounded-none !shadow-none !px-2 font-sans text-slate-700 bg-transparent focus:bg-white focus:outline-none placeholder:text-slate-300"
                        value={row.design}
                        onChange={(e) => handleMainCellChange(idx, 'design', e.target.value)}
                      />
                    </td>

                    {/* Size */}
                    <td className="p-0 border-r border-slate-200">
                      <input
                        type="text"
                        data-row={idx}
                        data-col-idx={4}
                        className="main-grid-input w-full h-[25px] !border-none !rounded-none !shadow-none !px-1 text-center font-data text-slate-700 bg-transparent focus:bg-white focus:outline-none"
                        value={row.size}
                        onChange={(e) => handleMainCellChange(idx, 'size', e.target.value)}
                      />
                    </td>

                    {/* Huld */}
                    <td className="p-0 border-r border-slate-200">
                      <input
                        type="text"
                        data-row={idx}
                        data-col-idx={5}
                        className="main-grid-input w-full h-[25px] !border-none !rounded-none !shadow-none !px-1 font-data text-slate-700 bg-transparent focus:bg-white focus:outline-none"
                        value={row.huld}
                        onChange={(e) => handleMainCellChange(idx, 'huld', e.target.value)}
                      />
                    </td>

                    {/* Pcs */}
                    <td className="p-0 border-r border-slate-200">
                      <input
                        type="number"
                        data-row={idx}
                        data-col-idx={6}
                        className="main-grid-input w-full h-[25px] !border-none !rounded-none !shadow-none !px-1 text-center font-data text-slate-700 bg-transparent focus:bg-white focus:outline-none"
                        value={row.pcs || ''}
                        onChange={(e) => handleMainCellChange(idx, 'pcs', e.target.value)}
                      />
                    </td>

                    {/* GrWt */}
                    <td className="p-0 border-r border-slate-200">
                      <input
                        type="number"
                        step="0.001"
                        placeholder="0.000"
                        data-row={idx}
                        data-col-idx={7}
                        className="main-grid-input w-full h-[25px] !border-none !rounded-none !shadow-none !px-1 text-right font-data text-slate-700 bg-transparent focus:bg-white focus:outline-none"
                        value={row.gr_wt || ''}
                        onChange={(e) => handleMainCellChange(idx, 'gr_wt', e.target.value)}
                      />
                    </td>

                    {/* LsWt */}
                    <td className="p-0 border-r border-slate-200">
                      <input
                        type="number"
                        step="0.001"
                        placeholder="0.000"
                        data-row={idx}
                        data-col-idx={8}
                        className="main-grid-input w-full h-[25px] !border-none !rounded-none !shadow-none !px-1 text-right font-data text-slate-700 bg-transparent focus:bg-white focus:outline-none"
                        value={row.ls_wt || ''}
                        onChange={(e) => handleMainCellChange(idx, 'ls_wt', e.target.value)}
                      />
                    </td>

                    {/* NetWt (ReadOnly) */}
                    <td className="px-1 text-right border-r border-slate-200 font-data text-slate-500 bg-slate-50/30 text-[11px]">
                      {row.net_wt > 0 ? row.net_wt.toFixed(3) : '-'}
                    </td>

                    {/* ItRate */}
                    <td className="p-0 border-r border-slate-200">
                      <input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        data-row={idx}
                        data-col-idx={9}
                        className="main-grid-input w-full h-[25px] !border-none !rounded-none !shadow-none !px-1 text-right font-data text-slate-700 bg-transparent focus:bg-white focus:outline-none"
                        value={row.it_rate || ''}
                        onChange={(e) => handleMainCellChange(idx, 'it_rate', e.target.value)}
                      />
                    </td>

                    {/* ItAmt (ReadOnly) */}
                    <td className="px-1 text-right border-r border-slate-200 font-data text-slate-500 bg-slate-50/30 text-[11px]">
                      {row.it_amt > 0 ? row.it_amt.toFixed(2) : '-'}
                    </td>

                    {/* LType */}
                    <td className="p-0 border-r border-slate-200">
                      <select
                        data-row={idx}
                        data-col-idx={10}
                        className="main-grid-input w-full h-[25px] !border-none !rounded-none !shadow-none !p-0 text-center font-bold text-slate-700 bg-transparent focus:bg-white focus:outline-none cursor-pointer"
                        value={row.l_type}
                        onChange={(e) => handleMainCellChange(idx, 'l_type', e.target.value)}
                      >
                        <option value="G">G</option>
                        <option value="F">F</option>
                        <option value="P">P</option>
                      </select>
                    </td>

                    {/* LbrRate */}
                    <td className="p-0 border-r border-slate-200">
                      <input
                        type="number"
                        step="0.01"
                        data-row={idx}
                        data-col-idx={11}
                        className="main-grid-input w-full h-[25px] !border-none !rounded-none !shadow-none !px-1 text-right font-data text-slate-700 bg-transparent focus:bg-white focus:outline-none"
                        value={row.lbr_rate || ''}
                        onChange={(e) => handleMainCellChange(idx, 'lbr_rate', e.target.value)}
                      />
                    </td>

                    {/* LbrAmt (ReadOnly) */}
                    <td className="px-1 text-right border-r border-slate-200 font-data text-slate-500 bg-slate-50/30 text-[11px]">
                      {row.lbr_amt > 0 ? row.lbr_amt.toFixed(2) : '-'}
                    </td>

                    {/* GhtAmt */}
                    <td className="p-0 border-r border-slate-200">
                      <input
                        type="number"
                        step="0.01"
                        data-row={idx}
                        data-col-idx={12}
                        className="main-grid-input w-full h-[25px] !border-none !rounded-none !shadow-none !px-1 text-right font-data text-slate-700 bg-transparent focus:bg-white focus:outline-none"
                        value={row.ght_amt || ''}
                        onChange={(e) => handleMainCellChange(idx, 'ght_amt', e.target.value)}
                      />
                    </td>

                    {/* OthAmt */}
                    <td className="p-0 border-r border-slate-200">
                      <input
                        type="number"
                        step="0.01"
                        data-row={idx}
                        data-col-idx={13}
                        className="main-grid-input w-full h-[25px] !border-none !rounded-none !shadow-none !px-1 text-right font-data text-slate-700 bg-transparent focus:bg-white focus:outline-none"
                        value={row.oth_amt || ''}
                        onChange={(e) => handleMainCellChange(idx, 'oth_amt', e.target.value)}
                      />
                    </td>

                    {/* TotAmt (ReadOnly) */}
                    <td className="px-1 text-right border-r border-slate-200 font-data text-slate-700 bg-slate-100/40 text-[11px] font-bold">
                      {row.tot_amt > 0 ? row.tot_amt.toFixed(2) : '-'}
                    </td>

                    {/* Remove Action */}
                    <td className="text-center font-sans p-0">
                      <button
                        type="button"
                        onClick={() => removeMainRow(idx)}
                        className="text-red-500 hover:text-red-700 p-0.5 rounded cursor-pointer mx-auto flex items-center justify-center transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>

                  </tr>
                );
              })}
            </tbody>
            {/* Totals Row aligned to columns */}
            <tfoot>
              <tr className="bg-slate-200 border-t-2 border-slate-400 font-bold text-slate-700 font-data h-[26px]">
                <td colSpan={7} className="px-2 text-left uppercase text-[10px] tracking-wider font-extrabold text-slate-500">Total :</td>
                <td className="text-center border-r border-slate-300 font-bold">{totalPcs}</td>
                <td className="text-right border-r border-slate-300 px-1 font-bold">{totalGrWt.toFixed(3)}</td>
                <td className="text-right border-r border-slate-300 px-1 font-bold">{totalLsWt.toFixed(3)}</td>
                <td className="text-right border-r border-slate-300 px-1 font-bold">{totalNetWt.toFixed(3)}</td>
                <td className="border-r border-slate-300"></td>
                <td className="text-right border-r border-slate-300 px-1 font-bold">{totalItAmt.toFixed(2)}</td>
                <td className="border-r border-slate-300"></td>
                <td className="border-r border-slate-300"></td>
                <td className="text-right border-r border-slate-300 px-1 font-bold">{totalLbrAmt.toFixed(2)}</td>
                <td className="text-right border-r border-slate-300 px-1 font-bold">{totalGhtAmt.toFixed(2)}</td>
                <td className="text-right border-r border-slate-300 px-1 font-bold">{totalOthAmt.toFixed(2)}</td>
                <td className="text-right border-r border-slate-300 px-1 text-orange-600 font-extrabold text-[12px]">{totalTotAmt.toFixed(2)}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* 3. PRINT / ITEM DETAILS SECTION */}
      <div className="bg-white border border-slate-300 rounded-[2px] p-2 shadow-sm shrink-0 grid grid-cols-12 gap-3 mb-1.5">
        <div className="col-span-6 flex items-center gap-2">
          <span className="text-[10px] font-bold text-slate-500 uppercase whitespace-nowrap">Print Name</span>
          <input
            type="text"
            className="w-full h-7 border border-slate-300 rounded-[2px] text-xs px-2 font-bold bg-slate-50 text-slate-600"
            value={selectedItem ? (selectedItem.design || selectedItem.it_code) : ''}
            disabled
          />
        </div>
        <div className="col-span-6 flex items-center gap-2">
          <span className="text-[10px] font-bold text-slate-500 uppercase whitespace-nowrap">Itm Name</span>
          <input
            type="text"
            className="w-full h-7 border border-slate-300 rounded-[2px] text-xs px-2 font-bold bg-slate-50 text-slate-600"
            value={selectedItem ? selectedItem.it_code : ''}
            disabled
          />
        </div>
      </div>

      {/* BOTTOM AREA: Split Left Grids & Right Accounting Panel */}
      <div className="grid grid-cols-12 gap-2 shrink-0 h-[410px] mb-1.5">
        
        {/* Left Area (Diamond Grid + Gold Return Grid + Narration) */}
        <div className="col-span-9 flex flex-col gap-1.5 h-full">
          
          {/* Side by side grids: Diamond Breakdown & Gold Returns summary */}
          <div className="grid grid-cols-12 gap-2 h-[290px] shrink-0">
            
            {/* 4. DIAMOND / STONE DETAILS GRID */}
            <div className="col-span-6 bg-white border border-slate-300 rounded-[2px] flex flex-col overflow-hidden shadow-sm">
              <div className="bg-slate-100 px-2.5 py-1 border-b border-slate-200 flex justify-between items-center text-[10px] shrink-0 font-bold">
                <span className="uppercase tracking-wider text-slate-500 font-luxury">Diamond / Stone Details</span>
                <span className="text-[9px] text-slate-400 font-data">Item SR: {selectedItemIndex + 1}</span>
              </div>
              <div className="flex-1 overflow-auto">
                <table className="border-collapse text-left text-xs table-fixed min-w-[580px] w-full">
                  <thead>
                    <tr className="bg-slate-200 border-b border-slate-300 text-[9px] font-bold text-slate-500 uppercase select-none">
                      <th className="w-[30px] text-center border-r border-slate-300 py-1">Sr</th>
                      <th className="w-[60px] border-r border-slate-300 px-1">ItCode</th>
                      <th className="border-r border-slate-300 px-1 text-left min-w-[70px]">ItName</th>
                      <th className="w-[50px] border-r border-slate-300 px-1 text-center">DmColor</th>
                      <th className="w-[50px] border-r border-slate-300 px-1 text-center">DmOrigin</th>
                      <th className="w-[70px] border-r border-slate-300 px-1">DmRemark</th>
                      <th className="w-[60px] border-r border-slate-300 px-1">DmSfNo</th>
                      <th className="w-[35px] border-r border-slate-300 px-1 text-center">Pcs</th>
                      <th className="w-[50px] text-right px-1">Weight</th>
                    </tr>
                  </thead>
                  <tbody className="font-semibold text-slate-700 font-data" onKeyDown={handleDiamondKeyDown}>
                    {activeDiamonds.map((acc, accIdx) => (
                      <tr key={accIdx} className="hover:bg-slate-50 border-b border-slate-200 h-[24px]">
                        <td className="text-center text-slate-400 bg-slate-50/50 border-r border-slate-200 text-[10px]">{acc.sr}</td>
                        <td className="p-0 border-r border-slate-200">
                          <input
                            type="text"
                            data-row={accIdx}
                            data-col-idx={0}
                            className="diamond-grid-input w-full h-[23px] !border-none !rounded-none !shadow-none !px-1 text-[11px] font-bold text-slate-700 bg-transparent focus:bg-white focus:outline-none uppercase"
                            value={acc.it_code}
                            onChange={(e) => handleDiamondCellChange(selectedItemIndex, accIdx, 'it_code', e.target.value)}
                          />
                        </td>
                        <td className="p-0 border-r border-slate-200">
                          <input
                            type="text"
                            data-row={accIdx}
                            data-col-idx={1}
                            className="diamond-grid-input w-full h-[23px] !border-none !rounded-none !shadow-none !px-1.5 text-[11px] text-slate-700 bg-transparent focus:bg-white focus:outline-none"
                            value={acc.it_name}
                            onChange={(e) => handleDiamondCellChange(selectedItemIndex, accIdx, 'it_name', e.target.value)}
                          />
                        </td>
                        <td className="p-0 border-r border-slate-200">
                          <input
                            type="text"
                            data-row={accIdx}
                            data-col-idx={2}
                            className="diamond-grid-input w-full h-[23px] !border-none !rounded-none !shadow-none !px-1 text-center text-slate-700 bg-transparent focus:bg-white focus:outline-none"
                            value={acc.dm_color}
                            onChange={(e) => handleDiamondCellChange(selectedItemIndex, accIdx, 'dm_color', e.target.value)}
                          />
                        </td>
                        <td className="p-0 border-r border-slate-200">
                          <input
                            type="text"
                            data-row={accIdx}
                            data-col-idx={3}
                            className="diamond-grid-input w-full h-[23px] !border-none !rounded-none !shadow-none !px-1 text-center text-slate-700 bg-transparent focus:bg-white focus:outline-none"
                            value={acc.dm_origin}
                            onChange={(e) => handleDiamondCellChange(selectedItemIndex, accIdx, 'dm_origin', e.target.value)}
                          />
                        </td>
                        <td className="p-0 border-r border-slate-200">
                          <input
                            type="text"
                            data-row={accIdx}
                            data-col-idx={4}
                            className="diamond-grid-input w-full h-[23px] !border-none !rounded-none !shadow-none !px-1 text-slate-700 bg-transparent focus:bg-white focus:outline-none"
                            value={acc.dm_remark}
                            onChange={(e) => handleDiamondCellChange(selectedItemIndex, accIdx, 'dm_remark', e.target.value)}
                          />
                        </td>
                        <td className="p-0 border-r border-slate-200">
                          <input
                            type="text"
                            data-row={accIdx}
                            data-col-idx={5}
                            className="diamond-grid-input w-full h-[23px] !border-none !rounded-none !shadow-none !px-1 text-slate-700 bg-transparent focus:bg-white focus:outline-none"
                            value={acc.dm_sf_no}
                            onChange={(e) => handleDiamondCellChange(selectedItemIndex, accIdx, 'dm_sf_no', e.target.value)}
                          />
                        </td>
                        <td className="p-0 border-r border-slate-200">
                          <input
                            type="number"
                            data-row={accIdx}
                            data-col-idx={6}
                            className="diamond-grid-input w-full h-[23px] !border-none !rounded-none !shadow-none !px-1 text-center font-data text-slate-700 bg-transparent focus:bg-white focus:outline-none"
                            value={acc.pcs || ''}
                            onChange={(e) => handleDiamondCellChange(selectedItemIndex, accIdx, 'pcs', e.target.value)}
                          />
                        </td>
                        <td className="p-0">
                          <input
                            type="number"
                            step="0.001"
                            data-row={accIdx}
                            data-col-idx={7}
                            className="diamond-grid-input w-full h-[23px] !border-none !rounded-none !shadow-none !px-1 text-right font-data text-slate-700 bg-transparent focus:bg-white focus:outline-none"
                            value={acc.weight || ''}
                            onChange={(e) => handleDiamondCellChange(selectedItemIndex, accIdx, 'weight', e.target.value)}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 5. GOLD / FINE SUMMARY GRID (OLD GOLD/METAL RETURNS) */}
            <div className="col-span-6 bg-white border border-slate-300 rounded-[2px] flex flex-col overflow-hidden shadow-sm">
              <div className="bg-slate-100 px-2.5 py-1 border-b border-slate-200 flex justify-between items-center text-[10px] shrink-0 font-bold">
                <span className="uppercase tracking-wider text-slate-500 font-luxury">Gold / Fine Summary</span>
                <button
                  onClick={insertReturnRow}
                  className="px-2 py-0.5 bg-slate-700 text-white text-[8px] font-bold uppercase tracking-wider rounded-[1px] cursor-pointer hover:bg-slate-800 transition-colors"
                >
                  + Add Metal
                </button>
              </div>
              <div className="flex-1 overflow-auto">
                <table className="border-collapse text-left text-xs table-fixed min-w-[620px] w-full">
                  <thead>
                    <tr className="bg-slate-200 border-b border-slate-300 text-[9px] font-bold text-slate-500 uppercase select-none">
                      <th className="w-[30px] text-center border-r border-slate-300 py-1">Sr</th>
                      <th className="w-[45px] border-r border-slate-300 px-1">ItCode</th>
                      <th className="border-r border-slate-300 px-1 text-left min-w-[70px]">ItName</th>
                      <th className="w-[30px] border-r border-slate-300 px-1 text-center">Pcs</th>
                      <th className="w-[45px] border-r border-slate-300 px-1 text-right">GrWt</th>
                      <th className="w-[45px] border-r border-slate-300 px-1 text-right">LsWt</th>
                      <th className="w-[50px] border-r border-slate-300 px-1 text-right">NetWt</th>
                      <th className="w-[45px] border-r border-slate-300 px-1 text-center">Touch</th>
                      <th className="w-[55px] border-r border-slate-300 px-1 text-right bg-amber-50 dark:bg-amber-950/20 text-amber-800">Fine</th>
                      <th className="w-[50px] border-r border-slate-300 px-1 text-right">Rate</th>
                      <th className="w-[75px] text-right px-1">NetAmt</th>
                    </tr>
                  </thead>
                  <tbody className="font-semibold text-slate-700 font-data" onKeyDown={handleReturnKeyDown}>
                    {returnMetals.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 border-b border-slate-200 h-[24px]">
                        <td className="text-center text-slate-400 bg-slate-50/50 border-r border-slate-200 text-[10px]">{row.sr}</td>
                        
                        {/* ItCode */}
                        <td className="p-0 border-r border-slate-200">
                          <input
                            type="text"
                            data-row={idx}
                            data-col-idx={0}
                            placeholder="OG"
                            className="return-grid-input w-full h-[23px] !border-none !rounded-none !shadow-none !px-1 text-[11px] font-bold text-slate-700 bg-transparent focus:bg-white focus:outline-none uppercase"
                            value={row.it_code}
                            onChange={(e) => handleReturnCellChange(idx, 'it_code', e.target.value)}
                          />
                        </td>

                        {/* ItName */}
                        <td className="p-0 border-r border-slate-200">
                          <input
                            type="text"
                            data-row={idx}
                            data-col-idx={1}
                            placeholder="Old Gold Ring"
                            className="return-grid-input w-full h-[23px] !border-none !rounded-none !shadow-none !px-1 text-[11px] text-slate-700 bg-transparent focus:bg-white focus:outline-none"
                            value={row.it_name}
                            onChange={(e) => handleReturnCellChange(idx, 'it_name', e.target.value)}
                          />
                        </td>

                        {/* Pcs */}
                        <td className="p-0 border-r border-slate-200 text-center">
                          <input
                            type="number"
                            data-row={idx}
                            data-col-idx={2}
                            className="return-grid-input w-full h-[23px] !border-none !rounded-none !shadow-none !px-1 text-center font-data text-slate-700 bg-transparent focus:bg-white focus:outline-none"
                            value={row.pcs || ''}
                            onChange={(e) => handleReturnCellChange(idx, 'pcs', e.target.value)}
                          />
                        </td>

                        {/* GrWt */}
                        <td className="p-0 border-r border-slate-200 text-right">
                          <input
                            type="number"
                            step="0.001"
                            data-row={idx}
                            data-col-idx={3}
                            className="return-grid-input w-full h-[23px] !border-none !rounded-none !shadow-none !px-1 text-right font-data text-slate-700 bg-transparent focus:bg-white focus:outline-none"
                            value={row.gr_wt || ''}
                            onChange={(e) => handleReturnCellChange(idx, 'gr_wt', e.target.value)}
                          />
                        </td>

                        {/* LsWt */}
                        <td className="p-0 border-r border-slate-200 text-right">
                          <input
                            type="number"
                            step="0.001"
                            data-row={idx}
                            data-col-idx={4}
                            className="return-grid-input w-full h-[23px] !border-none !rounded-none !shadow-none !px-1 text-right font-data text-slate-700 bg-transparent focus:bg-white focus:outline-none"
                            value={row.ls_wt || ''}
                            onChange={(e) => handleReturnCellChange(idx, 'ls_wt', e.target.value)}
                          />
                        </td>

                        {/* NetWt (Calculated) */}
                        <td className="px-1 text-right border-r border-slate-200 font-data text-slate-500 bg-slate-50/20 text-[10px]">
                          {row.net_wt > 0 ? row.net_wt.toFixed(3) : '-'}
                        </td>

                        {/* Touch */}
                        <td className="p-0 border-r border-slate-200 text-center">
                          <input
                            type="number"
                            step="0.01"
                            data-row={idx}
                            data-col-idx={5}
                            className="return-grid-input w-full h-[23px] !border-none !rounded-none !shadow-none !px-1 text-center font-data text-slate-700 bg-transparent focus:bg-white focus:outline-none"
                            value={row.touch || ''}
                            onChange={(e) => handleReturnCellChange(idx, 'touch', e.target.value)}
                          />
                        </td>

                        {/* Fine (Calculated, Golden Highlighted) */}
                        <td className="px-1 text-right border-r border-slate-300 font-data text-amber-700 bg-amber-100 font-bold text-[10.5px]">
                          {row.fine > 0 ? row.fine.toFixed(3) : '-'}
                        </td>

                        {/* Rate */}
                        <td className="p-0 border-r border-slate-200 text-right">
                          <input
                            type="number"
                            data-row={idx}
                            data-col-idx={6}
                            className="return-grid-input w-full h-[23px] !border-none !rounded-none !shadow-none !px-1 text-right font-data text-slate-700 bg-transparent focus:bg-white focus:outline-none"
                            value={row.rate || ''}
                            onChange={(e) => handleReturnCellChange(idx, 'rate', e.target.value)}
                          />
                        </td>

                        {/* NetAmt (Calculated) */}
                        <td className="px-1 text-right font-data text-slate-700 bg-slate-100/30 text-[10.5px]">
                          {row.net_amt > 0 ? row.net_amt.toFixed(2) : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  {/* Totals row for returns grid */}
                  <tfoot>
                    <tr className="bg-slate-150 border-t border-slate-300 text-[9px] font-bold text-slate-600 font-data h-[24px]">
                      <td colSpan={3} className="px-1.5 uppercase font-bold text-slate-500">Exch Total:</td>
                      <td className="text-center border-r border-slate-200">{returnPcs}</td>
                      <td className="text-right border-r border-slate-200 px-1">{returnGrWt.toFixed(3)}</td>
                      <td className="text-right border-r border-slate-200 px-1">{returnLsWt.toFixed(3)}</td>
                      <td className="text-right border-r border-slate-200 px-1">{returnNetWt.toFixed(3)}</td>
                      <td className="border-r border-slate-200"></td>
                      <td className="text-right border-r border-slate-300 px-1 text-amber-800 bg-amber-50 font-bold">{returnTotalFine.toFixed(3)}</td>
                      <td className="border-r border-slate-200"></td>
                      <td className="text-right text-slate-700 font-bold px-1">{totalReturnAmt.toFixed(2)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

          </div>

          {/* 6. IMAGE + EMPLOYEE SECTION & 7. ORDER ADJUSTMENT PANEL */}
          <div className="bg-white border border-slate-300 rounded-[2px] p-2 shadow-sm shrink-0 grid grid-cols-12 gap-3 items-center h-[110px]">
            
            {/* Image Preview Area */}
            <div className="col-span-2 flex items-center justify-center border border-slate-200 rounded-[2px] bg-slate-50 h-[90px] w-full relative overflow-hidden select-none">
              <img
                src="https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=120&auto=format&fit=crop&q=60"
                alt="Product preview"
                className="h-full w-full object-cover select-none"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 text-white p-1 text-center font-bold text-[8px] tracking-wide pointer-events-none">
                <span>PREVIEW</span>
              </div>
            </div>

            {/* Employee Details and bank/description input fields */}
            <div className="col-span-6 grid grid-cols-12 gap-2 items-center">
              
              {/* Employee */}
              <div className="col-span-7 flex items-center gap-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase w-14 shrink-0">Employee</span>
                <input type="text" className="w-10 h-7 border border-slate-300 rounded-[2px] text-center font-data text-xs font-bold bg-slate-50 text-slate-500" value={employee} disabled />
                <input type="text" className="flex-1 h-7 border border-slate-300 rounded-[2px] text-xs font-bold bg-slate-50 text-slate-500" value={employeeName} disabled />
              </div>

              {/* Credit days */}
              <div className="col-span-5 flex items-center gap-1.5">
                <span className="text-[10px] font-bold text-slate-500 uppercase whitespace-nowrap">CrDay</span>
                <input type="number" className="w-full h-7 border border-slate-300 rounded-[2px] text-center font-data font-bold text-slate-700" value={crDay} onChange={(e) => setCrDay(parseInt(e.target.value, 10) || 0)} />
              </div>

              {/* Bank Name */}
              <div className="col-span-6 flex items-center gap-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase w-14 shrink-0">Bank Name</span>
                <input type="text" placeholder="Cheque bank" className="w-full h-7 border border-slate-300 rounded-[2px] text-xs" value={bankName} onChange={(e) => setBankName(e.target.value)} />
              </div>

              {/* Narration/VchDesc */}
              <div className="col-span-6 flex items-center gap-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase w-12 shrink-0">Narration</span>
                <input type="text" placeholder="Comments..." className="w-full h-7 border border-slate-300 rounded-[2px] text-xs" value={vchDesc} onChange={(e) => setVchDesc(e.target.value)} />
              </div>

            </div>

            {/* 7. ORDER ADJUSTMENT PANEL */}
            <div className="col-span-4 bg-slate-50 border border-slate-300 rounded-[2px] p-1.5 flex flex-col h-[90px] overflow-hidden">
              <div className="flex justify-between items-center mb-1 shrink-0">
                <span className="text-[9px] font-extrabold text-slate-500 uppercase tracking-wider">Order Adjustments</span>
                <button
                  onClick={insertOrderRow}
                  className="text-[9px] font-extrabold text-primary hover:underline cursor-pointer"
                >
                  + Add
                </button>
              </div>
              <div className="flex-1 overflow-y-auto">
                <table className="w-full border-collapse text-[10px]">
                  <thead>
                    <tr className="border-b border-slate-300 text-[8px] text-slate-400 font-bold uppercase">
                      <th className="w-6 text-center py-0.5">Sr</th>
                      <th className="pl-1">Order No</th>
                      <th className="text-right pr-1">Order Amount</th>
                    </tr>
                  </thead>
                  <tbody className="font-data font-semibold text-slate-700">
                    {orderAdjustments.map((o, idx) => (
                      <tr key={idx} className="border-b border-slate-200 h-5">
                        <td className="text-center text-slate-400">{o.sr}</td>
                        <td className="p-0">
                          <input
                            type="text"
                            placeholder="e.g. 0001"
                            className="w-full h-4 !border-none !rounded-none !shadow-none p-0 text-[10px] font-bold text-slate-700 bg-transparent focus:outline-none"
                            value={o.ord_no}
                            onChange={(e) => handleOrderCellChange(idx, 'ord_no', e.target.value)}
                          />
                        </td>
                        <td className="p-0 text-right">
                          <input
                            type="number"
                            placeholder="0.00"
                            className="w-full h-4 !border-none !rounded-none !shadow-none p-0 text-[10px] text-right font-data text-slate-700 bg-transparent focus:outline-none"
                            value={o.ord_amt || ''}
                            onChange={(e) => handleOrderCellChange(idx, 'ord_amt', e.target.value)}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>

        </div>

        {/* 8. ACCOUNTING SUMMARY PANEL (RIGHT SIDEBAR) */}
        <div className="col-span-3 bg-white border border-slate-300 rounded-[2px] shadow-sm flex flex-col p-2 h-full overflow-y-auto">
          <div className="bg-slate-100 border border-slate-200 py-1 px-2 mb-2 text-center uppercase tracking-widest font-extrabold text-[10px] text-slate-500 font-luxury">
            Ledger Settlement Summary
          </div>

          <div className="flex flex-col gap-1.5 text-[10.5px] font-semibold text-slate-700">
            
            {/* Net Amt */}
            <div className="flex justify-between items-center h-6 border-b border-slate-100">
              <span className="text-slate-500">Net Amt (Sales)</span>
              <span className="font-data font-bold">₹{Math.round(netAmt).toLocaleString()}</span>
            </div>

            {/* Disc Amt */}
            <div className="flex justify-between items-center h-6 gap-2">
              <span className="text-slate-500 w-1/3">Disc Amt</span>
              <input
                type="number"
                className="w-2/3 h-5.5 text-right font-data border border-slate-300 rounded-[2px] px-1 text-[10.5px]"
                value={discAmt || ''}
                onChange={(e) => setDiscAmt(parseFloat(e.target.value) || 0)}
              />
            </div>

            {/* Tax Amt selection & calculation */}
            <div className="flex justify-between items-center h-6 gap-2">
              <span className="text-slate-500 w-1/3">Tax Amt</span>
              <div className="w-2/3 flex gap-0.5 items-center">
                <select
                  className="w-full h-5.5 text-xs font-bold bg-white border border-slate-300 rounded-[2px] py-0 px-1"
                  value={taxRate}
                  onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
                >
                  <option value="3.0">GST 3%</option>
                  <option value="1.5">GST 1.5%</option>
                  <option value="0.0">Exempt</option>
                </select>
                <span className="font-data text-slate-400 w-20 text-right shrink-0">₹{Math.round(taxAmt).toLocaleString()}</span>
              </div>
            </div>

            {/* TCS Amt */}
            <div className="flex justify-between items-center h-6 gap-2">
              <span className="text-slate-500 w-1/3">TCS Amt %</span>
              <div className="w-2/3 flex gap-0.5 items-center">
                <input
                  type="number"
                  step="0.001"
                  className="w-full h-5.5 text-right font-data border border-slate-300 rounded-[2px] px-1 text-[10.5px]"
                  value={tcsRate || ''}
                  onChange={(e) => setTcsRate(parseFloat(e.target.value) || 0.0)}
                />
                <span className="font-data text-slate-400 w-20 text-right shrink-0">₹{Math.round(tcsAmt).toLocaleString()}</span>
              </div>
            </div>

            {/* Rof Amt */}
            <div className="flex justify-between items-center h-6 border-b border-slate-100">
              <span className="text-slate-500">Rof Amt (Round)</span>
              <span className="font-data text-slate-400">₹{rofAmt.toFixed(2)}</span>
            </div>

            {/* Total Amt (Grand Total) */}
            <div className="flex justify-between items-center py-1 bg-amber-500/10 border border-amber-500/20 px-2 rounded-[2px] my-0.5 font-bold">
              <span className="uppercase text-[10px] text-amber-800">Total Amt</span>
              <span className="text-sm font-data font-extrabold text-amber-700">₹{totalAmt.toLocaleString()}</span>
            </div>

            {/* Cheque Amt */}
            <div className="flex justify-between items-center gap-1 h-6">
              <span className="text-slate-500 w-1/4">Cheque</span>
              <select className="w-5/12 h-5.5 text-[9px] bg-white border border-slate-300 rounded-[2px]" value={chequeBank} onChange={(e) => setChequeBank(e.target.value)}>
                <option value="BANK A/C">BANK A/C</option>
                <option value="HDFC BANK">HDFC BANK</option>
                <option value="SBI BANK">SBI BANK</option>
              </select>
              <input
                type="number"
                className="w-1/3 h-5.5 text-right font-data border border-slate-300 rounded-[2px] px-1"
                value={chequeAmt || ''}
                onChange={(e) => setChequeAmt(parseFloat(e.target.value) || 0)}
              />
            </div>

            {/* Card Amt */}
            <div className="flex justify-between items-center gap-1 h-6">
              <span className="text-slate-500 w-1/4">Card</span>
              <select className="w-5/12 h-5.5 text-[9px] bg-white border border-slate-300 rounded-[2px]" value={cardBank} onChange={(e) => setCardBank(e.target.value)}>
                <option value="CARD A/C">CARD A/C</option>
                <option value="POS MACHINE">POS MACHINE</option>
              </select>
              <input
                type="number"
                className="w-1/3 h-5.5 text-right font-data border border-slate-300 rounded-[2px] px-1"
                value={cardAmt || ''}
                onChange={(e) => setCardAmt(parseFloat(e.target.value) || 0)}
              />
            </div>

            {/* Order Amt (sum from bottom adjustments) */}
            <div className="flex justify-between items-center h-6 border-b border-slate-100">
              <span className="text-slate-500">Order Amt</span>
              <span className="font-data text-slate-700 font-bold">₹{totalOrderAdjAmt.toLocaleString()}</span>
            </div>

            {/* Old Gold Amt (calculated from returns) */}
            <div className="flex justify-between items-center h-6">
              <span className="text-slate-500">Old Gold Amt</span>
              <div className="flex gap-1 items-center font-data">
                <span className="text-[9.5px] text-slate-400">{oldGoldWt.toFixed(3)}g</span>
                <span className="text-slate-600 font-bold">₹{oldGoldAmt.toLocaleString()}</span>
              </div>
            </div>

            {/* Old Silver Amt (calculated from returns) */}
            <div className="flex justify-between items-center h-6 border-b border-slate-100">
              <span className="text-slate-500">Old Silver Amt</span>
              <div className="flex gap-1 items-center font-data">
                <span className="text-[9.5px] text-slate-400">{oldSilverWt.toFixed(3)}g</span>
                <span className="text-slate-600 font-bold">₹{oldSilverAmt.toLocaleString()}</span>
              </div>
            </div>

            {/* Scheme Amt */}
            <div className="flex justify-between items-center h-6 gap-2">
              <span className="text-slate-500 w-1/3">Scheme Amt</span>
              <input
                type="number"
                className="w-2/3 h-5.5 text-right font-data border border-slate-300 rounded-[2px] px-1"
                value={schemeAmt || ''}
                onChange={(e) => setSchemeAmt(parseFloat(e.target.value) || 0)}
              />
            </div>

            {/* Cash Amt (Received) */}
            <div className="flex justify-between items-center h-6 gap-2">
              <span className="text-slate-500 w-1/3">Cash Amt</span>
              <input
                type="number"
                className="w-2/3 h-5.5 text-right font-data border border-slate-300 rounded-[2px] px-1 font-bold text-slate-800"
                value={cashAmt || ''}
                onChange={(e) => setCashAmt(parseFloat(e.target.value) || 0)}
              />
            </div>

            {/* Cash Paid Amt (Payments Out) */}
            <div className="flex justify-between items-center h-6 gap-2">
              <span className="text-slate-500 w-1/3">Cash Paid Amt</span>
              <input
                type="number"
                className="w-2/3 h-5.5 text-right font-data border border-slate-300 rounded-[2px] px-1"
                value={cashPaidAmt || ''}
                onChange={(e) => setCashPaidAmt(parseFloat(e.target.value) || 0)}
              />
            </div>

            {/* Kasar Amt */}
            <div className="flex justify-between items-center h-6 gap-2 border-b border-slate-100 pb-1">
              <span className="text-slate-500 w-1/3">Kasar Amt</span>
              <input
                type="number"
                className="w-2/3 h-5.5 text-right font-data border border-slate-300 rounded-[2px] px-1"
                value={kasarAmt || ''}
                onChange={(e) => setKasarAmt(parseFloat(e.target.value) || 0)}
              />
            </div>

            {/* Os Amt (Outstanding - highlighted red/rose) */}
            <div className="flex justify-between items-center py-1 bg-red-500/10 border border-red-500/25 px-2 rounded-[2px] mt-1 font-extrabold text-[12px] text-red-600">
              <span className="uppercase text-[9px] tracking-wider text-red-800 font-luxury">Outstanding (Os)</span>
              <span className="font-data text-[13px]">₹{osAmt.toLocaleString()}</span>
            </div>

          </div>
        </div>

      </div>

      {/* 9. ACTION TOOLBAR */}
      <div className="bg-slate-100 border border-slate-300 rounded-[2px] px-4 py-1.5 flex items-center justify-between shrink-0 select-none mt-1.5 shadow-sm">
        <div className="flex items-center gap-2">
          
          {/* Navigation Controls */}
          <div className="flex gap-0.5 border border-slate-300 rounded-[2px] overflow-hidden shadow-sm">
            <button
              type="button"
              onClick={handlePrev}
              className="w-8 h-8 flex items-center justify-center bg-white hover:bg-slate-50 text-slate-700 transition-colors border-r border-slate-300 cursor-pointer"
              title="Previous Voucher"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={handleNext}
              className="w-8 h-8 flex items-center justify-center bg-white hover:bg-slate-50 text-slate-700 transition-colors cursor-pointer"
              title="Next Voucher"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <span className="text-[9.5px] font-extrabold tracking-wider text-slate-500 uppercase ml-2 bg-white px-2 py-1.5 border border-slate-200 rounded-[2px] font-data">
            {activeInvoiceId ? 'EDIT VOUCHER' : 'NEW INVOICE'}
          </span>

          <label className="flex items-center gap-1 text-[11px] font-bold text-slate-500 cursor-pointer ml-3 select-none">
            <input type="checkbox" className="h-3.5 w-3.5 cursor-pointer accent-primary" />
            <span>Whatsapp</span>
          </label>
          
          <label className="flex items-center gap-1 text-[11px] font-bold text-slate-500 cursor-pointer ml-3 select-none">
            <input type="checkbox" className="h-3.5 w-3.5 cursor-pointer accent-primary" />
            <span>Huld Print</span>
          </label>
        </div>

        {/* Action Triggers */}
        <div className="flex gap-1.5 font-semibold">
          
          {/* Print */}
          <button
            type="button"
            onClick={() => window.print()}
            className="flex items-center gap-1 px-3 h-8 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-[2px] uppercase shadow-sm transition-all text-[11px] cursor-pointer"
          >
            <Printer className="h-3.5 w-3.5 text-slate-400" />
            <span>Print</span>
          </button>

          {/* Export PDF */}
          <button
            type="button"
            onClick={async () => {
              const res = await (window as any).api.saveToPDF(`SalesInvoice_${vchNo || 'New'}.pdf`);
              alert(res.message);
            }}
            className="flex items-center gap-1.5 px-3 h-8 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-[2px] uppercase shadow-sm transition-all text-[11px] font-bold cursor-pointer"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mr-0.5 animate-pulse" />
            <span>PDF</span>
          </button>

          {/* Save */}
          <button
            onClick={handleSave}
            className="flex items-center gap-1.5 px-4.5 h-8 text-white font-bold uppercase rounded-[2px] shadow-sm transition-all text-[11px] cursor-pointer"
            style={{ backgroundColor: `hsl(${themeAccentColors[themeAccent]})` }}
          >
            <Save className="h-3.5 w-3.5" />
            <span>Save</span>
          </button>

          {/* Cancel */}
          <button
            onClick={handleCancel}
            className="flex items-center gap-1 px-3.5 h-8 bg-white hover:bg-slate-50 text-slate-600 border border-slate-300 rounded-[2px] uppercase shadow-sm transition-all text-[11px] cursor-pointer"
          >
            <Undo2 className="h-3.5 w-3.5 text-slate-400" />
            <span>Cancel</span>
          </button>

          {/* Delete */}
          <button
            onClick={handleDelete}
            disabled={!activeInvoiceId}
            className="flex items-center gap-1 px-3.5 h-8 bg-red-600 hover:bg-red-700 text-white rounded-[2px] uppercase shadow-sm transition-all text-[11px] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
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

      {/* 10. STATUS BAR */}
      <footer className="bg-slate-800 text-slate-300 px-4 py-1.5 flex items-center justify-between text-[10.5px] font-semibold shrink-0 select-none mt-1 rounded-[2px] shadow-inner select-none">
        
        {/* Live Rates display */}
        <div className="flex items-center gap-3">
          
          {/* Dynamic Theme Color Selector */}
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

        {/* System & Rates Context */}
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
