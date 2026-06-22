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

const colorStyles = {
  emerald: {
    bg: 'bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400',
    text: 'text-emerald-600 dark:text-emerald-400',
    circle: 'bg-emerald-500/5'
  },
  blue: {
    bg: 'bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400',
    text: 'text-blue-600 dark:text-blue-400',
    circle: 'bg-blue-500/5'
  },
  rose: {
    bg: 'bg-rose-500/10 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400',
    text: 'text-rose-600 dark:text-rose-400',
    circle: 'bg-rose-500/5'
  },
  amber: {
    bg: 'bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400',
    text: 'text-amber-600 dark:text-amber-400',
    circle: 'bg-amber-500/5'
  }
};

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
        <div className="w-20 h-20 bg-secondary rounded-full flex items-center justify-center mb-6">
          <Layers className="h-10 w-10 text-primary/40" />
        </div>
        <h2 className="text-xl font-bold text-foreground tracking-tight">Select a Company Workspace</h2>
        <p className="text-muted-foreground text-sm mt-2 max-w-sm font-medium">
          Please select an active company from the toolbar to load your business dashboard and financial insights.
        </p>
        <button 
          onClick={() => addTab({ title: 'Company Settings', type: 'company' })}
          className="mt-8 px-8 py-2.5 bg-primary text-primary-foreground font-bold rounded-xl shadow-premium hover:shadow-elevated hover:bg-primary/90 transition-all active:scale-95 text-xs uppercase tracking-widest cursor-pointer"
        >
          Open Company Directory
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden transition-colors duration-200">
      {/* HEADER SECTION */}
      <div className="px-8 py-6 border-b border-border flex items-center justify-between shrink-0 bg-card text-card-foreground shadow-sm">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <TrendingUp className="h-6 w-6 text-primary" />
            Business Overview
          </h2>
          <p className="text-sm text-muted-foreground mt-1">Real-time performance metrics and metal market updates.</p>
        </div>
        
        {/* Live Metal Rates Card */}
        <div className="flex items-center gap-6 bg-secondary/35 border border-border px-6 py-2.5 rounded-xl">
          <div className="flex items-center gap-3">
            <Coins className="h-5 w-5 text-primary" />
            <div className="h-8 w-px bg-border mx-1"></div>
          </div>
          <div className="flex gap-8">
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Gold 22K/10g</span>
              <span className="text-sm font-data font-extrabold text-foreground">₹{currentRates ? currentRates.gold_rate_22k.toLocaleString() : '--'}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Silver 999/1kg</span>
              <span className="text-sm font-data font-extrabold text-foreground">₹{currentRates ? currentRates.silver_rate.toLocaleString() : '--'}</span>
            </div>
          </div>
          <button 
            onClick={() => addTab({ title: 'Rates', type: 'settings' })} 
            className="ml-4 p-2 hover:bg-background rounded-lg border border-transparent hover:border-border transition-all group cursor-pointer"
          >
            <PlusCircle className="h-4 w-4 text-primary group-hover:scale-110 transition-transform" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-8 space-y-8">
        
        {/* KPI CARDS */}
        <div className="grid grid-cols-4 gap-6">
          {[
            { label: 'Today\'s Sales', value: stats.todaySales, icon: TrendingUp, color: 'emerald', trend: '+12.5%', isUp: true },
            { label: 'Purchases Today', value: stats.todayPurchases, icon: ShoppingBag, color: 'blue', trend: '0%', isUp: true },
            { label: 'Low Stock Alerts', value: stats.lowStockCount, suffix: 'Items', icon: AlertTriangle, color: 'rose', trend: 'Critical', isUp: false },
            { label: 'Outstanding Due', value: stats.outstandingDue, icon: Coins, color: 'amber', trend: '-2.4%', isUp: false },
          ].map((card, i) => {
            const styles = colorStyles[card.color as keyof typeof colorStyles];
            return (
              <div key={i} className="surface-premium p-6 bg-card border border-border shadow-premium rounded-lg group hover:border-primary/20 transition-all cursor-default relative overflow-hidden">
                <div className={`absolute top-0 right-0 w-24 h-24 ${styles.circle} rounded-full -mr-8 -mt-8 group-hover:scale-110 transition-transform`}></div>
                <div className="flex justify-between items-start relative z-10">
                  <div className={`p-2 rounded-lg ${styles.bg}`}>
                    <card.icon className="h-5 w-5" />
                  </div>
                  <div className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${card.isUp ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-600'}`}>
                    {card.isUp ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                    {card.trend}
                  </div>
                </div>
                <div className="mt-4 relative z-10">
                  <span className="text-xxs font-bold text-muted-foreground uppercase tracking-[0.1em]">{card.label}</span>
                  <div className="flex items-baseline gap-1 mt-1">
                    <h3 className={`text-xl font-data font-extrabold ${card.color === 'rose' && stats.lowStockCount > 0 ? 'text-rose-500' : 'text-foreground'}`}>
                      {card.suffix ? card.value : '₹' + card.value.toLocaleString()}
                    </h3>
                    {card.suffix && <span className="text-[10px] font-bold text-muted-foreground">{card.suffix}</span>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* ANALYTICAL GRIDS */}
        <div className="grid grid-cols-12 gap-8">
          
          {/* RECENT TRANSACTIONS */}
          <div className="col-span-8 flex flex-col gap-6">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold tracking-tight flex items-center gap-2 text-foreground">
                <Clock className="h-4 w-4 text-primary" />
                Recent Sales Vouchers
              </h3>
              <button 
                onClick={() => addTab({ title: 'Ledger Reports', type: 'ledgers' })} 
                className="text-[10px] font-extrabold text-primary uppercase tracking-widest hover:underline flex items-center gap-1 cursor-pointer"
              >
                View All Records <ArrowRight className="h-3 w-3" />
              </button>
            </div>
            
            <div className="erp-table-container shadow-sm">
              <table className="ag-grid-dense-table">
                <thead>
                  <tr className="bg-secondary/40 border-b border-border">
                    <th className="w-[20%] text-muted-foreground">Date</th>
                    <th className="w-[25%] text-muted-foreground">Voucher #</th>
                    <th className="text-muted-foreground">Ledger Type</th>
                    <th className="text-right text-muted-foreground">Net Value</th>
                  </tr>
                </thead>
                <tbody className="bg-card text-foreground font-medium">
                  {recentInvoices.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-20 text-center text-muted-foreground/30 bg-card select-none">
                        <p className="text-xs font-bold uppercase tracking-widest">No Recent Vouchers</p>
                      </td>
                    </tr>
                  ) : (
                    recentInvoices.map((inv) => (
                      <tr key={inv.id} className="hover:bg-muted/40 border-b border-border/40 bg-card">
                        <td className="font-data text-xs text-muted-foreground">{inv.invoice_date}</td>
                        <td className="font-bold text-foreground tracking-tight">{inv.invoice_number}</td>
                        <td>
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase border ${inv.invoice_type === 'Estimate' ? 'bg-secondary text-secondary-foreground border-border' : 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'}`}>
                            {inv.invoice_type}
                          </span>
                        </td>
                        <td className="text-right font-data font-extrabold text-foreground">₹{inv.net_amount.toLocaleString()}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* QUICK SHORTCUTS & ALERTS */}
          <div className="col-span-4 flex flex-col gap-8">
            
            {/* ACTION PANEL */}
            <div className="surface-premium p-6 bg-card border border-border shadow-premium rounded-lg">
              <h3 className="text-sm font-bold tracking-tight mb-6 text-foreground">Quick Actions</h3>
              <div className="grid grid-cols-1 gap-3">
                {[
                  { label: 'New Sales Invoice', icon: PlusCircle, type: 'billing', key: 'F3', color: 'primary' },
                  { label: 'Inventory Catalog', icon: Layers, type: 'inventory', key: 'Alt+I', color: 'slate' },
                  { label: 'Financial Reports', icon: TrendingUp, type: 'reports', key: 'Alt+R', color: 'slate' },
                ].map((btn, i) => (
                  <button 
                    key={i} 
                    onClick={() => addTab({ title: btn.label, type: btn.type })} 
                    className="flex items-center justify-between p-3 rounded-xl border border-border hover:border-primary hover:bg-primary/5 transition-all group cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <btn.icon className={`h-4 w-4 ${btn.color === 'primary' ? 'text-primary' : 'text-muted-foreground/60'} group-hover:text-primary transition-colors`} />
                      <span className="text-xs font-bold text-muted-foreground group-hover:text-foreground">{btn.label}</span>
                    </div>
                    <span className="keyboard-key group-hover:border-primary/30 transition-colors">{btn.key}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* CRITICAL STOCK ALERTS */}
            <div className="surface-premium p-6 bg-card border border-border shadow-premium rounded-lg">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-sm font-bold tracking-tight text-rose-600 dark:text-rose-400 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Stock Alerts
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 bg-rose-500/10 text-rose-600 rounded-full">{stats.lowStockCount}</span>
              </div>
              <div className="space-y-4">
                {lowStockProducts.length === 0 ? (
                  <p className="text-[11px] font-medium text-muted-foreground text-center py-4 select-none">No critical stock warnings.</p>
                ) : (
                  lowStockProducts.map((p) => (
                    <div key={p.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted transition-colors">
                      <div className="flex flex-col">
                        <span className="text-[11px] font-bold text-foreground">{p.name}</span>
                        <span className="text-[10px] font-data text-muted-foreground">{p.sku}</span>
                      </div>
                      <span className="text-xs font-data font-bold text-rose-600 bg-rose-500/5 px-2 py-1 rounded-md">{p.current_stock} qty</span>
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
