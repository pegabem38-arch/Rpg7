import React, { useState, useEffect } from 'react';
import { Image as ImageIcon, User } from 'lucide-react';
import { imageCache } from '../services/imageCache';

interface CachedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src?: string | null;
  cacheKey?: string;
  fallbackSrc?: string;
  preferBlobUrl?: boolean;
}

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
 * Renderização ultra-rápida (0ms) idêntica à aba de perfil.
 * 1. Busca síncrona imediata da RAM/cache sem atrasos, spinners ou opacity-0.
 * 2. Proteção contra Nulo/Vazio: se o caminho no SQL for vazio ou nulo, exibe
 *    o placeholder cinza padrão sem quebrar a tela.
 * 3. Proteção contra erro de arquivo: se o arquivo físico não existir, ativa o placeholder
 *    graciosamente via onError sem quebrar o componente.
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
  const valid = isValidImagePath(src);

  // Se o caminho for nulo ou vazio desde o início, ativa o estado de erro/placeholder
  const [hasError, setHasError] = useState(!valid);

  // Busca síncrona na memória RAM em 0ms
  const getInitialSrc = () => {
    if (!valid || !src) return '';
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
      setHasError(true);
      return;
    }

    setHasError(false);
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
  }, [src, cacheKey, preferBlobUrl]);

  // Tratamento seguro de erro caso o arquivo físico não exista no celular ou navegador
  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    if (fallbackSrc && isValidImagePath(fallbackSrc) && currentSrc !== fallbackSrc) {
      setCurrentSrc(fallbackSrc);
      return;
    }
    setHasError(true);
    if (onError) {
      try {
        onError(e);
      } catch {}
    }
  };

  // Se o caminho for nulo/vazio ou o arquivo local não existir, exibe o quadrado/círculo cinza padrão
  if (hasError || !currentSrc) {
    return (
      <div
        className={`bg-neutral-800 dark:bg-neutral-800 border border-neutral-700/50 flex flex-col items-center justify-center text-neutral-500 select-none overflow-hidden ${className}`}
        aria-label="Imagem indisponível"
        title="Imagem não encontrada ou pendente de carregamento"
      >
        {isCircle ? (
          <User className="w-1/2 h-1/2 text-neutral-500 opacity-60" />
        ) : (
          <div className="flex flex-col items-center justify-center gap-1.5 p-4 text-center">
            <ImageIcon className="w-8 h-8 text-neutral-500 opacity-50" />
            <span className="text-[10px] text-neutral-400 font-medium tracking-wide">
              Mídia Indisponível
            </span>
          </div>
        )}
      </div>
    );
  }

  // Renderiza diretamente a tag img (0ms imediato, sem div externa e sem opacity-0 artificial)
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
