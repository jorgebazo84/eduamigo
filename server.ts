
import 'dotenv/config';
import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import fs from 'fs';
import { registerTutorRoutes } from './server/tutor';
import { openDatabase, type Db } from './server/db';
import { initBackups } from './server/backup';
import { registerReviewRoutes, addReviewTopic } from './server/review';
import { registerMathRoutes } from './server/math';
import { registerReadingRoutes } from './server/reading';
import { registerParentRoutes } from './server/parent';
import { registerEnglishRoutes } from './server/english';
import { registerCalligraphyRoutes } from './server/calligraphy';
import { registerLibraryRoutes } from './server/library';
import { registerWeekRoutes, pullReviewsForExam } from './server/week';
import { registerRewardsRoutes, awardActivity, earnedToday, streakInfo, CALLIGRAPHY_DAILY_CAP } from './server/rewards';
import { registerWorksheetRoutes } from './server/worksheets';
import { registerGamesRoutes } from './server/games';
import { isValidGrade } from './shared/grades';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;
  
  // Base de datos: Turso en producción, archivo SQLite en local (ver server/db.ts)
  let db: Db;
  try {
    db = await openDatabase();
  } catch (err) {
    console.error('[DB] No se ha podido abrir la base de datos:', err);
    process.exit(1);
  }

  try {
    const testHash = await bcrypt.hash('test', 10);
    const testMatch = await bcrypt.compare('test', testHash);
    console.log('Bcrypt test:', testMatch ? 'OK' : 'FAIL');
  } catch (err) {
    console.error('Bcrypt test error:', err);
  }

  // Initialize tables if they don't exist
  try {
    await db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(64) PRIMARY KEY,
        email VARCHAR(255) UNIQUE,
        password_hash VARCHAR(255),
        parent_pin VARCHAR(10) DEFAULT '1234'
      );

        CREATE TABLE IF NOT EXISTS children (
          id VARCHAR(64) PRIMARY KEY,
          parentId VARCHAR(64),
          name VARCHAR(255),
          avatar VARCHAR(10),
          points INTEGER DEFAULT 0,
          grade VARCHAR(50),
          country VARCHAR(50) DEFAULT 'España',
          streak_current INTEGER DEFAULT 0,
          streak_last_active BIGINT DEFAULT 0,
          streak_multiplier FLOAT DEFAULT 1.0
        );

        CREATE TABLE IF NOT EXISTS rewards (
          id VARCHAR(64) PRIMARY KEY,
          userId VARCHAR(64),
          title VARCHAR(255),
          pointsCost INTEGER,
          icon VARCHAR(10)
        );

        CREATE TABLE IF NOT EXISTS history (
          id VARCHAR(64) PRIMARY KEY,
          childId VARCHAR(64),
          grade VARCHAR(50),
          subject VARCHAR(100),
          region VARCHAR(100),
          question TEXT,
          answer_json TEXT,
          timestamp BIGINT,
          duration INTEGER,
          sentiment VARCHAR(50),
          imageUrl TEXT,
          audioUrl TEXT,
          transcription TEXT
        );

        CREATE TABLE IF NOT EXISTS exam_results (
          id VARCHAR(64) PRIMARY KEY,
          childId VARCHAR(64),
          grade VARCHAR(50),
          subject VARCHAR(100),
          topic VARCHAR(255),
          score FLOAT,
          totalQuestions INTEGER,
          strengths TEXT,
          weaknesses TEXT,
          studyGuideContent TEXT,
          pointsEarned INTEGER,
          timestamp BIGINT,
          duration INTEGER
        );

        CREATE TABLE IF NOT EXISTS calendar_events (
          id VARCHAR(64) PRIMARY KEY,
          childId VARCHAR(64),
          title VARCHAR(255),
          date VARCHAR(20),
          type VARCHAR(50),
          description TEXT,
          notified INTEGER DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS tasks (
          id VARCHAR(64) PRIMARY KEY,
          childId VARCHAR(64),
          title VARCHAR(255),
          dueDate VARCHAR(20),
          completed INTEGER DEFAULT 0,
          priority VARCHAR(20)
        );

        CREATE TABLE IF NOT EXISTS english_progress (
          child_id VARCHAR(64) PRIMARY KEY,
          user_id VARCHAR(64),
          current_level VARCHAR(50),
          points INTEGER,
          completed_lessons TEXT,
          last_active BIGINT,
          streak INTEGER
        );

        CREATE TABLE IF NOT EXISTS books (
          id VARCHAR(64) PRIMARY KEY,
          userId VARCHAR(64),
          childId VARCHAR(64),
          isbn VARCHAR(20),
          title VARCHAR(255),
          subject VARCHAR(100),
          grade VARCHAR(50),
          topics TEXT
        );

        CREATE TABLE IF NOT EXISTS study_tasks (
          id VARCHAR(64) PRIMARY KEY,
          bookId VARCHAR(64),
          childId VARCHAR(64),
          topicIndex INTEGER,
          topicTitle VARCHAR(255),
          points_reward INTEGER,
          status VARCHAR(20) DEFAULT 'pending',
          summary TEXT,
          handwriting_image TEXT,
          ai_feedback_child TEXT,
          ai_feedback_parent TEXT,
          medical_evaluation TEXT,
          ai_score FLOAT,
          completed_at VARCHAR(50),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS calligraphy_sessions (
          id VARCHAR(64) PRIMARY KEY,
          userId VARCHAR(64),
          childId VARCHAR(64),
          imageUrl TEXT,
          score FLOAT,
          analysis_json TEXT,
          timestamp BIGINT,
          parentId VARCHAR(64)
        );

        CREATE TABLE IF NOT EXISTS math_sessions (
          id VARCHAR(64) PRIMARY KEY,
          userId VARCHAR(64),
          childId VARCHAR(64),
          imageUrl TEXT,
          score FLOAT,
          analysis_json TEXT,
          timestamp BIGINT
        );

        CREATE TABLE IF NOT EXISTS reading_sessions (
          id VARCHAR(64) PRIMARY KEY,
          userId VARCHAR(64),
          childId VARCHAR(64),
          audioUrl TEXT,
          score FLOAT,
          analysis_json TEXT,
          timestamp BIGINT,
          transcription TEXT
        );

        CREATE TABLE IF NOT EXISTS srs_reviews (
          id VARCHAR(64) PRIMARY KEY,
          childId VARCHAR(64),
          topic VARCHAR(255),
          subject VARCHAR(100),
          scheduledDate VARCHAR(20),
          status VARCHAR(20) DEFAULT 'pending',
          sourceId VARCHAR(64),
          createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
  } catch (err) {
    console.error('[DB] Initialization error (safe to ignore if tables exist):', err);
  }

  // ---------------------------------------------------------------------------
  // Sesiones y PIN parental (v1.3.0)
  // ---------------------------------------------------------------------------
  try {
    await db.exec(`
      CREATE TABLE IF NOT EXISTS sessions (
        token_hash VARCHAR(128) PRIMARY KEY,
        user_id VARCHAR(64) NOT NULL,
        created_at BIGINT NOT NULL,
        expires_at BIGINT NOT NULL,
        parent_until BIGINT DEFAULT 0
      );
    `);
  } catch (err) {
    console.error('[DB] sessions table error:', err);
  }
  // Columnas nuevas en users. Si ya existen, la sentencia falla y se ignora.
  for (const ddl of [
    'ALTER TABLE users ADD COLUMN pin_hash VARCHAR(255)',
    'ALTER TABLE users ADD COLUMN pin_failed INTEGER DEFAULT 0',
    'ALTER TABLE users ADD COLUMN pin_locked_until BIGINT DEFAULT 0',
    'ALTER TABLE users ADD COLUMN needs_pin_change INTEGER DEFAULT 0',
  ]) {
    try { await db.exec(ddl); } catch { /* columna ya existente */ }
  }

  const SESSION_COOKIE = 'ea_session';
  const SESSION_DAYS = 180;                 // dispositivo familiar: la sesión dura meses
  const PARENT_WINDOW_MS = 15 * 60 * 1000;  // ventana de panel de padres tras el PIN (se renueva con el uso)
  const PIN_MAX_FAILS = 5;
  const PIN_LOCK_MS = 15 * 60 * 1000;
  const WEAK_PINS = new Set(['0000', '1111', '2222', '3333', '4444', '5555', '6666', '7777', '8888', '9999',
    '1234', '4321', '0123', '1212', '2580', '1122', '6969', '1004', '2000', '1010']);

  const sha256 = (s: string) => crypto.createHash('sha256').update(s).digest('hex');

  const hashPin = (pin: string): string => {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.scryptSync(pin, salt, 32).toString('hex');
    return `${salt}:${hash}`;
  };

  const checkPin = (pin: string, stored: string | null | undefined): boolean => {
    if (!stored || !stored.includes(':')) return false;
    const [salt, hash] = stored.split(':');
    const candidate = crypto.scryptSync(String(pin), salt, 32);
    const expected = Buffer.from(hash, 'hex');
    return expected.length === candidate.length && crypto.timingSafeEqual(expected, candidate);
  };

  const validatePinFormat = (pin: any): string | null => {
    if (typeof pin !== 'string' || !/^\d{4}$/.test(pin)) return 'El PIN debe tener exactamente 4 cifras.';
    if (WEAK_PINS.has(pin)) return 'Ese PIN es demasiado fácil de adivinar. Elige otro.';
    return null;
  };

  const validatePassword = (pw: any): string | null => {
    if (typeof pw !== 'string' || pw.length < 8) return 'La contraseña debe tener al menos 8 caracteres.';
    return null;
  };

  // Migración: PIN guardados en claro -> hash. Los PIN débiles (p. ej. 1234 por defecto) obligan a cambiarlo.
  try {
    const legacy = await db.prepare('SELECT id, parent_pin FROM users WHERE pin_hash IS NULL AND parent_pin IS NOT NULL').all();
    for (const u of legacy) {
      const weak = validatePinFormat(String(u.parent_pin)) !== null;
      await db.prepare('UPDATE users SET pin_hash = ?, parent_pin = NULL, needs_pin_change = ? WHERE id = ?')
        .run(hashPin(String(u.parent_pin)), weak ? 1 : 0, u.id);
    }
    if (legacy.length) console.log(`[AUTH] Migrated ${legacy.length} plaintext PIN(s) to hashes`);
  } catch (err) {
    console.error('[AUTH] PIN migration error:', err);
  }

  const parseCookies = (header?: string): Record<string, string> => {
    const out: Record<string, string> = {};
    (header || '').split(';').forEach(part => {
      const i = part.indexOf('=');
      if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
    });
    return out;
  };

  const isHttps = (req: express.Request) =>
    req.secure || String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim() === 'https';

  const setSessionCookie = (req: express.Request, res: express.Response, token: string) => {
    res.cookie(SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: isHttps(req),
      maxAge: SESSION_DAYS * 24 * 3600 * 1000,
      path: '/',
    });
  };

  // Crea sesión. Tras entrar con contraseña, el adulto tiene unos minutos de panel abierto
  // (sirve para elegir el PIN si hace falta); la app lo vuelve a bloquear al salir del panel.
  const createSession = async (req: express.Request, res: express.Response, userId: string) => {
    const token = crypto.randomBytes(32).toString('hex');
    const now = Date.now();
    await db.prepare('INSERT INTO sessions (token_hash, user_id, created_at, expires_at, parent_until) VALUES (?, ?, ?, ?, ?)')
      .run(sha256(token), userId, now, now + SESSION_DAYS * 24 * 3600 * 1000, now + 10 * 60 * 1000);
    setSessionCookie(req, res, token);
  };

  type SessionInfo = { tokenHash: string; userId: string; parentUntil: number };

  const getSession = async (req: express.Request): Promise<SessionInfo | null> => {
    const token = parseCookies(req.headers.cookie)[SESSION_COOKIE];
    if (!token) return null;
    const row = await db.prepare('SELECT * FROM sessions WHERE token_hash = ?').get(sha256(token));
    if (!row) return null;
    if (Number(row.expires_at) < Date.now()) {
      await db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(row.token_hash);
      return null;
    }
    return { tokenHash: row.token_hash, userId: row.user_id, parentUntil: Number(row.parent_until) || 0 };
  };

  const isParentUnlocked = (s: SessionInfo) => s.parentUntil > Date.now();

  // Acciones que solo puede hacer un adulto con el panel desbloqueado por PIN.
  const PARENT_ONLY: Record<string, Set<string>> = {
    api: new Set(['add_child', 'update_child', 'delete_child', 'add_reward', 'delete_reward',
                  'delete_event', 'add_task', 'delete_task']),
    api_study: new Set(['add_book', 'delete_book', 'add_study_task']),
  };

  // Middleware: exige sesión y, para acciones de padres, el PIN reciente.
  // El userId sale SIEMPRE de la sesión, nunca de la URL.
  const requireSession = (area: 'api' | 'api_study' | 'api_english') =>
    async (req: express.Request, res: express.Response, next: express.NextFunction) => {
      try {
        const session = await getSession(req);
        if (!session) return res.status(401).json({ error: 'Sesión no válida. Vuelve a iniciar sesión.', code: 'AUTH_REQUIRED' });
        const action = String(req.query.action || '');
        if (PARENT_ONLY[area]?.has(action)) {
          if (!isParentUnlocked(session)) {
            return res.status(403).json({ error: 'Esta acción necesita el PIN de padres.', code: 'PIN_REQUIRED' });
          }
          // Ventana deslizante: mientras el adulto trabaja, el panel sigue abierto.
          await db.prepare('UPDATE sessions SET parent_until = ? WHERE token_hash = ?').run(Date.now() + PARENT_WINDOW_MS, session.tokenHash);
        }
        (req as any).session = session;
        next();
      } catch (e: any) {
        res.status(500).json({ error: 'Error de sesión' });
      }
    };

  app.set('trust proxy', 1);
  // Las rutas que reciben fotos (ya comprimidas en el móvil) aceptan hasta 8 MB; el resto, 100 KB.
  const bigJson = express.json({ limit: '8mb' });
  const smallJson = express.json();
  const PHOTO_ROUTES = new Set(['/api_worksheets.php', '/api_tutor.php', '/api_reading.php', '/api_calligraphy.php', '/api_library.php', '/api_parent.php']);
  app.use((req, res, next) => (PHOTO_ROUTES.has(req.path) ? bigJson : smallJson)(req, res, next));
  app.use('/admin', express.urlencoded({ extended: false, limit: '10kb' }));

  // auth.php: registro, inicio de sesión, PIN parental
  app.post('/auth.php', async (req, res) => {
    const action = String(req.query.action || '');
    const { email, password, parentPin, newPin, newPassword, pin } = req.body || {};
    const normEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';

    // Registra un fallo de PIN y bloquea tras PIN_MAX_FAILS intentos.
    const registerPinFailure = async (user: any) => {
      const fails = (Number(user.pin_failed) || 0) + 1;
      const lockedUntil = fails >= PIN_MAX_FAILS ? Date.now() + PIN_LOCK_MS : 0;
      await db.prepare('UPDATE users SET pin_failed = ?, pin_locked_until = ? WHERE id = ?')
        .run(lockedUntil ? 0 : fails, lockedUntil, user.id);
      return { fails, lockedUntil };
    };
    const pinLockMessage = (lockedUntil: number) => {
      const mins = Math.max(1, Math.ceil((lockedUntil - Date.now()) / 60000));
      return `Demasiados intentos. Espera ${mins} min y vuelve a probar.`;
    };

    try {
      if (action === 'register') {
        if (!normEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normEmail)) throw new Error('Introduce un email válido.');
        const pwErr = validatePassword(password); if (pwErr) throw new Error(pwErr);
        const pinErr = validatePinFormat(parentPin); if (pinErr) throw new Error(pinErr);
        const exists = await db.prepare('SELECT id FROM users WHERE lower(email) = ?').get(normEmail);
        if (exists) throw new Error('Ya existe una cuenta con ese email.');
        const id = crypto.randomUUID();
        const hash = await bcrypt.hash(password, 10);
        await db.prepare('INSERT INTO users (id, email, password_hash, parent_pin, pin_hash, pin_failed, pin_locked_until, needs_pin_change) VALUES (?, ?, ?, NULL, ?, 0, 0, 0)')
          .run(id, normEmail, hash, hashPin(parentPin));
        await createSession(req, res, id);
        res.json({ status: 'success', userId: id, email: normEmail, needsPinSetup: false });

      } else if (action === 'login') {
        if (!normEmail || !password) throw new Error('Email y contraseña son obligatorios');
        const user = await db.prepare('SELECT * FROM users WHERE lower(email) = ?').get(normEmail);
        const ok = user ? await bcrypt.compare(String(password), user.password_hash) : false;
        if (!ok) return res.status(400).json({ error: 'Credenciales incorrectas' });
        await createSession(req, res, user.id);
        res.json({ status: 'success', userId: user.id, email: user.email, needsPinSetup: !user.pin_hash || Number(user.needs_pin_change) === 1 });

      } else if (action === 'me') {
        const session = await getSession(req);
        if (!session) return res.status(401).json({ error: 'Sin sesión', code: 'AUTH_REQUIRED' });
        const user = await db.prepare('SELECT id, email, pin_hash, needs_pin_change FROM users WHERE id = ?').get(session.userId);
        if (!user) return res.status(401).json({ error: 'Sin sesión', code: 'AUTH_REQUIRED' });
        res.json({ status: 'success', userId: user.id, email: user.email, needsPinSetup: !user.pin_hash || Number(user.needs_pin_change) === 1 });

      } else if (action === 'logout') {
        const session = await getSession(req);
        if (session) await db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(session.tokenHash);
        res.clearCookie(SESSION_COOKIE, { path: '/' });
        res.json({ status: 'success' });

      } else if (action === 'verify_pin') {
        const session = await getSession(req);
        if (!session) return res.status(401).json({ error: 'Sin sesión', code: 'AUTH_REQUIRED' });
        const user = await db.prepare('SELECT * FROM users WHERE id = ?').get(session.userId);
        if (!user) return res.status(401).json({ error: 'Sin sesión', code: 'AUTH_REQUIRED' });
        const lockedUntil = Number(user.pin_locked_until) || 0;
        if (lockedUntil > Date.now()) return res.status(429).json({ error: pinLockMessage(lockedUntil), code: 'PIN_LOCKED', lockedUntil });
        if (!checkPin(String(pin || ''), user.pin_hash)) {
          const r = await registerPinFailure(user);
          if (r.lockedUntil) return res.status(429).json({ error: pinLockMessage(r.lockedUntil), code: 'PIN_LOCKED', lockedUntil: r.lockedUntil });
          return res.status(400).json({ error: 'PIN incorrecto', code: 'PIN_WRONG', attemptsLeft: PIN_MAX_FAILS - r.fails });
        }
        await db.prepare('UPDATE users SET pin_failed = 0, pin_locked_until = 0 WHERE id = ?').run(user.id);
        await db.prepare('UPDATE sessions SET parent_until = ? WHERE token_hash = ?').run(Date.now() + PARENT_WINDOW_MS, session.tokenHash);
        res.json({ status: 'success' });

      } else if (action === 'lock_parent') {
        const session = await getSession(req);
        if (session) await db.prepare('UPDATE sessions SET parent_until = 0 WHERE token_hash = ?').run(session.tokenHash);
        res.json({ status: 'success' });

      } else if (action === 'update_pin') {
        const session = await getSession(req);
        if (!session) return res.status(401).json({ error: 'Sin sesión', code: 'AUTH_REQUIRED' });
        if (!isParentUnlocked(session)) return res.status(403).json({ error: 'Esta acción necesita el PIN de padres.', code: 'PIN_REQUIRED' });
        const pinErr = validatePinFormat(newPin); if (pinErr) throw new Error(pinErr);
        await db.prepare('UPDATE users SET pin_hash = ?, parent_pin = NULL, needs_pin_change = 0, pin_failed = 0, pin_locked_until = 0 WHERE id = ?')
          .run(hashPin(newPin), session.userId);
        res.json({ status: 'success' });

      } else if (action === 'reset_password') {
        // Recuperación con PIN (provisional hasta tener recuperación por email). Comparte el límite de intentos del PIN.
        if (!normEmail || !pin || !newPassword) throw new Error('Datos incompletos para restablecer contraseña');
        const pwErr = validatePassword(newPassword); if (pwErr) throw new Error(pwErr);
        const user = await db.prepare('SELECT * FROM users WHERE lower(email) = ?').get(normEmail);
        if (!user) return res.status(400).json({ error: 'Email o PIN incorrectos' });
        const lockedUntil = Number(user.pin_locked_until) || 0;
        if (lockedUntil > Date.now()) return res.status(429).json({ error: pinLockMessage(lockedUntil), code: 'PIN_LOCKED' });
        if (!checkPin(String(pin), user.pin_hash)) {
          const r = await registerPinFailure(user);
          if (r.lockedUntil) return res.status(429).json({ error: pinLockMessage(r.lockedUntil), code: 'PIN_LOCKED' });
          return res.status(400).json({ error: 'Email o PIN incorrectos' });
        }
        const hash = await bcrypt.hash(newPassword, 10);
        await db.prepare('UPDATE users SET password_hash = ?, pin_failed = 0, pin_locked_until = 0 WHERE id = ?').run(hash, user.id);
        // Cerrar todas las sesiones abiertas de esa cuenta
        await db.prepare('DELETE FROM sessions WHERE user_id = ?').run(user.id);
        res.json({ status: 'success' });

      } else {
        res.status(400).json({ error: 'Acción no válida' });
      }
    } catch (e: any) {
      console.error('[AUTH] Error:', e?.message);
      res.status(400).json({ error: e.message });
    }
  });

  // Mock api.php
  app.all('/api.php', requireSession('api'), async (req, res) => {
    const action = req.query.action;
    const userId = (req as any).session.userId as string;
    const id = req.query.id as string;
    const data = req.body || {};

    try {
      if (action === 'get_initial_data') {
        if (!userId) throw new Error('userId es obligatorio');
        const childRows = await db.prepare('SELECT * FROM children WHERE parentId = ?').all(userId);
        const children = [];
        for (const c of childRows) {
          const st = await streakInfo(db, c.id).catch(() => null);
          const badges = (await db.prepare('SELECT badge_id FROM child_badges WHERE child_id = ?').all(c.id).catch(() => [])).map((r: any) => r.badge_id);
          children.push({ ...c, streak: st ? { current: st.current, best: st.best, activeToday: st.activeToday, restUsedThisWeek: st.restUsedThisWeek, lastActive: Number(c.streak_last_active) || 0 } : null, badges });
        }
        const rewards = await db.prepare('SELECT * FROM rewards WHERE userId = ?').all(userId);
        const history = await db.prepare('SELECT * FROM history WHERE childId IN (SELECT id FROM children WHERE parentId = ?) ORDER BY timestamp DESC LIMIT 100').all(userId);
        const exams = await db.prepare('SELECT * FROM exam_results WHERE childId IN (SELECT id FROM children WHERE parentId = ?) ORDER BY timestamp DESC LIMIT 50').all(userId);
        const events = await db.prepare('SELECT * FROM calendar_events WHERE childId IN (SELECT id FROM children WHERE parentId = ?)').all(userId);
        const tasks = await db.prepare('SELECT * FROM tasks WHERE childId IN (SELECT id FROM children WHERE parentId = ?)').all(userId);

        res.json({
          children,
          rewards,
          history: history.map((h: any) => {
            try {
              const answer = typeof h.answer_json === 'string' ? JSON.parse(h.answer_json || '{}') : (h.answer_json || {});
              return { ...h, answer };
            } catch (e) {
              return { ...h, answer: {} };
            }
          }),
          examHistory: exams.map((e: any) => {
            try {
              return {
                ...e,
                strengths: typeof e.strengths === 'string' ? JSON.parse(e.strengths || '[]') : (e.strengths || []),
                weaknesses: typeof e.weaknesses === 'string' ? JSON.parse(e.weaknesses || '[]') : (e.weaknesses || [])
              };
            } catch (err) {
              return e;
            }
          }),
          events,
          tasks,
          requests: []
        });
      } else if (action === 'add_child') {
        if (!userId || !data.id || !data.name) throw new Error('Datos de hijo incompletos');
        if (!isValidGrade(String(data.grade || ''))) throw new Error('Curso no válido');
        await db.prepare('INSERT INTO children (id, parentId, name, avatar, points, grade, country, streak_current, streak_last_active, streak_multiplier) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
          .run(data.id, userId, data.name, data.avatar, 0, data.grade, data.country || 'España', 0, 0, 1);
        res.json({ status: 'success' });
      } else if (action === 'update_child') {
        if (!id) throw new Error('id es obligatorio');
        if (!isValidGrade(String(data.grade || ''))) throw new Error('Curso no válido');
        await db.prepare('UPDATE children SET name = ?, grade = ?, avatar = ? WHERE id = ? AND parentId = ?').run(data.name, data.grade, data.avatar, id, userId);
        res.json({ status: 'success' });
      } else if (action === 'delete_child') {
        if (!id) throw new Error('id es obligatorio');
        await db.prepare('DELETE FROM children WHERE id = ? AND parentId = ?').run(id, userId);
        res.json({ status: 'success' });
      } else if (action === 'add_reward') {
        if (!userId || !data.id || !data.title) throw new Error('Datos de premio incompletos');
        const cost = Math.round(Number(data.pointsCost));
        if (!Number.isFinite(cost) || cost < 10 || cost > 100000) throw new Error('El coste debe estar entre 10 y 100.000 puntos');
        await db.prepare('INSERT INTO rewards (id, userId, title, pointsCost, icon) VALUES (?, ?, ?, ?, ?)').run(String(data.id), userId, String(data.title).slice(0, 80), cost, String(data.icon || '🎁').slice(0, 16));
        res.json({ status: 'success' });
      } else if (action === 'delete_reward') {
        if (!id || !userId) throw new Error('id y userId son obligatorios');
        await db.prepare('DELETE FROM rewards WHERE id = ? AND userId = ?').run(id, userId);
        res.json({ status: 'success' });
      } else if (action === 'save_history') {
        if (!data.id || !data.childId) throw new Error('Datos de historial incompletos');
        await db.prepare('INSERT INTO history (id, childId, grade, subject, region, question, answer_json, timestamp, duration, sentiment, imageUrl, audioUrl, transcription) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
          .run(data.id, data.childId, data.grade, data.subject, data.region, data.question, JSON.stringify(data.answer || {}), data.timestamp, data.duration || null, data.sentiment || null, data.imageUrl || null, data.audioUrl || null, data.transcription || null);
        res.json({ status: 'success' });
      } else if (action === 'add_event') {
        if (!data.id || !data.childId) throw new Error('Datos de evento incompletos');
        if (!(await db.prepare('SELECT id FROM children WHERE id = ? AND parentId = ?').get(data.childId, userId))) throw new Error('Perfil no encontrado');
        await db.prepare('INSERT INTO calendar_events (id, childId, title, date, type, description, notified, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
          .run(data.id, data.childId, data.title, data.date, data.type, data.description || '', data.notified ? 1 : 0, 'parent', Date.now());
        // Un examen adelanta los repasos de esa asignatura
        if (data.type === 'exam') await pullReviewsForExam(db, String(data.childId), `${data.title || ''} ${data.description || ''}`, String(data.date || '').slice(0, 10)).catch(() => {});
        res.json({ status: 'success' });
      } else if (action === 'delete_event') {
        if (!id) throw new Error('id es obligatorio');
        await db.prepare('DELETE FROM calendar_events WHERE id = ? AND childId IN (SELECT id FROM children WHERE parentId = ?)').run(id, userId);
        res.json({ status: 'success' });
      } else if (action === 'add_task') {
        if (!data.id || !data.childId) throw new Error('Datos de tarea incompletos');
        if (!(await db.prepare('SELECT id FROM children WHERE id = ? AND parentId = ?').get(data.childId, userId))) throw new Error('Perfil no encontrado');
        await db.prepare('INSERT INTO tasks (id, childId, title, dueDate, completed, priority) VALUES (?, ?, ?, ?, ?, ?)').run(data.id, data.childId, data.title, data.dueDate, 0, data.priority);
        res.json({ status: 'success' });
      } else if (action === 'toggle_task') {
        if (!id) throw new Error('id es obligatorio');
        await db.prepare('UPDATE tasks SET completed = 1 - completed WHERE id = ? AND childId IN (SELECT id FROM children WHERE parentId = ?)').run(id, userId);
        res.json({ status: 'success' });
      } else if (action === 'delete_task') {
        if (!id) throw new Error('id es obligatorio');
        await db.prepare('DELETE FROM tasks WHERE id = ? AND childId IN (SELECT id FROM children WHERE parentId = ?)').run(id, userId);
        res.json({ status: 'success' });
      } else {
        res.status(400).json({ error: 'Acción no válida' });
      }
    } catch (e: any) {
      console.error('API Error:', e);
      res.status(400).json({ error: e.message });
    }
  });

  // Mock api_study.php
  app.all('/api_study.php', requireSession('api_study'), async (req, res) => {
    const action = req.query.action;
    const userId = (req as any).session.userId as string;
    const childId = req.query.childId as string | undefined;
    const id = req.query.id as string;
    const data = req.body || {};

    try {
      // El perfil del niño tiene que ser de esta familia
      const cid = childId || data.childId;
      if (cid) {
        const own = await db.prepare('SELECT id FROM children WHERE id = ? AND parentId = ?').get(String(cid), userId);
        if (!own) return res.status(404).json({ error: 'Perfil no encontrado' });
      } else if (action !== 'delete_book') {
        return res.status(400).json({ error: 'Falta el perfil del niño' });
      }
      if (action === 'get_study_data') {
        const books = await db.prepare('SELECT * FROM books WHERE userId = ? AND childId = ?').all(userId, childId);
        const tasks = await db.prepare('SELECT * FROM study_tasks WHERE childId = ? AND childId IN (SELECT id FROM children WHERE parentId = ?)').all(childId, userId);
        res.json({
          books: books.map((b: any) => ({ ...b, topics: typeof b.topics === 'string' ? JSON.parse(b.topics || '[]') : (b.topics || []) })),
          tasks: tasks.map((t: any) => ({
            ...t,
            pointsReward: t.points_reward,
            handwritingImage: t.handwriting_image,
            aiFeedbackChild: t.ai_feedback_child,
            aiFeedbackParent: t.ai_feedback_parent,
            medicalEvaluation: t.medical_evaluation,
            aiScore: t.ai_score,
            completedAt: t.completed_at,
            createdAt: t.created_at
          }))
        });
      } else if (action === 'add_book') {
        if (!(await db.prepare('SELECT id FROM children WHERE id = ? AND parentId = ?').get(String(data.childId || ''), userId))) return res.status(404).json({ error: 'Perfil no encontrado' });
        const topics = (Array.isArray(data.topics) ? data.topics : []).map((t: any) => String(t).trim().slice(0, 160)).filter(Boolean).slice(0, 60);
        if (!String(data.title || '').trim() || !topics.length) return res.status(400).json({ error: 'Falta el título o los temas del libro.' });
        await db.prepare('INSERT INTO books (id, userId, childId, isbn, title, subject, grade, topics) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
          .run(String(data.id || crypto.randomUUID()), userId, data.childId, String(data.isbn || '').slice(0, 20), String(data.title).slice(0, 200), String(data.subject || '').slice(0, 80), String(data.grade || '').slice(0, 120), JSON.stringify(topics));
        res.json({ success: true });
      } else if (action === 'delete_book') {
        await db.prepare('DELETE FROM books WHERE id = ? AND userId = ?').run(id, userId);
        res.json({ success: true });
      } else if (action === 'add_study_task') {
        if (!(await db.prepare('SELECT id FROM books WHERE id = ? AND userId = ? AND childId = ?').get(String(data.bookId || ''), userId, String(data.childId || '')))) return res.status(404).json({ error: 'Libro no encontrado' });
        await db.prepare('INSERT INTO study_tasks (id, bookId, childId, topicIndex, topicTitle, points_reward) VALUES (?, ?, ?, ?, ?, ?)')
          .run(data.id, data.bookId, data.childId, data.topicIndex, data.topicTitle, Math.max(0, Math.min(100, Math.round(Number(data.pointsReward) || 0))));
        res.json({ success: true });
      } else if (action === 'complete_study_task') {
        const task = await db.prepare('SELECT * FROM study_tasks WHERE id = ? AND childId = ?').get(String(data.id || ''), String(data.childId));
        if (!task) return res.status(404).json({ error: 'No encuentro esa tarea.' });
        if (task.status === 'completed') return res.status(409).json({ error: 'Esta tarea ya está hecha.' });
        // Sin foto de la letra ni evaluaciones "psicológicas": solo el resumen y el comentario sobre lo estudiado
        await db.prepare("UPDATE study_tasks SET status = 'completed', summary = ?, handwriting_image = NULL, ai_feedback_child = ?, ai_feedback_parent = ?, medical_evaluation = NULL, ai_score = ?, completed_at = CURRENT_TIMESTAMP WHERE id = ?")
          .run(String(data.summary || '').slice(0, 4000), data.aiFeedbackChild || null, data.aiFeedbackParent || null, data.aiScore ?? null, task.id);
        const pts = Math.max(0, Math.min(100, Number(task.points_reward) || 0));
        await awardActivity(db, { userId, childId: String(data.childId), points: pts, source: 'study', label: `Tema estudiado: ${task.topicTitle}`, refId: task.id });
        const book = await db.prepare('SELECT subject FROM books WHERE id = ?').get(task.bookId);
        await addReviewTopic(db, { userId, childId: String(data.childId), subject: book?.subject || '', topic: task.topicTitle, sourceType: 'book', sourceId: task.id });
        res.json({ success: true, points: pts });
      } else {
        res.status(400).json({ error: 'Acción no válida' });
      }
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  // Puntos, racha, medallas, cromos y premios de familia (antes que los módulos que dan puntos)
  try {
    await registerRewardsRoutes(app, {
      db,
      getSession,
      isParentUnlocked,
      refreshParentWindow: async (tokenHash: string) => {
        await db.prepare('UPDATE sessions SET parent_until = ? WHERE token_hash = ?').run(Date.now() + PARENT_WINDOW_MS, tokenHash);
      },
    });
  } catch (err) {
    console.error('[PREMIOS] Error al iniciar premios:', err);
  }

  // Zona de juegos y prácticas de FP (sin IA)
  try {
    await registerGamesRoutes(app, {
      db,
      getSession,
      isParentUnlocked,
      refreshParentWindow: async (tokenHash: string) => {
        await db.prepare('UPDATE sessions SET parent_until = ? WHERE token_hash = ?').run(Date.now() + PARENT_WINDOW_MS, tokenHash);
      },
    });
  } catch (err) {
    console.error('[JUEGOS] Error al iniciar los juegos:', err);
  }

  // Tutor "Pregúntame" (Claude, desde el servidor)
  try {
    await registerTutorRoutes(app, {
      db,
      getSession,
      isParentUnlocked,
      refreshParentWindow: async (tokenHash: string) => {
        await db.prepare('UPDATE sessions SET parent_until = ? WHERE token_hash = ?').run(Date.now() + PARENT_WINDOW_MS, tokenHash);
      },
    });
  } catch (err) {
    console.error('[TUTOR] Error al iniciar el tutor:', err);
  }

  // Inglés (Claude en el servidor)
  try {
    await registerEnglishRoutes(app, {
      db,
      getSession,
      isParentUnlocked,
      refreshParentWindow: async (tokenHash: string) => {
        await db.prepare('UPDATE sessions SET parent_until = ? WHERE token_hash = ?').run(Date.now() + PARENT_WINDOW_MS, tokenHash);
      },
    });
  } catch (err) {
    console.error('[INGLÉS] Error al iniciar Inglés:', err);
  }

  // Caligrafía (Claude en el servidor)
  try {
    await registerCalligraphyRoutes(app, {
      db,
      getSession,
      isParentUnlocked,
      refreshParentWindow: async (tokenHash: string) => {
        await db.prepare('UPDATE sessions SET parent_until = ? WHERE token_hash = ?').run(Date.now() + PARENT_WINDOW_MS, tokenHash);
      },
    });
  } catch (err) {
    console.error('[CALIGRAFÍA] Error al iniciar Caligrafía:', err);
  }

  // Biblioteca: temas, esquemas y libros (Claude en el servidor)
  try {
    await registerLibraryRoutes(app, {
      db,
      getSession,
      isParentUnlocked,
      refreshParentWindow: async (tokenHash: string) => {
        await db.prepare('UPDATE sessions SET parent_until = ? WHERE token_hash = ?').run(Date.now() + PARENT_WINDOW_MS, tokenHash);
      },
    });
  } catch (err) {
    console.error('[BIBLIOTECA] Error al iniciar la Biblioteca:', err);
  }

  // Mi semana (sin IA)
  try {
    await registerWeekRoutes(app, { db, getSession });
  } catch (err) {
    console.error('[SEMANA] Error al iniciar Mi semana:', err);
  }

  // Panel de padres: resumen, notas del cole y avisos de errores
  try {
    await registerParentRoutes(app, {
      db,
      getSession,
      isParentUnlocked,
      refreshParentWindow: async (tokenHash: string) => {
        await db.prepare('UPDATE sessions SET parent_until = ? WHERE token_hash = ?').run(Date.now() + PARENT_WINDOW_MS, tokenHash);
      },
    });
  } catch (err) {
    console.error('[PADRES] Error al iniciar el panel de padres:', err);
  }


  // Deberes & Fichas (fotos, correcciones y fichas en el servidor)
  try {
    await registerWorksheetRoutes(app, {
      db,
      getSession,
      isParentUnlocked,
      refreshParentWindow: async (tokenHash: string) => {
        await db.prepare('UPDATE sessions SET parent_until = ? WHERE token_hash = ?').run(Date.now() + PARENT_WINDOW_MS, tokenHash);
      },
    });
  } catch (err) {
    console.error('[FICHAS] Error al iniciar fichas:', err);
  }

  // Repasar: test, repaso espaciado y temarios
  try {
    await registerReviewRoutes(app, {
      db,
      getSession,
      isParentUnlocked,
      refreshParentWindow: async (tokenHash: string) => {
        await db.prepare('UPDATE sessions SET parent_until = ? WHERE token_hash = ?').run(Date.now() + PARENT_WINDOW_MS, tokenHash);
      },
    });
  } catch (err) {
    console.error('[REPASO] Error al iniciar repasos:', err);
  }

  // Mates: reto de cálculo (sin IA)
  try {
    await registerMathRoutes(app, {
      db,
      getSession,
      isParentUnlocked,
      refreshParentWindow: async (tokenHash: string) => {
        await db.prepare('UPDATE sessions SET parent_until = ? WHERE token_hash = ?').run(Date.now() + PARENT_WINDOW_MS, tokenHash);
      },
    });
  } catch (err) {
    console.error('[MATES] Error al iniciar Mates:', err);
  }

  // Lectura: biblioteca por curso, velocidad, comprensión y grabaciones
  try {
    await registerReadingRoutes(app, {
      db,
      getSession,
      isParentUnlocked,
      refreshParentWindow: async (tokenHash: string) => {
        await db.prepare('UPDATE sessions SET parent_until = ? WHERE token_hash = ?').run(Date.now() + PARENT_WINDOW_MS, tokenHash);
      },
    });
  } catch (err) {
    console.error('[LECTURA] Error al iniciar Lectura:', err);
  }

  // Copia de seguridad diaria de la base de datos (en R2 en producción)
  try {
    await initBackups(db);
  } catch (err) {
    console.error('[COPIA] Error al preparar las copias de seguridad:', err);
  }

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    // Support both Express v4 and Express v5 wildcard patterns safely
    app.use((req, res, next) => {
      if (req.method === 'GET' && !req.path.startsWith('/api')) {
        return res.sendFile(path.join(distPath, 'index.html'));
      }
      next();
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
