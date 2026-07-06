import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import jwt from 'jsonwebtoken';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import pool, { initDatabase } from './db';
import { generateKeyPair } from './keys/generateKeys';
import { DeviceFingerprintSchema, DeviceFingerprint } from './types';
import helmet from 'helmet';
import hpp from 'hpp';
import argon2 from 'argon2';

// ── Admin Portal Credentials (from .env) ──────────────────────────
const ADMIN_USERNAME   = process.env.ADMIN_USERNAME;
const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH;
const ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET;

if (!ADMIN_USERNAME || !ADMIN_PASSWORD_HASH || !ADMIN_JWT_SECRET) {
  console.error('CRITICAL: Admin portal credentials (ADMIN_USERNAME, ADMIN_PASSWORD_HASH, ADMIN_JWT_SECRET) must be set in .env');
  process.exit(1);
}

const keysDir = path.join(__dirname, 'keys');
const privateKeyPath = path.join(keysDir, 'private.pem');
const publicKeyPath = path.join(keysDir, 'public.pem');

if (!fs.existsSync(privateKeyPath) || !fs.existsSync(publicKeyPath)) {
  console.log('Keys missing. Bootstrapping RSA keypair generation...');
  generateKeyPair();
}

const privateKey = fs.readFileSync(privateKeyPath, 'utf8');
const publicKey = fs.readFileSync(publicKeyPath, 'utf8');

