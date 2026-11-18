// =============================================================================
// Fotos de los niños (fichas, deberes y ejercicios)
// - Producción: almacenamiento compatible con S3 (recomendado Cloudflare R2: 10 GB gratis al mes).
//   Variables: S3_ENDPOINT, S3_BUCKET, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY (S3_REGION opcional, "auto" en R2)
// - Desarrollo / pruebas: carpeta local PHOTO_DIR (por defecto ./data/photos).
//   OJO: en Render sin disco persistente los archivos locales se pierden al redesplegar.
// - Retención: la foto original se borra a los PHOTO_RETENTION_DAYS días (365 por defecto);
//   se conservan la miniatura y la corrección.
// =============================================================================
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { AwsClient } from 'aws4fetch';

const MAX_PHOTO_BYTES = 4 * 1024 * 1024;   // 4 MB tras comprimir en el móvil
const MAX_THUMB_BYTES = 200 * 1024;

export const RETENTION_DAYS = () => {
  const n = Number(process.env.PHOTO_RETENTION_DAYS);
  return Number.isFinite(n) && n > 0 ? n : 365;
};

const s3 = () => {
  const { S3_ENDPOINT, S3_BUCKET, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY } = process.env;
  if (!S3_ENDPOINT || !S3_BUCKET || !S3_ACCESS_KEY_ID || !S3_SECRET_ACCESS_KEY) return null;
  return {
    client: new AwsClient({ accessKeyId: S3_ACCESS_KEY_ID, secretAccessKey: S3_SECRET_ACCESS_KEY, service: 's3', region: process.env.S3_REGION || 'auto' }),
    base: `${S3_ENDPOINT.replace(/\/$/, '')}/${S3_BUCKET}`,
  };
};

const localDir = () => path.resolve(process.env.PHOTO_DIR || './data/photos');

export const storageMode = () => (s3() ? 's3' : 'local');

const safeKey = (key: string) => {
  if (!/^[a-zA-Z0-9/_.-]+$/.test(key) || key.includes('..')) throw new Error('Clave de foto no válida');
  return key;
};

export async function putObject(key: string, data: Buffer, contentType: string) {
  safeKey(key);
  const remote = s3();
  if (remote) {
    const res = await remote.client.fetch(`${remote.base}/${key}`, { method: 'PUT', body: data, headers: { 'Content-Type': contentType } });
    if (!res.ok) throw new Error(`No se pudo guardar la foto (HTTP ${res.status})`);
    return;
  }
  const file = path.join(localDir(), key);
  await fs.promises.mkdir(path.dirname(file), { recursive: true });
  await fs.promises.writeFile(file, data);
}

export async function getObject(key: string): Promise<Buffer | null> {
  safeKey(key);
  const remote = s3();
  if (remote) {
    const res = await remote.client.fetch(`${remote.base}/${key}`, { method: 'GET' });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`No se pudo leer la foto (HTTP ${res.status})`);
    return Buffer.from(await res.arrayBuffer());
  }
  try { return await fs.promises.readFile(path.join(localDir(), key)); } catch { return null; }
}

export async function deleteObject(key: string) {
  safeKey(key);
  const remote = s3();
  if (remote) {
    await remote.client.fetch(`${remote.base}/${key}`, { method: 'DELETE' }).catch(() => {});
    return;
  }
  await fs.promises.unlink(path.join(localDir(), key)).catch(() => {});
}

/** Convierte un data URL / base64 en Buffer comprobando tipo y tamaño. */
export function decodeImage(input: string, maxBytes = MAX_PHOTO_BYTES): { buffer: Buffer; mediaType: 'image/jpeg' | 'image/png' | 'image/webp' } {
  if (typeof input !== 'string' || !input) throw new Error('Falta la foto.');
  const m = input.match(/^data:(image\/(?:jpeg|png|webp));base64,(.+)$/);
  const mediaType = (m ? m[1] : 'image/jpeg') as 'image/jpeg' | 'image/png' | 'image/webp';
  const buffer = Buffer.from(m ? m[2] : input, 'base64');
  if (!buffer.length) throw new Error('La foto está vacía.');
  if (buffer.length > maxBytes) throw new Error('La foto es demasiado grande. Prueba a hacerla de nuevo.');
  // Comprobación de firma: JPEG FF D8, PNG 89 50, WEBP "RIFF"
  const sig = buffer.subarray(0, 4).toString('hex');
  if (!(sig.startsWith('ffd8') || sig === '89504e47' || sig === '52494646')) throw new Error('El archivo no es una imagen válida.');
  return { buffer, mediaType };
}

export interface StoredPhoto { id: string; key: string; thumbKey: string | null; mediaType: string }

