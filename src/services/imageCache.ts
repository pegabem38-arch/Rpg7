/**
 * ImageCacheManager - Gerenciador de Cache de Imagens em Memória RAM
 * 
 * Mantém as strings Base64 do SQL e URLs de mídia salvas diretamente na memória RAM (Map),
 * permitindo renderização instantânea (0ms) sem necessidade de consultar ou decodificar
 * o SQL novamente a cada reload da página.
 * 
 * Conta com persistência automática de alta velocidade via IndexedDB/SessionStorage
 * para restaurar a lista na memória RAM imediatamente no primeiro milissegundo de reload.
 */

const DB_NAME = 'rpg_image_cache_db';
const DB_VERSION = 1;
const STORE_NAME = 'images';
const SESSION_CACHE_KEY = 'rpg_ram_images_v1';

class ImageCacheManager {
  // 1. Armazenamento Primário Ultrarrápido em Memória RAM
  private ramCache: Map<string, string> = new Map();
  // 2. Cache de Blob URLs para acelerar renderização pelo navegador
  private blobUrlCache: Map<string, string> = new Map();
  private dbPromise: Promise<IDBDatabase | null> | null = null;
  private isInitialized = false;

  constructor() {
    this.initDatabase();
    this.restoreFromSessionCache();
  }

