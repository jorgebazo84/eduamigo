// Opción 5 — Mates: reto de cálculo guardado en el servidor (sin IA).
// El servidor vuelve a comprobar cada respuesta, guarda el récord y las operaciones que se le resisten,
// y calcula los puntos con un máximo diario (150) para que no se puedan "farmear".
import type express from 'express';
import crypto from 'crypto';
import { awardActivity } from './rewards';
import { MathProblem, evaluate, isCorrect, factKey, opFamily, isSaneProblem, problemText } from '../shared/mathOps';

type Db = any;
export interface MathDeps {
  db: Db;
  getSession: (req: express.Request) => Promise<{ tokenHash: string; userId: string; parentUntil: number } | null>;
  isParentUnlocked: (s: { parentUntil: number }) => boolean;
  refreshParentWindow: (tokenHash: string) => Promise<void>;
}

export const DAILY_POINTS_CAP = 150;
const MODES = new Set(['mixed', 'add_sub', 'multi', 'div', 'tables', 'mistakes']);
const MAX_ANSWERS = 150;

const startOfTodayMadrid = () => {
  const now = new Date();
  const madrid = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Madrid' }));
  const offset = now.getTime() - madrid.getTime();
  madrid.setHours(0, 0, 0, 0);
  return madrid.getTime() + offset;
};

