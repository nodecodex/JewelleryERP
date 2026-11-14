import React, { useState, useEffect, useCallback, useRef, memo } from 'react';
import { APP_VERSION } from '../../version';
import { useTabStore } from '../../store/useTabStore';
import { useThemeStore } from '../../store/useThemeStore';
import { useCompanyStore } from '../../store/useCompanyStore';
import { useProductStore } from '../../store/useProductStore';
import { usePartyStore } from '../../store/usePartyStore';
import { useTaxStore } from '../../store/useTaxStore';
import { useCustomerStore } from '../../store/useCustomerStore';
import { useInvoiceStore } from '../../store/useInvoiceStore';
import { useVoucherStore } from '../../store/useVoucherStore';
import { useRateStore } from '../../store/useRateStore';
import { useTagOpeningStore } from '../../store/useTagOpeningStore';
import { useItStkLimitStore } from '../../store/useItStkLimitStore';
import { debounce } from '../../utils/debounce';
import { useDialog } from '../ui/DialogProvider';

// Views
import Dashboard from '../../pages/Dashboard/Dashboard';
import CompanyView from '../../pages/Company/Company';
import InventoryView from '../../pages/Inventory/Inventory';
import BillingView from '../../pages/Billing/Billing';
import AccountingView from '../../pages/Accounting/Accounting';
import LedgersView from '../../pages/Ledgers/Ledgers';
import ReportsView from '../../pages/Reports/Reports';
import SettingsView from '../../pages/Settings/Settings';
import LicensingView from '../../pages/Licensing/Licensing';
import UsersView from '../../pages/Users/Users';
import CompanySettingsView from '../../pages/Settings/CompanySettings';
import PartyMasterView from '../../pages/Party/PartyMaster';
import TaxMasterView from '../../pages/Tax/TaxMaster';
import TagOpeningView from '../../pages/TagOpening/TagOpening';
import LabourView from '../../pages/Labour/Labour';
import ItStkLimitView from '../../pages/ItStkLimit/ItStkLimit';
import PurchaseView from '../../pages/Purchase/Purchase';
import SalesView from '../../pages/Sales/Sales';
import LedrReportView from '../../pages/LedrReport/LedrReport';
import DailyRateView from '../../pages/DailyRate/DailyRate';
import StockReportView from '../../pages/StockReport/StockReport';

// Icons
import {
  Layers,
  Building2,
  ShoppingCart,
  FileSpreadsheet,
  History,
  TrendingUp,
  Settings as SettingsIcon,
  Shield,
  X,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Database,
  CloudLightning,
  Clock,
  LogOut,
  FolderOpen,
  FileText,
  Users,
  User,
  Coins,
  Sun,
  Moon,
  Search,
  Bell,
  Command,
  Plus
} from 'lucide-react';

