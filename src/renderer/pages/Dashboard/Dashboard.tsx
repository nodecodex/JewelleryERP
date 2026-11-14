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
      <div className="flex flex-col items-center justify-center h-full text-center p-12 bg-black text-white">
        <div className="w-16 h-16 bg-[#181818] border border-[#2c2c2c] rounded-none flex items-center justify-center mb-6">
          <Layers className="h-8 w-8 text-[#FFC000]" />
        </div>
        <h2 className="text-xl font-bold uppercase tracking-wider text-white">SELECT A COMPANY WORKSPACE</h2>
        <p className="text-[#7D7D7D] text-xs uppercase tracking-wide mt-2 max-w-sm">
          Please select an active company from the toolbar to load your business dashboard and financial insights.
        </p>
        <button 
          onClick={() => addTab({ title: 'Company Settings', type: 'company' })}
          className="mt-8 px-8 py-2.5 bg-[#FFC000] text-black font-extrabold rounded-none hover:bg-[#917300] transition-colors text-xs uppercase tracking-widest cursor-pointer"
        >
          Open Company Directory
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-black text-white overflow-hidden">
      {/* HEADER SECTION - NOCTURNAL PRECISION */}
      <div className="px-4 py-2.5 border-b border-[#262626] flex items-center justify-between shrink-0 bg-[#181818] text-white">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-[#FFC000]" />
            EXECUTIVE DASHBOARD
          </h2>
          <p className="text-[10px] text-[#7D7D7D] uppercase tracking-wider mt-0.5">Real-time performance metrics, sales velocity & bullion ticker.</p>
        </div>
        
        {/* Live Metal Rates Compact Badge */}
        <div className="flex items-center gap-3.5 bg-[#121212] border border-[#262626] px-3.5 py-1.5 rounded-none">
          <div className="flex items-center gap-2 text-[#FFC000] font-bold text-xs uppercase tracking-wider">
            <Coins className="h-4 w-4" />
            <span className="hidden sm:inline text-[10px] text-[#7D7D7D]">Bullion</span>
            <div className="h-4 w-px bg-[#262626] mx-0.5"></div>
          </div>
          <div className="flex gap-4 sm:gap-6">
            <div className="flex items-baseline gap-1.5">
              <span className="text-[10px] font-bold text-[#7D7D7D] uppercase">Gold 22K:</span>
              <span className="text-xs font-mono font-extrabold text-[#FFC000] tabular-nums">₹{currentRates ? currentRates.gold_rate_22k.toLocaleString() : '--'}</span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-[10px] font-bold text-[#7D7D7D] uppercase">Silver 999:</span>
              <span className="text-xs font-mono font-extrabold text-white tabular-nums">₹{currentRates ? currentRates.silver_rate.toLocaleString() : '--'}</span>
            </div>
          </div>
          <button 
            onClick={() => addTab({ title: 'Rates', type: 'settings' })} 
            title="Update Metal Rates"
            className="p-1 hover:bg-[#202020] rounded-none border border-transparent hover:border-[#333333] transition-all text-[#FFC000] cursor-pointer"
          >
            <PlusCircle className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3.5 space-y-3.5 bg-black">
        
        {/* KPI CARDS - ZERO-RADIUS NOCTURNAL ARCHITECTURE */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: 'Today\'s Sales', value: stats.todaySales, icon: TrendingUp, color: 'emerald', trend: '+12.5%', isUp: true },
            { label: 'Purchases Today', value: stats.todayPurchases, icon: ShoppingBag, color: 'blue', trend: '0%', isUp: true },
            { label: 'Low Stock Alerts', value: stats.lowStockCount, suffix: 'Items', icon: AlertTriangle, color: 'rose', trend: stats.lowStockCount > 0 ? 'Critical' : 'Normal', isUp: stats.lowStockCount === 0 },
            { label: 'Outstanding Due', value: stats.outstandingDue, icon: Coins, color: 'amber', trend: '-2.4%', isUp: false },
          ].map((card, i) => {
            return (
              <div key={i} className="p-3.5 bg-[#181818] border border-[#262626] rounded-none group hover:border-[#FFC000]/60 transition-colors cursor-default relative overflow-hidden">
                <div className="flex justify-between items-center relative z-10">
                  <div className="p-1.5 rounded-none bg-black border border-[#2c2c2c] text-[#FFC000]">
                    <card.icon className="h-4 w-4" />
                  </div>
                  <div className={`flex items-center gap-1 text-[9.5px] font-bold px-1.5 py-0.5 rounded-none border ${card.isUp ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-rose-500/10 text-rose-400 border-rose-500/30'}`}>
                    {card.isUp ? <ArrowUpRight className="h-2.5 w-2.5" /> : <ArrowDownRight className="h-2.5 w-2.5" />}
                    {card.trend}
                  </div>
                </div>
                <div className="mt-3 relative z-10">
                  <span className="text-[10px] font-bold text-[#7D7D7D] uppercase tracking-wider">{card.label}</span>
                  <div className="flex items-baseline gap-1 mt-0.5">
                    <h3 className={`text-xl font-mono font-extrabold tracking-tight tabular-nums ${card.color === 'rose' && stats.lowStockCount > 0 ? 'text-rose-400' : 'text-white'}`}>
                      {card.suffix ? card.value : '₹' + card.value.toLocaleString()}
                    </h3>
                    {card.suffix && <span className="text-[10px] font-bold text-[#7D7D7D] uppercase">{card.suffix}</span>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* ANALYTICAL GRIDS - 8:4 DESKTOP SPLIT */}
        <div className="grid grid-cols-12 gap-3.5">
          
          {/* RECENT TRANSACTIONS */}
          <div className="col-span-12 lg:col-span-8 flex flex-col gap-2">
            <div className="flex items-center justify-between px-0.5">
              <h3 className="text-xs font-bold tracking-wider flex items-center gap-1.5 text-white uppercase">
                <Clock className="h-3.5 w-3.5 text-[#FFC000]" />
                RECENT SALES VOUCHERS
              </h3>
              <button 
                onClick={() => addTab({ title: 'Ledger Reports', type: 'ledgers' })} 
                className="text-[10px] font-bold text-[#FFC000] uppercase tracking-wider hover:underline flex items-center gap-1 cursor-pointer"
              >
                All Records <ArrowRight className="h-3 w-3" />
              </button>
            </div>
            
            <div className="erp-table-container border border-[#262626] rounded-none overflow-hidden bg-[#202020]">
              <table className="ag-grid-dense-table w-full text-xs">
                <thead>
                  <tr className="bg-[#181818] border-b border-[#262626] text-[10.5px] uppercase tracking-wider text-[#7D7D7D]">
                    <th className="py-2.5 px-3 text-left w-[20%]">Date</th>
                    <th className="py-2.5 px-3 text-left w-[28%]">Voucher #</th>
                    <th className="py-2.5 px-3 text-center">Type</th>
                    <th className="py-2.5 px-3 text-right">Net Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#262626] text-white font-medium">
                  {recentInvoices.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-12 text-center text-[#7D7D7D] bg-[#202020] select-none">
                        <p className="text-xs font-bold uppercase tracking-widest">No Recent Vouchers</p>
                      </td>
                    </tr>
                  ) : (
                    recentInvoices.map((inv) => (
                      <tr key={inv.id} className="hover:bg-[#282828] transition-colors">
                        <td className="py-2 px-3 font-mono text-[11px] text-[#7D7D7D] tabular-nums">{inv.invoice_date}</td>
                        <td className="py-2 px-3 font-semibold text-white tracking-tight">{inv.invoice_number}</td>
                        <td className="py-2 px-3 text-center">
                          <span className={`px-2 py-0.5 rounded-none text-[9px] font-bold uppercase tracking-wider border ${inv.invoice_type === 'Estimate' ? 'bg-[#181818] text-zinc-300 border-[#2c2c2c]' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'}`}>
                            {inv.invoice_type}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-[#FFC000] tabular-nums">₹{inv.net_amount.toLocaleString()}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* QUICK SHORTCUTS & ALERTS */}
          <div className="col-span-12 lg:col-span-4 flex flex-col gap-3">
            
            {/* ACTION PANEL */}
            <div className="p-3.5 bg-[#181818] border border-[#262626] rounded-none">
              <h3 className="text-xs font-bold tracking-wider mb-2.5 text-white uppercase">FAST ACTIONS</h3>
              <div className="grid grid-cols-1 gap-1.5">
                {[
                  { label: 'New Sales Invoice', icon: PlusCircle, type: 'billing', key: 'F3', color: 'primary' },
                  { label: 'Inventory Catalog', icon: Layers, type: 'inventory', key: 'Alt+I', color: 'slate' },
                  { label: 'Financial Reports', icon: TrendingUp, type: 'reports', key: 'Alt+R', color: 'slate' },
                ].map((btn, i) => (
                  <button 
                    key={i} 
                    onClick={() => addTab({ title: btn.label, type: btn.type })} 
                    className="flex items-center justify-between px-3 py-2 rounded-none border border-[#262626] hover:border-[#FFC000]/60 hover:bg-[#202020] transition-colors group cursor-pointer text-left"
                  >
                    <div className="flex items-center gap-2">
                      <btn.icon className="h-3.5 w-3.5 text-[#7D7D7D] group-hover:text-[#FFC000] transition-colors" />
                      <span className="text-xs font-bold uppercase tracking-wider text-zinc-300 group-hover:text-white">{btn.label}</span>
                    </div>
                    <span className="keyboard-key text-[10px] px-1.5 py-0.5 group-hover:border-[#FFC000]/40">{btn.key}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* CRITICAL STOCK ALERTS */}
            <div className="p-3.5 bg-[#181818] border border-[#262626] rounded-none">
              <div className="flex items-center justify-between mb-2.5">
                <h3 className="text-xs font-bold tracking-wider text-rose-400 flex items-center gap-1.5 uppercase">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  STOCK ALERTS
                </h3>
                <span className="text-[9px] font-bold px-2 py-0.5 bg-rose-500/10 text-rose-400 border border-rose-500/30 rounded-none">{stats.lowStockCount}</span>
              </div>
              <div className="space-y-1.5">
                {lowStockProducts.length === 0 ? (
                  <p className="text-[11px] font-medium text-[#7D7D7D] text-center py-3 select-none uppercase">No critical stock warnings.</p>
                ) : (
                  lowStockProducts.slice(0, 4).map((p) => (
                    <div key={p.id} className="flex items-center justify-between px-2.5 py-2 rounded-none bg-[#202020] hover:bg-[#282828] transition-colors border border-[#262626]">
                      <div className="flex flex-col min-w-0 pr-2">
                        <span className="text-[11px] font-bold text-white truncate uppercase">{p.name}</span>
                        <span className="text-[9.5px] font-mono text-[#7D7D7D]">{p.sku}</span>
                      </div>
                      <span className="text-[10px] font-mono font-bold text-rose-400 bg-rose-500/10 border border-rose-500/20 px-1.5 py-0.5 rounded-none whitespace-nowrap tabular-nums">{p.current_stock} QTY</span>
                    </div>
                  ))
                )}
                {stats.lowStockCount > 4 && (
                  <button 
                    onClick={() => addTab({ title: 'Inventory', type: 'inventory' })} 
                    className="w-full text-center text-[10px] font-bold text-[#FFC000] uppercase tracking-widest pt-1.5 hover:underline cursor-pointer"
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
