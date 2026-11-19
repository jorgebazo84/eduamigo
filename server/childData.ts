// =============================================================================
// Borrado completo de los datos de un niño (INC-002, derecho de supresión, art. 17 RGPD)
// - Las tablas con datos del niño se descubren en el propio esquema: toda tabla con columna
//   child_id o childId. Así una tabla nueva queda cubierta sin tocar este archivo.
// - Los borrados en la base de datos van en una sola transacción (todo o nada).
// - Después se borran los archivos (fotos, miniaturas, audios). Si alguno falla, queda en
//   pending_object_deletions y se reintenta en la purga periódica.
// =============================================================================
import { deleteObjectOrQueue } from './storage';

type Db = any;
const CHILD_COLUMNS = ['child_id', 'childId'];
const q = (name: string) => `"${String(name).replace(/"/g, '""')}"`;

/** Tablas (y su columna) que guardan datos de un niño. Nunca incluye la propia tabla children. */
export async function childTables(db: Db): Promise<{ table: string; column: string }[]> {
  const tables = await db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE 'libsql_%' AND name NOT LIKE '_litestream%'").all();
  const out: { table: string; column: string }[] = [];
  for (const t of tables) {
    if (t.name === 'children') continue;
    const cols = await db.prepare(`PRAGMA table_info(${q(t.name)})`).all();
    const col = cols.map((c: any) => String(c.name)).find((n: string) => CHILD_COLUMNS.includes(n));
    if (col) out.push({ table: String(t.name), column: col });
  }
  return out;
}

const tableExists = (tables: { table: string }[], name: string) => tables.some((t) => t.table === name);

/** Claves de archivo (original y miniatura) de las filas de photos que cumplan la condición. */
async function objectKeys(db: Db, where: string, args: any[]): Promise<string[]> {
  const rows = await db.prepare(`SELECT object_key, thumb_key FROM photos WHERE ${where}`).all(...args);
  const keys = new Set<string>();
  for (const r of rows) {
    if (r.object_key) keys.add(String(r.object_key));
    if (r.thumb_key) keys.add(String(r.thumb_key));
  }
  return [...keys];
}

async function deleteFiles(db: Db, keys: string[]) {
  let failed = 0;
  for (const k of keys) {
    try { if (!(await deleteObjectOrQueue(db, k))) failed++; } catch { failed++; }
  }
  return failed;
}

/**
 * Borra un niño y todos sus datos. Comprueba primero que pertenece a la familia (userId).
 * Devuelve null si el niño no existe o no es de esa familia.
 */
export async function deleteChildData(db: Db, userId: string, childId: string) {
  const child = await db.prepare('SELECT id FROM children WHERE id = ? AND parentId = ?').get(String(childId), String(userId));
  if (!child) return null;
  const id = String(child.id);
  // 1) Primero desaparece el perfil (con su comprobación de familia): las rutas dejan de aceptar
  //    datos nuevos para ese niño mientras se borra el resto. Si algo fallara después, lo que quede
  //    son datos huérfanos que recoge purgeOrphanChildData.
  const gone = await db.prepare('DELETE FROM children WHERE id = ? AND parentId = ?').run(id, String(userId));
  if (!gone.changes) return null;
  const tables = await childTables(db);

  const keys = tableExists(tables, 'photos') ? await objectKeys(db, 'child_id = ?', [id]) : [];

  const stmts: { sql: string; args: any[] }[] = [];
  // Datos ligados de forma indirecta (por si alguna fila no tuviera la columna del niño rellena)
  if (tableExists(tables, 'tutor_messages') && tableExists(tables, 'tutor_conversations')) {
    stmts.push({ sql: 'DELETE FROM tutor_messages WHERE conversation_id IN (SELECT id FROM tutor_conversations WHERE child_id = ?)', args: [id] });
  }
  if (tableExists(tables, 'study_tasks') && tableExists(tables, 'books')) {
    stmts.push({ sql: 'DELETE FROM study_tasks WHERE bookId IN (SELECT id FROM books WHERE childId = ?)', args: [id] });
  }
  for (const t of tables) stmts.push({ sql: `DELETE FROM ${q(t.table)} WHERE ${q(t.column)} = ?`, args: [id] });

  // 2) Todos los datos del niño en una sola transacción
  await db.client.batch(stmts, 'write');
  const failedFiles = await deleteFiles(db, keys);
  console.log(`[BORRADO] Perfil ${id.slice(0, 8)}: ${tables.length} tablas revisadas, ${keys.length} archivo(s), ${failedFiles} pendiente(s) de reintento`);
  return { tables: tables.length, files: keys.length, failedFiles };
}

