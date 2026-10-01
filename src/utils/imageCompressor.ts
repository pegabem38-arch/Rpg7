/**
 * Compresses an image File or Base64 string to a lightweight JPEG to prevent
 * localStorage QuotaExceededError while maintaining great visual fidelity.
 */
export async function compressImage(
  fileOrBase64: File | string,
  maxWidth = 1024,
  maxHeight = 1024,
  quality = 0.75
): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      try {
        let width = img.width;
        let height = img.height;

        if (width > maxWidth || height > maxHeight) {
          if (width / height > maxWidth / maxHeight) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', quality));
        } else {
          resolve(typeof fileOrBase64 === 'string' ? fileOrBase64 : '');
        }
      } catch (err) {
        console.warn('Falha na compressão de imagem, usando fallback:', err);
        resolve(typeof fileOrBase64 === 'string' ? fileOrBase64 : '');
      }
    };

    img.onerror = () => {
      if (typeof fileOrBase64 === 'string') {
        resolve(fileOrBase64);
      } else {
        const reader = new FileReader();
        reader.onloadend = () => resolve((reader.result as string) || '');
        reader.readAsDataURL(fileOrBase64);
      }
    };

    if (typeof fileOrBase64 === 'string') {
      img.src = fileOrBase64;
    } else {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          img.src = reader.result;
        } else {
          resolve('');
        }
      };
      reader.readAsDataURL(fileOrBase64);
    }
  });
}

/**
 * Exact same conversion logic as profile photo:
 * Converts any raw File, Blob, or temporary blob: URL into a permanent Base64 Data URL
 * using FileReader, ensuring it can be stored directly in Supabase SQL tables and never
 * disappears upon page reload.
 */
export async function convertToPermanentDataUrl(fileOrUrl: File | Blob | string): Promise<string> {
  if (!fileOrUrl) return '';

  let base64String = '';

  // 1. If it's a File or Blob object (from mobile file picker or camera)
  if (fileOrUrl instanceof File || fileOrUrl instanceof Blob) {
    base64String = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        resolve((event.target?.result as string) || '');
      };
      reader.onerror = (err) => {
        console.error('Erro ao ler arquivo com FileReader:', err);
        resolve('');
      };
      reader.readAsDataURL(fileOrUrl);
    });
  } else if (typeof fileOrUrl === 'string') {
    const trimmed = fileOrUrl.trim();
    // Temporary blob: URL (from phone gallery, mobile webview, or URL.createObjectURL)
    if (trimmed.startsWith('blob:')) {
      try {
        const response = await fetch(trimmed);
        const blob = await response.blob();
        base64String = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = (event) => {
            resolve((event.target?.result as string) || trimmed);
          };
          reader.onerror = () => resolve(trimmed);
          reader.readAsDataURL(blob);
        });
      } catch (err) {
        console.warn('Não foi possível converter blob URL com FileReader:', err);
        base64String = trimmed;
      }
    } else {
      base64String = trimmed;
    }
  }

  if (!base64String) return '';

  // If it's a standard web URL (http/https), keep it
  if (base64String.startsWith('http://') || base64String.startsWith('https://')) {
    return base64String;
  }

  // Compress image to lightweight dimensions (~100KB) to ensure localStorage quota
  // is never exceeded while keeping high visual quality
  if (base64String.startsWith('data:image')) {
    try {
      const compressed = await compressImage(base64String, 1080, 1080, 0.75);
      if (compressed && compressed.length > 50) {
        return compressed;
      }
    } catch (e) {
      console.warn('Falha na compressão do Base64, usando original:', e);
    }
  }

  return base64String;
}

