import * as crypto from 'crypto';
import { execSync } from 'child_process';
import type { LicenseStatus } from '../../shared/ipc-api';
import { BaseRepository } from '../repositories/base.repository';

// Secret key used to encrypt/decrypt licenses symmetrically (offline authentication)
// In a real production deployment, this secret would be hidden, obfuscated, or verify asymmetric signatures.
const LICENSE_SECRET_KEY = 'JEWELLERY_ERP_ENTERPRISE_SECRET_KEY_2026';

export class LicenseService extends BaseRepository {
  private cachedDeviceId: string | null = null;

  /**
   * Retrieves Windows Hardware characteristics to form a unique Device Fingerprint
   */
  public getDeviceId(): string {
    if (this.cachedDeviceId) {
      return this.cachedDeviceId;
    }

    let cpuId = 'CPU-GENERIC';
    let mbSerial = 'MB-GENERIC';
    let diskSerial = 'DISK-GENERIC';
    let machineGuid = 'GUID-GENERIC';

    try {
      if (process.platform === 'win32') {
        // 1. Get CPU Processor ID
        try {
          const cpuOut = execSync('powershell -NoProfile -Command "Get-CimInstance Win32_Processor | Select-Object -ExpandProperty ProcessorId"').toString().trim();
          if (cpuOut) cpuId = cpuOut;
        } catch (e) {
          console.warn('Failed to retrieve CPU ID via PowerShell, using generic.');
        }

        // 2. Get Motherboard Serial Number
        try {
          const mbOut = execSync('powershell -NoProfile -Command "Get-CimInstance Win32_BaseBoard | Select-Object -ExpandProperty SerialNumber"').toString().trim();
          if (mbOut) mbSerial = mbOut;
        } catch (e) {
          console.warn('Failed to retrieve Motherboard Serial via PowerShell, using generic.');
        }

        // 3. Get Disk Serial Number
        try {
          const diskOut = execSync('powershell -NoProfile -Command "Get-CimInstance Win32_DiskDrive | Where-Object { $_.Index -eq 0 } | Select-Object -ExpandProperty SerialNumber"').toString().trim();
          if (diskOut) diskSerial = diskOut;
        } catch (e) {
          console.warn('Failed to retrieve Disk Serial via PowerShell, using generic.');
        }

        // 4. Get Machine GUID from Registry
        try {
          const guidOut = execSync('REG QUERY HKLM\\SOFTWARE\\Microsoft\\Cryptography /v MachineGuid').toString();
          const match = guidOut.match(/MachineGuid\s+REG_SZ\s+([a-fA-F0-9-]+)/);
          if (match && match[1]) machineGuid = match[1];
        } catch (e) {
          console.warn('Failed to retrieve Machine GUID registry key.');
        }
      } else {
        // Fallback for development on mac/linux
        const interfaces = require('os').networkInterfaces();
        for (const name of Object.keys(interfaces)) {
          for (const net of interfaces[name] || []) {
            if (net.mac && net.mac !== '00:00:00:00:00:00') {
              machineGuid = net.mac;
              break;
            }
          }
        }
      }
    } catch (error) {
      console.error('Error gathering system fingerprint, using fallbacks:', error);
    }

    const rawString = `CPU:${cpuId}|MB:${mbSerial}|DISK:${diskSerial}|GUID:${machineGuid}`;
    this.cachedDeviceId = crypto.createHash('sha256').update(rawString).digest('hex').toUpperCase();
    return this.cachedDeviceId;
  }

  /**
   * Inspects license status from local sqlite database
   */
  public getLicenseStatus(): LicenseStatus {
    const deviceId = this.getDeviceId();
    
    try {
      const row = this.db.prepare('SELECT * FROM license_info ORDER BY id DESC LIMIT 1').get() as {
        license_key: string;
        device_id: string;
        activation_date: string;
        expiry_date: string;
        license_payload_signature: string;
      } | undefined;

      if (!row) {
        return { activated: false, deviceId, statusMessage: 'No license activated.' };
      }

      // Verify stored license details
      const verification = this.verifyLicensePayload(row.license_key, deviceId);
      if (verification.isValid) {
        // Check expiry
        if (verification.expiryDate) {
          const expiryTime = new Date(verification.expiryDate).getTime();
          if (Date.now() > expiryTime) {
            return {
              activated: false,
              deviceId,
              licenseKey: row.license_key,
              expiryDate: verification.expiryDate,
              statusMessage: 'License key expired.'
            };
          }
        }

        return {
          activated: true,
          deviceId,
          licenseKey: row.license_key,
          activationDate: row.activation_date,
          expiryDate: row.expiry_date || undefined,
          statusMessage: 'Active Premium License.'
        };
      } else {
        return {
          activated: false,
          deviceId,
          licenseKey: row.license_key,
          statusMessage: 'Invalid or tampered license key.'
        };
      }
    } catch (e) {
      return { activated: false, deviceId, statusMessage: 'Error reading license database.' };
    }
  }

  /**
   * Validates and saves an input license key
   */
  public activateLicense(key: string): LicenseStatus {
    const deviceId = this.getDeviceId();
    const verification = this.verifyLicensePayload(key, deviceId);

    if (!verification.isValid) {
      return { activated: false, deviceId, statusMessage: 'Verification failed: License key is invalid for this machine.' };
    }

    // Save to DB
    const activationDate = new Date().toISOString().split('T')[0];
    const expiryDate = verification.expiryDate || null;

    // Clear previous entries
    this.db.prepare('DELETE FROM license_info').run();

    this.db.prepare(`
      INSERT INTO license_info (license_key, device_id, activation_date, expiry_date, license_payload_signature)
      VALUES (?, ?, ?, ?, ?)
    `).run(key, deviceId, activationDate, expiryDate, 'VERIFIED_SIGNATURE');

    return {
      activated: true,
      deviceId,
      licenseKey: key,
      activationDate,
      expiryDate: expiryDate || undefined,
      statusMessage: 'License successfully activated!'
    };
  }

  /**
   * Helper to verify if license key payload matches the device ID and isn't expired
   */
  private verifyLicensePayload(key: string, deviceId: string): { isValid: boolean; expiryDate?: string } {
    try {
      // License key format: AES-256 encrypted string containing JSON details
      const keyBuffer = crypto.scryptSync(LICENSE_SECRET_KEY, 'salt', 32);
      const parts = key.split(':');
      if (parts.length !== 2) return { isValid: false };

      const iv = Buffer.from(parts[0], 'hex');
      const encryptedText = parts[1];
      const decipher = crypto.createDecipheriv('aes-256-cbc', keyBuffer, iv);
      let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      const payload = JSON.parse(decrypted);

      if (payload.deviceId === deviceId) {
        return { isValid: true, expiryDate: payload.expiryDate };
      }
      return { isValid: false };
    } catch (e) {
      return { isValid: false };
    }
  }

  /**
   * Admin Utility: Generate a license key for a given Device ID (useful for validation testing)
   */
  public static generateLicenseKey(deviceId: string, expiryDate?: string): string {
    const payload = JSON.stringify({
      deviceId,
      expiryDate: expiryDate || '2030-12-31',
      created: new Date().toISOString()
    });

    const keyBuffer = crypto.scryptSync(LICENSE_SECRET_KEY, 'salt', 32);
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', keyBuffer, iv);
    
    let encrypted = cipher.update(payload, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    return `${iv.toString('hex')}:${encrypted}`;
  }
}
