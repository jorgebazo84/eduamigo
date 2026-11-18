// Opción 7 — Puntos, racha, medallas, cromos y premios de familia.
// - Cuenta de puntos en el servidor: cada movimiento queda anotado con su motivo (points_ledger).
//   El navegador ya no puede fijar los puntos.
// - Racha: días (hora de España) con al menos una actividad real. Un día de descanso por semana no la rompe.
// - Medallas: se conceden solas comprobando lo que el niño ha hecho. Algunas regalan un cromo especial.
// - Cromos: se compran eligiéndolos (sin sobres sorpresa) y se guardan en el servidor.
// - Premios de familia: el niño los pide, los puntos quedan reservados y los padres aceptan o rechazan.
import type express from 'express';
import crypto from 'crypto';
import { studyMinutesForGrade } from '../shared/pomodoro';
import { STICKERS, STICKER_BY_ID, WELCOME_STICKERS, BADGES, BADGE_BY_ID, BadgeMetric } from '../shared/rewardsCatalog';

type Db = any;
export interface RewardsDeps {
  db: Db;
  getSession: (req: express.Request) => Promise<{ tokenHash: string; userId: string; parentUntil: number } | null>;
  isParentUnlocked: (s: { parentUntil: number }) => boolean;
  refreshParentWindow: (tokenHash: string) => Promise<void>;
}

export const TUTOR_DAILY_CAP = 20;          // 5 por pregunta nueva al tutor, máx. 4 al día
export const POMODORO_DAILY_MAX = 3;        // sesiones de estudio con puntos al día
/** Segundos mínimos de una sesión (1 minuto de margen sobre la duración de su curso) */
export const pomodoroMinSeconds = (grade: string) => (studyMinutesForGrade(grade) - 1) * 60;
export const CALLIGRAPHY_DAILY_CAP = 30;
export const MAX_PENDING_REQUESTS = 3;
export const PARENT_ADJUST_MAX = 1000;

// ------------------------------------------------------------------ fechas en hora de España
export const madridDay = (t = Date.now()) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Madrid', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(t));

export const startOfTodayMadrid = () => {
  const now = new Date();
  const madrid = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Madrid' }));
  const offset = now.getTime() - madrid.getTime();
  madrid.setHours(0, 0, 0, 0);
  return madrid.getTime() + offset;
};

const dayToUtc = (d: string) => Date.UTC(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8, 10));
const utcToDay = (t: number) => new Date(t).toISOString().slice(0, 10);
const addDaysStr = (d: string, n: number) => utcToDay(dayToUtc(d) + n * 86400000);
/** Lunes de la semana de ese día */
const weekKey = (d: string) => { const t = dayToUtc(d); const dow = (new Date(t).getUTCDay() + 6) % 7; return utcToDay(t - dow * 86400000); };

