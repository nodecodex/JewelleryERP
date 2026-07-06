import Database from 'better-sqlite3-multiple-ciphers';
import argon2 from 'argon2';
import crypto from 'crypto';
import path from 'path';
import os from 'os';

const DB_ENCRYPTION_KEY = 'jewel-erp-secure-db-key-2024';
// Use process.env.APPDATA on Windows
const appDataPath = process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming');
const dbPath = path.join(appDataPath, 'temp-app', 'jewellery_erp.db');

console.log(`Connecting to database at ${dbPath}`);
const db = new Database(dbPath, { verbose: console.log });
db.pragma(`key = '${DB_ENCRYPTION_KEY}'`);

const companyCount = db.prepare("SELECT count(*) as cnt FROM companies").get().cnt;
let companyId;
if (companyCount === 0) {
    companyId = crypto.randomUUID();
    db.prepare(`
        INSERT INTO companies (id, name, financial_year_start, financial_year_end)
        VALUES (?, ?, ?, ?)
    `).run(companyId, 'Default Company', '2024-04-01', '2025-03-31');
    console.log("Created Default Company");
} else {
    companyId = db.prepare("SELECT id FROM companies LIMIT 1").get().id;
}

const userCount = db.prepare("SELECT count(*) as cnt FROM users").get().cnt;
if (userCount === 0) {
    const id = crypto.randomUUID();
    argon2.hash('admin').then(hash => {
        db.prepare(`
            INSERT INTO users (id, company_id, username, password_hash, role, permissions_json)
            VALUES (?, ?, ?, ?, ?, ?)
        `).run(id, companyId, 'admin', hash, 'Admin', '{}');
        console.log("Created Admin user with username 'admin' and password 'admin'");
    }).catch(console.error);
} else {
    console.log("Users already exist");
}
