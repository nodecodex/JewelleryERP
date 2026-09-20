import React, { useState, useEffect, useCallback, useRef, memo } from 'react';
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

  return <span className="font-data text-primary font-semibold">{systemTime}</span>;
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

      {/* PREMIUM TOP BAR (Unified Desktop Header) */}
      <header className="h-12 bg-card border-b border-border flex items-center justify-between px-6 z-50 shrink-0 text-foreground transition-colors duration-200">
        <div className="flex items-center gap-8">
          {/* Refined Branding */}
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-primary rounded flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-primary-foreground" />
            </div>
            <div className="flex flex-col leading-none">
              <span className="text-sm font-bold tracking-tight font-luxury text-primary">JEWEL ACC</span>
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mt-0.5">Enterprise Pro</span>
            </div>
          </div>

          {/* Integrated Menu System */}
          <nav className="flex items-center gap-1">
            {['File', 'Masters', 'Transactions', 'Reports', 'System'].map((menu) => (
              <div key={menu} className="menu-dropdown">
                <button className="px-3 py-1.5 text-[13px] font-semibold hover:bg-secondary rounded transition-all text-muted-foreground hover:text-foreground">
                  {menu}
                </button>
                <div className="menu-dropdown-content surface-elevated">
                  <button onClick={() => addTab({ title: 'Company Settings', type: 'company_settings' })} className="menu-dropdown-item">
                    <SettingsIcon className="h-4 w-4" /> Company Settings
                  </button>
                  <button onClick={() => addTab({ title: 'User Rights', type: 'users' })} className="menu-dropdown-item">
                    <Users className="h-4 w-4" /> User Rights
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
        <div className="flex items-center gap-6">
          {/* Profit Fine Tracker */}
          <div className="hidden lg:flex items-center gap-3 bg-card px-4 py-1.5 rounded border border-border shadow-sm">
            <div className="flex flex-col items-end">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Initial Fine</span>
              <span className="text-xs font-data font-bold text-foreground">{initialFine.toFixed(3)}g</span>
            </div>
            <div className="w-px h-6 bg-border"></div>
            <div className="flex flex-col items-end">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Total Fine</span>
              <span className="text-xs font-data font-bold text-foreground">{totalFine.toFixed(3)}g</span>
            </div>
            <div className="w-px h-6 bg-border"></div>
            <div className="flex flex-col items-end">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                {profitFine >= 0 ? 'Profit PG' : 'Loss PG'}
              </span>
              <span className={`text-xs font-data font-bold ${profitFine >= 0 ? 'text-success' : 'text-destructive'}`}>
                {profitFine > 0 ? '+' : (profitFine < 0 ? '-' : '')}{Math.abs(profitFine).toFixed(3)}g
              </span>
            </div>
          </div>

          {/* Quick Search */}
          <div className="hidden md:flex items-center bg-card border border-border px-3 py-1.5 rounded gap-2 w-64 focus-within:border-primary transition-all shadow-sm">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input type="text" placeholder="Search masters or bills..." className="bg-transparent border-none p-0 h-auto text-[13px] focus:ring-0 w-full" />
            <span className="keyboard-key flex items-center gap-0.5">
              <Command className="h-2.5 w-2.5" /> K
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button onClick={toggleTheme} className="btn-icon">
              {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            </button>
            <button className="btn-icon relative">
              <Bell className="h-4 w-4" />
              <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-destructive rounded-full"></span>
            </button>
            <div className="h-6 w-px bg-border mx-1"></div>
            <div className="flex items-center gap-2 pl-1">
              <div className="flex flex-col items-end">
                <span className="text-[13px] font-bold text-foreground leading-none">{selectedCompany?.name || 'Select Company'}</span>
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mt-1">Administrator</span>
              </div>
              <div className="w-8 h-8 rounded bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold text-sm">
                A
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* QUICK ACTIONS RIBBON */}
      <section className="h-14 bg-secondary/30 text-foreground border-b border-border flex items-center justify-between px-6 shrink-0 transition-colors duration-200">
        <div className="flex items-center gap-1">
          {[
            { label: 'Sales Bill', icon: ShoppingCart, type: 'billing', key: 'F3' },
            { label: 'Voucher', icon: FileSpreadsheet, type: 'accounting', key: 'F4' },
            { label: 'Stock', icon: Layers, type: 'inventory', key: 'F5' },
            { label: 'Reports', icon: TrendingUp, type: 'reports', key: 'F6' },
          ].map((item) => (
            <button
              key={item.label}
              onClick={() => addTab({ title: item.label, type: item.type })}
              className="flex items-center gap-2 h-9 px-3 hover:bg-secondary rounded transition-all group relative"
            >
              <item.icon className="h-4 w-4 text-primary" />
              <span className="text-[12px] font-bold text-foreground group-hover:text-primary transition-colors">{item.label}</span>
              <span className="text-[10px] font-data text-muted-foreground ml-2">[{item.key}]</span>
            </button>
          ))}
          <div className="h-6 w-px bg-border mx-3"></div>
          <button className="btn btn-primary h-8 text-[12px]">
            <Plus className="h-3.5 w-3.5" /> New Transaction
          </button>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex flex-col items-end mr-2">
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">Active Workspace</span>
            <div className="relative workspace-dropdown-container">
              <button
                type="button"
                onClick={() => setWorkspaceDropdownOpen(!workspaceDropdownOpen)}
                className="flex items-center gap-1 bg-transparent border-none text-[13px] font-bold focus:outline-none cursor-pointer h-auto p-0 text-right text-foreground hover:text-primary transition-all duration-200"
              >
                <span>{selectedCompany?.name || 'Select Company'}</span>
                <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${workspaceDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {workspaceDropdownOpen && (
                <div className="absolute right-0 top-full mt-2 w-56 bg-card border border-border rounded shadow-elevated z-50 py-1">
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
                        className={`w-full text-left px-4 py-2 text-[12px] font-semibold flex items-center justify-between hover:bg-secondary transition-colors ${
                          isActive ? 'text-primary bg-primary/5' : 'text-foreground'
                        }`}
                      >
                        <span>{c.name}</span>
                        {isActive && <div className="w-1.5 h-1.5 rounded-full bg-primary" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* MAIN LAYOUT CANVAS */}
      <div className="flex-1 flex overflow-hidden bg-background">

        {/* SIDEBAR */}
        <aside
          className={`bg-sidebar-bg border-r border-sidebar-border text-sidebar-text flex flex-col transition-all duration-300 ${sidebarCollapsed ? 'w-16' : 'w-60'}`}
        >
          <div className="flex-1 overflow-y-auto py-4 space-y-5 custom-scrollbar">
            {menuGroups.map((g, idx) => (
              <div key={idx} className="px-3">
                {!sidebarCollapsed && (
                  <span className="px-2 text-[10px] font-bold text-sidebar-text/50 uppercase tracking-widest block mb-2">
                    {g.group}
                  </span>
                )}
                <div className="space-y-0.5">
                  {g.items.map((item) => (
                    <button
                      key={item.type}
                      onClick={() => addTab({ title: item.label, type: item.type })}
                      className="w-full flex items-center gap-3 px-2 py-2 hover:bg-sidebar-hover rounded text-sidebar-text hover:text-white transition-all group cursor-pointer"
                      title={item.label}
                    >
                      <item.icon className="h-4 w-4 shrink-0 group-hover:text-primary transition-colors" />
                      {!sidebarCollapsed && (
                        <span className="text-[13px] font-medium tracking-tight">{item.label}</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="p-3 bg-sidebar-border/50 hover:bg-sidebar-hover text-sidebar-text hover:text-white flex items-center justify-center transition-all shrink-0 border-t border-sidebar-border"
          >
            {sidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </aside>

        {/* WORKSPACE AREA */}
        <main className="flex-1 flex flex-col overflow-hidden bg-background">
          {/* TAB BAR */}
          <div className="bg-card border-b border-border h-10 flex items-end px-4 shrink-0">
            <div className="flex gap-1 overflow-x-auto h-full items-end scrollbar-none w-full">
              {tabs.map((t) => {
                const isActive = t.id === activeTabId;
                return (
                  <div
                    key={t.id}
                    onClick={() => setActiveTab(t.id)}
                    className={`flex items-center gap-2 px-4 h-8 rounded-t border-t border-l border-r transition-all cursor-pointer text-[12px] font-bold relative ${isActive
                      ? 'bg-background text-primary border-border border-b-0 z-10 before:absolute before:-top-px before:left-0 before:right-0 before:h-[2px] before:bg-primary'
                      : 'bg-secondary/50 text-muted-foreground border-transparent border-b-border hover:bg-secondary'
                      }`}
                    style={{ marginBottom: isActive ? '-1px' : '0' }}
                  >
                    <span>{t.title}</span>
                    {t.id !== 'dashboard' && (
                      <button
                        onClick={(e) => { e.stopPropagation(); closeTab(t.id); }}
                        className="p-0.5 rounded hover:bg-muted text-muted-foreground hover:text-destructive transition-colors ml-1"
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
          <div className="flex-1 overflow-hidden relative p-4">
            {tabs.map((t) => (
              <div
                key={t.id}
                className={`h-full ${t.id === activeTabId ? 'block' : 'hidden'}`}
              >
                <div className="h-full bg-card border border-border shadow-sm rounded overflow-hidden">
                  {renderActiveView(t.type)}
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>

      {/* STATUS BAR */}
      <footer className="h-7 bg-card text-foreground border-t border-border flex items-center justify-between px-4 shrink-0 transition-colors duration-200 select-none">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-success"></div>
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">System Ready</span>
          </div>
          <div className="h-3 w-px bg-border"></div>
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-bold tracking-wide">
            <Database className="h-3 w-3 text-primary" />
            <span className="font-data">Local Storage (SQLITE)</span>
          </div>
          <div className="h-3 w-px bg-border"></div>
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <Clock className="h-3 w-3" />
            <StatusBarClock />
          </div>
        </div>

        <div className="flex items-center gap-4">
          <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Shortcuts</span>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1"><span className="keyboard-key">F2</span> <span className="text-[10px] font-semibold text-muted-foreground">Save</span></span>
            <span className="flex items-center gap-1"><span className="keyboard-key">F12</span> <span className="text-[10px] font-semibold text-muted-foreground">Print</span></span>
            <span className="flex items-center gap-1"><span className="keyboard-key">Alt+X</span> <span className="text-[10px] font-semibold text-muted-foreground">Exit</span></span>
          </div>
        </div>
      </footer>
    </div>
  );
}
