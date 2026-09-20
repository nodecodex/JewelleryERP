import Database from 'better-sqlite3-multiple-ciphers';
import * as path from 'path';
import * as fs from 'fs';
import { runMigrations } from './schema';

let dbInstance: Database.Database | null = null;

const DB_ENCRYPTION_KEY = 'jewel-erp-secure-db-key-2024';

export function getDatabasePath(): string {
  console.log("node env===>>>", process.env.NODE_ENV);

  let isDev = false;
  try {
    isDev = process.env.NODE_ENV === 'development' || !require('electron').app.isPackaged;
  } catch {
    isDev = true;
  }

  if (isDev) {
    // Use database.sqlite in the project root during development
    return path.join(process.cwd(), 'database.sqlite');
  }

  // In production, use the user data folder
  let userDataPath = '';
  try {
    const { app } = require('electron');
    if (app) {
      userDataPath = app.getPath('userData');
    }
  } catch (e) {
    userDataPath = path.join(process.cwd(), 'data');
  }

  if (!fs.existsSync(userDataPath)) {
    fs.mkdirSync(userDataPath, { recursive: true });
  }

  return path.join(userDataPath, 'database.sqlite');
}

export function initDatabase(): Database.Database {
  if (dbInstance) {
    return dbInstance;
  }

  const dbPath = getDatabasePath();
  // Only enable verbose SQL logging in development to avoid blocking main process in production
  const isDev = process.env.NODE_ENV === 'development' || (() => { try { return !require('electron').app.isPackaged; } catch { return true; } })();
  const db = new Database(dbPath, isDev ? { verbose: console.log } : {});

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
