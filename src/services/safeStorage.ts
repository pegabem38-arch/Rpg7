/**
 * Safe LocalStorage Wrapper
 * Handles restricted iframes, private browsing mode, quota limits and server-side contexts.
 */
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

export const safeStorage = {
  getItem(key: string): string | null {
    if (!canUseLocal) return memoryFallback.getItem(key);
    try {
      return window.localStorage.getItem(key);
    } catch {
      return memoryFallback.getItem(key);
    }
  },

  setItem(key: string, value: string): void {
    if (!canUseLocal) {
      memoryFallback.setItem(key, value);
      return;
    }
    try {
      window.localStorage.setItem(key, value);
    } catch (err) {
      console.warn('LocalStorage write failed, using memory fallback:', err);
      memoryFallback.setItem(key, value);
    }
  },

  removeItem(key: string): void {
    if (!canUseLocal) {
      memoryFallback.removeItem(key);
      return;
    }
    try {
      window.localStorage.removeItem(key);
    } catch {
      memoryFallback.removeItem(key);
    }
  },

  clear(): void {
    if (!canUseLocal) {
      memoryFallback.clear();
      return;
    }
    try {
      window.localStorage.clear();
    } catch {
      memoryFallback.clear();
    }
  }
};
