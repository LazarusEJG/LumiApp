import { contextBridge, ipcRenderer } from 'electron';
import { askLumi } from './lumi.js';

// Expose safe API to the renderer
contextBridge.exposeInMainWorld('lumi', {
  // askLumi now expects: (messages, settings, onToken)
  ask: askLumi,

  getSettings: () => ipcRenderer.invoke("get-settings"),
  setSettings: (newSettings) => ipcRenderer.invoke("set-settings", newSettings),
  clearMemory: () => ipcRenderer.invoke("clear-memory")
});
