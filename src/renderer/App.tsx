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
      <div className="h-screen w-screen bg-slate-950 flex items-center justify-center p-4 select-none relative overflow-hidden dark">
        {/* Background Decorative Elements */}
        <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-amber-500/20 rounded-full blur-[120px] mix-blend-screen pointer-events-none animate-pulse duration-1000"></div>
        <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-[150px] mix-blend-screen pointer-events-none"></div>
        
        <div className="w-full max-w-xl bg-slate-900/65 backdrop-blur-xl border border-slate-700/50 rounded-2xl overflow-hidden shadow-2xl relative z-10 flex flex-col ring-1 ring-white/5">
          {/* Native Window Title Bar */}
          <div className="bg-slate-900/80 px-6 py-4 border-b border-slate-700/50 flex items-center justify-between backdrop-blur-md">
            <div className="flex items-center gap-3">
              <div className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.8)] animate-pulse"></div>
              <span className="text-xs font-bold uppercase tracking-widest text-slate-300 font-luxury">SYSTEM SECURE LOCK</span>
            </div>
            <span className="text-[10px] text-amber-500/90 font-data tracking-wider font-semibold bg-amber-500/10 px-2.5 py-1 rounded-md border border-amber-500/20">v1.0.0-PRO</span>
          </div>
          <div className="p-6 sm:p-8 text-slate-200">
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
