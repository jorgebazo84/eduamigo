// Opción 9 — Caligrafía en el servidor (Claude). Sustituye a Gemini en el navegador.
// - La foto (comprimida en el móvil) se guarda 365 días; los padres ven el historial.
// - Claude valora legibilidad, trazo, espaciado y ortografía, y prepara fichas de práctica.
// - Grafología: decisión de la familia. Solo la ven los padres (nunca el niño), con lenguaje
//   neutro, sin diagnósticos y con el aviso de que no tiene validez científica.
//   Los padres pueden desactivarla para cada hijo.
// - Puntos en el servidor: 15 si la nota es 7 o más, 5 si no; máximo 30 al día.
import type express from 'express';
import crypto from 'crypto';
import { callClaudeJson, setMockHandler, VISION_MODEL, AiUnavailable } from './ai';
import { savePhoto } from './storage';
import { awardActivity, earnedToday, startOfTodayMadrid, CALLIGRAPHY_DAILY_CAP } from './rewards';

type Db = any;
export interface CalligraphyDeps {
  db: Db;
  getSession: (req: express.Request) => Promise<{ tokenHash: string; userId: string; parentUntil: number } | null>;
  isParentUnlocked: (s: { parentUntil: number }) => boolean;
  refreshParentWindow: (tokenHash: string) => Promise<void>;
}

const ANALYSES_PER_DAY = 6;
export const GRAPHOLOGY_NOTICE = 'La grafología no tiene validez científica: estas observaciones son una curiosidad y no describen cómo es tu hijo ni sirven para diagnosticar nada. La letra de un niño cambia mucho con la edad, el cansancio, el lápiz o la prisa.';

// Palabras que nunca deben aparecer en la grafología (diagnósticos, salud mental, etiquetas dañinas)
const BANNED = /(trastorno|tdah|ansiedad|depresi|autis|dislex|patolog|diagn[oó]stic|maltrato|abuso|trauma|suicid|autolesi|psic[oó]pat|enfermedad|inestab|agresiv|violent|mentira|mentiroso)/i;

