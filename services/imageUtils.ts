// Utilidades de fotos en el navegador (gratis, sin IA):
// - Comprime la foto antes de subirla (máx. 1600 px, JPEG) y crea una miniatura.
// - Lee el código QR de las fichas de EduAmigo para saber qué ficha es.
import jsQR from 'jsqr';

const loadImage = (src: string) => new Promise<HTMLImageElement>((resolve, reject) => {
  const img = new Image();
  img.onload = () => resolve(img);
  img.onerror = () => reject(new Error('No se ha podido abrir la imagen.'));
  img.src = src;
});

const drawScaled = (img: HTMLImageElement, maxSide: number) => {
  const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return { canvas, ctx };
};

export const fileToDataUrl = (file: File) => new Promise<string>((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result));
  reader.onerror = () => reject(new Error('No se ha podido leer el archivo.'));
  reader.readAsDataURL(file);
});

/** Devuelve la foto comprimida (≈200–500 KB) y una miniatura (≈10–20 KB). */
export async function compressPhoto(dataUrl: string): Promise<{ image: string; thumb: string }> {
  const img = await loadImage(dataUrl);
  const big = drawScaled(img, 1600);
  const small = drawScaled(img, 240);
  return {
    image: big.canvas.toDataURL('image/jpeg', 0.82),
    thumb: small.canvas.toDataURL('image/jpeg', 0.6),
  };
}

/** Busca el QR de una ficha de EduAmigo en la foto. Devuelve el id de la ficha o null. */
export async function readWorksheetQr(dataUrl: string): Promise<string | null> {
  try {
    const img = await loadImage(dataUrl);
    // Se prueba a dos tamaños: el QR impreso es pequeño respecto a la hoja
    for (const side of [1600, 1000, 2400]) {
      const { canvas, ctx } = drawScaled(img, side);
      const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(data.data, data.width, data.height, { inversionAttempts: 'dontInvert' });
      if (code?.data) {
        try {
          const payload = JSON.parse(code.data);
          if (payload && typeof payload.id === 'string' && /eduamigo/i.test(String(payload.app || ''))) return payload.id;
        } catch { /* QR que no es de EduAmigo */ }
      }
    }
  } catch { /* imagen no legible */ }
  return null;
}
