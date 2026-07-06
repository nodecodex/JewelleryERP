import * as fs from 'fs';
import * as path from 'path';
import * as zlib from 'zlib';
import * as crypto from 'crypto';
import { getDatabasePath, closeDatabase, initDatabase } from '../db/connection';
import type { BackupResult } from '../../shared/ipc-api';

const BACKUP_ENCRYPTION_KEY = Buffer.from('8f3k2!xZ9qP7mNvL8f3k2!xZ9qP7mNvL', 'utf8'); // 32 bytes for AES-256

export class BackupService {
  /**
   * Generates a zipped backup file of the SQLite database
   */
  public async createBackup(destDir?: string): Promise<BackupResult> {
    try {
      const dbPath = getDatabasePath();
      if (!fs.existsSync(dbPath)) {
        return { success: false, message: 'Source database file does not exist.' };
      }

      // Default target directory is standard "backups" folder inside workspace or app directory
      let targetDir = destDir;
      if (!targetDir) {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { app } = require('electron');
        const rootPath = app ? app.getPath('documents') : process.cwd();
        targetDir = path.join(rootPath, 'SwarnProERP_Backups');
      }

      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupFileName = `swarnpro_erp_backup_${timestamp}.db.gz`;
      const backupPath = path.join(targetDir, backupFileName);

      // Path Traversal Prevention
      if (path.relative(targetDir, backupPath).startsWith('..')) {
        throw new Error('Invalid backup destination path');
      }

      // Perform compression and encryption using stream pipelines
      const rawStream = fs.createReadStream(dbPath);
      const gzipStream = zlib.createGzip();
      
      const iv = crypto.randomBytes(12);
      const cipher = crypto.createCipheriv('aes-256-gcm', BACKUP_ENCRYPTION_KEY, iv);
      const writeStream = fs.createWriteStream(backupPath);

      // Write IV first so we can decrypt later
      writeStream.write(iv);

      await new Promise<void>((resolve, reject) => {
        rawStream
          .pipe(gzipStream)
          .pipe(cipher)
          .pipe(writeStream)
          .on('finish', () => {
             // Append Auth Tag at the end of the file for integrity verification
             fs.appendFileSync(backupPath, cipher.getAuthTag());
             resolve();
          })
          .on('error', (err) => reject(err));
      });

      return {
        success: true,
        filePath: backupPath,
        message: `Database backup created successfully at: ${backupPath}`
      };
    } catch (error: any) {
      return {
        success: false,
        message: `Backup failed: ${error.message || error}`
      };
    }
  }

  /**
   * Restores database from a zipped backup file (.gz)
   */
  public async restoreBackup(zipPath: string): Promise<BackupResult> {
    try {
      if (!fs.existsSync(zipPath)) {
        return { success: false, message: 'Backup file not found.' };
      }

      const dbPath = getDatabasePath();

      // 1. Temporarily close any active database connection pool to unlock the file
      closeDatabase();

      // 2. Perform decompression and decryption
      // Read IV (first 12 bytes) and Auth Tag (last 16 bytes)
      const fileBuffer = fs.readFileSync(zipPath);
      if (fileBuffer.length < 28) throw new Error('Invalid backup file');
      
      const iv = fileBuffer.slice(0, 12);
      const authTag = fileBuffer.slice(fileBuffer.length - 16);
      
      const decipher = crypto.createDecipheriv('aes-256-gcm', BACKUP_ENCRYPTION_KEY, iv);
      decipher.setAuthTag(authTag);
      
      // We pipe from a slice of the buffer skipping IV and AuthTag
      const encryptedDataStream = require('stream').Readable.from(fileBuffer.slice(12, fileBuffer.length - 16));
      
      const gunzipStream = zlib.createGunzip();
      const writeStream = fs.createWriteStream(dbPath);

      await new Promise<void>((resolve, reject) => {
        encryptedDataStream
          .pipe(decipher)
          .pipe(gunzipStream)
          .pipe(writeStream)
          .on('finish', () => resolve())
          .on('error', (err: Error) => reject(new Error('Integrity check failed or file corrupted.')));
      });

      // 3. Re-initialize the connection
      initDatabase();

      return {
        success: true,
        message: 'Database restored successfully. The application will refresh connection context.'
      };
    } catch (error: any) {
      // Re-initialize DB in case closure succeeded but restore failed
      try {
        initDatabase();
      } catch (dbErr) {
        console.error('Failed to reopen DB after restore failure', dbErr);
      }
      return {
        success: false,
        message: `Restore failed: ${error.message || error}`
      };
    }
  }
}
