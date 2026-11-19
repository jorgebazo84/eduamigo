// =============================================================================
// Límite de intentos en memoria (INC-006): ventana fija por clave (IP, o IP + email).
// - Suficiente con una sola instancia del servidor; al reiniciar, los contadores empiezan de cero.
// - La IP sale de req.ip, que con app.set('trust proxy', 1) es la que añade el proxy de Render.
// =============================================================================
type Bucket = { count: number; resetAt: number };

export interface Limiter {
  /** ¿Está bloqueada la clave? Devuelve los ms que faltan (0 si no lo está). No cuenta el intento. */
  blockedFor(key: string): number;
  /** Cuenta un intento para la clave. */
  hit(key: string): void;
  /** Pone a cero la clave (p. ej. tras un inicio de sesión correcto). */
  reset(key: string): void;
}

/** maxKeys: tope de claves en memoria; al llenarse se descarta la más antigua (evita inflar la memoria). */
export function createLimiter(max: number, windowMs: number, maxKeys = 10000): Limiter {
  const buckets = new Map<string, Bucket>();
  const timer = setInterval(() => {
    const now = Date.now();
    for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k);
  }, 60 * 1000);
  timer.unref();
  const current = (key: string) => {
    const b = buckets.get(key);
    if (b && b.resetAt <= Date.now()) { buckets.delete(key); return undefined; }
    return b;
  };
  return {
    blockedFor(key) {
      const b = current(key);
      return b && b.count >= max ? Math.max(0, b.resetAt - Date.now()) : 0;
    },
    hit(key) {
      const b = current(key);
      if (b) { b.count++; return; }
      if (buckets.size >= maxKeys) {
        const oldest = buckets.keys().next().value; // el Map conserva el orden de inserción
        if (oldest !== undefined) buckets.delete(oldest);
      }
      buckets.set(key, { count: 1, resetAt: Date.now() + windowMs });
    },
    reset(key) { buckets.delete(key); },
  };
}

export const rateLimitMessage = (ms: number) => `Demasiados intentos. Espera ${Math.max(1, Math.ceil(ms / 60000))} min y vuelve a probar.`;
