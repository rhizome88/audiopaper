import { contextBridge, ipcRenderer, webUtils } from 'electron';

// Expose protected methods to renderer
contextBridge.exposeInMainWorld('electronAPI', {
  // TTS
  generateSpeech: (text: string, voice: string, speed: number): Promise<ArrayBuffer> =>
    ipcRenderer.invoke('tts:generate', text, voice, speed),

  // Document conversion
  convertDocx: (fileBuffer: ArrayBuffer, fileName: string): Promise<ArrayBuffer> =>
    ipcRenderer.invoke('convert:docx', fileBuffer, fileName),

  // File dialogs
  openFileDialog: (): Promise<Electron.OpenDialogReturnValue> =>
    ipcRenderer.invoke('dialog:openFile'),

  // Read file from path
  readFile: (filePath: string): Promise<ArrayBuffer> =>
    ipcRenderer.invoke('file:read', filePath),

  // API Key management
  getApiKey: (service: string): Promise<string | null> =>
    ipcRenderer.invoke('store:getApiKey', service),

  setApiKey: (service: string, key: string): Promise<void> =>
    ipcRenderer.invoke('store:setApiKey', service, key),

  hasApiKey: (service: string): Promise<boolean> =>
    ipcRenderer.invoke('store:hasApiKey', service),

  // Window state
  getSplitRatio: (): Promise<number> =>
    ipcRenderer.invoke('store:getSplitRatio'),

  setSplitRatio: (ratio: number): Promise<void> =>
    ipcRenderer.invoke('store:setSplitRatio', ratio),

  // Last document persistence
  getLastDocument: (): Promise<{ filePath: string; sentenceIndex: number } | null> =>
    ipcRenderer.invoke('store:getLastDocument'),

  setLastDocument: (filePath: string, sentenceIndex: number): Promise<void> =>
    ipcRenderer.invoke('store:setLastDocument', filePath, sentenceIndex),

  clearLastDocument: (): Promise<void> =>
    ipcRenderer.invoke('store:clearLastDocument'),

  // Get file path from a dropped File object
  getPathForFile: (file: File): string => webUtils.getPathForFile(file),

  // Platform info
  getPlatform: (): string => process.platform,

  // Safe storage
  isEncryptionAvailable: (): Promise<boolean> =>
    ipcRenderer.invoke('safeStorage:isAvailable'),
});

// Type definitions for renderer
export interface ElectronAPI {
  generateSpeech: (text: string, voice: string, speed: number) => Promise<ArrayBuffer>;
  convertDocx: (fileBuffer: ArrayBuffer, fileName: string) => Promise<ArrayBuffer>;
  openFileDialog: () => Promise<Electron.OpenDialogReturnValue>;
  readFile: (filePath: string) => Promise<ArrayBuffer>;
  getApiKey: (service: string) => Promise<string | null>;
  setApiKey: (service: string, key: string) => Promise<void>;
  hasApiKey: (service: string) => Promise<boolean>;
  getSplitRatio: () => Promise<number>;
  setSplitRatio: (ratio: number) => Promise<void>;
  getLastDocument: () => Promise<{ filePath: string; sentenceIndex: number } | null>;
  setLastDocument: (filePath: string, sentenceIndex: number) => Promise<void>;
  clearLastDocument: () => Promise<void>;
  getPathForFile: (file: File) => string;
  getPlatform: () => string;
  isEncryptionAvailable: () => Promise<boolean>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
