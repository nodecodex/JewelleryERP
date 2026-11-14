import React, { useEffect, useState, useRef } from 'react';
import { useCompanyStore } from '../../store/useCompanyStore';
import { useRateStore } from '../../store/useRateStore';
import { useCustomerStore } from '../../store/useCustomerStore';
import { useInvoiceStore } from '../../store/useInvoiceStore';
import { useProductStore } from '../../store/useProductStore';
import { useDialog } from '../../components/ui/DialogProvider';
import type { Product, Customer } from '../../../shared/ipc-api';
import { ShoppingCart, User, Plus, Search, Barcode, Printer, Trash, FileText, Check, ChevronRight, CreditCard, Wallet, Banknote, Landmark } from 'lucide-react';

interface CartItem {
  product?: Product;
  product_name: string;
  weight: number;
  net_weight: number;
  gross_weight: number;
  purity: string;
  making_charges: number;
  rate: number;
  quantity: number;
  tax_rate: number;
  tax_amount: number;
  subtotal: number;
}

export default function BillingView() {
  const selectedCompany = useCompanyStore((state) => state.selectedCompany);
  const currentRates = useRateStore((state) => state.currentRates);
  const { customers, loadCustomers, createCustomer } = useCustomerStore();
  const { products, loadProducts } = useProductStore();
  const { createInvoice } = useInvoiceStore();
  const { showToast } = useDialog();

  // Bill Config
  const [invoiceType, setInvoiceType] = useState<'Retail' | 'Wholesale' | 'GST' | 'Estimate'>('GST');
  const [taxType, setTaxType] = useState<'CGST_SGST' | 'IGST' | 'UTGST' | 'Exempt'>('CGST_SGST');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentMode, setPaymentMode] = useState<'Cash' | 'Bank' | 'Card' | 'UPI' | 'Mixed'>('Cash');

  // Customer State
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [newCustForm, setNewCustForm] = useState(false);
  const [newCustData, setNewCustData] = useState({ name: '', mobile: '', address: '', pan: '', gstin: '' });

  // Cart & Input State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [barcodeQuery, setBarcodeQuery] = useState('');
  const [manualItem, setManualItem] = useState({
    product_name: '',
    weight: 0,
    net_weight: 0,
    gross_weight: 0,
    purity: '22K (916)',
    making_charges: 0,
    rate: 0,
    quantity: 1,
    gst_rate: 3.0
  });

  const [savedInvoice, setSavedInvoice] = useState<any | null>(null);
  const barcodeInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (selectedCompany) {
      loadNextInvoiceNumber();
      loadCustomers(selectedCompany.id);
    }
  }, [selectedCompany, invoiceType]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F2') {
        e.preventDefault();
        handleSaveInvoice();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cart, selectedCustomer, invoiceNumber, invoiceType, paymentMode]);

  const loadNextInvoiceNumber = async () => {
    if (!selectedCompany) return;
    const num = await (window as any).api.getNextInvoiceNumber(selectedCompany.id, invoiceType);
    setInvoiceNumber(num);
  };

  const handleBarcodeScan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCompany || !barcodeQuery.trim()) return;

    try {
      const prod = await (window as any).api.getProductByBarcode(selectedCompany.id, barcodeQuery.trim());
      if (prod) {
        let defaultRate = prod.selling_price;
        if (defaultRate === 0 && currentRates) {
          const metalRate = prod.category.includes('Silver') ? currentRates.silver_rate / 1000 : currentRates.gold_rate_22k / 10;
          defaultRate = metalRate;
        }

        const subtotal = (prod.fine * defaultRate) + (prod.making_charges_type === 'fixed' ? prod.making_charges : prod.making_charges * prod.fine);
        const taxAmount = (subtotal * (prod.gst_rate / 100));

        setCart([...cart, {
          product: prod,
          product_name: prod.name,
          weight: prod.weight,
          net_weight: prod.fine,
          gross_weight: prod.gross_weight,
          purity: prod.purity || '22K',
          making_charges: prod.making_charges,
          rate: defaultRate,
          quantity: 1,
          tax_rate: prod.gst_rate,
          tax_amount: taxAmount,
          subtotal: subtotal + taxAmount
        }]);
        setBarcodeQuery('');
      } else {
        showToast('Product tag not found.', 'warning');
      }
    } catch (err) { console.error(err); }
  };

  const handleAddManualItem = () => {
    if (!manualItem.product_name || manualItem.net_weight <= 0 || manualItem.rate <= 0) return;
    const sub = (manualItem.net_weight * manualItem.rate) + manualItem.making_charges;
    const tax = sub * (manualItem.gst_rate / 100);

    setCart([...cart, {
      product_name: manualItem.product_name,
      weight: manualItem.weight || manualItem.net_weight,
      net_weight: manualItem.net_weight,
      gross_weight: manualItem.gross_weight || manualItem.net_weight,
      purity: manualItem.purity,
      making_charges: manualItem.making_charges,
      rate: manualItem.rate,
      quantity: manualItem.quantity,
      tax_rate: manualItem.gst_rate,
      tax_amount: tax,
      subtotal: sub + tax
    }]);
    setManualItem({ product_name: '', weight: 0, net_weight: 0, gross_weight: 0, purity: '22K (916)', making_charges: 0, rate: 0, quantity: 1, gst_rate: 3.0 });
  };

  const grossAmount = cart.reduce((sum, item) => sum + (item.net_weight * item.rate), 0);
  const makingChargesTotal = cart.reduce((sum, item) => sum + item.making_charges, 0);
  const taxAmountTotal = invoiceType === 'Estimate' ? 0 : cart.reduce((sum, item) => sum + item.tax_amount, 0);
  const netAmount = Math.round(grossAmount + makingChargesTotal + taxAmountTotal);
  const roundOff = netAmount - (grossAmount + makingChargesTotal + taxAmountTotal);

  const handleSaveInvoice = async () => {
    if (!selectedCompany || cart.length === 0) return;
    try {
      const saved = await createInvoice({
        company_id: selectedCompany.id,
        invoice_number: invoiceNumber,
        invoice_date: invoiceDate,
        customer_id: selectedCustomer?.id,
        invoice_type: invoiceType,
        tax_type: taxType,
        gross_amount: grossAmount,
        discount_amount: 0.0,
        tax_amount: taxAmountTotal,
        making_charges_total: makingChargesTotal,
        round_off: roundOff,
        net_amount: netAmount,
        payment_mode: paymentMode,
        paid_amount: netAmount,
        balance_amount: 0.0,
        status: 'Paid'
      }, cart.map(item => ({
        product_id: item.product?.id || undefined,
        product_name: item.product_name,
        weight: item.weight,
        net_weight: item.net_weight,
        gross_weight: item.gross_weight,
        purity: item.purity,
        making_charges: item.making_charges,
        rate: item.rate,
        quantity: item.quantity,
        tax_rate: invoiceType === 'Estimate' ? 0 : item.tax_rate,
        tax_amount: invoiceType === 'Estimate' ? 0 : item.tax_amount,
        subtotal: item.subtotal
      })));
      setSavedInvoice(saved);
      setCart([]);
      setSelectedCustomer(null);
      loadNextInvoiceNumber();
    } catch (err: any) { showToast(`Billing error: ${err.message || err}`, 'error'); }
  };

  return (
    <div className="flex flex-col h-full bg-black text-white overflow-hidden">
      {/* SCREEN HEADER */}
      <div className="px-4 py-2.5 border-b border-[#262626] flex items-center justify-between shrink-0 bg-[#181818]">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2">
            <ShoppingCart className="h-4 w-4 text-[#FFC000]" />
            POS & SALES BILLING DESK
          </h2>
          <p className="text-[10px] text-[#7D7D7D] uppercase tracking-wider mt-0.5">High-velocity bullion & jewelry sales with instantaneous ledger posting.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-black p-0.5 rounded-none border border-[#262626]">
            {['GST', 'Retail', 'Estimate'].map((type) => (
              <button
                key={type}
                onClick={() => setInvoiceType(type as any)}
                className={`px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-none transition-colors cursor-pointer ${invoiceType === type ? 'bg-[#FFC000] text-black' : 'text-[#7D7D7D] hover:text-white'}`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden p-3 lg:p-3.5 gap-3 lg:gap-3.5 bg-black">
        {/* LEFT COLUMN: ITEM ENTRY & LIST */}
        <div className="flex-1 flex flex-col gap-2.5 overflow-hidden min-w-0">
          
          {/* CONFIG & BARCODE */}
          <div className="grid grid-cols-12 gap-2.5 items-end bg-[#181818] p-3 rounded-none border border-[#262626]">
            <div className="col-span-3">
              <label className="erp-label text-[10px]">INVOICE #</label>
              <div className="relative">
                <input type="text" disabled className="w-full h-8 text-xs bg-black/60 border border-[#262626] font-mono font-bold text-[#FFC000] px-2.5 rounded-none" value={invoiceNumber} />
                <FileText className="absolute right-2 top-2 h-3.5 w-3.5 text-[#FFC000]/50" />
              </div>
            </div>
            <div className="col-span-3">
              <label className="erp-label text-[10px]">BILL DATE</label>
              <input type="date" className="w-full h-8 text-xs font-mono px-2.5 bg-black border border-[#2c2c2c] rounded-none text-white focus:border-[#FFC000]" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} />
            </div>
            <div className="col-span-6">
              <label className="erp-label text-[10px]">SCAN JEWELRY TAG / BARCODE</label>
              <form onSubmit={handleBarcodeScan} className="flex gap-2">
                <div className="relative flex-1 group">
                  <Barcode className="absolute left-2.5 top-2 h-4 w-4 text-[#7D7D7D] group-focus-within:text-[#FFC000] transition-colors" />
                  <input
                    ref={barcodeInputRef}
                    type="text"
                    placeholder="Scan tag or type barcode ID..."
                    className="w-full h-8 pl-8 text-xs font-mono font-semibold bg-black border border-[#2c2c2c] rounded-none text-white focus:border-[#FFC000] placeholder-[#7D7D7D]"
                    value={barcodeQuery}
                    onChange={(e) => setBarcodeQuery(e.target.value)}
                  />
                </div>
                <button type="submit" className="px-4 h-8 bg-transparent border border-white/50 hover:bg-[#1EAEDB]/70 hover:border-transparent text-white font-bold text-[11px] uppercase rounded-none transition-colors cursor-pointer">
                  Scan
                </button>
              </form>
            </div>
          </div>

          {/* MANUAL ENTRY */}
          <div className="bg-[#181818] rounded-none border border-[#262626] p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold text-[#FFC000] uppercase tracking-wider">Fast Line Item Entry</span>
              <span className="text-[10px] font-mono text-[#7D7D7D]">GST: {manualItem.gst_rate}%</span>
            </div>
            <div className="grid grid-cols-12 gap-2 items-end">
              <div className="col-span-4">
                <label className="erp-label text-[10px]">Product / Description</label>
                <input type="text" placeholder="e.g. 22K Gold Chain" className="w-full h-8 text-xs px-2.5 bg-black border border-[#2c2c2c] rounded-none text-white focus:border-[#FFC000]" value={manualItem.product_name} onChange={(e) => setManualItem({ ...manualItem, product_name: e.target.value })} />
              </div>
              <div className="col-span-2">
                <label className="erp-label text-[10px]">Net Wt (g)</label>
                <input type="number" step="0.001" placeholder="0.000" className="w-full h-8 text-xs text-right font-mono px-2 bg-black border border-[#2c2c2c] rounded-none text-white focus:border-[#FFC000]" value={manualItem.net_weight || ''} onChange={(e) => setManualItem({ ...manualItem, net_weight: parseFloat(e.target.value) || 0 })} />
              </div>
              <div className="col-span-2">
                <label className="erp-label text-[10px]">Labour (₹)</label>
                <input type="number" placeholder="0" className="w-full h-8 text-xs text-right font-mono px-2 bg-black border border-[#2c2c2c] rounded-none text-white focus:border-[#FFC000]" value={manualItem.making_charges || ''} onChange={(e) => setManualItem({ ...manualItem, making_charges: parseFloat(e.target.value) || 0 })} />
              </div>
              <div className="col-span-2">
                <label className="erp-label text-[10px]">Rate /g</label>
                <input type="number" placeholder="0" className="w-full h-8 text-xs text-right font-mono px-2 bg-black border border-[#2c2c2c] rounded-none text-white focus:border-[#FFC000]" value={manualItem.rate || ''} onChange={(e) => setManualItem({ ...manualItem, rate: parseFloat(e.target.value) || 0 })} />
              </div>
              <div className="col-span-2">
                <button onClick={handleAddManualItem} className="w-full h-8 bg-[#FFC000] text-black font-extrabold rounded-none text-[11px] uppercase hover:bg-[#917300] transition-colors cursor-pointer">
                  + Add Item
                </button>
              </div>
            </div>
          </div>

          {/* ITEM LIST */}
          <div className="flex-1 erp-table-container rounded-none border border-[#262626] overflow-hidden bg-[#202020] flex flex-col">
            <div className="flex-1 overflow-y-auto">
              <table className="ag-grid-dense-table w-full text-xs">
                <thead className="sticky top-0 bg-[#181818] z-10">
                  <tr className="border-b border-[#262626] text-[10.5px] uppercase tracking-wider text-[#7D7D7D]">
                    <th className="py-2.5 px-3 text-left w-[38%]">Jewelry Description</th>
                    <th className="py-2.5 px-3 text-right">Net Wt</th>
                    <th className="py-2.5 px-3 text-right">Labour</th>
                    <th className="py-2.5 px-3 text-right">Metal Rate</th>
                    <th className="py-2.5 px-3 text-right">Line Total</th>
                    <th className="py-2.5 px-2 text-center w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#262626] font-medium text-white">
                  {cart.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-14 text-center">
                        <div className="flex flex-col items-center gap-1.5 opacity-30 text-[#7D7D7D]">
                          <ShoppingCart className="h-8 w-8 text-[#FFC000]" />
                          <p className="text-[11px] font-bold uppercase tracking-widest text-white">No Items Added Yet</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    cart.map((item, index) => (
                      <tr key={index} className="hover:bg-[#282828] transition-colors">
                        <td className="py-2 px-3 font-semibold text-white">
                          {item.product_name}
                          <span className="ml-2 text-[10px] text-[#FFC000] uppercase font-mono">{item.purity}</span>
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-[#7D7D7D] tabular-nums">{item.net_weight.toFixed(3)}g</td>
                        <td className="py-2 px-3 text-right font-mono text-[#7D7D7D] tabular-nums">₹{item.making_charges.toLocaleString()}</td>
                        <td className="py-2 px-3 text-right font-mono text-[#7D7D7D] tabular-nums">₹{item.rate.toLocaleString()}</td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-[#FFC000] tabular-nums">₹{Math.round(item.subtotal).toLocaleString()}</td>
                        <td className="py-2 px-2 text-center">
                          <button onClick={() => setCart(cart.filter((_, i) => i !== index))} className="p-1 text-[#7D7D7D] hover:text-rose-400 hover:bg-rose-500/10 rounded-none transition-colors cursor-pointer">
                            <Trash className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: SUMMARY & POSTING */}
        <div className="w-80 xl:w-88 flex flex-col gap-2.5 shrink-0 overflow-y-auto">
          
          {/* CUSTOMER LEDGER */}
          <div className="p-3 bg-[#181818] rounded-none border border-[#262626]">
            <div className="flex items-center justify-between mb-2.5">
              <h4 className="text-xs font-bold tracking-wider flex items-center gap-1.5 uppercase text-white">
                <User className="h-3.5 w-3.5 text-[#FFC000]" /> Customer Account
              </h4>
              <button onClick={() => setNewCustForm(!newCustForm)} className="text-[10px] font-bold text-[#FFC000] uppercase tracking-wider hover:underline cursor-pointer">
                {newCustForm ? 'Cancel' : '+ Add New'}
              </button>
            </div>

            {newCustForm ? (
              <div className="space-y-2">
                <div>
                  <label className="erp-label text-[10px]">Full Name</label>
                  <input type="text" placeholder="Customer name..." className="w-full h-8 text-xs px-2 bg-black border border-[#2c2c2c] rounded-none text-white focus:border-[#FFC000]" value={newCustData.name} onChange={(e) => setNewCustData({ ...newCustData, name: e.target.value })} />
                </div>
                <div>
                  <label className="erp-label text-[10px]">Mobile</label>
                  <input type="text" placeholder="Contact number..." className="w-full h-8 text-xs px-2 bg-black border border-[#2c2c2c] rounded-none text-white focus:border-[#FFC000]" value={newCustData.mobile} onChange={(e) => setNewCustData({ ...newCustData, mobile: e.target.value })} />
                </div>
                <button onClick={async () => {
                  const created = await createCustomer({ company_id: selectedCompany!.id, ...newCustData, loyalty_points: 0 });
                  setSelectedCustomer(created);
                  setNewCustForm(false);
                }} className="w-full py-2 bg-[#FFC000] text-black rounded-none text-[11px] font-bold uppercase hover:bg-[#917300] transition-colors cursor-pointer">Save & Select</button>
              </div>
            ) : (
              <div>
                <label className="erp-label text-[10px]">Select Customer Ledger</label>
                <select className="w-full h-8 text-xs font-bold px-2 bg-black border border-[#2c2c2c] rounded-none text-white focus:border-[#FFC000]" value={selectedCustomer?.id || ''} onChange={(e) => setSelectedCustomer(customers.find(c => c.id === e.target.value) || null)}>
                  <option value="">Walk-in Cash Customer</option>
                  {customers.map(c => <option key={c.id} value={c.id}>{c.name} ({c.mobile})</option>)}
                </select>
                {selectedCustomer && (
                  <div className="mt-2 p-2 bg-black border border-[#262626] flex items-center justify-between">
                    <span className="text-[10px] font-bold text-[#7D7D7D] uppercase">Ledger Status:</span>
                    <span className="text-xs font-mono font-bold text-[#FFC000] uppercase">Regular Buyer</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ACCOUNTING SUMMARY */}
          <div className="p-3.5 bg-[#181818] rounded-none border border-[#262626] flex-1 flex flex-col justify-between">
            <div>
              <h4 className="text-xs font-bold tracking-wider mb-2.5 uppercase text-white">Financial Summary</h4>
              
              <div className="space-y-2 mb-4 text-xs">
                <div className="flex justify-between">
                  <span className="text-[#7D7D7D] uppercase font-semibold text-[11px]">Gross Metal Value</span>
                  <span className="font-mono font-bold tabular-nums text-white">₹{grossAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#7D7D7D] uppercase font-semibold text-[11px]">Making Charges</span>
                  <span className="font-mono font-bold tabular-nums text-white">₹{makingChargesTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
                {invoiceType !== 'Estimate' && (
                  <div className="flex justify-between">
                    <span className="text-[#7D7D7D] uppercase font-semibold text-[11px]">GST (3.0%)</span>
                    <span className="font-mono font-bold text-[#29ABE2] tabular-nums">₹{taxAmountTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                )}
                <div className="border-t border-[#262626] pt-3 flex justify-between items-baseline">
                  <span className="text-xs font-black text-[#7D7D7D] uppercase tracking-wider">Net Amount</span>
                  <span className="text-2xl font-mono font-black text-[#FFC000] tracking-tight tabular-nums">
                    ₹{netAmount.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-3 pt-3 border-t border-[#262626]">
              <div>
                <label className="erp-label text-[10px] mb-1.5">Payment Mode</label>
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    { id: 'Cash', icon: Banknote },
                    { id: 'UPI', icon: Wallet },
                    { id: 'Bank', icon: Landmark },
                    { id: 'Card', icon: CreditCard },
                  ].map((mode) => (
                    <button
                      key={mode.id}
                      onClick={() => setPaymentMode(mode.id as any)}
                      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-none border text-xs font-bold uppercase transition-colors cursor-pointer ${paymentMode === mode.id ? 'bg-[#FFC000]/15 border-[#FFC000] text-[#FFC000]' : 'bg-black border-[#262626] text-[#7D7D7D] hover:text-white'}`}
                    >
                      <mode.icon className="h-3.5 w-3.5" />
                      <span>{mode.id}</span>
                    </button>
                  ))}
                </div>
              </div>

              <button
                disabled={cart.length === 0}
                onClick={handleSaveInvoice}
                className="w-full py-3 bg-[#FFC000] text-black rounded-none hover:bg-[#917300] transition-colors flex items-center justify-center gap-2 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer group"
              >
                <span className="text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
                  Save & Post Invoice <ChevronRight className="h-4 w-4 stroke-[3]" />
                </span>
                <span className="text-[10px] bg-black text-[#FFC000] px-2 py-0.5 rounded-none font-mono font-extrabold">F2</span>
              </button>
            </div>
          </div>

          {/* SAVED NOTIFICATION */}
          {savedInvoice && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-none">
              <div className="flex items-start gap-2.5">
                <div className="p-1 bg-emerald-500 text-black rounded-none">
                  <Check className="h-4 w-4 stroke-[3]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-emerald-400 uppercase tracking-wide truncate">Invoice #{savedInvoice.invoice_number} Posted</p>
                  <p className="text-[10px] text-[#7D7D7D] uppercase mt-0.5">Stock & ledger vouchers synchronized.</p>
                  <div className="flex gap-2 mt-2">
                    <button onClick={() => window.print()} className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500 text-black rounded-none text-[11px] font-bold uppercase hover:bg-emerald-400 cursor-pointer">
                      <Printer className="h-3 w-3" /> Print
                    </button>
                    <button onClick={() => setSavedInvoice(null)} className="px-3 py-1 bg-[#181818] border border-[#2c2c2c] text-white rounded-none text-[11px] font-bold uppercase hover:bg-[#202020] cursor-pointer">
                      Dismiss
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