export async function initCalligraphyTables(db: Db) {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS calligraphy_records (
      id VARCHAR(64) PRIMARY KEY,
      user_id VARCHAR(64) NOT NULL,
      child_id VARCHAR(64) NOT NULL,
      photo_id VARCHAR(64),
      score REAL,
      analysis TEXT NOT NULL,
      graphology TEXT,
      points INTEGER DEFAULT 0,
      created_at BIGINT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_calligraphy_records_child ON calligraphy_records (child_id, created_at);
  `);
  try { await db.exec('ALTER TABLE children ADD COLUMN graphology_enabled INTEGER DEFAULT 1'); } catch { /* ya existe */ }
}

const str = (x: any, n: number) => String(x ?? '').trim().slice(0, n);

export function cleanAnalysis(d: any) {
  const score = Math.round(Number(d?.score) * 10) / 10;
  if (!Number.isFinite(score) || score < 0 || score > 10) throw new Error('Nota no válida');
  if (d?.readable === false) throw new Error('NOT_HANDWRITING');
  const plan = (Array.isArray(d.practicePlan) ? d.practicePlan : []).slice(0, 4).map((e: any) => ({
    title: str(e.title, 80), description: str(e.description, 300), target: str(e.target, 60),
    difficulty: ['fácil', 'medio', 'difícil'].includes(e.difficulty) ? e.difficulty : 'medio',
    printableContent: str(e.printableContent, 1200),
  })).filter((e: any) => e.title && e.printableContent);
  if (!plan.length) throw new Error('Sin fichas de práctica');
  return {
    score,
    transcription: str(d.transcription, 600),
    legibility: str(d.legibility, 400), strokeFeedback: str(d.strokeFeedback, 400), spacingFeedback: str(d.spacingFeedback, 400),
    spellingErrors: (Array.isArray(d.spellingErrors) ? d.spellingErrors : []).slice(0, 10).map((x: any) => typeof x === 'string' ? { wrong: str(x, 60), right: '' } : { wrong: str(x.wrong, 60), right: str(x.right, 60) }).filter((x: any) => x.wrong),
    generalFeedback: str(d.generalFeedback, 500),
    practicePlan: plan,
  };
}

export function cleanGraphology(g: any) {
  if (!g || typeof g !== 'object') return null;
  const observations = (Array.isArray(g.observations) ? g.observations : []).slice(0, 5).map((x: any) => str(x, 200)).filter(Boolean);
  const traits = (Array.isArray(g.traits) ? g.traits : []).slice(0, 4).map((x: any) => str(x, 220)).filter(Boolean);
  const all = [...observations, ...traits].join(' ');
  if (!observations.length || BANNED.test(all)) return null; // si se sale de lo permitido, no se muestra
  return { observations, traits, notice: GRAPHOLOGY_NOTICE };
}

setMockHandler('calligraphy', () => JSON.stringify({
  readable: true, score: 7.5, transcription: 'El perro corre por el parque.',
  legibility: 'Se lee bien casi todo.', strokeFeedback: 'Trazo firme.', spacingFeedback: 'Deja algo más de espacio entre palabras.',
  spellingErrors: [{ wrong: 'parqe', right: 'parque' }],
  generalFeedback: '¡Muy bien! Tu letra se entiende y es bonita.',
  practicePlan: [{ title: 'Espacios entre palabras', description: 'Deja un dedo de espacio.', target: 'Espaciado', difficulty: 'fácil', printableContent: 'El sol sale.\nEl sol sale.\nEl sol sale.' }],
  graphology: { observations: ['Letra de tamaño medio y regular.', 'Ligera inclinación a la derecha.'], traits: ['La grafología suele asociar la regularidad con constancia.'] },
}));

export async function registerCalligraphyRoutes(app: express.Express, deps: CalligraphyDeps) {
  const { db, getSession, isParentUnlocked, refreshParentWindow } = deps;
  await initCalligraphyTables(db);
  const ownChild = (userId: string, childId: string) => db.prepare('SELECT id, name, grade, graphology_enabled FROM children WHERE id = ? AND parentId = ?').get(String(childId || ''), userId);
  const PARENT_ACTIONS = new Set(['parent_history', 'set_graphology']);

  const forChild = (r: any) => {
    const a = JSON.parse(r.analysis);
    return { id: r.id, score: Number(r.score), analysis: a, photoUrl: r.photo_id ? `api_photo.php?id=${r.photo_id}` : null, points: Number(r.points), at: Number(r.created_at) };
  };

  app.post('/api_calligraphy.php', async (req, res) => {
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

      if (action === 'analyze') {
        const used = Number((await db.prepare('SELECT COUNT(*) AS n FROM calligraphy_records WHERE child_id = ? AND created_at >= ?').get(child.id, startOfTodayMadrid()))?.n || 0);
        if (used >= ANALYSES_PER_DAY) return res.status(429).json({ error: `Hoy ya has analizado ${ANALYSES_PER_DAY} fotos. ¡Mañana más!`, code: 'DAILY_LIMIT' });
        let photo;
        try { photo = await savePhoto(db, { userId, childId: child.id, kind: 'calligraphy', image: String(b.image || ''), thumb: b.thumb }); }
        catch (e: any) { return res.status(400).json({ error: e.message }); }
        const wantGraphology = Number(child.graphology_enabled ?? 1) === 1;
        let raw: any;
        try {
          const { data } = await callClaudeJson({
            task: 'calligraphy', model: VISION_MODEL(), maxTokens: 2200,
            images: [{ mediaType: photo.mediaType as any, base64: photo.buffer.toString('base64') }],
            system: `Eres un maestro de Primaria en España que ayuda a mejorar la letra y la ortografía. Hablas al niño con cariño y en frases cortas. Nunca te inventas lo que no ves: si la foto no es escritura a mano o no se lee, devuelve "readable": false.`,
            prompt: `Foto de la escritura a mano de un alumno de ${child.grade}.
Devuelve JSON:
{"readable": true|false,
 "score": nota de 0 a 10 para su edad (legibilidad, trazo, espaciado y ortografía),
 "transcription": "lo que pone, tal cual",
 "legibility": "...", "strokeFeedback": "...", "spacingFeedback": "...",
 "spellingErrors": [{"wrong": "palabra como la escribió", "right": "palabra correcta"}],
 "generalFeedback": "mensaje motivador para el niño",
 "practicePlan": [{"title": "...", "description": "...", "target": "Letra 'g' | Espaciado | Ortografía…", "difficulty": "fácil|medio|difícil", "printableContent": "líneas para copiar o calcar, separadas por saltos de línea"}] (2 o 3 fichas)${wantGraphology ? `,
 "graphology": {"observations": ["rasgos observables de la letra: tamaño, inclinación, presión aparente, regularidad, márgenes"], "traits": ["lo que la grafología tradicional suele asociar a esos rasgos, en condicional, en positivo o neutro, para los padres"]}` : ''}}
${wantGraphology ? 'La grafología es solo para los padres. Normas: nada de diagnósticos ni de salud mental o emociones negativas, nada de etiquetas negativas, frases como "la grafología suele asociar… con…", máximo 4 rasgos.' : ''}`,
          });
          raw = data;
        } catch (e: any) {
          console.error('[CALIGRAFÍA]', e?.message);
          const unavailable = e instanceof AiUnavailable;
          return res.status(unavailable ? 503 : 502).json({ error: 'No se ha podido analizar la foto ahora mismo. Inténtalo de nuevo en un rato.', code: 'AI_UNAVAILABLE' });
        }
        let analysis;
        try { analysis = cleanAnalysis(raw); }
        catch (e: any) {
          if (e.message === 'NOT_HANDWRITING') return res.status(422).json({ error: 'No veo bien la letra. Haz la foto con buena luz, de frente y que se vea solo lo que has escrito.', code: 'NOT_READABLE' });
          return res.status(502).json({ error: 'La corrección no ha salido bien. Inténtalo de nuevo.', code: 'BAD_RESULT' });
        }
        const graphology = wantGraphology ? cleanGraphology(raw.graphology) : null;
        const id = crypto.randomUUID();
        const already = await earnedToday(db, child.id, 'calligraphy');
        const pts = Math.max(0, Math.min(analysis.score >= 7 ? 15 : 5, CALLIGRAPHY_DAILY_CAP - already));
        await db.prepare('INSERT INTO calligraphy_records (id, user_id, child_id, photo_id, score, analysis, graphology, points, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
          .run(id, userId, child.id, photo.id, analysis.score, JSON.stringify(analysis), graphology ? JSON.stringify(graphology) : null, pts, Date.now());
        const award = await awardActivity(db, { userId, childId: child.id, points: pts, source: 'calligraphy', label: 'Práctica de caligrafía', refId: id });
        // El niño nunca recibe la grafología
        return res.json({ id, analysis, photoUrl: `api_photo.php?id=${photo.id}`, points: award.awarded, newPoints: award.newPoints });
      }

      if (action === 'history') {
        const rows = await db.prepare('SELECT * FROM calligraphy_records WHERE child_id = ? ORDER BY created_at DESC LIMIT 30').all(child.id);
        return res.json({ records: rows.map(forChild) });
      }

      if (action === 'parent_history') {
        const rows = await db.prepare('SELECT * FROM calligraphy_records WHERE child_id = ? ORDER BY created_at DESC LIMIT 50').all(child.id);
        return res.json({
          graphologyEnabled: Number(child.graphology_enabled ?? 1) === 1, notice: GRAPHOLOGY_NOTICE,
          records: rows.map((r: any) => ({ ...forChild(r), graphology: r.graphology ? JSON.parse(r.graphology) : null })),
        });
      }

      if (action === 'set_graphology') {
        await db.prepare('UPDATE children SET graphology_enabled = ? WHERE id = ?').run(b.enabled ? 1 : 0, child.id);
        return res.json({ status: 'success', graphologyEnabled: !!b.enabled });
      }

      return res.status(400).json({ error: 'Acción no válida' });
    } catch (e: any) {
      console.error('[CALIGRAFÍA]', e?.message);
      return res.status(500).json({ error: 'No se ha podido completar. Inténtalo de nuevo.' });
    }
  });
}
