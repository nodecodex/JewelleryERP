import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// 1. Read current version from package.json
const pkgPath = path.join(rootDir, 'package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
const version = pkg.version;

const releaseDir = path.join(rootDir, 'release');
if (!fs.existsSync(releaseDir)) {
  fs.mkdirSync(releaseDir, { recursive: true });
} else {
  // Clean up legacy or old version installers so release/ stays clean
  const existingFiles = fs.readdirSync(releaseDir);
  for (const file of existingFiles) {
    if (file.startsWith('SwarnPro_ERP_') && !file.includes(`v${version}`)) {
      try {
        fs.unlinkSync(path.join(releaseDir, file));
      } catch (_) {}
    }
    if (file.endsWith('.tmp')) {
      try {
        fs.rmSync(path.join(releaseDir, file), { recursive: true, force: true });
      } catch (_) {}
    }
  }
}

console.log(`\n========================================`);
console.log(`📦 Packaging Release Artifacts for v${version}`);
console.log(`========================================\n`);

const nsisDir = path.join(rootDir, 'src-tauri', 'target', 'release', 'bundle', 'nsis');
const msiDir = path.join(rootDir, 'src-tauri', 'target', 'release', 'bundle', 'msi');
const targetExe = path.join(rootDir, 'src-tauri', 'target', 'release', 'swarnpro-erp.exe');

let copiedCount = 0;

// 1. NSIS setup exe
if (fs.existsSync(nsisDir)) {
  const nsisFiles = fs.readdirSync(nsisDir).filter(f => f.endsWith('.exe'));
  if (nsisFiles.length > 0) {
    const srcPath = path.join(nsisDir, nsisFiles[0]);
    const destPath = path.join(releaseDir, `SwarnPro_ERP_v${version}_Setup.exe`);
    fs.copyFileSync(srcPath, destPath);
    const stat = fs.statSync(destPath);
    console.log(`✔ Copied NSIS Setup: SwarnPro_ERP_v${version}_Setup.exe (${(stat.size / (1024 * 1024)).toFixed(2)} MB)`);
    copiedCount++;
  }
}

// 2. MSI installer
if (fs.existsSync(msiDir)) {
  const msiFiles = fs.readdirSync(msiDir).filter(f => f.endsWith('.msi'));
  if (msiFiles.length > 0) {
    const srcPath = path.join(msiDir, msiFiles[0]);
    const destPath = path.join(releaseDir, `SwarnPro_ERP_v${version}_Setup.msi`);
    fs.copyFileSync(srcPath, destPath);
    const stat = fs.statSync(destPath);
    console.log(`✔ Copied MSI Installer: SwarnPro_ERP_v${version}_Setup.msi (${(stat.size / (1024 * 1024)).toFixed(2)} MB)`);
    copiedCount++;
  }
}

// 3. Standalone Portable exe
if (fs.existsSync(targetExe)) {
  const destPath = path.join(releaseDir, `SwarnPro_ERP_v${version}_Portable.exe`);
  fs.copyFileSync(targetExe, destPath);
  const stat = fs.statSync(destPath);
  console.log(`✔ Copied Portable Exe: SwarnPro_ERP_v${version}_Portable.exe (${(stat.size / (1024 * 1024)).toFixed(2)} MB)`);
  copiedCount++;
}

console.log(`\n🎉 Release ${version} successfully placed in ${releaseDir}\n`);
