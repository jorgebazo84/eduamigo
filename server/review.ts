// Opción 4 — "Repasar": test, repaso espaciado y temarios, todo en el servidor.
//
// - Un único sistema de repaso: todo lo que el niño estudia o en lo que falla crea un tema (review_items).
//   Cada tema vuelve a los 1, 3, 7, 14 y 30 días. Con un 8 o más avanza; si no, vuelve a empezar.
//   Si hay un examen de esa asignatura en la agenda, el repaso se adelanta para que caiga antes.
// - Test con Claude: las preguntas se generan en el servidor y se guardan en un banco por tema; cuando un
//   tema tiene suficientes preguntas, se reutilizan mezcladas (coste casi cero).
// - La nota la calcula el programa (se sabe cuál es la respuesta buena); el niño no recibe las soluciones
//   hasta que entrega el test.
// - Temarios por curso, asignatura y comunidad: se generan una vez y se guardan (no cambian cada día).
import type express from 'express';
import crypto from 'crypto';
import { callClaudeJson, setMockHandler, TUTOR_MODEL, AiUnavailable } from './ai';
import { awardActivity } from './rewards';
import { isFpGrade, parseFpGrade } from '../shared/fpCatalog';
import { FP_OTHER, fpContextLine, moduleSyllabus, officialContents } from '../shared/fpCurriculum';

type Db = any;
export interface ReviewDeps {
  db: Db;
  getSession: (req: express.Request) => Promise<{ tokenHash: string; userId: string; parentUntil: number } | null>;
  isParentUnlocked: (s: { parentUntil: number }) => boolean;
  refreshParentWindow: (tokenHash: string) => Promise<void>;
}

export const INTERVALS = [1, 3, 7, 14, 30];
export const PASS_SCORE = 8; // sobre 10
const DEFAULT_TEST_LIMIT = 10;
const BANK_TARGET = 30; // preguntas por tema a partir de las que se reutiliza el banco
const MAX_DUE_SHOWN = 3;

// -----------------------------------------------------------------------------
// Fechas (día de Madrid)
// -----------------------------------------------------------------------------
export const todayMadrid = (now = Date.now()) =>
  new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Madrid', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(now));
export const addDays = (day: string, n: number) => {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
};
const startOfTodayMadrid = () => {
  const now = new Date();
  const madrid = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Madrid' }));
  const offset = now.getTime() - madrid.getTime();
  madrid.setHours(0, 0, 0, 0);
  return madrid.getTime() + offset;
};

export const normText = (s: string) =>
  String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9ñ ]+/g, ' ').replace(/\s+/g, ' ').trim();
const cleanTopic = (s: any) => String(s || '').replace(/\s+/g, ' ').trim().slice(0, 120);
const cleanSubject = (s: any) => String(s || '').replace(/\s+/g, ' ').trim().slice(0, 100);

const shuffle = <T,>(a: T[]) => {
  const r = [...a];
  for (let i = r.length - 1; i > 0; i--) { const j = crypto.randomInt(i + 1); [r[i], r[j]] = [r[j], r[i]]; }
  return r;
};

