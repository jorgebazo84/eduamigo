// Opción 9 (2ª entrega) — «Mi semana»: sustituye al Plan de Gemini.
// Junta en una vista, sin IA y guardado en el servidor: exámenes y avisos de la agenda, repasos que tocan
// cada día, tareas, fichas pendientes y temas de libros por resumir. El plan se calcula solo:
// los días antes de un examen se propone repasar ese tema.
// El niño puede apuntar sus exámenes: los padres los ven en la agenda y Repasar se adelanta.
import type express from 'express';
import crypto from 'crypto';
import { addReviewTopic, todayMadrid, addDays, normText } from './review';
import { startOfTodayMadrid } from './rewards';

type Db = any;
export interface WeekDeps {
  db: Db;
  getSession: (req: express.Request) => Promise<{ tokenHash: string; userId: string; parentUntil: number } | null>;
}

const DAYS = 14;
const EXAMS_PER_DAY = 10;
const parse = (s: any, d: any) => { try { return JSON.parse(s); } catch { return d; } };

export async function initWeekTables(db: Db) {
  try { await db.exec('ALTER TABLE calendar_events ADD COLUMN created_by VARCHAR(12)'); } catch { /* ya existe */ }
  try { await db.exec('ALTER TABLE calendar_events ADD COLUMN created_at BIGINT'); } catch { /* ya existe */ }
}

/** Con un examen nuevo, los repasos de esa asignatura que vencían después pasan al día antes del examen. */
export async function pullReviewsForExam(db: Db, childId: string, examText: string, examDate: string) {
  const today = todayMadrid();
  const dayBefore = addDays(examDate, -1);
  const target = dayBefore < today ? today : dayBefore;
  const text = normText(examText);
  if (!text || !/^\d{4}-\d{2}-\d{2}$/.test(examDate)) return 0;
  const items = await db.prepare("SELECT id, subject, due_date FROM review_items WHERE child_id = ? AND status = 'active' AND due_date > ?").all(childId, target);
  let n = 0;
  for (const it of items) {
    const s = normText(it.subject || '');
    if (!s || !text.includes(s.slice(0, 6))) continue;
    await db.prepare('UPDATE review_items SET due_date = ?, updated_at = ? WHERE id = ?').run(target, Date.now(), it.id);
    n++;
  }
  return n;
}

