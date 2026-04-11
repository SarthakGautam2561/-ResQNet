import * as FileSystem from 'expo-file-system/legacy';

const STORAGE_FILE = `${FileSystem.documentDirectory}resqnet_storage.json`;
let lastStorageError: string | null = null;

type Store = Record<string, string>;

async function readStore(): Promise<Store> {
  try {
    const info = await FileSystem.getInfoAsync(STORAGE_FILE);
    if (!info.exists) {
      lastStorageError = null;
      return {};
    }
    const raw = await FileSystem.readAsStringAsync(STORAGE_FILE);
    if (!raw) return {};
    lastStorageError = null;
    return JSON.parse(raw) as Store;
  } catch {
    lastStorageError = 'Failed to read local storage file.';
    return {};
  }
}

async function writeStore(store: Store): Promise<void> {
  try {
    await FileSystem.writeAsStringAsync(STORAGE_FILE, JSON.stringify(store));
    lastStorageError = null;
  } catch {
    // Ignore storage write errors
    lastStorageError = 'Failed to write local storage file.';
  }
}

export const kvStorage = {
  async getItem(key: string): Promise<string | null> {
    const store = await readStore();
    return store[key] ?? null;
  },
  async setItem(key: string, value: string): Promise<void> {
    const store = await readStore();
    store[key] = value;
    await writeStore(store);
  },
  async removeItem(key: string): Promise<void> {
    const store = await readStore();
    if (key in store) {
      delete store[key];
      await writeStore(store);
    }
  },
};

export function getStorageFilePath(): string {
  return STORAGE_FILE;
}

export async function getStorageInfo(): Promise<{ path: string; exists: boolean; size: number | null; lastError: string | null }> {
  const info = await FileSystem.getInfoAsync(STORAGE_FILE);
  return {
    path: STORAGE_FILE,
    exists: info.exists,
    size: typeof info.size === 'number' ? info.size : null,
    lastError: lastStorageError,
  };
}

export function getLastStorageError(): string | null {
  return lastStorageError;
}
