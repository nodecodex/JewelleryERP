import { LicenseService } from '../dist/main/services/license.service.js';

const args = process.argv.slice(2);
if (args.length === 0) {
  console.log('Usage: node scripts/generate-license.js <Device-ID> [expiry-date]');
  console.log('Example: node scripts/generate-license.js F47C8B93... 2030-12-31');
  process.exit(1);
}

const deviceId = args[0].toUpperCase();
const expiry = args[1] || '2030-12-31';

try {
  const licenseKey = LicenseService.generateLicenseKey(deviceId, expiry);
  console.log('\n================================================================');
  console.log(`LICENSE KEY FOR DEVICE: ${deviceId}`);
  console.log(`EXPIRATION DATE:        ${expiry}`);
  console.log('================================================================');
  console.log(licenseKey);
  console.log('================================================================\n');
} catch (e) {
  console.error('Failed to generate license key. Verify TypeScript has been compiled (npm run build).', e);
}
