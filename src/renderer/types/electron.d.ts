export interface ElectronAPI {
  generateSpeech: (text: string, voice: string, speed: number) => Promise<ArrayBuffer>;
  convertDocx: (fileBuffer: ArrayBuffer, fileName: string) => Promise<ArrayBuffer>;
  openFileDialog: () => Promise<{
    canceled: boolean;
    filePaths: string[];
  }>;
  readFile: (filePath: string) => Promise<ArrayBuffer>;
  getApiKey: (service: string) => Promise<string | null>;
  setApiKey: (service: string, key: string) => Promise<void>;
  hasApiKey: (service: string) => Promise<boolean>;
  getSplitRatio: () => Promise<number>;
  setSplitRatio: (ratio: number) => Promise<void>;
  getPlatform: () => string;
  isEncryptionAvailable: () => Promise<boolean>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

export {};
