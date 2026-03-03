import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'node:path';
import { spawn } from 'node:child_process';
import http from 'node:http';
import https from 'node:https';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';

// NEW: import the lookup helper
import { lookup as duckDuckGoLookup } from './webLookup.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let serverProcess = null;

// -----------------------------
// 🔧 In‑Memory Settings Store
// -----------------------------
let settings = {
  persona: "",
  temperature: 0.7,
  top_p: 0.9,
  top_k: 40,
  min_p: 0.2,
  repetition_penalty: 1.1,
  max_tokens: 2048,
  memory_enabled: true,
  memory_length: 10,
  // New: web access mode for factual lookups
  web_access_mode: "off" // "off" | "manual" | "auto"
};

// -----------------------------
// 🔌 IPC Channels for Settings
// -----------------------------
ipcMain.handle("get-settings", () => {
  return settings;
});

ipcMain.handle("set-settings", (event, newSettings) => {
  settings = { ...settings, ...newSettings };
  return settings;
});

// Optional: clear memory from renderer
ipcMain.handle("clear-memory", () => {
  // Renderer will handle actual memory clearing logic.
  return true;
});

// -----------------------------
// 🌐 Web Lookup (DuckDuckGo)
// -----------------------------
ipcMain.handle("web-lookup", async (event, query) => {
  console.log("[main] web-lookup called with query:", query);
  if (!query || typeof query !== "string") return null;
  const result = await duckDuckGoLookup(query);
  console.log("[main] web-lookup result:", result);
  return result;
});


// -----------------------------
// 🪟 Window Creation
// -----------------------------
function createWindow() {
  const win = new BrowserWindow({
    width: 900,
    height: 900,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      sandbox: false
    }
  });

  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));
}

// -----------------------------
// 🧠 Wait for llama-server
// -----------------------------
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

// -----------------------------
// 🚀 App Ready
// -----------------------------
app.whenReady().then(() => {
  const isDev = !app.isPackaged;

  const basePath = isDev
    ? path.join(__dirname, '..', 'resources', 'backend')
    : path.join(process.resourcesPath, 'backend');

  const backendPath = path.join(basePath, 'llama-server.exe');

  const modelFile = fs.readdirSync(basePath).find(f => f.endsWith('.gguf'));

  if (!modelFile) {
    console.error("❌ No .gguf model found in backend folder");
    return;
  }

  const modelPath = path.join(basePath, modelFile);
  console.log("🧠 Loading model:", modelPath);

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

// -----------------------------
// 🛑 Cleanup
// -----------------------------
app.on('window-all-closed', () => {
  if (serverProcess) {
    serverProcess.kill();
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
