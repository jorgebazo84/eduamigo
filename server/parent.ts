// Opción 8 — Panel de padres.
// - overview: la semana de cada hijo (qué ha hecho, dónde falla, próximos exámenes y repasos, avisos).
// - Notas del cole guardadas en el servidor, con asignaturas fijas por curso. Una nota baja pasa a Repasar.
// - «Esto está mal»: avisos de errores de la IA (fichas, deberes, tests…) que el equipo revisa
//   desde una página privada protegida con ADMIN_TOKEN (junto con los avisos del tutor).
import type express from 'express';
import crypto from 'crypto';
import { addReviewTopic, todayMadrid, addDays } from './review';
import { callClaudeJson, setMockHandler, VISION_MODEL } from './ai';
import { decodeImage } from './storage';
import { streakInfo, startOfTodayMadrid } from './rewards';
import { subjectsForGrade, TERMS, LOW_GRADE } from '../shared/schoolSubjects';
import { QUESTION_LABELS } from '../shared/readingLibrary';

type Db = any;
export interface ParentDeps {
  db: Db;
  getSession: (req: express.Request) => Promise<{ tokenHash: string; userId: string; parentUntil: number } | null>;
  isParentUnlocked: (s: { parentUntil: number }) => boolean;
  refreshParentWindow: (tokenHash: string) => Promise<void>;
}

const WEEK = 7 * 86400000;
const FEEDBACK_KINDS = new Set(['worksheet', 'homework', 'review', 'reading', 'math', 'calligraphy', 'english', 'library', 'other']);

