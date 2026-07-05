import React, { useEffect, useState } from 'react';
import Layout from './components/layout/Layout';
import LicensingView from './pages/Licensing/Licensing';
import { useCompanyStore } from './store/useCompanyStore';
import { useThemeStore } from './store/useThemeStore';

export default function App() {
  const [license, setLicense] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const loadCompanies = useCompanyStore((state) => state.loadCompanies);
  const theme = useThemeStore((state) => state.theme);

  useEffect(() => {
    checkLicense();

    const unsubscribe = (window as any).api.onLicenseInvalidated?.(() => {
      setLicense({ activated: false, statusMessage: 'License was revoked or suspended by Administrator.' });
    });

    // Global restrictions for all number inputs
    const handleNumberInputRestrictions = (e: KeyboardEvent) => {
      const target = e.target as HTMLInputElement;
      if (target && target.tagName === 'INPUT' && target.type === 'number') {
        if (['-', '+', 'e', 'E'].includes(e.key)) {
          e.preventDefault();
        }
        if (e.key === 'ArrowDown') {
          const val = parseFloat(target.value);
          if (isNaN(val) || val <= 0) {
            e.preventDefault();
          }
        }
      }
    };

    const handleNumberPaste = (e: ClipboardEvent) => {
      const target = e.target as HTMLInputElement;
      if (target && target.tagName === 'INPUT' && target.type === 'number') {
        const pastedData = e.clipboardData?.getData('text');
        if (pastedData && (pastedData.includes('-') || pastedData.includes('+') || pastedData.toLowerCase().includes('e'))) {
          e.preventDefault();
        }
      }
    };

    document.addEventListener('keydown', handleNumberInputRestrictions);
    document.addEventListener('paste', handleNumberPaste);

    return () => {
      unsubscribe?.();
      document.removeEventListener('keydown', handleNumberInputRestrictions);
      document.removeEventListener('paste', handleNumberPaste);
    };
  }, []);

  const checkLicense = async () => {
    try {
      const status = await (window as any).api.getLicenseStatus();
      setLicense(status);
      
      if (status.activated) {
        // Only load companies if software is licensed
        await loadCompanies();
      }
    } catch (e) {
      console.error('Failed to authenticate license registry:', e);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-slate-900 text-white space-y-4">
        <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm font-mono tracking-widest text-amber-500">AUTHENTICATING SECURE LOCK...</p>
      </div>
    );
  }

  // Force licensing screen if not activated and not in active trial
  if (!license || (!license.activated && !license.isTrialActive)) {
    return (
      <div className="h-screen bg-background text-foreground flex items-center justify-center p-4 select-none transition-colors duration-200">
        <div className="w-full max-w-lg bg-card border border-border rounded-lg overflow-hidden shadow-premium">
          {/* Native Window Title Bar */}
          <div className="bg-secondary/40 text-primary px-4 py-2.5 border-b border-border flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider font-luxury">SYSTEM SECURE LOCK - LICENSE REQUIRED</span>
            <span className="text-[9px] text-muted-foreground font-data">v1.0.0-PRO</span>
          </div>
          <div className="p-4 bg-card text-card-foreground">
            <LicensingView />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`h-screen overflow-hidden ${theme}`}>
      <Layout />
    </div>
  );
}
