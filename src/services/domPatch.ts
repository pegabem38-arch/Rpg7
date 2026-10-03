/**
 * Global DOM Helper
 * Standalone safe cleanup helper without altering native prototype behaviors.
 */
export function initDomProtection() {
  // Clear any obsolete IndexedDB caches or sessionStorage remnants from older builds
  if (typeof window !== 'undefined') {
    try {
      if (window.indexedDB) {
        window.indexedDB.deleteDatabase('rpg_image_cache_db');
      }
      if (window.sessionStorage) {
        window.sessionStorage.removeItem('rpg_ram_images_v1');
      }
    } catch {}
  }
}