export async function initMathTables(db: Db) {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS math_challenges (
      id VARCHAR(64) PRIMARY KEY,
      user_id VARCHAR(64) NOT NULL,
      child_id VARCHAR(64) NOT NULL,
      mode VARCHAR(12) NOT NULL,
      table_number INTEGER,
      answer_style VARCHAR(8),
      level_start INTEGER,
      level_end INTEGER,
      correct INTEGER NOT NULL,
      wrong INTEGER NOT NULL,
      best_streak INTEGER NOT NULL,
      duration INTEGER,
      points INTEGER NOT NULL,
      by_family TEXT,
      created_at BIGINT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_math_challenges_child ON math_challenges (child_id, created_at);
    CREATE TABLE IF NOT EXISTS math_facts (
      child_id VARCHAR(64) NOT NULL,
      fact_key VARCHAR(40) NOT NULL,
      label VARCHAR(80),
      attempts INTEGER DEFAULT 0,
      wrong INTEGER DEFAULT 0,
      recent TEXT,
      sample_json TEXT,
      updated_at BIGINT,
      PRIMARY KEY (child_id, fact_key)
    );
  `);
  try { await db.exec('ALTER TABLE children ADD COLUMN math_answer_style VARCHAR(8)'); } catch { /* ya existe */ }
}

/**
 * Lo que "se le resiste": con al menos 3 intentos, aciertos por debajo del 70 % en los últimos 10 intentos.
 * (Se mira lo reciente para que, cuando lo aprenda, deje de aparecer.)
 */
const weakFacts = async (db: Db, childId: string, limit = 10) => {
  const rows = await db.prepare('SELECT * FROM math_facts WHERE child_id = ?').all(childId);
  return rows
    .map((r: any) => {
      const recent: number[] = JSON.parse(r.recent || '[]');
      const ok = recent.filter((x) => x === 1).length;
      return { key: r.fact_key, label: r.label, attempts: Number(r.attempts), recentAttempts: recent.length, accuracy: recent.length ? Math.round((ok / recent.length) * 100) : 0, sample: r.sample_json ? JSON.parse(r.sample_json) : null };
    })
    .filter((f: any) => f.recentAttempts >= 3 && f.accuracy < 70)
    .sort((a: any, b: any) => a.accuracy - b.accuracy || b.attempts - a.attempts)
    .slice(0, limit);
};

const pointsToday = async (db: Db, childId: string) =>
  Number((await db.prepare('SELECT COALESCE(SUM(points), 0) AS p FROM math_challenges WHERE child_id = ? AND created_at >= ?').get(childId, startOfTodayMadrid()))?.p || 0);

const recordFor = async (db: Db, childId: string, mode: string, table: number | null) =>
  Number((await db.prepare('SELECT MAX(correct) AS m FROM math_challenges WHERE child_id = ? AND mode = ? AND COALESCE(table_number, 0) = ?').get(childId, mode, table || 0))?.m || 0);

export async function registerMathRoutes(app: express.Express, deps: MathDeps) {
  const { db, getSession, isParentUnlocked, refreshParentWindow } = deps;
  await initMathTables(db);

  const ownChild = (userId: string, childId: string) =>
    db.prepare('SELECT id, name, grade, points, math_answer_style FROM children WHERE id = ? AND parentId = ?').get(childId, userId);

  app.post('/api_math.php', async (req, res) => {
    const action = String(req.query.action || '');
    const b = req.body || {};
    try {
      const session = await getSession(req);
      if (!session) return res.status(401).json({ error: 'Sesión no válida. Vuelve a iniciar sesión.', code: 'AUTH_REQUIRED' });
      const userId = session.userId;
      if (action === 'parent_stats' || action === 'set_settings') {
        if (!isParentUnlocked(session)) return res.status(403).json({ error: 'Esta acción necesita el PIN de padres.', code: 'PIN_REQUIRED' });
        await refreshParentWindow(session.tokenHash);
      }
      const child = b.childId ? await ownChild(userId, String(b.childId)) : null;
      if (!child) return res.status(404).json({ error: 'Perfil no encontrado' });

      // ---------------------------------------------------------------- ajustes del niño para el reto
      if (action === 'config') {
        const mode = MODES.has(b.mode) ? b.mode : 'mixed';
        const table = mode === 'tables' ? Math.max(2, Math.min(10, Number(b.table) || 2)) : null;
        const weak = await weakFacts(db, child.id, 20);
        const today = await pointsToday(db, child.id);
        return res.json({
          answerStyle: child.math_answer_style || null,
          record: await recordFor(db, child.id, mode, table),
          pointsToday: today, pointsCap: DAILY_POINTS_CAP, pointsLeft: Math.max(0, DAILY_POINTS_CAP - today),
          weak: weak.map((w: any) => ({ key: w.key, label: w.label, accuracy: w.accuracy })),
          mistakes: weak.map((w: any) => w.sample).filter((s: any) => isSaneProblem(s)),
        });
      }

      // ---------------------------------------------------------------- guardar un reto
      if (action === 'save_challenge') {
        const mode = MODES.has(b.mode) ? b.mode : 'mixed';
        const table = mode === 'tables' ? Math.max(2, Math.min(10, Number(b.table) || 2)) : null;
        const answers: any[] = (Array.isArray(b.answers) ? b.answers : []).slice(0, MAX_ANSWERS);
        let correct = 0, wrong = 0, streak = 0, best = 0;
        const fams: Record<string, { ok: number; ko: number }> = {};
        const facts = new Map<string, { label: string; results: number[]; sample: MathProblem | null }>();
        for (const ans of answers) {
          const p = ans?.problem;
          if (!isSaneProblem(p)) continue;
          const given = typeof ans.given === 'number' && Number.isFinite(ans.given) ? ans.given : null;
          // El servidor comprueba de nuevo: no se fía de lo que diga el navegador
          const ok = isCorrect(p, given);
          ok ? (correct++, streak++) : (wrong++, (streak = 0));
          best = Math.max(best, streak);
          const fam = opFamily(p); fams[fam] = fams[fam] || { ok: 0, ko: 0 }; ok ? fams[fam].ok++ : fams[fam].ko++;
          const f = factKey(p);
          const cur = facts.get(f.key) || { label: f.label, results: [], sample: null };
          cur.results.push(ok ? 1 : 0);
          if (!ok) cur.sample = { op: p.op, a: p.a, b: p.b, ...(p.op === 'de' ? { c: p.c } : {}) };
          facts.set(f.key, cur);
        }
        if (correct + wrong === 0) return res.status(400).json({ error: 'No hay respuestas que guardar.' });
        const already = await pointsToday(db, child.id);
        const raw = correct > 0 ? Math.max(5, correct * 3 + best * 2) : 0;
        const points = Math.max(0, Math.min(raw, DAILY_POINTS_CAP - already));
        const prevRecord = await recordFor(db, child.id, mode, table);
        const now = Date.now();
        const challengeId = crypto.randomUUID();
        await db.prepare(`INSERT INTO math_challenges (id, user_id, child_id, mode, table_number, answer_style, level_start, level_end, correct, wrong, best_streak, duration, points, by_family, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
          .run(challengeId, userId, child.id, mode, table, b.answerStyle === 'choice' ? 'choice' : 'typed',
            Math.round(Number(b.levelStart) || 0), Math.round(Number(b.levelEnd) || 0), correct, wrong, best,
            Math.max(0, Math.min(600, Math.round(Number(b.duration) || 45))), points, JSON.stringify(fams), now);
        for (const [key, f] of facts) {
          const row = await db.prepare('SELECT * FROM math_facts WHERE child_id = ? AND fact_key = ?').get(child.id, key);
          const recent = [...JSON.parse(row?.recent || '[]'), ...f.results].slice(-10);
          const wrongN = f.results.filter((x) => x === 0).length;
          if (row) {
            await db.prepare('UPDATE math_facts SET label = ?, attempts = attempts + ?, wrong = wrong + ?, recent = ?, sample_json = COALESCE(?, sample_json), updated_at = ? WHERE child_id = ? AND fact_key = ?')
              .run(f.label, f.results.length, wrongN, JSON.stringify(recent), f.sample ? JSON.stringify(f.sample) : null, now, child.id, key);
          } else {
            await db.prepare('INSERT INTO math_facts (child_id, fact_key, label, attempts, wrong, recent, sample_json, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
              .run(child.id, key, f.label, f.results.length, wrongN, JSON.stringify(recent), f.sample ? JSON.stringify(f.sample) : null, now);
          }
        }
        const { newPoints } = await awardActivity(db, { userId, childId: child.id, points, source: 'math', label: `Reto de Mates: ${correct} aciertos`, refId: challengeId });
        const weak = await weakFacts(db, child.id, 5);
        return res.json({
          correct, wrong, bestStreak: best, points, pointsCapReached: already + raw > DAILY_POINTS_CAP, pointsLeft: Math.max(0, DAILY_POINTS_CAP - already - points),
          newPoints, record: Math.max(prevRecord, correct), newRecord: correct > prevRecord && correct > 0, previousRecord: prevRecord,
          weak: weak.map((w: any) => ({ key: w.key, label: w.label, accuracy: w.accuracy })),
        });
      }

      // ---------------------------------------------------------------- padres
      if (action === 'parent_stats') {
        const since = Date.now() - 28 * 86400000;
        const rows = await db.prepare('SELECT * FROM math_challenges WHERE child_id = ? AND created_at >= ? ORDER BY created_at DESC').all(child.id, since);
        const weekStart = startOfTodayMadrid() - 6 * 86400000;
        // Últimas 4 semanas: retos y % de aciertos por semana
        const weeks = [0, 1, 2, 3].map((w) => {
          const from = weekStart - w * 7 * 86400000, to = from + 7 * 86400000;
          const rs = rows.filter((r: any) => r.created_at >= from && r.created_at < to);
          const ok = rs.reduce((s: number, r: any) => s + Number(r.correct), 0), tot = rs.reduce((s: number, r: any) => s + Number(r.correct) + Number(r.wrong), 0);
          return { from, challenges: rs.length, accuracy: tot ? Math.round((ok / tot) * 100) : null, correct: ok };
        }).reverse();
        const byFamily: Record<string, { ok: number; ko: number }> = {};
        rows.forEach((r: any) => Object.entries(JSON.parse(r.by_family || '{}')).forEach(([k, v]: any) => { byFamily[k] = byFamily[k] || { ok: 0, ko: 0 }; byFamily[k].ok += v.ok; byFamily[k].ko += v.ko; }));
        const record = Number((await db.prepare("SELECT MAX(correct) AS m FROM math_challenges WHERE child_id = ? AND mode = 'mixed'").get(child.id))?.m || 0);
        return res.json({
          weeks,
          thisWeek: weeks[weeks.length - 1],
          byFamily: Object.entries(byFamily).map(([k, v]) => ({ family: k, accuracy: Math.round((v.ok / Math.max(1, v.ok + v.ko)) * 100), total: v.ok + v.ko })),
          weak: (await weakFacts(db, child.id, 12)).map((w: any) => ({ key: w.key, label: w.label, accuracy: w.accuracy, example: w.sample ? problemText(w.sample) : null })),
          record,
          recent: rows.slice(0, 15).map((r: any) => ({ mode: r.mode, table: r.table_number, correct: Number(r.correct), wrong: Number(r.wrong), bestStreak: Number(r.best_streak), points: Number(r.points), createdAt: Number(r.created_at) })),
          pointsToday: await pointsToday(db, child.id), pointsCap: DAILY_POINTS_CAP,
          settings: { answerStyle: child.math_answer_style || null },
        });
      }
      if (action === 'set_settings') {
        const style = b.answerStyle === 'choice' || b.answerStyle === 'typed' ? b.answerStyle : null;
        await db.prepare('UPDATE children SET math_answer_style = ? WHERE id = ?').run(style, child.id);
        return res.json({ status: 'success' });
      }
      return res.status(400).json({ error: 'Acción no válida' });
    } catch (e) {
      console.error('[MATES]', e);
      return res.status(500).json({ error: 'Algo ha fallado. Inténtalo de nuevo.' });
    }
  });
}
// evaluate se reexporta para pruebas
export { evaluate };
