import { app, BrowserWindow } from 'electron';
import path from 'node:path';
import { spawn } from 'node:child_process';
import http from 'node:http';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let serverProcess = null;

function createWindow() {
  const win = new BrowserWindow({
    width: 900,
    height: 900,
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
      contextIsolation: true,
      sandbox: false
    }
  });

  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));

}

function waitForServerReady(port, callback) {
  const attempt = () => {
    const req = http.get(`http://127.0.0.1:${port}/v1/models`, res => {
      if (res.statusCode === 200) {
        callback();
      } else {
        setTimeout(attempt, 300);
      }
    });

    req.on('error', () => setTimeout(attempt, 300));
  };

  attempt();
}

app.whenReady().then(() => {
  const isDev = !app.isPackaged;

  const basePath = isDev
    ? path.join(__dirname, '..', 'resources', 'backend')   // <-- FIXED
    : path.join(process.resourcesPath, 'backend');

  const backendPath = path.join(basePath, 'llama-server.exe');
  const modelPath = path.join(basePath, 'lumi-core-mistral.gguf');

  serverProcess = spawn(backendPath, [
    '--model', modelPath,
    '--port', '1925',
    '--ctx-size', '8192'
  ], {
    cwd: basePath,
    windowsHide: true
  });

  serverProcess.stdout.on('data', data => {
    console.log('[llama-server]', data.toString());
  });

  serverProcess.stderr.on('data', data => {
    console.error('[llama-server ERROR]', data.toString());
  });

  serverProcess.on('exit', code => {
    console.log(`llama-server exited with code ${code}`);
  });

  waitForServerReady(1925, () => {
    createWindow();
  });
});

app.on('window-all-closed', () => {
  if (serverProcess) {
    serverProcess.kill();
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