const app = express();
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
  const physicalMatch = await pool.query(
    'SELECT * FROM device_registry WHERE cpu_id = $1 AND motherboard_serial = $2 AND disk_serial = $3',
    [fp.cpuId, fp.motherboardSerial, fp.diskSerial]
  );

  if (physicalMatch.rows.length > 0) {
    const existing = physicalMatch.rows[0];
    // If MachineGuid or hash changed (e.g. Windows format), update registry
    if (existing.machine_guid !== fp.machineGuid || existing.device_hash !== currentHash) {
      const updated = await pool.query(
        'UPDATE device_registry SET machine_guid = $1, device_hash = $2, os_platform = $3, updated_at = NOW() WHERE id = $4 RETURNING *',
        [fp.machineGuid, currentHash, fp.osPlatform, existing.id]
      );
      return updated.rows[0];
    }
    return existing;
  }

  // 2. If no physical components match, check by device_hash directly as fallback
  const hashMatch = await pool.query('SELECT * FROM device_registry WHERE device_hash = $1', [currentHash]);
  if (hashMatch.rows.length > 0) {
    return hashMatch.rows[0];
  }

  // 3. Otherwise, create a new device registry entry
  const result = await pool.query(
    `INSERT INTO device_registry (device_hash, cpu_id, motherboard_serial, disk_serial, machine_guid, os_platform)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [currentHash, fp.cpuId, fp.motherboardSerial, fp.diskSerial, fp.machineGuid, fp.osPlatform]
  );
  return result.rows[0];
}

// -------------------------------------------------------------
// CLIENT LICENSING ENDPOINTS
// -------------------------------------------------------------

// 1. POST /trial/start
app.post('/api/v1/trial/start', async (req: Request, res: Response): Promise<any> => {
  try {
    const parsed = DeviceFingerprintSchema.safeParse(req.body.deviceFingerprint);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: 'INVALID_INPUT', message: 'Invalid device fingerprint payload.' });
    }

    const device = await matchOrCreateDevice(parsed.data);

    // Check if a trial already exists on this physical hardware device
    const existingTrial = await pool.query('SELECT * FROM trial_users WHERE device_id = $1', [device.id]);
    if (existingTrial.rows.length > 0) {
      const trial = existingTrial.rows[0];
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
    await pool.query(
      'INSERT INTO trial_users (device_id, installation_date, expiry_date, trial_token) VALUES ($1, $2, $3, $4)',
      [device.id, installationDate, expiryDate, trialToken]
    );

    await pool.query(
      "INSERT INTO audit_logs (action_type, details, performed_by) VALUES ('TRIAL_STARTED', $1, 'system')",
      [`Trial started for device: ${device.device_hash}`]
    );

    return res.json({
      success: true,
      status: 'trial_active',
      trialToken,
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
    const licenseResult = await pool.query('SELECT * FROM licenses WHERE license_key = $1', [licenseKey]);
    if (licenseResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'LICENSE_NOT_FOUND', message: 'The activation key entered is invalid.' });
    }

    const license = licenseResult.rows[0];

    if (license.status === 'suspended') {
      return res.status(403).json({ success: false, error: 'LICENSE_SUSPENDED', message: 'This license key has been suspended.' });
    }

    // Check device limits
    const activeActivations = await pool.query(
      'SELECT * FROM license_activations WHERE license_id = $1 AND is_active = true',
      [license.id]
    );

    const isAlreadyActivatedHere = activeActivations.rows.some((act: any) => act.device_id === device.id);

    if (!isAlreadyActivatedHere && activeActivations.rows.length >= license.max_devices) {
      return res.status(403).json({
        success: false,
        error: 'LICENSE_LIMIT_EXCEEDED',
        message: `This license is already active on the maximum allowed devices (${license.max_devices}). Please request a device transfer.`
      });
    }

    // Fetch Customer Details
    const customerResult = await pool.query('SELECT * FROM customers WHERE id = $1', [license.customer_id]);
    const customer = customerResult.rows[0] || { name: 'Valued Customer', mobile: 'Unknown' };

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
    await pool.query(
      `INSERT INTO license_activations (license_id, device_id, activation_token, is_active, last_verified_at)
       VALUES ($1, $2, $3, true, NOW())
       ON CONFLICT (license_id, device_id) DO UPDATE SET activation_token = $3, is_active = true, last_verified_at = NOW()`,
      [license.id, device.id, activationToken]
    );

    // Update license status to active
    await pool.query("UPDATE licenses SET status = 'active', updated_at = NOW() WHERE id = $1", [license.id]);

    await pool.query(
      "INSERT INTO audit_logs (action_type, details, performed_by) VALUES ('LICENSE_ACTIVATED', $1, 'system')",
      [`Key: ${license.license_key} activated on device: ${device.device_hash}`]
    );

    return res.json({
      success: true,
      status: 'activated',
      activationToken,
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

    // Check key status in PostgreSQL DB
    const licenseResult = await pool.query('SELECT * FROM licenses WHERE license_key = $1', [decoded.licenseKey]);
    if (licenseResult.rows.length === 0) {
      return res.status(401).json({ success: false, error: 'REVOKED', message: 'License key not found on server.' });
    }

    const license = licenseResult.rows[0];
    if (license.status === 'suspended') {
      return res.status(401).json({ success: false, error: 'SUSPENDED', message: 'License has been suspended.' });
    }

    // Update last verified at
    const deviceResult = await pool.query('SELECT id FROM device_registry WHERE device_hash = $1', [decoded.deviceId]);
    if (deviceResult.rows.length > 0) {
      await pool.query(
        'UPDATE license_activations SET last_verified_at = NOW() WHERE license_id = $1 AND device_id = $2',
        [license.id, deviceResult.rows[0].id]
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
    let query = 'SELECT * FROM licenses WHERE ';
    let params: any[] = [];
    if (licenseKey) {
      query += 'license_key = $1';
      params.push(licenseKey);
    } else if (mobileNumber) {
      query += 'customer_id IN (SELECT id FROM customers WHERE mobile = $1)';
      params.push(mobileNumber);
    } else {
      return res.status(400).json({ success: false, error: 'INVALID_INPUT', message: 'Provide either License Key or Registered Mobile Number.' });
    }

    const licenseRes = await pool.query(query, params);
    if (licenseRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'LICENSE_NOT_FOUND', message: 'No registered purchase details matches.' });
    }

    const license = licenseRes.rows[0];

    // Determine if physical hardware matches the registered activation
    const activationRes = await pool.query(
      'SELECT * FROM license_activations WHERE license_id = $1 AND device_id = $2',
      [license.id, device.id]
    );

    if (activationRes.rows.length === 0) {
      // Hardware does not match the active installation database record
      await pool.query(
        "INSERT INTO license_recovery_logs (license_id, device_id, recovery_type, status, ip_address) VALUES ($1, $2, 'windows_reinstall', 'failed', $3)",
        [license.id, device.id, req.ip]
      );
      return res.status(400).json({
        success: false,
        error: 'HARDWARE_MISMATCH',
        message: 'This device hardware characteristics do not match the registered activation. Please submit a Device Transfer Request.'
      });
    }

    // Reinstall recovery approved! Generate and return new JWT activation token
    const customerResult = await pool.query('SELECT * FROM customers WHERE id = $1', [license.customer_id]);
    const customer = customerResult.rows[0] || { name: 'Valued Customer', mobile: 'Unknown' };

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
    await pool.query(
      'UPDATE license_activations SET activation_token = $1, last_verified_at = NOW(), is_active = true WHERE license_id = $2 AND device_id = $3',
      [activationToken, license.id, device.id]
    );

    // Save recovery log
    await pool.query(
      "INSERT INTO license_recovery_logs (license_id, device_id, recovery_type, status, ip_address) VALUES ($1, $2, 'windows_reinstall', 'success', $3)",
      [license.id, device.id, req.ip]
    );

    return res.json({
      success: true,
      status: 'recovered',
      activationToken,
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
    const licenseRes = await pool.query('SELECT * FROM licenses WHERE license_key = $1', [licenseKey]);
    if (licenseRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'LICENSE_NOT_FOUND', message: 'License key is invalid.' });
    }
    const license = licenseRes.rows[0];

    // Find current active device
    const activeAct = await pool.query(
      'SELECT device_id FROM license_activations WHERE license_id = $1 AND is_active = true LIMIT 1',
      [license.id]
    );

    if (activeAct.rows.length === 0) {
      return res.status(400).json({ success: false, error: 'NO_ACTIVE_ACTIVATION', message: 'No active device bound to this key to transfer from.' });
    }

    const oldDeviceId = activeAct.rows[0].device_id;

    // Register new device fingerprint
    const newDevice = await matchOrCreateDevice(parsedNewFp.data);

    if (oldDeviceId === newDevice.id) {
      return res.status(400).json({ success: false, error: 'SAME_DEVICE', message: 'This device is already active for this license.' });
    }

    // Enforce reset limits: Max 2 resets per year
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    
    const transfersCountRes = await pool.query(
      "SELECT count(*) FROM license_transfer_requests WHERE license_id = $1 AND status = 'approved' AND processed_at >= $2",
      [license.id, oneYearAgo]
    );

    const limit = parseInt(transfersCountRes.rows[0].count);
    if (limit >= 2) {
      return res.status(403).json({
        success: false,
        error: 'TRANSFER_LIMIT_REACHED',
        message: 'You have reached the maximum allowed hardware transfers (2 per year). Please contact enterprise support.'
      });
    }

    // Insert pending request
    await pool.query(
      `INSERT INTO license_transfer_requests (license_id, old_device_id, new_device_id, reason, status)
       VALUES ($1, $2, $3, $4, 'pending')`,
      [license.id, oldDeviceId, newDevice.id, reason]
    );

    await pool.query(
      "INSERT INTO audit_logs (action_type, details, performed_by) VALUES ('TRANSFER_REQUESTED', $1, 'system')",
      [`Transfer request registered for key: ${license.license_key} to new device: ${newDevice.device_hash}`]
    );

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

    const licRes = await pool.query('SELECT * FROM licenses WHERE license_key = $1', [licenseKey]);
    if (licRes.rows.length === 0) return res.status(404).json({ success: false, message: 'Key not found.' });

    const license = licRes.rows[0];
    const actRes = await pool.query(
      `SELECT d.device_hash, a.activation_date, a.last_verified_at 
       FROM license_activations a 
       JOIN device_registry d ON a.device_id = d.id 
       WHERE a.license_id = $1 AND a.is_active = true`,
      [license.id]
    );

    return res.json({
      success: true,
      licenseKey: license.license_key,
      type: license.license_type,
      status: license.status,
      maxDevices: license.max_devices,
      activations: actRes.rows.map((row: any) => ({
        deviceHash: row.device_hash,
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
  if (username !== ADMIN_USERNAME) {
    res.status(401).json({ error: 'INVALID_CREDENTIALS', message: 'Incorrect username or password.' });
    return;
  }
  
  const validPassword = await argon2.verify(ADMIN_PASSWORD_HASH, password);
  if (!validPassword) {
    res.status(401).json({ error: 'INVALID_CREDENTIALS', message: 'Incorrect username or password.' });
    return;
  }
  
  const token = jwt.sign({ role: 'admin', sub: username }, ADMIN_JWT_SECRET!, { expiresIn: '8h' });
  res.json({ success: true, token, expiresIn: '8h' });
});

// ── GET /admin/logout (clears client token - informational) ──────
app.get('/admin/logout', (_req: Request, res: Response): void => {
  res.json({ success: true, message: 'Logged out. Please clear your session token.' });
});

// GET /admin/dashboard-stats
app.get('/api/v1/admin/dashboard-stats', adminAuth, async (req: Request, res: Response) => {
  try {
    const totalCommercial = await pool.query("SELECT count(*) FROM licenses WHERE license_type != 'trial'");
    const activeCommercial = await pool.query("SELECT count(*) FROM licenses WHERE status = 'active'");
    const trialUsers = await pool.query("SELECT count(*) FROM trial_users WHERE is_expired = false");
    const expiredTrials = await pool.query("SELECT count(*) FROM trial_users WHERE is_expired = true OR expiry_date < NOW()");
    const pendingTransfers = await pool.query("SELECT count(*) FROM license_transfer_requests WHERE status = 'pending'");

    res.json({
      totalCommercial: parseInt(totalCommercial.rows[0].count),
      activeCommercial: parseInt(activeCommercial.rows[0].count),
      trialUsers: parseInt(trialUsers.rows[0].count),
      expiredTrials: parseInt(expiredTrials.rows[0].count),
      pendingTransfers: parseInt(pendingTransfers.rows[0].count)
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /admin/customers
app.get('/api/v1/admin/customers', adminAuth, async (req: Request, res: Response) => {
  try {
    const result = await pool.query('SELECT * FROM customers ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /admin/customers
app.post('/api/v1/admin/customers', adminAuth, async (req: Request, res: Response) => {
  const { name, mobile, email } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO customers (name, mobile, email) VALUES ($1, $2, $3) RETURNING *',
      [name, mobile, email]
    );
    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /admin/licenses
app.get('/api/v1/admin/licenses', adminAuth, async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT l.*, c.name as customer_name, c.mobile as customer_mobile 
       FROM licenses l 
       LEFT JOIN customers c ON l.customer_id = c.id 
       ORDER BY l.created_at DESC`
    );
    res.json(result.rows);
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

    let expiryDate = null;
    if (expiryDays) {
      expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + parseInt(expiryDays));
    }

    const result = await pool.query(
      `INSERT INTO licenses (customer_id, license_key, license_type, max_devices, expiry_date, status)
       VALUES ($1, $2, $3, $4, $5, 'issued') RETURNING *`,
      [customerId, licenseKey, licenseType || 'lifetime', maxDevices || 1, expiryDate]
    );

    await pool.query(
      "INSERT INTO audit_logs (action_type, details, performed_by) VALUES ('LICENSE_GENERATED', $1, 'admin')",
      [`Generated key: ${licenseKey} for Customer ID: ${customerId}`]
    );

    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /admin/transfers
