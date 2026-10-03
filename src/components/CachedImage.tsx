import React, { useState, useEffect } from 'react';

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

function isValidImagePath(val?: string | null): boolean {
  if (!val) return false;
  if (typeof val !== 'string') return false;
  const trimmed = val.trim();
  return !(
    trimmed === '' ||
    trimmed === 'null' ||
    trimmed === 'undefined' ||
    trimmed === '[object Object]' ||
    trimmed === 'undefined/null'
  );
}

/**
 * CachedImage
 * Renderiza imagens com carregamento nativo seguro (loading="lazy", decoding="async"),
 * com fallback imediato em caso de erro, sem loops no React e sem consumo excessivo de RAM.
 */
export const CachedImage: React.FC<CachedImageProps> = ({
  src,
  cacheKey,
  fallbackSrc,
  preferBlobUrl,
  className = '',
  alt = '',
  onError,
  ...props
}) => {
  const isCircle = className.includes('rounded-full');
  const defaultPlaceholder = isCircle ? FALLBACK_AVATAR_SVG : FALLBACK_MEDIA_SVG;

  const valid = isValidImagePath(src);
  const targetSrc = valid && src ? src : (fallbackSrc && isValidImagePath(fallbackSrc) ? fallbackSrc : defaultPlaceholder);

  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
  }, [src]);

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    setHasError(true);
    if (onError) {
      try {
        onError(e);
      } catch {}
    }
  };

  const finalSrc = hasError
    ? (fallbackSrc && isValidImagePath(fallbackSrc) ? fallbackSrc : defaultPlaceholder)
    : targetSrc;

  return (
    <img
      src={finalSrc}
      alt={alt}
      className={className}
      loading="lazy"
      decoding="async"
      onError={handleImageError}
      {...props}
    />
  );
};
