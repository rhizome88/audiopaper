import { app, BrowserWindow, ipcMain, dialog, safeStorage } from 'electron';
import * as path from 'path';
import { registerIpcHandlers } from './ipc-handlers';
import { initStore, getWindowState, saveWindowState } from './store';

let mainWindow: BrowserWindow | null = null;

const isDev = process.argv.includes('--dev');

function createWindow(): void {
  const windowState = getWindowState();

  mainWindow = new BrowserWindow({
    width: windowState.width || 1400,
    height: windowState.height || 900,
    x: windowState.x,
    y: windowState.y,
    minWidth: 1000,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true,
    },
    titleBarStyle: 'hiddenInset',
    show: false,
  });

  // Save window state on resize/move
  mainWindow.on('resize', () => {
    if (mainWindow) {
      const bounds = mainWindow.getBounds();
      saveWindowState({ ...bounds });
    }
  });

  mainWindow.on('move', () => {
    if (mainWindow) {
      const bounds = mainWindow.getBounds();
      saveWindowState({ ...bounds });
    }
  });

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  // Load the app
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

// Register IPC handlers
function setupIpc(): void {
  registerIpcHandlers(ipcMain);

  // File dialog handler
  ipcMain.handle('dialog:openFile', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [
        { name: 'Documents', extensions: ['pdf', 'docx', 'doc', 'md', 'markdown'] },
        { name: 'PDF', extensions: ['pdf'] },
        { name: 'Word', extensions: ['docx', 'doc'] },
        { name: 'Markdown', extensions: ['md', 'markdown'] },
      ],
    });
    return result;
  });

  // Safe storage for API keys
  ipcMain.handle('safeStorage:isAvailable', () => {
    return safeStorage.isEncryptionAvailable();
  });

  ipcMain.handle('safeStorage:encrypt', (_, text: string) => {
    if (safeStorage.isEncryptionAvailable()) {
      return safeStorage.encryptString(text).toString('base64');
    }
    return null;
  });

  ipcMain.handle('safeStorage:decrypt', (_, encrypted: string) => {
    if (safeStorage.isEncryptionAvailable()) {
      const buffer = Buffer.from(encrypted, 'base64');
      return safeStorage.decryptString(buffer);
    }
    return null;
  });
}

// App lifecycle
app.whenReady().then(() => {
  initStore();
  setupIpc();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
