// Opción 6 — Lectura: biblioteca por curso, velocidad lectora y comprensión, grabaciones para los padres.
// - La nota de comprensión la calcula el programa (cada pregunta tiene una sola respuesta buena).
// - La velocidad (palabras por minuto) se compara con la referencia de su curso (Ripoll et al., 2020).
// - La voz del niño se guarda 365 días para que la escuchen sus padres (no se envía a ninguna IA).
// - Puntos: 10 por lectura + 5 por pregunta acertada, máximo 100 al día.
import { publicErrorMessage } from './errors';
import type express from 'express';
import crypto from 'crypto';
import { READING_LIBRARY, LibraryText, WPM_REFERENCE, bandForLevel, wordCount, QUESTION_LABELS, QuestionType } from '../shared/readingLibrary';
import { gradeLevel } from '../services/mathChallenge';
import { callClaudeJson, setMockHandler, TUTOR_MODEL } from './ai';
import { saveAudio, deleteStoredFile, getObject } from './storage';
import { awardActivity } from './rewards';

type Db = any;
export interface ReadingDeps {
  db: Db;
  getSession: (req: express.Request) => Promise<{ tokenHash: string; userId: string; parentUntil: number } | null>;
  isParentUnlocked: (s: { parentUntil: number }) => boolean;
  refreshParentWindow: (tokenHash: string) => Promise<void>;
}

export const READING_POINTS_CAP = 100;
const MORE_TEXTS_PER_DAY = 3;

const startOfTodayMadrid = () => {
  const now = new Date();
  const madrid = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Madrid' }));
  const offset = now.getTime() - madrid.getTime();
  madrid.setHours(0, 0, 0, 0);
  return madrid.getTime() + offset;
};
const shuffle = <T,>(a: T[]) => { const r = [...a]; for (let i = r.length - 1; i > 0; i--) { const j = crypto.randomInt(i + 1); [r[i], r[j]] = [r[j], r[i]]; } return r; };

/** Banda de velocidad respecto a lo esperado en su curso. */
export function wpmBand(level: number, wpm: number) {
  const ref = WPM_REFERENCE[Math.max(1, Math.min(10, level))];
  if (wpm < ref.min) return { band: 'below' as const, ref };
  if (wpm > ref.max) return { band: 'above' as const, ref };
  return { band: 'within' as const, ref };
}

