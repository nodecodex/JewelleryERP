import React, { useState, useEffect } from 'react';
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

export default function Layout() {
  const { theme, toggleTheme } = useThemeStore();
  const { tabs, activeTabId, setActiveTab, closeTab, addTab } = useTabStore();
  const { companies, selectedCompany, setSelectedCompany, loadCompanies } = useCompanyStore();

  // Data Loaders (Optimized)
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
  const [systemTime, setSystemTime] = useState(new Date().toLocaleTimeString());
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

  const reloadAllData = () => {
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
  };

  useEffect(() => {
    if (!(window as any).api?.onDatabaseUpdated) return;
    const unsubscribe = (window as any).api.onDatabaseUpdated(() => {
      loadCompanies();
      reloadAllData();
    });
    return () => unsubscribe();
  }, [selectedCompany]);

  useEffect(() => {
    reloadAllData();
  }, [selectedCompany]);

  useEffect(() => {
    const timer = setInterval(() => {
      setSystemTime(new Date().toLocaleTimeString());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleCompanyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const comp = companies.find((c) => c.id === e.target.value);
    setSelectedCompany(comp || null);
  };

  const handleExit = () => {
    if (confirm('Are you sure you want to close the ERP client session?')) {
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
      <header className="h-12 bg-card/85 backdrop-blur-md border-b border-border flex items-center justify-between px-6 z-50 shrink-0 text-card-foreground transition-colors duration-200">
        <div className="flex items-center gap-8">
          {/* Refined Branding */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shadow-premium">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div className="flex flex-col leading-none">
              <span className="text-[14px] font-bold tracking-tight font-luxury text-primary">JEWEL ACC</span>
              <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mt-0.5">Enterprise Pro</span>
            </div>
          </div>

          {/* Integrated Menu System */}
          <nav className="flex items-center gap-1">
            {['File', 'Masters', 'Transactions', 'Reports', 'System'].map((menu) => (
              <div key={menu} className="menu-dropdown">
                <button className="px-3 py-1.5 text-sm font-medium hover:bg-secondary rounded-md transition-all text-muted-foreground hover:text-foreground">
                  {menu}
                </button>
                <div className="menu-dropdown-content surface-elevated">
                  {/* Menu items would go here, using menu-dropdown-item class */}
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
          {/* Quick Search */}
          <div className="hidden md:flex items-center bg-secondary/50 border border-border px-3 py-1.5 rounded-lg gap-2 w-64 focus-within:ring-2 focus-within:ring-primary/20 transition-all">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input type="text" placeholder="Search masters or bills..." className="bg-transparent border-none p-0 h-auto text-sm focus:ring-0 w-full" />
            <span className="text-[10px] font-bold text-muted-foreground/60 border border-border px-1.5 py-0.5 rounded flex items-center gap-0.5">
              <Command className="h-2.5 w-2.5" /> K
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button onClick={toggleTheme} className="p-2 hover:bg-secondary rounded-full transition-all text-muted-foreground hover:text-primary">
              {theme === 'light' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
            </button>
            <button className="p-2 hover:bg-secondary rounded-full transition-all text-muted-foreground relative">
              <Bell className="h-5 w-5" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full border-2 border-white dark:border-slate-950"></span>
            </button>
            <div className="h-8 w-px bg-border mx-1"></div>
            <div className="flex items-center gap-3 pl-1">
              <div className="flex flex-col items-end">
                <span className="text-sm font-bold text-foreground leading-none">{selectedCompany?.name || 'Select Company'}</span>
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mt-1">Administrator</span>
              </div>
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/20 to-primary/40 border border-primary/20 flex items-center justify-center text-primary font-bold text-sm">
                A
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* QUICK ACTIONS RIBBON */}
      <section className="h-16 bg-card text-card-foreground border-b border-border flex items-center justify-between px-6 shrink-0 shadow-premium transition-colors duration-200">
        <div className="flex items-center gap-2">
          {[
            { label: 'Sales Bill', icon: ShoppingCart, type: 'billing', key: 'F3' },
            { label: 'Voucher', icon: FileSpreadsheet, type: 'accounting', key: 'F4' },
            { label: 'Stock', icon: Layers, type: 'inventory', key: 'F5' },
            { label: 'Reports', icon: TrendingUp, type: 'reports', key: 'F6' },
          ].map((item) => (
            <button
              key={item.label}
              onClick={() => addTab({ title: item.label, type: item.type })}
              className="flex flex-col items-center justify-center h-12 w-20 hover:bg-secondary rounded-lg transition-all group relative active:scale-95"
            >
              <item.icon className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
              <span className="text-[10px] font-bold text-muted-foreground group-hover:text-foreground mt-1 uppercase tracking-tight">{item.label}</span>
              <span className="absolute top-0 right-1 text-[8px] font-bold text-primary/40 group-hover:text-primary transition-colors">{item.key}</span>
            </button>
          ))}
          <div className="h-10 w-px bg-border mx-4"></div>
          <button className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg shadow-premium hover:shadow-elevated hover:bg-primary/90 transition-all active:scale-95 font-semibold text-sm">
            <Plus className="h-4 w-4" /> New Transaction
          </button>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex flex-col items-end mr-2">
            <span className="erp-label !mb-0 text-primary">Active Workspace</span>
            <div className="relative workspace-dropdown-container">
              <button
                type="button"
                onClick={() => setWorkspaceDropdownOpen(!workspaceDropdownOpen)}
                className="flex items-center gap-1 bg-transparent border-none text-sm font-bold focus:outline-none cursor-pointer h-auto p-0 text-right text-foreground hover:text-primary transition-all duration-200"
              >
                <span>{selectedCompany?.name || 'Select Company'}</span>
                <ChevronDown className={`h-4 w-4 text-muted-foreground/60 transition-transform duration-200 ${workspaceDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {workspaceDropdownOpen && (
                <div className="absolute right-0 top-full mt-2 w-56 bg-card border border-border rounded-lg shadow-elevated z-50 py-1.5 animate-in fade-in slide-in-from-top-2 duration-150">
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
                        className={`w-full text-left px-4 py-2 text-xs font-semibold flex items-center justify-between hover:bg-secondary/60 transition-colors ${
                          isActive ? 'text-primary bg-primary/5 font-bold' : 'text-foreground/80'
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
          <div className="p-2 bg-secondary rounded-lg">
            <FolderOpen className="h-5 w-5 text-primary" />
          </div>
        </div>
      </section>

      {/* MAIN LAYOUT CANVAS */}
      <div className="flex-1 flex overflow-hidden bg-[#F3F4F6] dark:bg-slate-950">

        {/* MICA SIDEBAR */}
        <aside
          className={`bg-sidebar-bg border-r border-sidebar-border text-sidebar-text flex flex-col transition-all duration-300 ${sidebarCollapsed ? 'w-16' : 'w-64'}`}
        >
          <div className="flex-1 overflow-y-auto py-6 space-y-6">
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
          <div className="bg-card/45 backdrop-blur-sm border-b border-border h-12 flex items-end px-6 shrink-0 transition-colors duration-200">
            <div className="flex gap-2 overflow-x-auto h-full items-end scrollbar-none">
              {tabs.map((t) => {
                const isActive = t.id === activeTabId;
                return (
                  <div
                    key={t.id}
                    onClick={() => setActiveTab(t.id)}
                    className={`flex items-center gap-3 px-5 h-10 rounded-t-xl transition-all cursor-pointer text-sm font-medium relative ${isActive
                      ? 'bg-background text-primary shadow-[0_-4px_10px_-5px_rgba(0,0,0,0.1)] z-10 before:content-[""] before:absolute before:bottom-[-1px] before:left-0 before:right-0 before:h-[2px] before:bg-primary'
                      : 'text-foreground/75 hover:text-foreground hover:bg-secondary/40'
                      }`}
                  >
                    <span>{t.title}</span>
                    {t.id !== 'dashboard' && (
                      <button
                        onClick={(e) => { e.stopPropagation(); closeTab(t.id); }}
                        className="p-1 rounded-md hover:bg-muted text-foreground/40 hover:text-destructive transition-colors"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* VIEWPORT CANVAS */}
          <div className="flex-1 overflow-hidden relative p-6">
            {tabs.map((t) => (
              <div
                key={t.id}
                className={`h-full ${t.id === activeTabId ? 'block animate-in fade-in zoom-in-95 duration-300' : 'hidden'}`}
              >
                <div className="h-full surface-premium overflow-hidden">
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
            <span className="font-data text-primary/80 font-bold">{systemTime}</span>
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
