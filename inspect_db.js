import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, 'database.sqlite');
console.log('Database path:', dbPath);

try {
  const db = new Database(dbPath);
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
  console.log('Tables:', tables);

  const tableInfo = db.prepare("PRAGMA table_info(license_info)").all();
  console.log('license_info table info:', tableInfo);
  
  const licenseRows = db.prepare("SELECT * FROM license_info").all();
  console.log('license_info rows:', licenseRows);
  
  db.close();
} catch (err) {
  console.error(err);
}
