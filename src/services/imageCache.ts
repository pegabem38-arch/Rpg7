/**
 * ImageCacheManager - Gerenciador Leve de Referências de Imagens
 * 
 * Mantém referências diretas de URLs/Base64 em memória sem alocação de Blobs
 * ou chamadas síncronas pesadas (atob / Uint8Array / URL.createObjectURL),
 * prevenindo estouro de memória (Out Of Memory / Aw Snap) no navegador.
 */

class ImageCacheManager {
  private ramCache: Map<string, string> = new Map();
  private maxEntries = 50;

  public set(key: string, dataUrlOrSrc: string): void {
    if (!key || !dataUrlOrSrc) return;
    if (this.ramCache.size >= this.maxEntries) {
      // Remove a chave mais antiga para manter pegada de memória baixa
      const firstKey = this.ramCache.keys().next().value;
      if (firstKey) this.ramCache.delete(firstKey);
    }
    this.ramCache.set(key, dataUrlOrSrc);
  }

  public get(keyOrSrc?: string | null, fallbackKey?: string | null): string {
    if (!keyOrSrc || typeof keyOrSrc !== 'string') {
      return fallbackKey && typeof fallbackKey === 'string' ? (this.ramCache.get(fallbackKey) || fallbackKey) : '';
    }
    const cleanKey = keyOrSrc.trim();
    if (!cleanKey) {
      return fallbackKey && typeof fallbackKey === 'string' ? (this.ramCache.get(fallbackKey) || fallbackKey) : '';
    }
    if (this.ramCache.has(cleanKey)) {
      return this.ramCache.get(cleanKey)!;
    }
    if (fallbackKey && this.ramCache.has(fallbackKey)) {
      return this.ramCache.get(fallbackKey)!;
    }
    return cleanKey;
  }

  public has(keyOrSrc: string): boolean {
    return this.ramCache.has(keyOrSrc);
  }

  public cachePosts(posts: any[]): void {
    if (!Array.isArray(posts)) return;
    for (const p of posts.slice(0, 20)) {
      if (!p) continue;
      if (p.media_url && typeof p.media_url === 'string') {
        this.set(`post_${p.id}`, p.media_url);
      }
      if (p.profile?.avatar_url && typeof p.profile.avatar_url === 'string') {
        this.set(`avatar_${p.profile.id}`, p.profile.avatar_url);
      }
    }
  }

  public cacheProfiles(profiles: any[]): void {
    if (!Array.isArray(profiles)) return;
    for (const p of profiles.slice(0, 20)) {
      if (!p) continue;
      if (p.avatar_url && typeof p.avatar_url === 'string') {
        this.set(`avatar_${p.id}`, p.avatar_url);
      }
    }
  }

  public cacheStories(stories: any[]): void {
    if (!Array.isArray(stories)) return;
    for (const s of stories.slice(0, 10)) {
      if (!s) continue;
      if (s.media_url && typeof s.media_url === 'string') {
        this.set(`story_${s.id}`, s.media_url);
      }
    }
  }

  public getStats(): { count: number; keys: string[] } {
    return {
      count: this.ramCache.size,
      keys: Array.from(this.ramCache.keys())
    };
  }

  public clear(): void {
    this.ramCache.clear();
  }
}

export const imageCache = new ImageCacheManager();

if (typeof window !== 'undefined') {
  (window as any).imageCache = imageCache;
}
