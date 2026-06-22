import { useEffect, useState, useRef } from 'react';
import { useCompanyStore } from '../../store/useCompanyStore';
import { usePurchaseStore } from '../../store/usePurchaseStore';
import { usePartyStore } from '../../store/usePartyStore';
import { useTaxStore } from '../../store/useTaxStore';
import { useVoucherStore } from '../../store/useVoucherStore';
import { useRateStore } from '../../store/useRateStore';
import { useTabStore } from '../../store/useTabStore';
import { useHardwareScanner } from '../../hooks/useHardwareScanner';
import type { PurchaseVoucher, PurchaseItem, PurchaseTag, PurchaseDiamond } from '../../../shared/ipc-api';
import {
  Plus,
  Save,
  Undo2,
  LogOut,
  Search,
  ChevronLeft,
  ChevronRight,
  Printer,
  Trash2,
  FileText
} from 'lucide-react';

// ─── LOCAL TYPES ────────────────────────────────────────────────────────────────

interface LocalSummary {
  sr: number;
  it_code: string;
  it_name: string;
  pcs: number;
  gr_wt: number;
  oth_wt: number;
  net_wt: number;
  touch: number;
  wastage_percent: number;
  fine: number;
  con_rate: number;
  con_percent: number;
  rate: number;
  it_amt: number;
  ltype: 'G' | 'F' | 'P';
  lrate: number;
  lamt: number;
}

interface LocalTag {
  sr: number;
  item_sr: number;
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
  ltype: 'G' | 'F' | 'P';
  lbr_rate: number;
  lbr_amt: number;
  oth_amt: number;
  pr_cost: number;
  mrp: number;
  remark: string;
}

interface LocalDiamond {
  sr: number;
  it_code: string;
  it_name: string;
  tag_no: string;
  dm_color: string;
  dm_origin: string;
  dm_remark: string;
  dm_sf_no: string;
  pcs: number;
  kr_wt: number;
}

// ─── REUSABLE CELL INPUT ─────────────────────────────────────────────────────────

const CellInput = ({
  id, type = 'text', value, onChange, onKeyDown, onFocus,
  disabled = false, readOnly = false,
  align = 'left', mono = false, bold = false, color = '',
  step, placeholder = '', className = ''
}: {
  id?: string; type?: string; value: any; onChange?: (v: string) => void;
  onKeyDown?: (e: React.KeyboardEvent) => void; onFocus?: () => void;
  disabled?: boolean; readOnly?: boolean; align?: 'left' | 'right' | 'center';
  mono?: boolean; bold?: boolean; color?: string; step?: string;
  placeholder?: string; className?: string;
}) => (
  <input
    id={id}
    type={type}
    step={step}
    placeholder={placeholder}
    value={value}
    onChange={onChange ? (e) => onChange(e.target.value) : undefined}
    onKeyDown={onKeyDown}
    onFocus={onFocus}
    disabled={disabled}
    readOnly={readOnly}
    className={[
      'w-full h-[22px] px-1.5 border-0 focus:outline-none focus:ring-1 focus:ring-orange-400 focus:bg-yellow-50',
      'bg-transparent text-[11px]',
      align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left',
      mono ? 'font-mono' : '',
      bold ? 'font-bold' : '',
      color,
      disabled ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : '',
      readOnly ? 'bg-gray-50 text-gray-600 cursor-default select-none' : '',
      className
    ].join(' ')}
  />
);

// ─── SECTION HEADER ──────────────────────────────────────────────────────────────

const SectionHeader = ({
  title, onAdd, addLabel, addDisabled
}: {
  title: string; onAdd?: () => void; addLabel?: string; addDisabled?: boolean;
}) => (
  <div className="flex items-center justify-between px-3 py-1 bg-gray-200 border-b border-gray-300 shrink-0">
    <span className="text-[10.5px] font-bold font-mono uppercase text-gray-600 tracking-wide">{title}</span>
    {onAdd && (
      <button
        type="button"
        onClick={onAdd}
        disabled={addDisabled}
        className="flex items-center gap-1 px-2.5 py-0.5 bg-white hover:bg-orange-50 border border-gray-300 text-[10px] font-semibold text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        <Plus className="h-3 w-3" />
        {addLabel}
      </button>
    )}
  </div>
);

// ─── FOOTER TOTALS ROW ───────────────────────────────────────────────────────────

const FooterCell = ({ label, value, highlight = false, wide = false }: {
  label?: string; value: string; highlight?: boolean; wide?: boolean;
}) => (
  <td className={`px-2 py-0.5 text-right font-mono text-[10px] font-bold whitespace-nowrap
    ${highlight ? 'bg-amber-100 text-orange-700' : 'text-gray-700'}
    ${wide ? 'min-w-[80px]' : 'min-w-[60px]'}`}>
    {label && <span className="text-gray-500 font-normal mr-1">{label}</span>}
    {value}
  </td>
);

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────────