/** Guarda foto (y miniatura opcional) y la registra en la tabla photos. */
export async function savePhoto(db: any, opts: { userId: string; childId: string; kind: string; image: string; thumb?: string }): Promise<StoredPhoto & { buffer: Buffer }> {
  const { buffer, mediaType } = decodeImage(opts.image);
  const id = crypto.randomUUID();
  const ext = mediaType === 'image/png' ? 'png' : mediaType === 'image/webp' ? 'webp' : 'jpg';
  const key = `photos/${opts.userId}/${opts.childId}/${id}.${ext}`;
  await putObject(key, buffer, mediaType);
  let thumbKey: string | null = null;
  if (opts.thumb) {
    try {
      const t = decodeImage(opts.thumb, MAX_THUMB_BYTES);
      thumbKey = `photos/${opts.userId}/${opts.childId}/${id}_thumb.jpg`;
      await putObject(thumbKey, t.buffer, t.mediaType);
    } catch { thumbKey = null; }
  }
  const now = Date.now();
  await db.prepare('INSERT INTO photos (id, user_id, child_id, kind, object_key, thumb_key, media_type, created_at, expires_at, deleted) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)')
    .run(id, opts.userId, opts.childId, opts.kind, key, thumbKey, mediaType, now, now + RETENTION_DAYS() * 24 * 3600 * 1000);
  return { id, key, thumbKey, mediaType, buffer };
}

let warned = false;
export async function initPhotoStorage(db: any) {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS photos (
      id VARCHAR(64) PRIMARY KEY,
      user_id VARCHAR(64) NOT NULL,
      child_id VARCHAR(64) NOT NULL,
      kind VARCHAR(32),
      object_key VARCHAR(255) NOT NULL,
      thumb_key VARCHAR(255),
      media_type VARCHAR(32),
      created_at BIGINT NOT NULL,
      expires_at BIGINT NOT NULL,
      deleted INTEGER DEFAULT 0
    );
  `);
  if (!warned && process.env.NODE_ENV === 'production' && storageMode() === 'local') {
    warned = true;
    console.warn('[FOTOS] Guardando fotos en carpeta local. En Render se pierden al redesplegar: configura S3_ENDPOINT/S3_BUCKET (Cloudflare R2).');
  }
}

/** Borra las fotos originales caducadas (se conserva la miniatura). */
export async function purgeExpiredPhotos(db: any) {
  const rows = await db.prepare('SELECT id, object_key FROM photos WHERE deleted = 0 AND expires_at < ?').all(Date.now());
  for (const r of rows) {
    await deleteObject(r.object_key);
    await db.prepare('UPDATE photos SET deleted = 1 WHERE id = ?').run(r.id);
  }
  if (rows.length) console.log(`[FOTOS] ${rows.length} foto(s) caducada(s) borrada(s) (retención ${RETENTION_DAYS()} días)`);
  return rows.length;
}

// =============================================================================
// Grabaciones de lectura (opción 6): la voz del niño, para que la escuchen sus padres.
// Se guardan en la misma tabla "photos" (kind = 'reading_audio') para que caduquen igual (365 días).
// =============================================================================
const MAX_AUDIO_BYTES = 6 * 1024 * 1024; // unos 5 minutos a 128 kbps; lo normal son 100–600 KB

export function decodeAudio(input: string): { buffer: Buffer; mediaType: string; ext: string } {
  const m = String(input || '').match(/^data:([a-z0-9/+.;=-]+);base64,(.*)$/i);
  const b64 = m ? m[2] : String(input || '');
  const buffer = Buffer.from(b64, 'base64');
  if (!buffer.length) throw new Error('Grabación vacía');
  if (buffer.length > MAX_AUDIO_BYTES) throw new Error('La grabación es demasiado larga');
  // Se comprueba la firma real del archivo (no lo que diga el navegador)
  if (buffer.subarray(0, 4).toString('hex') === '1a45dfa3') return { buffer, mediaType: 'audio/webm', ext: 'webm' };
  if (buffer.subarray(0, 4).toString() === 'OggS') return { buffer, mediaType: 'audio/ogg', ext: 'ogg' };
  if (buffer.subarray(4, 8).toString() === 'ftyp') return { buffer, mediaType: 'audio/mp4', ext: 'm4a' };
  if (buffer.subarray(0, 4).toString() === 'RIFF' && buffer.subarray(8, 12).toString() === 'WAVE') return { buffer, mediaType: 'audio/wav', ext: 'wav' };
  throw new Error('Formato de audio no admitido');
}

export async function saveAudio(db: any, opts: { userId: string; childId: string; audio: string }): Promise<{ id: string; bytes: number }> {
  const { buffer, mediaType, ext } = decodeAudio(opts.audio);
  const id = crypto.randomUUID();
  const key = `audio/${opts.userId}/${opts.childId}/${id}.${ext}`;
  await putObject(key, buffer, mediaType);
  const now = Date.now();
  await db.prepare('INSERT INTO photos (id, user_id, child_id, kind, object_key, thumb_key, media_type, created_at, expires_at, deleted) VALUES (?, ?, ?, ?, ?, NULL, ?, ?, ?, 0)')
    .run(id, opts.userId, opts.childId, 'reading_audio', key, mediaType, now, now + RETENTION_DAYS() * 24 * 3600 * 1000);
  return { id, bytes: buffer.length };
}

export async function deleteStoredFile(db: any, id: string) {
  const row = await db.prepare('SELECT object_key FROM photos WHERE id = ? AND deleted = 0').get(id);
  if (!row) return false;
  await deleteObject(row.object_key).catch(() => {});
  await db.prepare('UPDATE photos SET deleted = 1 WHERE id = ?').run(id);
  return true;
}
