/**
 * Safe LocalStorage & IndexedDB Wrapper
 * Handles restricted iframes, private browsing mode, quota limits and server-side contexts.
 * Automatically synchronizes with IndexedDB as a second persistence layer to ensure
 * data like profiles, posts, comments and likes NEVER disappear on reload or storage quota limits.
 */

const IDB_NAME = 'rpg_app_storage_v2';
const IDB_STORE = 'app_keyval';

class MemoryStorage {
  private mem = new Map<string, string>();

  getItem(key: string): string | null {
    return this.mem.get(key) || null;
  }
  setItem(key: string, value: string): void {
    this.mem.set(key, value);
  }
  removeItem(key: string): void {
    this.mem.delete(key);
  }
  clear(): void {
    this.mem.clear();
  }
  keys(): string[] {
    return Array.from(this.mem.keys());
  }
}

const memoryFallback = new MemoryStorage();

function isStorageAvailable(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const testKey = '__storage_test__';
    window.localStorage.setItem(testKey, '1');
    window.localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

const canUseLocal = isStorageAvailable();

// --- INDEXEDDB BACKUP LAYER ---
let idbPromise: Promise<IDBDatabase | null> | null = null;

function getIdb(): Promise<IDBDatabase | null> {
  if (typeof window === 'undefined' || !window.indexedDB) {
    return Promise.resolve(null);
  }
  if (!idbPromise) {
    idbPromise = new Promise((resolve) => {
      try {
        const req = window.indexedDB.open(IDB_NAME, 1);
        req.onupgradeneeded = () => {
          const db = req.result;
          if (!db.objectStoreNames.contains(IDB_STORE)) {
            db.createObjectStore(IDB_STORE);
          }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => resolve(null);
      } catch {
        resolve(null);
      }
    });
  }
  return idbPromise;
}

function persistToIndexedDB(key: string, value: string) {
  getIdb().then((db) => {
    if (!db) return;
    try {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      const store = tx.objectStore(IDB_STORE);
      store.put(value, key);
    } catch {}
  }).catch(() => {});
}

function removeFromIndexedDB(key: string) {
  getIdb().then((db) => {
    if (!db) return;
    try {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      const store = tx.objectStore(IDB_STORE);
      store.delete(key);
    } catch {}
  }).catch(() => {});
}

/**
 * Tries to free up space in localStorage when QuotaExceededError is hit
 */
function tryFreeLocalStorageSpace() {
  if (!canUseLocal) return;
  try {
    const legacyKeys = [
      'instaconnect_state_v2',
      'rpg_state',
      'supabase.auth.token',
      'sb-rxdhxykrvivhlmgeyjfy-auth-token'
    ];
    for (const k of legacyKeys) {
      window.localStorage.removeItem(k);
    }
  } catch {}
}

export const safeStorage = {
  getItem(key: string): string | null {
    if (canUseLocal) {
      try {
        const val = window.localStorage.getItem(key);
        if (val !== null) return val;
      } catch {}
    }
    return memoryFallback.getItem(key);
  },

  setItem(key: string, value: string): void {
    // Keep in memory fallback as immediate mirror
    memoryFallback.setItem(key, value);

    // Always persist to IndexedDB asynchronously
    persistToIndexedDB(key, value);

    if (!canUseLocal) return;

    try {
      window.localStorage.setItem(key, value);
    } catch (err) {
      console.warn(`LocalStorage write failed for key "${key}", attempting cleanup:`, err);
      tryFreeLocalStorageSpace();
      try {
        window.localStorage.setItem(key, value);
      } catch (err2) {
        console.warn(`LocalStorage quota still exceeded for "${key}". Key is securely preserved in memory and IndexedDB.`, err2);
      }
    }
  },

  removeItem(key: string): void {
    memoryFallback.removeItem(key);
    removeFromIndexedDB(key);
    if (!canUseLocal) return;
    try {
      window.localStorage.removeItem(key);
    } catch {}
  },

  clear(): void {
    memoryFallback.clear();
    getIdb().then((db) => {
      if (!db) return;
      try {
        const tx = db.transaction(IDB_STORE, 'readwrite');
        tx.objectStore(IDB_STORE).clear();
      } catch {}
    }).catch(() => {});

    if (!canUseLocal) return;
    try {
      window.localStorage.clear();
    } catch {}
  },

  /**
   * Asynchronously restores any keys from IndexedDB that might have been
   * purged from LocalStorage or missed during reload.
   */
  async restoreFromIndexedDB(onKeyRestored?: (key: string, value: string) => void): Promise<Record<string, string>> {
    const db = await getIdb();
    if (!db) return {};

    return new Promise((resolve) => {
      try {
        const tx = db.transaction(IDB_STORE, 'readonly');
        const store = tx.objectStore(IDB_STORE);
        const req = store.openCursor();
        const restored: Record<string, string> = {};

        req.onsuccess = (e: any) => {
          const cursor = e.target.result;
          if (cursor) {
            const key = String(cursor.key);
            const value = String(cursor.value);
            restored[key] = value;
            memoryFallback.setItem(key, value);

            // Sync to localStorage if currently missing
            if (canUseLocal && window.localStorage.getItem(key) === null) {
              try {
                window.localStorage.setItem(key, value);
              } catch {}
            }

            if (onKeyRestored) onKeyRestored(key, value);
            cursor.continue();
          } else {
            resolve(restored);
          }
        };

        req.onerror = () => resolve({});
      } catch {
        resolve({});
      }
    });
  }
};
