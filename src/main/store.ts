import Store from 'electron-store';
import { safeStorage } from 'electron';

interface StoreSchema {
  windowState: {
    width: number;
    height: number;
    x?: number;
    y?: number;
  };
  splitRatio: number;
  encryptedKeys: {
    openai?: string;
    cloudconvert?: string;
  };
  lastDocument?: {
    filePath: string;
    sentenceIndex: number;
  };
}

let store: Store<StoreSchema>;

export function initStore(): void {
  store = new Store<StoreSchema>({
    defaults: {
      windowState: {
        width: 1400,
        height: 900,
      },
      splitRatio: 0.5,
      encryptedKeys: {},
    },
  });
}

export function getStore(): Store<StoreSchema> {
  return store;
}

// Window state
export function getWindowState(): StoreSchema['windowState'] {
  return store.get('windowState');
}

export function saveWindowState(state: Partial<StoreSchema['windowState']>): void {
  const current = store.get('windowState');
  store.set('windowState', { ...current, ...state });
}

// Split ratio
export function getSplitRatio(): number {
  return store.get('splitRatio');
}

export function setSplitRatio(ratio: number): void {
  store.set('splitRatio', Math.max(0.2, Math.min(0.8, ratio)));
}

// API Key management with encryption
export function setApiKey(service: 'openai' | 'cloudconvert', key: string): void {
  if (safeStorage.isEncryptionAvailable()) {
    const encrypted = safeStorage.encryptString(key).toString('base64');
    const keys = store.get('encryptedKeys') || {};
    keys[service] = encrypted;
    store.set('encryptedKeys', keys);
  } else {
    // Fallback: store without encryption (not recommended)
    const keys = store.get('encryptedKeys') || {};
    keys[service] = key;
    store.set('encryptedKeys', keys);
  }
}

export function getApiKey(service: 'openai' | 'cloudconvert'): string | null {
  const keys = store.get('encryptedKeys') || {};
  const encrypted = keys[service];

  if (!encrypted) return null;

  if (safeStorage.isEncryptionAvailable()) {
    try {
      const buffer = Buffer.from(encrypted, 'base64');
      return safeStorage.decryptString(buffer);
    } catch {
      return null;
    }
  }

  // Fallback: return as-is
  return encrypted;
}

export function hasApiKey(service: 'openai' | 'cloudconvert'): boolean {
  const keys = store.get('encryptedKeys') || {};
  return !!keys[service];
}

// Last document persistence
export function getLastDocument(): StoreSchema['lastDocument'] | null {
  return store.get('lastDocument') || null;
}

export function setLastDocument(filePath: string, sentenceIndex: number): void {
  store.set('lastDocument', { filePath, sentenceIndex });
}

export function clearLastDocument(): void {
  store.delete('lastDocument');
}
