import React, { useState, useEffect } from 'react';
import { imageCache } from '../services/imageCache';

interface CachedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src?: string | null;
  cacheKey?: string;
  fallbackSrc?: string;
  preferBlobUrl?: boolean;
}

// Fallback visual estável para avatares (círculos)
const FALLBACK_AVATAR_SVG =
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128"><rect width="128" height="128" fill="%23262626"/><circle cx="64" cy="50" r="24" fill="%23525252"/><path d="M24 112 c0 -26 18 -42 40 -42 s40 16 40 42" fill="%23525252"/></svg>';

// Fallback visual quadrado cinza padrão para mídia de feed/posts
const FALLBACK_MEDIA_SVG =
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400"><rect width="400" height="400" fill="%23262626"/><rect x="140" y="140" width="120" height="90" rx="12" fill="%23383838"/><circle cx="175" cy="170" r="12" fill="%23555555"/><path d="M152 215 l28 -30 l24 24 l20 -18 l24 24 z" fill="%23555555"/></svg>';

/**
 * Validação rigorosa do caminho da imagem (SQL, arquivo local ou base64)
 */
function isValidImagePath(val?: string | null): boolean {
  if (!val) return false;
  if (typeof val !== 'string') return false;
  const trimmed = val.trim();
  if (
    trimmed === '' ||
    trimmed === 'null' ||
    trimmed === 'undefined' ||
    trimmed === '[object Object]' ||
    trimmed === 'undefined/null'
  ) {
    return false;
  }
  return true;
}

/**
 * CachedImage
 * 
 * 1. Estabilidade no DOM: Renderiza sempre uma tag <img> consistente, evitando
 *    erros de reconciliação do React ("insertBefore") ao chavear elementos.
 * 2. Proteção contra Nulo/Vazio: Se o caminho do SQL vier vazio, nulo ou inválido,
 *    utiliza imediatamente o fallback SVG sem quebrar a tela.
 * 3. Proteção contra arquivo inacessível: Se o arquivo físico não existir no celular/navegador,
 *    chaveia de forma transparente para o placeholder sem travar a interface.
 * 4. Carregamento em 0ms: Leitura síncrona imediata da RAM/cache.
 */
export const CachedImage: React.FC<CachedImageProps> = ({
  src,
  cacheKey,
  fallbackSrc,
  preferBlobUrl = false,
  className = '',
  alt = '',
  onError,
  ...props
}) => {
  const isCircle = className.includes('rounded-full');
  const defaultPlaceholder = isCircle ? FALLBACK_AVATAR_SVG : FALLBACK_MEDIA_SVG;
  const valid = isValidImagePath(src);

  // Busca síncrona na memória RAM em 0ms
  const getInitialSrc = () => {
    if (!valid || !src) {
      return fallbackSrc && isValidImagePath(fallbackSrc) ? fallbackSrc : defaultPlaceholder;
    }
    try {
      const cached = imageCache.get(src, cacheKey, preferBlobUrl);
      return cached || src;
    } catch {
      return src;
    }
  };

  const [currentSrc, setCurrentSrc] = useState<string>(getInitialSrc);

  useEffect(() => {
    const isNowValid = isValidImagePath(src);
    if (!isNowValid || !src) {
      setCurrentSrc(fallbackSrc && isValidImagePath(fallbackSrc) ? fallbackSrc : defaultPlaceholder);
      return;
    }

    try {
      if (!imageCache.has(src)) {
        imageCache.set(cacheKey || src, src);
      }
      const cached = imageCache.get(src, cacheKey, preferBlobUrl);
      if (cached && cached !== currentSrc) {
        setCurrentSrc(cached);
      } else if (src !== currentSrc) {
        setCurrentSrc(src);
      }
    } catch {
      if (src !== currentSrc) {
        setCurrentSrc(src);
      }
    }
  }, [src, cacheKey, preferBlobUrl, fallbackSrc, defaultPlaceholder]);

  // Tratamento seguro de erro caso o arquivo físico não exista no celular ou navegador
  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    if (fallbackSrc && isValidImagePath(fallbackSrc) && currentSrc !== fallbackSrc) {
      setCurrentSrc(fallbackSrc);
      return;
    }
    // Se o arquivo falhar ao abrir, chaveia suavemente para o SVG placeholder
    if (currentSrc !== defaultPlaceholder) {
      setCurrentSrc(defaultPlaceholder);
    }
    if (onError) {
      try {
        onError(e);
      } catch {}
    }
  };

  // Renderiza SEMPRE a tag <img> estável (sem trocar de nó no DOM)
  return (
    <img
      src={currentSrc}
      alt={alt}
      className={className}
      loading="eager"
      decoding="async"
      onError={handleImageError}
      {...props}
    />
  );
};
