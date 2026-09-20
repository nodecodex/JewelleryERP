import React, { useEffect, useState } from 'react';
import { useCompanyStore } from '../../store/useCompanyStore';
import { useRateStore } from '../../store/useRateStore';
import { useTabStore } from '../../store/useTabStore';
import { useProductStore } from '../../store/useProductStore';
import { useInvoiceStore } from '../../store/useInvoiceStore';
import { 
  TrendingUp, 
  ShoppingBag, 
  Coins, 
  AlertTriangle, 
  Layers, 
  PlusCircle, 
  ArrowUpRight, 
  ArrowDownRight, 
  Clock, 
  ArrowRight
} from 'lucide-react';

export default function Dashboard() {
  const selectedCompany = useCompanyStore((state) => state.selectedCompany);
  const { currentRates, loadRates } = useRateStore();
  const { products, loadProducts } = useProductStore();
  const { invoices, loadInvoices } = useInvoiceStore();
  const addTab = useTabStore((state) => state.addTab);

  const [stats, setStats] = useState({
    todaySales: 0,
    todayPurchases: 0,
    lowStockCount: 0,
    outstandingDue: 0,
  });

  const [recentInvoices, setRecentInvoices] = useState<any[]>([]);
  const [lowStockProducts, setLowStockProducts] = useState<any[]>([]);

  useEffect(() => {
    if (selectedCompany) {
      loadRates(selectedCompany.id);
      loadProducts(selectedCompany.id);
      loadInvoices(selectedCompany.id);
    }
  }, [selectedCompany]);

  useEffect(() => {
    const lowStock = products.filter((p: any) => p.current_stock <= 2);
    setLowStockProducts(lowStock.slice(0, 5));
    setRecentInvoices(invoices.slice(0, 5));

    const todayStr = new Date().toISOString().split('T')[0];
    let salesToday = 0;
    let outstanding = 0;
    
    for (const inv of invoices) {
      if (inv.invoice_date === todayStr && inv.invoice_type !== 'Estimate') salesToday += inv.net_amount;
      if (inv.invoice_type !== 'Estimate') outstanding += inv.balance_amount;
    }

    setStats({
      todaySales: salesToday,
      todayPurchases: 0,
      lowStockCount: lowStock.length,
      outstandingDue: outstanding
    });
  }, [products, invoices]);

  if (!selectedCompany) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-12 bg-background">
        <div className="w-20 h-20 bg-secondary rounded flex items-center justify-center mb-6">
          <Layers className="h-10 w-10 text-primary" />
        </div>
        <h2 className="text-xl font-bold font-luxury tracking-wide text-foreground">Select a Company Workspace</h2>
        <p className="text-muted-foreground text-sm mt-2 max-w-sm">
          Please select an active company from the toolbar to load your business dashboard and financial insights.
        </p>
        <button 
          onClick={() => addTab({ title: 'Company Settings', type: 'company' })}
          className="btn btn-primary mt-8"
        >
          Open Company Directory
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden transition-colors duration-200">
      {/* HEADER SECTION */}
      <div className="px-6 py-5 border-b border-border flex items-center justify-between shrink-0 bg-card text-foreground shadow-sm">
        <div>
          <h2 className="text-lg font-bold tracking-wide font-luxury text-primary flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            BUSINESS OVERVIEW
          </h2>
          <p className="text-[12px] text-muted-foreground mt-0.5">Real-time performance metrics and metal market updates.</p>
        </div>
        
        {/* Live Metal Rates Card */}
        <div className="flex items-center gap-6 bg-secondary/20 border border-border px-5 py-2 rounded-md">
          <div className="flex items-center gap-3">
            <Coins className="h-5 w-5 text-primary" />
            <div className="h-6 w-px bg-border mx-1"></div>
          </div>
          <div className="flex gap-8">
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Gold 22K/10g</span>
              <span className="text-sm font-data font-bold text-foreground">₹{currentRates ? currentRates.gold_rate_22k.toLocaleString() : '--'}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Silver 999/1kg</span>
              <span className="text-sm font-data font-bold text-foreground">₹{currentRates ? currentRates.silver_rate.toLocaleString() : '--'}</span>
            </div>
          </div>
          <button 
            onClick={() => addTab({ title: 'Rates', type: 'settings' })} 
            className="btn-icon ml-2"
          >
            <PlusCircle className="h-4 w-4 text-primary" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
        
        {/* KPI CARDS */}
        <div className="grid grid-cols-4 gap-5">
          {[
            { label: 'Today\'s Sales', value: stats.todaySales, icon: TrendingUp, color: 'text-success', bg: 'bg-success/10', trend: '+12.5%', isUp: true },
            { label: 'Purchases Today', value: stats.todayPurchases, icon: ShoppingBag, color: 'text-info', bg: 'bg-info/10', trend: '0%', isUp: true },
            { label: 'Low Stock Alerts', value: stats.lowStockCount, suffix: 'Items', icon: AlertTriangle, color: 'text-destructive', bg: 'bg-destructive/10', trend: 'Critical', isUp: false },
            { label: 'Outstanding Due', value: stats.outstandingDue, icon: Coins, color: 'text-warning', bg: 'bg-warning/10', trend: '-2.4%', isUp: false },
          ].map((card, i) => (
            <div key={i} className="surface-premium p-5 hover:border-primary/40 transition-colors">
              <div className="flex justify-between items-start">
                <div className={`p-2 rounded ${card.bg}`}>
                  <card.icon className={`h-5 w-5 ${card.color}`} />
                </div>
                <div className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded ${card.isUp ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}`}>
                  {card.isUp ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                  {card.trend}
                </div>
              </div>
              <div className="mt-4">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{card.label}</span>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <h3 className={`text-xl font-data font-bold ${card.label === 'Low Stock Alerts' && stats.lowStockCount > 0 ? 'text-destructive' : 'text-foreground'}`}>
                    {card.suffix ? card.value : '₹' + card.value.toLocaleString()}
                  </h3>
                  {card.suffix && <span className="text-[11px] font-bold text-muted-foreground">{card.suffix}</span>}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* ANALYTICAL GRIDS */}
        <div className="grid grid-cols-12 gap-6">
          
          {/* RECENT TRANSACTIONS */}
          <div className="col-span-8 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 className="text-[13px] font-bold uppercase tracking-wider font-luxury text-foreground flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" />
                Recent Sales Vouchers
              </h3>
              <button 
                onClick={() => addTab({ title: 'Ledger Reports', type: 'ledgers' })} 
                className="text-[11px] font-bold text-primary uppercase tracking-widest hover:underline flex items-center gap-1 cursor-pointer"
              >
                View All <ArrowRight className="h-3 w-3" />
              </button>
            </div>
            
            <div className="erp-table-container">
              <table className="ag-grid-dense-table">
                <thead>
                  <tr>
                    <th className="w-[20%]">Date</th>
                    <th className="w-[25%]">Voucher #</th>
                    <th>Ledger Type</th>
                    <th className="text-right">Net Value</th>
                  </tr>
                </thead>
                <tbody>
                  {recentInvoices.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-12 text-center text-muted-foreground/50 select-none">
                        <p className="text-[11px] font-bold uppercase tracking-widest">No Recent Vouchers</p>
                      </td>
                    </tr>
                  ) : (
                    recentInvoices.map((inv) => (
                      <tr key={inv.id}>
                        <td className="font-data text-[12px] text-muted-foreground">{inv.invoice_date}</td>
                        <td className="font-bold text-[12px]">{inv.invoice_number}</td>
                        <td>
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase border ${inv.invoice_type === 'Estimate' ? 'bg-secondary text-foreground border-border' : 'bg-success/10 text-success border-success/20'}`}>
                            {inv.invoice_type}
                          </span>
                        </td>
                        <td className="text-right font-data font-bold text-[13px]">₹{inv.net_amount.toLocaleString()}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* QUICK SHORTCUTS & ALERTS */}
          <div className="col-span-4 flex flex-col gap-6">
            
            {/* ACTION PANEL */}
            <div className="surface-premium p-5">
              <h3 className="text-[12px] font-bold uppercase tracking-wider font-luxury mb-4 text-foreground">Quick Actions</h3>
              <div className="grid grid-cols-1 gap-2">
                {[
                  { label: 'New Sales Invoice', icon: PlusCircle, type: 'billing', key: 'F3', primary: true },
                  { label: 'Inventory Catalog', icon: Layers, type: 'inventory', key: 'Alt+I' },
                  { label: 'Financial Reports', icon: TrendingUp, type: 'reports', key: 'Alt+R' },
                ].map((btn, i) => (
                  <button 
                    key={i} 
                    onClick={() => addTab({ title: btn.label, type: btn.type })} 
                    className={`flex items-center justify-between p-2 rounded border transition-all group ${btn.primary ? 'border-primary bg-primary/5 hover:bg-primary/10' : 'border-border bg-card hover:border-primary/50'}`}
                  >
                    <div className="flex items-center gap-2">
                      <btn.icon className={`h-4 w-4 ${btn.primary ? 'text-primary' : 'text-muted-foreground group-hover:text-primary'}`} />
                      <span className={`text-[12px] font-semibold ${btn.primary ? 'text-primary' : 'text-foreground'}`}>{btn.label}</span>
                    </div>
                    <span className="keyboard-key group-hover:border-primary/30">{btn.key}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* CRITICAL STOCK ALERTS */}
            <div className="surface-premium p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-[12px] font-bold uppercase tracking-wider font-luxury text-destructive flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Stock Alerts
                </h3>
                <span className="text-[10px] font-bold px-1.5 py-0.5 bg-destructive/10 text-destructive rounded">{stats.lowStockCount}</span>
              </div>
              <div className="space-y-2">
                {lowStockProducts.length === 0 ? (
                  <p className="text-[11px] font-medium text-muted-foreground text-center py-4 select-none">No critical stock warnings.</p>
                ) : (
                  lowStockProducts.map((p) => (
                    <div key={p.id} className="flex items-center justify-between p-2 rounded bg-secondary/30 hover:bg-secondary transition-colors">
                      <div className="flex flex-col">
                        <span className="text-[12px] font-semibold text-foreground">{p.name}</span>
                        <span className="text-[10px] font-data text-muted-foreground">{p.sku}</span>
                      </div>
                      <span className="text-[11px] font-data font-bold text-destructive bg-destructive/10 px-1.5 py-0.5 rounded">{p.current_stock} qty</span>
                    </div>
                  ))
                )}
                {stats.lowStockCount > 5 && (
                  <button 
                    onClick={() => addTab({ title: 'Inventory', type: 'inventory' })} 
                    className="w-full text-center text-[10px] font-bold text-primary uppercase tracking-widest pt-2 hover:underline cursor-pointer"
                  >
                    View All {stats.lowStockCount} Alerts
                  </button>
                )}
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
