import React, { useEffect, useState } from 'react';
import { ShieldAlert, ShieldCheck, Key, Copy, Check } from 'lucide-react';

export default function LicensingView() {
  const [licenseStatus, setLicenseStatus] = useState<any>(null);
  const [keyInput, setKeyInput] = useState('');
  const [copied, setCopied] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    loadLicense();
  }, []);

  const loadLicense = async () => {
    try {
      const status = await (window as any).api.getLicenseStatus();
      setLicenseStatus(status);
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

  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyInput.trim()) return;

    try {
      const status = await (window as any).api.activateLicense(keyInput.trim());
      setLicenseStatus(status);
      setMsg(status.statusMessage);
      if (status.activated) {
        setKeyInput('');
        // Reload page to unlock tabs
        setTimeout(() => window.location.reload(), 1500);
      }
    } catch (err: any) {
      alert(`Activation error: ${err.message || err}`);
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

  return (
    <div className="space-y-4 font-sans select-text">
      {/* Alert banner */}
      <div className={`p-3 rounded-[2px] border flex items-start gap-2.5 ${
        licenseStatus.activated 
          ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
          : 'bg-rose-50 border-rose-200 text-rose-800'
      }`}>
        {licenseStatus.activated ? (
          <ShieldCheck className="h-5 w-5 text-emerald-650 shrink-0 mt-0.5" />
        ) : (
          <ShieldAlert className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
        )}
        <div className="text-xs">
          <p className="font-extrabold uppercase tracking-wider font-luxury text-[10px] text-amber-700">
            {licenseStatus.activated ? 'Licensed & Verified' : 'Evaluation Mode / Unlicensed'}
          </p>
          <p className="mt-0.5 font-semibold text-slate-700">{licenseStatus.statusMessage}</p>
          {licenseStatus.expiryDate && (
            <p className="mt-1 font-semibold font-data text-[10px] text-slate-650">
              Subscription Expiration: {licenseStatus.expiryDate}
            </p>
          )}
        </div>
      </div>

      {/* Main card */}
      <div className="bg-white border border-slate-350 rounded-[2px] p-4 space-y-3 shadow-sm">
        {/* Device ID display */}
        <div className="space-y-1">
          <label className="erp-label block">Computer Hardware Signature (Fingerprint)</label>
          <div className="flex gap-2">
            <input 
              type="text"
              readOnly
              className="erp-input font-data bg-slate-50 border-slate-300 text-slate-600 font-bold select-all"
              value={licenseStatus.deviceId}
            />
            <button
              onClick={handleCopyDeviceId}
              className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-white border border-slate-900 text-xs font-bold rounded-[2px] transition-all flex items-center gap-1 uppercase tracking-wider shrink-0 shadow-sm"
              title="Copy Signature"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-450" />
                  <span>Copied</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>
          <p className="text-[9.5px] text-slate-500 font-semibold italic">Share this machine ID with support to obtain your license activation key.</p>
        </div>

        {/* Key submission form */}
        {!licenseStatus.activated && (
          <form onSubmit={handleActivate} className="border-t border-slate-200 pt-3 space-y-3">
            <div className="space-y-1">
              <label className="erp-label block">Enter Product Activation Key</label>
              <div className="flex gap-2 bg-white border border-slate-300 rounded-[2px] px-2 py-1.5 focus-within:border-amber-500 focus-within:ring-1 focus-within:ring-amber-500/20">
                <Key className="h-4 w-4 text-slate-400 mr-0.5 shrink-0 mt-0.5" />
                <input
                  type="text"
                  required
                  placeholder="Paste activation key signature here..."
                  className="bg-transparent border-none text-xs font-mono font-bold w-full focus:outline-none select-text"
                  value={keyInput}
                  onChange={(e) => setKeyInput(e.target.value)}
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2 bg-amber-500 hover:bg-amber-600 text-white font-extrabold rounded-[2px] text-xs uppercase border border-amber-600 transition-all shadow-sm tracking-wider"
            >
              Activate Commercial License
            </button>
          </form>
        )}

        {msg && (
          <div className="mt-2 p-2 bg-slate-100 border border-slate-200 text-center text-xs font-extrabold rounded-[2px] text-slate-700 font-sans uppercase">
            {msg}
          </div>
        )}
      </div>
    </div>
  );
}
