import * as crypto from 'crypto';
import { execSync } from 'child_process';
import { BrowserWindow } from 'electron';
import type { LicenseStatus } from '../../shared/ipc-api';
import { BaseRepository } from '../repositories/base.repository';

const BUNDLED_PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA8cVRdsdhs8iNByr2GhXV
vKWSqyi83iFlNK289Me9IIJS3dRRGihlHii416qYPph5lJKrY3HkzHsn/prKuzJY
Y8I0HfBBYEz9TO2M14bFZrwWUIeCNkAgyNH7i6NNQRsIYWeo18TrFLJMV6KX/bKM
7vrzbT+Uh9cvncn9O0r29rN6KrXOMG2u6Kh+a/FMlLrZzyNrA0CAUsc1lXQBbLDX
pmAsCjeu2bcNFQ311/3hzoWt71dgu0HY2hoa6RlJ4Sqt40GKanBh+eRHhwfg3yro
udmyEt0CVUtqtvV1LG9y4f/u5FFxGEw3WMuZWQQOC47uU4CV8NQc7wI1OyyT0XQh
1QIDAQAB
-----END PUBLIC KEY-----`;

const SERVER_BASE_URL = 'http://localhost:3003';

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
   * Hardware fingerprint parameters object for server registration
   */
  private getDeviceFingerprint(): any {
    let cpuId = 'CPU-GENERIC';
    let mbSerial = 'MB-GENERIC';
    let diskSerial = 'DISK-GENERIC';
    let machineGuid = 'GUID-GENERIC';

    try {
      if (process.platform === 'win32') {
        try { cpuId = execSync('powershell -NoProfile -Command "Get-CimInstance Win32_Processor | Select-Object -ExpandProperty ProcessorId"').toString().trim(); } catch (e) {}
        try { mbSerial = execSync('powershell -NoProfile -Command "Get-CimInstance Win32_BaseBoard | Select-Object -ExpandProperty SerialNumber"').toString().trim(); } catch (e) {}
        try { diskSerial = execSync('powershell -NoProfile -Command "Get-CimInstance Win32_DiskDrive | Where-Object { $_.Index -eq 0 } | Select-Object -ExpandProperty SerialNumber"').toString().trim(); } catch (e) {}
        try {
          const guidOut = execSync('REG QUERY HKLM\\SOFTWARE\\Microsoft\\Cryptography /v MachineGuid').toString();
          const match = guidOut.match(/MachineGuid\s+REG_SZ\s+([a-fA-F0-9-]+)/);
          if (match && match[1]) machineGuid = match[1];
        } catch (e) {}
      } else {
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
    } catch (e) {}

    return {
      cpuId,
      motherboardSerial: mbSerial,
      diskSerial,
      machineGuid,
      osPlatform: process.platform
    };
  }

  /**
   * Symmetrically encrypts active tokens locally using GCM with hardware fingerprint key
   */
  private encryptToken(token: string, deviceId: string): string {
    const algorithm = 'aes-256-gcm';
    const key = crypto.scryptSync(deviceId, 'local-salt-jewel-erp', 32);
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv(algorithm, key, iv);
    
    let encrypted = cipher.update(token, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');
    
    return `${iv.toString('hex')}:${encrypted}:${authTag}`;
  }

  /**
   * Decrypts locally stored token using GCM
   */
  private decryptToken(encryptedData: string, deviceId: string): string {
    const algorithm = 'aes-256-gcm';
    const key = crypto.scryptSync(deviceId, 'local-salt-jewel-erp', 32);
    const parts = encryptedData.split(':');
    
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted token format');
    }
    
    const iv = Buffer.from(parts[0], 'hex');
    const encryptedText = parts[1];
    const authTag = Buffer.from(parts[2], 'hex');
    
    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }

  /**
   * Validates JWT token signature (RS256) and parses claims
   */
  private verifyJwt(token: string): { isValid: boolean; payload?: any } {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return { isValid: false };

      const [headerB64, payloadB64, signatureB64] = parts;
      const verify = crypto.createVerify('SHA256');
      verify.update(`${headerB64}.${payloadB64}`);
      
      const signature = Buffer.from(signatureB64, 'base64url');
      const isValid = verify.verify(BUNDLED_PUBLIC_KEY, signature);
      
      if (!isValid) return { isValid: false };

      const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
      return { isValid: true, payload };
    } catch (e) {
      return { isValid: false };
    }
  }

  /**
   * Inspects license status from local sqlite database
   */
  public getLicenseStatus(): LicenseStatus {
    const deviceId = this.getDeviceId();
    
    try {
      const row = this.db.prepare('SELECT * FROM license_info ORDER BY id DESC LIMIT 1').get() as {
        license_key: string | null;
        device_id: string;
        activation_date: string | null;
        expiry_date: string | null;
        license_type: string;
        activation_token: string | null;
        trial_started_at: string | null;
        trial_expiry_at: string | null;
        last_verified_at: string | null;
        last_active_time: string | null;
      } | undefined;

      if (!row) {
        return { activated: false, deviceId, statusMessage: 'No license activated. Please activate or start a trial.' };
      }

      const now = new Date();

      // 1. Clock Tampering Prevention
      if (row.last_active_time) {
        const lastActive = new Date(row.last_active_time);
        if (now < lastActive) {
          return {
            activated: false,
            deviceId,
            statusMessage: 'SYSTEM CLOCK ERROR: Clock rollback detected. Please restore correct system time.'
          };
        }
      }

      // Update last active time to current time periodically
      this.db.prepare('UPDATE license_info SET last_active_time = ? WHERE id = 1').run(now.toISOString());

      // 2. Handle Trial Flow
      if (row.license_type === 'trial') {
        if (!row.trial_expiry_at) {
          return { activated: false, deviceId, statusMessage: 'Trial not initialized correctly.' };
        }

        const expiry = new Date(row.trial_expiry_at);
        if (now > expiry) {
          return {
            activated: false,
            deviceId,
            expiryDate: row.trial_expiry_at,
            statusMessage: 'Free evaluation trial has expired. Commercial license activation is required.'
          };
        }

        const remainingDays = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        return {
          activated: false,
          deviceId,
          expiryDate: row.trial_expiry_at,
          isTrialActive: true,
          statusMessage: `Trial Mode: ${remainingDays} days remaining.`
        };
      }

      // 3. Handle Commercial License (Lifetime / Subscription)
      if (!row.activation_token) {
        return { activated: false, deviceId, statusMessage: 'Activation token is missing.' };
      }

      // Decrypt token
      let token: string;
      try {
        token = this.decryptToken(row.activation_token, deviceId);
      } catch (err) {
        return { activated: false, deviceId, statusMessage: 'Tampered local activation credentials detected.' };
      }

      // Verify JWT Claims & Signatures
      const jwtResult = this.verifyJwt(token);
      if (!jwtResult.isValid || !jwtResult.payload) {
        return { activated: false, deviceId, statusMessage: 'Invalid activation signature.' };
      }

      const payload = jwtResult.payload;

      // Verify device match
      if (payload.deviceId !== deviceId) {
        return { activated: false, deviceId, statusMessage: 'License is bound to another hardware computer.' };
      }

      // Verify Expiry (For subscriptions)
      if (payload.expiryDate) {
        const expiry = new Date(payload.expiryDate);
        if (now > expiry) {
          return {
            activated: false,
            deviceId,
            licenseKey: row.license_key || undefined,
            expiryDate: payload.expiryDate,
            statusMessage: 'Subscription license key has expired.'
          };
        }
      }

      // Background verification attempt (every 30 days)
      this.attemptBackgroundVerification(row.license_key, row.activation_token, row.last_verified_at);

      return {
        activated: true,
        deviceId,
        licenseKey: row.license_key || undefined,
        activationDate: row.activation_date || undefined,
        expiryDate: payload.expiryDate || undefined,
        statusMessage: payload.licenseType === 'lifetime' ? 'Lifetime Premium License' : 'Subscription Active License'
      };

    } catch (e) {
      console.error(e);
      return { activated: false, deviceId: this.getDeviceId(), statusMessage: 'Database error reading license configuration.' };
    }
  }

  /**
   * Starts a 3-Day Trial by requesting from the backend
   */
  public async startTrial(): Promise<LicenseStatus> {
    const deviceId = this.getDeviceId();
    const fp = this.getDeviceFingerprint();

    try {
      const response = await fetch(`${SERVER_BASE_URL}/api/v1/trial/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceFingerprint: fp })
      });

      const data = (await response.json()) as any;

      if (!response.ok || !data.success) {
        return { activated: false, deviceId, statusMessage: data.message || 'Failed to start free trial.' };
      }

      // Save trial locally
      const nowStr = new Date().toISOString();
      
      this.db.prepare('DELETE FROM license_info').run();
      this.db.prepare(`
        INSERT INTO license_info (license_key, device_id, license_type, trial_started_at, trial_expiry_at, last_active_time)
        VALUES ('TRIAL', ?, 'trial', ?, ?, ?)
      `).run(deviceId, nowStr, data.expiryDate, nowStr);

      return this.getLicenseStatus();
    } catch (err: any) {
      return { activated: false, deviceId, statusMessage: `Network error connecting to licensing server: ${err.message}` };
    }
  }

  /**
   * Core Activation Flow: Submits key to server, retrieves JWT, GCM-encrypts it, and saves locally
   */
  public async activateLicense(key: string): Promise<LicenseStatus> {
    const deviceId = this.getDeviceId();
    const fp = this.getDeviceFingerprint();

    try {
      const response = await fetch(`${SERVER_BASE_URL}/api/v1/license/activate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ licenseKey: key, deviceFingerprint: fp })
      });

      const data = (await response.json()) as any;

      if (!response.ok || !data.success) {
        return { activated: false, deviceId, statusMessage: data.message || 'Activation rejected.' };
      }

      // Encrypt JWT token symmetrically bound to local HW GCM
      const encryptedToken = this.encryptToken(data.activationToken, deviceId);
      const nowStr = new Date().toISOString();

      this.db.prepare('DELETE FROM license_info').run();
      this.db.prepare(`
        INSERT INTO license_info (license_key, device_id, activation_date, expiry_date, license_type, activation_token, last_verified_at, last_active_time)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(key, deviceId, nowStr, data.licenseDetails.expiryDate || null, data.licenseDetails.licenseType, encryptedToken, nowStr, nowStr);

      return this.getLicenseStatus();
    } catch (err: any) {
      return { activated: false, deviceId, statusMessage: `Network activation failed: ${err.message}` };
    }
  }

  /**
   * Restores an existing activation token (OS reinstall recovery)
   */
  public async recoverLicense(key?: string, mobile?: string): Promise<LicenseStatus> {
    const deviceId = this.getDeviceId();
    const fp = this.getDeviceFingerprint();

    try {
      const response = await fetch(`${SERVER_BASE_URL}/api/v1/license/recover`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ licenseKey: key, mobileNumber: mobile, deviceFingerprint: fp })
      });

      const data = (await response.json()) as any;

      if (!response.ok || !data.success) {
        return { activated: false, deviceId, statusMessage: data.message || 'License recovery failed.' };
      }

      const encryptedToken = this.encryptToken(data.activationToken, deviceId);
      const nowStr = new Date().toISOString();

      this.db.prepare('DELETE FROM license_info').run();
      this.db.prepare(`
        INSERT INTO license_info (license_key, device_id, activation_date, license_type, activation_token, last_verified_at, last_active_time)
        VALUES (?, ?, ?, 'lifetime', ?, ?, ?)
      `).run(key || 'RECOVERED_KEY', deviceId, nowStr, encryptedToken, nowStr, nowStr);

      return this.getLicenseStatus();
    } catch (err: any) {
      return { activated: false, deviceId, statusMessage: `Recovery connection failed: ${err.message}` };
    }
  }

  /**
   * Requests a hardware device change (transfer) from support
   */
  public async requestTransfer(key: string, reason: string): Promise<LicenseStatus> {
    const deviceId = this.getDeviceId();
    const fp = this.getDeviceFingerprint();

    try {
      const response = await fetch(`${SERVER_BASE_URL}/api/v1/license/transfer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ licenseKey: key, reason, newDeviceFingerprint: fp })
      });

      const data = (await response.json()) as any;
      return {
        activated: false,
        deviceId,
        statusMessage: data.message || 'Transfer request submitted.'
      };
    } catch (err: any) {
      return { activated: false, deviceId, statusMessage: `Request failed to send: ${err.message}` };
    }
  }

  /**
   * Background verify check: called automatically on boot or every 30 days
   */
  private async attemptBackgroundVerification(key: string | null, encryptedToken: string, lastVerifiedStr: string | null) {
    if (!key) return;

    const now = new Date();
    // Actively verify license status in background to prevent suspended licenses from remaining active
    console.log('Actively verifying license status in background...');
    try {
      const decryptedToken = this.decryptToken(encryptedToken, this.getDeviceId());
      const response = await fetch(`${SERVER_BASE_URL}/api/v1/license/verify`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${decryptedToken}`
        }
      });

      const data = (await response.json()) as any;

      if (response.ok && data.success) {
        // Success: Update verified at date
        this.db.prepare('UPDATE license_info SET last_verified_at = ? WHERE id = 1').run(now.toISOString());
        console.log('Background check successful.');
      } else {
        // License was suspended or key deleted
        console.warn('Background check returned invalid or revoked license key:', data.message);
        this.db.prepare('DELETE FROM license_info').run();
        
        // Notify renderer to immediately lock out the application
        for (const win of BrowserWindow.getAllWindows()) {
          win.webContents.send('license-invalidated');
        }
      }
    } catch (err) {
      // If internet unavailable, fail silently (do not block genuine customer)
      console.warn('Licensing server unreachable for 30-day check. Continuing offline usage.', err);
    }
  }
}
