// Base de datos de EduAmigo: SQLite en todas partes.
// - Producción: Turso (SQLite en la nube) con TURSO_DATABASE_URL y TURSO_AUTH_TOKEN.
// - Local y pruebas: archivo eduamigo.db (o DB_FILE).
// Se usa el mismo controlador (libSQL) en los dos casos, así lo que se prueba en local
// es exactamente lo que funciona en producción.
import { createClient, type Client, type InValue } from '@libsql/client';

export interface Db {
  kind: 'turso' | 'local';
  prepare(sql: string): {
    run(...args: any[]): Promise<{ changes: number; lastInsertRowid: number | null }>;
    get(...args: any[]): Promise<any>;
    all(...args: any[]): Promise<any[]>;
  };
  exec(sql: string): Promise<void>;
  client: Client;
}

const toArg = (a: any): InValue => {
  if (a === undefined || a === null) return null;
  if (typeof a === 'boolean') return a ? 1 : 0;
  if (typeof a === 'bigint' || typeof a === 'number' || typeof a === 'string') return a;
  if (a instanceof Uint8Array || a instanceof ArrayBuffer) return a as any;
  if (a instanceof Date) return a.getTime();
  return JSON.stringify(a);
};

// libSQL devuelve filas "especiales"; las convertimos en objetos normales (y BigInt en número).
const toObject = (row: any, columns: string[]) => {
  const o: Record<string, any> = {};
  columns.forEach((c, i) => {
    const v = row[i];
    o[c] = typeof v === 'bigint' ? Number(v) : v;
  });
  return o;
};

export async function openDatabase(): Promise<Db> {
  const remoteUrl = process.env.TURSO_DATABASE_URL;
  const kind: Db['kind'] = remoteUrl ? 'turso' : 'local';
  const url = remoteUrl || `file:${process.env.DB_FILE || 'eduamigo.db'}`;
  const client = createClient(remoteUrl ? { url, authToken: process.env.TURSO_AUTH_TOKEN } : { url });

  // Primera conexión con límite de tiempo: si Turso no responde, el arranque falla con un motivo claro
  // en vez de quedarse esperando sin abrir el puerto. Solo se muestra el host, nunca el token.
  if (kind === 'turso') {
    let host = '?';
    try { host = new URL(url).host; } catch { /* URL no válida: la conexión dará su propio error */ }
    console.log(`[DB] Conectando con Turso (${host})…`);
  }
  const timeoutMs = Number(process.env.DB_CONNECT_TIMEOUT_MS) > 0 ? Number(process.env.DB_CONNECT_TIMEOUT_MS) : 15000;
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([
      client.execute('SELECT 1'),
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error(
          `[ARRANQUE] La base de datos no responde en ${Math.round(timeoutMs / 1000)} s. Revisa TURSO_DATABASE_URL y TURSO_AUTH_TOKEN, y que la base de datos esté activa (no archivada) en el panel de Turso.`,
        )), timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
  if (kind === 'local') {
    // Varias peticiones a la vez sobre el mismo archivo: esperar en vez de fallar
    await client.execute('PRAGMA busy_timeout = 5000');
  }
  console.log(`[DB] Base de datos: ${kind === 'turso' ? 'Turso (nube)' : `SQLite local (${url.slice(5)})`}`);
  if (kind === 'local' && process.env.NODE_ENV === 'production' && process.env.RENDER) {
    console.warn('[DB] ATENCIÓN: en Render sin TURSO_DATABASE_URL los datos se pierden en cada despliegue.');
  }

  return {
    kind,
    client,
    prepare: (sql: string) => ({
      run: async (...args: any[]) => {
        const r = await client.execute({ sql, args: args.map(toArg) });
        return { changes: r.rowsAffected, lastInsertRowid: r.lastInsertRowid !== undefined ? Number(r.lastInsertRowid) : null };
      },
      get: async (...args: any[]) => {
        const r = await client.execute({ sql, args: args.map(toArg) });
        return r.rows[0] ? toObject(r.rows[0], r.columns) : undefined;
      },
      all: async (...args: any[]) => {
        const r = await client.execute({ sql, args: args.map(toArg) });
        return r.rows.map((row) => toObject(row, r.columns));
      },
    }),
    exec: async (sql: string) => { await client.executeMultiple(sql); },
  };
}

// -----------------------------------------------------------------------------
// Copia de seguridad: volcado SQL completo (estructura + datos).
// -----------------------------------------------------------------------------
const sqlValue = (v: any): string => {
  if (v === null || v === undefined) return 'NULL';
  if (typeof v === 'number' || typeof v === 'bigint') return String(v);
  if (v instanceof ArrayBuffer || v instanceof Uint8Array) return `X'${Buffer.from(v as any).toString('hex')}'`;
  return `'${String(v).replace(/'/g, "''")}'`;
};

export async function dumpDatabase(db: Db): Promise<{ sql: string; tables: number; rows: number }> {
  const objs = await db.prepare(
    "SELECT type, name, sql FROM sqlite_master WHERE sql IS NOT NULL AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_litestream%' AND name NOT LIKE 'libsql_%' ORDER BY CASE type WHEN 'table' THEN 0 ELSE 1 END, name"
  ).all();
  const out: string[] = ['-- Copia de seguridad de EduAmigo', `-- ${new Date().toISOString()}`, 'PRAGMA foreign_keys=OFF;', 'BEGIN TRANSACTION;'];
  let tables = 0, rows = 0;
  for (const o of objs.filter((x) => x.type === 'table')) {
    tables++;
    out.push(`${o.sql};`);
    const r = await db.client.execute(`SELECT * FROM "${String(o.name).replace(/"/g, '""')}"`);
    const cols = r.columns.map((c) => `"${c.replace(/"/g, '""')}"`).join(', ');
    for (const row of r.rows) {
      rows++;
      out.push(`INSERT INTO "${o.name}" (${cols}) VALUES (${r.columns.map((_, i) => sqlValue((row as any)[i])).join(', ')});`);
    }
  }
  for (const o of objs.filter((x) => x.type !== 'table')) out.push(`${o.sql};`);
  out.push('COMMIT;');
  return { sql: out.join('\n') + '\n', tables, rows };
}
