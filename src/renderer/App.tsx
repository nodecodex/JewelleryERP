import React, { useEffect, useState } from 'react';
import Layout from './components/layout/Layout';
import LicensingView from './pages/Licensing/Licensing';
import { useCompanyStore } from './store/useCompanyStore';
import { useThemeStore } from './store/useThemeStore';
import { APP_VERSION } from './version';

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
      
      const isAllowed = status.activated || status.isTrialActive || (status.isTrial && (status.trialDaysRemaining ?? 0) > 0);
      if (isAllowed) {
        // Only load companies if software is licensed or has active trial
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
      <div className="flex flex-col items-center justify-center h-screen bg-black text-white space-y-4">
        <div className="w-10 h-10 border-2 border-[#FFC000] border-t-transparent animate-spin rounded-none"></div>
        <p className="text-xs font-mono font-bold tracking-widest text-[#FFC000] uppercase">AUTHENTICATING SECURE LOCK...</p>
      </div>
    );
  }

  const isUnlocked = license && (license.activated || license.isTrialActive || (license.isTrial && (license.trialDaysRemaining ?? 0) > 0));

  // Force licensing screen if not activated and not in active trial
  if (!isUnlocked) {
    return (
      <div className="h-screen w-screen bg-black flex items-center justify-center p-4 select-none relative overflow-hidden dark">
        <div className="w-full max-w-xl bg-[#181818] border border-[#2c2c2c] rounded-none overflow-hidden relative z-10 flex flex-col">
          {/* Native Window Title Bar */}
          <div className="bg-[#121212] px-6 py-3.5 border-b border-[#262626] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-2.5 h-2.5 rounded-none bg-rose-500"></div>
              <span className="text-xs font-bold uppercase tracking-widest text-white font-mono">SYSTEM SECURE VAULT LOCK</span>
            </div>
            <span className="text-[10px] text-black font-mono tracking-wider font-extrabold bg-[#FFC000] px-2.5 py-1 rounded-none uppercase">v{APP_VERSION}-LUXURY</span>
          </div>
          <div className="p-6 sm:p-8 text-white bg-[#181818]">
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