app.get('/api/v1/admin/transfers', adminAuth, async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT r.*, l.license_key, 
              d_old.device_hash as old_device_hash, 
              d_new.device_hash as new_device_hash 
       FROM license_transfer_requests r
       JOIN licenses l ON r.license_id = l.id
       JOIN device_registry d_old ON r.old_device_id = d_old.id
       JOIN device_registry d_new ON r.new_device_id = d_new.id
       ORDER BY r.requested_at DESC`
    );
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /admin/transfers/approve
app.post('/api/v1/admin/transfers/approve', adminAuth, async (req: Request, res: Response): Promise<any> => {
  const { requestId, adminNote } = req.body;
  if (!requestId) return res.status(400).json({ error: 'Request ID is required.' });

  try {
    // Start transaction
    await pool.query('BEGIN');

    // 1. Fetch details
    const reqRes = await pool.query('SELECT * FROM license_transfer_requests WHERE id = $1', [requestId]);
    if (reqRes.rows.length === 0) {
      await pool.query('ROLLBACK');
      return res.status(404).json({ error: 'Transfer request not found.' });
    }
    const transfer = reqRes.rows[0];

    if (transfer.status !== 'pending') {
      await pool.query('ROLLBACK');
      return res.status(400).json({ error: 'Transfer request is already processed.' });
    }

    // 2. Deactivate the old device activation
    await pool.query(
      'UPDATE license_activations SET is_active = false WHERE license_id = $1 AND device_id = $2',
      [transfer.license_id, transfer.old_device_id]
    );

    // 3. Mark request as approved
    await pool.query(
      "UPDATE license_transfer_requests SET status = 'approved', processed_at = NOW(), processed_by = 'admin', admin_note = $1 WHERE id = $2",
      [adminNote || 'Approved via Admin Panel', requestId]
    );

    // 4. Record Audit Log
    await pool.query(
      "INSERT INTO audit_logs (action_type, details, performed_by) VALUES ('TRANSFER_APPROVED', $1, 'admin')",
      [`Approved transfer from old device: ${transfer.old_device_id} to new device: ${transfer.new_device_id}`]
    );

    await pool.query('COMMIT');
    res.json({ success: true, message: 'Transfer request approved successfully.' });
  } catch (err: any) {
    await pool.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  }
});

// POST /admin/transfers/reject
app.post('/api/v1/admin/transfers/reject', adminAuth, async (req: Request, res: Response): Promise<any> => {
  const { requestId, adminNote } = req.body;
  if (!requestId) return res.status(400).json({ error: 'Request ID is required.' });

  try {
    await pool.query(
      "UPDATE license_transfer_requests SET status = 'rejected', processed_at = NOW(), processed_by = 'admin', admin_note = $1 WHERE id = $2",
      [adminNote || 'Rejected via Admin Panel', requestId]
    );
    res.json({ success: true, message: 'Transfer request rejected successfully.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /admin/licenses/deactivate
app.post('/api/v1/admin/licenses/deactivate', adminAuth, async (req: Request, res: Response): Promise<any> => {
  const { licenseId, adminNote } = req.body;
  try {
    await pool.query('BEGIN');
    await pool.query("UPDATE licenses SET status = 'suspended', updated_at = NOW() WHERE id = $1", [licenseId]);
    await pool.query("UPDATE license_activations SET is_active = false WHERE license_id = $1", [licenseId]);
    await pool.query(
      "INSERT INTO audit_logs (action_type, details, performed_by) VALUES ('LICENSE_SUSPENDED', $1, 'admin')",
      [`Suspended license ID: ${licenseId}. Reason: ${adminNote || 'None'}`]
    );
    await pool.query('COMMIT');
    res.json({ success: true, message: 'License key suspended and all active activations disabled.' });
  } catch (err: any) {
    await pool.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  }
});

// GET /admin/trials
app.get('/api/v1/admin/trials', adminAuth, async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT t.*, d.device_hash, d.os_platform 
       FROM trial_users t 
       JOIN device_registry d ON t.device_id = d.id 
       ORDER BY t.installation_date DESC`
    );
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /admin/audit-logs
app.get('/api/v1/admin/audit-logs', adminAuth, async (req: Request, res: Response) => {
  try {
    const result = await pool.query('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 100');
    res.json(result.rows);
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

// Boot Database & Web server
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

startServer();
