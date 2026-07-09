import { app, BrowserWindow, session } from 'electron';
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
    title: 'SwarnPro ERP Desktop Client',
    icon: path.join(__dirname, '../../build/icon.png')
  });

  // Load URL depending on dev/prod
  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../index.html'));
  }

  // Security Hardening: Disable navigation and new window creation
  mainWindow.webContents.on('will-navigate', (event, navigationUrl) => {
    const parsedUrl = new URL(navigationUrl);
    // Allow local file navigation only, or dev server if in dev
    if (parsedUrl.protocol !== 'file:' && !(isDev && parsedUrl.hostname === 'localhost')) {
      event.preventDefault();
    }
  });

  mainWindow.webContents.setWindowOpenHandler((details) => {
    return { action: 'deny' }; // Prevent all new windows (target="_blank")
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  // Set strict Content Security Policy
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': ["default-src 'self' 'unsafe-inline' 'unsafe-eval' data:; connect-src 'self' http://localhost:3003 https://jewelleryerp-85xu.onrender.com;"]
      }
    });
  });

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