export default function PurchaseView() {
  const selectedCompany = useCompanyStore((state) => state.selectedCompany);
  const closeTab = useTabStore((state) => state.closeTab);

  const { vouchers, loadVouchers, createVoucher, updateVoucher, deleteVoucher } = usePurchaseStore();
  const { parties, loadParties } = usePartyStore();
  const { taxes, loadTaxes } = useTaxStore();
  const { accounts, loadAccounts } = useVoucherStore();
  const { currentRates, loadRates } = useRateStore();

  const [selectedVoucherId, setSelectedVoucherId] = useState<string | null>(null);
  const [vchNo, setVchNo] = useState('');
  const [vchDate, setVchDate] = useState(new Date().toISOString().split('T')[0]);
  const [vchTime, setVchTime] = useState(new Date().toTimeString().split(' ')[0]);
  const [refNo, setRefNo] = useState('');
  const [partyId, setPartyId] = useState('');
  const [stlBillNo, setStlBillNo] = useState('');
  const [employee, setEmployee] = useState('001');
  const [bankName, setBankName] = useState('');
  const [vchDesc, setVchDesc] = useState('');
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [taxRateId, setTaxRateId] = useState('');
  const [tcsAmount, setTcsAmount] = useState<number>(0);
  const [roundOff, setRoundOff] = useState<number>(0);
  const [cashAmount, setCashAmount] = useState<number>(0);
  const [chequeAmount, setChequeAmount] = useState<number>(0);
  const [cardAmount, setCardAmount] = useState<number>(0);
  const [bankAccountId, setBankAccountId] = useState('');
  const [kasarAmount, setKasarAmount] = useState<number>(0);
  const [summaries, setSummaries] = useState<LocalSummary[]>([]);
  const [tags, setTags] = useState<LocalTag[]>([]);
  const [diamonds, setDiamonds] = useState<LocalDiamond[]>([]);
  const [activeSummaryIndex, setActiveSummaryIndex] = useState<number>(0);
  const [activeTagIndex, setActiveTagIndex] = useState<number>(0);
  const [leftSearch, setLeftSearch] = useState('');
  const [showLeftSidebar, setShowLeftSidebar] = useState(false);
  const [liveRateChecked, setLiveRateChecked] = useState(true);
  const [whatsappOpen, setWhatsappOpen] = useState(false);

  useEffect(() => {
    if (selectedCompany) {
      const compId = selectedCompany.id;
      loadVouchers(compId);
      loadParties(compId);
      loadTaxes(compId);
      loadAccounts(compId);
      loadRates(compId);
    }
  }, [selectedCompany]);

  useEffect(() => {
    if (selectedVoucherId) {
      const v = vouchers.find((item) => item.id === selectedVoucherId);
      if (v) {
        setVchNo(v.vch_no);
        setVchDate(v.vch_date);
        setVchTime(v.vch_time || '');
        setRefNo(v.ref_no || '');
        setPartyId(v.party_id || '');
        setStlBillNo(v.stl_bill_no || '');
        setEmployee(v.employee || '001');
        setBankName(v.bank_name || '');
        setVchDesc(v.vch_desc || '');
        setDiscountAmount(v.discount_amount || 0);
        setTaxRateId(v.tax_rate_id || '');
        setTcsAmount(v.tcs_amount || 0);
        setRoundOff(v.round_off || 0);
        setCashAmount(v.cash_amount || 0);
        setChequeAmount(v.cheque_amount || 0);
        setCardAmount(v.card_amount || 0);
        setBankAccountId(v.bank_account_id || '');
        setKasarAmount(v.kasar_amount || 0);
        const mappedSummaries: LocalSummary[] = (v.items || []).map((i) => ({
          sr: i.sr, it_code: i.it_code, it_name: i.it_name, pcs: i.pcs,
          gr_wt: i.gr_wt || 0, oth_wt: i.oth_wt || 0, net_wt: i.net_wt || 0,
          touch: i.touch || 0, wastage_percent: i.wastage_percent || 0, fine: i.fine || 0,
          con_rate: i.con_rate || 0, con_percent: i.con_percent || 0, rate: i.rate || 0,
          it_amt: i.it_amt || 0, ltype: (i.ltype || 'G') as 'G' | 'F' | 'P',
          lrate: i.lrate || 0, lamt: i.lamt || 0
        }));
        setSummaries(mappedSummaries);
        const mappedTags: LocalTag[] = (v.tags || []).map((t) => {
          const parentItem = (v.items || []).find((i) => i.id === t.purchase_item_id);
          return {
            sr: t.sr, item_sr: parentItem ? parentItem.sr : 1,
            it_code: t.it_code, tag_no: t.tag_no, counter: t.counter || '001',
            design: t.design || '', size: t.size || '', huld: t.huld || '',
            pcs: t.pcs || 1, gr_wt: t.gr_wt || 0, ls_wt: t.ls_wt || 0,
            net_wt: t.net_wt || 0, lbr_percent: t.lbr_percent || 0,
            ltype: (t.ltype || 'G') as 'G' | 'F' | 'P', lbr_rate: t.lbr_rate || 0,
            lbr_amt: t.lbr_amt || 0, oth_amt: t.oth_amt || 0, pr_cost: t.pr_cost || 0,
            mrp: t.mrp || 0, remark: t.remark || ''
          };
        });
        setTags(mappedTags);
        const mappedDiamonds: LocalDiamond[] = (v.diamonds || []).map((d) => ({
          sr: d.sr, it_code: d.it_code, it_name: d.it_name, tag_no: d.tag_no || '',
          dm_color: d.dm_color || '', dm_origin: d.dm_origin || '', dm_remark: d.dm_remark || '',
          dm_sf_no: d.dm_sf_no || '', pcs: d.pcs || 0, kr_wt: d.kr_wt || 0
        }));
        setDiamonds(mappedDiamonds);
        setActiveSummaryIndex(0);
        setActiveTagIndex(0);
      }
    } else {
      handleNew();
    }
  }, [selectedVoucherId, vouchers]);

  useEffect(() => {
    if (!selectedVoucherId && selectedCompany) generateNextVchNo();
  }, [vouchers, selectedVoucherId]);

  const generateNextVchNo = () => {
    if (vouchers.length === 0) { setVchNo('00001'); return; }
    const sorted = [...vouchers].sort((a, b) => b.vch_no.localeCompare(a.vch_no));
    const lastVch = sorted[0].vch_no;
    const numMatch = lastVch.match(/\d+/);
    if (numMatch) {
      setVchNo(String(parseInt(numMatch[0], 10) + 1).padStart(5, '0'));
    } else {
      setVchNo(String(Date.now()).slice(-5));
    }
  };

  const handleNew = () => {
    setSelectedVoucherId(null);
    setVchDate(new Date().toISOString().split('T')[0]);
    setVchTime(new Date().toTimeString().split(' ')[0]);
    setRefNo(''); setPartyId(''); setStlBillNo(''); setEmployee('001');
    setBankName(''); setVchDesc(''); setDiscountAmount(0); setTaxRateId('');
    setTcsAmount(0); setRoundOff(0); setCashAmount(0); setChequeAmount(0);
    setCardAmount(0); setBankAccountId(''); setKasarAmount(0);
    const defaultSummaries: LocalSummary[] = Array.from({ length: 4 }, (_, idx) => ({
      sr: idx + 1, it_code: '', it_name: '', pcs: 0, gr_wt: 0, oth_wt: 0, net_wt: 0,
      touch: 100, wastage_percent: 0, fine: 0, con_rate: 0, con_percent: 0,
      rate: 0, it_amt: 0, ltype: 'G', lrate: 0, lamt: 0
    }));
    setSummaries(defaultSummaries);
    setTags([]); setDiamonds([]);
    setActiveSummaryIndex(0); setActiveTagIndex(0);
    generateNextVchNo();
  };

  useHardwareScanner((data) => {
    handlePurchaseScan(data.value);
  }, 'Purchase Entry');

  const handlePurchaseScan = async (scannedValue: string) => {
    if (!selectedCompany) return;
    try {
      // 1. Check if barcode already exists as a product template
      const prod = await (window as any).api.getProductByBarcode(selectedCompany.id, scannedValue);
      if (prod) {
        const updated = [...summaries];
        if (updated[activeSummaryIndex]) {
          const row = { ...updated[activeSummaryIndex] };
          row.it_code = prod.barcode || prod.sku || '';
          row.it_name = prod.name;
          row.rate = prod.purchase_price || prod.selling_price;
          row.gr_wt = prod.gross_weight;
          row.touch = parseFloat(prod.purity) || 92;
          recalculateSummaryRow(row);
          updated[activeSummaryIndex] = row;
          setSummaries(updated);
          return;
        }
      }

      // 2. Check barcode uniqueness for new tag registration
      const isUnique = await (window as any).api.isBarcodeUnique(selectedCompany.id, scannedValue);
      if (!isUnique) {
        alert(`Warning: Barcode/Tag code "${scannedValue}" already exists in the system database. Duplicates are not allowed.`);
        return;
      }

      // If it is unique, and tag rows are loaded, assign it to the active tag row
      const parentSummary = summaries[activeSummaryIndex];
      if (!parentSummary) return;
      
      const relatedTags = tags.filter((t) => t.item_sr === parentSummary.sr);
      const targetTag = relatedTags[activeTagIndex];
      if (targetTag) {
        const actualIdx = tags.findIndex((t) => t.tag_no === targetTag.tag_no);
        if (actualIdx !== -1) {
          const updatedTags = [...tags];
          const row = { ...updatedTags[actualIdx] };
          row.tag_no = scannedValue;
          updatedTags[actualIdx] = row;
          setTags(updatedTags);
          propagateTagsToSummary(parentSummary.sr, updatedTags);
        }
      }
    } catch (err) {
      console.error('Failed processing purchase scanner input:', err);
    }
  };

  // ─── CALCULATORS ─────────────────────────────────────────────────────────────

  const recalculateSummaryRow = (row: LocalSummary) => {
    row.net_wt = parseFloat((row.gr_wt - row.oth_wt).toFixed(3));
    row.fine = parseFloat(((row.net_wt * ((row.touch || 0) + (row.wastage_percent || 0))) / 100).toFixed(3)) || 0;
    row.it_amt = Math.round(row.fine * (row.rate || 0));
    if (row.ltype === 'G') row.lamt = Math.round(row.net_wt * (row.lrate || 0));
    else if (row.ltype === 'P') row.lamt = Math.round(row.pcs * (row.lrate || 0));
    else row.lamt = Math.round(row.lrate || 0);
  };

  const recalculateTagRow = (tag: LocalTag, parentRate: number) => {
    tag.net_wt = parseFloat((tag.gr_wt - tag.ls_wt).toFixed(3));
    if (tag.ltype === 'G') tag.lbr_amt = Math.round(tag.net_wt * (tag.lbr_rate || 0));
    else if (tag.ltype === 'P') tag.lbr_amt = Math.round(tag.pcs * (tag.lbr_rate || 0));
    else tag.lbr_amt = Math.round(tag.lbr_rate || 0);
    tag.pr_cost = Math.round((tag.net_wt * parentRate) + tag.lbr_amt + (tag.oth_amt || 0));
    tag.mrp = Math.round(tag.pr_cost * 1.25);
  };

  const propagateTagsToSummary = (itemSr: number, allTags: LocalTag[]) => {
    const parentIdx = summaries.findIndex((s) => s.sr === itemSr);
    if (parentIdx === -1) return;
    const relatedTags = allTags.filter((t) => t.item_sr === itemSr);
    if (relatedTags.length === 0) return;
    const newSummaries = [...summaries];
    const sRow = { ...newSummaries[parentIdx] };
    sRow.pcs = relatedTags.reduce((acc, t) => acc + (t.pcs || 0), 0);
    sRow.gr_wt = parseFloat(relatedTags.reduce((acc, t) => acc + (t.gr_wt || 0), 0).toFixed(3));
    sRow.oth_wt = parseFloat(relatedTags.reduce((acc, t) => acc + (t.ls_wt || 0), 0).toFixed(3));
    sRow.net_wt = parseFloat(relatedTags.reduce((acc, t) => acc + (t.net_wt || 0), 0).toFixed(3));
    sRow.lamt = relatedTags.reduce((acc, t) => acc + (t.lbr_amt || 0), 0);
    recalculateSummaryRow(sRow);
    newSummaries[parentIdx] = sRow;
    setSummaries(newSummaries);
  };

  const propagateDiamondsToTag = (tagNo: string, allDiamonds: LocalDiamond[], currentTags: LocalTag[]) => {
    const targetTagIdx = currentTags.findIndex((t) => t.tag_no === tagNo);
    if (targetTagIdx === -1) return;
    const relatedDms = allDiamonds.filter((d) => d.tag_no === tagNo);
    const sumCarats = relatedDms.reduce((acc, d) => acc + (d.kr_wt || 0), 0);
    const newTags = [...currentTags];
    const tagRow = { ...newTags[targetTagIdx] };
    tagRow.ls_wt = parseFloat((sumCarats * 0.2).toFixed(3));
    const parentRate = summaries.find((s) => s.sr === tagRow.item_sr)?.rate || 0;
    recalculateTagRow(tagRow, parentRate);
    newTags[targetTagIdx] = tagRow;
    setTags(newTags);
    propagateTagsToSummary(tagRow.item_sr, newTags);
  };

  // ─── CELL HANDLERS ───────────────────────────────────────────────────────────

  const handleSummaryCellChange = (idx: number, field: keyof LocalSummary, value: any) => {
    const updated = [...summaries];
    const row = { ...updated[idx] };
    if (field === 'it_code') {
      row.it_code = value.toUpperCase();
      if (row.it_code.startsWith('G') || row.it_code.includes('GOLD')) { row.it_name = 'GOLD ORNAMENTS'; row.touch = 92; }
      else if (row.it_code.startsWith('S') || row.it_code.includes('SILVER')) { row.it_name = 'SILVER ORNAMENTS'; row.touch = 70; }
      else if (row.it_code.startsWith('D') || row.it_code.includes('DIAMOND')) { row.it_name = 'DIAMOND ORNAMENTS'; row.touch = 75; }
      else { row.it_name = row.it_code ? `${row.it_code} PRODUCTS` : ''; }
      if (liveRateChecked && currentRates) {
        if (row.it_code.includes('22K') || row.it_code.startsWith('G')) row.rate = currentRates.gold_rate_22k;
        else if (row.it_code.includes('24K')) row.rate = currentRates.gold_rate_24k;
        else if (row.it_code.includes('18K')) row.rate = currentRates.gold_rate_18k;
        else if (row.it_code.startsWith('S')) row.rate = currentRates.silver_rate;
      }
    } else if (field === 'it_name') { row.it_name = value; }
    else if (field === 'ltype') { row.ltype = value; }
    else { row[field] = (parseFloat(value) || 0) as never; }
    recalculateSummaryRow(row);
    updated[idx] = row;
    setSummaries(updated);
    if (field === 'rate') {
      const updatedTags = tags.map((t) => {
        if (t.item_sr === row.sr) { const tRow = { ...t }; recalculateTagRow(tRow, row.rate); return tRow; }
        return t;
      });
      setTags(updatedTags);
    }
  };

  const handleTagCellChange = (idx: number, field: keyof LocalTag, value: any) => {
    const parentSummary = summaries[activeSummaryIndex];
    if (!parentSummary) return;
    const relatedTags = tags.filter((t) => t.item_sr === parentSummary.sr);
    const targetTag = relatedTags[idx];
    if (!targetTag) return;
    const actualIdx = tags.findIndex((t) => t.tag_no === targetTag.tag_no);
    if (actualIdx === -1) return;
    const updated = [...tags];
    const row = { ...updated[actualIdx] };
    if (['it_code', 'tag_no', 'design', 'counter', 'size', 'huld', 'remark'].includes(field)) {
      (row as any)[field] = field === 'it_code' || field === 'tag_no' || field === 'huld' ? value.toUpperCase() : value;
    } else if (field === 'ltype') { row.ltype = value; }
    else { (row as any)[field] = parseFloat(value) || 0; }
    recalculateTagRow(row, parentSummary.rate || 0);
    updated[actualIdx] = row;
    setTags(updated);
    propagateTagsToSummary(parentSummary.sr, updated);
  };

  const handleDiamondCellChange = (idx: number, field: keyof LocalDiamond, value: any) => {
    const parentSummary = summaries[activeSummaryIndex];
    if (!parentSummary) return;
    const relatedTags = tags.filter((t) => t.item_sr === parentSummary.sr);
    const parentTag = relatedTags[activeTagIndex];
    if (!parentTag) return;
    const relatedDms = diamonds.filter((d) => d.tag_no === parentTag.tag_no);
    const targetDm = relatedDms[idx];
    if (!targetDm) return;
    const actualIdx = diamonds.findIndex((d) => d.tag_no === parentTag.tag_no && d.sr === targetDm.sr);
    if (actualIdx === -1) return;
    const updated = [...diamonds];
    const row = { ...updated[actualIdx] };
    if (field === 'it_code') {
      row.it_code = value.toUpperCase();
      row.it_name = row.it_code === 'DM' ? 'DIAMOND' : row.it_code === 'ST' ? 'STONE' : `${row.it_code} STONE`;
    } else if (field === 'it_name') { row.it_name = value; }
    else if (field === 'dm_color') { row.dm_color = value; }
    else if (field === 'dm_origin') { row.dm_origin = value; }
    else if (field === 'dm_remark') { row.dm_remark = value; }
    else if (field === 'dm_sf_no') { row.dm_sf_no = value; }
    else if (field === 'pcs') { row.pcs = parseInt(value, 10) || 0; }
    else if (field === 'kr_wt') { row.kr_wt = parseFloat(value) || 0; }
    updated[actualIdx] = row;
    setDiamonds(updated);
    propagateDiamondsToTag(parentTag.tag_no, updated, tags);
  };

  // ─── ROW ADD / REMOVE ────────────────────────────────────────────────────────

  const handleAddSummaryRow = () => {
    setSummaries([...summaries, {
      sr: summaries.length + 1, it_code: '', it_name: '', pcs: 0,
      gr_wt: 0, oth_wt: 0, net_wt: 0, touch: 100, wastage_percent: 0,
      fine: 0, con_rate: 0, con_percent: 0, rate: 0, it_amt: 0, ltype: 'G', lrate: 0, lamt: 0
    }]);
  };

  const handleRemoveSummaryRow = (idx: number) => {
    const parent = summaries[idx];
    if (parent) {
      const cleanTags = tags.filter((t) => t.item_sr !== parent.sr);
      const cleanDms = diamonds.filter((d) => {
        const parentTag = tags.find((t) => t.tag_no === d.tag_no);
        return parentTag ? parentTag.item_sr !== parent.sr : true;
      });
      setTags(cleanTags); setDiamonds(cleanDms);
    }
    const filtered = summaries.filter((_, i) => i !== idx);
    setSummaries(filtered.map((s, i) => ({ ...s, sr: i + 1 })));
    setActiveSummaryIndex(0); setActiveTagIndex(0);
  };

  const handleAddTagRow = () => {
    const parentSummary = summaries[activeSummaryIndex];
    if (!parentSummary || !parentSummary.it_code) { alert('Please enter Item Code on the summary row first.'); return; }
    const matchingTags = tags.filter((t) => t.item_sr === parentSummary.sr);
    const autoTagNo = `${parentSummary.it_code}-${String(tags.length + 1).padStart(4, '0')}`;
    const newTag: LocalTag = {
      sr: matchingTags.length + 1, item_sr: parentSummary.sr, it_code: parentSummary.it_code,
      tag_no: autoTagNo, counter: '001', design: '', size: '', huld: '', pcs: 1,
      gr_wt: 0, ls_wt: 0, net_wt: 0, lbr_percent: 0, ltype: parentSummary.ltype,
      lbr_rate: parentSummary.lrate || 0, lbr_amt: 0, oth_amt: 0, pr_cost: 0, mrp: 0, remark: ''
    };
    const updatedTags = [...tags, newTag];
    setTags(updatedTags);
    setActiveTagIndex(updatedTags.filter((t) => t.item_sr === parentSummary.sr).length - 1);
    propagateTagsToSummary(parentSummary.sr, updatedTags);
  };

  const handleRemoveTagRow = (idx: number) => {
    const parentSummary = summaries[activeSummaryIndex];
    if (!parentSummary) return;
    const related = tags.filter((t) => t.item_sr === parentSummary.sr);
    const target = related[idx];
    if (!target) return;
    const cleanDms = diamonds.filter((d) => d.tag_no !== target.tag_no);
    const cleanTags = tags.filter((t) => t.tag_no !== target.tag_no);
    setDiamonds(cleanDms); setTags(cleanTags); setActiveTagIndex(0);
    propagateTagsToSummary(parentSummary.sr, cleanTags);
  };

  const handleAddDiamondRow = () => {
    const parentSummary = summaries[activeSummaryIndex];
    if (!parentSummary) return;
    const relatedTags = tags.filter((t) => t.item_sr === parentSummary.sr);
    const parentTag = relatedTags[activeTagIndex];
    if (!parentTag) { alert('Please select or add a Tag row first.'); return; }
    const relatedDms = diamonds.filter((d) => d.tag_no === parentTag.tag_no);
    const newDm: LocalDiamond = {
      sr: relatedDms.length + 1, it_code: 'DM', it_name: 'DIAMOND',
      tag_no: parentTag.tag_no, dm_color: 'G-H', dm_origin: 'VVS', dm_remark: '',
      dm_sf_no: 'SF-1', pcs: 1, kr_wt: 0
    };
    const updatedDms = [...diamonds, newDm];
    setDiamonds(updatedDms);
    propagateDiamondsToTag(parentTag.tag_no, updatedDms, tags);
  };

  const handleRemoveDiamondRow = (idx: number) => {
    const parentSummary = summaries[activeSummaryIndex];
    if (!parentSummary) return;
    const relatedTags = tags.filter((t) => t.item_sr === parentSummary.sr);
    const parentTag = relatedTags[activeTagIndex];
    if (!parentTag) return;
    const relatedDms = diamonds.filter((d) => d.tag_no === parentTag.tag_no);
    const target = relatedDms[idx];
    if (!target) return;
    const cleanDms = diamonds.filter((d) => !(d.tag_no === parentTag.tag_no && d.sr === target.sr));
    setDiamonds(cleanDms);
    propagateDiamondsToTag(parentTag.tag_no, cleanDms, tags);
  };

  // ─── KEYBOARD NAVIGATION ────────────────────────────────────────────────────

  const moveFocus = (grid: 'L1' | 'L2' | 'L3', r: number, c: number, direction: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT' | 'NEXT' | 'PREV') => {
    const gridCols = grid === 'L1' ? 12 : grid === 'L2' ? 14 : 7;
    const gridRows =
      grid === 'L1' ? summaries.length
        : grid === 'L2' ? tags.filter((t) => t.item_sr === summaries[activeSummaryIndex]?.sr).length
          : diamonds.filter((d) => d.tag_no === tags.filter((t) => t.item_sr === summaries[activeSummaryIndex]?.sr)[activeTagIndex]?.tag_no).length;

    const attemptFocus = (row: number, col: number): boolean => {
      const el = document.getElementById(`${grid}-${row}-${col}`);
      if (el && !el.hasAttribute('disabled') && el.getAttribute('readonly') !== 'true') {
        el.focus();
        if (el instanceof HTMLInputElement) el.select();
        return true;
      }
      return false;
    };

    if (direction === 'NEXT' || direction === 'RIGHT') {
      for (let col = c + 1; col < gridCols; col++) if (attemptFocus(r, col)) return;
      for (let row = r + 1; row < gridRows; row++) for (let col = 0; col < gridCols; col++) if (attemptFocus(row, col)) return;
    } else if (direction === 'PREV' || direction === 'LEFT') {
      for (let col = c - 1; col >= 0; col--) if (attemptFocus(r, col)) return;
      for (let row = r - 1; row >= 0; row--) for (let col = gridCols - 1; col >= 0; col--) if (attemptFocus(row, col)) return;
    } else if (direction === 'DOWN') {
      for (let row = r + 1; row < gridRows; row++) if (attemptFocus(row, c)) return;
    } else if (direction === 'UP') {
      for (let row = r - 1; row >= 0; row--) if (attemptFocus(row, c)) return;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, grid: 'L1' | 'L2' | 'L3', rowIndex: number, colIndex: number) => {
    if (e.key === 'Tab') { e.preventDefault(); moveFocus(grid, rowIndex, colIndex, e.shiftKey ? 'PREV' : 'NEXT'); }
    else if (e.key === 'Enter') { e.preventDefault(); moveFocus(grid, rowIndex, colIndex, 'NEXT'); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); moveFocus(grid, rowIndex, colIndex, 'UP'); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); moveFocus(grid, rowIndex, colIndex, 'DOWN'); }
    else if (e.key === 'ArrowRight' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); moveFocus(grid, rowIndex, colIndex, 'RIGHT'); }
    else if (e.key === 'ArrowLeft' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); moveFocus(grid, rowIndex, colIndex, 'LEFT'); }
  };

  useEffect(() => {
    const globalKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F2') { e.preventDefault(); handleSave(); }
      else if (e.key === 'F1') { e.preventDefault(); setShowLeftSidebar((prev) => !prev); }
      else if (e.altKey && (e.key === 'l' || e.key === 'L')) { e.preventDefault(); setShowLeftSidebar((prev) => !prev); }
    };
    window.addEventListener('keydown', globalKeyDown);
    return () => window.removeEventListener('keydown', globalKeyDown);
  }, [summaries, tags, diamonds, partyId, vchNo, vchDate]);

  // ─── LIVE RATE SYNC ──────────────────────────────────────────────────────────

  useEffect(() => {
    if (liveRateChecked && currentRates) {
      const updated = summaries.map((row) => {
        const r = { ...row };
        if (r.it_code.includes('22K') || r.it_code.startsWith('G')) r.rate = currentRates.gold_rate_22k;
        else if (r.it_code.includes('24K')) r.rate = currentRates.gold_rate_24k;
        else if (r.it_code.includes('18K')) r.rate = currentRates.gold_rate_18k;
        else if (r.it_code.startsWith('S')) r.rate = currentRates.silver_rate;
        recalculateSummaryRow(r);
        return r;
      });
      setSummaries(updated);
    }
  }, [liveRateChecked, currentRates]);

  // ─── SAVE / DELETE / NAV ─────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!selectedCompany) return;
    if (!vchNo.trim()) { alert('Voucher Number is required.'); return; }
    if (!partyId) { alert('Please select a Supplier/Party.'); return; }
    const finalSummaries = summaries.filter((s) => s.it_code.trim());
    if (finalSummaries.length === 0) { alert('Please enter at least one Summary Item row.'); return; }
    const payloadVoucher: Omit<PurchaseVoucher, 'id'> = {
      company_id: selectedCompany.id, vch_no: vchNo.trim(), vch_date: vchDate,
      vch_time: vchTime || null, ref_no: refNo || null, party_id: partyId,
      stl_bill_no: stlBillNo || null, employee: employee || null, bank_name: bankName || null,
      vch_desc: vchDesc || null, net_amount: calculatedNetAmt, discount_amount: discountAmount,
      tax_rate_id: taxRateId || null, tax_amount: calculatedTaxAmt, tcs_amount: tcsAmount,
      round_off: roundOff, total_amount: calculatedGrandTotal, cheque_amount: chequeAmount,
      card_amount: cardAmount, bank_account_id: bankAccountId || null, cash_amount: cashAmount,
      kasar_amount: kasarAmount, outstanding_amount: calculatedOutstanding
    };
    const payloadItems: Omit<PurchaseItem, 'id' | 'voucher_id'>[] = finalSummaries.map((s) => ({
      sr: s.sr, it_code: s.it_code.trim(), it_name: s.it_name.trim(), pcs: s.pcs,
      gr_wt: s.gr_wt, oth_wt: s.oth_wt, net_wt: s.net_wt, touch: s.touch,
      wastage_percent: s.wastage_percent, fine: s.fine, con_rate: s.con_rate,
      con_percent: s.con_percent, rate: s.rate, it_amt: s.it_amt, ltype: s.ltype,
      lrate: s.lrate, lamt: s.lamt
    }));
    const activeSummarySr = new Set(finalSummaries.map((s) => s.sr));
    const payloadTags = tags
      .filter((t) => activeSummarySr.has(t.item_sr) && t.tag_no.trim())
      .map((t) => ({
        sr: t.sr, item_sr: t.item_sr, it_code: t.it_code.trim(), tag_no: t.tag_no.trim(),
        counter: t.counter || '001', design: t.design || '', size: t.size || '', huld: t.huld || '',
        pcs: t.pcs, gr_wt: t.gr_wt, ls_wt: t.ls_wt, net_wt: t.net_wt, lbr_percent: t.lbr_percent,
        ltype: t.ltype, lbr_rate: t.lbr_rate, lbr_amt: t.lbr_amt, oth_amt: t.oth_amt,
        pr_cost: t.pr_cost, mrp: t.mrp, remark: t.remark || ''
      }));
    const activeTagNos = new Set(payloadTags.map((t) => t.tag_no));
    const payloadDms = diamonds
      .filter((d) => activeTagNos.has(d.tag_no) && d.it_code.trim())
      .map((d) => ({
        sr: d.sr, it_code: d.it_code.trim(), it_name: d.it_name.trim(), tag_no: d.tag_no,
        dm_color: d.dm_color || '', dm_origin: d.dm_origin || '', dm_remark: d.dm_remark || '',
        dm_sf_no: d.dm_sf_no || '', pcs: d.pcs, kr_wt: d.kr_wt
      }));
    try {
      if (selectedVoucherId) {
        await updateVoucher({ ...payloadVoucher, id: selectedVoucherId }, payloadItems, payloadTags as any, payloadDms);
        alert('Purchase Voucher updated successfully!');
      } else {
        await createVoucher(payloadVoucher, payloadItems, payloadTags as any, payloadDms);
        alert('Purchase Voucher saved successfully!');
      }
      handleNew();
    } catch (e: any) { alert(`Error saving voucher: ${e.message || e}`); }
  };

  const handleDelete = async () => {
    if (!selectedVoucherId) return;
    if (confirm('Delete this purchase voucher? All barcodes will be removed from stock.')) {
      try {
        await deleteVoucher(selectedVoucherId);
        alert('Voucher deleted.');
        handleNew();
      } catch (e: any) { alert(`Failed: ${e.message}`); }
    }
  };

  const handlePrevVch = () => {
    if (!vouchers.length) return;
    if (!selectedVoucherId) { setSelectedVoucherId(vouchers[0].id); return; }
    const idx = vouchers.findIndex((v) => v.id === selectedVoucherId);
    if (idx < vouchers.length - 1) setSelectedVoucherId(vouchers[idx + 1].id);
  };

  const handleNextVch = () => {
    if (!vouchers.length || !selectedVoucherId) return;
    const idx = vouchers.findIndex((v) => v.id === selectedVoucherId);
    if (idx > 0) setSelectedVoucherId(vouchers[idx - 1].id);
    else handleNew();
  };

  // ─── COMPUTED TOTALS ─────────────────────────────────────────────────────────

  const activeSummaries = summaries.filter((s) => s.it_code);
  const totalFineGold = parseFloat(activeSummaries.filter((s) => !s.it_code.startsWith('S')).reduce((acc, s) => acc + s.fine, 0).toFixed(3));
  const totalFineSilver = parseFloat(activeSummaries.filter((s) => s.it_code.startsWith('S')).reduce((acc, s) => acc + s.fine, 0).toFixed(3));
  const totalItemAmt = activeSummaries.reduce((acc, s) => acc + (s.it_amt || 0), 0);
  const totalLbrAmt = activeSummaries.reduce((acc, s) => acc + (s.lamt || 0), 0);
  const totalOthAmt = tags.reduce((acc, t) => acc + (t.oth_amt || 0), 0);
  const calculatedNetAmt = totalItemAmt + totalLbrAmt + totalOthAmt;
  const selectedTax = taxes.find((t) => t.id === taxRateId);
  const taxRateVal = selectedTax ? selectedTax.tax_percent : 0;
  const calculatedTaxAmt = Math.round((calculatedNetAmt - discountAmount) * (taxRateVal / 100));
  const calculatedGrandTotal = Math.round(calculatedNetAmt - discountAmount + calculatedTaxAmt + tcsAmount + roundOff);
  const totalPaidAmount = cashAmount + chequeAmount + cardAmount + kasarAmount;
  const calculatedOutstanding = calculatedGrandTotal - totalPaidAmount;
  const totalGoldWeight = parseFloat(activeSummaries.filter((s) => !s.it_code.startsWith('S')).reduce((acc, s) => acc + s.net_wt, 0).toFixed(3));
  const totalFineWeight = parseFloat(activeSummaries.reduce((acc, s) => acc + s.fine, 0).toFixed(3));

  const parentSummary = summaries[activeSummaryIndex];
  const activeTagsList = parentSummary ? tags.filter((t) => t.item_sr === parentSummary.sr) : [];
  const parentTag = activeTagsList[activeTagIndex];
  const activeDiamondsList = parentTag ? diamonds.filter((d) => d.tag_no === parentTag.tag_no) : [];

  const filteredVouchersList = vouchers.filter((v) => {
    const term = leftSearch.toLowerCase();
    const partyName = parties.find((p) => p.id === v.party_id)?.name || '';
    return v.vch_no.toLowerCase().includes(term) || partyName.toLowerCase().includes(term) || (v.ref_no || '').toLowerCase().includes(term);
  });

  // Common th class
  const thClass = "px-2 py-1 text-left text-[9.5px] font-bold uppercase text-gray-600 tracking-wide whitespace-nowrap border-r border-gray-300 last:border-r-0 bg-gray-100";
  const thClassR = thClass + " text-right";
  const thClassC = thClass + " text-center";

  // ─── RENDER ──────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-full bg-gray-100 text-gray-900 font-sans text-[11px] select-none leading-tight overflow-hidden">

      {/* ── LEFT SIDEBAR ────────────────────────────────────────────────────── */}
      {showLeftSidebar && (
        <aside className="w-52 bg-white border-r border-gray-300 flex flex-col shrink-0 shadow-md">
          <div className="px-2 py-1.5 border-b border-gray-300 bg-gray-50">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-gray-400" />
              <input
                type="text"
                placeholder="Search vouchers…"
                className="w-full pl-6 pr-2 py-1 border border-gray-300 bg-white text-[11px] focus:outline-none focus:ring-1 focus:ring-orange-400"
                value={leftSearch}
                onChange={(e) => setLeftSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {filteredVouchersList.map((v) => {
              const party = parties.find((p) => p.id === v.party_id);
              const isSelected = v.id === selectedVoucherId;
              return (
                <div
                  key={v.id}
                  onClick={() => setSelectedVoucherId(v.id)}
                  className={`px-2.5 py-2 border-b border-gray-100 cursor-pointer transition-colors ${isSelected ? 'bg-orange-50 border-l-4 border-l-orange-500' : 'hover:bg-gray-50 border-l-4 border-l-transparent'
                    }`}
                >
                  <div className="flex justify-between items-center">
                    <span className="font-mono font-bold text-gray-800 text-[11px]">{v.vch_no}</span>
                    <span className="text-[9.5px] text-gray-400">{v.vch_date}</span>
                  </div>
                  <div className="truncate text-gray-600 text-[10.5px] mt-0.5">{party?.name || 'Unknown'}</div>
                  <div className="text-right text-orange-700 font-bold font-mono text-[11px] mt-0.5">₹{(v.total_amount || 0).toLocaleString()}</div>
                </div>
              );
            })}
          </div>

          <div className="p-2 border-t border-gray-300 bg-gray-50">
            <button
              onClick={handleNew}
              className="w-full flex items-center justify-center gap-1.5 py-1.5 bg-orange-500 hover:bg-orange-600 text-white font-bold text-[11px] transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              NEW INVOICE
            </button>
          </div>
        </aside>
      )}

      {/* ── MAIN CONTENT ────────────────────────────────────────────────────── */}
      <section className="flex-1 flex flex-col min-w-0 overflow-scroll">

        {/* ── HEADER ──────────────────────────────────────────────────────── */}
        <div className="bg-[#FFF4E6] border-b border-orange-200 px-3 py-2 shrink-0">
          {/* Title bar */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowLeftSidebar((p) => !p)}
                className="px-2.5 py-1 bg-white border border-orange-300 text-orange-700 text-[10px] font-bold hover:bg-orange-50 transition-colors"
              >
                {showLeftSidebar ? '◀ HIDE' : '▶ LIST'}
              </button>
              <span className="font-black text-sm text-orange-800 tracking-wide uppercase">Gold Purchase Tax Invoice</span>
            </div>
            <div className="flex items-center gap-3">
              {/* Quick summary box */}
              <div className="flex items-center gap-4 border border-orange-200 bg-white px-3 py-1 text-[10.5px] font-mono">
                <span className="text-gray-500">Net Wt: <strong className="text-orange-700">{totalGoldWeight.toFixed(3)}g</strong></span>
                <span className="text-gray-500">Fine Au: <strong className="text-red-700">{totalFineGold.toFixed(3)}g</strong></span>
                <span className="text-gray-500">Fine Ag: <strong className="text-blue-700">{totalFineSilver.toFixed(3)}g</strong></span>
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 border ${selectedVoucherId ? 'border-blue-300 bg-blue-50 text-blue-700' : 'border-green-300 bg-green-50 text-green-700'
                }`}>
                {selectedVoucherId ? '✎ EDIT MODE' : '✚ NEW VOUCHER'}
              </span>
            </div>
          </div>

          {/* Header fields — using flex-wrap to prevent overflow */}
          <div className="flex flex-wrap gap-x-3 gap-y-2 items-end">

            {/* Vch No */}
            <div className="flex flex-col min-w-[90px]">
              <label className="text-[9.5px] text-gray-500 uppercase font-semibold mb-0.5">Vch No</label>
              <div className="flex gap-1">
                <input
                  type="text"
                  className="w-20 h-[26px] px-1.5 border border-gray-300 bg-gray-100 font-mono font-bold text-red-700 text-[11px] focus:outline-none"
                  value={vchNo}
                  readOnly
                />
                <button
                  type="button"
                  onClick={() => setShowLeftSidebar((p) => !p)}
                  className="px-2 h-[26px] bg-gray-200 hover:bg-gray-300 border border-gray-300 text-[10px] font-bold"
                  title="F1 – Toggle List"
                >
                  F1
                </button>
              </div>
            </div>

            {/* Vch Date */}
            <div className="flex flex-col min-w-[110px]">
              <label className="text-[9.5px] text-gray-500 uppercase font-semibold mb-0.5">Date</label>
              <input
                type="date"
                className="h-[26px] px-1.5 border border-gray-300 bg-white text-[11px] focus:outline-none focus:ring-1 focus:ring-orange-400"
                value={vchDate}
                onChange={(e) => setVchDate(e.target.value)}
              />
            </div>

            {/* Day */}
            <div className="flex flex-col min-w-[72px]">
              <label className="text-[9.5px] text-gray-500 uppercase font-semibold mb-0.5">Day</label>
              <input
                type="text"
                className="h-[26px] px-1.5 border border-gray-300 bg-gray-100 text-gray-500 text-[11px] font-semibold focus:outline-none cursor-default"
                value={vchDate ? new Date(vchDate).toLocaleDateString('en-US', { weekday: 'short' }) : ''}
                readOnly
              />
            </div>

            {/* Time */}
            <div className="flex flex-col min-w-[80px]">
              <label className="text-[9.5px] text-gray-500 uppercase font-semibold mb-0.5">Time</label>
              <input
                type="text"
                className="h-[26px] px-1.5 border border-gray-300 bg-white font-mono text-[11px] focus:outline-none focus:ring-1 focus:ring-orange-400"
                value={vchTime}
                onChange={(e) => setVchTime(e.target.value)}
              />
            </div>

            {/* Ref No */}
            <div className="flex flex-col min-w-[90px]">
              <label className="text-[9.5px] text-gray-500 uppercase font-semibold mb-0.5">Ref No</label>
              <input
                type="text"
                className="h-[26px] px-1.5 border border-gray-300 bg-white text-[11px] focus:outline-none focus:ring-1 focus:ring-orange-400"
                value={refNo}
                onChange={(e) => setRefNo(e.target.value)}
              />
            </div>

            {/* Party */}
            <div className="flex flex-col flex-1 min-w-[200px] max-w-[320px]">
              <label className="text-[9.5px] text-gray-500 uppercase font-semibold mb-0.5">Party / Supplier</label>
              <select
                className="h-[26px] px-1.5 border border-gray-300 bg-white font-semibold text-[11px] focus:outline-none focus:ring-1 focus:ring-orange-400"
                value={partyId}
                onChange={(e) => setPartyId(e.target.value)}
              >
                <option value="">— Select Party —</option>
                {parties.map((p) => (
                  <option key={p.id} value={p.id}>[{p.code}] {p.name}</option>
                ))}
              </select>
            </div>

            {/* SI Bill No */}
            <div className="flex flex-col min-w-[100px]">
              <label className="text-[9.5px] text-gray-500 uppercase font-semibold mb-0.5">SI Bill No</label>
              <input
                type="text"
                className="h-[26px] px-1.5 border border-gray-300 bg-white text-[11px] focus:outline-none focus:ring-1 focus:ring-orange-400"
                value={stlBillNo}
                onChange={(e) => setStlBillNo(e.target.value)}
              />
            </div>

          </div>
        </div>

        {/* ── LEVEL 1: PURCHASE SUMMARY ───────────────────────────────────── */}
        <div className="h-[21%] border-b border-gray-300 bg-white flex flex-col overflow-hidden">
          <SectionHeader
            title={`Level 1 — Purchase Summaries (${activeSummaries.length} items)`}
            onAdd={handleAddSummaryRow}
            addLabel="Add Row"
          />

          <div className="flex-1 overflow-auto">
            <table className="border-collapse text-[11px]" style={{ minWidth: '1100px', width: '100%' }}>
              <thead className="sticky top-0 z-10">
                <tr className="border-b-2 border-gray-300">
                  <th className={thClassC} style={{ width: 28 }}>#</th>
                  <th className={thClass} style={{ width: 72 }}>ItCode</th>
                  <th className={thClass} style={{ width: 150 }}>Item Name</th>
                  <th className={thClassR} style={{ width: 44 }}>Pcs</th>
                  <th className={thClassR} style={{ width: 72 }}>Gr Wt</th>
                  <th className={thClassR} style={{ width: 62 }}>Oth Wt</th>
                  <th className={thClassR} style={{ width: 72 }}>Net Wt</th>
                  <th className={thClassR} style={{ width: 54 }}>Touch</th>
                  <th className={thClassR} style={{ width: 50 }}>Wst%</th>
                  <th className={thClassR + " bg-amber-50 text-orange-700"} style={{ width: 80 }}>Fine ✦</th>
                  <th className={thClassR} style={{ width: 62 }}>ConRate</th>
                  <th className={thClassR} style={{ width: 48 }}>Con%</th>
                  <th className={thClassR} style={{ width: 80 }}>Rate</th>
                  <th className={thClassR} style={{ width: 88 }}>It Amt</th>
                  <th className={thClassC} style={{ width: 46 }}>LType</th>
                  <th className={thClassR} style={{ width: 66 }}>LRate</th>
                  <th className={thClassR} style={{ width: 78 }}>L Amt</th>
                  <th className={thClassC} style={{ width: 30 }}></th>
                </tr>
              </thead>
              <tbody>
                {summaries.map((s, idx) => {
                  const isActive = activeSummaryIndex === idx;
                  const isLinkedToTags = tags.some((t) => t.item_sr === s.sr);
                  const trClass = `border-b border-gray-200 cursor-pointer transition-colors ${isActive ? 'bg-orange-50 outline outline-1 outline-orange-300' : 'hover:bg-gray-50'
                    }`;
                  const kd = (c: number) => (e: React.KeyboardEvent) => handleKeyDown(e, 'L1', idx, c);
                  const fc = () => setActiveSummaryIndex(idx);
                  const ch = (f: keyof LocalSummary) => (v: string) => handleSummaryCellChange(idx, f, v);

                  return (
                    <tr key={s.sr} onClick={() => setActiveSummaryIndex(idx)} className={trClass}>
                      <td className="text-center text-[10px] text-gray-500 font-mono bg-gray-50 px-1">{s.sr}</td>
                      <td className="border-r border-gray-200"><CellInput id={`L1-${idx}-0`} value={s.it_code} onChange={ch('it_code')} onKeyDown={kd(0)} onFocus={fc} bold mono /></td>
                      <td className="border-r border-gray-200"><CellInput id={`L1-${idx}-1`} value={s.it_name} onChange={ch('it_name')} onKeyDown={kd(1)} onFocus={fc} /></td>
                      <td className="border-r border-gray-200"><CellInput id={`L1-${idx}-2`} type="number" value={s.pcs || ''} onChange={ch('pcs')} onKeyDown={kd(2)} onFocus={fc} align="right" mono disabled={isLinkedToTags} /></td>
                      <td className="border-r border-gray-200"><CellInput id={`L1-${idx}-3`} type="number" step="0.001" value={s.gr_wt || ''} onChange={ch('gr_wt')} onKeyDown={kd(3)} onFocus={fc} align="right" mono disabled={isLinkedToTags} /></td>
                      <td className="border-r border-gray-200"><CellInput id={`L1-${idx}-4`} type="number" step="0.001" value={s.oth_wt || ''} onChange={ch('oth_wt')} onKeyDown={kd(4)} onFocus={fc} align="right" mono disabled={isLinkedToTags} /></td>
                      <td className="text-right px-2 font-mono text-gray-600 bg-gray-50 border-r border-gray-200 whitespace-nowrap">{s.net_wt.toFixed(3)}</td>
                      <td className="border-r border-gray-200"><CellInput id={`L1-${idx}-5`} type="number" step="0.01" value={s.touch || ''} onChange={ch('touch')} onKeyDown={kd(5)} onFocus={fc} align="right" mono /></td>
                      <td className="border-r border-gray-200"><CellInput id={`L1-${idx}-6`} type="number" step="0.01" value={s.wastage_percent || ''} onChange={ch('wastage_percent')} onKeyDown={kd(6)} onFocus={fc} align="right" mono /></td>
                      <td className="text-right px-2 font-mono font-bold text-orange-600 bg-amber-50 border-r-2 border-amber-300 whitespace-nowrap">{s.fine.toFixed(3)}</td>
                      <td className="border-r border-gray-200"><CellInput id={`L1-${idx}-7`} type="number" value={s.con_rate || ''} onChange={ch('con_rate')} onKeyDown={kd(7)} onFocus={fc} align="right" mono /></td>
                      <td className="border-r border-gray-200"><CellInput id={`L1-${idx}-8`} type="number" value={s.con_percent || ''} onChange={ch('con_percent')} onKeyDown={kd(8)} onFocus={fc} align="right" mono /></td>
                      <td className="border-r border-gray-200"><CellInput id={`L1-${idx}-9`} type="number" value={s.rate || ''} onChange={ch('rate')} onKeyDown={kd(9)} onFocus={fc} align="right" mono bold color="text-blue-700" /></td>
                      <td className="text-right px-2 font-mono font-bold text-red-800 bg-gray-50 border-r border-gray-200 whitespace-nowrap">₹{s.it_amt.toLocaleString()}</td>
                      <td className="border-r border-gray-200">
                        <select id={`L1-${idx}-10`} className="w-full h-[22px] bg-transparent text-center text-[11px] font-bold border-0 focus:outline-none focus:ring-1 focus:ring-orange-400 focus:bg-yellow-50"
                          value={s.ltype} onChange={(e) => handleSummaryCellChange(idx, 'ltype', e.target.value)}
                          onKeyDown={kd(10)} onFocus={fc}>
                          <option value="G">G</option>
                          <option value="F">F</option>
                          <option value="P">P</option>
                        </select>
                      </td>
                      <td className="border-r border-gray-200"><CellInput id={`L1-${idx}-11`} type="number" value={s.lrate || ''} onChange={ch('lrate')} onKeyDown={kd(11)} onFocus={fc} align="right" mono /></td>
                      <td className="text-right px-2 font-mono text-gray-600 bg-gray-50 border-r border-gray-200 whitespace-nowrap">{s.lamt.toLocaleString()}</td>
                      <td className="text-center">
                        <button type="button" onClick={(e) => { e.stopPropagation(); handleRemoveSummaryRow(idx); }} className="p-0.5 text-gray-300 hover:text-red-500 transition-colors">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* L1 Totals */}
          <div className="shrink-0 bg-gray-100 border-t border-gray-300">
            <table className="border-collapse text-[10px] font-mono" style={{ minWidth: '1100px', width: '100%' }}>
              <tbody>
                <tr className="font-bold text-gray-700">
                  <td className="px-2 py-0.5 text-gray-500 uppercase tracking-wide" style={{ width: 28 + 72 + 150 }}>Totals</td>
                  <td className="px-2 text-right" style={{ width: 44 }}>{activeSummaries.reduce((a, s) => a + s.pcs, 0)}</td>
                  <td className="px-2 text-right text-gray-500" style={{ width: 72 }}>{activeSummaries.reduce((a, s) => a + s.gr_wt, 0).toFixed(3)}g</td>
                  <td className="px-2 text-right text-gray-500" style={{ width: 62 }}>{activeSummaries.reduce((a, s) => a + s.oth_wt, 0).toFixed(3)}g</td>
                  <td className="px-2 text-right text-gray-500" style={{ width: 72 }}>{activeSummaries.reduce((a, s) => a + s.net_wt, 0).toFixed(3)}g</td>
                  <td style={{ width: 54 + 50 }}></td>
                  <td className="px-2 text-right font-bold text-orange-600 bg-amber-50" style={{ width: 80 }}>{totalFineWeight.toFixed(3)}g</td>
                  <td style={{ width: 62 + 48 + 80 }}></td>
                  <td className="px-2 text-right text-red-800 font-bold" style={{ width: 88 }}>₹{totalItemAmt.toLocaleString()}</td>
                  <td style={{ width: 46 + 66 }}></td>
                  <td className="px-2 text-right text-gray-600" style={{ width: 78 }}>₹{totalLbrAmt.toLocaleString()}</td>
                  <td style={{ width: 30 }}></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* ── LEVEL 2: TAG DETAILS ────────────────────────────────────────── */}
        <div className="h-[21%] border-b border-gray-300 bg-white flex flex-col overflow-hidden">
          <SectionHeader
            title={`Level 2 — Tag Details${parentSummary ? ` › Sr ${parentSummary.sr}: ${parentSummary.it_code || '—'}` : ' (Select Summary Row)'}`}
            onAdd={handleAddTagRow}
            addLabel="Add Tag"
            addDisabled={!parentSummary?.it_code}
          />

          <div className="flex-1 overflow-auto">
            <table className="border-collapse text-[11px]" style={{ minWidth: '1200px', width: '100%' }}>
              <thead className="sticky top-0 z-10">
                <tr className="border-b-2 border-gray-300">
                  <th className={thClassC} style={{ width: 28 }}>#</th>
                  <th className={thClass} style={{ width: 64 }}>ItCode</th>
                  <th className={thClass} style={{ width: 100 }}>Tag No</th>
                  <th className={thClassC} style={{ width: 56 }}>Counter</th>
                  <th className={thClass} style={{ width: 120 }}>Design</th>
                  <th className={thClassC} style={{ width: 46 }}>Size</th>
                  <th className={thClass} style={{ width: 88 }}>HUID</th>
                  <th className={thClassR} style={{ width: 40 }}>Pcs</th>
                  <th className={thClassR} style={{ width: 66 }}>Gr Wt</th>
                  <th className={thClassR} style={{ width: 62 }}>Ls Wt</th>
                  <th className={thClassR} style={{ width: 66 }}>Net Wt</th>
                  <th className={thClassR} style={{ width: 50 }}>Lbr%</th>
                  <th className={thClassC} style={{ width: 46 }}>LType</th>
                  <th className={thClassR} style={{ width: 66 }}>LbrRate</th>
                  <th className={thClassR} style={{ width: 72 }}>Lbr Amt</th>
                  <th className={thClassR} style={{ width: 72 }}>Oth Amt</th>
                  <th className={thClassR} style={{ width: 84 }}>Pr Cost</th>
                  <th className={thClassR} style={{ width: 76 }}>MRP</th>
                  <th className={thClass} style={{ width: 100 }}>Remarks</th>
                  <th className={thClassC} style={{ width: 30 }}></th>
                </tr>
              </thead>
              <tbody>
                {activeTagsList.map((t, idx) => {
                  const isActive = activeTagIndex === idx;
                  const hasDiamonds = diamonds.some((d) => d.tag_no === t.tag_no);
                  const trClass = `border-b border-gray-200 cursor-pointer transition-colors ${isActive ? 'bg-orange-50 outline outline-1 outline-orange-300' : 'hover:bg-gray-50'
                    }`;
                  const kd = (c: number) => (e: React.KeyboardEvent) => handleKeyDown(e, 'L2', idx, c);
                  const fc = () => setActiveTagIndex(idx);
                  const ch = (f: keyof LocalTag) => (v: string) => handleTagCellChange(idx, f, v);

                  return (
                    <tr key={t.tag_no} onClick={() => setActiveTagIndex(idx)} className={trClass}>
                      <td className="text-center text-[10px] text-gray-500 font-mono bg-gray-50 px-1">{idx + 1}</td>
                      <td className="border-r border-gray-200"><CellInput id={`L2-${idx}-0`} value={t.it_code} onChange={ch('it_code')} onKeyDown={kd(0)} onFocus={fc} bold mono /></td>
                      <td className="border-r border-gray-200"><CellInput id={`L2-${idx}-1`} value={t.tag_no} onChange={ch('tag_no')} onKeyDown={kd(1)} onFocus={fc} mono bold /></td>
                      <td className="border-r border-gray-200"><CellInput id={`L2-${idx}-2`} value={t.counter} onChange={ch('counter')} onKeyDown={kd(2)} onFocus={fc} align="center" mono /></td>
                      <td className="border-r border-gray-200"><CellInput id={`L2-${idx}-3`} value={t.design} onChange={ch('design')} onKeyDown={kd(3)} onFocus={fc} /></td>
                      <td className="border-r border-gray-200"><CellInput id={`L2-${idx}-4`} value={t.size} onChange={ch('size')} onKeyDown={kd(4)} onFocus={fc} align="center" mono /></td>
                      <td className="border-r border-gray-200"><CellInput id={`L2-${idx}-5`} value={t.huld} onChange={ch('huld')} onKeyDown={kd(5)} onFocus={fc} mono /></td>
                      <td className="border-r border-gray-200"><CellInput id={`L2-${idx}-6`} type="number" value={t.pcs} onChange={ch('pcs')} onKeyDown={kd(6)} onFocus={fc} align="right" mono /></td>
                      <td className="border-r border-gray-200"><CellInput id={`L2-${idx}-7`} type="number" step="0.001" value={t.gr_wt || ''} onChange={ch('gr_wt')} onKeyDown={kd(7)} onFocus={fc} align="right" mono /></td>
                      <td className="border-r border-gray-200"><CellInput id={`L2-${idx}-8`} type="number" step="0.001" value={t.ls_wt || ''} onChange={ch('ls_wt')} onKeyDown={kd(8)} onFocus={fc} align="right" mono disabled={hasDiamonds} /></td>
                      <td className="text-right px-2 font-mono text-gray-600 bg-gray-50 border-r border-gray-200 whitespace-nowrap">{t.net_wt.toFixed(3)}</td>
                      <td className="border-r border-gray-200"><CellInput id={`L2-${idx}-9`} type="number" step="0.01" value={t.lbr_percent || ''} onChange={ch('lbr_percent')} onKeyDown={kd(9)} onFocus={fc} align="right" mono /></td>
                      <td className="border-r border-gray-200">
                        <select id={`L2-${idx}-10`} className="w-full h-[22px] bg-transparent text-center text-[11px] font-bold border-0 focus:outline-none focus:ring-1 focus:ring-orange-400 focus:bg-yellow-50"
                          value={t.ltype} onChange={(e) => handleTagCellChange(idx, 'ltype', e.target.value)}
                          onKeyDown={kd(10)} onFocus={fc}>
                          <option value="G">G</option><option value="F">F</option><option value="P">P</option>
                        </select>
                      </td>
                      <td className="border-r border-gray-200"><CellInput id={`L2-${idx}-11`} type="number" value={t.lbr_rate || ''} onChange={ch('lbr_rate')} onKeyDown={kd(11)} onFocus={fc} align="right" mono /></td>
                      <td className="text-right px-2 font-mono text-gray-600 bg-gray-50 border-r border-gray-200 whitespace-nowrap">{t.lbr_amt.toLocaleString()}</td>
                      <td className="border-r border-gray-200"><CellInput id={`L2-${idx}-12`} type="number" value={t.oth_amt || ''} onChange={ch('oth_amt')} onKeyDown={kd(12)} onFocus={fc} align="right" mono /></td>
                      <td className="text-right px-2 font-mono font-bold text-emerald-700 bg-emerald-50 border-r border-gray-200 whitespace-nowrap">{t.pr_cost.toLocaleString()}</td>
                      <td className="text-right px-2 font-mono font-bold text-purple-700 bg-purple-50 border-r border-gray-200 whitespace-nowrap">{t.mrp.toLocaleString()}</td>
                      <td className="border-r border-gray-200"><CellInput id={`L2-${idx}-13`} value={t.remark} onChange={ch('remark')} onKeyDown={kd(13)} onFocus={fc} /></td>
                      <td className="text-center">
                        <button type="button" onClick={(e) => { e.stopPropagation(); handleRemoveTagRow(idx); }} className="p-0.5 text-gray-300 hover:text-red-500 transition-colors">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* L2 Totals */}
          <div className="shrink-0 bg-gray-100 border-t border-gray-300">
            <table className="border-collapse text-[10px] font-mono" style={{ minWidth: '1200px', width: '100%' }}>
              <tbody>
                <tr className="font-bold text-gray-700">
                  <td className="px-2 py-0.5 text-gray-500 text-[9.5px] uppercase" style={{ width: 28 + 64 + 100 + 56 + 120 + 46 + 88 }}>Totals Level 2</td>
                  <td className="px-2 text-right" style={{ width: 40 }}>{activeTagsList.reduce((a, t) => a + t.pcs, 0)}</td>
                  <td className="px-2 text-right text-gray-500" style={{ width: 66 }}>{activeTagsList.reduce((a, t) => a + t.gr_wt, 0).toFixed(3)}g</td>
                  <td className="px-2 text-right text-gray-500" style={{ width: 62 }}>{activeTagsList.reduce((a, t) => a + t.ls_wt, 0).toFixed(3)}g</td>
                  <td className="px-2 text-right text-gray-500" style={{ width: 66 }}>{activeTagsList.reduce((a, t) => a + t.net_wt, 0).toFixed(3)}g</td>
                  <td style={{ width: 50 + 46 + 66 }}></td>
                  <td className="px-2 text-right text-gray-600" style={{ width: 72 }}>₹{activeTagsList.reduce((a, t) => a + t.lbr_amt, 0).toLocaleString()}</td>
                  <td className="px-2 text-right text-gray-600" style={{ width: 72 }}>₹{activeTagsList.reduce((a, t) => a + t.oth_amt, 0).toLocaleString()}</td>
                  <td className="px-2 text-right text-emerald-700 bg-emerald-50" style={{ width: 84 }}>₹{activeTagsList.reduce((a, t) => a + t.pr_cost, 0).toLocaleString()}</td>
                  <td className="px-2 text-right text-purple-700 bg-purple-50" style={{ width: 76 }}>₹{activeTagsList.reduce((a, t) => a + t.mrp, 0).toLocaleString()}</td>
                  <td style={{ width: 100 + 30 }}></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* ── BOTTOM ROW: L3 + INFO + ACCOUNTING ──────────────────────────── */}
        <div className="flex-1 flex overflow-hidden min-h-0">

          {/* ── LEVEL 3: DIAMONDS ──────────────────────────────────────── */}
          <div className="w-[36%] min-w-[300px] border-r border-gray-300 flex flex-col bg-white overflow-hidden">
            <SectionHeader
              title={`Level 3 — Diamonds${parentTag ? ` › ${parentTag.tag_no}` : ' (Select Tag)'}`}
              onAdd={handleAddDiamondRow}
              addLabel="Add Diamond"
              addDisabled={!parentTag}
            />

            <div className="flex-1 overflow-auto">
              <table className="border-collapse text-[11px] w-full">
                <thead className="sticky top-0 z-10">
                  <tr className="border-b-2 border-gray-300">
                    <th className={thClassC} style={{ width: 28 }}>#</th>
                    <th className={thClass} style={{ width: 52 }}>Code</th>
                    <th className={thClass} style={{ minWidth: 90 }}>Name</th>
                    <th className={thClassC} style={{ width: 54 }}>Color</th>
                    <th className={thClassC} style={{ width: 54 }}>Origin</th>
                    <th className={thClassC} style={{ width: 54 }}>SF No</th>
                    <th className={thClassR} style={{ width: 40 }}>Pcs</th>
                    <th className={thClassR} style={{ width: 62 }}>Kr Wt</th>
                    <th className={thClassC} style={{ width: 30 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {activeDiamondsList.map((d, idx) => {
                    const kd = (c: number) => (e: React.KeyboardEvent) => handleKeyDown(e, 'L3', idx, c);
                    const fc = () => { };
                    const ch = (f: keyof LocalDiamond) => (v: string) => handleDiamondCellChange(idx, f, v);
                    return (
                      <tr key={idx} className="border-b border-gray-200 hover:bg-gray-50">
                        <td className="text-center text-[10px] text-gray-500 font-mono bg-gray-50 px-1">{d.sr}</td>
                        <td className="border-r border-gray-200"><CellInput id={`L3-${idx}-0`} value={d.it_code} onChange={ch('it_code')} onKeyDown={kd(0)} onFocus={fc} bold mono /></td>
                        <td className="border-r border-gray-200"><CellInput id={`L3-${idx}-1`} value={d.it_name} onChange={ch('it_name')} onKeyDown={kd(1)} onFocus={fc} /></td>
                        <td className="border-r border-gray-200"><CellInput id={`L3-${idx}-2`} value={d.dm_color} onChange={ch('dm_color')} onKeyDown={kd(2)} onFocus={fc} align="center" /></td>
                        <td className="border-r border-gray-200"><CellInput id={`L3-${idx}-3`} value={d.dm_origin} onChange={ch('dm_origin')} onKeyDown={kd(3)} onFocus={fc} align="center" /></td>
                        <td className="border-r border-gray-200"><CellInput id={`L3-${idx}-4`} value={d.dm_sf_no} onChange={ch('dm_sf_no')} onKeyDown={kd(4)} onFocus={fc} align="center" mono /></td>
                        <td className="border-r border-gray-200"><CellInput id={`L3-${idx}-5`} type="number" value={d.pcs || ''} onChange={ch('pcs')} onKeyDown={kd(5)} onFocus={fc} align="right" mono /></td>
                        <td className="border-r border-gray-200"><CellInput id={`L3-${idx}-6`} type="number" step="0.001" value={d.kr_wt || ''} onChange={ch('kr_wt')} onKeyDown={kd(6)} onFocus={fc} align="right" mono /></td>
                        <td className="text-center">
                          <button type="button" onClick={() => handleRemoveDiamondRow(idx)} className="p-0.5 text-gray-300 hover:text-red-500 transition-colors">
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="shrink-0 bg-gray-100 border-t border-gray-300 px-2 py-0.5 flex justify-between text-[10px] font-mono font-bold text-gray-600">
              <span className="text-gray-500 uppercase text-[9px]">Totals Level 3</span>
              <span>{activeDiamondsList.reduce((a, d) => a + d.pcs, 0)} pcs</span>
              <span className="text-blue-700">{activeDiamondsList.reduce((a, d) => a + d.kr_wt, 0).toFixed(3)} ct</span>
            </div>
          </div>

          {/* ── ADDITIONAL INFO ─────────────────────────────────────────── */}
          <div className="w-[34%] min-w-[250px] border-r border-gray-300 bg-gray-50 flex flex-col overflow-hidden">
            <div className="px-3 py-1 bg-gray-200 border-b border-gray-300 shrink-0">
              <span className="text-[10.5px] font-bold uppercase text-gray-600 font-mono tracking-wide">Additional Info</span>
            </div>

            <div className="flex-1 p-2 overflow-y-auto flex flex-col gap-2">
              {/* Huld fields */}
              <div>
                <div className="text-[9px] text-gray-500 uppercase font-semibold mb-0.5">Huld Weights</div>
                <div className="grid grid-cols-4 gap-1">
                  {['HuWt', 'Huld2', 'Huld3', 'Huld4'].map((label) => (
                    <div key={label}>
                      <div className="text-[8px] text-gray-400 mb-0.5">{label}</div>
                      <input type="text" className="w-full h-[20px] px-1 border border-gray-300 bg-gray-100 font-mono text-[9.5px] text-right text-gray-400 cursor-default" value="0.000" readOnly />
                    </div>
                  ))}
                </div>
              </div>

              {/* Employee & Bank */}
              <div className="grid grid-cols-2 gap-1.5">
                <div>
                  <div className="text-[9px] text-gray-500 uppercase font-semibold mb-0.5">Employee</div>
                  <div className="flex gap-1">
                    <input type="text" className="w-10 h-[22px] px-1 border border-gray-300 bg-white font-mono text-[10px] focus:outline-none focus:ring-1 focus:ring-orange-400"
                      value={employee} onChange={(e) => setEmployee(e.target.value)} />
                    <input type="text" className="flex-1 h-[22px] px-1 border border-gray-300 bg-gray-100 font-semibold text-gray-500 text-[10px] cursor-default" value="SELF" readOnly />
                  </div>
                </div>
                <div>
                  <div className="text-[9px] text-gray-500 uppercase font-semibold mb-0.5">Bank Name</div>
                  <input type="text" placeholder="Bank name…" className="w-full h-[22px] px-1 border border-gray-300 bg-white text-[10px] focus:outline-none focus:ring-1 focus:ring-orange-400"
                    value={bankName} onChange={(e) => setBankName(e.target.value)} />
                </div>
              </div>

              {/* Narration */}
              <div>
                <div className="text-[9px] text-gray-500 uppercase font-semibold mb-0.5">Voucher Narration</div>
                <textarea rows={2} placeholder="Purchase remarks or transaction memo…"
                  className="w-full px-2 py-1 border border-gray-300 bg-white text-[10px] focus:outline-none focus:ring-1 focus:ring-orange-400 resize-none"
                  value={vchDesc} onChange={(e) => setVchDesc(e.target.value)} />
              </div>

              {/* Summary info card */}
              <div className="border border-orange-200 bg-white rounded-sm p-2 text-[10px] font-mono shadow-sm">
                <div className="font-bold text-orange-800 border-b border-orange-100 pb-0.5 mb-1 truncate text-[9.5px]">
                  {parentTag ? `${parentTag.it_code} — ${parentTag.design || 'Tag Info'}` : 'Select a Tag'}
                </div>
                <div className="flex justify-between py-0.5"><span className="text-gray-500">Grand Total</span><span className="font-bold text-orange-700">₹{calculatedGrandTotal.toLocaleString()}</span></div>
                <div className="flex justify-between py-0.5"><span className="text-gray-500">Fine Gold</span><span className="font-bold">{totalFineGold.toFixed(3)}g</span></div>
                <div className="flex justify-between py-0.5"><span className="text-gray-500">Fine Silver</span><span className="font-bold">{totalFineSilver.toFixed(3)}g</span></div>
              </div>
            </div>
          </div>

          {/* ── ACCOUNTING PANEL ────────────────────────────────────────── */}
          <div className="flex-1 min-w-[320px] bg-gray-50 flex flex-col overflow-hidden">
            <div className="px-3 py-1 bg-gray-200 border-b border-gray-300 shrink-0">
              <span className="text-[10.5px] font-bold uppercase text-gray-600 font-mono tracking-wide">Accounting Summary</span>
            </div>

            <div className="flex-1 overflow-y-auto p-2">
              <div className="grid grid-cols-2 gap-x-3 gap-y-1">

                {/* Column 1: Bill Calculation */}
                <div className="flex flex-col gap-1">
                  {/* Net Amt */}
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[9.5px] text-gray-500 whitespace-nowrap">Net Amt</span>
                    <input type="text" className="w-[88px] h-[22px] px-1 border border-gray-200 bg-gray-100 font-mono text-[10px] font-bold text-right text-gray-700 cursor-default" value={`₹${calculatedNetAmt.toLocaleString()}`} readOnly />
                  </div>

                  {/* Discount */}
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[9.5px] text-gray-500 whitespace-nowrap">Discount</span>
                    <input type="number" className="w-[88px] h-[22px] px-1 border border-gray-300 bg-white font-mono text-[10px] font-bold text-right focus:outline-none focus:ring-1 focus:ring-orange-400"
                      value={discountAmount || ''} onChange={(e) => setDiscountAmount(parseFloat(e.target.value) || 0)} />
                  </div>

                  {/* Tax Rate & Amt */}
                  <div className="flex items-center justify-between gap-1">
                    <select className="flex-1 h-[22px] px-1 border border-gray-300 bg-white font-bold text-gray-700 text-[9.5px] focus:outline-none focus:ring-1 focus:ring-orange-400 truncate"
                      value={taxRateId} onChange={(e) => setTaxRateId(e.target.value)}>
                      <option value="">— Tax —</option>
                      {taxes.map((t) => <option key={t.id} value={t.id}>{t.name} ({t.tax_percent}%)</option>)}
                    </select>
                    <input type="text" className="w-[70px] h-[22px] px-1 border border-gray-200 bg-gray-100 font-mono text-[10px] font-bold text-right text-gray-600 cursor-default" value={`₹${calculatedTaxAmt.toLocaleString()}`} readOnly />
                  </div>

                  {/* TCS Amount */}
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[9.5px] text-gray-500 whitespace-nowrap">TCS Amt</span>
                    <input type="number" className="w-[88px] h-[22px] px-1 border border-gray-300 bg-white font-mono text-[10px] font-bold text-right focus:outline-none focus:ring-1 focus:ring-orange-400"
                      value={tcsAmount || ''} onChange={(e) => setTcsAmount(parseFloat(e.target.value) || 0)} />
                  </div>

                  {/* Round Off */}
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[9.5px] text-gray-500 whitespace-nowrap">Round Off</span>
                    <input type="number" step="0.01" className="w-[88px] h-[22px] px-1 border border-gray-300 bg-white font-mono text-[10px] font-bold text-right focus:outline-none focus:ring-1 focus:ring-orange-400"
                      value={roundOff || ''} onChange={(e) => setRoundOff(parseFloat(e.target.value) || 0)} />
                  </div>

                  {/* Grand Total */}
                  <div className="flex items-center justify-between gap-1 pt-1 mt-0.5 border-t border-orange-300">
                    <span className="text-[10px] font-extrabold text-orange-800 uppercase tracking-wide">Total</span>
                    <input type="text" className="w-[88px] h-[24px] px-1 border border-orange-400 bg-orange-50 font-mono text-[11px] font-extrabold text-right text-red-700 cursor-default"
                      value={`₹${calculatedGrandTotal.toLocaleString()}`} readOnly />
                  </div>
                </div>

                {/* Column 2: Payments / Outstanding */}
                <div className="flex flex-col gap-1">
                  {/* Cheque */}
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[9.5px] text-gray-500 whitespace-nowrap">Cheque</span>
                    <input type="number" className="w-[88px] h-[22px] px-1 border border-gray-300 bg-white font-mono text-[10px] font-bold text-right focus:outline-none focus:ring-1 focus:ring-orange-400"
                      value={chequeAmount || ''} onChange={(e) => setChequeAmount(parseFloat(e.target.value) || 0)} />
                  </div>

                  {/* Card / Bank A/c */}
                  <div className="flex items-center justify-between gap-1">
                    <select className="flex-1 h-[22px] px-1 border border-gray-300 bg-white font-bold text-gray-600 text-[9.5px] focus:outline-none focus:ring-1 focus:ring-orange-400 truncate"
                      value={bankAccountId} onChange={(e) => setBankAccountId(e.target.value)}>
                      <option value="">— Bank —</option>
                      {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                    <input type="number" className="w-[70px] h-[22px] px-1 border border-gray-300 bg-white font-mono text-[10px] font-bold text-right focus:outline-none focus:ring-1 focus:ring-orange-400"
                      value={cardAmount || ''} onChange={(e) => setCardAmount(parseFloat(e.target.value) || 0)} />
                  </div>

                  {/* Cash */}
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[9.5px] text-gray-500 whitespace-nowrap">Cash</span>
                    <input type="number" className="w-[88px] h-[22px] px-1 border border-gray-300 bg-white font-mono text-[10px] font-bold text-right focus:outline-none focus:ring-1 focus:ring-orange-400"
                      value={cashAmount || ''} onChange={(e) => setCashAmount(parseFloat(e.target.value) || 0)} />
                  </div>

                  {/* Kasar */}
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[9.5px] text-gray-500 whitespace-nowrap">Kasar</span>
                    <input type="number" className="w-[88px] h-[22px] px-1 border border-gray-300 bg-white font-mono text-[10px] font-bold text-right focus:outline-none focus:ring-1 focus:ring-orange-400"
                      value={kasarAmount || ''} onChange={(e) => setKasarAmount(parseFloat(e.target.value) || 0)} />
                  </div>

                  {/* spacer to align outstanding */}
                  <div className="h-[22px]" />

                  {/* Outstanding */}
                  <div className="flex items-center justify-between gap-1 pt-1 mt-0.5 border-t border-gray-300">
                    <span className="text-[10px] font-extrabold uppercase text-red-700">Outstnd</span>
                    <input type="text" className={`w-[88px] h-[24px] px-1 border font-mono text-[10.5px] font-extrabold text-right cursor-default ${calculatedOutstanding > 0 ? 'border-red-400 bg-red-50 text-red-700' : 'border-green-400 bg-green-50 text-green-700'
                      }`} value={`₹${calculatedOutstanding.toLocaleString()}`} readOnly />
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>

        {/* ── ACTION TOOLBAR ───────────────────────────────────────────────── */}
        <footer className="bg-orange-500 border-t border-orange-600 px-3 py-1.5 flex items-center justify-between shrink-0 gap-2">
          {/* Nav buttons */}
          <div className="flex items-center gap-1.5">
            <button onClick={handlePrevVch} className="flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-gray-100 border border-gray-300 text-[11px] font-bold text-gray-700 transition-colors">
              <ChevronLeft className="h-3.5 w-3.5" /> Prev
            </button>
            <button onClick={handleNextVch} className="flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-gray-100 border border-gray-300 text-[11px] font-bold text-gray-700 transition-colors">
              Next <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Bill image */}
          <label className="flex items-center gap-1.5 cursor-pointer text-white text-[11px] font-semibold">
            <input type="checkbox" id="bill-image-chk" className="accent-white" />
            Bill Image
          </label>

          {/* Action buttons */}
          <div className="flex items-center gap-1.5">
            {[
              { label: 'Print', icon: <Printer className="h-4 w-4" />, onClick: () => window.print(), disabled: false },
              { label: 'Save', icon: <Save className="h-4 w-4" />, onClick: handleSave, disabled: false, title: 'F2' },
              { label: 'Cancel', icon: <Undo2 className="h-4 w-4" />, onClick: () => handleNew(), disabled: false },
              { label: 'Delete', icon: <Trash2 className="h-4 w-4" />, onClick: handleDelete, disabled: !selectedVoucherId },
              { label: 'Exit', icon: <LogOut className="h-4 w-4" />, onClick: () => closeTab(useTabStore.getState().activeTabId), disabled: false },
            ].map(({ label, icon, onClick, disabled, title }) => (
              <button key={label} type="button" onClick={onClick} disabled={disabled} title={title}
                className="flex items-center gap-1.5 px-3 py-1 bg-white hover:bg-orange-50 border border-gray-200 text-[11px] font-bold text-gray-700 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-sm">
                <span className="text-gray-500">{icon}</span>
                {label}
              </button>
            ))}
          </div>
        </footer>

        {/* ── STATUS BAR ───────────────────────────────────────────────────── */}
        <div className="bg-orange-700 text-white py-0.5 px-3 flex items-center justify-between text-[10px] font-mono shrink-0 gap-4">
          <div className="flex items-center gap-4">
            <span className="bg-white text-orange-700 font-black px-1.5 py-px text-[9px] uppercase tracking-wide">Orange</span>
            <label className="flex items-center gap-1 cursor-pointer font-sans">
              <input type="checkbox" checked={liveRateChecked} onChange={(e) => setLiveRateChecked(e.target.checked)} className="accent-orange-300" />
              Live Rate
            </label>
            <span>22K: <strong>{currentRates ? currentRates.gold_rate_22k : '—'}</strong></span>
            <span>Silver: <strong>{currentRates ? currentRates.silver_rate : '—'}</strong></span>
          </div>

          <span className="text-orange-300">Rate Date: {currentRates ? currentRates.rate_date : '—'}</span>

          <div className="flex items-center gap-3">
            <span className="text-orange-300">Service End: 01-01-0001</span>
            <label className="flex items-center gap-1 cursor-pointer font-sans">
              <input type="checkbox" checked={whatsappOpen} onChange={(e) => setWhatsappOpen(e.target.checked)} className="accent-orange-300" />
              WhatsApp
            </label>
          </div>
        </div>

      </section>
    </div>
  );
}