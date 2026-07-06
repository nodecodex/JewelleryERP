import React, { useEffect, useState } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  Key,
  Copy,
  Check,
  RefreshCw,
  HelpCircle,
  Phone,
  Mail,
  Laptop,
  Clock
} from 'lucide-react';

export default function LicensingView() {
  const [licenseStatus, setLicenseStatus] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'activate' | 'trial' | 'recover' | 'transfer' | 'support'>('activate');
  const [copied, setCopied] = useState(false);
  const [msg, setMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Form Fields
  const [keyInput, setKeyInput] = useState('');
  const [recoveryKey, setRecoveryKey] = useState('');
  const [recoveryMobile, setRecoveryMobile] = useState('');
  const [transferKey, setTransferKey] = useState('');
  const [transferReason, setTransferReason] = useState('');

  useEffect(() => {
    loadLicense();
  }, []);

  const loadLicense = async () => {
    try {
      const status = await (window as any).api.getLicenseStatus();
      setLicenseStatus(status);

      // Auto redirect tabs based on state
      if (status.isTrialActive) {
        setActiveTab('activate');
      } else if (!status.activated && status.expiryDate) {
        // Trial expired
        setActiveTab('activate');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleCopyDeviceId = () => {
    if (!licenseStatus) return;
    navigator.clipboard.writeText(licenseStatus.deviceId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const clearMessages = () => {
    setMsg('');
    setErrorMsg('');
  };

  // 1. Start Free Trial
  const handleStartTrial = async () => {
    setIsLoading(true);
    clearMessages();
    try {
      const status = await (window as any).api.startTrial();
      setLicenseStatus(status);
      if (status.isTrialActive) {
        setMsg(status.statusMessage);
        setTimeout(() => window.location.reload(), 1500);
      } else {
        setErrorMsg(status.statusMessage);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Trial activation failed.');
    } finally {
      setIsLoading(false);
    }
  };

  // 2. Activate Key
  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyInput.trim()) return;
    setIsLoading(true);
    clearMessages();
    try {
      const status = await (window as any).api.activateLicense(keyInput.trim());
      setLicenseStatus(status);
      if (status.activated) {
        setMsg(status.statusMessage);
        setKeyInput('');
        setTimeout(() => window.location.reload(), 1500);
      } else {
        setErrorMsg(status.statusMessage);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Activation failed.');
    } finally {
      setIsLoading(false);
    }
  };

  // 3. Recover License
  const handleRecover = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recoveryKey.trim() && !recoveryMobile.trim()) {
      setErrorMsg('Please enter either your License Key or Registered Mobile Number.');
      return;
    }
    setIsLoading(true);
    clearMessages();
    try {
      const status = await (window as any).api.recoverLicense(
        recoveryKey.trim() || undefined,
        recoveryMobile.trim() || undefined
      );
      setLicenseStatus(status);
      if (status.activated) {
        setMsg(status.statusMessage);
        setRecoveryKey('');
        setRecoveryMobile('');
        setTimeout(() => window.location.reload(), 1500);
      } else {
        setErrorMsg(status.statusMessage);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Recovery failed.');
    } finally {
      setIsLoading(false);
    }
  };

  // 4. Request Transfer
  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferKey.trim() || !transferReason.trim()) return;
    setIsLoading(true);
    clearMessages();
    try {
      const status = await (window as any).api.requestTransfer(transferKey.trim(), transferReason.trim());
      setMsg(status.statusMessage);
      setTransferKey('');
      setTransferReason('');
    } catch (err: any) {
      setErrorMsg(err.message || 'Transfer request failed.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!licenseStatus) {
    return (
      <div className="flex flex-col items-center justify-center p-8 space-y-2 animate-pulse text-slate-500">
        <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs font-mono font-bold uppercase tracking-wider text-amber-600">Retrieving Hardware Signature...</p>
      </div>
    );
  }

  const showActiveState = licenseStatus.activated || licenseStatus.isTrialActive;

  return (
    <div className="space-y-6 font-sans select-text text-slate-300">

      {/* Alert banner */}
      <div className={`p-4 rounded-xl border flex items-start gap-3.5 backdrop-blur-md transition-all duration-300 ${licenseStatus.activated
          ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
          : licenseStatus.isTrialActive
            ? 'bg-amber-500/10 border-amber-500/20 text-amber-400'
            : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
        }`}>
        {licenseStatus.activated ? (
          <ShieldCheck className="h-5 w-5 shrink-0 mt-0.5 drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
        ) : licenseStatus.isTrialActive ? (
          <Clock className="h-5 w-5 shrink-0 mt-0.5 animate-pulse drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
        ) : (
          <ShieldAlert className="h-5 w-5 shrink-0 mt-0.5 drop-shadow-[0_0_8px_rgba(244,63,94,0.5)] animate-pulse" />
        )}
        <div className="text-xs space-y-1 w-full">
          <p className="font-extrabold uppercase tracking-widest font-luxury text-[11px] text-slate-100">
            {licenseStatus.activated ? 'Premium Lifetime Active' : licenseStatus.isTrialActive ? 'Active Trial Period' : 'System Secure Lock'}
          </p>
          <p className="font-medium text-slate-300">{licenseStatus.statusMessage}</p>
          {licenseStatus.expiryDate && (
            <p className="font-medium font-data text-[10px] text-slate-400">
              Expiration: {new Date(licenseStatus.expiryDate).toLocaleString()}
            </p>
          )}
        </div>
      </div>

      {/* Main Container */}
      <div className="space-y-5">

        {/* Device ID Display */}
        <div className="space-y-1.5 bg-slate-800/40 p-4 rounded-xl border border-slate-700/50 shadow-inner">
          <label className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Computer Hardware Fingerprint</label>
          <div className="flex gap-2">
            <input
              type="text"
              readOnly
              className="w-full bg-slate-900/80 border border-slate-700/80 text-xs font-mono font-medium text-slate-300 px-3 py-2 rounded-lg select-all outline-none focus:ring-1 focus:ring-amber-500/50 transition-all"
              value={licenseStatus.deviceId}
            />
            <button
              onClick={handleCopyDeviceId}
              className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white text-[10px] font-bold rounded-lg flex items-center gap-1.5 uppercase shrink-0 transition-all shadow-md"
              title="Copy Fingerprint ID"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-400 drop-shadow-[0_0_5px_rgba(52,211,153,0.8)]" />
                  <span className="text-emerald-400">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="flex p-1 bg-slate-800/60 rounded-lg border border-slate-700/50 overflow-x-auto shadow-inner">
          {[
            { id: 'activate', label: 'Activate' },
            { id: 'trial', label: 'Trial Mode' },
            { id: 'recover', label: 'Recover' },
            { id: 'support', label: 'Support' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id as any); clearMessages(); }}
              className={`flex-1 px-3 py-2 text-[10px] font-bold uppercase tracking-wider rounded-md transition-all duration-300 whitespace-nowrap ${activeTab === tab.id
                  ? 'bg-amber-500 text-slate-950 shadow-[0_0_12px_rgba(245,158,11,0.4)]'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
                }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Loading Spinner overlay */}
        {isLoading && (
          <div className="flex items-center justify-center py-6 text-slate-400 space-x-2">
            <RefreshCw className="h-4 w-4 animate-spin text-amber-505" />
            <span className="text-xs font-mono font-bold uppercase">Processing...</span>
          </div>
        )}

        {/* Form Body Views */}
        {!isLoading && (
          <div className="text-xs space-y-4">

            {/* 1. ACTIVATE TAB */}
            {activeTab === 'activate' && (
              <form onSubmit={handleActivate} className="space-y-4">
                <p className="text-slate-400 leading-relaxed text-[11px]">
                  If you have purchased a premium license, enter the license key signature to register your workstation.
                </p>
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-300 text-xs tracking-wide">License Key Signature</label>
                  <div className="flex items-center bg-slate-900/80 border border-slate-700/80 rounded-lg px-3 py-2.5 focus-within:border-amber-500/50 focus-within:ring-1 focus-within:ring-amber-500/50 transition-all shadow-inner">
                    <Key className="h-4 w-4 text-slate-500 shrink-0 mr-2" />
                    <input
                      type="text"
                      required
                      placeholder="Paste your JERP-XXXX-... key here..."
                      className="w-full text-xs font-mono outline-none font-medium text-slate-200 bg-transparent placeholder-slate-600"
                      value={keyInput}
                      onChange={e => setKeyInput(e.target.value)}
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={licenseStatus.activated}
                  className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 disabled:from-slate-700 disabled:to-slate-800 disabled:text-slate-500 text-slate-950 font-extrabold uppercase tracking-wider rounded-lg shadow-[0_4px_14px_0_rgba(245,158,11,0.39)] disabled:shadow-none transition-all transform hover:-translate-y-0.5 active:translate-y-0"
                >
                  {licenseStatus.activated ? 'License Already Verified' : 'Activate Commercial License'}
                </button>
              </form>
            )}

            {/* 2. TRIAL TAB */}
            {activeTab === 'trial' && (
              <div className="space-y-4">
                <p className="text-slate-400 leading-relaxed text-[11px]">
                  Start a free trial to evaluate features offline for 3 days. After expiration, licensing is mandatory.
                </p>

                {licenseStatus.isTrialActive ? (
                  <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl text-center space-y-2 shadow-inner">
                    <Clock className="h-8 w-8 text-amber-500 mx-auto animate-pulse drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
                    <p className="font-bold text-amber-400 text-sm tracking-wide">Your trial is active!</p>
                    <p className="text-slate-400 font-medium text-[10px] tracking-wider uppercase">Expires on: {new Date(licenseStatus.expiryDate).toLocaleDateString()}</p>
                  </div>
                ) : (
                  <button
                    onClick={handleStartTrial}
                    disabled={licenseStatus.activated}
                    className="w-full py-2.5 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:text-slate-600 text-white font-extrabold uppercase tracking-wider rounded-lg shadow-md border border-slate-600 transition-all transform hover:-translate-y-0.5 active:translate-y-0"
                  >
                    Start 3-Day Free Trial
                  </button>
                )}
              </div>
            )}

            {/* 3. RECOVER TAB */}
            {activeTab === 'recover' && (
              <form onSubmit={handleRecover} className="space-y-4">
                <p className="text-slate-400 leading-relaxed text-[11px]">
                  Formatted your computer or reinstalled Windows? Restore your active license by matching physical hardware components.
                </p>
                <div className="space-y-3 bg-slate-800/40 p-4 rounded-xl border border-slate-700/50 shadow-inner">
                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-300 text-xs tracking-wide">Enter Original License Key</label>
                    <input
                      type="text"
                      placeholder="JERP-XXXX-XXXX-XXXX-XXXX"
                      className="w-full bg-slate-900/80 border border-slate-700/80 px-3 py-2 font-mono text-xs text-slate-200 outline-none rounded-lg focus:ring-1 focus:ring-amber-500/50 transition-all placeholder-slate-600"
                      value={recoveryKey}
                      onChange={e => setRecoveryKey(e.target.value)}
                    />
                  </div>
                  <div className="relative flex py-2 items-center">
                    <div className="flex-grow border-t border-slate-700/80"></div>
                    <span className="flex-shrink mx-3 text-[9px] text-slate-500 font-bold uppercase tracking-widest">Or Registered Contact</span>
                    <div className="flex-grow border-t border-slate-700/80"></div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-300 text-xs tracking-wide">Registered Mobile Number</label>
                    <input
                      type="text"
                      placeholder="+91 98765 43210"
                      className="w-full bg-slate-900/80 border border-slate-700/80 px-3 py-2 text-xs text-slate-200 outline-none rounded-lg font-semibold focus:ring-1 focus:ring-amber-500/50 transition-all placeholder-slate-600"
                      value={recoveryMobile}
                      onChange={e => setRecoveryMobile(e.target.value)}
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  className="w-full py-2.5 bg-gradient-to-r from-slate-700 to-slate-800 hover:from-slate-600 hover:to-slate-700 text-white font-extrabold uppercase tracking-wider rounded-lg shadow-md border border-slate-600 transition-all transform hover:-translate-y-0.5 active:translate-y-0"
                >
                  Verify Identity & Restore License
                </button>
              </form>
            )}

            {/* 4. TRANSFER TAB */}
            {activeTab === 'transfer' && (
              <form onSubmit={handleTransfer} className="space-y-3">
                <p className="text-slate-500 italic leading-relaxed text-[11px]">
                  Bought a new computer? Request a license transfer. Requests are capped at 2 resets per year and require Admin review.
                </p>
                <div className="space-y-2">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-600">Active License Key</label>
                    <input
                      type="text"
                      required
                      placeholder="JERP-XXXX-XXXX-XXXX-XXXX"
                      className="w-full border border-slate-250 px-2.5 py-1.5 font-mono text-xs outline-none rounded"
                      value={transferKey}
                      onChange={e => setTransferKey(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-slate-600">Reason for Hardware Change</label>
                    <textarea
                      required
                      rows={2}
                      placeholder="Explain why motherboard/CPU serials changed (e.g. computer upgrade)..."
                      className="w-full border border-slate-250 px-2.5 py-1.5 text-xs outline-none rounded resize-none"
                      value={transferReason}
                      onChange={e => setTransferReason(e.target.value)}
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  className="w-full py-2 bg-slate-850 hover:bg-slate-750 text-white font-extrabold uppercase rounded shadow-sm border border-slate-900 transition-all"
                >
                  Submit Device Transfer Request
                </button>
              </form>
            )}

            {/* 5. SUPPORT TAB */}
            {activeTab === 'support' && (
              <div className="space-y-4">
                <p className="text-slate-400 leading-relaxed text-[11px]">
                  Encountered an issue or blocked by hardware limits? Get in touch with our enterprise licensing desk.
                </p>

                <div className="divide-y divide-slate-700/50 bg-slate-800/40 p-3 rounded-xl border border-slate-700/50 text-[11px] shadow-inner">
                  <div className="py-2.5 flex items-center space-x-3 px-2 hover:bg-slate-700/30 transition-colors rounded-t-lg">
                    <div className="bg-amber-500/20 p-1.5 rounded-md">
                      <Phone className="h-4 w-4 text-amber-500 shrink-0" />
                    </div>
                    <span className="text-slate-400">Support Phone: <strong className="text-slate-200 text-xs tracking-wide ml-1">+91 99000-88776</strong></span>
                  </div>
                  <div className="py-2.5 flex items-center space-x-3 px-2 hover:bg-slate-700/30 transition-colors">
                    <div className="bg-blue-500/20 p-1.5 rounded-md">
                      <Mail className="h-4 w-4 text-blue-400 shrink-0" />
                    </div>
                    <span className="text-slate-400">Support Email: <strong className="text-slate-200 tracking-wide ml-1">licensing@jewelleryerp.com</strong></span>
                  </div>
                  <div className="py-2.5 flex items-center space-x-3 px-2 hover:bg-slate-700/30 transition-colors rounded-b-lg">
                    <div className="bg-emerald-500/20 p-1.5 rounded-md">
                      <Laptop className="h-4 w-4 text-emerald-400 shrink-0" />
                    </div>
                    <span className="text-slate-400">Verification Server: <strong className="text-emerald-400/90 font-mono tracking-wide ml-1">http://localhost:3003</strong></span>
                  </div>
                </div>
              </div>
            )}

          </div>
        )}

        {/* Message alerts */}
        {msg && (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-center text-xs font-bold rounded-lg text-emerald-400 uppercase tracking-widest shadow-[0_0_15px_rgba(16,185,129,0.15)] animate-in fade-in zoom-in-95 duration-300">
            {msg}
          </div>
        )}

        {errorMsg && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-center text-xs font-bold rounded-lg text-rose-400 uppercase tracking-widest shadow-[0_0_15px_rgba(244,63,94,0.15)] animate-in fade-in zoom-in-95 duration-300">
            {errorMsg}
          </div>
        )}

      </div>
    </div>
  );
}