// -----------------------------------------------------------------------------
// Tablas
// -----------------------------------------------------------------------------
export async function initReviewTables(db: Db) {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS review_items (
      id VARCHAR(64) PRIMARY KEY,
      user_id VARCHAR(64) NOT NULL,
      child_id VARCHAR(64) NOT NULL,
      subject VARCHAR(80),
      topic VARCHAR(160) NOT NULL,
      topic_key VARCHAR(200) NOT NULL,
      source_type VARCHAR(20),
      source_id VARCHAR(64),
      stage INTEGER DEFAULT 0,
      due_date VARCHAR(10) NOT NULL,
      status VARCHAR(12) DEFAULT 'active',
      last_score FLOAT,
      reviews_count INTEGER DEFAULT 0,
      fails_count INTEGER DEFAULT 0,
      created_at BIGINT NOT NULL,
      updated_at BIGINT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_review_items_child ON review_items (child_id, status, due_date);
    CREATE TABLE IF NOT EXISTS exam_sessions (
      id VARCHAR(64) PRIMARY KEY,
      user_id VARCHAR(64) NOT NULL,
      child_id VARCHAR(64) NOT NULL,
      grade VARCHAR(40),
      subject VARCHAR(80),
      topic VARCHAR(160),
      kind VARCHAR(10) DEFAULT 'test',
      review_item_id VARCHAR(64),
      questions_json TEXT NOT NULL,
      created_at BIGINT NOT NULL,
      finished_at BIGINT,
      score INTEGER,
      total INTEGER,
      explained INTEGER DEFAULT 0
    );
    CREATE INDEX IF NOT EXISTS idx_exam_sessions_child ON exam_sessions (child_id, created_at);
    CREATE TABLE IF NOT EXISTS question_bank (
      id VARCHAR(64) PRIMARY KEY,
      bank_key VARCHAR(300) NOT NULL,
      grade VARCHAR(40),
      subject VARCHAR(80),
      topic VARCHAR(160),
      question TEXT NOT NULL,
      options_json TEXT NOT NULL,
      correct_index INTEGER NOT NULL,
      explanation TEXT,
      subtopic VARCHAR(160),
      created_at BIGINT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_question_bank_key ON question_bank (bank_key);
    CREATE TABLE IF NOT EXISTS syllabus_cache (
      cache_key VARCHAR(300) PRIMARY KEY,
      region VARCHAR(60),
      grade VARCHAR(40),
      subject VARCHAR(80),
      topics_json TEXT NOT NULL,
      created_at BIGINT NOT NULL
    );
  `);
  try { await db.exec('ALTER TABLE children ADD COLUMN exam_daily_limit INTEGER DEFAULT 10'); } catch { /* ya existe */ }
  try { await db.exec('ALTER TABLE exam_results ADD COLUMN review_item_id VARCHAR(64)'); } catch { /* ya existe */ }
  try { await db.exec("ALTER TABLE exam_results ADD COLUMN kind VARCHAR(10) DEFAULT 'test'"); } catch { /* ya existe */ }
}

// -----------------------------------------------------------------------------
// Programación de repasos (lo usan también las fichas, los deberes y los libros)
// -----------------------------------------------------------------------------
/** Si hay un examen de la asignatura en la agenda, el repaso cae como muy tarde el día antes. */
async function adjustForExam(db: Db, childId: string, subject: string, due: string) {
  const today = todayMadrid();
  const subj = normText(subject).slice(0, 6);
  if (!subj) return due;
  const events = await db.prepare("SELECT title, description, date FROM calendar_events WHERE childId = ? AND type = 'exam' AND date >= ? ORDER BY date ASC").all(childId, today);
  for (const ev of events) {
    if (!normText(`${ev.title || ''} ${ev.description || ''}`).includes(subj)) continue;
    const dayBefore = addDays(String(ev.date).slice(0, 10), -1);
    if (dayBefore < due) return dayBefore < today ? today : dayBefore;
    break;
  }
  return due;
}

/**
 * Añade (o actualiza) un tema para repasar.
 * - score < 8 (o sin nota): vuelve mañana (etapa 0).
 * - score >= 8: si es nuevo, vuelve a los 3 días (etapa 1); si ya existía, no se toca.
 */
export async function addReviewTopic(db: Db, p: { userId: string; childId: string; subject: string; topic: string; sourceType: string; sourceId?: string; score?: number | null }) {
  const topic = cleanTopic(p.topic);
  const subject = cleanSubject(p.subject);
  if (!topic || topic.length < 2) return null;
  const key = normText(topic);
  const now = Date.now();
  const today = todayMadrid();
  const failed = p.score === undefined || p.score === null || p.score < PASS_SCORE;
  const existing = await db.prepare("SELECT * FROM review_items WHERE child_id = ? AND topic_key = ? AND status = 'active'").get(p.childId, key);
  if (existing) {
    if (failed && p.score !== undefined && p.score !== null) {
      const due = await adjustForExam(db, p.childId, existing.subject || subject, addDays(today, INTERVALS[0]));
      await db.prepare('UPDATE review_items SET stage = 0, due_date = ?, last_score = ?, updated_at = ? WHERE id = ?').run(due, p.score, now, existing.id);
    }
    return existing.id as string;
  }
  // Un tema ya dominado que vuelve a fallar se reactiva
  const stage = failed ? 0 : 1;
  const due = await adjustForExam(db, p.childId, subject, addDays(today, INTERVALS[stage]));
  const id = crypto.randomUUID();
  await db.prepare(`INSERT INTO review_items (id, user_id, child_id, subject, topic, topic_key, source_type, source_id, stage, due_date, status, last_score, reviews_count, fails_count, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, 0, 0, ?, ?)`)
    .run(id, p.userId, p.childId, subject, topic, key, p.sourceType, p.sourceId || null, stage, due, p.score ?? null, now, now);
  return id;
}

/** Resultado de un repaso: con 8 o más avanza; si no, vuelve a empezar. Tras superar el de 30 días, dominado. */
async function applyReviewResult(db: Db, itemId: string, score10: number) {
  const item = await db.prepare('SELECT * FROM review_items WHERE id = ?').get(itemId);
  if (!item) return null;
  const today = todayMadrid();
  const passed = score10 >= PASS_SCORE;
  let stage = Number(item.stage) || 0;
  let status = 'active';
  if (passed) {
    stage += 1;
    if (stage >= INTERVALS.length) { status = 'mastered'; stage = INTERVALS.length - 1; }
  } else {
    stage = 0;
  }
  const due = status === 'mastered' ? item.due_date : await adjustForExam(db, item.child_id, item.subject, addDays(today, INTERVALS[stage]));
  await db.prepare('UPDATE review_items SET stage = ?, status = ?, due_date = ?, last_score = ?, reviews_count = reviews_count + 1, fails_count = fails_count + ?, updated_at = ? WHERE id = ?')
    .run(stage, status, due, score10, passed ? 0 : 1, Date.now(), itemId);
  return { passed, stage, status, dueDate: due, nextInDays: status === 'mastered' ? null : INTERVALS[stage] };
}

const itemView = (r: any) => ({
  id: r.id, subject: r.subject, topic: r.topic, sourceType: r.source_type, stage: Number(r.stage), dueDate: r.due_date,
  status: r.status, lastScore: r.last_score === null || r.last_score === undefined ? null : Number(r.last_score),
  reviewsCount: Number(r.reviews_count || 0), failsCount: Number(r.fails_count || 0), createdAt: Number(r.created_at),
  struggling: Number(r.fails_count || 0) >= 2,
});

// -----------------------------------------------------------------------------
// IA: temarios, preguntas y comentario de "explícalo con tus palabras"
// -----------------------------------------------------------------------------
const SYSTEM_TEACHER = 'Eres un maestro de Primaria y Secundaria en España que prepara material de repaso para niños. Usas un lenguaje claro y adecuado a la edad, sin datos personales ni enlaces.';

const SYSTEM_FP = 'Eres profesor de Formación Profesional en España y preparas material de repaso para alumnado de FP (adolescentes y adultos). Usas un lenguaje claro y profesional, sin datos personales ni enlaces. Solo escribes contenido correcto y comprobado.';
const systemFor = (grade: string) => (isFpGrade(grade) ? SYSTEM_FP : SYSTEM_TEACHER);

const syllabusPrompt = (region: string, grade: string, subject: string) => {
  const fp = parseFpGrade(grade);
  if (fp) {
    if (subject === FP_OTHER) return `${fpContextLine(grade)}
Lista los módulos profesionales propios de este título (sin los comunes) según su real decreto de enseñanzas mínimas, y para cada uno su contenido en una frase. Si no estás seguro de un módulo, no lo pongas.
Devuelve entre 3 y 10 elementos.
Formato: {"topics":[{"title":"nombre del módulo","description":"una frase"}]}`;
    return `${fpContextLine(grade)}
Lista los bloques de contenidos del módulo «${subject}» según su currículo básico oficial (BOE) en ${region || 'España'}.
Devuelve entre 4 y 12 bloques en el orden habitual. Si no estás seguro de un bloque, no lo pongas.
Formato: {"topics":[{"title":"...","description":"una frase"}]}`;
  }
  return `Lista los temas oficiales (currículo LOMLOE) de ${subject} para ${grade} en ${region || 'España'}.
Devuelve entre 8 y 12 temas en el orden habitual del curso.
Formato: {"topics":[{"title":"...","description":"una frase para el niño"}]}`;
};

/** Para los módulos de FP de Informática: los contenidos oficiales del bloque, para que las preguntas no se salgan */
const officialLine = (grade: string, subject: string, topic: string) => {
  const o = officialContents(grade, subject, topic);
  return o ? `\n- Pregunta SOLO sobre estos contenidos oficiales del bloque «${o.block.title}» (${o.module.source}): ${o.block.contents.join('; ')}.` : '';
};

const questionsPrompt = (grade: string, subject: string, topic: string, count: number, avoid: string[]) =>
  `Crea ${count} preguntas tipo test para un alumno de ${grade}, asignatura ${subject}, tema "${topic}".
Reglas:
- Cada pregunta con 4 opciones distintas y UNA sola correcta, sin "todas las anteriores" ni "ninguna".
- Nivel adecuado a ${grade}; enunciados cortos y claros.${officialLine(grade, subject, topic)}
- "explanation": una o dos frases que expliquen por qué la respuesta correcta lo es.
- "subtopic": el apartado concreto del tema que evalúa (2-5 palabras).
- Variadas: no repitas preguntas parecidas entre sí${avoid.length ? ' ni a estas ya existentes: ' + avoid.slice(0, 25).map(q => `"${q.slice(0, 80)}"`).join('; ') : ''}.
Formato: {"questions":[{"question":"...","options":["...","...","...","..."],"correctIndex":0,"explanation":"...","subtopic":"..."}]}`;

const summaryPrompt = (grade: string, subject: string, topic: string, text: string) =>
  `Un alumno de ${grade} explica con sus palabras lo que ha aprendido del tema "${topic}" (${subject}).
Su texto: """${text.slice(0, 2500)}"""
Valora SOLO el contenido (no la letra ni la persona). Responde en español, hablándole al niño con cariño:
- "praise": qué ha entendido bien (1-2 frases).
- "missing": qué idea importante falta o está confundida (1-2 frases; vacío si nada).
- "tip": un consejo concreto para recordarlo.
- "understood": true si demuestra haber entendido lo esencial.
Formato: {"praise":"...","missing":"...","tip":"...","understood":true}`;

setMockHandler('syllabus', (_s, messages) => {
  const text = String((messages[0]?.content as any) || '');
  const subj = (text.match(/de (.+?) para/) || [])[1] || 'Materia';
  return JSON.stringify({ topics: Array.from({ length: 8 }, (_, i) => ({ title: `Tema simulado ${i + 1} de ${subj}`, description: 'Descripción simulada' })) });
});
let mockQuestionCounter = 0;
setMockHandler('exam_questions', (_s, messages) => {
  const text = String((messages[0]?.content as any) || '');
  const n = Number((text.match(/Crea (\d+) preguntas/) || [])[1]) || 10;
  const topic = (text.match(/tema "([^"]+)"/) || [])[1] || 'tema';
  return JSON.stringify({
    questions: Array.from({ length: n }, () => {
      const k = ++mockQuestionCounter;
      return { question: `Pregunta simulada ${k} sobre ${topic}`, options: [`Correcta ${k}`, `Falsa A ${k}`, `Falsa B ${k}`, `Falsa C ${k}`], correctIndex: 0, explanation: `Explicación ${k}`, subtopic: k % 2 ? 'Apartado uno' : 'Apartado dos' };
    }),
  });
});
setMockHandler('explain_feedback', () => JSON.stringify({ praise: 'Elogio simulado', missing: 'Falta simulada', tip: 'Consejo simulado', understood: true }));

// -----------------------------------------------------------------------------
// Rutas
// -----------------------------------------------------------------------------
export async function registerReviewRoutes(app: express.Express, deps: ReviewDeps) {
  const { db, getSession, isParentUnlocked, refreshParentWindow } = deps;
  await initReviewTables(db);

  const ownChild = (userId: string, childId: string) =>
    db.prepare('SELECT id, name, grade, points, exam_daily_limit FROM children WHERE id = ? AND parentId = ?').get(childId, userId);
  const testLimit = (child: any) => { const n = Number(child?.exam_daily_limit); return Number.isFinite(n) && n > 0 ? n : DEFAULT_TEST_LIMIT; };
  const testsToday = async (childId: string) =>
    Number((await db.prepare('SELECT COUNT(*) AS n FROM exam_sessions WHERE child_id = ? AND created_at >= ?').get(childId, startOfTodayMadrid()))?.n || 0);

  const getSyllabus = async (region: string, grade: string, subject: string) => {
    // Módulos de FP de Informática: temario oficial fijo, sin IA
    const official = moduleSyllabus(grade, subject);
    if (official) return official;
    const key = `${normText(region)}|${normText(grade)}|${normText(subject)}`;
    const row = await db.prepare('SELECT topics_json FROM syllabus_cache WHERE cache_key = ?').get(key);
    if (row) return JSON.parse(row.topics_json);
    const { data } = await callClaudeJson<any>({ system: systemFor(grade), prompt: syllabusPrompt(region, grade, subject), model: TUTOR_MODEL(), maxTokens: 1500, task: 'syllabus' });
    const topics = (Array.isArray(data?.topics) ? data.topics : [])
      .map((t: any, i: number) => ({ id: `t${i + 1}`, title: cleanTopic(t.title), description: String(t.description || '').slice(0, 200), subtopics: [] }))
      .filter((t: any) => t.title).slice(0, 14);
    if (topics.length < 3) throw new Error('Temario vacío');
    await db.prepare('INSERT OR REPLACE INTO syllabus_cache (cache_key, region, grade, subject, topics_json, created_at) VALUES (?, ?, ?, ?, ?, ?)')
      .run(key, region, grade, subject, JSON.stringify(topics), Date.now());
    return topics;
  };

  /** Preguntas para un test: del banco si hay bastantes; si no, nuevas de la IA (que se guardan en el banco). */
  const pickQuestions = async (grade: string, subject: string, topic: string, count: number, childId: string) => {
    const bankKey = `${normText(grade)}|${normText(subject)}|${normText(topic)}`;
    const bank = await db.prepare('SELECT * FROM question_bank WHERE bank_key = ?').all(bankKey);
    if (bank.length < BANK_TARGET) {
      const need = Math.min(15, Math.max(count, BANK_TARGET - bank.length));
      const { data } = await callClaudeJson<any>({
        system: systemFor(grade), prompt: questionsPrompt(grade, subject, topic, need, bank.map((q: any) => q.question)),
        model: TUTOR_MODEL(), maxTokens: 4000, task: 'exam_questions',
      });
      const raw = Array.isArray(data?.questions) ? data.questions : [];
      const now = Date.now();
      for (const q of raw) {
        const options = Array.isArray(q.options) ? q.options.map((o: any) => String(o).slice(0, 200).trim()) : [];
        const ci = Number(q.correctIndex);
        if (!q.question || options.length !== 4 || new Set(options.map(normText)).size !== 4 || !Number.isInteger(ci) || ci < 0 || ci > 3) continue;
        const row = { id: crypto.randomUUID(), bank_key: bankKey, grade, subject, topic, question: String(q.question).slice(0, 500), options_json: JSON.stringify(options), correct_index: ci, explanation: String(q.explanation || '').slice(0, 500), subtopic: cleanTopic(q.subtopic || topic), created_at: now };
        await db.prepare('INSERT INTO question_bank (id, bank_key, grade, subject, topic, question, options_json, correct_index, explanation, subtopic, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
          .run(row.id, row.bank_key, row.grade, row.subject, row.topic, row.question, row.options_json, row.correct_index, row.explanation, row.subtopic, row.created_at);
        bank.push(row);
      }
    }
    if (bank.length < Math.min(count, 3)) throw new Error('No hay preguntas válidas');
    // Evita repetir las de los dos últimos tests de este niño sobre el mismo tema, si hay de sobra
    const recent = await db.prepare('SELECT questions_json FROM exam_sessions WHERE child_id = ? AND topic = ? ORDER BY created_at DESC LIMIT 2').all(childId, topic);
    const recentIds = new Set<string>(recent.flatMap((r: any) => JSON.parse(r.questions_json).map((q: any) => q.bankId)));
    const fresh = bank.filter((q: any) => !recentIds.has(q.id));
    const pool = fresh.length >= count ? fresh : bank;
    return shuffle(pool).slice(0, count).map((q: any) => {
      // Se barajan también las opciones para que la buena no esté siempre en el mismo sitio
      const opts = JSON.parse(q.options_json).map((text: string, i: number) => ({ text, ok: i === Number(q.correct_index) }));
      const mixed = shuffle(opts);
      return { id: crypto.randomUUID(), bankId: q.id, question: q.question, options: mixed.map((o: any) => o.text), correctIndex: mixed.findIndex((o: any) => o.ok), explanation: q.explanation, subtopic: q.subtopic };
    });
  };

  // Demo / sin cuenta: test de ejemplo sin IA (lo usa el cliente directamente; aquí solo como referencia).

  app.post('/api_review.php', async (req, res) => {
    const action = String(req.query.action || '');
    const b = req.body || {};
    try {
      const session = await getSession(req);
      if (!session) return res.status(401).json({ error: 'Sesión no válida. Vuelve a iniciar sesión.', code: 'AUTH_REQUIRED' });
      const userId = session.userId;
      const parent = isParentUnlocked(session);
      const PARENT_ONLY = new Set(['parent_overview', 'set_limit', 'archive_item']);
      if (PARENT_ONLY.has(action)) {
        if (!parent) return res.status(403).json({ error: 'Esta acción necesita el PIN de padres.', code: 'PIN_REQUIRED' });
        await refreshParentWindow(session.tokenHash);
      }
      const child = b.childId ? await ownChild(userId, String(b.childId)) : null;
      if (!child) return res.status(404).json({ error: 'Perfil no encontrado' });

      // ------------------------------------------------------------ hoy toca repasar
      if (action === 'today') {
        const today = todayMadrid();
        const due = await db.prepare("SELECT * FROM review_items WHERE child_id = ? AND status = 'active' AND due_date <= ? ORDER BY due_date ASC, fails_count DESC, created_at ASC").all(child.id, today);
        const upcoming = await db.prepare("SELECT * FROM review_items WHERE child_id = ? AND status = 'active' AND due_date > ? ORDER BY due_date ASC LIMIT 20").all(child.id, today);
        const mastered = Number((await db.prepare("SELECT COUNT(*) AS n FROM review_items WHERE child_id = ? AND status = 'mastered'").get(child.id))?.n || 0);
        return res.json({
          today, due: due.slice(0, MAX_DUE_SHOWN).map(itemView), dueTotal: due.length, upcoming: upcoming.map(itemView), mastered,
          usage: { used: await testsToday(child.id), limit: testLimit(child) },
        });
      }

      // ------------------------------------------------------------ temario
      if (action === 'syllabus') {
        const grade = String(b.grade || child.grade || '').slice(0, 120);
        const subject = cleanSubject(b.subject);
        if (!subject) return res.status(400).json({ error: 'Falta la asignatura' });
        try {
          return res.json({ topics: await getSyllabus(String(b.region || 'España').slice(0, 60), grade, subject) });
        } catch (e) {
          console.error('[REPASO] temario:', (e as any)?.message);
          return res.status(503).json({ error: 'No se ha podido preparar el temario ahora mismo. Inténtalo en un rato o escribe tú el tema.', code: 'AI_UNAVAILABLE' });
        }
      }

      // ------------------------------------------------------------ empezar test (o repaso)
      if (action === 'start_test') {
        const used = await testsToday(child.id);
        const limit = testLimit(child);
        if (used >= limit) return res.status(429).json({ error: `Hoy ya has hecho ${limit} tests. ¡Mañana más! Si necesitas más, pídeselo a tus padres.`, code: 'DAILY_LIMIT', used, limit });
        let item: any = null;
        if (b.reviewItemId) {
          item = await db.prepare("SELECT * FROM review_items WHERE id = ? AND child_id = ? AND status = 'active'").get(String(b.reviewItemId), child.id);
          if (!item) return res.status(404).json({ error: 'Ese repaso ya no está pendiente.' });
        }
        const subject = cleanSubject(item?.subject || b.subject);
        const topic = cleanTopic(item?.topic || b.topic);
        const grade = String(b.grade || child.grade || '').slice(0, 120);
        if (!subject || !topic) return res.status(400).json({ error: 'Elige asignatura y tema.' });
        const count = item ? 5 : Math.min(10, Math.max(5, Number(b.count) || 10));
        let questions;
        try {
          questions = await pickQuestions(grade, subject, topic, count, child.id);
        } catch (e) {
          console.error('[REPASO] preguntas:', (e as any)?.message);
          return res.status(503).json({ error: 'No se ha podido preparar el test ahora mismo. Inténtalo en un rato.', code: 'AI_UNAVAILABLE' });
        }
        const id = crypto.randomUUID();
        await db.prepare('INSERT INTO exam_sessions (id, user_id, child_id, grade, subject, topic, kind, review_item_id, questions_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
          .run(id, userId, child.id, grade, subject, topic, item ? 'review' : 'test', item?.id || null, JSON.stringify(questions), Date.now());
        return res.json({
          sessionId: id, subject, topic, grade, kind: item ? 'review' : 'test',
          // Sin la respuesta buena ni la explicación: llegan al entregar
          questions: questions.map((q: any) => ({ id: q.id, question: q.question, options: q.options })),
          used: used + 1, limit,
        });
      }

      // ------------------------------------------------------------ entregar test
      if (action === 'submit_test') {
        const s = await db.prepare('SELECT * FROM exam_sessions WHERE id = ? AND child_id = ?').get(String(b.sessionId || ''), child.id);
        if (!s) return res.status(404).json({ error: 'No encuentro ese test.' });
        if (s.finished_at) return res.status(409).json({ error: 'Este test ya está entregado.' });
        const questions = JSON.parse(s.questions_json);
        const answers: any[] = Array.isArray(b.answers) ? b.answers : [];
        const detail = questions.map((q: any, i: number) => {
          const chosen = Number.isInteger(Number(answers[i])) ? Number(answers[i]) : -1;
          return { id: q.id, question: q.question, options: q.options, chosen, correctIndex: q.correctIndex, correct: chosen === q.correctIndex, explanation: q.explanation, subtopic: q.subtopic };
        });
        const correct = detail.filter((d: any) => d.correct).length;
        const total = detail.length;
        const score10 = Math.round((correct / Math.max(1, total)) * 100) / 10;
        // Puntos fuertes y a reforzar: por apartados (no los decide la IA)
        const bySub = new Map<string, { ok: number; ko: number }>();
        detail.forEach((d: any) => { const k = d.subtopic || s.topic; const v = bySub.get(k) || { ok: 0, ko: 0 }; d.correct ? v.ok++ : v.ko++; bySub.set(k, v); });
        const strengths = [...bySub].filter(([, v]) => v.ko === 0).map(([k]) => k);
        const weaknesses = [...bySub].filter(([, v]) => v.ko > 0).map(([k]) => k);
        const points = correct * 10 + (correct === total ? 50 : 0);
        const duration = Math.max(0, Math.round((Date.now() - Number(s.created_at)) / 1000));
        await db.prepare('UPDATE exam_sessions SET finished_at = ?, score = ?, total = ? WHERE id = ?').run(Date.now(), correct, total, s.id);
        const resultId = crypto.randomUUID();
        await db.prepare('INSERT INTO exam_results (id, childId, grade, subject, topic, score, totalQuestions, strengths, weaknesses, studyGuideContent, pointsEarned, timestamp, duration, review_item_id, kind) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
          .run(resultId, child.id, s.grade, s.subject, s.topic, correct, total, JSON.stringify(strengths), JSON.stringify(weaknesses), '', points, Date.now(), duration, s.review_item_id || null, s.kind);
        const { newPoints } = await awardActivity(db, { userId, childId: child.id, points, source: 'review', label: `Test: ${s.topic} (${correct}/${total})`, refId: s.id });
        let review = null;
        if (s.review_item_id) review = await applyReviewResult(db, s.review_item_id, score10);
        else await addReviewTopic(db, { userId, childId: child.id, subject: s.subject, topic: s.topic, sourceType: 'test', sourceId: resultId, score: score10 });
        const explainOffered = s.kind === 'review' ? true : score10 >= 5;
        return res.json({
          result: { id: resultId, childId: child.id, grade: s.grade, subject: s.subject, topic: s.topic, score: correct, totalQuestions: total, score10, strengths, weaknesses, studyGuideContent: '', timestamp: Date.now(), pointsEarned: points, duration, kind: s.kind },
          detail, review, newPoints, explainOffered, sessionId: s.id,
        });
      }

      // ------------------------------------------------------------ explícalo con tus palabras
      if (action === 'explain') {
        const text = String(b.text || '').trim();
        if (text.length < 20) return res.status(400).json({ error: '¡Escribe un poquito más! Cuéntalo con dos o tres frases.' });
        let subject = cleanSubject(b.subject), topic = cleanTopic(b.topic);
        if (b.sessionId) {
          const s = await db.prepare('SELECT * FROM exam_sessions WHERE id = ? AND child_id = ?').get(String(b.sessionId), child.id);
          if (!s) return res.status(404).json({ error: 'No encuentro ese test.' });
          if (Number(s.explained)) return res.status(409).json({ error: 'Ya me lo has explicado en este repaso. ¡Gracias!' });
          subject = s.subject; topic = s.topic;
          await db.prepare('UPDATE exam_sessions SET explained = 1 WHERE id = ?').run(s.id);
        }
        if (!topic) return res.status(400).json({ error: 'Falta el tema.' });
        try {
          const { data } = await callClaudeJson<any>({ system: SYSTEM_TEACHER, prompt: summaryPrompt(String(child.grade || ''), subject, topic, text), model: TUTOR_MODEL(), maxTokens: 600, task: 'explain_feedback' });
          return res.json({ feedback: { praise: String(data?.praise || ''), missing: String(data?.missing || ''), tip: String(data?.tip || ''), understood: !!data?.understood } });
        } catch (e) {
          if (b.sessionId) await db.prepare('UPDATE exam_sessions SET explained = 0 WHERE id = ?').run(String(b.sessionId));
          console.error('[REPASO] explicación:', (e as any)?.message);
          return res.status(503).json({ error: 'Ahora mismo no puedo leer tu explicación. Inténtalo en un rato.', code: 'AI_UNAVAILABLE' });
        }
      }

      // ------------------------------------------------------------ añadir un tema desde otro módulo (p. ej. Mates)
      if (action === 'add_topic') {
        const score = b.score === undefined || b.score === null ? null : Math.max(0, Math.min(10, Number(b.score)));
        const id = await addReviewTopic(db, { userId, childId: child.id, subject: cleanSubject(b.subject), topic: cleanTopic(b.topic), sourceType: String(b.sourceType || 'module').slice(0, 20), sourceId: b.sourceId ? String(b.sourceId).slice(0, 64) : undefined, score });
        if (!id) return res.status(400).json({ error: 'Falta el tema.' });
        return res.json({ status: 'success', id });
      }

      // ------------------------------------------------------------ lo que he estudiado hoy (libros)
      if (action === 'studied_today') {
        const book = await db.prepare('SELECT * FROM books WHERE id = ? AND userId = ? AND childId = ?').get(String(b.bookId || ''), userId, child.id);
        if (!book) return res.status(404).json({ error: 'No encuentro ese libro.' });
        const topics: string[] = typeof book.topics === 'string' ? JSON.parse(book.topics || '[]') : (book.topics || []);
        const idx: number[] = (Array.isArray(b.topicIndices) ? b.topicIndices : []).map(Number).filter((i: number) => Number.isInteger(i) && i >= 0 && i < topics.length);
        if (!idx.length) return res.status(400).json({ error: 'Marca al menos un tema.' });
        const ids = [];
        for (const i of [...new Set(idx)].slice(0, 10)) {
          ids.push(await addReviewTopic(db, { userId, childId: child.id, subject: book.subject, topic: topics[i], sourceType: 'studied', sourceId: book.id }));
        }
        return res.json({ status: 'success', added: ids.filter(Boolean).length });
      }

      // ------------------------------------------------------------ padres
      if (action === 'parent_overview') {
        const today = todayMadrid();
        const items = await db.prepare("SELECT * FROM review_items WHERE child_id = ? AND status IN ('active', 'mastered') ORDER BY due_date ASC").all(child.id);
        const tests = await db.prepare('SELECT * FROM exam_results WHERE childId = ? ORDER BY timestamp DESC LIMIT 30').all(child.id);
        const active = items.filter((i: any) => i.status === 'active');
        return res.json({
          today,
          week: active.filter((i: any) => i.due_date <= addDays(today, 7)).map(itemView),
          later: active.filter((i: any) => i.due_date > addDays(today, 7)).map(itemView),
          struggling: active.filter((i: any) => Number(i.fails_count) >= 2).map(itemView),
          mastered: items.filter((i: any) => i.status === 'mastered').map(itemView),
          overdue: active.filter((i: any) => i.due_date < today).length,
          tests: tests.map((t: any) => ({
            id: t.id, subject: t.subject, topic: t.topic, score: Number(t.score), totalQuestions: Number(t.totalQuestions), timestamp: Number(t.timestamp), kind: t.kind || 'test',
            strengths: JSON.parse(t.strengths || '[]'), weaknesses: JSON.parse(t.weaknesses || '[]'),
          })),
          settings: { testDailyLimit: testLimit(child) },
          usage: { used: await testsToday(child.id), limit: testLimit(child) },
        });
      }
      if (action === 'set_limit') {
        const n = Math.round(Number(b.limit));
        if (!Number.isFinite(n) || n < 1 || n > 50) return res.status(400).json({ error: 'El límite debe estar entre 1 y 50 tests al día.' });
        await db.prepare('UPDATE children SET exam_daily_limit = ? WHERE id = ?').run(n, child.id);
        return res.json({ status: 'success' });
      }
      if (action === 'archive_item') {
        const r = await db.prepare("UPDATE review_items SET status = 'archived', updated_at = ? WHERE id = ? AND child_id = ?").run(Date.now(), String(b.itemId || ''), child.id);
        if (!r.changes) return res.status(404).json({ error: 'No encuentro ese tema.' });
        return res.json({ status: 'success' });
      }

      return res.status(400).json({ error: 'Acción no válida' });
    } catch (e: any) {
      console.error('[REPASO]', e);
      return res.status(e instanceof AiUnavailable ? 503 : 500).json({ error: 'Algo ha fallado. Inténtalo de nuevo.' });
    }
  });
}
