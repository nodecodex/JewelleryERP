import { spawn } from 'child_process';
import * as net from 'net';
import * as path from 'path';
import * as fs from 'fs';

// Ensure dist folder has type: commonjs so compiled CommonJS files run properly in Electron main
if (!fs.existsSync('dist')) {
  fs.mkdirSync('dist', { recursive: true });
}
fs.writeFileSync('dist/package.json', JSON.stringify({ type: 'commonjs' }, null, 2));

// Ports
const VITE_PORT = 5173;

function waitPort(port, host, callback) {
  const socket = new net.Socket();
  const tryConnect = () => {
    socket.connect({ port, host });
  };

  socket.on('connect', () => {
    socket.destroy();
    callback();
  });

  socket.on('error', () => {
    setTimeout(tryConnect, 250);
  });

  tryConnect();
}

console.log('Starting Vite development server for React frontend...');
const viteProcess = spawn('vite', [], {
  shell: true,
  stdio: 'inherit'
});

console.log('Compiling Electron Main & Preload scripts via tsc...');
const tscProcess = spawn('tsc', ['-p', 'tsconfig.electron.json', '--watch'], {
  shell: true,
  stdio: 'inherit'
});

// Wait for Vite server, then spawn Electron
waitPort(VITE_PORT, 'localhost', () => {
  console.log(`React dev server is live at http://localhost:${VITE_PORT}`);
  console.log('Launching Electron...');

  const electronProcess = spawn('electron', ['dist/main/index.js'], {
    shell: true,
    stdio: 'inherit',
    env: {
      ...process.env,
      NODE_ENV: 'development'
    }
  });

  electronProcess.on('close', () => {
    console.log('Electron closed. Shutting down compilers and servers...');
    viteProcess.kill();
    tscProcess.kill();
    process.exit(0);
  });
});
