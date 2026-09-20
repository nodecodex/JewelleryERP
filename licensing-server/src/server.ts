import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import jwt from 'jsonwebtoken';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { initDatabase } from './db';
import { Customer, License, DeviceRegistry, LicenseActivation, TrialUser, LicenseTransferRequest, LicenseRecoveryLog, AuditLog, AdminUser } from './models';
import mongoose from 'mongoose';
import { generateKeyPair } from './keys/generateKeys';
import { DeviceFingerprintSchema, DeviceFingerprint } from './types';
import helmet from 'helmet';
import hpp from 'hpp';
import argon2 from 'argon2';

// ── Admin Portal Configuration ──────────────────────────
const ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET;

if (!ADMIN_JWT_SECRET) {
  console.error('CRITICAL: Admin portal secret (ADMIN_JWT_SECRET) must be set in .env');
  process.exit(1);
}

const DEFAULT_PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA8cVRdsdhs8iNByr2GhXV
vKWSqyi83iFlNK289Me9IIJS3dRRGihlHii416qYPph5lJKrY3HkzHsn/prKuzJY
Y8I0HfBBYEz9TO2M14bFZrwWUIeCNkAgyNH7i6NNQRsIYWeo18TrFLJMV6KX/bKM
7vrzbT+Uh9cvncn9O0r29rN6KrXOMG2u6Kh+a/FMlLrZzyNrA0CAUsc1lXQBbLDX
pmAsCjeu2bcNFQ311/3hzoWt71dgu0HY2hoa6RlJ4Sqt40GKanBh+eRHhwfg3yro
udmyEt0CVUtqtvV1LG9y4f/u5FFxGEw3WMuZWQQOC47uU4CV8NQc7wI1OyyT0XQh
1QIDAQAB
-----END PUBLIC KEY-----`;

const DEFAULT_PRIVATE_KEY = `-----BEGIN PRIVATE KEY-----
MIIEugIBADANBgkqhkiG9w0BAQEFAASCBKQwggSgAgEAAoIBAQDxxVF2x2GzyI0H
KvYaFdW8pZKrKLzeIWU0rbz0x70gglLd1FEaKGUeKLjXqpg+mHmUkqtjceTMeyf+
msq7MlhjwjQd8EFgTP1M7YzXhsVmvBZQh4I2QCDI0fuLo01BGwhhZ6jXxOsUskxX
opf9sozu+vNtP5SH1y+dyf07Svb2s3oqtc4wba7oqH5r8UyUutnPI2sDQIBSxzWV
dAFssNemYCwKN67Ztw0VDfXX/eHOha3vV2C7QdjaGhrpGUnhKq3jQYpqcGH55EeH
B+DfKui52bIS3QJVS2q29XUsb3Lh/+7kUXEYTDdYy5lZBA4Lju5TgJXw1BzvAjU7
LJPRdCHVAgMBAAECgf8YjfG4HofNupCYKcTU4WLTxf0fZQPJi5q7vulx8tdCdfn0
jZuvDGs4pOog/TJ5KQMwE7VUZDzYh6mIMjBk0rgnaZHheIUrQqZ3KakkOovR40hg
5WJUIC80Nh9WDz/JXPV87wo238kAURtvyxOksH2fx9zxO4PaSACOBfWyD+sFIwK4
SoNH9tCiFY6Ggd3SDRZqbVW3itCGGAyH08i7A5cjw7kTHf5zaSO7QexzxOvYEikY
HR9MpfIr9nX+lE1y20TAB6Qs0ysvJfyN/Y6RZDJQeYw2ij3jnsZitsGBYdKtjcDT
tbx4s++yv9o6jLpCKP2b3NdgkX1+PZvRGvXpDzkCgYEA/0UMUYCEIbrgITUhbOia
O+7TUnB7eRmO0EuvatlpmqKu1wUEokQeQZT7ZSTquXwhIARg4087Gdx81FKqUuFp
hQRqWjnkICa8+V3Gup0456YWKfgqSrKCjngxZh3Rb1+KeLhQ541D5l55XPluIa0C
XyBjiJ39IrxSZA2fyquuXmcCgYEA8nZiRdKZ1hE8pfsayMChhZZSjU8OkGtaJA/o
39owYuKo1pp3S+o6Xcruk4623VxQ0TcIDQvTGWD5ghYJlEMcjzSEkKIckIFDKbNT
vkxM8Eg7Cy2G2suHPqZCqm+4Ua/7D/Y2EZpmwy6lbdHHlaST8++id0T10jVWMxLT
5ogJYGMCgYAsjTJ/Lvzgnirr4Mf6qAXzG9WJ99O06P8B35O4BEXoFSiKoneSkmzt
aUEPAAhvYvitC9aVFYjtFIw8ykirumeeLY0aPixQaDJnGzTJ8RKza0tG++b1rn4W
u2dzuRSKaZRTSWflYcRN+oMX9PiBrB5T1+VHPLunSlLe33nZ92ixVQKBgAGRkoEx
I52m7uWEAmBaHrFmj5IqeMWmbCbfk3ofR0Dchosc5LixAz+oGHML8VLtTfiMipjL
AsqfPf4Bdn5nEMA8br8gzV6B95VFe703cSf8z6T63mx79JwLJ1NC9cZRhSZNSXxD
q3aHzrovKUNmlS521m4/G/gIME6USJqtNqJRAoGAYOt9yp/TFBvndi/MwqC+7NAl
FjfPKQhOsWEvpajlj4SjIgJGOA2iiVZ7CZ/lQOSG/ZJkwryFsYB+kz2cw9jOi8oE
hPpMG9TDXQ+TxcnpDkJDjmlSVPzDLIxYNZ0FRFChQErMDBR6OpExkpy+zz1p8zIo
987798jkTm++/dSwybE=
-----END PRIVATE KEY-----`;

function loadKeys(): { privateKey: string; publicKey: string } {
  if (process.env.RSA_PRIVATE_KEY && process.env.RSA_PUBLIC_KEY) {
    return {
      privateKey: process.env.RSA_PRIVATE_KEY.replace(/\\n/g, '\n'),
      publicKey: process.env.RSA_PUBLIC_KEY.replace(/\\n/g, '\n')
    };
  }

  const possiblePaths = [
    path.join(__dirname, 'keys'),
    path.join(__dirname, '../src/keys'),
    path.join(process.cwd(), 'src/keys'),
    path.join(process.cwd(), 'dist/keys'),
    path.join(process.cwd(), 'keys')
  ];

  for (const dir of possiblePaths) {
    const priv = path.join(dir, 'private.pem');
    const pub = path.join(dir, 'public.pem');
    if (fs.existsSync(priv) && fs.existsSync(pub)) {
      try {
        return {
          privateKey: fs.readFileSync(priv, 'utf8'),
          publicKey: fs.readFileSync(pub, 'utf8')
        };
      } catch (e) { }
    }
  }

  return {
    privateKey: DEFAULT_PRIVATE_KEY,
    publicKey: DEFAULT_PUBLIC_KEY
  };
}

const { privateKey, publicKey } = loadKeys();

const app = express();
app.set('trust proxy', 1);

// Global middleware to ensure DB connection is active (useful for Vercel serverless)
app.use(async (req: Request, res: Response, next: NextFunction) => {
  try {
    await initDatabase();
    next();
  } catch (e) {
    res.status(500).json({ success: false, error: 'Database connection failed' });
  }
});

app.use((req, res, next) => {
  // Allow inline JS/CSS for the admin portal HTML page
  if (req.path === '/admin') {
    return helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'"],
          scriptSrcAttr: ["'unsafe-inline'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          connectSrc: ["'self'"],
        }
      }
    })(req, res, next);
  }
  return helmet()(req, res, next);
});
app.use(cors({
  origin: ['http://localhost:5173', 'app://.', 'file://'],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '10kb' }));
app.use(hpp()); // Prevent HTTP Parameter Pollution

// Port definition
const PORT = process.env.PORT || 3003;

// Rate Limiters
const activationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  message: { success: false, error: 'RATE_LIMIT_EXCEEDED', message: 'Too many activation attempts. Try again in 15 minutes.' }
});

const recoveryLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  message: { success: false, error: 'RATE_LIMIT_EXCEEDED', message: 'Too many recovery attempts. Try again in an hour.' }
});

// Helper to hash fingerprint parameters to device hash
function generateDeviceHash(fp: DeviceFingerprint): string {
  const rawString = `CPU:${fp.cpuId}|MB:${fp.motherboardSerial}|DISK:${fp.diskSerial}|GUID:${fp.machineGuid}`;
  return crypto.createHash('sha256').update(rawString).digest('hex').toUpperCase();
}

// Helper to register/match physical hardware
async function matchOrCreateDevice(fp: DeviceFingerprint) {
  const currentHash = generateDeviceHash(fp);

  // 1. Check if device exists by CPU ID + Motherboard + Disk (Physical identity match)
  const physicalMatch = await DeviceRegistry.findOne({
    cpu_id: fp.cpuId,
    motherboard_serial: fp.motherboardSerial,
    disk_serial: fp.diskSerial
  });

  if (physicalMatch) {
    // If MachineGuid or hash changed (e.g. Windows format), update registry
    if (physicalMatch.machine_guid !== fp.machineGuid || physicalMatch.device_hash !== currentHash) {
      physicalMatch.machine_guid = fp.machineGuid;
      physicalMatch.device_hash = currentHash;
      physicalMatch.os_platform = fp.osPlatform;
      await physicalMatch.save();
    }
    return physicalMatch;
  }

  // 2. If no physical components match, check by device_hash directly as fallback
  const hashMatch = await DeviceRegistry.findOne({ device_hash: currentHash });
  if (hashMatch) {
    return hashMatch;
  }

  // 3. Otherwise, create a new device registry entry
  const result = await DeviceRegistry.create({
    device_hash: currentHash,
    cpu_id: fp.cpuId,
    motherboard_serial: fp.motherboardSerial,
    disk_serial: fp.diskSerial,
    machine_guid: fp.machineGuid,
    os_platform: fp.osPlatform
  });
  return result;
}

// -------------------------------------------------------------
// HEALTH CHECK ENDPOINT
// -------------------------------------------------------------

app.get('/api/v1/health', async (_req: Request, res: Response): Promise<any> => {
  try {
    // Verify database connectivity
    const state = mongoose.connection.readyState;
    if (state !== 1) throw new Error('Database not connected');

    return res.status(200).json({
      success: true,
      status: 'healthy',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      database: {
        connected: true,
        serverTime: new Date()
      }
    });
  } catch (err: any) {
    return res.status(503).json({
      success: false,
      status: 'unhealthy',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      database: {
        connected: false,
        error: err.message || 'Database connection failed'
      }
    });
  }
});

// 0. GET /license/public-key
app.get('/api/v1/license/public-key', (req: Request, res: Response) => {
  res.json({ success: true, publicKey });
});

// 1. POST /trial/start
app.post('/api/v1/trial/start', async (req: Request, res: Response): Promise<any> => {
  try {
    const parsed = DeviceFingerprintSchema.safeParse(req.body.deviceFingerprint);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: 'INVALID_INPUT', message: 'Invalid device fingerprint payload.' });
    }

    const device = await matchOrCreateDevice(parsed.data);

    // Check if a trial already exists on this physical hardware device
    const existingTrial = await TrialUser.findOne({ device_id: device._id });
    if (existingTrial) {
      const trial = existingTrial;
      const now = new Date();
      const expiry = new Date(trial.expiry_date);

      if (now > expiry || trial.is_expired) {
        return res.status(400).json({
          success: false,
          error: 'TRIAL_ALREADY_EXHAUSTED',
          message: 'A trial has already been used and has expired on this computer hardware.'
        });
      }

      return res.json({
        success: true,
        status: 'trial_active',
        trialToken: trial.trial_token,
        publicKey,
        expiryDate: trial.expiry_date
      });
    }

    // Set trial duration to 3 days
    const installationDate = new Date();
    const expiryDate = new Date();
    expiryDate.setDate(installationDate.getDate() + 3);

    // Create Trial Signed JWT (RS256)
    const payload = {
      sub: 'trial-activation',
      deviceId: device.device_hash,
      licenseType: 'trial',
      expiryDate: expiryDate.toISOString(),
      iat: Math.floor(Date.now() / 1000)
    };

    const trialToken = jwt.sign(payload, privateKey, { algorithm: 'RS256', expiresIn: '3d' });

    // Store in DB
    await TrialUser.create({
      device_id: device._id,
      installation_date: installationDate,
      expiry_date: expiryDate,
      trial_token: trialToken
    });

    await AuditLog.create({
      action_type: 'TRIAL_STARTED',
      details: `Trial started for device: ${device.device_hash}`,
      performed_by: 'system'
    });

    return res.json({
      success: true,
      status: 'trial_active',
      trialToken,
      publicKey,
      expiryDate: expiryDate.toISOString()
    });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ success: false, error: 'SERVER_ERROR', message: err.message });
  }
});

// 2. POST /license/activate
app.post('/api/v1/license/activate', activationLimiter, async (req: Request, res: Response): Promise<any> => {
  try {
    const { licenseKey } = req.body;
    const parsedFp = DeviceFingerprintSchema.safeParse(req.body.deviceFingerprint);

    if (!licenseKey || !parsedFp.success) {
      return res.status(400).json({ success: false, error: 'INVALID_INPUT', message: 'License key and device fingerprint are required.' });
    }

    const device = await matchOrCreateDevice(parsedFp.data);

    // Verify License Key in Database
    const license = await License.findOne({ license_key: licenseKey });
    if (!license) {
      return res.status(404).json({ success: false, error: 'LICENSE_NOT_FOUND', message: 'The activation key entered is invalid.' });
    }

    if (license.status === 'suspended') {
      return res.status(403).json({ success: false, error: 'LICENSE_SUSPENDED', message: 'This license key has been suspended.' });
    }

    // Check device limits
    const activeActivations = await LicenseActivation.find({ license_id: license._id, is_active: true });

    const isAlreadyActivatedHere = activeActivations.some((act) => act.device_id.toString() === device._id.toString());

    if (!isAlreadyActivatedHere && activeActivations.length >= license.max_devices) {
      return res.status(403).json({
        success: false,
        error: 'LICENSE_LIMIT_EXCEEDED',
        message: `This license is already active on the maximum allowed devices (${license.max_devices}). Please request a device transfer.`
      });
    }

    // Fetch Customer Details
    const customerResult = await Customer.findById(license.customer_id);
    const customer = customerResult || { name: 'Valued Customer', mobile: 'Unknown' };

    // Generate RS256 JWT Activation Token
    const payload = {
      sub: 'license-activation',
      licenseKey: license.license_key,
      deviceId: device.device_hash,
      licenseType: license.license_type,
      expiryDate: license.expiry_date ? license.expiry_date.toISOString() : null,
      customer: {
        name: customer.name,
        mobile: customer.mobile
      },
      iat: Math.floor(Date.now() / 1000)
    };

    const activationToken = jwt.sign(payload, privateKey, { algorithm: 'RS256' });

    // Save/Update Activation
    await LicenseActivation.findOneAndUpdate(
      { license_id: license._id, device_id: device._id },
      { activation_token: activationToken, is_active: true, last_verified_at: new Date() },
      { upsert: true, new: true }
    );

    // Update license status to active
    license.status = 'active';
    await license.save();

    await AuditLog.create({
      action_type: 'LICENSE_ACTIVATED',
      details: `Key: ${license.license_key} activated on device: ${device.device_hash}`,
      performed_by: 'system'
    });

    return res.json({
      success: true,
      status: 'activated',
      activationToken,
      publicKey,
      licenseDetails: {
        customerName: customer.name,
        licenseType: license.license_type,
        activationDate: new Date().toISOString()
      }
    });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ success: false, error: 'SERVER_ERROR', message: err.message });
  }
});

// 3. POST /license/verify
app.post('/api/v1/license/verify', async (req: Request, res: Response): Promise<any> => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'UNAUTHORIZED', message: 'Token missing.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    // Verify JWT Signature
    const decoded = jwt.verify(token, publicKey, { algorithms: ['RS256'] }) as any;

    // Check key status in MongoDB
    const license = await License.findOne({ license_key: decoded.licenseKey });
    if (!license) {
      return res.status(401).json({ success: false, error: 'REVOKED', message: 'License key not found on server.' });
    }

    if (license.status === 'suspended') {
      return res.status(401).json({ success: false, error: 'SUSPENDED', message: 'License has been suspended.' });
    }

    // Update last verified at
    const device = await DeviceRegistry.findOne({ device_hash: decoded.deviceId });
    if (device) {
      await LicenseActivation.updateOne(
        { license_id: license._id, device_id: device._id },
        { last_verified_at: new Date() }
      );
    }

    return res.json({ success: true, status: 'active', message: 'License verified successfully.' });
  } catch (err: any) {
    return res.status(401).json({ success: false, error: 'INVALID_TOKEN', message: err.message });
  }
});

// 4. POST /license/recover
app.post('/api/v1/license/recover', recoveryLimiter, async (req: Request, res: Response): Promise<any> => {
  try {
    const { licenseKey, mobileNumber } = req.body;
    const parsedFp = DeviceFingerprintSchema.safeParse(req.body.deviceFingerprint);

    if (!parsedFp.success) {
      return res.status(400).json({ success: false, error: 'INVALID_INPUT', message: 'Device fingerprint is required.' });
    }

    // Try to match device by physical specs
    const device = await matchOrCreateDevice(parsedFp.data);

    // Lookup license
    let license = null;
    if (licenseKey) {
      license = await License.findOne({ license_key: licenseKey });
    } else if (mobileNumber) {
      const customer = await Customer.findOne({ mobile: mobileNumber });
      if (customer) {
        license = await License.findOne({ customer_id: customer._id });
      }
    } else {
      return res.status(400).json({ success: false, error: 'INVALID_INPUT', message: 'Provide either License Key or Registered Mobile Number.' });
    }

    if (!license) {
      return res.status(404).json({ success: false, error: 'LICENSE_NOT_FOUND', message: 'No registered purchase details matches.' });
    }

    // Determine if physical hardware matches the registered activation
    const activation = await LicenseActivation.findOne({ license_id: license._id, device_id: device._id });

    if (!activation) {
      // Hardware does not match the active installation database record
      await LicenseRecoveryLog.create({
        license_id: license._id,
        device_id: device._id,
        recovery_type: 'windows_reinstall',
        status: 'failed',
        ip_address: req.ip
      });
      return res.status(400).json({
        success: false,
        error: 'HARDWARE_MISMATCH',
        message: 'This device hardware characteristics do not match the registered activation. Please submit a Device Transfer Request.'
      });
    }

    // Reinstall recovery approved! Generate and return new JWT activation token
    const customer = await Customer.findById(license.customer_id) || { name: 'Valued Customer', mobile: 'Unknown' };

    const payload = {
      sub: 'license-activation',
      licenseKey: license.license_key,
      deviceId: device.device_hash,
      licenseType: license.license_type,
      expiryDate: license.expiry_date ? license.expiry_date.toISOString() : null,
      customer: {
        name: customer.name,
        mobile: customer.mobile
      },
      iat: Math.floor(Date.now() / 1000)
    };

    const activationToken = jwt.sign(payload, privateKey, { algorithm: 'RS256' });

    // Update activation record
    activation.activation_token = activationToken;
    activation.last_verified_at = new Date();
    activation.is_active = true;
    await activation.save();

    // Save recovery log
    await LicenseRecoveryLog.create({
      license_id: license._id,
      device_id: device._id,
      recovery_type: 'windows_reinstall',
      status: 'success',
      ip_address: req.ip
    });

    return res.json({
      success: true,
      status: 'recovered',
      activationToken,
      publicKey,
      message: 'Windows reinstall recovery approved! License restored.'
    });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ success: false, error: 'SERVER_ERROR', message: err.message });
  }
});

// 5. POST /license/transfer
app.post('/api/v1/license/transfer', async (req: Request, res: Response): Promise<any> => {
  try {
    const { licenseKey, reason } = req.body;
    const parsedNewFp = DeviceFingerprintSchema.safeParse(req.body.newDeviceFingerprint);

    if (!licenseKey || !reason || !parsedNewFp.success) {
      return res.status(400).json({ success: false, error: 'INVALID_INPUT', message: 'License key, reason, and new device fingerprint are required.' });
    }

    // Verify key
    const license = await License.findOne({ license_key: licenseKey });
    if (!license) {
      return res.status(404).json({ success: false, error: 'LICENSE_NOT_FOUND', message: 'License key is invalid.' });
    }

    // Find current active device
    const activeAct = await LicenseActivation.findOne({ license_id: license._id, is_active: true });

    if (!activeAct) {
      return res.status(400).json({ success: false, error: 'NO_ACTIVE_ACTIVATION', message: 'No active device bound to this key to transfer from.' });
    }

    const oldDeviceId = activeAct.device_id;

    // Register new device fingerprint
    const newDevice = await matchOrCreateDevice(parsedNewFp.data);

    if (oldDeviceId.toString() === newDevice._id.toString()) {
      return res.status(400).json({ success: false, error: 'SAME_DEVICE', message: 'This device is already active for this license.' });
    }

    // Enforce reset limits: Max 2 resets per year
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    
    const limit = await LicenseTransferRequest.countDocuments({
      license_id: license._id,
      status: 'approved',
      processed_at: { $gte: oneYearAgo }
    });

    if (limit >= 2) {
      return res.status(403).json({
        success: false,
        error: 'TRANSFER_LIMIT_REACHED',
        message: 'You have reached the maximum allowed hardware transfers (2 per year). Please contact enterprise support.'
      });
    }

    // Insert pending request
    await LicenseTransferRequest.create({
      license_id: license._id,
      old_device_id: oldDeviceId,
      new_device_id: newDevice._id,
      reason,
      status: 'pending'
    });

    await AuditLog.create({
      action_type: 'TRANSFER_REQUESTED',
      details: `Transfer request registered for key: ${license.license_key} to new device: ${newDevice.device_hash}`,
      performed_by: 'system'
    });

    return res.json({
      success: true,
      status: 'transfer_pending_approval',
      message: 'Hardware transfer request submitted. Enterprise Admin review and approval is required.'
    });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ success: false, error: 'SERVER_ERROR', message: err.message });
  }
});

// 6. POST /license/status
app.post('/api/v1/license/status', async (req: Request, res: Response): Promise<any> => {
  try {
    const { licenseKey } = req.body;
    if (!licenseKey) return res.status(400).json({ success: false, message: 'Key required.' });

    const license = await License.findOne({ license_key: licenseKey });
    if (!license) return res.status(404).json({ success: false, message: 'Key not found.' });

    const actRes = await LicenseActivation.find({ license_id: license._id, is_active: true }).populate('device_id');

    return res.json({
      success: true,
      licenseKey: license.license_key,
      type: license.license_type,
      status: license.status,
      maxDevices: license.max_devices,
      activations: actRes.map((row: any) => ({
        deviceHash: row.device_id.device_hash,
        activationDate: row.activation_date,
        lastSeen: row.last_verified_at
      }))
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// -------------------------------------------------------------
// ADMIN API ENDPOINTS (For Dashboard Control)
// -------------------------------------------------------------

// ── Admin Auth Middleware (JWT Bearer token from login) ─────────
function adminAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'UNAUTHORIZED', message: 'Admin authentication required.' });
    return;
  }
  const token = authHeader.split(' ')[1];
  try {
    const payload = jwt.verify(token, ADMIN_JWT_SECRET!) as any;
    if (payload.role !== 'admin') {
      res.status(403).json({ error: 'FORBIDDEN', message: 'Insufficient privileges.' });
      return;
    }
    next();
  } catch (err: any) {
    res.status(401).json({ error: 'INVALID_TOKEN', message: 'Session expired or invalid. Please log in again.' });
  }
}

// ── POST /admin/login ────────────────────────────────────────────
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'RATE_LIMITED', message: 'Too many login attempts. Try again in 15 minutes.' }
});

app.post('/admin/login', loginLimiter, async (req: Request, res: Response): Promise<void> => {
  const { username, password } = req.body;
  if (!username || !password) {
    res.status(400).json({ error: 'INVALID_INPUT', message: 'Username and password are required.' });
    return;
  }
  
  try {
    const adminUser = await AdminUser.findOne({ username });
    if (!adminUser) {
      res.status(401).json({ error: 'INVALID_CREDENTIALS', message: 'Incorrect username or password.' });
      return;
    }

    const validPassword = await argon2.verify(adminUser.passwordHash, password);
    if (!validPassword) {
      res.status(401).json({ error: 'INVALID_CREDENTIALS', message: 'Incorrect username or password.' });
      return;
    }
    
    const token = jwt.sign({ role: adminUser.role, sub: username }, ADMIN_JWT_SECRET!, { expiresIn: '8h' });
    res.json({ success: true, token, expiresIn: '8h' });
  } catch (err: any) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

// ── GET /admin/logout (clears client token - informational) ──────
app.get('/admin/logout', (_req: Request, res: Response): void => {
  res.json({ success: true, message: 'Logged out. Please clear your session token.' });
});

// GET /admin/dashboard-stats
app.get('/api/v1/admin/dashboard-stats', adminAuth, async (req: Request, res: Response) => {
  try {
    const totalCommercial = await License.countDocuments({ license_type: { $ne: 'trial' } });
    const activeCommercial = await License.countDocuments({ status: 'active' });
    const trialUsers = await TrialUser.countDocuments({ is_expired: false });
    const expiredTrials = await TrialUser.countDocuments({
      $or: [{ is_expired: true }, { expiry_date: { $lt: new Date() } }]
    });
    const pendingTransfers = await LicenseTransferRequest.countDocuments({ status: 'pending' });

    res.json({
      totalCommercial,
      activeCommercial,
      trialUsers,
      expiredTrials,
      pendingTransfers
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /admin/customers
app.get('/api/v1/admin/customers', adminAuth, async (req: Request, res: Response) => {
  try {
    const result = await Customer.find().sort({ createdAt: -1 });
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /admin/customers
app.post('/api/v1/admin/customers', adminAuth, async (req: Request, res: Response) => {
  const { name, mobile, email } = req.body;
  try {
    const customer = await Customer.create({ name, mobile, email });
    res.status(201).json(customer);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /admin/licenses
app.get('/api/v1/admin/licenses', adminAuth, async (req: Request, res: Response) => {
  try {
    const licenses = await License.find().populate('customer_id').sort({ createdAt: -1 }).lean();
    const result = licenses.map((l: any) => ({
      ...l,
      customer_name: l.customer_id?.name || null,
      customer_mobile: l.customer_id?.mobile || null
    }));
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /admin/licenses/generate
app.post('/api/v1/admin/licenses/generate', adminAuth, async (req: Request, res: Response) => {
  const { customerId, licenseType, maxDevices, expiryDays } = req.body;
  try {
    // Generate unique license key SPERP-XXXX-XXXX-XXXX-XXXX
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Avoid ambiguous chars
    const blockGen = () => Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    const licenseKey = `SPERP-${blockGen()}-${blockGen()}-${blockGen()}-${blockGen()}`;

    let expiryDate: Date | undefined = undefined;
    if (expiryDays) {
      expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + parseInt(expiryDays));
    }

    const license = await License.create({
      customer_id: customerId,
      license_key: licenseKey,
      license_type: licenseType || 'lifetime',
      max_devices: maxDevices || 1,
      expiry_date: expiryDate,
      status: 'issued'
    });

    await AuditLog.create({
      action_type: 'LICENSE_GENERATED',
      details: `Generated key: ${licenseKey} for Customer ID: ${customerId}`,
      performed_by: 'admin'
    });

    res.status(201).json(license);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /admin/transfers
app.get('/api/v1/admin/transfers', adminAuth, async (req: Request, res: Response) => {
  try {
    const transfers = await LicenseTransferRequest.find()
      .populate('license_id')
      .populate('old_device_id')
      .populate('new_device_id')
      .sort({ requested_at: -1 })
      .lean();
      
    const result = transfers.map((r: any) => ({
      ...r,
      license_key: r.license_id?.license_key,
      old_device_hash: r.old_device_id?.device_hash,
      new_device_hash: r.new_device_id?.device_hash
    }));
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /admin/transfers/approve
app.post('/api/v1/admin/transfers/approve', adminAuth, async (req: Request, res: Response): Promise<any> => {
  const { requestId, adminNote } = req.body;
  if (!requestId) return res.status(400).json({ error: 'Request ID is required.' });

  try {
    // 1. Fetch details
    const transfer = await LicenseTransferRequest.findById(requestId);
    if (!transfer) return res.status(404).json({ error: 'Transfer request not found.' });

    if (transfer.status !== 'pending') {
      return res.status(400).json({ error: 'Transfer request is already processed.' });
    }

    // 2. Deactivate the old device activation
    await LicenseActivation.updateMany(
      { license_id: transfer.license_id, device_id: transfer.old_device_id },
      { is_active: false }
    );

    // 3. Mark request as approved
    transfer.status = 'approved';
    transfer.processed_at = new Date();
    transfer.processed_by = 'admin';
    transfer.admin_note = adminNote || 'Approved via Admin Panel';
    await transfer.save();

    // 4. Record Audit Log
    await AuditLog.create({
      action_type: 'TRANSFER_APPROVED',
      details: `Approved transfer from old device: ${transfer.old_device_id} to new device: ${transfer.new_device_id}`,
      performed_by: 'admin'
    });

    res.json({ success: true, message: 'Transfer request approved successfully.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /admin/transfers/reject
app.post('/api/v1/admin/transfers/reject', adminAuth, async (req: Request, res: Response): Promise<any> => {
  const { requestId, adminNote } = req.body;
  if (!requestId) return res.status(400).json({ error: 'Request ID is required.' });

  try {
    await LicenseTransferRequest.findByIdAndUpdate(requestId, {
      status: 'rejected',
      processed_at: new Date(),
      processed_by: 'admin',
      admin_note: adminNote || 'Rejected via Admin Panel'
    });
    res.json({ success: true, message: 'Transfer request rejected successfully.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /admin/licenses/deactivate
app.post('/api/v1/admin/licenses/deactivate', adminAuth, async (req: Request, res: Response): Promise<any> => {
  const { licenseId, adminNote } = req.body;
  try {
    await License.findByIdAndUpdate(licenseId, { status: 'suspended' });
    await LicenseActivation.updateMany({ license_id: licenseId }, { is_active: false });
    await AuditLog.create({
      action_type: 'LICENSE_SUSPENDED',
      details: `Suspended license ID: ${licenseId}. Reason: ${adminNote || 'None'}`,
      performed_by: 'admin'
    });
    res.json({ success: true, message: 'License key suspended and all active activations disabled.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /admin/trials
app.get('/api/v1/admin/trials', adminAuth, async (req: Request, res: Response) => {
  try {
    const trials = await TrialUser.find().populate('device_id').sort({ installation_date: -1 }).lean();
    const result = trials.map((t: any) => ({
      ...t,
      device_hash: t.device_id?.device_hash,
      os_platform: t.device_id?.os_platform
    }));
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /admin/audit-logs
app.get('/api/v1/admin/audit-logs', adminAuth, async (req: Request, res: Response) => {
  try {
    const result = await AuditLog.find().sort({ createdAt: -1 }).limit(100);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Serve Admin UI Dashboard single-page web app
app.get('/admin', (req: Request, res: Response) => {
  const htmlPath = path.join(__dirname, 'admin-dashboard.html');
  if (fs.existsSync(htmlPath)) {
    res.sendFile(htmlPath);
  } else {
    // Generate dashboard fallback dynamically
    res.send('Admin Dashboard file not compiled yet.');
  }
});

// Boot Database & Web server locally
async function startServer() {
  try {
    await initDatabase();
    app.listen(PORT, () => {
      console.log(`Licensing server running at http://localhost:${PORT}`);
    });
  } catch (e) {
    console.error('Server startup failed due to database error:', e);
  }
}

// Only start the server if not running on Vercel
if (!process.env.VERCEL) {
  startServer();
}

export default app;