  /**
   * Inicializa o IndexedDB para persistência segura de Base64 grandes
   */
  private initDatabase(): Promise<IDBDatabase | null> {
    if (this.dbPromise) return this.dbPromise;

    if (typeof window === 'undefined' || !window.indexedDB) {
      this.dbPromise = Promise.resolve(null);
      return this.dbPromise;
    }

    this.dbPromise = new Promise((resolve) => {
      try {
        const request = window.indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            db.createObjectStore(STORE_NAME, { keyPath: 'key' });
          }
        };

        request.onsuccess = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          this.loadAllFromIndexedDB(db);
          resolve(db);
        };

        request.onerror = () => {
          console.warn('ImageCache: IndexedDB não pôde ser aberto, usando apenas RAM e SessionStorage.');
          resolve(null);
        };
      } catch (err) {
        console.warn('ImageCache: Erro ao instanciar IndexedDB:', err);
        resolve(null);
      }
    });

    return this.dbPromise;
  }

  /**
   * Restaura itens prioritários da sessionStorage para a RAM em 0ms
   */
  private restoreFromSessionCache() {
    try {
      if (typeof window === 'undefined' || !window.sessionStorage) return;
      const raw = sessionStorage.getItem(SESSION_CACHE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (typeof parsed === 'object' && parsed !== null) {
          for (const [k, val] of Object.entries(parsed)) {
            if (typeof val === 'string') {
              this.ramCache.set(k, val);
              this.createBlobUrlIfBase64(k, val);
            }
          }
        }
      }
    } catch (e) {
      // Ignora erro de quota em session storage
    }
  }

  private sessionSyncTimer: any = null;

  /**
   * Salva os itens mais leves na SessionStorage com debounce para não travar a thread
   */
  private syncToSessionCache() {
    if (this.sessionSyncTimer) return;
    this.sessionSyncTimer = setTimeout(() => {
      this.sessionSyncTimer = null;
      try {
        if (typeof window === 'undefined' || !window.sessionStorage) return;
        const snapshot: Record<string, string> = {};
        let count = 0;
        for (const [k, v] of this.ramCache.entries()) {
          if (count >= 15) break;
          // Apenas imagens leves (avatares) para não exceder a quota do navegador
          if (typeof v === 'string' && v.length < 75000) {
            snapshot[k] = v;
            count++;
          }
        }
        sessionStorage.setItem(SESSION_CACHE_KEY, JSON.stringify(snapshot));
      } catch (e) {}
    }, 400);
  }

  /**
   * Carrega tudo do IndexedDB diretamente para a lista em memória RAM
   */
  private loadAllFromIndexedDB(db: IDBDatabase) {
    try {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        const items = request.result || [];
        for (const item of items) {
          if (item && item.key && item.data) {
            this.ramCache.set(item.key, item.data);
            this.createBlobUrlIfBase64(item.key, item.data);
          }
        }
        this.isInitialized = true;
      };
    } catch (err) {
      console.warn('ImageCache: Erro ao ler registros do IndexedDB:', err);
    }
  }

  /**
   * Converte strings Base64 em Blob URLs na RAM para renderização acelerada por GPU
   */
  private createBlobUrlIfBase64(key: string, dataUrl: string): string | null {
    if (!dataUrl || typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image/')) return null;
    if (this.blobUrlCache.has(key)) return this.blobUrlCache.get(key)!;

    try {
      const parts = dataUrl.split(',');
      if (parts.length < 2 || !parts[1]) return null;
      const mime = parts[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
      const bstr = atob(parts[1]);
      let n = bstr.length;
      const u8arr = new Uint8Array(n);
      while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
      }
      const blob = new Blob([u8arr], { type: mime });
      const blobUrl = URL.createObjectURL(blob);
      this.blobUrlCache.set(key, blobUrl);
      return blobUrl;
    } catch {
      return null;
    }
  }

  /**
   * Armazena uma imagem na lista em memória RAM e persiste em segundo plano
   */
  public set(key: string, dataUrlOrSrc: string): void {
    if (!key || !dataUrlOrSrc) return;

    // 1. Gravação imediata na memória RAM
    this.ramCache.set(key, dataUrlOrSrc);
    // Também mapeia pelo próprio src/base64 como chave para buscas diretas
    if (key !== dataUrlOrSrc) {
      this.ramCache.set(dataUrlOrSrc, dataUrlOrSrc);
    }

    // 2. Prepara Blob URL se for base64
    this.createBlobUrlIfBase64(key, dataUrlOrSrc);

    // 3. Atualiza sessionStorage para o próximo reload
    this.syncToSessionCache();

    // 4. Persiste no IndexedDB de forma não-bloqueante
    this.persistToIndexedDB(key, dataUrlOrSrc);
  }

  private async persistToIndexedDB(key: string, data: string) {
    try {
      const db = await this.initDatabase();
      if (!db) return;
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.put({ key, data, timestamp: Date.now() });
    } catch (err) {
      // Falha silenciosa para não travar a aplicação
    }
  }

  /**
   * Retorna a imagem da memória RAM em 0ms.
   * Se preferBlobUrl for verdadeiro e houver Blob URL gerado, retorna ele.
   */
  public get(keyOrSrc?: string | null, fallbackKey?: string | null, preferBlobUrl = false): string {
    if (!keyOrSrc || typeof keyOrSrc !== 'string') {
      return fallbackKey && typeof fallbackKey === 'string' ? this.get(fallbackKey) : '';
    }

    const cleanKey = keyOrSrc.trim();
    if (!cleanKey || cleanKey === 'null' || cleanKey === 'undefined' || cleanKey === '[object Object]') {
      return fallbackKey && typeof fallbackKey === 'string' ? this.get(fallbackKey) : '';
    }

    // Verifica blob url se solicitado
    if (preferBlobUrl) {
      if (this.blobUrlCache.has(cleanKey)) return this.blobUrlCache.get(cleanKey)!;
      if (fallbackKey && this.blobUrlCache.has(fallbackKey)) return this.blobUrlCache.get(fallbackKey)!;
    }

    // Busca na RAM Cache por chave principal
    if (this.ramCache.has(cleanKey)) {
      return this.ramCache.get(cleanKey)!;
    }

    // Busca por chave alternativa (ex: id do post)
    if (fallbackKey && this.ramCache.has(fallbackKey)) {
      return this.ramCache.get(fallbackKey)!;
    }

    // Se a própria string já for uma base64 válida, registra ela na RAM agora
    if (cleanKey.startsWith('data:image/')) {
      this.set(cleanKey, cleanKey);
      if (fallbackKey) {
        this.set(fallbackKey, cleanKey);
      }
    }

    return cleanKey;
  }

  /**
   * Verifica se a imagem já se encontra carregada na memória RAM
   */
  public has(keyOrSrc: string): boolean {
    return this.ramCache.has(keyOrSrc);
  }

  /**
   * Pré-carrega uma lista completa de posts na memória RAM
   */
  public cachePosts(posts: any[]): void {
    if (!Array.isArray(posts)) return;
    for (const p of posts) {
      if (!p) continue;
      if (p.media_url) {
        this.set(`post_${p.id}`, p.media_url);
        this.set(p.media_url, p.media_url);
      }
      if (p.profile?.avatar_url) {
        this.set(`avatar_${p.profile.id}`, p.profile.avatar_url);
        this.set(p.profile.avatar_url, p.profile.avatar_url);
      }
    }
  }

  /**
   * Pré-carrega uma lista completa de perfis na memória RAM
   */
  public cacheProfiles(profiles: any[]): void {
    if (!Array.isArray(profiles)) return;
    for (const p of profiles) {
      if (!p) continue;
      if (p.avatar_url) {
        this.set(`avatar_${p.id}`, p.avatar_url);
        this.set(p.avatar_url, p.avatar_url);
      }
      if (p.cover_url) {
        this.set(`cover_${p.id}`, p.cover_url);
        this.set(p.cover_url, p.cover_url);
      }
    }
  }

  /**
   * Pré-carrega uma lista de stories na memória RAM
   */
  public cacheStories(stories: any[]): void {
    if (!Array.isArray(stories)) return;
    for (const s of stories) {
      if (!s) continue;
      if (s.media_url) {
        this.set(`story_${s.id}`, s.media_url);
        this.set(s.media_url, s.media_url);
      }
    }
  }

  /**
   * Estatísticas de uso da memória RAM
   */
  public getStats(): { count: number; keys: string[] } {
    return {
      count: this.ramCache.size,
      keys: Array.from(this.ramCache.keys())
    };
  }

  /**
   * Limpa o cache da memória RAM e do banco caso solicitado
   */
  public clear(): void {
    this.ramCache.clear();
    for (const blobUrl of this.blobUrlCache.values()) {
      URL.revokeObjectURL(blobUrl);
    }
    this.blobUrlCache.clear();
    try {
      sessionStorage.removeItem(SESSION_CACHE_KEY);
      this.initDatabase().then((db) => {
        if (db) {
          const tx = db.transaction(STORE_NAME, 'readwrite');
          tx.objectStore(STORE_NAME).clear();
        }
      });
    } catch {}
  }
}

// Instância singleton global do gerenciador de cache na memória RAM
export const imageCache = new ImageCacheManager();

// Disponibiliza na window para inspeção ou chamadas diretas caso necessário
if (typeof window !== 'undefined') {
  (window as any).imageCache = imageCache;
}
