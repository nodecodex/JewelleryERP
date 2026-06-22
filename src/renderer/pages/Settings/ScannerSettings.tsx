import React, { useState, useEffect } from 'react';
import { useCompanyStore } from '../../store/useCompanyStore';
import { 
  Tv, 
  Printer, 
  Sliders, 
  HelpCircle, 
  CheckCircle, 
  ShieldAlert, 
  RefreshCw,
  Play
} from 'lucide-react';
import type { DeviceConfig, PrinterConfig, ScanLog } from '../../../shared/ipc-api';

export default function ScannerSettings() {
  const selectedCompany = useCompanyStore((state) => state.selectedCompany);
  
  // Scanner configuration states
  const [scannerEnabled, setScannerEnabled] = useState(true);
  const [connectionMode, setConnectionMode] = useState<'HID_Keyboard' | 'Virtual_COM' | 'Webcam'>('HID_Keyboard');
  const [comPort, setComPort] = useState('COM3');
  const [baudRate, setBaudRate] = useState(9600);
  const [prefix, setPrefix] = useState('');
  const [suffix, setSuffix] = useState('Enter');
  
  // Printer configuration states
  const [printerName, setPrinterName] = useState('Zebra TLP2844');
  const [printerType, setPrinterType] = useState<'Thermal' | 'Laser_Inkjet' | 'Label_Printer'>('Label_Printer');
  const [labelSize, setLabelSize] = useState<'Tag_Label' | 'Sticker_Label' | 'A4_Sheet'>('Tag_Label');
  const [isDefaultPrinter, setIsDefaultPrinter] = useState(true);
  
  // Diagnostic states
  const [testInput, setTestInput] = useState('');
  const [diagnosticLogs, setDiagnosticLogs] = useState<string[]>([]);
  const [lastScanTimes, setLastScanTimes] = useState<number[]>([]);
  const [scanHistory, setScanHistory] = useState<ScanLog[]>([]);

  // Status banners
  const [statusMsg, setStatusMsg] = useState<{ success: boolean; text: string } | null>(null);

  // Load configuration from DB
  const loadConfig = async () => {
    if (!selectedCompany) return;
    try {
      const devConfigs: DeviceConfig[] = await (window as any).api.getDeviceConfigurations(selectedCompany.id);
      const barcodeConf = devConfigs.find(c => c.device_type === 'Barcode_Scanner');
      if (barcodeConf) {
        setScannerEnabled(barcodeConf.is_enabled === 1);
        setConnectionMode(barcodeConf.connection_mode);
        setPrefix(barcodeConf.prefix || '');
        setSuffix(barcodeConf.suffix || 'Enter');
        if (barcodeConf.port_settings_json) {
          const ports = JSON.parse(barcodeConf.port_settings_json);
          setComPort(ports.com_port || 'COM3');
          setBaudRate(ports.baud_rate || 9600);
        }
      }

      const printConfigs: PrinterConfig[] = await (window as any).api.getPrinterConfigurations(selectedCompany.id);
      const defaultPrinter = printConfigs.find(p => p.is_default === 1) || printConfigs[0];
      if (defaultPrinter) {
        setPrinterName(defaultPrinter.printer_name);
        setPrinterType(defaultPrinter.printer_type);
        setLabelSize(defaultPrinter.label_size);
        setIsDefaultPrinter(defaultPrinter.is_default === 1);
      }

      const history = await (window as any).api.getScanHistory(selectedCompany.id, 10);
      setScanHistory(history);
    } catch (err) {
      console.error('Failed to load scanner settings from database:', err);
    }
  };

  useEffect(() => {
    loadConfig();
  }, [selectedCompany]);

  const handleSaveScanner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCompany) return;
    try {
      await (window as any).api.saveDeviceConfiguration({
        company_id: selectedCompany.id,
        device_type: 'Barcode_Scanner',
        connection_mode: connectionMode,
        port_settings_json: JSON.stringify({ com_port: comPort, baud_rate: baudRate }),
        prefix: prefix || null,
        suffix: suffix,
        is_enabled: scannerEnabled ? 1 : 0
      });
      // Also save QR Scanner settings matching barcode scanner
      await (window as any).api.saveDeviceConfiguration({
        company_id: selectedCompany.id,
        device_type: 'QR_Scanner',
        connection_mode: connectionMode,
        port_settings_json: JSON.stringify({ com_port: comPort, baud_rate: baudRate }),
        prefix: prefix || null,
        suffix: suffix,
        is_enabled: scannerEnabled ? 1 : 0
      });

      setStatusMsg({ success: true, text: 'Hardware Scanner configuration updated successfully.' });
      setTimeout(() => setStatusMsg(null), 4000);
      loadConfig();
    } catch (err: any) {
      setStatusMsg({ success: false, text: err.message || 'Error saving scanner configuration.' });
    }
  };

  const handleSavePrinter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCompany) return;
    try {
      await (window as any).api.savePrinterConfiguration({
        company_id: selectedCompany.id,
        printer_name: printerName,
        printer_type: printerType,
        label_size: labelSize,
        template_json: JSON.stringify({ margins: 'default', scale: 1.0 }),
        is_default: isDefaultPrinter ? 1 : 0
      });
      setStatusMsg({ success: true, text: 'Printer profile and label configurations updated.' });
      setTimeout(() => setStatusMsg(null), 4000);
      loadConfig();
    } catch (err: any) {
      setStatusMsg({ success: false, text: err.message || 'Error saving printer profile.' });
    }
  };

  // Live diagnostics timing analysis
  const handleTestInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const now = Date.now();
    setLastScanTimes(prev => {
      const times = [...prev, now];
      if (times.length > 1) {
        const delays: number[] = [];
        for (let i = 1; i < times.length; i++) {
          delays.push(times[i] - times[i - 1]);
        }
        const avg = Math.round(delays.reduce((s, d) => s + d, 0) / delays.length);
        const char = e.key === 'Enter' ? '<CR>' : e.key === 'Tab' ? '<TAB>' : e.key;
        
        setDiagnosticLogs(prevLogs => [
          `Key: ${char} | Inter-key Delay: ${times[times.length - 1] - times[times.length - 2]}ms | Running Average: ${avg}ms`,
          ...prevLogs.slice(0, 15)
        ]);
      } else {
        setDiagnosticLogs(prevLogs => [`Key: ${e.key} | Start buffering`, ...prevLogs]);
      }
      return times;
    });

    if (e.key === 'Enter') {
      const text = (e.target as HTMLInputElement).value;
      setDiagnosticLogs(prev => [
        `▶ SCAN COMPLETE: "${text}" | Total Length: ${text.length} chars`,
        ...prev
      ]);
      setTestInput('');
      setLastScanTimes([]);
      
      // Add mock record to temporary scan history view
      if (selectedCompany) {
        const isQR = text.includes('|') || text.startsWith('{') || text.length > 20;
        const newLog: ScanLog = {
          company_id: selectedCompany.id,
          scanned_value: text,
          scan_type: isQR ? 'QR' : 'Barcode',
          result_status: 'Success',
          device_name: 'HID Diagnostic Test',
          screen_name: 'Scanner Settings',
          scan_time: new Date().toLocaleTimeString()
        };
        setScanHistory(prevHist => [newLog, ...prevHist.slice(0, 9)]);
      }
    }
  };

  const handlePrintTestLabel = () => {
    window.print();
  };

  return (
    <div className="space-y-4">
      {statusMsg && (
        <div className={`p-2 rounded-[2px] text-xs border ${
          statusMsg.success 
            ? 'bg-emerald-50 border-emerald-200 text-emerald-700 font-semibold' 
            : 'bg-rose-50 border-rose-200 text-rose-700 font-semibold'
        }`}>
          <span className="flex items-center gap-1">
            {statusMsg.success ? <CheckCircle className="h-3.5 w-3.5" /> : <ShieldAlert className="h-3.5 w-3.5" />}
            {statusMsg.text}
          </span>
        </div>
      )}

      <div className="grid grid-cols-12 gap-3">
        {/* LEFT COLUMN: Hardware Scanner Configuration */}
        <div className="col-span-6 space-y-3">
          
          <div className="bg-white border border-slate-355 rounded-[2px] shadow-sm overflow-hidden">
            <div className="bg-slate-800 text-slate-100 px-3 py-1.5 border-b border-slate-900 flex justify-between items-center">
              <h3 className="font-bold text-xs uppercase tracking-wider font-luxury flex items-center gap-1.5">
                <Sliders className="h-4 w-4 text-amber-500" />
                <span>Scanner Port & Interface Settings</span>
              </h3>
            </div>
            
            <form onSubmit={handleSaveScanner} className="p-3 space-y-3.5">
              <div>
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={scannerEnabled}
                    onChange={(e) => setScannerEnabled(e.target.checked)}
                    className="h-4 w-4 accent-amber-500 rounded border-slate-300 focus:ring-amber-500"
                  />
                  <span className="text-xs font-bold text-slate-700 uppercase">Enable Hardware Scanning System</span>
                </label>
                <p className="text-[10px] text-slate-400 font-semibold uppercase mt-0.5 ml-6">Global switch to hook keyboard and serial listeners.</p>
              </div>

              <div className="grid grid-cols-2 gap-3 border-t border-slate-200 pt-3">
                <div>
                  <label className="erp-label block mb-0.5">Connection Interface</label>
                  <select
                    className="erp-input font-bold bg-slate-50 cursor-pointer"
                    value={connectionMode}
                    onChange={(e) => setConnectionMode(e.target.value as any)}
                  >
                    <option value="HID_Keyboard">USB HID Keyboard Emulation</option>
                    <option value="Virtual_COM">Virtual COM Port (Serial)</option>
                    <option value="Webcam">Integrated Webcam Parser</option>
                  </select>
                </div>

                <div>
                  <label className="erp-label block mb-0.5">Trigger Suffix Key</label>
                  <select
                    className="erp-input font-bold bg-slate-50 cursor-pointer"
                    value={suffix}
                    onChange={(e) => setSuffix(e.target.value)}
                  >
                    <option value="Enter">Enter Key (CRLF / \n)</option>
                    <option value="Tab">Tab Key (\t)</option>
                    <option value="None">No Suffix (Delay Intercept)</option>
                  </select>
                </div>
              </div>

              {connectionMode === 'Virtual_COM' && (
                <div className="grid grid-cols-2 gap-3 bg-amber-50/50 p-2.5 rounded-[2px] border border-amber-200/50">
                  <div>
                    <label className="erp-label block mb-0.5 text-amber-800">Serial COM Port</label>
                    <select
                      className="erp-input font-mono font-bold bg-white"
                      value={comPort}
                      onChange={(e) => setComPort(e.target.value)}
                    >
                      <option value="COM1">COM1</option>
                      <option value="COM2">COM2</option>
                      <option value="COM3">COM3</option>
                      <option value="COM4">COM4</option>
                      <option value="/dev/ttyUSB0">ttyUSB0 (Linux)</option>
                    </select>
                  </div>
                  <div>
                    <label className="erp-label block mb-0.5 text-amber-800">Baud Rate (bps)</label>
                    <select
                      className="erp-input font-mono font-bold bg-white"
                      value={baudRate}
                      onChange={(e) => setBaudRate(parseInt(e.target.value, 10))}
                    >
                      <option value="4800">4800</option>
                      <option value="9600">9600</option>
                      <option value="19200">19200</option>
                      <option value="115200">115200</option>
                    </select>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="erp-label block mb-0.5">Scanner Prefix (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. $ or ~"
                    className="erp-input font-mono text-center font-bold"
                    value={prefix}
                    onChange={(e) => setPrefix(e.target.value)}
                  />
                  <p className="text-[9px] text-slate-400 font-semibold uppercase mt-0.5">Character preceding barcode payload.</p>
                </div>

                <div className="flex items-end">
                  <button
                    type="submit"
                    className="w-full h-[28px] bg-slate-800 hover:bg-slate-700 text-white font-extrabold rounded-[2px] text-xs uppercase transition-all shadow-sm border border-slate-900"
                  >
                    Save Hardware Interface
                  </button>
                </div>
              </div>
            </form>
          </div>

          {/* Printer Configuration Panel */}
          <div className="bg-white border border-slate-355 rounded-[2px] shadow-sm overflow-hidden">
            <div className="bg-slate-800 text-slate-100 px-3 py-1.5 border-b border-slate-900">
              <h3 className="font-bold text-xs uppercase tracking-wider font-luxury flex items-center gap-1.5">
                <Printer className="h-4 w-4 text-amber-500" />
                <span>Jewellery Tag & Barcode Printers</span>
              </h3>
            </div>

            <form onSubmit={handleSavePrinter} className="p-3 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="erp-label block mb-0.5">Default Printer Spool</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Zebra TLP2844 or TVS"
                    className="erp-input font-bold"
                    value={printerName}
                    onChange={(e) => setPrinterName(e.target.value)}
                  />
                </div>

                <div>
                  <label className="erp-label block mb-0.5">Printer Hardware Profile</label>
                  <select
                    className="erp-input font-bold bg-slate-50 cursor-pointer"
                    value={printerType}
                    onChange={(e) => setPrinterType(e.target.value as any)}
                  >
                    <option value="Label_Printer">Zebra / TVS Barcode Printer</option>
                    <option value="Thermal">Evolis / Thermal Label Printer</option>
                    <option value="Laser_Inkjet">Generic A4 Laser Sheet</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="erp-label block mb-0.5">Label Sheet Sizes</label>
                  <select
                    className="erp-input font-bold bg-slate-50 cursor-pointer"
                    value={labelSize}
                    onChange={(e) => setLabelSize(e.target.value as any)}
                  >
                    <option value="Tag_Label">Jewellery Folding Tag (Dual Flap)</option>
                    <option value="Sticker_Label">Standard Sticker Sheets (2-up/3-up)</option>
                    <option value="A4_Sheet">Generic A4 Sticker Paper</option>
                  </select>
                </div>

                <div className="flex items-center gap-2 h-full pt-4">
                  <label className="flex items-center gap-1.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-amber-500"
                      checked={isDefaultPrinter}
                      onChange={(e) => setIsDefaultPrinter(e.target.checked)}
                    />
                    <span className="text-[10px] font-bold text-slate-600 uppercase">Set default print spooler</span>
                  </label>
                </div>
              </div>

              <div className="flex justify-between items-center border-t border-slate-200 pt-3">
                <button
                  type="button"
                  onClick={handlePrintTestLabel}
                  className="px-3.5 h-[28px] bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 font-extrabold rounded-[2px] text-xs uppercase transition-all shadow-sm"
                >
                  Print Test Label Tag
                </button>
                <button
                  type="submit"
                  className="px-5 h-[28px] bg-amber-500 hover:bg-amber-600 text-white font-extrabold rounded-[2px] text-xs uppercase border border-amber-600 transition-all shadow-sm"
                >
                  Save Printer Profile
                </button>
              </div>
            </form>
          </div>

        </div>

        {/* RIGHT COLUMN: Diagnostics Console & Live Scan Logs */}
        <div className="col-span-6 space-y-3">
          
          <div className="bg-slate-900 border border-slate-950 rounded-[2px] shadow-md overflow-hidden text-slate-100 font-mono">
            <div className="bg-slate-950 px-3 py-1.5 border-b border-slate-950 flex justify-between items-center">
              <h3 className="font-bold text-[10.5px] uppercase tracking-wider text-amber-500 font-sans flex items-center gap-1.5">
                <Tv className="h-4 w-4" />
                <span>Scanner Diagnostics Console</span>
              </h3>
              <button 
                onClick={() => setDiagnosticLogs([])}
                className="text-[9px] text-slate-400 bg-slate-800 hover:bg-slate-700 px-2 py-0.5 rounded-[1px] uppercase font-sans font-bold"
              >
                Clear Console
              </button>
            </div>

            <div className="p-3 space-y-2.5">
              <div className="bg-slate-950/80 p-2 border border-slate-850 rounded-[2px]">
                <span className="text-[10px] text-slate-400 font-bold block uppercase font-sans mb-1">Click below to test hardware scanner gun keystrokes:</span>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Scan test barcode/QR here..."
                    className="w-full h-8 bg-slate-900 border border-slate-800 rounded-[2px] px-2.5 text-xs text-amber-400 font-mono focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500"
                    value={testInput}
                    onChange={(e) => setTestInput(e.target.value)}
                    onKeyDown={handleTestInputKeyDown}
                  />
                  <Play className="absolute right-2.5 top-2.5 h-3 w-3 text-slate-600" />
                </div>
              </div>

              <div>
                <span className="text-[10px] text-slate-400 font-bold block uppercase font-sans mb-1">Inter-Keystroke Latency Diagnostics:</span>
                <div className="h-[125px] overflow-y-auto bg-slate-950 p-2 rounded-[2px] border border-slate-850 text-[10px] text-slate-300 space-y-0.5 scrollbar-thin select-text">
                  {diagnosticLogs.length === 0 ? (
                    <span className="text-slate-500 italic block py-2 text-center uppercase font-sans">Ready. Inject raw keys to verify speed signature...</span>
                  ) : (
                    diagnosticLogs.map((log, idx) => (
                      <div key={idx} className={log.startsWith('▶') ? 'text-amber-400 font-bold border-b border-slate-850 pb-1 mt-1 font-sans' : 'text-emerald-400/95 font-mono'}>
                        {log}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Recent Scanned Log Table */}
          <div className="bg-white border border-slate-355 rounded-[2px] shadow-sm overflow-hidden flex-1 flex flex-col h-[180px]">
            <div className="bg-slate-800 text-slate-100 px-3 py-1.5 border-b border-slate-900 flex justify-between items-center">
              <h3 className="font-bold text-xs uppercase tracking-wider font-luxury">
                Recent Scans Audit Log
              </h3>
              <button 
                onClick={loadConfig}
                className="text-[9.5px] text-slate-300 hover:text-white uppercase font-sans font-bold flex items-center gap-1"
              >
                <RefreshCw className="h-3 w-3" />
                <span>Refresh</span>
              </button>
            </div>

            <div className="overflow-y-auto flex-1 text-[10px]">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-200 text-slate-500 font-bold uppercase text-[9px]">
                    <th className="px-2 py-1 text-left">Time</th>
                    <th className="px-2 py-1 text-left">Value</th>
                    <th className="px-2 py-1 text-center w-12">Type</th>
                    <th className="px-2 py-1 text-left">Screen</th>
                    <th className="px-2 py-1 text-center w-14">Status</th>
                  </tr>
                </thead>
                <tbody className="font-mono text-slate-700 divide-y divide-slate-100 select-text">
                  {scanHistory.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-6 text-slate-400 font-sans italic">No recent scans logged in database.</td>
                    </tr>
                  ) : (
                    scanHistory.map((h, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="px-2 py-1 text-slate-400 whitespace-nowrap">{h.scan_time ? h.scan_time.split(' ')[0] : 'Now'}</td>
                        <td className="px-2 py-1 text-slate-800 font-bold truncate max-w-[120px]">{h.scanned_value}</td>
                        <td className="px-2 py-1 text-center font-sans"><span className={`px-1 py-0.2 text-[8px] font-extrabold rounded-[1px] ${h.scan_type === 'QR' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>{h.scan_type}</span></td>
                        <td className="px-2 py-1 font-sans text-slate-500 truncate max-w-[80px]">{h.screen_name}</td>
                        <td className="px-2 py-1 text-center font-sans"><span className="text-emerald-600 font-extrabold">OK</span></td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
