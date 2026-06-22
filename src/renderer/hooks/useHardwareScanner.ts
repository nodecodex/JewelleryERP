import { useEffect, useRef } from 'react';
import { useCompanyStore } from '../store/useCompanyStore';

export interface ScanEventDetails {
  value: string;
  source: 'barcode' | 'qr';
}

export function useHardwareScanner(
  onScan: (data: ScanEventDetails) => void,
  screenName: string
) {
  const selectedCompany = useCompanyStore((state) => state.selectedCompany);
  const onScanRef = useRef(onScan);
  onScanRef.current = onScan;

  useEffect(() => {
    if (!selectedCompany) return;

    let buffer = '';
    let lastKeyTime = 0;
    
    // Default config values (updated via DB if available)
    let isEnabled = true;
    let barcodePrefix = '';
    let barcodeSuffix = 'Enter';
    let qrPrefix = '';
    let qrSuffix = 'Enter';
    const speedThreshold = 35; // ms between keys for hardware guns

    // Fetch scanner configurations on mount
    (window as any).api.getDeviceConfigurations(selectedCompany.id).then((configs: any[]) => {
      if (configs && configs.length > 0) {
        const barcodeConf = configs.find(c => c.device_type === 'Barcode_Scanner');
        const qrConf = configs.find(c => c.device_type === 'QR_Scanner');
        
        if (barcodeConf) {
          isEnabled = barcodeConf.is_enabled === 1;
          barcodePrefix = barcodeConf.prefix || '';
          barcodeSuffix = barcodeConf.suffix || 'Enter';
        }
        if (qrConf) {
          qrPrefix = qrConf.prefix || '';
          qrSuffix = qrConf.suffix || 'Enter';
        }
      }
    }).catch(console.error);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isEnabled) return;

      // Ignore modifier keys by themselves
      if (['Shift', 'Control', 'Alt', 'Meta', 'CapsLock'].includes(e.key)) {
        return;
      }

      const now = Date.now();
      const delay = now - lastKeyTime;
      lastKeyTime = now;

      const currentSuffix = barcodeSuffix; // We check both, default to barcode
      const isSuffixKey = e.key === currentSuffix || (currentSuffix === 'Enter' && e.key === 'Enter') || (currentSuffix === 'Tab' && e.key === 'Tab');

      // Intercept keypresses that are very fast (scanner gun) or if we are already buffering
      const isFast = delay < speedThreshold;

      // If we hit the suffix key and we have a barcode/QR in the buffer
      if (isSuffixKey) {
        if (buffer.length >= 3) {
          e.preventDefault();
          e.stopPropagation();

          const finalValue = buffer.trim();
          buffer = ''; // Reset buffer

          // Determine scanner type
          const isQR = finalValue.startsWith('{') || finalValue.includes('|') || finalValue.length > 20;
          
          // Log scan to DB
          (window as any).api.logScan({
            company_id: selectedCompany.id,
            user_id: null, // Default placeholder
            device_name: 'USB HID Emulation',
            screen_name: screenName,
            scanned_value: finalValue,
            scan_type: isQR ? 'QR' : 'Barcode',
            result_status: 'Success'
          }).catch(console.error);

          onScanRef.current({
            value: finalValue,
            source: isQR ? 'qr' : 'barcode'
          });
        } else {
          buffer = '';
        }
        return;
      }

      // Buffer management:
      // If it's the first key, check if it matches prefix (if prefix is set)
      if (buffer.length === 0) {
        const isPrefix = barcodePrefix ? e.key === barcodePrefix : true;
        if (isPrefix) {
          if (barcodePrefix && e.key === barcodePrefix) {
            // Eat the prefix character
            return;
          }
          buffer += e.key;
        } else {
          buffer = '';
        }
      } else {
        // If it's subsequent keys, verify speed threshold to verify scanner vs human typing
        if (isFast) {
          buffer += e.key;
        } else {
          // Reset buffer since human is typing (too slow)
          buffer = e.key;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [selectedCompany, screenName]);
}
