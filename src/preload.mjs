import { contextBridge } from 'electron';
import { askLumi } from './lumi.js';

contextBridge.exposeInMainWorld('lumi', {
  ask: askLumi
});
