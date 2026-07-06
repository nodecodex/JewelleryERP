import Database from 'better-sqlite3-multiple-ciphers';
import * as path from 'path';
import * as fs from 'fs';
import { runMigrations } from './schema';

let dbInstance: Database.Database | null = null;

const DB_ENCRYPTION_KEY = 'jewel-erp-secure-db-key-2024';

export function getDatabasePath(): string {
  let userDataPath = '';
  try {
    // Attempt to dynamically import/require Electron
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { app } = require('electron');
    if (app) {
      userDataPath = app.getPath('userData');
    }
  } catch (e) {
    // If not running inside Electron (e.g. during Jest testing or CLI scripts)
    userDataPath = path.join(process.cwd(), 'data');
  }

  if (!fs.existsSync(userDataPath)) {
    fs.mkdirSync(userDataPath, { recursive: true });
  }

  return path.join(userDataPath, 'jewellery_erp.db');
}

export function initDatabase(): Database.Database {
  if (dbInstance) {
    return dbInstance;
  }

  const dbPath = getDatabasePath();
  const db = new Database(dbPath, { verbose: console.log });
  
  // Set Encryption key for SQLCipher
  db.pragma(`key = '${DB_ENCRYPTION_KEY}'`);

  
  // Enable foreign keys
  db.pragma('foreign_keys = ON');
  
  // Run schema setup migrations
  runMigrations(db);
  
  dbInstance = db;
  return db;
}

export function closeDatabase(): void {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}
