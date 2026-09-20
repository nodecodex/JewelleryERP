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
    <div className="flex flex-col h-full bg-background overflow-hidden transition-colors duration-200">
      {/* SCREEN HEADER */}
      <div className="px-6 py-4 border-b border-border flex items-center justify-between shrink-0 bg-card text-foreground shadow-sm">
        <div>
          <h2 className="text-lg font-bold tracking-wide font-luxury text-primary flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            SALES BILLING DESK
          </h2>
          <p className="text-[12px] text-muted-foreground mt-0.5">Create and manage jewelry sales invoices with real-time ledger posting.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-secondary p-1 rounded border border-border shadow-sm">
            {['GST', 'Retail', 'Estimate'].map((type) => (
              <button
                key={type}
                onClick={() => setInvoiceType(type as any)}
                className={`px-4 py-1 text-[12px] font-bold rounded transition-all ${invoiceType === type ? 'bg-card shadow-sm text-primary' : 'text-muted-foreground hover:text-foreground'}`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden p-6 gap-6 custom-scrollbar">
        {/* LEFT COLUMN: ITEM ENTRY & LIST */}
        <div className="flex-1 flex flex-col gap-6 overflow-hidden">
          
          {/* CONFIG & BARCODE */}
          <div className="grid grid-cols-12 gap-4 items-end">
            <div className="col-span-3">
              <label className="erp-label">Invoice #</label>
              <div className="relative">
                <input type="text" disabled className="!bg-secondary/50 !border-dashed font-data font-bold text-primary" value={invoiceNumber} />
                <FileText className="absolute right-2 top-1.5 h-4 w-4 text-primary/40" />
              </div>
            </div>
            <div className="col-span-3">
              <label className="erp-label">Bill Date</label>
              <input type="date" className="font-data" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} />
            </div>
            <div className="col-span-6">
              <label className="erp-label">Scan Jewelry Tag</label>
              <form onSubmit={handleBarcodeScan} className="flex gap-2">
                <div className="relative flex-1 group">
                  <Barcode className="absolute left-2.5 top-1.5 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                  <input
                    ref={barcodeInputRef}
                    type="text"
                    placeholder="Scan tag or type barcode ID..."
                    className="pl-9 font-data font-bold"
                    value={barcodeQuery}
                    onChange={(e) => setBarcodeQuery(e.target.value)}
                  />
                </div>
                <button type="submit" className="btn btn-secondary">
                  Scan
                </button>
              </form>
            </div>
          </div>

          {/* MANUAL ENTRY */}
          <div className="surface-premium bg-card p-4">
            <span className="text-[10px] font-bold text-primary uppercase tracking-widest block mb-3 font-luxury">Manual Line Input</span>
            <div className="grid grid-cols-12 gap-3 items-end">
              <div className="col-span-4">
                <label className="erp-label">Product Name / Description</label>
                <input type="text" placeholder="e.g. 22K Gold Bangles" value={manualItem.product_name} onChange={(e) => setManualItem({ ...manualItem, product_name: e.target.value })} />
              </div>
              <div className="col-span-2">
                <label className="erp-label">Net Wt (g)</label>
                <input type="number" step="0.001" placeholder="0.000" className="text-right font-data" value={manualItem.net_weight || ''} onChange={(e) => setManualItem({ ...manualItem, net_weight: parseFloat(e.target.value) || 0 })} />
              </div>
              <div className="col-span-2">
                <label className="erp-label">Labour (₹)</label>
                <input type="number" placeholder="0" className="text-right font-data" value={manualItem.making_charges || ''} onChange={(e) => setManualItem({ ...manualItem, making_charges: parseFloat(e.target.value) || 0 })} />
              </div>
              <div className="col-span-2">
                <label className="erp-label">Rate /g</label>
                <input type="number" placeholder="0" className="text-right font-data" value={manualItem.rate || ''} onChange={(e) => setManualItem({ ...manualItem, rate: parseFloat(e.target.value) || 0 })} />
              </div>
              <div className="col-span-2">
                <button onClick={handleAddManualItem} className="btn btn-primary w-full shadow-premium">
                  Add Item
                </button>
              </div>
            </div>
          </div>

          {/* ITEM LIST */}
          <div className="flex-1 erp-table-container custom-scrollbar overflow-y-auto">
            <table className="ag-grid-dense-table">
              <thead>
                <tr>
                  <th className="w-[40%]">Jewelry Description</th>
                  <th className="text-right">Net Weight</th>
                  <th className="text-right">Making Chg</th>
                  <th className="text-right">Metal Rate</th>
                  <th className="text-right">Line Total</th>
                  <th className="w-10"></th>
                </tr>
              </thead>
              <tbody>
                {cart.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-16 text-center bg-card">
                      <div className="flex flex-col items-center gap-2 opacity-30">
                        <ShoppingCart className="h-10 w-10 text-muted-foreground" />
                        <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">No Ornaments in Cart</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  cart.map((item, index) => (
                    <tr key={index} className="group">
                      <td className="font-semibold text-[12px]">{item.product_name}</td>
                      <td className="text-right font-data text-muted-foreground">{item.net_weight.toFixed(3)}g</td>
                      <td className="text-right font-data text-muted-foreground">₹{item.making_charges.toLocaleString()}</td>
                      <td className="text-right font-data text-muted-foreground">₹{item.rate.toLocaleString()}</td>
                      <td className="text-right font-bold text-foreground">₹{Math.round(item.subtotal).toLocaleString()}</td>
                      <td className="text-center">
                        <button onClick={() => setCart(cart.filter((_, i) => i !== index))} className="btn-icon w-6 h-6 hover:text-destructive hover:bg-destructive/10 mx-auto">
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

        {/* RIGHT COLUMN: SUMMARY & POSTING */}
        <div className="w-80 flex flex-col gap-5 shrink-0 overflow-y-auto custom-scrollbar">
          
          {/* CUSTOMER LEDGER */}
          <div className="surface-premium bg-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-[13px] font-bold uppercase tracking-wider font-luxury flex items-center gap-2">
                <User className="h-4 w-4 text-primary" /> Customer Account
              </h4>
              <button onClick={() => setNewCustForm(!newCustForm)} className="text-[10px] font-extrabold text-primary uppercase tracking-widest hover:underline">
                {newCustForm ? 'Cancel' : '+ New'}
              </button>
            </div>

            {newCustForm ? (
              <div className="space-y-3">
                <div>
                  <label className="erp-label">Full Name</label>
                  <input type="text" placeholder="Customer name..." value={newCustData.name} onChange={(e) => setNewCustData({ ...newCustData, name: e.target.value })} />
                </div>
                <div>
                  <label className="erp-label">Mobile</label>
                  <input type="text" placeholder="Contact number..." value={newCustData.mobile} onChange={(e) => setNewCustData({ ...newCustData, mobile: e.target.value })} />
                </div>
                <button onClick={async () => {
                  const created = await createCustomer({ company_id: selectedCompany!.id, ...newCustData, loyalty_points: 0 });
                  setSelectedCustomer(created);
                  setNewCustForm(false);
                }} className="btn btn-secondary w-full border-border">Create & Link</button>
              </div>
            ) : (
              <div>
                <label className="erp-label">Select Ledger</label>
                <select className="font-bold text-[12px]" value={selectedCustomer?.id || ''} onChange={(e) => setSelectedCustomer(customers.find(c => c.id === e.target.value) || null)}>
                  <option value="">Walk-in Cash Customer</option>
                  {customers.map(c => <option key={c.id} value={c.id}>{c.name} ({c.mobile})</option>)}
                </select>
                {selectedCustomer && (
                  <div className="mt-3 p-2 bg-primary/10 rounded border border-primary/20 flex items-center justify-between">
                    <span className="text-[10px] font-bold text-primary uppercase tracking-wider">Credit Balance:</span>
                    <span className="text-[13px] font-data font-bold text-primary">₹0.00</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ACCOUNTING SUMMARY */}
          <div className="surface-premium bg-card p-5 flex-1 flex flex-col">
            <h4 className="text-[13px] font-bold uppercase tracking-wider font-luxury mb-5">Financial Summary</h4>
            
            <div className="space-y-3 mb-6">
              <div className="flex justify-between text-[12px]">
                <span className="text-muted-foreground font-semibold">Gross Metal Value</span>
                <span className="font-data font-bold">₹{grossAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between text-[12px]">
                <span className="text-muted-foreground font-semibold">Making Charges</span>
                <span className="font-data font-bold">₹{makingChargesTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
              {invoiceType !== 'Estimate' && (
                <div className="flex justify-between text-[12px]">
                  <span className="text-muted-foreground font-semibold">GST Amount (3.0%)</span>
                  <span className="font-data font-bold text-primary">₹{taxAmountTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
              )}
              <div className="border-t border-border pt-3 mt-1 flex justify-between items-center">
                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Net Amount</span>
                <span className="text-2xl font-data font-extrabold text-foreground tracking-tight">
                  ₹{netAmount.toLocaleString()}
                </span>
              </div>
            </div>

            <div className="space-y-4 mt-auto">
              <div>
                <label className="erp-label">Payment Method</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'Cash', icon: Banknote },
                    { id: 'UPI', icon: Wallet },
                    { id: 'Bank', icon: Landmark },
                    { id: 'Card', icon: CreditCard },
                  ].map((mode) => (
                    <button
                      key={mode.id}
                      onClick={() => setPaymentMode(mode.id as any)}
                      className={`flex items-center gap-2 p-2.5 rounded border transition-all ${paymentMode === mode.id ? 'bg-primary text-primary-foreground shadow-sm border-primary' : 'bg-card border-border text-muted-foreground hover:bg-secondary'}`}
                    >
                      <mode.icon className="h-4 w-4" />
                      <span className="text-[11px] font-bold uppercase tracking-wider">{mode.id}</span>
                    </button>
                  ))}
                </div>
              </div>

              <button
                disabled={cart.length === 0}
                onClick={handleSaveInvoice}
                className="w-full h-14 bg-primary text-primary-foreground rounded shadow-premium hover:shadow-elevated hover:bg-primary/90 transition-all active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed group"
              >
                <div className="flex flex-col items-center">
                  <span className="text-[13px] font-bold uppercase tracking-widest flex items-center gap-2 font-luxury">
                    Save & Post <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </span>
                  <span className="text-[9px] opacity-70 font-semibold tracking-wide">Syncs Stock & Vouchers</span>
                </div>
              </button>
            </div>
          </div>

          {/* SAVED NOTIFICATION */}
          {savedInvoice && (
            <div className="p-4 bg-success/10 border border-success/20 rounded animate-in zoom-in-95 duration-300">
              <div className="flex items-start gap-3">
                <div className="p-1.5 bg-success text-success-foreground rounded shadow-sm">
                  <Check className="h-4 w-4" />
                </div>
                <div className="flex-1">
                  <p className="text-[12px] font-bold text-success">Invoice #{savedInvoice.invoice_number} Saved</p>
                  <p className="text-[10px] text-success/80 mt-1 font-semibold leading-snug">Stock records and accounting ledgers updated successfully.</p>
                  <div className="flex gap-2 mt-3">
                    <button onClick={() => window.print()} className="btn btn-primary h-7 text-[10px] px-3">
                      <Printer className="h-3 w-3" /> Print
                    </button>
                    <button onClick={() => setSavedInvoice(null)} className="btn btn-secondary h-7 text-[10px] px-3">
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
