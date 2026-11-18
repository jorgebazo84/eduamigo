// Opción 9 — Inglés en el servidor (Claude). Sustituye a Gemini en el navegador.
// - Prueba de nivel con banco fijo: nivel = el más alto aprobado con todos los anteriores aprobados.
// - Lecciones por nivel y tema generadas una vez y reutilizadas por todas las familias.
// - Las respuestas tipo test las corrige el programa; la redacción, Claude.
// - Puntos: 10 por lección + 3 por acierto + 10 si la redacción llega a 5; máximo 80 al día.
// - Sube de nivel tras 5 lecciones de su nivel con 80 % de aciertos y redacción media de 6.
import type express from 'express';
import crypto from 'crypto';
import { callClaudeJson, setMockHandler, AiUnavailable } from './ai';
import { awardActivity, earnedToday, startOfTodayMadrid } from './rewards';
import { PLACEMENT_BANK, ENGLISH_LEVELS, EnglishLevel, placementLevel, defaultLevelForGrade, LESSON_THEMES, LEVEL_LABEL } from '../shared/englishBank';

type Db = any;
export interface EnglishDeps {
  db: Db;
  getSession: (req: express.Request) => Promise<{ tokenHash: string; userId: string; parentUntil: number } | null>;
  isParentUnlocked: (s: { parentUntil: number }) => boolean;
  refreshParentWindow: (tokenHash: string) => Promise<void>;
}

export const ENGLISH_POINTS_CAP = 80;
const LESSONS_PER_DAY = 4;
const PLACEMENTS_PER_DAY = 2;
const PROMOTE_AFTER = 5;

const shuffle = <T,>(a: T[]) => { const r = [...a]; for (let i = r.length - 1; i > 0; i--) { const j = crypto.randomInt(i + 1); [r[i], r[j]] = [r[j], r[i]]; } return r; };
const parse = (s: any, d: any) => { try { return JSON.parse(s); } catch { return d; } };
const words = (t: string) => String(t || '').trim().split(/\s+/).filter(Boolean).length;

const LEVEL_GUIDE: Record<EnglishLevel, string> = {
  'Pre-A1': 'very simple words and short sentences (3–6 words), present simple of be/have, colours, numbers, animals; reading text 40–60 words',
  A1: 'simple present and present continuous, can, there is/are, basic adjectives and comparatives; reading text 70–100 words',
  A2: 'past simple, going to, will, present perfect basics, superlatives, must/have to; reading text 110–150 words',
  B1: 'past perfect, first and second conditional, relative clauses, reported speech basics, used to; reading text 160–200 words',
  B2: 'third conditional, wish, passive forms, inversion basics, gerund/infinitive; reading text 200–260 words',
};