export async function initReadingTables(db: Db) {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS reading_texts (
      id VARCHAR(64) PRIMARY KEY,
      level INTEGER NOT NULL,
      data_json TEXT NOT NULL,
      origin VARCHAR(10) DEFAULT 'ai',
      created_at BIGINT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS reading_attempts (
      id VARCHAR(64) PRIMARY KEY,
      child_id VARCHAR(64) NOT NULL,
      text_id VARCHAR(64) NOT NULL,
      questions_json TEXT NOT NULL,
      created_at BIGINT NOT NULL,
      finished INTEGER DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS reading_records (
      id VARCHAR(64) PRIMARY KEY,
      user_id VARCHAR(64) NOT NULL,
      child_id VARCHAR(64) NOT NULL,
      text_id VARCHAR(64) NOT NULL,
      title VARCHAR(160),
      level INTEGER,
      words INTEGER,
      seconds INTEGER,
      wpm INTEGER,
      wpm_band VARCHAR(8),
      counted INTEGER DEFAULT 1,
      correct INTEGER,
      total INTEGER,
      by_type TEXT,
      tracking_accuracy INTEGER,
      audio_id VARCHAR(64),
      points INTEGER DEFAULT 0,
      created_at BIGINT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_reading_records_child ON reading_records (child_id, created_at);
  `);
}

const aiTexts = async (db: Db, level?: number): Promise<LibraryText[]> => {
  const rows = level === undefined ? await db.prepare('SELECT data_json FROM reading_texts').all() : await db.prepare('SELECT data_json FROM reading_texts WHERE level = ?').all(level);
  return rows.map((r: any) => JSON.parse(r.data_json));
};
const findText = async (db: Db, id: string): Promise<LibraryText | null> =>
  READING_LIBRARY.find((t) => t.id === id) || (await aiTexts(db)).find((t) => t.id === id) || null;

const textCard = (t: LibraryText, read: { times: number; best: number | null } | undefined) => ({
  id: t.id, level: t.level, course: t.course, title: t.title, author: t.author, source: t.source, genre: t.genre, link: t.link,
  words: wordCount(t.text), timesRead: read?.times || 0, bestComprehension: read?.best ?? null,
});

const textPrompt = (course: string, already: string[]) => `Escribe una lectura original para un alumno de ${course} en España, relacionada con lo que se estudia en ese curso (Lengua, Ciencias Naturales o Ciencias Sociales / Geografía e Historia).
Reglas:
- Texto original tuyo (no copies obras con derechos de autor). Si es literatura, puede ser un cuento o una adaptación de una obra clásica de dominio público, indicándolo.
- Longitud adecuada al curso (de 60 palabras en 1º de Primaria a 300 en 4º de ESO). Lenguaje claro y correcto. Sin datos inventados que sean falsos.
- No repitas estos títulos: ${already.slice(0, 40).join('; ') || 'ninguno'}.
- 4 preguntas de opción múltiple, en este orden y tipo: "literal" (lo que dice el texto), "inferencial" (lo que se deduce), "vocabulario", "interpretacion". Cada una con 4 opciones distintas y UNA sola correcta; "explanation" breve.
Formato JSON: {"title":"...","author":"EduAmigo","source":"Texto de EduAmigo","genre":"cuento|ciencias|sociales|noticia|leyenda|fábula|poema|mito|instrucciones","link":"Asignatura: tema","text":"...","questions":[{"type":"literal","q":"...","options":["","","",""],"correct":0,"explanation":"..."}]}`;

setMockHandler('reading_text', () => JSON.stringify({
  title: `Lectura simulada ${Date.now() % 100000}`, author: 'EduAmigo', source: 'Texto de EduAmigo', genre: 'ciencias', link: 'Ciencias: simulado',
  text: 'Este es un texto simulado para las pruebas. Tiene varias frases sencillas. Sirve para comprobar que la lectura nueva se guarda bien y se puede leer.',
  questions: (['literal', 'inferencial', 'vocabulario', 'interpretacion'] as QuestionType[]).map((type, i) => ({ type, q: `Pregunta simulada ${i + 1}`, options: ['Buena', 'Mala A', 'Mala B', 'Mala C'], correct: 0, explanation: 'Explicación simulada' })),
}));

export async function registerReadingRoutes(app: express.Express, deps: ReadingDeps) {
  const { db, getSession, isParentUnlocked, refreshParentWindow } = deps;
  await initReadingTables(db);
  const ownChild = (userId: string, childId: string) => db.prepare('SELECT id, name, grade, points FROM children WHERE id = ? AND parentId = ?').get(childId, userId);
  const pointsToday = async (childId: string) =>
    Number((await db.prepare('SELECT COALESCE(SUM(points), 0) AS p FROM reading_records WHERE child_id = ? AND created_at >= ?').get(childId, startOfTodayMadrid()))?.p || 0);

  // ---------------------------------------------------------------- grabación (para los padres o el propio niño)
  app.get('/api_audio.php', async (req, res) => {
    try {
      const session = await getSession(req);
      if (!session) return res.status(401).end();
      const row = await db.prepare("SELECT * FROM photos WHERE id = ? AND user_id = ? AND kind = 'reading_audio' AND deleted = 0").get(String(req.query.id || ''), session.userId);
      if (!row) return res.status(404).end();
      const buf = await getObject(row.object_key);
      if (!buf) return res.status(404).end();
      res.setHeader('Content-Type', row.media_type);
      res.setHeader('Accept-Ranges', 'bytes');
      res.setHeader('Cache-Control', 'private, max-age=3600');
      // Safari necesita rangos para reproducir audio
      const range = /bytes=(\d*)-(\d*)/.exec(String(req.headers.range || ''));
      if (range) {
        const start = range[1] ? Number(range[1]) : 0;
        const end = range[2] ? Math.min(Number(range[2]), buf.length - 1) : buf.length - 1;
        if (start >= buf.length || start > end) return res.status(416).setHeader('Content-Range', `bytes */${buf.length}`).end();
        res.status(206).setHeader('Content-Range', `bytes ${start}-${end}/${buf.length}`);
        res.setHeader('Content-Length', String(end - start + 1));
        return res.end(buf.subarray(start, end + 1));
      }
      res.setHeader('Content-Length', String(buf.length));
      return res.end(buf);
    } catch (e) {
      console.error('[LECTURA] audio', e);
      return res.status(500).end();
    }
  });

  app.post('/api_reading.php', async (req, res) => {
    const action = String(req.query.action || '');
    const b = req.body || {};
    try {
      const session = await getSession(req);
      if (!session) return res.status(401).json({ error: 'Sesión no válida. Vuelve a iniciar sesión.', code: 'AUTH_REQUIRED' });
      const userId = session.userId;
      if (action === 'parent_stats' || action === 'delete_audio') {
        if (!isParentUnlocked(session)) return res.status(403).json({ error: 'Esta acción necesita el PIN de padres.', code: 'PIN_REQUIRED' });
        await refreshParentWindow(session.tokenHash);
      }
      const child = b.childId ? await ownChild(userId, String(b.childId)) : null;
      if (!child) return res.status(404).json({ error: 'Perfil no encontrado' });
      const level = gradeLevel(child.grade);
      const band = bandForLevel(level);

      // ---------------------------------------------------------------- biblioteca para el niño
      if (action === 'list') {
        const reads = await db.prepare('SELECT text_id, COUNT(*) AS n, MAX(CAST(correct AS FLOAT) / total) AS best FROM reading_records WHERE child_id = ? GROUP BY text_id').all(child.id);
        const readMap = new Map<string, { times: number; best: number | null }>(reads.map((r: any) => [r.text_id, { times: Number(r.n), best: r.best === null ? null : Math.round(Number(r.best) * 100) }]));
        const all = [...READING_LIBRARY, ...(await aiTexts(db))];
        const lower = band <= 1 ? null : band === 9 ? 7 : band === 7 ? 6 : band - 1;
        const upper = band >= 9 ? null : band === 7 ? 9 : band === 6 ? 7 : band + 1;
        const pick = (lv: number | null) => (lv === null ? [] : all.filter((t) => t.level === lv).map((t) => textCard(t, readMap.get(t.id))));
        const mine = pick(band);
        return res.json({
          level, course: WPM_REFERENCE[level].course, reference: WPM_REFERENCE[level],
          texts: mine, easier: pick(lower), challenge: pick(upper),
          allRead: mine.every((t) => t.timesRead > 0),
          pointsToday: await pointsToday(child.id), pointsCap: READING_POINTS_CAP,
        });
      }

      // ---------------------------------------------------------------- abrir una lectura
      if (action === 'start') {
        const t = await findText(db, String(b.textId || ''));
        if (!t) return res.status(404).json({ error: 'No encuentro esa lectura.' });
        // Opciones barajadas: la buena no está siempre en el mismo sitio
        const questions = t.questions.map((q) => {
          const opts = shuffle(q.options.map((text, i) => ({ text, ok: i === q.correct })));
          return { type: q.type, q: q.q, options: opts.map((o) => o.text), correct: opts.findIndex((o) => o.ok), explanation: q.explanation };
        });
        const id = crypto.randomUUID();
        await db.prepare('INSERT INTO reading_attempts (id, child_id, text_id, questions_json, created_at) VALUES (?, ?, ?, ?, ?)').run(id, child.id, t.id, JSON.stringify(questions), Date.now());
        return res.json({
          attemptId: id,
          text: { ...textCard(t, undefined), text: t.text },
          questions: questions.map((q) => ({ type: q.type, label: QUESTION_LABELS[q.type], q: q.q, options: q.options })),
          reference: WPM_REFERENCE[level],
        });
      }

      // ---------------------------------------------------------------- entregar lectura + preguntas (+ grabación)
      if (action === 'submit') {
        const att = await db.prepare('SELECT * FROM reading_attempts WHERE id = ? AND child_id = ?').get(String(b.attemptId || ''), child.id);
        if (!att) return res.status(404).json({ error: 'No encuentro esa lectura.' });
        if (Number(att.finished)) return res.status(409).json({ error: 'Esta lectura ya está entregada.' });
        const t = await findText(db, att.text_id);
        if (!t) return res.status(404).json({ error: 'No encuentro esa lectura.' });
        const questions = JSON.parse(att.questions_json);
        const answers: any[] = Array.isArray(b.answers) ? b.answers : [];
        const detail = questions.map((q: any, i: number) => {
          const chosen = Number.isInteger(Number(answers[i])) ? Number(answers[i]) : -1;
          return { type: q.type, label: QUESTION_LABELS[q.type as QuestionType], q: q.q, options: q.options, chosen, correctIndex: q.correct, correct: chosen === q.correct, explanation: q.explanation };
        });
        const correct = detail.filter((d: any) => d.correct).length;
        const byType: Record<string, number> = {};
        detail.forEach((d: any) => { byType[d.type] = d.correct ? 1 : 0; });

        const words = wordCount(t.text);
        const seconds = Math.max(1, Math.min(1800, Math.round(Number(b.seconds) || 0)));
        const wpm = Math.round(words / (seconds / 60));
        const { band: wb, ref } = wpmBand(level, wpm);
        // Si "termina" demasiado rápido para el texto, no cuenta para la velocidad (¿lo ha leído entero?)
        const counted = !(Number(b.seconds) < 3 || wpm > ref.max * 1.6) && b.readWhole !== false;
        const tracking = Number.isFinite(Number(b.trackingAccuracy)) ? Math.max(0, Math.min(100, Math.round(Number(b.trackingAccuracy)))) : null;

        let audioId: string | null = null;
        let audioError: string | null = null;
        if (b.audio) {
          try { audioId = (await saveAudio(db, { userId, childId: child.id, audio: String(b.audio) })).id; }
          catch (e: any) { audioError = publicErrorMessage(e, 'api_reading.php'); }
        }
        const already = await pointsToday(child.id);
        const raw = (counted ? 10 : 0) + 5 * correct;
        const points = Math.max(0, Math.min(raw, READING_POINTS_CAP - already));
        const recordId = crypto.randomUUID();
        await db.prepare(`INSERT INTO reading_records (id, user_id, child_id, text_id, title, level, words, seconds, wpm, wpm_band, counted, correct, total, by_type, tracking_accuracy, audio_id, points, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
          .run(recordId, userId, child.id, t.id, t.title, level, words, seconds, wpm, wb, counted ? 1 : 0, correct, detail.length, JSON.stringify(byType), tracking, audioId, points, Date.now());
        await db.prepare('UPDATE reading_attempts SET finished = 1 WHERE id = ?').run(att.id);
        const { newPoints } = await awardActivity(db, { userId, childId: child.id, points, source: 'reading', label: `Lectura: ${t.title}`, refId: recordId });
        return res.json({
          recordId, words, seconds, wpm, wpmBand: wb, reference: ref, counted, correct, total: detail.length, detail,
          points, pointsCapReached: already + raw > READING_POINTS_CAP, newPoints, audioSaved: !!audioId, audioError,
        });
      }

      // ---------------------------------------------------------------- más lecturas (Claude) cuando ya las ha leído todas
      if (action === 'more') {
        const today = Number((await db.prepare("SELECT COUNT(*) AS n FROM reading_texts WHERE origin = 'ai' AND data_json LIKE ? AND created_at >= ?").get(`%"requestedBy":"${child.id}"%`, startOfTodayMadrid()))?.n || 0);
        if (today >= MORE_TEXTS_PER_DAY) return res.status(429).json({ error: 'Hoy ya hemos preparado lecturas nuevas para ti. ¡Mañana más! Mientras, puedes releer tus favoritas.', code: 'DAILY_LIMIT' });
        const existing = [...READING_LIBRARY, ...(await aiTexts(db))].filter((x) => x.level === band).map((x) => x.title);
        try {
          const course = band === 7 ? '1º–2º de ESO' : band === 9 ? '3º–4º de ESO' : `${band}º de Primaria`;
          const { data } = await callClaudeJson<any>({ system: 'Eres un maestro y escritor de lecturas escolares en España. Escribes con corrección y adecuas el texto a la edad.', prompt: textPrompt(course, existing), model: TUTOR_MODEL(), maxTokens: 2500, task: 'reading_text' });
          const qs = Array.isArray(data?.questions) ? data.questions : [];
          const types: QuestionType[] = ['literal', 'inferencial', 'vocabulario', 'interpretacion'];
          const okQs = qs.length === 4 && qs.every((q: any, i: number) => q.type === types[i] && Array.isArray(q.options) && q.options.length === 4 && new Set(q.options).size === 4 && Number.isInteger(q.correct) && q.correct >= 0 && q.correct < 4);
          if (!data?.title || !data?.text || wordCount(data.text) < 20 || !okQs) throw new Error('Lectura no válida');
          const t: LibraryText & { requestedBy: string } = {
            id: 'ai-' + crypto.randomUUID().slice(0, 8), level: band, course: course.replace(' de ', ' '), title: String(data.title).slice(0, 120), author: 'EduAmigo (IA)', source: 'Texto de EduAmigo creado con IA',
            genre: data.genre || 'cuento', link: String(data.link || '').slice(0, 120), text: String(data.text).slice(0, 4000),
            questions: qs.map((q: any) => ({ type: q.type, q: String(q.q).slice(0, 300), options: q.options.map((o: any) => String(o).slice(0, 200)), correct: q.correct, explanation: String(q.explanation || '').slice(0, 300) })),
            requestedBy: child.id,
          };
          await db.prepare("INSERT INTO reading_texts (id, level, data_json, origin, created_at) VALUES (?, ?, ?, 'ai', ?)").run(t.id, band, JSON.stringify(t), Date.now());
          return res.json({ text: textCard(t, undefined) });
        } catch (e) {
          console.error('[LECTURA] más lecturas:', (e as any)?.message);
          return res.status(503).json({ error: 'Ahora mismo no puedo preparar una lectura nueva. Inténtalo en un rato.', code: 'AI_UNAVAILABLE' });
        }
      }

      // ---------------------------------------------------------------- padres
      if (action === 'parent_stats') {
        const rows = await db.prepare('SELECT * FROM reading_records WHERE child_id = ? ORDER BY created_at DESC LIMIT 60').all(child.id);
        const audios = new Set((await db.prepare("SELECT id FROM photos WHERE child_id = ? AND kind = 'reading_audio' AND deleted = 0").all(child.id)).map((r: any) => r.id));
        const typeTotals: Record<string, { ok: number; n: number }> = {};
        rows.forEach((r: any) => Object.entries(JSON.parse(r.by_type || '{}')).forEach(([k, v]: any) => { typeTotals[k] = typeTotals[k] || { ok: 0, n: 0 }; typeTotals[k].ok += v; typeTotals[k].n += 1; }));
        const counted = rows.filter((r: any) => Number(r.counted));
        const recentWpm = counted.slice(0, 5).map((r: any) => Number(r.wpm));
        return res.json({
          reference: WPM_REFERENCE[level], course: WPM_REFERENCE[level].course,
          avgWpm: recentWpm.length ? Math.round(recentWpm.reduce((a: number, x: number) => a + x, 0) / recentWpm.length) : null,
          comprehension: rows.length ? Math.round((rows.reduce((a: number, r: any) => a + Number(r.correct), 0) / rows.reduce((a: number, r: any) => a + Number(r.total), 0)) * 100) : null,
          byType: (['literal', 'inferencial', 'vocabulario', 'interpretacion'] as QuestionType[]).map((k) => ({ type: k, label: QUESTION_LABELS[k], accuracy: typeTotals[k] ? Math.round((typeTotals[k].ok / typeTotals[k].n) * 100) : null, total: typeTotals[k]?.n || 0 })),
          trend: counted.slice(0, 15).reverse().map((r: any) => ({ wpm: Number(r.wpm), createdAt: Number(r.created_at) })),
          records: rows.map((r: any) => ({
            id: r.id, title: r.title, wpm: Number(r.wpm), wpmBand: r.wpm_band, counted: !!Number(r.counted), correct: Number(r.correct), total: Number(r.total),
            seconds: Number(r.seconds), trackingAccuracy: r.tracking_accuracy === null ? null : Number(r.tracking_accuracy), createdAt: Number(r.created_at),
            audioUrl: r.audio_id && audios.has(r.audio_id) ? `api_audio.php?id=${r.audio_id}` : null,
          })),
          totalReadings: rows.length,
        });
      }
      if (action === 'delete_audio') {
        const r = await db.prepare('SELECT audio_id FROM reading_records WHERE id = ? AND child_id = ?').get(String(b.recordId || ''), child.id);
        if (!r?.audio_id) return res.status(404).json({ error: 'No hay grabación.' });
        await deleteStoredFile(db, r.audio_id);
        await db.prepare('UPDATE reading_records SET audio_id = NULL WHERE id = ?').run(String(b.recordId));
        return res.json({ status: 'success' });
      }
      return res.status(400).json({ error: 'Acción no válida' });
    } catch (e) {
      console.error('[LECTURA]', e);
      return res.status(500).json({ error: 'Algo ha fallado. Inténtalo de nuevo.' });
    }
  });
}