export async function initParentTables(db: Db) {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS school_grades (
      id VARCHAR(64) PRIMARY KEY,
      user_id VARCHAR(64) NOT NULL,
      child_id VARCHAR(64) NOT NULL,
      subject VARCHAR(80) NOT NULL,
      term VARCHAR(30) NOT NULL,
      grade REAL NOT NULL,
      topic VARCHAR(160),
      note VARCHAR(300),
      date VARCHAR(10) NOT NULL,
      review_item_id VARCHAR(64),
      created_at BIGINT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_school_grades_child ON school_grades (child_id, date);
    CREATE TABLE IF NOT EXISTS ai_feedback (
      id VARCHAR(64) PRIMARY KEY,
      user_id VARCHAR(64) NOT NULL,
      child_id VARCHAR(64) NOT NULL,
      kind VARCHAR(16) NOT NULL,
      ref_id VARCHAR(64),
      reason VARCHAR(500),
      snapshot TEXT,
      from_parent INTEGER DEFAULT 0,
      status VARCHAR(12) DEFAULT 'new',
      created_at BIGINT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_ai_feedback_status ON ai_feedback (status, created_at);
  `);
  try { await db.exec("ALTER TABLE tutor_reports ADD COLUMN status VARCHAR(12) DEFAULT 'new'"); } catch { /* ya existe */ }
}

const one = async (db: Db, sql: string, ...args: any[]) => { try { return (await db.prepare(sql).get(...args)) || {}; } catch { return {}; } };
const all = async (db: Db, sql: string, ...args: any[]) => { try { return await db.prepare(sql).all(...args); } catch { return []; } };
const parse = (s: any, d: any) => { try { return JSON.parse(s); } catch { return d; } };

/** La semana de un hijo, en datos reales del servidor */
export async function childWeek(db: Db, userId: string, child: any) {
  const since = Date.now() - WEEK;
  const today = todayMadrid();
  const streak = await streakInfo(db, child.id);
  const activeDays = streak.last14.slice(-7).filter((d) => d.active).length;

  const reading = await one(db, 'SELECT COUNT(*) AS n, AVG(wpm) AS wpm, SUM(correct) AS c, SUM(total) AS t FROM reading_records WHERE child_id = ? AND created_at >= ?', child.id, since);
  const math = await one(db, 'SELECT COUNT(*) AS n, SUM(correct) AS c, SUM(correct + wrong) AS t FROM math_challenges WHERE child_id = ? AND created_at >= ?', child.id, since);
  const tests = await one(db, 'SELECT COUNT(*) AS n, SUM(score) AS c, SUM(total) AS t FROM exam_sessions WHERE child_id = ? AND finished_at IS NOT NULL AND created_at >= ?', child.id, since);
  const sheets = await one(db, 'SELECT COUNT(*) AS n FROM photo_corrections WHERE child_id = ? AND created_at >= ?', child.id, since);
  const tutor = await one(db, 'SELECT COUNT(*) AS n FROM tutor_conversations WHERE child_id = ? AND created_at >= ?', child.id, since);
  const pts = await one(db, 'SELECT COALESCE(SUM(delta), 0) AS p FROM points_ledger WHERE child_id = ? AND delta > 0 AND created_at >= ? AND source NOT IN (?, ?)', child.id, since, 'refund', 'parent');
  const pct = (c: any, t: any) => (Number(t) > 0 ? Math.round((Number(c) / Number(t)) * 100) : null);

  // ---- dónde falla
  const weak: { area: string; text: string }[] = [];
  const facts = await all(db, 'SELECT label, attempts, wrong FROM math_facts WHERE child_id = ? AND attempts >= 3 AND wrong > 0 ORDER BY (wrong * 1.0 / attempts) DESC, wrong DESC LIMIT 3', child.id);
  if (facts.length) weak.push({ area: 'Mates', text: `Le cuestan: ${facts.map((f: any) => f.label).join(', ')}` });
  const recs = await all(db, 'SELECT by_type FROM reading_records WHERE child_id = ? ORDER BY created_at DESC LIMIT 20', child.id);
  if (recs.length >= 3) {
    const agg: Record<string, { c: number; t: number }> = {};
    recs.forEach((r: any) => Object.entries(parse(r.by_type, {})).forEach(([k, v]) => { agg[k] = agg[k] || { c: 0, t: 0 }; agg[k].t++; agg[k].c += Number(v) ? 1 : 0; }));
    const worst = Object.entries(agg).filter(([, v]) => v.t >= 3).map(([k, v]) => ({ k, p: v.c / v.t })).sort((a, b) => a.p - b.p)[0];
    if (worst && worst.p < 0.7) weak.push({ area: 'Lectura', text: `Preguntas de «${(QUESTION_LABELS as any)[worst.k] || worst.k}»: acierta el ${Math.round(worst.p * 100)} %` });
  }
  const lowTopics = await all(db, "SELECT subject, topic, last_score FROM review_items WHERE child_id = ? AND status = 'active' AND last_score IS NOT NULL AND last_score < 5 ORDER BY last_score ASC LIMIT 3", child.id);
  lowTopics.forEach((t: any) => weak.push({ area: 'Repasar', text: `${t.topic}${t.subject ? ` (${t.subject})` : ''}: último test ${Math.round(Number(t.last_score) * 10) / 10}` }));
  const lowGrades = await all(db, 'SELECT subject, term, grade, topic FROM school_grades WHERE child_id = ? AND grade < ? ORDER BY date DESC LIMIT 3', child.id, 5);
  lowGrades.forEach((g: any) => weak.push({ area: 'Notas del cole', text: `${g.subject}${g.topic ? ` — ${g.topic}` : ''}: ${g.grade} (${g.term})` }));

  // ---- lo que viene
  const exams = (await all(db, "SELECT title, date, description FROM calendar_events WHERE childId = ? AND type = 'exam' AND date >= ? AND date <= ? ORDER BY date ASC LIMIT 5", child.id, today, addDays(today, 21)))
    .map((e: any) => ({ title: e.title, date: e.date }));
  const due = await one(db, "SELECT COUNT(*) AS n FROM review_items WHERE child_id = ? AND status = 'active' AND due_date <= ?", child.id, today);
  const nextReviews = (await all(db, "SELECT topic, subject, due_date FROM review_items WHERE child_id = ? AND status = 'active' ORDER BY due_date ASC LIMIT 4", child.id))
    .map((r: any) => ({ topic: r.topic, subject: r.subject, due: r.due_date }));

  // ---- avisos y lo último
  const rewardsPending = await one(db, "SELECT COUNT(*) AS n FROM reward_requests WHERE child_id = ? AND status = 'pending'", child.id);
  const tutorAlerts = await one(db, 'SELECT COUNT(*) AS n FROM tutor_alerts WHERE child_id = ? AND user_id = ? AND seen = 0', child.id, userId);
  const recent = (await all(db, "SELECT label, delta, created_at FROM points_ledger WHERE child_id = ? AND source NOT IN ('sticker', 'reward', 'refund', 'parent') ORDER BY created_at DESC LIMIT 6", child.id))
    .map((r: any) => ({ label: r.label, points: Number(r.delta), at: Number(r.created_at) }));

  return {
    id: child.id, name: child.name, avatar: child.avatar, grade: child.grade, points: Number(child.points) || 0,
    streak: { current: streak.current, best: streak.best, activeToday: streak.activeToday, last14: streak.last14 },
    activeDays,
    week: {
      readings: Number(reading.n || 0), readingWpm: reading.wpm ? Math.round(Number(reading.wpm)) : null, readingPct: pct(reading.c, reading.t),
      mathChallenges: Number(math.n || 0), mathPct: pct(math.c, math.t),
      tests: Number(tests.n || 0), testPct: pct(tests.c, tests.t),
      sheets: Number(sheets.n || 0), tutorQuestions: Number(tutor.n || 0), points: Number(pts.p || 0),
    },
    weak, exams, reviewsDue: Number(due.n || 0), nextReviews,
    alerts: { rewards: Number(rewardsPending.n || 0), tutor: Number(tutorAlerts.n || 0) },
    recent,
  };
}

const gradeOut = (g: any) => ({
  id: g.id, childId: g.child_id, subject: g.subject, term: g.term, grade: Number(g.grade), topic: g.topic || '', note: g.note || '',
  date: g.date, inReview: !!g.review_item_id, createdAt: Number(g.created_at),
});

setMockHandler('school_circular', () => JSON.stringify({ isSchoolDocument: true, events: [
  { title: 'Excursión al museo de Ciencias', date: '2030-03-12', type: 'excursion', description: 'Traer almuerzo y 8 €.' },
  { title: 'Examen de Matemáticas: fracciones', date: '2030-03-20', type: 'exam', description: '' },
] }));

const EVENT_TYPES = new Set(['exam', 'excursion', 'meeting', 'other']);

const esc = (s: any) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

export async function registerParentRoutes(app: express.Express, deps: ParentDeps) {
  const { db, getSession, isParentUnlocked, refreshParentWindow } = deps;
  await initParentTables(db);

  const ownChild = (userId: string, childId: string) =>
    db.prepare('SELECT * FROM children WHERE id = ? AND parentId = ?').get(String(childId || ''), userId);

  // Acciones que puede hacer el niño (sin PIN): avisar de un error
  const CHILD_ACTIONS = new Set(['report_error', 'subjects']);

  app.post('/api_parent.php', async (req, res) => {
    const action = String(req.query.action || '');
    const b = req.body || {};
    try {
      const session = await getSession(req);
      if (!session) return res.status(401).json({ error: 'Sesión no válida. Vuelve a iniciar sesión.', code: 'AUTH_REQUIRED' });
      const userId = session.userId;
      const parent = isParentUnlocked(session);
      if (!CHILD_ACTIONS.has(action)) {
        if (!parent) return res.status(403).json({ error: 'Esta acción necesita el PIN de padres.', code: 'PIN_REQUIRED' });
        await refreshParentWindow(session.tokenHash);
      }

      // ------------------------------------------------ resumen de la semana de todos los hijos
      if (action === 'overview') {
        const kids = await db.prepare('SELECT * FROM children WHERE parentId = ? ORDER BY name').all(userId);
        const children = [];
        for (const c of kids) children.push(await childWeek(db, userId, c));
        return res.json({ children, generatedAt: Date.now() });
      }

      // ------------------------------------------------ informe imprimible de un hijo
      if (action === 'report') {
        const child = await ownChild(userId, b.childId);
        if (!child) return res.status(404).json({ error: 'Perfil no encontrado' });
        const week = await childWeek(db, userId, child);
        const since = Date.now() - 90 * 86400000;
        const readings = (await all(db, 'SELECT title, wpm, wpm_band, correct, total, counted, created_at FROM reading_records WHERE child_id = ? AND created_at >= ? ORDER BY created_at ASC', child.id, since))
          .map((r: any) => ({ title: r.title, wpm: Number(r.wpm), band: r.wpm_band, correct: Number(r.correct), total: Number(r.total), counted: !!Number(r.counted), at: Number(r.created_at) }));
        const tests = (await all(db, 'SELECT subject, topic, score, total, created_at FROM exam_sessions WHERE child_id = ? AND finished_at IS NOT NULL AND created_at >= ? ORDER BY created_at DESC LIMIT 30', child.id, since))
          .map((t: any) => ({ subject: t.subject, topic: t.topic, score: Number(t.score), total: Number(t.total), at: Number(t.created_at) }));
        const math = await one(db, 'SELECT COUNT(*) AS n, SUM(correct) AS c, SUM(correct + wrong) AS t FROM math_challenges WHERE child_id = ? AND created_at >= ?', child.id, since);
        const grades = (await all(db, 'SELECT * FROM school_grades WHERE child_id = ? ORDER BY date DESC LIMIT 40', child.id)).map(gradeOut);
        const mastered = await one(db, "SELECT COUNT(*) AS n FROM review_items WHERE child_id = ? AND status = 'mastered'", child.id);
        const badges = await one(db, 'SELECT COUNT(*) AS n FROM child_badges WHERE child_id = ?', child.id);
        return res.json({
          week, readings, tests, grades,
          math: { challenges: Number(math.n || 0), pct: Number(math.t) > 0 ? Math.round((Number(math.c) / Number(math.t)) * 100) : null },
          mastered: Number(mastered.n || 0), badges: Number(badges.n || 0), generatedAt: Date.now(),
        });
      }

      // ------------------------------------------------ notas del cole
      if (action === 'subjects') {
        const child = await ownChild(userId, b.childId);
        if (!child) return res.status(404).json({ error: 'Perfil no encontrado' });
        return res.json({ subjects: subjectsForGrade(child.grade), terms: TERMS, lowGrade: LOW_GRADE });
      }
      if (action === 'list_grades') {
        const child = await ownChild(userId, b.childId);
        if (!child) return res.status(404).json({ error: 'Perfil no encontrado' });
        const rows = await db.prepare('SELECT * FROM school_grades WHERE child_id = ? ORDER BY date DESC, created_at DESC LIMIT 200').all(child.id);
        return res.json({ grades: rows.map(gradeOut), subjects: subjectsForGrade(child.grade), terms: TERMS, lowGrade: LOW_GRADE });
      }
      if (action === 'add_grade') {
        const child = await ownChild(userId, b.childId);
        if (!child) return res.status(404).json({ error: 'Perfil no encontrado' });
        const subject = String(b.subject || '').trim().slice(0, 80);
        const term = String(b.term || '').trim().slice(0, 30);
        const grade = Math.round(Number(b.grade) * 100) / 100;
        const topic = String(b.topic || '').trim().slice(0, 160);
        const note = String(b.note || '').trim().slice(0, 300);
        const date = /^\d{4}-\d{2}-\d{2}$/.test(String(b.date || '')) ? String(b.date) : todayMadrid();
        if (subject.length < 2) return res.status(400).json({ error: 'Elige la asignatura.' });
        if (!TERMS.includes(term)) return res.status(400).json({ error: 'Elige la evaluación.' });
        if (!Number.isFinite(grade) || grade < 0 || grade > 10) return res.status(400).json({ error: 'La nota debe estar entre 0 y 10.' });
        const id = crypto.randomUUID();
        // Una nota baja pasa a Repasar: el tema concreto si lo apuntáis, o la asignatura en general
        let reviewItemId: string | null = null;
        if (grade < LOW_GRADE) {
          reviewItemId = await addReviewTopic(db, { userId, childId: child.id, subject, topic: topic || `${subject}: repaso general`, sourceType: 'school_grade', sourceId: id, score: grade })
            .catch((e: any) => { console.error('[NOTAS→REPASO]', e?.message); return null; });
        }
        await db.prepare('INSERT INTO school_grades (id, user_id, child_id, subject, term, grade, topic, note, date, review_item_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
          .run(id, userId, child.id, subject, term, grade, topic || null, note || null, date, reviewItemId, Date.now());
        const row = await db.prepare('SELECT * FROM school_grades WHERE id = ?').get(id);
        return res.json({ status: 'success', grade: gradeOut(row), addedToReview: !!reviewItemId });
      }
      if (action === 'delete_grade') {
        const r = await db.prepare('DELETE FROM school_grades WHERE id = ? AND user_id = ?').run(String(b.id || ''), userId);
        return res.json({ status: 'success', deleted: Number(r?.changes ?? r?.rowsAffected ?? 0) });
      }

      // ------------------------------------------------ foto de una circular o de la fecha de un examen
      if (action === 'scan_circular') {
        let img;
        try { img = decodeImage(String(b.image || '')); } catch (e: any) { return res.status(400).json({ error: e.message }); }
        const today = todayMadrid();
        let data: any;
        try {
          ({ data } = await callClaudeJson({
            task: 'school_circular', model: VISION_MODEL(), maxTokens: 1500,
            images: [{ mediaType: img.mediaType, base64: img.buffer.toString('base64') }],
            system: 'Lees circulares y avisos de colegios españoles (o la fecha de un examen apuntada en un cuaderno o una pizarra) y sacas las fechas importantes. Nunca te inventas una fecha: si no se ve, no la pones.',
            prompt: `Hoy es ${today}. Saca los eventos con fecha de esta foto.
Devuelve JSON: {"isSchoolDocument": true|false, "events": [{"title": "...", "date": "AAAA-MM-DD", "type": "exam|excursion|meeting|other", "description": "lo que hay que llevar o hacer"}]}.
Si el año no aparece, usa la próxima fecha posible a partir de hoy.`,
          }));
        } catch (e: any) {
          console.error('[CIRCULAR]', e?.message);
          return res.status(503).json({ error: 'No se ha podido leer la foto ahora mismo. Inténtalo en un rato o apunta el evento a mano.', code: 'AI_UNAVAILABLE' });
        }
        const events = (Array.isArray(data?.events) ? data.events : []).map((e: any) => ({
          title: String(e.title || '').trim().slice(0, 160), date: String(e.date || '').slice(0, 10),
          type: EVENT_TYPES.has(e.type) ? e.type : 'other', description: String(e.description || '').trim().slice(0, 400),
        })).filter((e: any) => e.title && /^\d{4}-\d{2}-\d{2}$/.test(e.date)).slice(0, 10);
        if (data?.isSchoolDocument === false || !events.length) return res.status(422).json({ error: 'No encuentro fechas en la foto. Haz la foto de frente y con buena luz, o apunta el evento a mano.', code: 'NO_EVENTS' });
        return res.json({ events });
      }

      // ------------------------------------------------ «Esto está mal» (niño o padres)
      if (action === 'report_error') {
        const child = await ownChild(userId, b.childId);
        if (!child) return res.status(404).json({ error: 'Perfil no encontrado' });
        const kind = FEEDBACK_KINDS.has(String(b.kind)) ? String(b.kind) : 'other';
        const refId = String(b.refId || '').slice(0, 64) || null;
        const reason = String(b.reason || '').trim().slice(0, 500);
        const today0 = startOfTodayMadrid();
        const count = await one(db, 'SELECT COUNT(*) AS n FROM ai_feedback WHERE child_id = ? AND created_at >= ?', child.id, today0);
        if (Number(count.n || 0) >= 20) return res.status(429).json({ error: 'Ya has enviado muchos avisos hoy. ¡Gracias! Los revisaremos.' });
        // Se guarda una copia de lo que estaba mal (desde el servidor, no desde el navegador)
        let snapshot: any = { note: String(b.detail || '').slice(0, 1000) };
        if (refId && (kind === 'worksheet' || kind === 'homework')) {
          const row = await one(db, `SELECT data FROM ${kind === 'worksheet' ? 'worksheets' : 'homework_records'} WHERE id = ? AND child_id = ?`, refId, child.id);
          if (row.data) {
            const d = parse(row.data, {});
            snapshot = { ...snapshot, subject: d.subject, topic: d.topic, grade: d.grade || child.grade, correction: d.correction || d.exercises || d.feedback || null };
          }
        }
        if (refId) {
          const dup = await one(db, 'SELECT id FROM ai_feedback WHERE child_id = ? AND kind = ? AND ref_id = ?', child.id, kind, refId);
          if (dup.id) return res.json({ status: 'success', duplicate: true });
        }
        await db.prepare('INSERT INTO ai_feedback (id, user_id, child_id, kind, ref_id, reason, snapshot, from_parent, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
          .run(crypto.randomUUID(), userId, child.id, kind, refId, reason || null, JSON.stringify(snapshot).slice(0, 20000), parent ? 1 : 0, 'new', Date.now());
        return res.json({ status: 'success' });
      }

      // ------------------------------------------------ avisos enviados por la familia
      if (action === 'my_reports') {
        const fb = (await all(db, 'SELECT f.id, f.kind, f.reason, f.status, f.created_at, f.from_parent, c.name AS child FROM ai_feedback f JOIN children c ON c.id = f.child_id WHERE f.user_id = ? ORDER BY f.created_at DESC LIMIT 50', userId))
          .map((r: any) => ({ id: r.id, kind: r.kind, reason: r.reason || '', status: r.status, at: Number(r.created_at), child: r.child, fromParent: !!Number(r.from_parent) }));
        const tr = (await all(db, "SELECT r.id, r.reason, COALESCE(r.status, 'new') AS status, r.created_at, c.name AS child FROM tutor_reports r JOIN children c ON c.id = r.child_id WHERE r.user_id = ? ORDER BY r.created_at DESC LIMIT 50", userId))
          .map((r: any) => ({ id: r.id, kind: 'tutor', reason: r.reason || '', status: r.status, at: Number(r.created_at), child: r.child, fromParent: false }));
        return res.json({ reports: [...fb, ...tr].sort((a, b) => b.at - a.at).slice(0, 60) });
      }

      return res.status(400).json({ error: 'Acción no válida' });
    } catch (e: any) {
      console.error('[PADRES]', e?.message);
      return res.status(500).json({ error: 'No se ha podido completar. Inténtalo de nuevo.' });
    }
  });

  // ---------------------------------------------------------------- página privada del equipo
  // Solo existe si ADMIN_TOKEN está configurado. No muestra nombres ni datos de la familia:
  // solo lo que se marcó como erróneo y el motivo.
  const tokenOk = (req: express.Request) => {
    const want = process.env.ADMIN_TOKEN || '';
    if (want.length < 16) return false;
    const got = String(req.query.token || (req.headers.authorization || '').replace(/^Bearer\s+/i, ''));
    const a = Buffer.from(want); const c = Buffer.from(got);
    return a.length === c.length && crypto.timingSafeEqual(a, c);
  };

  app.get('/admin/avisos', async (req, res) => {
    if (!tokenOk(req)) return res.status(404).send('Not found');
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Robots-Tag', 'noindex');
    const fb = await all(db, "SELECT id, kind, reason, snapshot, from_parent, status, created_at FROM ai_feedback ORDER BY (status = 'new') DESC, created_at DESC LIMIT 200");
    const tr = await all(db, "SELECT r.id, r.reason, COALESCE(r.status, 'new') AS status, r.created_at, m.content FROM tutor_reports r JOIN tutor_messages m ON m.id = r.message_id WHERE m.hidden_from_parent = 0 ORDER BY (COALESCE(r.status, 'new') = 'new') DESC, r.created_at DESC LIMIT 200");
    const fmt = (t: any) => new Date(Number(t)).toLocaleString('es-ES', { timeZone: 'Europe/Madrid' });
    const tok = encodeURIComponent(String(req.query.token || ''));
    const btn = (table: string, id: string, status: string) => status === 'new'
      ? `<form method="post" action="/admin/avisos/revisado?token=${tok}"><input type="hidden" name="table" value="${table}"><input type="hidden" name="id" value="${esc(id)}"><button>Marcar revisado</button></form>`
      : '<span class="ok">Revisado</span>';
    const rows = [
      ...fb.map((r: any) => ({ at: Number(r.created_at), html: `<tr class="${r.status}"><td>${fmt(r.created_at)}</td><td>${esc(r.kind)}${Number(r.from_parent) ? ' (padres)' : ''}</td><td>${esc(r.reason || '—')}</td><td><pre>${esc(JSON.stringify(parse(r.snapshot, {}), null, 1)).slice(0, 4000)}</pre></td><td>${btn('ai_feedback', r.id, r.status)}</td></tr>` })),
      ...tr.map((r: any) => ({ at: Number(r.created_at), html: `<tr class="${r.status}"><td>${fmt(r.created_at)}</td><td>tutor</td><td>${esc(r.reason || '—')}</td><td><pre>${esc(String(r.content || '').slice(0, 4000))}</pre></td><td>${btn('tutor_reports', r.id, r.status)}</td></tr>` })),
    ].sort((a, b) => b.at - a.at).map((r) => r.html).join('');
    const pending = fb.filter((r: any) => r.status === 'new').length + tr.filter((r: any) => r.status === 'new').length;
    res.type('html').send(`<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>EduAmigo · Avisos de errores</title>
<style>body{font-family:system-ui,sans-serif;margin:24px;color:#0f172a}table{border-collapse:collapse;width:100%}td,th{border-bottom:1px solid #e2e8f0;padding:8px;vertical-align:top;text-align:left;font-size:14px}pre{white-space:pre-wrap;max-width:640px;margin:0;font-size:12px}tr.new{background:#fffbeb}.ok{color:#16a34a}button{padding:6px 10px}</style></head>
<body><h1>Avisos de errores de la IA</h1><p>${pending} sin revisar. Sin nombres ni datos de las familias.</p>
<table><thead><tr><th>Fecha</th><th>Tipo</th><th>Motivo</th><th>Lo que estaba mal</th><th></th></tr></thead><tbody>${rows || '<tr><td colspan="5">No hay avisos.</td></tr>'}</tbody></table></body></html>`);
  });

  app.post('/admin/avisos/revisado', async (req, res) => {
    if (!tokenOk(req)) return res.status(404).send('Not found');
    const table = String((req.body || {}).table || '');
    const id = String((req.body || {}).id || '');
    if (table === 'ai_feedback') await db.prepare("UPDATE ai_feedback SET status = 'reviewed' WHERE id = ?").run(id);
    else if (table === 'tutor_reports') await db.prepare("UPDATE tutor_reports SET status = 'reviewed' WHERE id = ?").run(id);
    res.redirect(303, `/admin/avisos?token=${encodeURIComponent(String(req.query.token || ''))}`);
  });
}