export async function registerWeekRoutes(app: express.Express, deps: WeekDeps) {
  const { db, getSession } = deps;
  await initWeekTables(db);
  const ownChild = (userId: string, childId: string) => db.prepare('SELECT id, name, grade FROM children WHERE id = ? AND parentId = ?').get(String(childId || ''), userId);

  app.post('/api_week.php', async (req, res) => {
    const action = String(req.query.action || '');
    const b = req.body || {};
    try {
      const session = await getSession(req);
      if (!session) return res.status(401).json({ error: 'Sesión no válida. Vuelve a iniciar sesión.', code: 'AUTH_REQUIRED' });
      const userId = session.userId;
      const child = await ownChild(userId, b.childId);
      if (!child) return res.status(404).json({ error: 'Perfil no encontrado' });
      const today = todayMadrid();
      const last = addDays(today, DAYS - 1);

      if (action === 'week') {
        const events = await db.prepare('SELECT * FROM calendar_events WHERE childId = ? AND date >= ? AND date <= ? ORDER BY date ASC').all(child.id, today, `${last}~`);
        const reviews = await db.prepare("SELECT id, subject, topic, due_date FROM review_items WHERE child_id = ? AND status = 'active' AND due_date <= ? ORDER BY due_date ASC").all(child.id, last);
        const tasks = await db.prepare('SELECT * FROM tasks WHERE childId = ? AND completed = 0 ORDER BY dueDate ASC').all(child.id);
        const wsRows = await db.prepare("SELECT data FROM worksheets WHERE child_id = ? AND status != 'corrected' ORDER BY created_at DESC LIMIT 10").all(child.id);
        const study = await db.prepare("SELECT s.id, s.topicTitle, b.title AS book, b.subject FROM study_tasks s LEFT JOIN books b ON b.id = s.bookId WHERE s.childId = ? AND COALESCE(s.status, 'pending') = 'pending' LIMIT 10").all(child.id);

        const days = Array.from({ length: DAYS }, (_, i) => {
          const day = addDays(today, i);
          const evs = events.filter((e: any) => String(e.date).slice(0, 10) === day);
          return {
            day,
            exams: evs.filter((e: any) => e.type === 'exam').map((e: any) => ({ id: e.id, title: e.title, description: e.description || '', byChild: e.created_by === 'child' })),
            events: evs.filter((e: any) => e.type !== 'exam').map((e: any) => ({ id: e.id, title: e.title, type: e.type })),
            // Hoy se incluyen los repasos atrasados
            reviews: reviews.filter((r: any) => (i === 0 ? r.due_date <= day : r.due_date === day)).map((r: any) => ({ id: r.id, subject: r.subject, topic: r.topic })),
            tasks: tasks.filter((t: any) => String(t.dueDate || '').slice(0, 10) === day || (i === 0 && String(t.dueDate || '').slice(0, 10) < day)).map((t: any) => ({ id: t.id, title: t.title })),
            plan: [] as string[],
          };
        });
        // Plan sin IA: los 3 días antes de cada examen, repasar ese examen
        days.forEach((d, i) => d.exams.forEach((ex: any) => {
          for (let k = 1; k <= 3 && i - k >= 0; k++) {
            days[i - k].plan.push(k === 1 ? `Último repaso para «${ex.title}»: haz un test del tema` : `Prepara «${ex.title}»: repasa el tema ${k === 3 ? 'con el esquema' : 'y haz un test'}`);
          }
        }));
        return res.json({
          days,
          worksheets: wsRows.map((r: any) => parse(r.data, {})).map((w: any) => ({ id: w.id, title: w.title || w.topic, subject: w.subject, status: w.status })),
          study: study.map((s: any) => ({ id: s.id, topic: s.topicTitle, book: s.book, subject: s.subject })),
        });
      }

      if (action === 'add_exam') {
        const subject = String(b.subject || '').trim().slice(0, 80);
        const topic = String(b.topic || '').trim().slice(0, 160);
        const date = String(b.date || '');
        if (subject.length < 2) return res.status(400).json({ error: 'Elige la asignatura.' });
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date < today || date > addDays(today, 180)) return res.status(400).json({ error: 'Elige una fecha a partir de hoy.' });
        const n = Number((await db.prepare("SELECT COUNT(*) AS n FROM calendar_events WHERE childId = ? AND created_by = 'child' AND created_at >= ?").get(child.id, startOfTodayMadrid()))?.n || 0);
        if (n >= EXAMS_PER_DAY) return res.status(429).json({ error: 'Ya has apuntado muchos exámenes hoy.' });
        const id = crypto.randomUUID();
        const title = `Examen de ${subject}${topic ? `: ${topic}` : ''}`;
        await db.prepare('INSERT INTO calendar_events (id, childId, title, date, type, description, notified, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
          .run(id, child.id, title, date, 'exam', `Apuntado por ${child.name}`, 0, 'child', Date.now());
        let reviewId: string | null = null;
        if (topic) reviewId = await addReviewTopic(db, { userId, childId: child.id, subject, topic, sourceType: 'exam', sourceId: id }).catch(() => null);
        const pulled = await pullReviewsForExam(db, child.id, subject, date);
        return res.json({ status: 'success', id, title, inReview: !!reviewId, pulled });
      }

      if (action === 'delete_exam') {
        const ev = await db.prepare("SELECT id FROM calendar_events WHERE id = ? AND childId = ? AND created_by = 'child'").get(String(b.id || ''), child.id);
        if (!ev) return res.status(404).json({ error: 'Solo puedes borrar los exámenes que has apuntado tú.' });
        await db.prepare('DELETE FROM calendar_events WHERE id = ?').run(ev.id);
        return res.json({ status: 'success' });
      }

      return res.status(400).json({ error: 'Acción no válida' });
    } catch (e: any) {
      console.error('[SEMANA]', e?.message);
      return res.status(500).json({ error: 'No se ha podido completar. Inténtalo de nuevo.' });
    }
  });
}