// Isolated clock component to prevent Layout re-renders every second
const StatusBarClock = memo(function StatusBarClock() {
  const [systemTime, setSystemTime] = useState(new Date().toLocaleTimeString());

  useEffect(() => {
    const timer = setInterval(() => {
      setSystemTime(new Date().toLocaleTimeString());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return <span className="font-data text-primary/80 font-bold">{systemTime}</span>;
});

export default function Layout() {
  const { theme, toggleTheme } = useThemeStore();
  const { tabs, activeTabId, setActiveTab, closeTab, addTab } = useTabStore();
  const { companies, selectedCompany, setSelectedCompany, loadCompanies } = useCompanyStore();
  const { showConfirm } = useDialog();

  // Data Loaders (Optimized)
  const products = useProductStore((state) => state.products);
  const loadProducts = useProductStore((state) => state.loadProducts);
  const loadParties = usePartyStore((state) => state.loadParties);
  const loadTaxes = useTaxStore((state) => state.loadTaxes);
  const loadCustomers = useCustomerStore((state) => state.loadCustomers);
  const loadInvoices = useInvoiceStore((state) => state.loadInvoices);
  const loadVouchers = useVoucherStore((state) => state.loadVouchers);
  const loadAccounts = useVoucherStore((state) => state.loadAccounts);
  const loadRates = useRateStore((state) => state.loadRates);
  const loadTagOpeningVouchers = useTagOpeningStore((state) => state.loadVouchers);
  const loadItStkLimits = useItStkLimitStore((state) => state.loadLimits);

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [workspaceDropdownOpen, setWorkspaceDropdownOpen] = useState(false);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.workspace-dropdown-container')) {
        setWorkspaceDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Memoize reloadAllData to prevent stale closure issues
  const reloadAllData = useCallback(() => {
    if (selectedCompany) {
      const compId = selectedCompany.id;
      loadProducts(compId);
      loadParties(compId);
      loadTaxes(compId);
      loadCustomers(compId);
      loadInvoices(compId);
      loadVouchers(compId);
      loadAccounts(compId);
      loadRates(compId);
      loadTagOpeningVouchers(compId);
      loadItStkLimits(compId);
    }
  }, [selectedCompany, loadProducts, loadParties, loadTaxes, loadCustomers, loadInvoices, loadVouchers, loadAccounts, loadRates, loadTagOpeningVouchers, loadItStkLimits]);

  // Use ref to always access latest reloadAllData without re-subscribing the IPC listener
  const reloadAllDataRef = useRef(reloadAllData);
  reloadAllDataRef.current = reloadAllData;

  // Debounced database-updated handler: prevents cascading 11 parallel reloads
  // when rapid writes happen (e.g., saving a form triggers notifyRendererOfDbUpdate)
  useEffect(() => {
    if (!(window as any).api?.onDatabaseUpdated) return;

    const debouncedReload = debounce(() => {
      // CAUTION: Firing 11 simultaneous IPC reads immediately after a write 
      // causes the SQLite driver to deadlock/freeze. Disabled shotgun reload.
      console.log('Database updated signal received. Shotgun reload disabled to prevent freeze.');
      // loadCompanies();
      // reloadAllDataRef.current();
    }, 300);

    const unsubscribe = (window as any).api.onDatabaseUpdated(debouncedReload);
    return () => {
      debouncedReload.cancel();
      unsubscribe();
    };
  }, []); // Stable listener — uses ref internally

  useEffect(() => {
    reloadAllData();
  }, [reloadAllData]);

  const handleCompanyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const comp = companies.find((c) => c.id === e.target.value);
    setSelectedCompany(comp || null);
  };

  const [initialFine, setInitialFine] = useState<number>(0);
  useEffect(() => {
    if (selectedCompany) {
      try {
        const settings = JSON.parse(selectedCompany.settings_json || '{}');
        setInitialFine(parseFloat(settings.initialFine) || 0);
      } catch (e) {}
    } else {
      setInitialFine(0);
    }
  }, [selectedCompany]);

  const totalFine = products.reduce((acc, p) => acc + ((p.fine || 0) * (p.current_stock > 0 ? p.current_stock : 0)), 0);
  const profitFine = totalFine - initialFine;

  const handleExit = async () => {
    const confirmed = await showConfirm({
      title: 'Exit Application',
      message: 'Are you sure you want to close the ERP client session?',
      variant: 'danger',
      confirmText: 'Exit',
    });
    if (confirmed) {
      window.close();
    }
  };

  const renderActiveView = (type: string) => {
    switch (type) {
      case 'dashboard': return <Dashboard />;
      case 'company': return <CompanyView />;
      case 'inventory': return <InventoryView />;
      case 'billing': return <BillingView />;
      case 'accounting': return <AccountingView />;
      case 'ledgers': return <LedgersView />;
      case 'reports': return <ReportsView />;
      case 'settings': return <SettingsView />;
      case 'licensing': return <LicensingView />;
      case 'users': return <UsersView />;
      case 'company_settings': return <CompanySettingsView />;
      case 'party': return <PartyMasterView />;
      case 'tax': return <TaxMasterView />;
      case 'tag_opening': return <TagOpeningView />;
      case 'labour': return <LabourView />;
      case 'itstk_limit': return <ItStkLimitView />;
      case 'purchase': return <PurchaseView />;
      case 'sales': return <SalesView />;
      case 'ledr_report': return <LedrReportView />;
      case 'daily_rate': return <DailyRateView />;
      case 'stock_report': return <StockReportView />;
      default: return <Dashboard />;
    }
  };

  const menuGroups = [
    {
      group: 'Masters',
      items: [
        { label: 'Company Master', type: 'company', icon: Building2 },
        { label: 'Party Master', type: 'party', icon: User },
        { label: 'Tax Master', type: 'tax', icon: FolderOpen },
        { label: 'Inventory Catalog', type: 'inventory', icon: Layers },
        { label: 'Stock Tag Opening', type: 'tag_opening', icon: FileText },
        { label: 'Labour Rates', type: 'labour', icon: Coins },
        { label: 'Daily Rate', type: 'daily_rate', icon: Coins },
      ]
    },
    {
      group: 'Transactions',
      items: [
        { label: 'Sales (Tax Invoice)', type: 'sales', icon: ShoppingCart },
        { label: 'Sales Billing Desk', type: 'billing', icon: ShoppingCart },
        { label: 'Purchase Invoicing', type: 'purchase', icon: FileText },
        { label: 'Ledger Vouchers', type: 'accounting', icon: FileSpreadsheet },
      ]
    },
    {
      group: 'Analysis',
      items: [
        { label: 'Ledr Report (Tag Stock)', type: 'ledr_report', icon: FileSpreadsheet },
        { label: 'Stock Report', type: 'stock_report', icon: FileSpreadsheet },
        { label: 'Day Book & Ledgers', type: 'ledgers', icon: History },
        { label: 'Financial Reports', type: 'reports', icon: TrendingUp },
      ]
    }
  ];

  return (
    <div className="flex flex-col h-screen bg-black text-white font-sans overflow-hidden select-none no-print">

      {/* LAMBORGHINI NOCTURNAL TOP BAR (Unified Win11 Header) */}
      <header className="h-11 bg-[#121212] border-b border-[#262626] flex items-center justify-between px-4 lg:px-5 z-50 shrink-0 text-white transition-colors duration-200">
        <div className="flex items-center gap-6">
          {/* Lamborghini Refined Luxury Branding */}
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-[#FFC000] rounded-none flex items-center justify-center shadow-none shrink-0">
              <Sparkles className="h-4 w-4 text-black font-extrabold stroke-[2.5]" />
            </div>
            <div className="flex flex-col leading-none">
              <span className="text-[13px] font-black tracking-wider uppercase font-luxury text-[#FFC000]">SWARNPRO ERP</span>
              <span className="text-[8px] font-bold text-[#7D7D7D] uppercase tracking-widest mt-0.5">v{APP_VERSION} · LUXURY EDITION</span>
            </div>
          </div>

          {/* Integrated Menu System */}
          <nav className="flex items-center gap-0.5">
            {['File', 'Masters', 'Transactions', 'Reports', 'System'].map((menu) => (
              <div key={menu} className="menu-dropdown">
                <button className="px-2.5 py-1 text-xs font-bold uppercase tracking-wider hover:bg-[#202020] rounded-none transition-all text-[#7D7D7D] hover:text-white cursor-pointer">
                  {menu}
                </button>
                <div className="menu-dropdown-content surface-elevated">
                  <button onClick={() => addTab({ title: 'Company Settings', type: 'company_settings' })} className="menu-dropdown-item">
                    <SettingsIcon className="h-4 w-4 text-[#FFC000]" /> Company Settings
                  </button>
                  <button onClick={() => addTab({ title: 'User Rights', type: 'users' })} className="menu-dropdown-item">
                    <Users className="h-4 w-4 text-[#FFC000]" /> User Rights
                  </button>
                  <button onClick={() => addTab({ title: 'Licensing Portal', type: 'licensing' })} className="menu-dropdown-item">
                    <Shield className="h-4 w-4 text-[#FFC000]" /> License & Evaluation
                  </button>
                  <div className="menu-divider" />
                  <button onClick={handleExit} className="menu-dropdown-item text-rose-500 hover:bg-rose-500/10">
                    <LogOut className="h-4 w-4" /> Exit Session
                  </button>
                </div>
              </div>
            ))}
          </nav>
        </div>

        {/* Global Utilities */}
        <div className="flex items-center gap-4">
          {/* Profit Fine Tracker */}
          <div className="hidden xl:flex items-center gap-2.5 bg-[#181818] px-2.5 py-1 rounded-none border border-[#262626]">
            <div className="flex flex-col items-end leading-tight">
              <span className="text-[8px] font-bold text-[#7D7D7D] uppercase tracking-wider">Init Fine</span>
              <span className="text-[10px] font-mono font-bold text-[#FFC000]">{initialFine.toFixed(3)}g</span>
            </div>
            <div className="w-px h-5 bg-[#262626]"></div>
            <div className="flex flex-col items-end leading-tight">
              <span className="text-[8px] font-bold text-[#7D7D7D] uppercase tracking-wider">Total Fine</span>
              <span className="text-[10px] font-mono font-bold text-[#29ABE2]">{totalFine.toFixed(3)}g</span>
            </div>
            <div className="w-px h-5 bg-[#262626]"></div>
            <div className="flex flex-col items-end leading-tight">
              <span className="text-[8px] font-bold text-[#7D7D7D] uppercase tracking-wider">
                {profitFine >= 0 ? 'Profit PG' : 'Loss PG'}
              </span>
              <span className={`text-[10px] font-mono font-extrabold ${profitFine >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {profitFine > 0 ? '+' : (profitFine < 0 ? '-' : '')}{Math.abs(profitFine).toFixed(3)}g
              </span>
            </div>
          </div>

          {/* Quick Search */}
          <div className="hidden lg:flex items-center bg-[#181818] border border-[#262626] px-2.5 py-1 rounded-none gap-2 w-52 focus-within:border-[#FFC000] transition-all">
            <Search className="h-3.5 w-3.5 text-[#7D7D7D]" />
            <input type="text" placeholder="QUICK SEARCH (CTRL+K)..." className="bg-transparent border-none p-0 h-auto text-xs focus:ring-0 w-full font-medium uppercase text-white placeholder-[#7D7D7D]" />
          </div>

          <div className="flex items-center gap-2">
            <button onClick={toggleTheme} className="p-1.5 hover:bg-[#202020] rounded-none transition-all text-[#7D7D7D] hover:text-[#FFC000] cursor-pointer" title="Toggle Theme">
              {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            </button>
            <button className="p-1.5 hover:bg-[#202020] rounded-none transition-all text-[#7D7D7D] hover:text-white relative cursor-pointer" title="Notifications">
              <Bell className="h-4 w-4" />
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-[#FFC000] rounded-none"></span>
            </button>
            <div className="h-6 w-px bg-[#262626] mx-1"></div>
            <div className="flex items-center gap-2 pl-0.5">
              <div className="flex flex-col items-end leading-tight">
                <span className="text-xs font-bold text-white uppercase truncate max-w-[160px]">{selectedCompany?.name || 'SELECT COMPANY'}</span>
                <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-none bg-emerald-400"></span>
                  Active
                </span>
              </div>
              <div className="w-7 h-7 rounded-none bg-[#FFC000]/10 border border-[#FFC000]/30 flex items-center justify-center text-[#FFC000] font-black text-xs font-mono">
                SP
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* QUICK ACTIONS RIBBON */}
      <section className="h-11 bg-[#181818] text-white border-b border-[#262626] flex items-center justify-between px-4 lg:px-5 shrink-0 shadow-none transition-colors duration-200">
        <div className="flex items-center gap-1.5">
          {[
            { label: 'Sales Bill', icon: ShoppingCart, type: 'billing', key: 'F3' },
            { label: 'Tax Invoice', icon: FileText, type: 'sales', key: 'F8' },
            { label: 'Voucher', icon: FileSpreadsheet, type: 'accounting', key: 'F4' },
            { label: 'Stock Master', icon: Layers, type: 'inventory', key: 'F5' },
            { label: 'Reports', icon: TrendingUp, type: 'reports', key: 'F6' },
          ].map((item) => (
            <button
              key={item.label}
              onClick={() => addTab({ title: item.label, type: item.type })}
              className="flex items-center gap-1.5 px-3 py-1 h-7.5 hover:bg-[#202020] rounded-none transition-all group relative border border-transparent hover:border-[#333333] cursor-pointer"
            >
              <item.icon className="h-3.5 w-3.5 text-[#7D7D7D] group-hover:text-[#FFC000] transition-colors" />
              <span className="text-[11px] font-bold text-zinc-300 group-hover:text-white uppercase tracking-wider">{item.label}</span>
              <span className="text-[9px] font-mono font-bold text-[#FFC000]/70 group-hover:text-[#FFC000] bg-black/40 px-1 py-0.5 rounded-none ml-0.5">{item.key}</span>
            </button>
          ))}
          <div className="h-6 w-px bg-[#262626] mx-2"></div>
          <button
            onClick={() => addTab({ title: 'Sales Billing Desk', type: 'billing' })}
            className="flex items-center gap-1.5 px-4 py-1 h-7.5 bg-[#FFC000] text-black font-extrabold rounded-none shadow-none hover:bg-[#917300] transition-all text-xs uppercase tracking-wider cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5 stroke-[3]" />
            <span>New Sale</span>
          </button>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-[#7D7D7D] uppercase tracking-wider">Workspace:</span>
            <div className="relative workspace-dropdown-container">
              <button
                type="button"
                onClick={() => setWorkspaceDropdownOpen(!workspaceDropdownOpen)}
                className="flex items-center gap-1.5 bg-[#202020] hover:bg-[#282828] px-2.5 py-1 rounded-none text-xs font-bold text-white hover:text-[#FFC000] transition-all duration-200 cursor-pointer border border-[#2c2c2c] uppercase"
              >
                <FolderOpen className="h-3.5 w-3.5 text-[#FFC000]" />
                <span className="max-w-[180px] truncate">{selectedCompany?.name || 'Select Company'}</span>
                <ChevronDown className={`h-3.5 w-3.5 text-[#7D7D7D] transition-transform duration-200 ${workspaceDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {workspaceDropdownOpen && (
                <div className="absolute right-0 top-full mt-1.5 w-64 bg-[#181818] border border-[#2c2c2c] rounded-none shadow-2xl z-50 py-1">
                  <div className="px-3 py-1.5 text-[9px] font-bold text-[#7D7D7D] uppercase tracking-wider border-b border-[#262626]">
                    Available Company Workspaces
                  </div>
                  {companies.map((c) => {
                    const isActive = selectedCompany?.id === c.id;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          setSelectedCompany(c);
                          setWorkspaceDropdownOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2 text-xs font-bold uppercase tracking-wider flex items-center justify-between hover:bg-[#202020] transition-colors cursor-pointer ${
                          isActive ? 'text-[#FFC000] bg-[#FFC000]/10 font-black' : 'text-zinc-300'
                        }`}
                      >
                        <span className="truncate">{c.name}</span>
                        {isActive && <div className="w-1.5 h-1.5 rounded-none bg-[#FFC000] shrink-0" />}
                      </button>
                    );
                  })}
                  <div className="border-t border-[#262626] mt-1 pt-1">
                    <button
                      onClick={() => {
                        addTab({ title: 'Company Master', type: 'company' });
                        setWorkspaceDropdownOpen(false);
                      }}
                      className="w-full text-left px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-[#FFC000] hover:bg-[#FFC000]/10 flex items-center gap-2 cursor-pointer"
                    >
                      <Plus className="h-3.5 w-3.5" /> Manage Companies
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* MAIN LAYOUT CANVAS - CATHEDRAL OF DARKNESS */}
      <div className="flex-1 flex overflow-hidden bg-black">

        {/* LAMBORGHINI NOCTURNAL SIDEBAR */}
        <aside
          className={`bg-[#0a0a0a] border-r border-[#262626] text-white flex flex-col transition-all duration-200 ${sidebarCollapsed ? 'w-14' : 'w-56'}`}
        >
          <div className="flex-1 overflow-y-auto py-3 space-y-4">
            {menuGroups.map((g, idx) => (
              <div key={idx} className="px-3">
                {!sidebarCollapsed && (
                  <span className="px-3 text-[10px] font-black text-[#7D7D7D] uppercase tracking-[0.2em] block mb-2">
                    {g.group}
                  </span>
                )}
                <div className="space-y-0.5">
                  {g.items.map((item) => (
                    <button
                      key={item.type}
                      onClick={() => addTab({ title: item.label, type: item.type })}
                      className="w-full flex items-center gap-3 px-3 py-2 hover:bg-[#181818] rounded-none text-zinc-400 hover:text-white transition-all group cursor-pointer"
                      title={item.label}
                    >
                      <item.icon className="h-4.5 w-4.5 shrink-0 group-hover:text-[#FFC000] transition-colors" />
                      {!sidebarCollapsed && (
                        <span className="text-xs font-bold uppercase tracking-wider truncate">{item.label}</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="p-3 bg-[#121212] hover:bg-[#181818] text-[#7D7D7D] hover:text-white flex items-center justify-center transition-all shrink-0 border-t border-[#262626] cursor-pointer"
          >
            {sidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </aside>

        {/* WORKSPACE AREA */}
        <main className="flex-1 flex flex-col overflow-hidden bg-black">
          {/* RAZOR-SHARP TAB STRIP */}
          <div className="bg-[#121212] border-b border-[#262626] h-10 flex items-end px-3 shrink-0">
            <div className="flex gap-1 overflow-x-auto h-full items-end scrollbar-none">
              {tabs.map((t) => {
                const isActive = t.id === activeTabId;
                return (
                  <div
                    key={t.id}
                    onClick={() => setActiveTab(t.id)}
                    className={`flex items-center gap-2.5 px-4 h-9 rounded-none transition-all cursor-pointer text-xs font-bold uppercase tracking-wider relative select-none border-r border-[#262626] ${isActive
                      ? 'bg-[#202020] text-white border-t-2 border-t-[#FFC000]'
                      : 'text-[#7D7D7D] hover:text-white hover:bg-[#181818]'
                      }`}
                  >
                    <span>{t.title}</span>
                    {t.id !== 'dashboard' && (
                      <button
                        onClick={(e) => { e.stopPropagation(); closeTab(t.id); }}
                        className="p-0.5 rounded-none hover:bg-rose-500/20 text-[#7D7D7D] hover:text-rose-400 transition-colors ml-1 cursor-pointer"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* VIEWPORT CANVAS */}
          <div className="flex-1 overflow-hidden relative p-2 sm:p-2.5 lg:p-3 bg-black">
            {tabs.map((t) => (
              <div
                key={t.id}
                className={`h-full ${t.id === activeTabId ? 'block' : 'hidden'}`}
              >
                <div className="h-full bg-[#202020] border border-[#262626] rounded-none overflow-hidden">
                  {renderActiveView(t.type)}
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>

      {/* STATUS BAR (Nocturnal Precision) */}
      <footer className="h-8 bg-[#121212] text-white border-t border-[#262626] flex items-center justify-between px-6 shrink-0">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-none bg-emerald-400"></div>
            <span className="text-[11px] font-bold text-[#7D7D7D] uppercase tracking-wider">SYSTEM ONLINE</span>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-[#7D7D7D]">
            <Database className="h-3.5 w-3.5" />
            <span className="font-mono text-xs uppercase text-zinc-300">SQLITE ENCRYPTED</span>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-[#7D7D7D] border-l border-[#262626] pl-4">
            <Clock className="h-3.5 w-3.5 text-[#FFC000]" />
            <StatusBarClock />
          </div>
        </div>

        <div className="flex items-center gap-4">
          <span className="text-[10px] font-bold text-[#7D7D7D] tracking-widest uppercase">SHORTCUTS:</span>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5"><span className="keyboard-key">F2</span> <span className="text-[11px] font-bold uppercase text-[#7D7D7D]">Save</span></span>
            <span className="flex items-center gap-1.5"><span className="keyboard-key">F12</span> <span className="text-[11px] font-bold uppercase text-[#7D7D7D]">Print</span></span>
            <span className="flex items-center gap-1.5"><span className="keyboard-key">Alt+X</span> <span className="text-[11px] font-bold uppercase text-[#7D7D7D]">Exit</span></span>
          </div>
        </div>
      </footer>
    </div>
  );
}
