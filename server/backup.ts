// Copia de seguridad diaria de la base de datos en el almacenamiento de fotos (Cloudflare R2 en producción).
// El plan gratis de Turso solo permite volver 1 día atrás; con esto se guardan BACKUP_RETENTION_DAYS días (30 por defecto).
// Archivo: backups/eduamigo-AAAA-MM-DD.sql.gz  ·  Restaurar: npm run restore -- <archivo.sql.gz>
import zlib from 'zlib';
import { Db, dumpDatabase } from './db';
import { putObject, deleteObject, storageMode } from './storage';

const DAY = 24 * 3600 * 1000;
const retentionDays = () => {
  const n = Number(process.env.BACKUP_RETENTION_DAYS);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : 30;
};
const dayKey = (t: number) => `backups/eduamigo-${new Date(t).toISOString().slice(0, 10)}.sql.gz`;

export async function runBackup(db: Db, now = Date.now()) {
  const { sql, tables, rows } = await dumpDatabase(db);
  const gz = zlib.gzipSync(Buffer.from(sql, 'utf8'));
  const key = dayKey(now);
  await putObject(key, gz, 'application/gzip');
  await db.prepare('INSERT INTO backups_log (key, created_at, tables, rows_count, bytes) VALUES (?, ?, ?, ?, ?)').run(key, now, tables, rows, gz.length);
  // Borra las copias que ya han caducado (unos días hacia atrás por si el servidor estuvo parado)
  for (let d = retentionDays(); d < retentionDays() + 10; d++) {
    await deleteObject(dayKey(now - d * DAY)).catch(() => {});
  }
  console.log(`[COPIA] ${key}: ${tables} tablas, ${rows} filas, ${Math.round(gz.length / 1024)} KB (${storageMode()})`);
  return { key, tables, rows, bytes: gz.length };
}

export async function initBackups(db: Db) {
  await db.exec(`CREATE TABLE IF NOT EXISTS backups_log (
    key VARCHAR(255), created_at BIGINT NOT NULL, tables INTEGER, rows_count INTEGER, bytes INTEGER
  )`);
  if (process.env.BACKUP_DISABLED === '1') return;
  const check = async () => {
    try {
      const last = await db.prepare('SELECT MAX(created_at) AS t FROM backups_log').get();
      if (!last?.t || Date.now() - Number(last.t) >= DAY - 5 * 60 * 1000) await runBackup(db);
    } catch (e: any) {
      console.error('[COPIA] No se ha podido hacer la copia de seguridad:', e?.message || e);
    }
  };
  setTimeout(check, 30 * 1000).unref();
  setInterval(check, 3600 * 1000).unref();
}
