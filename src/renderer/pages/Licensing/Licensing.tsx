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
    <div className="space-y-4 font-sans select-text text-slate-700">

      {/* Alert banner */}
      <div className={`p-3.5 rounded border flex items-start gap-3 ${licenseStatus.activated
          ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
          : licenseStatus.isTrialActive
            ? 'bg-amber-50 border-amber-200 text-amber-800'
            : 'bg-rose-50 border-rose-250 text-rose-800'
        }`}>
        {licenseStatus.activated ? (
          <ShieldCheck className="h-5 w-5 text-emerald-650 shrink-0 mt-0.5" />
        ) : licenseStatus.isTrialActive ? (
          <Clock className="h-5 w-5 text-amber-600 shrink-0 mt-0.5 animate-pulse" />
        ) : (
          <ShieldAlert className="h-5 w-5 text-rose-650 shrink-0 mt-0.5" />
        )}
        <div className="text-xs space-y-0.5">
          <p className="font-extrabold uppercase tracking-wider font-luxury text-[10px] text-slate-800">
            {licenseStatus.activated ? 'Premium Lifetime Active' : licenseStatus.isTrialActive ? 'Active Trial Period' : 'System Secure Lock'}
          </p>
          <p className="font-semibold text-slate-700">{licenseStatus.statusMessage}</p>
          {licenseStatus.expiryDate && (
            <p className="font-semibold font-data text-[10px] text-slate-500">
              Expiration: {new Date(licenseStatus.expiryDate).toLocaleString()}
            </p>
          )}
        </div>
      </div>

      {/* Main card containing forms */}
      <div className="bg-white border border-slate-200 rounded p-4 space-y-4 shadow-sm">

        {/* Device ID Display */}
        <div className="space-y-1 bg-slate-50 p-2.5 rounded border border-slate-150">
          <label className="text-[10px] uppercase font-bold text-slate-500 block">Computer Hardware Fingerprint</label>
          <div className="flex gap-2">
            <input
              type="text"
              readOnly
              className="w-full bg-white border border-slate-200 text-[11px] font-mono font-bold text-slate-650 px-2 py-1 select-all outline-none"
              value={licenseStatus.deviceId}
            />
            <button
              onClick={handleCopyDeviceId}
              className="px-2.5 py-1 bg-slate-850 hover:bg-slate-750 text-white text-[10px] font-bold rounded flex items-center gap-1 uppercase shrink-0 transition-all"
              title="Copy Fingerprint ID"
            >
              {copied ? (
                <>
                  <Check className="h-3 w-3 text-emerald-450" />
                  <span>Copied</span>
                </>
              ) : (
                <>
                  <Copy className="h-3 w-3" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="flex border-b border-slate-200 text-[11px] font-bold uppercase shrink-0 overflow-x-auto">
          {[
            { id: 'activate', label: 'Activate Key' },
            { id: 'trial', label: 'Trial Mode' },
            { id: 'recover', label: 'Recover' },
            // { id: 'transfer', label: 'Transfer' },
            { id: 'support', label: 'Support' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id as any); clearMessages(); }}
              className={`px-3 py-1.5 border-b-2 whitespace-nowrap ${activeTab === tab.id
                  ? 'border-amber-500 text-amber-600 font-extrabold'
                  : 'border-transparent text-slate-400 hover:text-slate-650'
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
              <form onSubmit={handleActivate} className="space-y-3">
                <p className="text-slate-500 italic leading-relaxed text-[11px]">
                  If you have purchased a premium license, enter the license key signature to register your workstation.
                </p>
                <div className="space-y-1">
                  <label className="font-bold text-slate-600">License Key Signature</label>
                  <div className="flex items-center border border-slate-250 rounded px-2.5 py-1.5 focus-within:border-amber-500">
                    <Key className="h-4 w-4 text-slate-400 shrink-0 mr-1.5" />
                    <input
                      type="text"
                      required
                      placeholder="Paste your JERP-XXXX-... key or activation token here..."
                      className="w-full text-xs font-mono outline-none font-bold text-slate-700 bg-transparent"
                      value={keyInput}
                      onChange={e => setKeyInput(e.target.value)}
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={licenseStatus.activated}
                  className="w-full py-2 bg-amber-500 hover:bg-amber-600 disabled:bg-slate-200 disabled:text-slate-400 text-white font-extrabold uppercase rounded shadow-sm text-center border border-amber-650 transition-all"
                >
                  {licenseStatus.activated ? 'License Already Verified' : 'Activate Commercial License'}
                </button>
              </form>
            )}

            {/* 2. TRIAL TAB */}
            {activeTab === 'trial' && (
              <div className="space-y-4">
                <p className="text-slate-500 italic leading-relaxed text-[11px]">
                  Start a free trial to evaluate features offline for 3 days. After expiration, licensing is mandatory.
                </p>

                {licenseStatus.isTrialActive ? (
                  <div className="p-3 bg-amber-50/50 border border-amber-100 rounded text-center space-y-1">
                    <Clock className="h-6 w-6 text-amber-550 mx-auto animate-pulse" />
                    <p className="font-bold text-amber-800">Your trial is active!</p>
                    <p className="text-slate-500 font-semibold text-[10px]">Expires on: {new Date(licenseStatus.expiryDate).toLocaleDateString()}</p>
                  </div>
                ) : (
                  <button
                    onClick={handleStartTrial}
                    disabled={licenseStatus.activated}
                    className="w-full py-2 bg-slate-850 hover:bg-slate-750 text-white font-extrabold uppercase rounded shadow-sm border border-slate-900 transition-all"
                  >
                    Start 3-Day Free Trial
                  </button>
                )}
              </div>
            )}

            {/* 3. RECOVER TAB */}
            {activeTab === 'recover' && (
              <form onSubmit={handleRecover} className="space-y-3">
                <p className="text-slate-500 italic leading-relaxed text-[11px]">
                  Formatted your computer or reinstalled Windows? Restore your active license by matching physical hardware components.
                </p>
                <div className="space-y-3 bg-slate-50 p-3 rounded border border-slate-150">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-600">Enter Original License Key</label>
                    <input
                      type="text"
                      placeholder="JERP-XXXX-XXXX-XXXX-XXXX"
                      className="w-full bg-white border border-slate-200 px-2 py-1.5 font-mono text-xs outline-none rounded"
                      value={recoveryKey}
                      onChange={e => setRecoveryKey(e.target.value)}
                    />
                  </div>
                  <div className="relative flex py-1 items-center">
                    <div className="flex-grow border-t border-slate-200"></div>
                    <span className="flex-shrink mx-2 text-[10px] text-slate-400 font-bold uppercase">Or Registered Contact</span>
                    <div className="flex-grow border-t border-slate-200"></div>
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-slate-600">Registered Mobile Number</label>
                    <input
                      type="text"
                      placeholder="+91 98765 43210"
                      className="w-full bg-white border border-slate-200 px-2 py-1.5 text-xs outline-none rounded font-semibold"
                      value={recoveryMobile}
                      onChange={e => setRecoveryMobile(e.target.value)}
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  className="w-full py-2 bg-amber-500 hover:bg-amber-600 text-white font-extrabold uppercase rounded shadow-sm border border-amber-650 transition-all"
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
              <div className="space-y-3.5">
                <p className="text-slate-500 italic leading-relaxed text-[11px]">
                  Encountered an issue or blocked by hardware limits? Get in touch with our enterprise licensing desk.
                </p>

                <div className="divide-y divide-slate-100 bg-slate-50 p-2 rounded border border-slate-150 text-[11px]">
                  <div className="py-2 flex items-center space-x-2">
                    <Phone className="h-4 w-4 text-slate-400 shrink-0" />
                    <span>Support Phone: <strong className="text-slate-700">+91 99000-88776</strong></span>
                  </div>
                  <div className="py-2 flex items-center space-x-2">
                    <Mail className="h-4 w-4 text-slate-400 shrink-0" />
                    <span>Support Email: <strong className="text-slate-700">licensing@jewelleryerp.com</strong></span>
                  </div>
                  <div className="py-2 flex items-center space-x-2">
                    <Laptop className="h-4 w-4 text-slate-400 shrink-0" />
                    <span>Verification Server: <strong className="text-slate-700 font-mono">http://localhost:3003</strong></span>
                  </div>
                </div>
              </div>
            )}

          </div>
        )}

        {/* Message alerts */}
        {msg && (
          <div className="p-2.5 bg-emerald-50 border border-emerald-250 text-center text-xs font-bold rounded text-emerald-800 uppercase tracking-wide">
            {msg}
          </div>
        )}

        {errorMsg && (
          <div className="p-2.5 bg-rose-50 border border-rose-250 text-center text-xs font-bold rounded text-rose-800 uppercase tracking-wide">
            {errorMsg}
          </div>
        )}

      </div>
    </div>
  );
}