export async function initEnglishTables(db: Db) {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS english_lessons (
      id VARCHAR(64) PRIMARY KEY,
      level VARCHAR(8) NOT NULL,
      theme VARCHAR(60) NOT NULL,
      data TEXT NOT NULL,
      created_at BIGINT NOT NULL
    );
    CREATE UNIQUE INDEX IF NOT EXISTS idx_english_lessons_level_theme ON english_lessons (level, theme);
    CREATE TABLE IF NOT EXISTS english_attempts (
      id VARCHAR(64) PRIMARY KEY,
      user_id VARCHAR(64) NOT NULL,
      child_id VARCHAR(64) NOT NULL,
      lesson_id VARCHAR(64) NOT NULL,
      level VARCHAR(8) NOT NULL,
      title VARCHAR(160),
      mc_correct INTEGER,
      mc_total INTEGER,
      writing_text TEXT,
      writing_score REAL,
      writing_json TEXT,
      points INTEGER DEFAULT 0,
      created_at BIGINT NOT NULL,
      finished_at BIGINT
    );
    CREATE INDEX IF NOT EXISTS idx_english_attempts_child ON english_attempts (child_id, created_at);
    CREATE TABLE IF NOT EXISTS english_placements (
      id VARCHAR(64) PRIMARY KEY,
      child_id VARCHAR(64) NOT NULL,
      question_ids TEXT NOT NULL,
      level VARCHAR(8),
      detail TEXT,
      created_at BIGINT NOT NULL,
      finished_at BIGINT
    );
    CREATE TABLE IF NOT EXISTS english_state (
      child_id VARCHAR(64) PRIMARY KEY,
      level VARCHAR(8) NOT NULL,
      placed INTEGER DEFAULT 0,
      set_by VARCHAR(12),
      updated_at BIGINT NOT NULL
    );
  `);
}

// ---------------------------------------------------------------- validación de lo que genera la IA
const isMc = (x: any) => x && typeof x.q === 'string' && Array.isArray(x.options) && x.options.length === 4 && x.options.every((o: any) => typeof o === 'string' && o.trim())
  && Number.isInteger(x.correct) && x.correct >= 0 && x.correct < 4 && new Set(x.options.map((o: string) => o.trim().toLowerCase())).size === 4;

export function validateLesson(d: any) {
  if (!d || typeof d.title !== 'string' || !d.title.trim()) throw new Error('Lección sin título');
  if (!Array.isArray(d.vocabulary) || d.vocabulary.length < 4) throw new Error('Vocabulario incompleto');
  d.vocabulary = d.vocabulary.slice(0, 8).filter((v: any) => v && v.en && v.es).map((v: any) => ({ en: String(v.en).slice(0, 60), es: String(v.es).slice(0, 60), example: String(v.example || '').slice(0, 160) }));
  if (!d.grammar || !d.grammar.title || !d.grammar.explanation) throw new Error('Gramática incompleta');
  d.grammar = { title: String(d.grammar.title).slice(0, 80), explanation: String(d.grammar.explanation).slice(0, 700), examples: (d.grammar.examples || []).slice(0, 4).map((e: any) => String(e).slice(0, 160)) };
  if (!d.reading || typeof d.reading.text !== 'string' || words(d.reading.text) < 25) throw new Error('Lectura demasiado corta');
  if (!Array.isArray(d.reading.questions) || d.reading.questions.length < 3 || !d.reading.questions.every(isMc)) throw new Error('Preguntas de lectura no válidas');
  if (!d.listening || typeof d.listening.text !== 'string' || words(d.listening.text) < 10) throw new Error('Audición no válida');
  if (!Array.isArray(d.listening.questions) || d.listening.questions.length < 2 || !d.listening.questions.every(isMc)) throw new Error('Preguntas de audición no válidas');
  if (!d.writing || !d.writing.prompt) throw new Error('Falta la redacción');
  d.reading.questions = d.reading.questions.slice(0, 4);
  d.listening.questions = d.listening.questions.slice(0, 3);
  d.writing = { prompt: String(d.writing.prompt).slice(0, 300), promptEs: String(d.writing.promptEs || '').slice(0, 300), minWords: Math.max(5, Math.min(120, Number(d.writing.minWords) || 20)) };
  d.phrases = (Array.isArray(d.phrases) ? d.phrases : []).slice(0, 5).map((p: any) => String(p).slice(0, 120));
  return d;
}

setMockHandler('english_lesson', (_s, m) => {
  const txt = JSON.stringify(m);
  const theme = (txt.match(/Theme: ([a-z ]+)/) || [])[1] || 'animals';
  const mc = (n: number) => Array.from({ length: n }, (_, i) => ({ q: `Mock question ${i + 1} about ${theme}?`, options: ['Right answer', 'Wrong A', 'Wrong B', 'Wrong C'], correct: 0 }));
  return JSON.stringify({
    title: `Mock lesson: ${theme}`,
    vocabulary: ['cat', 'dog', 'bird', 'fish', 'horse', 'rabbit'].map((w) => ({ en: w, es: `es-${w}`, example: `I like the ${w}.` })),
    grammar: { title: 'Present simple', explanation: 'Usamos el presente simple para hablar de rutinas.', examples: ['I play football.', 'She plays tennis.'] },
    reading: { text: 'This is a mock reading text about animals. Tom has a cat and a dog. The cat is black and the dog is brown. They play in the garden every day after school.', questions: mc(4) },
    listening: { text: 'Hello, my name is Sam and I have a big red bike.', questions: mc(3) },
    writing: { prompt: 'Write about your favourite animal.', promptEs: 'Escribe sobre tu animal favorito.', minWords: 15 },
    phrases: ['I have a cat.', 'My dog is brown.'],
  });
});
setMockHandler('english_writing', (_s, m) => {
  const t = JSON.stringify(m);
  const short = t.includes('flojo');
  return JSON.stringify({ score: short ? 3 : 7, feedback: 'Buen trabajo: se entiende lo que quieres decir.', corrections: [{ original: 'I has', correction: 'I have', explanation: 'Con "I" se usa "have".' }], nextStep: 'Practica los verbos con "I".' });
});

export async function registerEnglishRoutes(app: express.Express, deps: EnglishDeps) {
  const { db, getSession, isParentUnlocked, refreshParentWindow } = deps;
  await initEnglishTables(db);
  const ownChild = (userId: string, childId: string) => db.prepare('SELECT id, name, grade FROM children WHERE id = ? AND parentId = ?').get(String(childId || ''), userId);

  const getState = async (child: any) => {
    const st = await db.prepare('SELECT * FROM english_state WHERE child_id = ?').get(child.id);
    if (st) return { level: st.level as EnglishLevel, placed: !!Number(st.placed), setBy: st.set_by };
    return { level: defaultLevelForGrade(child.grade), placed: false, setBy: null };
  };
  const setLevel = async (childId: string, level: EnglishLevel, setBy: string, placed = true) => {
    const ex = await db.prepare('SELECT child_id FROM english_state WHERE child_id = ?').get(childId);
    if (ex) await db.prepare('UPDATE english_state SET level = ?, placed = ?, set_by = ?, updated_at = ? WHERE child_id = ?').run(level, placed ? 1 : 0, setBy, Date.now(), childId);
    else await db.prepare('INSERT INTO english_state (child_id, level, placed, set_by, updated_at) VALUES (?, ?, ?, ?, ?)').run(childId, level, placed ? 1 : 0, setBy, Date.now());
  };

  /** Lección del nivel y tema: primero la guardada; si no hay, la genera Claude una sola vez */
  const lessonFor = async (level: EnglishLevel, theme: string) => {
    const row = await db.prepare('SELECT * FROM english_lessons WHERE level = ? AND theme = ?').get(level, theme);
    if (row) return { id: row.id, theme, data: parse(row.data, null) };
    const { data } = await callClaudeJson({
      task: 'english_lesson',
      maxTokens: 3000,
      system: 'You write short, friendly English lessons for Spanish children and teenagers learning English as a foreign language. Content must be age-appropriate, accurate and free of brand names. Explanations for the learner (grammar explanation, writing promptEs, vocabulary "es") are in Spanish from Spain; everything else is in English.',
      prompt: `Level: ${level} (${LEVEL_GUIDE[level]}). Theme: ${theme}.
Return JSON with exactly this shape:
{"title": "...", "vocabulary": [{"en": "word", "es": "traducción", "example": "short English sentence"}] (6 items),
 "grammar": {"title": "...", "explanation": "explicación breve en español", "examples": ["...", "..."]},
 "reading": {"text": "...", "questions": [{"q": "...", "options": ["a","b","c","d"], "correct": 0}] (4 questions)},
 "listening": {"text": "a short monologue or dialogue to be read aloud by a voice", "questions": [3 questions, same format]},
 "writing": {"prompt": "task in English", "promptEs": "la misma tarea en español", "minWords": number},
 "phrases": ["3 useful sentences to listen to and repeat"]}
Every question must have exactly one correct option, answerable from the text. Vary the position of the correct option.`,
    });
    const lesson = validateLesson(data);
    const id = crypto.randomUUID();
    try {
      await db.prepare('INSERT INTO english_lessons (id, level, theme, data, created_at) VALUES (?, ?, ?, ?, ?)').run(id, level, theme, JSON.stringify(lesson), Date.now());
    } catch {
      const again = await db.prepare('SELECT * FROM english_lessons WHERE level = ? AND theme = ?').get(level, theme);
      if (again) return { id: again.id, theme, data: parse(again.data, null) };
    }
    return { id, theme, data: lesson };
  };

  const startedToday = async (childId: string) =>
    Number((await db.prepare('SELECT COUNT(*) AS n FROM english_attempts WHERE child_id = ? AND created_at >= ?').get(childId, startOfTodayMadrid()))?.n || 0);

  const PARENT_ACTIONS = new Set(['parent_stats', 'set_level']);

  app.post('/api_english.php', async (req, res) => {
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
      const child = await ownChild(userId, b.childId);
      if (!child) return res.status(404).json({ error: 'Perfil no encontrado' });

      // ------------------------------------------------ estado
      if (action === 'state') {
        const st = await getState(child);
        const done = await db.prepare('SELECT COUNT(*) AS n, AVG(mc_correct * 1.0 / mc_total) AS acc FROM english_attempts WHERE child_id = ? AND level = ? AND finished_at IS NOT NULL').get(child.id, st.level);
        return res.json({
          level: st.level, levelLabel: LEVEL_LABEL[st.level], placed: st.placed,
          lessonsAtLevel: Number(done?.n || 0), promoteAfter: PROMOTE_AFTER,
          pointsToday: await earnedToday(db, child.id, 'english'), pointsCap: ENGLISH_POINTS_CAP,
          lessonsToday: await startedToday(child.id), lessonsPerDay: LESSONS_PER_DAY,
        });
      }

      // ------------------------------------------------ prueba de nivel
      if (action === 'placement_start') {
        const n = Number((await db.prepare('SELECT COUNT(*) AS n FROM english_placements WHERE child_id = ? AND created_at >= ?').get(child.id, startOfTodayMadrid()))?.n || 0);
        if (n >= PLACEMENTS_PER_DAY) return res.status(429).json({ error: 'Hoy ya has hecho la prueba de nivel. Mañana puedes repetirla.', code: 'DAILY_LIMIT' });
        const qs = ENGLISH_LEVELS.flatMap((l) => PLACEMENT_BANK.filter((x) => x.level === l));
        const order = qs.map((x) => ({ id: x.id, perm: shuffle([0, 1, 2, 3]) }));
        const id = crypto.randomUUID();
        await db.prepare('INSERT INTO english_placements (id, child_id, question_ids, created_at) VALUES (?, ?, ?, ?)').run(id, child.id, JSON.stringify(order), Date.now());
        const byId = new Map(PLACEMENT_BANK.map((x) => [x.id, x]));
        return res.json({
          placementId: id,
          questions: order.map((o) => { const x = byId.get(o.id)!; return { id: x.id, question: x.question, options: o.perm.map((i) => x.options[i]) }; }),
        });
      }
      if (action === 'placement_submit') {
        const p = await db.prepare('SELECT * FROM english_placements WHERE id = ? AND child_id = ? AND finished_at IS NULL').get(String(b.placementId || ''), child.id);
        if (!p) return res.status(404).json({ error: 'No encuentro esa prueba.' });
        const order: { id: string; perm: number[] }[] = parse(p.question_ids, []);
        const answers: any[] = Array.isArray(b.answers) ? b.answers : [];
        const byId = new Map(PLACEMENT_BANK.map((x) => [x.id, x]));
        const correctByLevel = Object.fromEntries(ENGLISH_LEVELS.map((l) => [l, 0])) as Record<EnglishLevel, number>;
        order.forEach((o, i) => {
          const x = byId.get(o.id); const a = Number(answers[i]);
          if (x && Number.isInteger(a) && a >= 0 && a < 4 && o.perm[a] === x.correct) correctByLevel[x.level]++;
        });
        const level = placementLevel(correctByLevel);
        await db.prepare('UPDATE english_placements SET level = ?, detail = ?, finished_at = ? WHERE id = ?').run(level, JSON.stringify(correctByLevel), Date.now(), p.id);
        await setLevel(child.id, level, 'placement');
        return res.json({ level, levelLabel: LEVEL_LABEL[level], correctByLevel });
      }

      // ------------------------------------------------ lección
      if (action === 'lesson_start') {
        const used = await startedToday(child.id);
        if (used >= LESSONS_PER_DAY) return res.status(429).json({ error: `Hoy ya has hecho ${LESSONS_PER_DAY} lecciones. ¡Mañana más!`, code: 'DAILY_LIMIT' });
        const st = await getState(child);
        // Siguiente tema que no ha hecho en este nivel (y si los ha hecho todos, el menos reciente)
        const doneRows = await db.prepare('SELECT l.theme, MAX(a.created_at) AS t FROM english_attempts a JOIN english_lessons l ON l.id = a.lesson_id WHERE a.child_id = ? AND a.level = ? GROUP BY l.theme').all(child.id, st.level);
        const doneMap = new Map(doneRows.map((r: any) => [r.theme, Number(r.t)]));
        const theme = LESSON_THEMES.find((t) => !doneMap.has(t)) || [...LESSON_THEMES].sort((a, z) => Number(doneMap.get(a) || 0) - Number(doneMap.get(z) || 0))[0];
        let lesson;
        try { lesson = await lessonFor(st.level, theme); } catch (e: any) {
          console.error('[INGLÉS] lección:', e?.message);
          return res.status(503).json({ error: 'No se ha podido preparar la lección ahora mismo. Inténtalo en un rato.', code: 'AI_UNAVAILABLE' });
        }
        const L = lesson.data;
        // Se barajan las opciones y se guardan las respuestas buenas en el servidor
        const prep = (qs: any[]) => qs.map((x: any) => { const perm = shuffle([0, 1, 2, 3]); return { q: x.q, options: perm.map((i) => x.options[i]), correct: perm.indexOf(x.correct) }; });
        const reading = prep(L.reading.questions); const listening = prep(L.listening.questions);
        const id = crypto.randomUUID();
        await db.prepare('INSERT INTO english_attempts (id, user_id, child_id, lesson_id, level, title, writing_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
          .run(id, userId, child.id, lesson.id, st.level, L.title, JSON.stringify({ key: { reading: reading.map((x) => x.correct), listening: listening.map((x) => x.correct) } }), Date.now());
        const strip = (qs: any[]) => qs.map((x) => ({ q: x.q, options: x.options }));
        return res.json({
          attemptId: id, level: st.level, levelLabel: LEVEL_LABEL[st.level], theme,
          lesson: { title: L.title, vocabulary: L.vocabulary, grammar: L.grammar, phrases: L.phrases,
            reading: { text: L.reading.text, questions: strip(reading) }, listening: { text: L.listening.text, questions: strip(listening) }, writing: L.writing },
        });
      }

      if (action === 'lesson_submit') {
        const a = await db.prepare('SELECT * FROM english_attempts WHERE id = ? AND child_id = ? AND finished_at IS NULL').get(String(b.attemptId || ''), child.id);
        if (!a) return res.status(404).json({ error: 'No encuentro esa lección.' });
        const meta = parse(a.writing_json, {});
        const key = meta.key || { reading: [], listening: [] };
        const lessonRow = await db.prepare('SELECT data FROM english_lessons WHERE id = ?').get(a.lesson_id);
        const L = parse(lessonRow?.data, null);
        const ra: any[] = Array.isArray(b.reading) ? b.reading : []; const la: any[] = Array.isArray(b.listening) ? b.listening : [];
        const rRes = key.reading.map((c: number, i: number) => Number(ra[i]) === c);
        const lRes = key.listening.map((c: number, i: number) => Number(la[i]) === c);
        const mcCorrect = [...rRes, ...lRes].filter(Boolean).length;
        const mcTotal = rRes.length + lRes.length;

        // Redacción: la corrige Claude (si no hay texto o es muy corto, no se envía)
        const text = String(b.writing || '').trim().slice(0, 2000);
        let writing: any = null;
        const minWords = L?.writing?.minWords || 10;
        if (text && words(text) >= Math.min(5, minWords)) {
          try {
            const { data } = await callClaudeJson({
              task: 'english_writing', maxTokens: 900,
              system: 'You are a kind English teacher for Spanish children. Feedback, explanations and nextStep are in Spanish from Spain, short and encouraging. Score from 0 to 10 for the student level, considering task completion, grammar, vocabulary and the minimum length. Corrections: at most 5, the most important ones.',
              prompt: `Level: ${a.level}. Task: ${L?.writing?.prompt || ''}. Minimum words: ${minWords}.\nSTUDENT TEXT:\n"${text.replace(/"/g, "'")}"\nReturn JSON {"score": number, "feedback": "...", "corrections": [{"original": "...", "correction": "...", "explanation": "..."}], "nextStep": "..."}`,
            });
            const score = Math.max(0, Math.min(10, Math.round(Number(data.score) * 10) / 10));
            if (!Number.isFinite(score)) throw new Error('Nota no válida');
            writing = { score, feedback: String(data.feedback || '').slice(0, 600), corrections: (Array.isArray(data.corrections) ? data.corrections : []).slice(0, 5).map((c: any) => ({ original: String(c.original || '').slice(0, 200), correction: String(c.correction || '').slice(0, 200), explanation: String(c.explanation || '').slice(0, 300) })), nextStep: String(data.nextStep || '').slice(0, 300) };
            if (words(text) < minWords) writing.feedback = `Tu texto tiene ${words(text)} palabras y se pedían ${minWords}. ${writing.feedback}`;
          } catch (e: any) {
            console.error('[INGLÉS] redacción:', e?.message);
            writing = { error: 'No se ha podido corregir la redacción ahora mismo. El resto de la lección sí cuenta.' };
          }
        }

        const raw = 10 + 3 * mcCorrect + (writing && writing.score >= 5 ? 10 : 0);
        const already = await earnedToday(db, child.id, 'english');
        const points = Math.max(0, Math.min(raw, ENGLISH_POINTS_CAP - already));
        await db.prepare('UPDATE english_attempts SET mc_correct = ?, mc_total = ?, writing_text = ?, writing_score = ?, writing_json = ?, points = ?, finished_at = ? WHERE id = ?')
          .run(mcCorrect, mcTotal, text || null, writing?.score ?? null, JSON.stringify({ key, writing }), points, Date.now(), a.id);
        const award = await awardActivity(db, { userId, childId: child.id, points, source: 'english', label: `Inglés: ${a.title}`, refId: a.id });

        // ¿Sube de nivel?
        let promoted: string | null = null;
        const st = await getState(child);
        if (st.level === a.level) {
          const recent = await db.prepare('SELECT mc_correct, mc_total, writing_score FROM english_attempts WHERE child_id = ? AND level = ? AND finished_at IS NOT NULL ORDER BY finished_at DESC LIMIT ?').all(child.id, a.level, PROMOTE_AFTER);
          if (recent.length >= PROMOTE_AFTER) {
            const acc = recent.reduce((s: number, r: any) => s + Number(r.mc_correct) / Math.max(1, Number(r.mc_total)), 0) / recent.length;
            const ws = recent.filter((r: any) => r.writing_score !== null).map((r: any) => Number(r.writing_score));
            const wAvg = ws.length ? ws.reduce((s: number, x: number) => s + x, 0) / ws.length : 0;
            const idx = ENGLISH_LEVELS.indexOf(a.level as EnglishLevel);
            if (acc >= 0.8 && wAvg >= 6 && idx < ENGLISH_LEVELS.length - 1) {
              const next = ENGLISH_LEVELS[idx + 1];
              await setLevel(child.id, next, 'progress');
              promoted = LEVEL_LABEL[next];
            }
          }
        }
        return res.json({
          mcCorrect, mcTotal, reading: rRes, listening: lRes, key, writing, points: award.awarded, newPoints: award.newPoints,
          promoted, explanationNote: 'Las respuestas buenas están marcadas.',
        });
      }

      // ------------------------------------------------ padres
      if (action === 'parent_stats') {
        const st = await getState(child);
        const rows = await db.prepare('SELECT * FROM english_attempts WHERE child_id = ? AND finished_at IS NOT NULL ORDER BY finished_at DESC LIMIT 30').all(child.id);
        const placements = await db.prepare('SELECT level, detail, finished_at FROM english_placements WHERE child_id = ? AND finished_at IS NOT NULL ORDER BY finished_at DESC LIMIT 5').all(child.id);
        return res.json({
          level: st.level, levelLabel: LEVEL_LABEL[st.level], placed: st.placed, setBy: st.setBy, levels: ENGLISH_LEVELS.map((l) => ({ id: l, label: LEVEL_LABEL[l] })),
          lessons: rows.map((r: any) => {
            const w = parse(r.writing_json, {}).writing || null;
            return { id: r.id, title: r.title, level: r.level, mcCorrect: Number(r.mc_correct), mcTotal: Number(r.mc_total), writingText: r.writing_text || '', writing: w, points: Number(r.points), at: Number(r.finished_at) };
          }),
          placements: placements.map((p: any) => ({ level: p.level, detail: parse(p.detail, {}), at: Number(p.finished_at) })),
        });
      }
      if (action === 'set_level') {
        const level = String(b.level) as EnglishLevel;
        if (!ENGLISH_LEVELS.includes(level)) return res.status(400).json({ error: 'Nivel no válido' });
        await setLevel(child.id, level, 'parent');
        return res.json({ status: 'success', level, levelLabel: LEVEL_LABEL[level] });
      }

      return res.status(400).json({ error: 'Acción no válida' });
    } catch (e: any) {
      console.error('[INGLÉS]', e?.message);
      const unavailable = e instanceof AiUnavailable;
      return res.status(unavailable ? 503 : 500).json({ error: unavailable ? 'El profesor de inglés no está disponible ahora mismo. Inténtalo en un rato.' : 'No se ha podido completar. Inténtalo de nuevo.' });
    }
  });
}
