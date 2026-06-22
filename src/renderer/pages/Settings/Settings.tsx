import React, { useEffect, useState } from 'react';
import { useCompanyStore } from '../../store/useCompanyStore';
import { useRateStore } from '../../store/useRateStore';
import { Settings, RefreshCw, Database, CloudLightning, ShieldAlert, CheckCircle } from 'lucide-react';
import ScannerSettings from './ScannerSettings';

export default function SettingsView() {
  const selectedCompany = useCompanyStore((state) => state.selectedCompany);
  const { currentRates, saveRates } = useRateStore();

  // Daily Rates input states
  const [ratesForm, setRatesForm] = useState({
    gold24k: 72000,
    gold22k: 66000,
    gold18k: 54000,
    silver: 85000,
  });

  // Sync / Backup states
  const [syncStatus, setSyncStatus] = useState<any>(null);
  const [backupStatus, setBackupStatus] = useState<any>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isBackingUp, setIsBackingUp] = useState(false);

  // Restore state
  const [restorePath, setRestorePath] = useState('');
  const [activeSettingsTab, setActiveSettingsTab] = useState<'general' | 'scanner'>('general');

  useEffect(() => {
    if (currentRates) {
      setRatesForm({
        gold24k: currentRates.gold_rate_24k,
        gold22k: currentRates.gold_rate_22k,
        gold18k: currentRates.gold_rate_18k,
        silver: currentRates.silver_rate,
      });
    }
  }, [currentRates]);

  const handleSaveRates = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCompany) return;
    try {
      await saveRates(
        selectedCompany.id,
        ratesForm.gold24k,
        ratesForm.gold22k,
        ratesForm.gold18k,
        ratesForm.silver
      );
      alert('Metal rates updated successfully for item pricing calculations.');
    } catch (err) {
      alert('Error updating rates.');
    }
  };

  const handleBackup = async () => {
    setIsBackingUp(true);
    setBackupStatus(null);
    try {
      const res = await (window as any).api.createBackup();
      setBackupStatus(res);
    } catch (err: any) {
      setBackupStatus({ success: false, message: err.message || err });
    }
    setIsBackingUp(false);
  };

  const handleRestore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restorePath.trim()) return;

    if (confirm('CAUTION: Restoring database will overwrite all current sales cart items and ledger transactions. Do you wish to proceed?')) {
      try {
        const res = await (window as any).api.restoreBackup(restorePath.trim());
        alert(res.message);
        if (res.success) {
          window.location.reload();
        }
      } catch (err: any) {
        alert(`Restore execution error: ${err.message || err}`);
      }
    }
  };

  const handleCloudSync = async () => {
    if (!selectedCompany) return;
    setIsSyncing(true);
    setSyncStatus(null);
    try {
      const res = await (window as any).api.syncWithCloud(selectedCompany.id);
      setSyncStatus(res);
    } catch (err: any) {
      setSyncStatus({ success: false, message: err.message || err });
    }
    setIsSyncing(false);
  };

  return (
    <div className="p-3 bg-[#eef1f6] h-full overflow-y-auto max-h-[calc(100vh-105px)] font-sans">
      <div className="flex justify-between items-center border-b border-slate-300 pb-2 mb-3">
        <div>
          <h2 className="text-sm font-bold flex items-center gap-1.5 text-slate-800 uppercase tracking-wider font-luxury">
            <Settings className="h-4.5 w-4.5 text-amber-500" />
            <span>System Preferences & Utilities</span>
          </h2>
          <p className="text-[10px] text-slate-500 font-semibold uppercase">Manage global daily metal rates, local database backups, and cloud synchronization.</p>
        </div>
      </div>

      <div className="flex gap-2 mb-3">
        <button
          onClick={() => setActiveSettingsTab('general')}
          className={`h-7 px-4 font-bold text-xs uppercase rounded-[2px] border transition-all ${
            activeSettingsTab === 'general'
              ? 'bg-slate-800 border-slate-900 text-white shadow-sm'
              : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50'
          }`}
        >
          General Settings & Backups
        </button>
        <button
          onClick={() => setActiveSettingsTab('scanner')}
          className={`h-7 px-4 font-bold text-xs uppercase rounded-[2px] border transition-all ${
            activeSettingsTab === 'scanner'
              ? 'bg-slate-800 border-slate-900 text-white shadow-sm'
              : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50'
          }`}
        >
          Hardware Scanner & Printers
        </button>
      </div>

      {activeSettingsTab === 'general' ? (
        <div className="grid grid-cols-12 gap-3">
        {/* LEFT PANEL: Rates panel */}
        <div className="col-span-6 space-y-3">
          <div className="bg-white border border-slate-355 rounded-[2px] shadow-sm overflow-hidden h-fit">
            <div className="bg-slate-800 text-slate-100 px-3 py-1.5 border-b border-slate-900">
              <h3 className="font-bold text-xs uppercase tracking-wider font-luxury">
                Update Today's Metal Rates
              </h3>
            </div>
            
            <div className="p-3">
              {selectedCompany ? (
                <form onSubmit={handleSaveRates} className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="erp-label block mb-0.5">Gold 24K (₹ per 10g)</label>
                      <input
                        type="number"
                        className="erp-input font-data text-right font-bold text-slate-850"
                        value={ratesForm.gold24k}
                        onChange={(e) => setRatesForm({ ...ratesForm, gold24k: parseFloat(e.target.value) || 0 })}
                      />
                    </div>

                    <div>
                      <label className="erp-label block mb-0.5">Gold 22K (₹ per 10g)</label>
                      <input
                        type="number"
                        className="erp-input font-data text-right font-bold text-amber-600"
                        value={ratesForm.gold22k}
                        onChange={(e) => setRatesForm({ ...ratesForm, gold22k: parseFloat(e.target.value) || 0 })}
                      />
                    </div>

                    <div>
                      <label className="erp-label block mb-0.5">Gold 18K (₹ per 10g)</label>
                      <input
                        type="number"
                        className="erp-input font-data text-right font-bold text-slate-850"
                        value={ratesForm.gold18k}
                        onChange={(e) => setRatesForm({ ...ratesForm, gold18k: parseFloat(e.target.value) || 0 })}
                      />
                    </div>

                    <div>
                      <label className="erp-label block mb-0.5">Silver 999 (₹ per 1kg)</label>
                      <input
                        type="number"
                        className="erp-input font-data text-right font-bold text-slate-850"
                        value={ratesForm.silver}
                        onChange={(e) => setRatesForm({ ...ratesForm, silver: parseFloat(e.target.value) || 0 })}
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white font-extrabold rounded-[2px] text-xs uppercase border border-amber-600 transition-all shadow-sm"
                  >
                    Update Rates Table
                  </button>
                </form>
              ) : (
                <p className="text-xs text-rose-500 font-semibold uppercase italic p-3 text-center">
                  Please select an active company workspace to adjust metal rates.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT PANEL: Backup & Sync Panel */}
        <div className="col-span-6 space-y-3">
          
          {/* Backup and restore card */}
          <div className="bg-white border border-slate-355 rounded-[2px] shadow-sm overflow-hidden">
            <div className="bg-slate-800 text-slate-100 px-3 py-1.5 border-b border-slate-900">
              <h3 className="font-bold text-xs uppercase tracking-wider font-luxury flex items-center gap-1.5">
                <Database className="h-4 w-4 text-amber-500" />
                <span>Backup & Restore Center</span>
              </h3>
            </div>
            
            <div className="p-3 space-y-3">
              <div>
                <p className="text-[11px] text-slate-500 font-semibold mb-2">
                  Export compressed ZIP archives containing SQLite tables and company configuration backups.
                </p>
                <button
                  onClick={handleBackup}
                  disabled={isBackingUp}
                  className="flex items-center gap-1 px-3 py-1 bg-slate-800 hover:bg-slate-700 text-white border border-slate-900 text-xs font-bold rounded-[2px] transition-all shadow-sm uppercase tracking-wider"
                >
                  {isBackingUp ? 'Generating Backup...' : 'Generate Backup Zip'}
                </button>
              </div>

              {backupStatus && (
                <div className={`p-2 rounded-[2px] text-xs border ${
                  backupStatus.success 
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-700 font-semibold' 
                    : 'bg-rose-50 border-rose-200 text-rose-700 font-semibold'
                }`}>
                  {backupStatus.success ? (
                    <span className="flex items-center gap-1">
                      <CheckCircle className="h-3.5 w-3.5" />
                      {backupStatus.message}
                    </span>
                  ) : (
                    <span className="flex items-center gap-1">
                      <ShieldAlert className="h-3.5 w-3.5" />
                      {backupStatus.message}
                    </span>
                  )}
                </div>
              )}

              <form onSubmit={handleRestore} className="border-t border-slate-200 pt-3 space-y-2">
                <span className="erp-label block">Restore database registry from local path</span>
                <input
                  type="text"
                  required
                  placeholder="e.g. C:\Users\...\backup.db.zip"
                  className="erp-input font-data text-xs"
                  value={restorePath}
                  onChange={(e) => setRestorePath(e.target.value)}
                />
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-rose-650 hover:bg-rose-700 text-white font-bold rounded-[2px] text-xs uppercase border border-rose-700 transition-colors shadow-sm"
                >
                  Overwrite & Restore Database
                </button>
              </form>
            </div>
          </div>

          {/* Cloud Sync module */}
          <div className="bg-white border border-slate-355 rounded-[2px] shadow-sm overflow-hidden">
            <div className="bg-slate-800 text-slate-100 px-3 py-1.5 border-b border-slate-900">
              <h3 className="font-bold text-xs uppercase tracking-wider font-luxury flex items-center gap-1.5">
                <CloudLightning className="h-4 w-4 text-amber-500" />
                <span>Cloud Synchronization Gateway</span>
              </h3>
            </div>
            
            <div className="p-3 space-y-3">
              <p className="text-[11px] text-slate-500 font-semibold">
                Sync local sales voucher logs and inventory stock updates to secure cloud backups.
              </p>

              <button
                onClick={handleCloudSync}
                disabled={isSyncing || !selectedCompany}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 disabled:bg-slate-200 border border-amber-600 text-white font-extrabold rounded-[2px] text-xs uppercase transition-all shadow-sm"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>Sync with cloud</span>
              </button>

              {syncStatus && (
                <div className={`p-2 rounded-[2px] text-xs border ${
                  syncStatus.success 
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-700 font-semibold' 
                    : 'bg-rose-50 border-rose-200 text-rose-700 font-semibold'
                }`}>
                  {syncStatus.success ? (
                    <div>
                      <span className="flex items-center gap-1 font-extrabold uppercase">
                        <CheckCircle className="h-3.5 w-3.5 text-emerald-600" /> Sync Succeeded!
                      </span>
                      <p className="mt-1 font-sans">{syncStatus.message}</p>
                      {syncStatus.lastSyncTime && <p className="mt-0.5 text-[9px] text-slate-400 font-data">Timestamp: {syncStatus.lastSyncTime}</p>}
                    </div>
                  ) : (
                    <span className="flex items-center gap-1">
                      <ShieldAlert className="h-3.5 w-3.5" />
                      {syncStatus.message}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
      ) : (
        <ScannerSettings />
      )}
    </div>
  );
}
