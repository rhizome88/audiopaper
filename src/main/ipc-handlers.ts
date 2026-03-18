import { IpcMain } from 'electron';
import * as fs from 'fs';
import { generateSpeech } from './services/tts-service';
import { convertDocxToPdf } from './services/convert-service';
import { getApiKey, setApiKey, hasApiKey, getSplitRatio, setSplitRatio, getLastDocument, setLastDocument, clearLastDocument } from './store';

export function registerIpcHandlers(ipcMain: IpcMain): void {
  // TTS handler
  ipcMain.handle('tts:generate', async (_, text: string, voice: string, speed: number) => {
    try {
      const apiKey = getApiKey('openai');
      if (!apiKey) {
        throw new Error('OpenAI API key not configured');
      }
      const buffer = await generateSpeech(apiKey, text, voice, speed);
      return buffer;
    } catch (error) {
      console.error('TTS Error:', error);
      throw error;
    }
  });

  // Document conversion handler
  ipcMain.handle('convert:docx', async (_, fileBuffer: ArrayBuffer, fileName: string) => {
    try {
      const apiKey = getApiKey('cloudconvert');
      if (!apiKey) {
        throw new Error('CloudConvert API key not configured');
      }
      const pdfBuffer = await convertDocxToPdf(apiKey, Buffer.from(fileBuffer), fileName);
      return pdfBuffer;
    } catch (error) {
      console.error('Conversion Error:', error);
      throw error;
    }
  });

  // File reading handler
  ipcMain.handle('file:read', async (_, filePath: string) => {
    try {
      const buffer = fs.readFileSync(filePath);
      return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
    } catch (error) {
      console.error('File read error:', error);
      throw error;
    }
  });

  // API Key handlers
  ipcMain.handle('store:getApiKey', async (_, service: 'openai' | 'cloudconvert') => {
    return getApiKey(service);
  });

  ipcMain.handle('store:setApiKey', async (_, service: 'openai' | 'cloudconvert', key: string) => {
    setApiKey(service, key);
  });

  ipcMain.handle('store:hasApiKey', async (_, service: 'openai' | 'cloudconvert') => {
    return hasApiKey(service);
  });

  // Split ratio handlers
  ipcMain.handle('store:getSplitRatio', async () => {
    return getSplitRatio();
  });

  ipcMain.handle('store:setSplitRatio', async (_, ratio: number) => {
    setSplitRatio(ratio);
  });

  // Last document handlers
  ipcMain.handle('store:getLastDocument', async () => {
    return getLastDocument();
  });

  ipcMain.handle('store:setLastDocument', async (_, filePath: string, sentenceIndex: number) => {
    setLastDocument(filePath, sentenceIndex);
  });

  ipcMain.handle('store:clearLastDocument', async () => {
    clearLastDocument();
  });
}
