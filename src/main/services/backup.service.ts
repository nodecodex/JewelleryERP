import * as fs from 'fs';
import * as path from 'path';
import * as zlib from 'zlib';
import { getDatabasePath, closeDatabase, initDatabase } from '../db/connection';
import type { BackupResult } from '../../shared/ipc-api';

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
        targetDir = path.join(rootPath, 'JewelleryERP_Backups');
      }

      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupFileName = `jewellery_erp_backup_${timestamp}.db.gz`;
      const backupPath = path.join(targetDir, backupFileName);

      // Perform compression using stream pipelines
      const rawStream = fs.createReadStream(dbPath);
      const gzipStream = zlib.createGzip();
      const writeStream = fs.createWriteStream(backupPath);

      await new Promise<void>((resolve, reject) => {
        rawStream
          .pipe(gzipStream)
          .pipe(writeStream)
          .on('finish', () => resolve())
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

      // 2. Perform decompression
      const readStream = fs.createReadStream(zipPath);
      const gunzipStream = zlib.createGunzip();
      const writeStream = fs.createWriteStream(dbPath);

      await new Promise<void>((resolve, reject) => {
        readStream
          .pipe(gunzipStream)
          .pipe(writeStream)
          .on('finish', () => resolve())
          .on('error', (err) => reject(err));
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
