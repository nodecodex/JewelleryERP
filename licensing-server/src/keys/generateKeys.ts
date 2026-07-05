import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

export function generateKeyPair() {
  const keysDir = __dirname;
  if (!fs.existsSync(keysDir)) {
    fs.mkdirSync(keysDir, { recursive: true });
  }

  const privateKeyPath = path.join(keysDir, 'private.pem');
  const publicKeyPath = path.join(keysDir, 'public.pem');

  if (fs.existsSync(privateKeyPath) && fs.existsSync(publicKeyPath)) {
    console.log('RSA Keys already exist. Skipping generation.');
    return;
  }

  console.log('Generating 2048-bit RSA Keypair for RS256 signing...');
  const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: {
      type: 'spki',
      format: 'pem'
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem'
    }
  });

  fs.writeFileSync(privateKeyPath, privateKey);
  fs.writeFileSync(publicKeyPath, publicKey);
  console.log('Keys successfully generated and saved to keys/ directory!');
}

generateKeyPair();