// Salvaguarda: la limpieza solo actúa sobre unos pocos perfiles borrados. Si encuentra muchos más,
// lo más probable es un fallo (base de datos equivocada, restauración parcial) y no borra nada.
const ORPHAN_MAX_CHILDREN = () => {
  const n = Number(process.env.ORPHAN_PURGE_MAX_CHILDREN);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : 20;
};

/**
 * Limpieza de datos huérfanos: filas de niños que ya no existen (perfiles borrados antes de INC-002)
 * y sus archivos. Las filas con la columna del niño vacía (NULL) no se tocan.
 * No hace nada si la tabla children está vacía o si los perfiles huérfanos superan ORPHAN_PURGE_MAX_CHILDREN.
 */
export async function purgeOrphanChildData(db: Db) {
  const existing = Number((await db.prepare('SELECT COUNT(*) AS n FROM children').get())?.n || 0);
  if (existing === 0) {
    console.warn('[BORRADO] Limpieza de huérfanos NO ejecutada: la tabla children está vacía (¿base de datos equivocada o recién creada?).');
    return { skipped: 'children_vacia', rows: 0, files: 0, failedFiles: 0 };
  }
  const tables = await childTables(db);
  const orphan = (col: string) => `${q(col)} IS NOT NULL AND ${q(col)} NOT IN (SELECT id FROM children)`;
  const ids = new Set<string>();
  for (const t of tables) {
    const rows = await db.prepare(`SELECT DISTINCT ${q(t.column)} AS c FROM ${q(t.table)} WHERE ${orphan(t.column)}`).all();
    for (const r of rows) ids.add(String(r.c));
  }
  if (!ids.size) return { rows: 0, files: 0, failedFiles: 0 };
  if (ids.size > ORPHAN_MAX_CHILDREN()) {
    console.warn(`[BORRADO] Limpieza de huérfanos NO ejecutada: hay datos de ${ids.size} perfiles inexistentes (máximo ${ORPHAN_MAX_CHILDREN()}). Revísalo; para permitirlo, sube ORPHAN_PURGE_MAX_CHILDREN.`);
    return { skipped: 'demasiados', orphanChildren: ids.size, rows: 0, files: 0, failedFiles: 0 };
  }
  const keys = tableExists(tables, 'photos') ? await objectKeys(db, orphan('child_id'), []) : [];

  const stmts: { sql: string; args: any[] }[] = [];
  if (tableExists(tables, 'tutor_messages') && tableExists(tables, 'tutor_conversations')) {
    stmts.push({ sql: `DELETE FROM tutor_messages WHERE conversation_id IN (SELECT id FROM tutor_conversations WHERE ${orphan('child_id')})`, args: [] });
  }
  if (tableExists(tables, 'study_tasks') && tableExists(tables, 'books')) {
    stmts.push({ sql: `DELETE FROM study_tasks WHERE bookId IN (SELECT id FROM books WHERE ${orphan('childId')})`, args: [] });
  }
  for (const t of tables) stmts.push({ sql: `DELETE FROM ${q(t.table)} WHERE ${orphan(t.column)}`, args: [] });

  const results = await db.client.batch(stmts, 'write');
  const rows = results.reduce((n: number, r: any) => n + Number(r.rowsAffected || 0), 0);
  const failedFiles = await deleteFiles(db, keys);
  console.log(`[BORRADO] Datos huérfanos: ${ids.size} perfil(es) ya borrado(s), ${rows} fila(s) y ${keys.length} archivo(s) (${failedFiles} pendiente(s) de reintento)`);
  return { orphanChildren: ids.size, rows, files: keys.length, failedFiles };
}
