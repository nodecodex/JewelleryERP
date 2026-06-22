import { app, BrowserWindow } from 'electron';
import * as path from 'path';
import { initDatabase, closeDatabase } from './db/connection';
import { registerIpcHandlers } from './ipc/handlers';

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  // Initialize Database before window launches
  try {
    initDatabase();
  } catch (error) {
    console.error('Failed to initialize SQLite Database:', error);
  }

  // Register IPC API Listeners
  registerIpcHandlers();

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 850,
    minWidth: 1000,
    minHeight: 700,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    title: 'Jewellery ERP Desktop Client'
  });

  // Load URL depending on dev/prod
  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  // Close database connection pool when all windows shut down
  closeDatabase();

  if (process.platform !== 'darwin') {
    app.quit();
  }
});
