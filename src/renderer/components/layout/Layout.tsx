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
    <div className="flex flex-col h-screen bg-background text-foreground font-sans overflow-hidden select-none no-print">

      {/* PREMIUM TOP BAR (Unified Win11 Header) */}
      <header className="h-11 bg-card/90 backdrop-blur-md border-b border-border flex items-center justify-between px-4 lg:px-5 z-50 shrink-0 text-card-foreground transition-colors duration-200">
        <div className="flex items-center gap-6">
          {/* Refined Branding */}
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-gradient-to-br from-amber-500 to-amber-600 rounded-md flex items-center justify-center shadow-sm">
              <Sparkles className="h-4 w-4 text-slate-950 font-bold" />
            </div>
            <div className="flex flex-col leading-none">
              <span className="text-[13px] font-bold tracking-tight font-luxury text-primary">SWARNPRO ERP</span>
              <span className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest mt-0.5">v{APP_VERSION} · Professional Edition</span>
            </div>
          </div>

          {/* Integrated Menu System */}
          <nav className="flex items-center gap-0.5">
            {['File', 'Masters', 'Transactions', 'Reports', 'System'].map((menu) => (
              <div key={menu} className="menu-dropdown">
                <button className="px-2.5 py-1 text-xs font-semibold hover:bg-secondary rounded-md transition-all text-muted-foreground hover:text-foreground">
                  {menu}
                </button>
                <div className="menu-dropdown-content surface-elevated">
                  <button onClick={() => addTab({ title: 'Company Settings', type: 'company_settings' })} className="menu-dropdown-item">
                    <SettingsIcon className="h-4 w-4" /> Company Settings
                  </button>
                  <button onClick={() => addTab({ title: 'User Rights', type: 'users' })} className="menu-dropdown-item">
                    <Users className="h-4 w-4" /> User Rights
                  </button>
                  <button onClick={() => addTab({ title: 'Licensing Portal', type: 'licensing' })} className="menu-dropdown-item">
                    <Shield className="h-4 w-4" /> License & Evaluation
                  </button>
                  <div className="menu-divider" />
                  <button onClick={handleExit} className="menu-dropdown-item text-destructive hover:bg-destructive/10">
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
          <div className="hidden xl:flex items-center gap-2.5 bg-secondary/40 px-2.5 py-1 rounded-md border border-border shadow-xs">
            <div className="flex flex-col items-end leading-tight">
              <span className="text-[8px] font-bold text-muted-foreground uppercase tracking-wider">Init Fine</span>
              <span className="text-[10px] font-mono font-bold text-amber-600 dark:text-amber-400">{initialFine.toFixed(3)}g</span>
            </div>
            <div className="w-px h-5 bg-border"></div>
            <div className="flex flex-col items-end leading-tight">
              <span className="text-[8px] font-bold text-muted-foreground uppercase tracking-wider">Total Fine</span>
              <span className="text-[10px] font-mono font-bold text-blue-600 dark:text-blue-400">{totalFine.toFixed(3)}g</span>
            </div>
            <div className="w-px h-5 bg-border"></div>
            <div className="flex flex-col items-end leading-tight">
              <span className="text-[8px] font-bold text-muted-foreground uppercase tracking-wider">
                {profitFine >= 0 ? 'Profit PG' : 'Loss PG'}
              </span>
              <span className={`text-[10px] font-mono font-extrabold ${profitFine >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                {profitFine > 0 ? '+' : (profitFine < 0 ? '-' : '')}{Math.abs(profitFine).toFixed(3)}g
              </span>
            </div>
          </div>

          {/* Quick Search */}
          <div className="hidden lg:flex items-center bg-secondary/50 border border-border px-2.5 py-1 rounded-md gap-2 w-52 focus-within:ring-1 focus-within:ring-primary/30 transition-all">
            <Search className="h-3.5 w-3.5 text-muted-foreground" />
            <input type="text" placeholder="Quick search (Ctrl+K)..." className="bg-transparent border-none p-0 h-auto text-xs focus:ring-0 w-full font-medium" />
          </div>

          <div className="flex items-center gap-2">
            <button onClick={toggleTheme} className="p-1.5 hover:bg-secondary rounded-md transition-all text-muted-foreground hover:text-primary cursor-pointer" title="Toggle Theme">
              {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            </button>
            <button className="p-1.5 hover:bg-secondary rounded-md transition-all text-muted-foreground relative cursor-pointer" title="Notifications">
              <Bell className="h-4 w-4" />
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-rose-500 rounded-full"></span>
            </button>
            <div className="h-6 w-px bg-border mx-1"></div>
            <div className="flex items-center gap-2 pl-0.5">
              <div className="flex flex-col items-end leading-tight">
                <span className="text-xs font-bold text-foreground truncate max-w-[160px]">{selectedCompany?.name || 'Select Company'}</span>
                <span className="text-[9px] font-bold text-emerald-500 uppercase tracking-wider flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  Active
                </span>
              </div>
              <div className="w-7 h-7 rounded-md bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold text-xs font-luxury">
                SP
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* QUICK ACTIONS RIBBON */}
      <section className="h-11 bg-card text-card-foreground border-b border-border flex items-center justify-between px-4 lg:px-5 shrink-0 shadow-xs transition-colors duration-200">
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
              className="flex items-center gap-1.5 px-2.5 py-1 h-7.5 hover:bg-secondary rounded-md transition-all group relative active:scale-95 border border-transparent hover:border-border cursor-pointer"
            >
              <item.icon className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
              <span className="text-[11px] font-semibold text-muted-foreground group-hover:text-foreground tracking-tight">{item.label}</span>
              <span className="text-[9px] font-mono font-bold text-primary/60 group-hover:text-primary bg-primary/5 px-1 rounded ml-0.5">{item.key}</span>
            </button>
          ))}
          <div className="h-6 w-px bg-border mx-2"></div>
          <button
            onClick={() => addTab({ title: 'Sales Billing Desk', type: 'billing' })}
            className="flex items-center gap-1.5 px-3 py-1 h-7.5 bg-primary text-slate-950 font-bold rounded-md shadow-xs hover:bg-primary/90 transition-all active:scale-95 text-xs cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>New Sale</span>
          </button>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Workspace:</span>
            <div className="relative workspace-dropdown-container">
              <button
                type="button"
                onClick={() => setWorkspaceDropdownOpen(!workspaceDropdownOpen)}
                className="flex items-center gap-1.5 bg-secondary/60 hover:bg-secondary px-2.5 py-1 rounded-md text-xs font-bold text-foreground hover:text-primary transition-all duration-200 cursor-pointer border border-border"
              >
                <FolderOpen className="h-3.5 w-3.5 text-primary" />
                <span className="max-w-[180px] truncate">{selectedCompany?.name || 'Select Company'}</span>
                <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground/70 transition-transform duration-200 ${workspaceDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {workspaceDropdownOpen && (
                <div className="absolute right-0 top-full mt-1.5 w-64 bg-card border border-border rounded-lg shadow-elevated z-50 py-1 animate-in fade-in slide-in-from-top-1 duration-150">
                  <div className="px-3 py-1.5 text-[9px] font-bold text-muted-foreground uppercase tracking-wider border-b border-border">
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
                        className={`w-full text-left px-3 py-2 text-xs font-semibold flex items-center justify-between hover:bg-secondary/60 transition-colors cursor-pointer ${
                          isActive ? 'text-primary bg-primary/5 font-bold' : 'text-foreground/80'
                        }`}
                      >
                        <span className="truncate">{c.name}</span>
                        {isActive && <div className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />}
                      </button>
                    );
                  })}
                  <div className="border-t border-border mt-1 pt-1">
                    <button
                      onClick={() => {
                        addTab({ title: 'Company Master', type: 'company' });
                        setWorkspaceDropdownOpen(false);
                      }}
                      className="w-full text-left px-3 py-1.5 text-xs font-bold text-primary hover:bg-primary/5 flex items-center gap-2 cursor-pointer"
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

      {/* MAIN LAYOUT CANVAS */}
      <div className="flex-1 flex overflow-hidden bg-[#F3F4F6] dark:bg-slate-950">

        {/* MICA SIDEBAR */}
        <aside
          className={`bg-sidebar-bg border-r border-sidebar-border text-sidebar-text flex flex-col transition-all duration-300 ${sidebarCollapsed ? 'w-14' : 'w-56'}`}
        >
          <div className="flex-1 overflow-y-auto py-3 space-y-4">
            {menuGroups.map((g, idx) => (
              <div key={idx} className="px-4">
                {!sidebarCollapsed && (
                  <span className="px-3 text-[10px] font-bold text-sidebar-text/30 uppercase tracking-[0.2em] block mb-3">
                    {g.group}
                  </span>
                )}
                <div className="space-y-1">
                  {g.items.map((item) => (
                    <button
                      key={item.type}
                      onClick={() => addTab({ title: item.label, type: item.type })}
                      className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-sidebar-hover rounded-xl text-sidebar-text/70 hover:text-white transition-all group cursor-pointer"
                      title={item.label}
                    >
                      <item.icon className="h-5 w-5 shrink-0 group-hover:text-primary transition-colors" />
                      {!sidebarCollapsed && (
                        <span className="text-sm font-medium tracking-tight">{item.label}</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="p-4 bg-black/20 hover:bg-black/40 text-sidebar-text/40 hover:text-white flex items-center justify-center transition-all shrink-0"
          >
            {sidebarCollapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
          </button>
        </aside>

        {/* WORKSPACE AREA */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* MODERN TAB BAR */}
          <div className="bg-card/60 backdrop-blur-sm border-b border-border h-9.5 flex items-end px-3 lg:px-4 shrink-0 transition-colors duration-200">
            <div className="flex gap-1.5 overflow-x-auto h-full items-end scrollbar-none">
              {tabs.map((t) => {
                const isActive = t.id === activeTabId;
                return (
                  <div
                    key={t.id}
                    onClick={() => setActiveTab(t.id)}
                    className={`flex items-center gap-2 px-3.5 h-8 rounded-t-lg transition-all cursor-pointer text-xs font-semibold relative ${isActive
                      ? 'bg-background text-primary shadow-xs z-10 before:content-[""] before:absolute before:bottom-[-1px] before:left-0 before:right-0 before:h-[2px] before:bg-primary'
                      : 'text-foreground/70 hover:text-foreground hover:bg-secondary/50'
                      }`}
                  >
                    <span>{t.title}</span>
                    {t.id !== 'dashboard' && (
                      <button
                        onClick={(e) => { e.stopPropagation(); closeTab(t.id); }}
                        className="p-0.5 rounded hover:bg-muted text-foreground/40 hover:text-destructive transition-colors ml-0.5 cursor-pointer"
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
          <div className="flex-1 overflow-hidden relative p-2 sm:p-2.5 lg:p-3">
            {tabs.map((t) => (
              <div
                key={t.id}
                className={`h-full ${t.id === activeTabId ? 'block animate-in fade-in zoom-in-95 duration-200' : 'hidden'}`}
              >
                <div className="h-full surface-premium overflow-hidden border border-border/80 shadow-xs">
                  {renderActiveView(t.type)}
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>

      {/* STATUS BAR (Dense & Informative) */}
      <footer className="h-8 bg-card text-card-foreground border-t border-border flex items-center justify-between px-6 shrink-0 transition-colors duration-200">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">System Online</span>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <Database className="h-3.5 w-3.5" />
            <span className="font-data">Local Storage (SQLITE)</span>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground border-l border-border pl-4">
            <Clock className="h-3.5 w-3.5" />
            <StatusBarClock />
          </div>
        </div>

        <div className="flex items-center gap-4">
          <span className="text-[10px] font-bold text-muted-foreground/40">SHORTCUTS:</span>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5"><span className="keyboard-key">F2</span> <span className="text-[11px] font-medium text-muted-foreground">Save</span></span>
            <span className="flex items-center gap-1.5"><span className="keyboard-key">F12</span> <span className="text-[11px] font-medium text-muted-foreground">Print</span></span>
            <span className="flex items-center gap-1.5"><span className="keyboard-key">Alt+X</span> <span className="text-[11px] font-medium text-muted-foreground">Exit</span></span>
          </div>
        </div>
      </footer>
    </div>
  );
}
