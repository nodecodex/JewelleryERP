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

      const isTrialValid = status.isTrialActive || (status.isTrial && (status.trialDaysRemaining ?? 0) > 0);

      // Auto redirect tabs based on state
      if (isTrialValid) {
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
      const isTrialValid = status.isTrialActive || (status.isTrial && (status.trialDaysRemaining ?? 0) > 0);
      if (isTrialValid) {
        setMsg(status.statusMessage);
        setTimeout(() => window.location.reload(), 1000);
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

  const isTrialValid = licenseStatus?.isTrialActive || (licenseStatus?.isTrial && (licenseStatus?.trialDaysRemaining ?? 0) > 0);

  return (
    <div className="space-y-6 font-sans select-text text-zinc-300">

      {/* Alert banner */}
      <div className={`p-4 rounded-none border flex items-start gap-3.5 transition-all duration-200 ${licenseStatus.activated
        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
        : isTrialValid
          ? 'bg-[#FFC000]/10 border-[#FFC000]/30 text-[#FFC000]'
          : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
        }`}>
        {licenseStatus.activated ? (
          <ShieldCheck className="h-5 w-5 shrink-0 mt-0.5 text-emerald-400" />
        ) : isTrialValid ? (
          <Clock className="h-5 w-5 shrink-0 mt-0.5 text-[#FFC000]" />
        ) : (
          <ShieldAlert className="h-5 w-5 shrink-0 mt-0.5 text-rose-400" />
        )}
        <div className="text-xs space-y-1 w-full">
          <p className="font-black uppercase tracking-widest text-[11px] text-white">
            {licenseStatus.activated ? 'Premium Lifetime Active' : isTrialValid ? 'Active Trial Period' : 'System Secure Vault Locked'}
          </p>
          <p className="font-medium text-zinc-300">{licenseStatus.statusMessage}</p>
          {licenseStatus.expiryDate && (
            <p className="font-mono text-[10px] text-[#7D7D7D] uppercase">
              Expiration: {new Date(licenseStatus.expiryDate).toLocaleString()}
            </p>
          )}
        </div>
      </div>

      {/* Main Container */}
      <div className="space-y-5">

        {/* Device ID Display */}
        <div className="space-y-1.5 bg-[#121212] p-4 rounded-none border border-[#262626]">
          <label className="text-[10px] uppercase font-bold text-[#7D7D7D] block tracking-wider">Computer Hardware Fingerprint</label>
          <div className="flex gap-2">
            <input
              type="text"
              readOnly
              className="w-full bg-black border border-[#2c2c2c] text-xs font-mono font-bold text-[#FFC000] px-3 py-2 rounded-none select-all outline-none focus:border-[#FFC000]"
              value={licenseStatus.deviceId}
            />
            <button
              onClick={handleCopyDeviceId}
              className="px-4 py-2 bg-transparent hover:bg-white/10 text-white text-[10px] font-bold rounded-none flex items-center gap-1.5 uppercase shrink-0 transition-all border border-white/50 cursor-pointer"
              title="Copy Fingerprint ID"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-400" />
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
        <div className="flex p-1 bg-[#121212] rounded-none border border-[#262626] overflow-x-auto">
          {[
            { id: 'activate', label: 'Activate' },
            { id: 'trial', label: 'Trial Mode' },
            { id: 'recover', label: 'Recover' },
            { id: 'support', label: 'Support' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id as any); clearMessages(); }}
              className={`flex-1 px-3 py-2 text-[10px] font-bold uppercase tracking-wider rounded-none transition-all whitespace-nowrap cursor-pointer ${activeTab === tab.id
                ? 'bg-[#FFC000] text-black font-extrabold'
                : 'text-[#7D7D7D] hover:text-white hover:bg-[#181818]'
                }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Loading Spinner overlay */}
        {isLoading && (
          <div className="flex items-center justify-center py-6 text-zinc-400 space-x-2">
            <RefreshCw className="h-4 w-4 animate-spin text-[#FFC000]" />
            <span className="text-xs font-mono font-bold uppercase">Processing...</span>
          </div>
        )}

        {/* Form Body Views */}
        {!isLoading && (
          <div className="text-xs space-y-4">

            {/* 1. ACTIVATE TAB */}
            {activeTab === 'activate' && (
              <form onSubmit={handleActivate} className="space-y-4">
                <p className="text-[#7D7D7D] leading-relaxed text-[11px] uppercase tracking-wide">
                  Enter your licensed activation signature to unlock your enterprise workstation.
                </p>
                <div className="space-y-1.5">
                  <label className="font-bold text-[#7D7D7D] text-xs uppercase tracking-wider">License Key Signature</label>
                  <div className="flex items-center bg-black border border-[#2c2c2c] rounded-none px-3 py-2.5 focus-within:border-[#FFC000] transition-all">
                    <Key className="h-4 w-4 text-[#7D7D7D] shrink-0 mr-2" />
                    <input
                      type="text"
                      required
                      placeholder="SPERP-XXXX-XXXX-XXXX-XXXX"
                      className="w-full text-xs font-mono outline-none font-bold text-white bg-transparent placeholder-[#7D7D7D]"
                      value={keyInput}
                      onChange={e => setKeyInput(e.target.value)}
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={licenseStatus.activated}
                  className="w-full py-2.5 bg-[#FFC000] hover:bg-[#917300] disabled:bg-[#202020] disabled:text-[#7D7D7D] text-black font-extrabold uppercase tracking-wider rounded-none border-none transition-colors cursor-pointer"
                >
                  {licenseStatus.activated ? 'License Already Verified' : 'Activate Commercial License'}
                </button>
              </form>
            )}

            {/* 2. TRIAL TAB */}
            {activeTab === 'trial' && (
              <div className="space-y-4">
                <p className="text-[#7D7D7D] leading-relaxed text-[11px] uppercase tracking-wide">
                  Start an offline evaluation trial for 7 days. After expiration, commercial registration is required.
                </p>

                {isTrialValid ? (
                  <div className="p-4 bg-[#121212] border border-[#FFC000]/40 rounded-none text-center space-y-3">
                    <Clock className="h-8 w-8 text-[#FFC000] mx-auto" />
                    <p className="font-extrabold text-[#FFC000] text-sm uppercase tracking-wider">Your trial is active!</p>
                    <p className="text-[#7D7D7D] font-mono text-[10px] tracking-wider uppercase">Expires on: {new Date(licenseStatus.expiryDate).toLocaleDateString()}</p>
                    <button
                      type="button"
                      onClick={() => window.location.reload()}
                      className="mt-2 w-full py-2.5 bg-[#FFC000] hover:bg-[#917300] text-black font-extrabold uppercase tracking-wider rounded-none transition-colors cursor-pointer flex items-center justify-center gap-2"
                    >
                      <span>Enter ERP Workspace</span>
                      <span>→</span>
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={handleStartTrial}
                    disabled={licenseStatus.activated}
                    className="w-full py-2.5 bg-transparent border border-white/50 hover:bg-[#1EAEDB]/70 hover:border-transparent disabled:bg-[#181818] disabled:border-[#262626] disabled:text-[#7D7D7D] text-white font-extrabold uppercase tracking-wider rounded-none transition-colors cursor-pointer"
                  >
                    Start Free Trial
                  </button>
                )}
              </div>
            )}

            {/* 3. RECOVER TAB */}
            {activeTab === 'recover' && (
              <form onSubmit={handleRecover} className="space-y-4">
                <p className="text-[#7D7D7D] leading-relaxed text-[11px] uppercase tracking-wide">
                  Reinstalled Windows or formatted your drive? Restore your active license by verifying your identity.
                </p>
                <div className="space-y-3 bg-[#121212] p-4 rounded-none border border-[#262626]">
                  <div className="space-y-1.5">
                    <label className="font-bold text-[#7D7D7D] text-xs uppercase tracking-wider">Enter Original License Key</label>
                    <input
                      type="text"
                      placeholder="SPERP-XXXX-XXXX-XXXX-XXXX"
                      className="w-full bg-black border border-[#2c2c2c] px-3 py-2 font-mono text-xs text-white outline-none rounded-none focus:border-[#FFC000] placeholder-[#7D7D7D]"
                      value={recoveryKey}
                      onChange={e => setRecoveryKey(e.target.value)}
                    />
                  </div>
                  <div className="relative flex py-2 items-center">
                    <div className="flex-grow border-t border-[#262626]"></div>
                    <span className="flex-shrink mx-3 text-[9px] text-[#7D7D7D] font-bold uppercase tracking-widest">Or Registered Contact</span>
                    <div className="flex-grow border-t border-[#262626]"></div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="font-bold text-[#7D7D7D] text-xs uppercase tracking-wider">Registered Mobile Number</label>
                    <input
                      type="text"
                      placeholder="+91 98765 43210"
                      className="w-full bg-black border border-[#2c2c2c] px-3 py-2 text-xs text-white outline-none rounded-none font-semibold focus:border-[#FFC000] placeholder-[#7D7D7D]"
                      value={recoveryMobile}
                      onChange={e => setRecoveryMobile(e.target.value)}
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  className="w-full py-2.5 bg-transparent border border-white/50 hover:bg-[#1EAEDB]/70 hover:border-transparent text-white font-extrabold uppercase tracking-wider rounded-none transition-colors cursor-pointer"
                >
                  Verify Identity & Restore License
                </button>
              </form>
            )}

            {/* 4. TRANSFER TAB */}
            {activeTab === 'transfer' && (
              <form onSubmit={handleTransfer} className="space-y-3">
                <p className="text-[#7D7D7D] leading-relaxed text-[11px] uppercase tracking-wide">
                  License transfers require Admin verification and are limited to 2 hardware replacements per year.
                </p>
                <div className="space-y-2 bg-[#121212] p-4 rounded-none border border-[#262626]">
                  <div className="space-y-1">
                    <label className="font-bold text-[#7D7D7D] text-xs uppercase tracking-wider">Active License Key</label>
                    <input
                      type="text"
                      required
                      placeholder="SPERP-XXXX-XXXX-XXXX-XXXX"
                      className="w-full bg-black border border-[#2c2c2c] px-2.5 py-1.5 font-mono text-xs text-white outline-none rounded-none focus:border-[#FFC000]"
                      value={transferKey}
                      onChange={e => setTransferKey(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-[#7D7D7D] text-xs uppercase tracking-wider">Reason for Hardware Change</label>
                    <textarea
                      required
                      rows={2}
                      placeholder="Explain why motherboard/CPU serials changed..."
                      className="w-full bg-black border border-[#2c2c2c] px-2.5 py-1.5 text-xs text-white outline-none rounded-none resize-none focus:border-[#FFC000]"
                      value={transferReason}
                      onChange={e => setTransferReason(e.target.value)}
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  className="w-full py-2 bg-transparent border border-white/50 hover:bg-[#1EAEDB]/70 hover:border-transparent text-white font-extrabold uppercase tracking-wider rounded-none transition-colors cursor-pointer"
                >
                  Submit Device Transfer Request
                </button>
              </form>
            )}

            {/* 5. SUPPORT TAB */}
            {activeTab === 'support' && (
              <div className="space-y-4">
                <p className="text-[#7D7D7D] leading-relaxed text-[11px] uppercase tracking-wide">
                  Encountered an issue or blocked by hardware limits? Contact enterprise licensing desk.
                </p>

                <div className="divide-y divide-[#262626] bg-[#121212] p-3 rounded-none border border-[#262626] text-[11px]">
                  <div className="py-2.5 flex items-center space-x-3 px-2">
                    <div className="bg-[#FFC000]/10 p-1.5 rounded-none">
                      <Phone className="h-4 w-4 text-[#FFC000] shrink-0" />
                    </div>
                    <span className="text-[#7D7D7D] uppercase tracking-wider">Support Phone: <strong className="text-white text-xs ml-1 font-mono">+91 99000-88776</strong></span>
                  </div>
                  <div className="py-2.5 flex items-center space-x-3 px-2">
                    <div className="bg-[#29ABE2]/10 p-1.5 rounded-none">
                      <Mail className="h-4 w-4 text-[#29ABE2] shrink-0" />
                    </div>
                    <span className="text-[#7D7D7D] uppercase tracking-wider">Support Email: <strong className="text-white ml-1 font-mono">licensing@SwarnProERP.com</strong></span>
                  </div>
                  <div className="py-2.5 flex items-center space-x-3 px-2">
                    <div className="bg-emerald-500/10 p-1.5 rounded-none">
                      <Laptop className="h-4 w-4 text-emerald-400 shrink-0" />
                    </div>
                    <span className="text-[#7D7D7D] uppercase tracking-wider">Server: <strong className="text-emerald-400 font-mono ml-1">jewellery-erp-pi.vercel.app</strong></span>
                  </div>
                </div>
              </div>
            )}

          </div>
        )}

        {/* Message alerts */}
        {msg && (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-center text-xs font-bold rounded-none text-emerald-400 uppercase tracking-widest">
            {msg}
          </div>
        )}

        {errorMsg && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-center text-xs font-bold rounded-none text-rose-400 uppercase tracking-widest">
            {errorMsg}
          </div>
        )}

      </div>
    </div>
  );
}
