// =============================================================================
// Mensajes de error que ve el usuario (INC-013)
// - Los errores de validación que lanza el propio código (`throw new Error('Introduce un email válido.')`)
//   se muestran tal cual: están pensados para el usuario.
// - Los errores internos (base de datos, fallos de programación) se sustituyen por un mensaje genérico
//   y el detalle se escribe solo en el log del servidor.
// =============================================================================
const GENERIC = 'No se ha podido completar la operación. Inténtalo de nuevo.';
const INTERNAL_RE = /HTTP [0-9]{3}|SQLITE_|LIBSQL|constraint failed|no such (table|column)|syntax error|database|ECONN|ETIMEDOUT|fetch failed|Cannot read propert|is not a function|undefined|null/i;

export function publicErrorMessage(e: any, where: string): string {
  const msg = String(e?.message || '');
  const internal = !msg || (e?.name && e.name !== 'Error') || e?.code !== undefined || INTERNAL_RE.test(msg);
  if (internal) {
    console.error(`[ERROR] ${where}: ${e?.name || 'Error'} ${e?.code || ''} ${msg}`.trim());
    return GENERIC;
  }
  return msg;
}
