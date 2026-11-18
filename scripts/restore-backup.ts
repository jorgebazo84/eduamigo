// Restaura una copia de seguridad de EduAmigo en la base de datos configurada
// (Turso si están TURSO_DATABASE_URL y TURSO_AUTH_TOKEN; si no, el archivo SQLite local).
//
// Uso:
//   npm run restore -- ruta/eduamigo-2026-11-17.sql.gz
//   npm run restore -- backups/eduamigo-2026-11-17.sql.gz --from-storage   (la descarga de R2)
//
// Por seguridad solo restaura en una base de datos VACÍA. Para recuperar producción:
// crea una base de datos nueva en Turso, apunta las variables a ella, restaura y cambia Render a la nueva.
import 'dotenv/config';
import fs from 'fs';
import zlib from 'zlib';
import { openDatabase } from '../server/db';
import { getObject } from '../server/storage';

async function main() {
  const args = process.argv.slice(2);
  const file = args.find((a) => !a.startsWith('--'));
  if (!file) {
    console.error('Indica el archivo: npm run restore -- eduamigo-AAAA-MM-DD.sql.gz [--from-storage]');
    process.exit(1);
  }
  const gz = args.includes('--from-storage') ? await getObject(file) : fs.readFileSync(file);
  if (!gz) throw new Error(`No se encuentra ${file} en el almacenamiento.`);
  const sql = (file.endsWith('.gz') ? zlib.gunzipSync(gz) : gz).toString('utf8');

  const db = await openDatabase();
  const existing = await db.prepare("SELECT COUNT(*) AS n FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE 'libsql_%'").get();
  if (Number(existing?.n) > 0) {
    throw new Error('La base de datos de destino no está vacía. Crea una nueva y vuelve a intentarlo.');
  }
  await db.exec(sql);
  const users = await db.prepare('SELECT COUNT(*) AS n FROM users').get().catch(() => ({ n: '?' }));
  console.log(`Copia restaurada en ${db.kind === 'turso' ? 'Turso' : 'el archivo local'}. Familias: ${users?.n}.`);
}

main().catch((e) => { console.error('Error:', e.message || e); process.exit(1); });
