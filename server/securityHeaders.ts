// =============================================================================
// Cabeceras de seguridad (INC-007). Sin dependencias externas.
// - Siempre: nosniff, no incrustable (X-Frame-Options), Referrer-Policy, Permissions-Policy y COOP.
// - Solo en producción: HSTS y Content-Security-Policy. En desarrollo Vite necesita scripts en línea y websockets.
// - La CSP permite el único <script> en línea de index.html por su huella (sha256), calculada al arrancar
//   a partir de dist/index.html: si ese script cambia, la huella se recalcula sola.
// =============================================================================
import crypto from 'crypto';
import fs from 'fs';
import type express from 'express';

/** Huellas sha256 (en formato CSP) de los <script> en línea, sin src, de un HTML. */
export function inlineScriptHashes(html: string): string[] {
  const out: string[] = [];
  const re = /<script(?![^>]*\bsrc\s*=)[^>]*>([\s\S]*?)<\/script>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    if (!m[1].trim()) continue;
    out.push(`'sha256-${crypto.createHash('sha256').update(m[1], 'utf8').digest('base64')}'`);
  }
  return out;
}

export function buildCsp(scriptHashes: string[]): string {
  return [
    "default-src 'self'",
    `script-src 'self' ${scriptHashes.join(' ')}`.trim(),
    "style-src 'self' 'unsafe-inline'",          // estilos en línea de React y de la pantalla de carga
    "img-src 'self' data: blob:",                // vistas previas de fotos
    "media-src 'self' blob:",                    // grabaciones de lectura
    "font-src 'self'",
    "connect-src 'self'",
    "worker-src 'self'",
    "manifest-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join('; ');
}

const PERMISSIONS_POLICY = [
  'camera=(self)', 'microphone=(self)',
  'geolocation=()', 'payment=()', 'usb=()', 'serial=()', 'bluetooth=()', 'hid=()',
  'magnetometer=()', 'gyroscope=()', 'accelerometer=()', 'display-capture=()',
].join(', ');

// =============================================================================
// Protección CSRF (INC-008)
// =============================================================================
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Rechaza (403) las peticiones de escritura que el navegador marca como de otra web:
 * Sec-Fetch-Site: cross-site, o una cabecera Origin cuyo host no es el de la propia app.
 * Sin esas cabeceras (herramientas, scripts) la petición sigue: no llevan la cookie del navegador de nadie.
 */
export const rejectCrossSiteWrites: express.RequestHandler = (req, res, next) => {
  if (SAFE_METHODS.has(req.method)) return next();
  const origin = req.headers.origin;
  const host = String(req.headers.host || '').toLowerCase();
  // Se registra cada rechazo: si tras un despliegue la propia app quedara bloqueada (p. ej. un proxy que
  // cambie Host), se vería en el log. Sin datos personales: solo motivo, ruta, Origin y Host.
  const reject = (reason: string) => {
    console.warn(`[CSRF] Rechazada ${req.method} ${req.path}: ${reason} (Origin=${origin || '-'}, Host=${host || '-'})`);
    return res.status(403).json({ error: 'Petición no permitida.', code: 'CROSS_SITE' });
  };
  const site = String(req.headers['sec-fetch-site'] || '').toLowerCase();
  if (site === 'cross-site') return reject('Sec-Fetch-Site cross-site');
  if (origin === 'null') return reject('Origin null');
  if (origin) {
    let originHost = '';
    try { originHost = new URL(origin).host.toLowerCase(); } catch { originHost = '?'; }
    if (!host || originHost !== host) return reject('Origin distinto del Host');
  }
  next();
};

/** En rutas con ?action=, solo deja pasar por GET/HEAD las acciones de lectura indicadas (405 en el resto). */
export function readOnlyByGet(readActions: string[]): express.RequestHandler {
  const allowed = new Set(readActions);
  return (req, res, next) => {
    if ((req.method === 'GET' || req.method === 'HEAD') && !allowed.has(String(req.query.action || ''))) {
      res.setHeader('Allow', 'POST, DELETE');
      return res.status(405).json({ error: 'Método no permitido para esta acción.', code: 'METHOD_NOT_ALLOWED' });
    }
    next();
  };
}

export function securityHeaders(opts: { production: boolean; indexHtmlPath?: string }): express.RequestHandler {
  let csp: string | null = null;
  if (opts.production && opts.indexHtmlPath) {
    const html = fs.readFileSync(opts.indexHtmlPath, 'utf8');
    csp = buildCsp(inlineScriptHashes(html));
  }
  return (_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', PERMISSIONS_POLICY);
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    if (opts.production) {
      res.setHeader('Strict-Transport-Security', 'max-age=31536000');
      if (csp) res.setHeader('Content-Security-Policy', csp);
    }
    next();
  };
}