// ------------------------------------------------------------------ tablas
export async function initRewardsTables(db: Db) {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS points_ledger (
      id VARCHAR(64) PRIMARY KEY,
      user_id VARCHAR(64) NOT NULL,
      child_id VARCHAR(64) NOT NULL,
      delta INTEGER NOT NULL,
      source VARCHAR(24) NOT NULL,
      label VARCHAR(200),
      ref_id VARCHAR(100),
      balance INTEGER,
      created_at BIGINT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_points_ledger_child ON points_ledger (child_id, created_at);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_points_ledger_ref ON points_ledger (child_id, source, ref_id);
    CREATE TABLE IF NOT EXISTS activity_days (
      child_id VARCHAR(64) NOT NULL,
      day VARCHAR(10) NOT NULL,
      activities INTEGER DEFAULT 1,
      PRIMARY KEY (child_id, day)
    );
    CREATE TABLE IF NOT EXISTS child_badges (
      child_id VARCHAR(64) NOT NULL,
      badge_id VARCHAR(40) NOT NULL,
      earned_at BIGINT NOT NULL,
      seen INTEGER DEFAULT 0,
      PRIMARY KEY (child_id, badge_id)
    );
    CREATE TABLE IF NOT EXISTS child_stickers (
      child_id VARCHAR(64) NOT NULL,
      sticker_id VARCHAR(40) NOT NULL,
      how VARCHAR(12) NOT NULL,
      created_at BIGINT NOT NULL,
      seen INTEGER DEFAULT 0,
      PRIMARY KEY (child_id, sticker_id)
    );
    CREATE TABLE IF NOT EXISTS reward_requests (
      id VARCHAR(64) PRIMARY KEY,
      user_id VARCHAR(64) NOT NULL,
      child_id VARCHAR(64) NOT NULL,
      reward_id VARCHAR(64),
      title VARCHAR(200) NOT NULL,
      icon VARCHAR(16),
      cost INTEGER NOT NULL,
      status VARCHAR(12) NOT NULL,
      note VARCHAR(300),
      created_at BIGINT NOT NULL,
      decided_at BIGINT,
      seen INTEGER DEFAULT 1
    );
    CREATE INDEX IF NOT EXISTS idx_reward_requests_child ON reward_requests (child_id, created_at);
    CREATE TABLE IF NOT EXISTS pomodoro_sessions (
      id VARCHAR(64) PRIMARY KEY,
      child_id VARCHAR(64) NOT NULL,
      started_at BIGINT NOT NULL,
      finished_at BIGINT
    );
  `);
  try { await db.exec('ALTER TABLE children ADD COLUMN streak_best INTEGER DEFAULT 0'); } catch { /* ya existe */ }
}

// ------------------------------------------------------------------ puntos
const balanceOf = async (db: Db, childId: string) =>
  Number((await db.prepare('SELECT points FROM children WHERE id = ?').get(childId))?.points || 0);

/** Suma (o resta) puntos y lo anota. Con refId, el mismo motivo no se paga dos veces. */
async function ledger(db: Db, p: { userId: string; childId: string; delta: number; source: string; label: string; refId?: string | null }) {
  let delta = Math.trunc(p.delta);
  if (p.refId) {
    const dup = await db.prepare('SELECT id FROM points_ledger WHERE child_id = ? AND source = ? AND ref_id = ?').get(p.childId, p.source, p.refId);
    if (dup) return { applied: 0, balance: await balanceOf(db, p.childId) };
  }
  if (delta < 0) delta = -Math.min(-delta, await balanceOf(db, p.childId));
  if (delta !== 0) await db.prepare('UPDATE children SET points = MAX(0, COALESCE(points, 0) + ?) WHERE id = ?').run(delta, p.childId);
  const balance = await balanceOf(db, p.childId);
  try {
    await db.prepare('INSERT INTO points_ledger (id, user_id, child_id, delta, source, label, ref_id, balance, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .run(crypto.randomUUID(), p.userId, p.childId, delta, p.source, p.label.slice(0, 200), p.refId || null, balance, Date.now());
  } catch (e) {
    // Carrera con el mismo refId: deshace la suma
    if (p.refId && delta !== 0) await db.prepare('UPDATE children SET points = MAX(0, COALESCE(points, 0) - ?) WHERE id = ?').run(delta, p.childId);
    return { applied: 0, balance: await balanceOf(db, p.childId) };
  }
  return { applied: delta, balance };
}

/** Puntos ganados hoy por un motivo (para los topes diarios) */
export const earnedToday = async (db: Db, childId: string, source: string) =>
  Number((await db.prepare('SELECT COALESCE(SUM(delta), 0) AS p FROM points_ledger WHERE child_id = ? AND source = ? AND delta > 0 AND created_at >= ?').get(childId, source, startOfTodayMadrid()))?.p || 0);

/**
 * Actividad real del niño: cuenta para la racha (aunque dé 0 puntos por el tope diario),
 * anota los puntos y comprueba si ha ganado medallas o cromos especiales.
 * La usan Mates, Lectura, Repasar, fichas, deberes, libros, tutor, caligrafía y pomodoro.
 */
export async function awardActivity(db: Db, p: { userId: string; childId: string; points: number; source: string; label: string; refId?: string | null }) {
  const pts = Math.max(0, Math.trunc(p.points || 0));
  let applied = 0;
  let balance: number;
  if (pts > 0) {
    const r = await ledger(db, { ...p, delta: pts });
    applied = r.applied; balance = r.balance;
    if (p.refId && applied === 0 && pts > 0) {
      // Ya estaba pagado: no vuelve a contar
      return { awarded: 0, newPoints: balance, duplicate: true };
    }
  } else {
    balance = await balanceOf(db, p.childId);
  }
  await markActive(db, p.childId);
  await checkAchievements(db, p.userId, p.childId).catch((e) => console.error('[LOGROS]', e));
  return { awarded: applied, newPoints: await balanceOf(db, p.childId), duplicate: false };
}

/**
 * Puntos de los juegos (opción 10): se anotan como los demás, pero NO cuentan como actividad de estudio,
 * así que no abren los juegos ni mantienen la racha.
 */
export async function awardGamePoints(db: Db, p: { userId: string; childId: string; points: number; label: string; refId: string }) {
  const pts = Math.max(0, Math.trunc(p.points || 0));
  if (!pts) return { awarded: 0, newPoints: await balanceOf(db, p.childId) };
  const r = await ledger(db, { ...p, delta: pts, source: 'games' });
  return { awarded: r.applied, newPoints: r.balance };
}

/** ¿Ha hecho hoy alguna actividad de estudio? */
export async function studiedToday(db: Db, childId: string) {
  const row = await db.prepare('SELECT activities FROM activity_days WHERE child_id = ? AND day = ?').get(childId, madridDay());
  return Number(row?.activities || 0) > 0;
}

async function markActive(db: Db, childId: string) {
  const day = madridDay();
  const row = await db.prepare('SELECT activities FROM activity_days WHERE child_id = ? AND day = ?').get(childId, day);
  if (row) await db.prepare('UPDATE activity_days SET activities = activities + 1 WHERE child_id = ? AND day = ?').run(childId, day);
  else await db.prepare('INSERT INTO activity_days (child_id, day, activities) VALUES (?, ?, 1)').run(childId, day);
  const st = await streakInfo(db, childId);
  await db.prepare('UPDATE children SET streak_current = ?, streak_last_active = ?, streak_best = MAX(COALESCE(streak_best, 0), ?) WHERE id = ?')
    .run(st.current, Date.now(), st.current, childId);
}

// ------------------------------------------------------------------ racha
/**
 * Cuenta los días seguidos con actividad. Un día sin actividad por semana (lunes a domingo) es
 * "día de descanso" y no rompe la racha; dos días seguidos sin actividad, sí.
 * Hoy, mientras no haya terminado, no rompe nada.
 */
export function computeStreak(days: Set<string>, today: string) {
  let current = 0;
  const restWeeks = new Set<string>();      // semanas cuyo descanso ya se ha usado (provisional)
  const confirmedRest = new Set<string>();  // descansos que quedan dentro de la racha
  let pendingRest: string | null = null;
  let prevMissed = false;
  let d = days.has(today) ? today : addDaysStr(today, -1);  // hoy aún puede estudiar
  for (let i = 0; i < 800; i++) {
    if (days.has(d)) {
      current++; prevMissed = false;
      if (pendingRest) { confirmedRest.add(pendingRest); pendingRest = null; }
    } else {
      const wk = weekKey(d);
      if (prevMissed || restWeeks.has(wk) || current === 0 && i > 0) break;
      restWeeks.add(wk); pendingRest = wk; prevMissed = true;
    }
    d = addDaysStr(d, -1);
  }
  return { current, activeToday: days.has(today), restUsedThisWeek: confirmedRest.has(weekKey(today)) };
}

export async function streakInfo(db: Db, childId: string) {
  const since = addDaysStr(madridDay(), -800);
  const rows = await db.prepare('SELECT day FROM activity_days WHERE child_id = ? AND day >= ?').all(childId, since);
  const today = madridDay();
  const st = computeStreak(new Set(rows.map((r: any) => String(r.day))), today);
  const best = Number((await db.prepare('SELECT streak_best FROM children WHERE id = ?').get(childId))?.streak_best || 0);
  const nextMilestone = [3, 7, 14, 30].find((m) => m > st.current) || null;
  // Últimos 14 días, para el calendario
  const last14 = Array.from({ length: 14 }, (_, i) => { const d = addDaysStr(today, i - 13); return { day: d, active: rows.some((r: any) => r.day === d) }; });
  return { ...st, best: Math.max(best, st.current), nextMilestone, last14 };
}

// ------------------------------------------------------------------ medallas y cromos especiales
async function metric(db: Db, childId: string, m: BadgeMetric, cache: Map<string, number>): Promise<number> {
  if (cache.has(m)) return cache.get(m)!;
  const one = async (sql: string, ...args: any[]) => { try { return Number((await db.prepare(sql).get(...args))?.n || 0); } catch { return 0; } };
  let v = 0;
  switch (m) {
    case 'activities': v = await one('SELECT COALESCE(SUM(activities), 0) AS n FROM activity_days WHERE child_id = ?', childId); break;
    case 'math': v = await one('SELECT COUNT(*) AS n FROM math_challenges WHERE child_id = ?', childId); break;
    case 'readings': v = await one('SELECT COUNT(*) AS n FROM reading_records WHERE child_id = ? AND counted = 1', childId); break;
    case 'reading_perfect': v = await one('SELECT COUNT(*) AS n FROM reading_records WHERE child_id = ? AND counted = 1 AND total > 0 AND correct = total', childId); break;
    case 'test10': v = await one('SELECT COUNT(*) AS n FROM exam_sessions WHERE child_id = ? AND finished_at IS NOT NULL AND total > 0 AND score = total', childId); break;
    case 'mastered': v = await one("SELECT COUNT(*) AS n FROM review_items WHERE child_id = ? AND status = 'mastered'", childId); break;
    case 'sheets': v = await one('SELECT COUNT(*) AS n FROM photo_corrections WHERE child_id = ?', childId); break;
    case 'tutor': v = await one('SELECT COUNT(*) AS n FROM tutor_conversations WHERE child_id = ?', childId); break;
    case 'stickers': v = await one('SELECT COUNT(*) AS n FROM child_stickers WHERE child_id = ?', childId); break;
    case 'streak': v = (await streakInfo(db, childId)).current; break;
  }
  cache.set(m, v);
  return v;
}

async function giveSticker(db: Db, childId: string, stickerId: string, how: string) {
  const has = await db.prepare('SELECT 1 AS x FROM child_stickers WHERE child_id = ? AND sticker_id = ?').get(childId, stickerId);
  if (has) return false;
  await db.prepare('INSERT INTO child_stickers (child_id, sticker_id, how, created_at, seen) VALUES (?, ?, ?, ?, 0)').run(childId, stickerId, how, Date.now());
  return true;
}

export async function ensureWelcome(db: Db, childId: string) {
  const any = await db.prepare('SELECT 1 AS x FROM child_stickers WHERE child_id = ? LIMIT 1').get(childId);
  if (any) return;
  for (const id of WELCOME_STICKERS) {
    await db.prepare('INSERT INTO child_stickers (child_id, sticker_id, how, created_at, seen) VALUES (?, ?, ?, ?, 1)').run(childId, id, 'welcome', Date.now());
  }
}

export async function checkAchievements(db: Db, userId: string, childId: string) {
  await ensureWelcome(db, childId);
  const have = new Set((await db.prepare('SELECT badge_id FROM child_badges WHERE child_id = ?').all(childId)).map((r: any) => r.badge_id));
  const cache = new Map<string, number>();
  const won: string[] = [];
  for (const b of BADGES) {
    if (have.has(b.id)) continue;
    if ((await metric(db, childId, b.metric, cache)) >= b.target) {
      await db.prepare('INSERT INTO child_badges (child_id, badge_id, earned_at, seen) VALUES (?, ?, ?, 0)').run(childId, b.id, Date.now());
      if (b.gift) await giveSticker(db, childId, b.gift, 'badge');
      won.push(b.id);
      cache.delete('stickers');
    }
  }
  // "Coleccionista" puede llegar justo por el cromo regalado
  if (won.length && !have.has('collector20') && !won.includes('collector20')) {
    const n = await metric(db, childId, 'stickers', cache);
    if (n >= 20) await db.prepare('INSERT INTO child_badges (child_id, badge_id, earned_at, seen) VALUES (?, ?, ?, 0)').run(childId, 'collector20', Date.now());
  }
  return won;
}

async function badgeList(db: Db, childId: string) {
  const rows = await db.prepare('SELECT * FROM child_badges WHERE child_id = ?').all(childId);
  const got = new Map(rows.map((r: any) => [r.badge_id, r]));
  const cache = new Map<string, number>();
  const out = [];
  for (const b of BADGES) {
    const r: any = got.get(b.id);
    const progress = r ? b.target : Math.min(b.target, await metric(db, childId, b.metric, cache));
    out.push({ id: b.id, title: b.title, description: b.description, icon: b.icon, target: b.target, progress, earned: !!r, earnedAt: r ? Number(r.earned_at) : null, gift: b.gift || null });
  }
  return out;
}

// ------------------------------------------------------------------ resumen para el niño
export async function childSummary(db: Db, userId: string, childId: string) {
  await ensureWelcome(db, childId);
  const points = await balanceOf(db, childId);
  const streak = await streakInfo(db, childId);
  const stickers = (await db.prepare('SELECT sticker_id, how, created_at FROM child_stickers WHERE child_id = ?').all(childId))
    .map((r: any) => ({ id: r.sticker_id, how: r.how, at: Number(r.created_at) }));
  const badges = await badgeList(db, childId);
  const rewards = (await db.prepare('SELECT id, title, pointsCost, icon FROM rewards WHERE userId = ?').all(userId))
    .map((r: any) => ({ id: r.id, title: r.title, pointsCost: Number(r.pointsCost), icon: r.icon }));
  const requests = (await db.prepare('SELECT * FROM reward_requests WHERE child_id = ? ORDER BY created_at DESC LIMIT 20').all(childId)).map(requestOut);
  // Novedades sin ver: medallas, cromos regalados y premios decididos
  const newBadges = (await db.prepare('SELECT badge_id FROM child_badges WHERE child_id = ? AND seen = 0').all(childId)).map((r: any) => r.badge_id);
  const newStickers = (await db.prepare("SELECT sticker_id FROM child_stickers WHERE child_id = ? AND seen = 0 AND how != 'bought'").all(childId)).map((r: any) => r.sticker_id);
  const decided = requests.filter((r: any) => r.status !== 'pending' && !r.seen).map((r: any) => r.id);
  return { points, streak, stickers, badges, rewards, requests, news: { badges: newBadges, stickers: newStickers, requests: decided } };
}

const requestOut = (r: any) => ({
  id: r.id, rewardId: r.reward_id, title: r.title, icon: r.icon, cost: Number(r.cost), status: r.status, note: r.note || '',
  createdAt: Number(r.created_at), decidedAt: r.decided_at ? Number(r.decided_at) : null, seen: !!Number(r.seen),
});

const SOURCE_LABEL: Record<string, string> = {
  math: 'Mates', reading: 'Lectura', review: 'Repasar', worksheet: 'Fichas', homework: 'Deberes', study: 'Libros',
  tutor: 'Tutor', english: 'Inglés', calligraphy: 'Caligrafía', pomodoro: 'Pomodoro', games: 'Juegos', practice: 'Prácticas de FP', sticker: 'Cromos', reward: 'Premios', refund: 'Devoluciones', parent: 'Padres',
};

// ------------------------------------------------------------------ rutas
export async function registerRewardsRoutes(app: express.Express, deps: RewardsDeps) {
  const { db, getSession, isParentUnlocked, refreshParentWindow } = deps;
  await initRewardsTables(db);

  const ownChild = (userId: string, childId: string) =>
    db.prepare('SELECT id, name, grade, points FROM children WHERE id = ? AND parentId = ?').get(childId, userId);

  const PARENT_ACTIONS = new Set(['parent_overview', 'decide_request', 'adjust_points', 'pending_requests']);

  app.post('/api_rewards.php', async (req, res) => {
    const action = String(req.query.action || '');
    const b = req.body || {};
    try {
      const session = await getSession(req);
      if (!session) return res.status(401).json({ error: 'Sesión no válida. Vuelve a iniciar sesión.', code: 'AUTH_REQUIRED' });
      const userId = session.userId;
      if (PARENT_ACTIONS.has(action)) {
        if (!isParentUnlocked(session)) return res.status(403).json({ error: 'Esta acción necesita el PIN de padres.', code: 'PIN_REQUIRED' });
        await refreshParentWindow(session.tokenHash);
      }

      // ------------------------------------------------ padres: premios pedidos sin responder (para el aviso)
      if (action === 'pending_requests') {
        const rows = await db.prepare("SELECT child_id, COUNT(*) AS n FROM reward_requests WHERE user_id = ? AND status = 'pending' GROUP BY child_id").all(userId);
        const byChild: Record<string, number> = {};
        rows.forEach((r: any) => { byChild[r.child_id] = Number(r.n); });
        return res.json({ total: Object.values(byChild).reduce((a, b) => a + b, 0), byChild });
      }

      // ------------------------------------------------ padres: aceptar o rechazar una petición
      if (action === 'decide_request') {
        const r = await db.prepare('SELECT * FROM reward_requests WHERE id = ? AND user_id = ?').get(String(b.requestId || ''), userId);
        if (!r) return res.status(404).json({ error: 'No encuentro esa petición.' });
        if (r.status !== 'pending') return res.status(409).json({ error: 'Esta petición ya está decidida.' });
        const approve = !!b.approve;
        const note = String(b.note || '').slice(0, 300);
        await db.prepare('UPDATE reward_requests SET status = ?, note = ?, decided_at = ?, seen = 0 WHERE id = ?').run(approve ? 'approved' : 'rejected', note, Date.now(), r.id);
        let newPoints = await balanceOf(db, r.child_id);
        if (!approve) {
          // Se devuelven los puntos reservados
          newPoints = (await ledger(db, { userId, childId: r.child_id, delta: Number(r.cost), source: 'refund', label: `Premio no aceptado: ${r.title}`, refId: r.id })).balance;
        }
        return res.json({ status: 'success', newPoints });
      }

      const child = b.childId ? await ownChild(userId, String(b.childId)) : null;
      if (!child) return res.status(404).json({ error: 'Perfil no encontrado' });

      // ------------------------------------------------ resumen del niño
      if (action === 'summary') {
        await checkAchievements(db, userId, child.id).catch(() => {});
        return res.json(await childSummary(db, userId, child.id));
      }

      if (action === 'mark_seen') {
        await db.prepare('UPDATE child_badges SET seen = 1 WHERE child_id = ?').run(child.id);
        await db.prepare('UPDATE child_stickers SET seen = 1 WHERE child_id = ?').run(child.id);
        await db.prepare("UPDATE reward_requests SET seen = 1 WHERE child_id = ? AND status != 'pending'").run(child.id);
        return res.json({ status: 'success' });
      }

      // ------------------------------------------------ comprar un cromo eligiéndolo
      if (action === 'buy_sticker') {
        const st = STICKER_BY_ID.get(String(b.stickerId || ''));
        if (!st) return res.status(404).json({ error: 'Ese cromo no existe.' });
        if (!st.cost) return res.status(400).json({ error: 'Este cromo especial no se compra: se gana con las medallas y la racha.' });
        const has = await db.prepare('SELECT 1 AS x FROM child_stickers WHERE child_id = ? AND sticker_id = ?').get(child.id, st.id);
        if (has) return res.status(409).json({ error: '¡Ya tienes este cromo!' });
        const points = await balanceOf(db, child.id);
        if (points < st.cost) return res.status(400).json({ error: `Te faltan ${st.cost - points} puntos para este cromo.`, code: 'NOT_ENOUGH' });
        await db.prepare('INSERT INTO child_stickers (child_id, sticker_id, how, created_at, seen) VALUES (?, ?, ?, ?, 1)').run(child.id, st.id, 'bought', Date.now());
        const r = await ledger(db, { userId, childId: child.id, delta: -st.cost, source: 'sticker', label: `Cromo: ${st.title}`, refId: st.id });
        await checkAchievements(db, userId, child.id).catch(() => {});
        return res.json({ status: 'success', newPoints: r.balance });
      }

      // ------------------------------------------------ pedir un premio de familia
      if (action === 'request_reward') {
        const reward = await db.prepare('SELECT * FROM rewards WHERE id = ? AND userId = ?').get(String(b.rewardId || ''), userId);
        if (!reward) return res.status(404).json({ error: 'Ese premio ya no existe.' });
        const cost = Math.max(1, Number(reward.pointsCost) || 0);
        const pending = Number((await db.prepare("SELECT COUNT(*) AS n FROM reward_requests WHERE child_id = ? AND status = 'pending'").get(child.id))?.n || 0);
        if (pending >= MAX_PENDING_REQUESTS) return res.status(429).json({ error: `Ya tienes ${pending} premios esperando a tus padres. Espera a que respondan.`, code: 'TOO_MANY' });
        const points = await balanceOf(db, child.id);
        if (points < cost) return res.status(400).json({ error: `Te faltan ${cost - points} puntos para este premio.`, code: 'NOT_ENOUGH' });
        const id = crypto.randomUUID();
        await db.prepare('INSERT INTO reward_requests (id, user_id, child_id, reward_id, title, icon, cost, status, created_at, seen) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)')
          .run(id, userId, child.id, reward.id, String(reward.title).slice(0, 200), reward.icon || '🎁', cost, 'pending', Date.now());
        const r = await ledger(db, { userId, childId: child.id, delta: -cost, source: 'reward', label: `Premio pedido: ${reward.title}`, refId: id });
        return res.json({ status: 'success', newPoints: r.balance, requestId: id });
      }

      // ------------------------------------------------ el niño cancela su petición (se le devuelven)
      if (action === 'cancel_request') {
        const r = await db.prepare("SELECT * FROM reward_requests WHERE id = ? AND child_id = ? AND status = 'pending'").get(String(b.requestId || ''), child.id);
        if (!r) return res.status(404).json({ error: 'No encuentro esa petición.' });
        await db.prepare("UPDATE reward_requests SET status = 'cancelled', decided_at = ?, seen = 1 WHERE id = ?").run(Date.now(), r.id);
        const out = await ledger(db, { userId, childId: child.id, delta: Number(r.cost), source: 'refund', label: `Petición cancelada: ${r.title}`, refId: r.id });
        return res.json({ status: 'success', newPoints: out.balance });
      }

      // ------------------------------------------------ pomodoro: empezar y terminar
      if (action === 'pomodoro_start') {
        const id = crypto.randomUUID();
        await db.prepare('INSERT INTO pomodoro_sessions (id, child_id, started_at) VALUES (?, ?, ?)').run(id, child.id, Date.now());
        return res.json({ sessionId: id });
      }
      if (action === 'pomodoro_done') {
        const s = await db.prepare('SELECT * FROM pomodoro_sessions WHERE id = ? AND child_id = ?').get(String(b.sessionId || ''), child.id);
        if (!s || s.finished_at) return res.status(404).json({ error: 'No encuentro esa sesión de estudio.' });
        const secs = (Date.now() - Number(s.started_at)) / 1000;
        if (secs < pomodoroMinSeconds(child.grade)) return res.status(400).json({ error: 'La sesión de estudio aún no ha terminado.', code: 'TOO_SOON' });
        await db.prepare('UPDATE pomodoro_sessions SET finished_at = ? WHERE id = ?').run(Date.now(), s.id);
        const done = Number((await db.prepare('SELECT COUNT(*) AS n FROM points_ledger WHERE child_id = ? AND source = ? AND created_at >= ?').get(child.id, 'pomodoro', startOfTodayMadrid()))?.n || 0);
        const pts = done >= POMODORO_DAILY_MAX ? 0 : (b.concentration ? 30 : 20);
        const r = await awardActivity(db, { userId, childId: child.id, points: pts, source: 'pomodoro', label: 'Sesión de estudio (pomodoro)', refId: s.id });
        return res.json({ awarded: r.awarded, newPoints: r.newPoints, capped: pts === 0 });
      }

      // ------------------------------------------------ padres: resumen
      if (action === 'parent_overview') {
        const sum = await childSummary(db, userId, child.id);
        const ledgerRows = (await db.prepare('SELECT * FROM points_ledger WHERE child_id = ? ORDER BY created_at DESC LIMIT 100').all(child.id))
          .map((r: any) => ({ id: r.id, delta: Number(r.delta), source: r.source, sourceLabel: SOURCE_LABEL[r.source] || r.source, label: r.label, balance: Number(r.balance), at: Number(r.created_at) }));
        const weekAgo = Date.now() - 7 * 86400000;
        const bySource = (await db.prepare('SELECT source, SUM(delta) AS p FROM points_ledger WHERE child_id = ? AND delta > 0 AND created_at >= ? GROUP BY source').all(child.id, weekAgo))
          .map((r: any) => ({ source: r.source, label: SOURCE_LABEL[r.source] || r.source, points: Number(r.p) }))
          .filter((r: any) => !['refund'].includes(r.source))
          .sort((a: any, b: any) => b.points - a.points);
        const spentWeek = Number((await db.prepare('SELECT COALESCE(SUM(delta), 0) AS p FROM points_ledger WHERE child_id = ? AND delta < 0 AND created_at >= ?').get(child.id, weekAgo))?.p || 0);
        const allRequests = (await db.prepare('SELECT * FROM reward_requests WHERE child_id = ? ORDER BY created_at DESC LIMIT 50').all(child.id)).map(requestOut);
        return res.json({
          points: sum.points, streak: sum.streak, badges: sum.badges, stickersOwned: sum.stickers.length, stickersTotal: STICKERS.length,
          ledger: ledgerRows, earnedWeek: bySource, spentWeek: -spentWeek, requests: allRequests,
        });
      }

      // ------------------------------------------------ padres: dar o quitar puntos con motivo
      if (action === 'adjust_points') {
        const delta = Math.trunc(Number(b.delta) || 0);
        const reason = String(b.reason || '').trim().slice(0, 150);
        if (!delta || Math.abs(delta) > PARENT_ADJUST_MAX) return res.status(400).json({ error: `Indica entre 1 y ${PARENT_ADJUST_MAX} puntos.` });
        if (reason.length < 3) return res.status(400).json({ error: 'Escribe el motivo: tu hijo lo verá en su historial.' });
        const r = await ledger(db, { userId, childId: child.id, delta, source: 'parent', label: reason });
        return res.json({ status: 'success', newPoints: r.balance });
      }

      return res.status(400).json({ error: 'Acción no válida' });
    } catch (e: any) {
      console.error('[PREMIOS]', e?.message);
      return res.status(500).json({ error: 'No se ha podido completar. Inténtalo de nuevo.' });
    }
  });
}
