// Opción 9 — Biblioteca en el servidor (Claude). Sustituye a Gemini en el navegador.
// - Explicación de cada tema y su ESQUEMA VISUAL imprimible: se generan una vez por curso, asignatura
//   y tema, y se comparten entre todas las familias. El esquema solo puede contener lo que dice la
//   explicación (se comprueba en el servidor y se descarta lo que no aparece en el texto).
// - Libros del cole: búsqueda por ISBN (datos del libro en Google Books y el índice buscado en
//   internet por Claude con su búsqueda web; nunca se inventa) o foto del índice en varias páginas.
import { publicErrorMessage } from './errors';
import type express from 'express';
import { isFpGrade } from '../shared/fpCatalog';
import { fpContextLine, officialContents } from '../shared/fpCurriculum';
import crypto from 'crypto';
import { callClaudeJson, setMockHandler, isMock, TUTOR_MODEL, VISION_MODEL, SEARCH_MODEL, webSearchTool, AiUnavailable } from './ai';
import { decodeImage } from './storage';
import { startOfTodayMadrid } from './rewards';

type Db = any;
export interface LibraryDeps {
  db: Db;
  getSession: (req: express.Request) => Promise<{ tokenHash: string; userId: string; parentUntil: number } | null>;
  isParentUnlocked: (s: { parentUntil: number }) => boolean;
  refreshParentWindow: (tokenHash: string) => Promise<void>;
}

const NEW_TOPICS_PER_DAY = 8;
const ISBN_SEARCHES_PER_DAY = 10;
const MAX_INDEX_PAGES = 8;

const norm = (s: string) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9ñ ]+/g, ' ').replace(/\s+/g, ' ').trim();
const str = (x: any, n: number) => String(x ?? '').trim().slice(0, n);
const parse = (s: any, d: any) => { try { return JSON.parse(s); } catch { return d; } };

// ---------------------------------------------------------------- ISBN
export function cleanIsbn(raw: string): string | null {
  const s = String(raw || '').replace(/[^0-9Xx]/g, '').toUpperCase();
  if (s.length === 13 && /^\d{13}$/.test(s)) {
    const sum = s.split('').slice(0, 12).reduce((a, d, i) => a + Number(d) * (i % 2 ? 3 : 1), 0);
    return (10 - (sum % 10)) % 10 === Number(s[12]) ? s : null;
  }
  if (s.length === 10 && /^\d{9}[\dX]$/.test(s)) {
    const sum = s.split('').reduce((a, d, i) => a + (d === 'X' ? 10 : Number(d)) * (10 - i), 0);
    return sum % 11 === 0 ? s : null;
  }
  return null;
}

async function googleBooks(isbn: string): Promise<{ title: string; publisher: string; year: string; authors: string[] } | null> {
  if (isMock()) return isbn === '9788467832808' ? { title: 'Matemáticas 3 Primaria (simulado)', publisher: 'Editorial Simulada', year: '2022', authors: [] } : null;
  try {
    const key = process.env.GOOGLE_BOOKS_API_KEY ? `&key=${encodeURIComponent(process.env.GOOGLE_BOOKS_API_KEY)}` : '';
    const r = await fetch(`https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}${key}`, { signal: AbortSignal.timeout(8000) });
    if (!r.ok) return null;
    const d: any = await r.json();
    const v = d?.items?.[0]?.volumeInfo;
    if (!v?.title) return null;
    return { title: str([v.title, v.subtitle].filter(Boolean).join(': '), 200), publisher: str(v.publisher, 100), year: str(v.publishedDate, 10), authors: (v.authors || []).slice(0, 3) };
  } catch { return null; }
}

// ---------------------------------------------------------------- esquema: solo lo que dice el texto
const STOP = new Set('para como pero porque cuando donde desde hasta entre sobre tiene tienen esta este estos estas esas esos esto eso cada todo todos todas muy mas menos tambien solo otra otro otras otros puede pueden hace hacen sus que los las del una unos unas con por sin son ser fue han hay asi'.split(' '));
const contentWords = (s: string) => norm(s).split(' ').filter((w) => w.length > 3 && !STOP.has(w));
/** Un punto del esquema vale si la mayoría de sus palabras con contenido aparecen en la explicación */
export function groundedIn(point: string, corpus: Set<string>) {
  const w = contentWords(point);
  if (!w.length) return false;
  const stem = (x: string) => x.slice(0, Math.max(4, x.length - 2));
  const stems = new Set([...corpus].map(stem));
  const hits = w.filter((x) => corpus.has(x) || stems.has(stem(x))).length;
  return hits / w.length >= 0.6;
}

export function cleanTopic(d: any) {
  const sections = (Array.isArray(d?.sections) ? d.sections : []).slice(0, 6).map((s: any) => ({ heading: str(s.heading, 100), text: str(s.text, 1500) })).filter((s: any) => s.heading && s.text);
  if (!d?.title || sections.length < 2) throw new Error('Explicación incompleta');
  const t = {
    title: str(d.title, 120), intro: str(d.intro, 600), sections,
    keyIdeas: (Array.isArray(d.keyIdeas) ? d.keyIdeas : []).slice(0, 6).map((x: any) => str(x, 200)).filter(Boolean),
    example: str(d.example, 600),
    glossary: (Array.isArray(d.glossary) ? d.glossary : []).slice(0, 8).map((g: any) => ({ term: str(g.term, 60), definition: str(g.definition, 240) })).filter((g: any) => g.term && g.definition),
    scheme: { central: '', branches: [] as { title: string; points: string[] }[] },
  };
  const corpus = new Set(contentWords([t.title, t.intro, ...t.sections.map((s) => `${s.heading} ${s.text}`), ...t.keyIdeas, t.example, ...t.glossary.map((g) => `${g.term} ${g.definition}`)].join(' ')));
  const sc = d.scheme || {};
  t.scheme.central = str(sc.central || t.title, 80);
  t.scheme.branches = (Array.isArray(sc.branches) ? sc.branches : []).slice(0, 6).map((b: any) => ({
    title: str(b.title, 60),
    points: (Array.isArray(b.points) ? b.points : []).slice(0, 5).map((p: any) => str(p, 140)).filter((p: string) => groundedIn(p, corpus)),
  })).filter((b: any) => b.title && groundedIn(b.title, corpus) && b.points.length);
  if (t.scheme.branches.length < 2) throw new Error('Esquema insuficiente');
  return t;
}

export async function initLibraryTables(db: Db) {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS library_topics (
      cache_key VARCHAR(300) PRIMARY KEY,
      grade VARCHAR(40), subject VARCHAR(80), topic VARCHAR(160),
      data TEXT NOT NULL,
      created_at BIGINT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS library_requests (
      id VARCHAR(64) PRIMARY KEY,
      child_id VARCHAR(64) NOT NULL,
      kind VARCHAR(12) NOT NULL,
      created_at BIGINT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS book_index_cache (
      isbn VARCHAR(13) PRIMARY KEY,
      data TEXT NOT NULL,
      created_at BIGINT NOT NULL
    );
  `);
}

// ---------------------------------------------------------------- respuestas simuladas (pruebas)
setMockHandler('library_topic', (_s, m) => {
  const t = (JSON.stringify(m).match(/Tema: ([^.\\]+)/) || [])[1] || 'El ciclo del agua';
  return JSON.stringify({
    title: t, intro: 'El agua del planeta se mueve sin parar entre el mar, el aire y la tierra.',
    sections: [
      { heading: 'Evaporación', text: 'El calor del sol calienta el agua de mares y ríos y la convierte en vapor que sube al aire.' },
      { heading: 'Condensación', text: 'El vapor sube, se enfría y forma gotas pequeñas que se juntan en las nubes.' },
      { heading: 'Precipitación', text: 'Cuando las gotas pesan mucho, caen como lluvia, nieve o granizo y el agua vuelve a ríos y mares.' },
    ],
    keyIdeas: ['El sol mueve el ciclo del agua.', 'El agua cambia de estado: líquido, vapor y hielo.'],
    example: 'Cuando hierves agua y la tapa se llena de gotas, ves la condensación.',
    glossary: [{ term: 'Vapor', definition: 'Agua en estado gaseoso.' }],
    scheme: { central: t, branches: [
      { title: 'Evaporación', points: ['El sol calienta el agua de mares y ríos', 'El agua se convierte en vapor'] },
      { title: 'Condensación', points: ['El vapor se enfría y forma nubes'] },
      { title: 'Precipitación', points: ['Cae como lluvia, nieve o granizo', 'Los dragones guardan el agua en cuevas'] },
      { title: 'Volcanes submarinos', points: ['Inventado: no está en el texto'] },
    ] },
  });
});
setMockHandler('book_index_search', (_s, m) => {
  const txt = JSON.stringify(m);
  if (txt.includes('9788467832808')) return JSON.stringify({ found: true, title: 'Matemáticas 3 Primaria', publisher: 'Editorial Simulada', sourceUrl: 'https://editorial-simulada.example/indice', topics: ['Números hasta el 9.999', 'Sumas y restas', 'La multiplicación', 'La división', 'Fracciones', 'Medidas'] });
  return JSON.stringify({ found: false, reason: 'No he encontrado el índice publicado.' });
});
setMockHandler('book_index_scan', (_s, m) => {
  const pages = (JSON.stringify(m).match(/"type":"image"/g) || []).length;
  return JSON.stringify({ isIndex: true, title: 'Lengua 3', topics: Array.from({ length: pages * 3 }, (_, i) => `Unidad ${i + 1}: tema de la página ${Math.floor(i / 3) + 1}`) });
});

/** Módulos de FP de Informática: la explicación cubre los contenidos oficiales del bloque y nada más */
function officialPrompt(grade: string, subject: string, topic: string) {
  const o = officialContents(grade, subject, topic);
  if (!o) return isFpGrade(grade) ? `\n${fpContextLine(grade)}` : '';
  return `\n${fpContextLine(grade)}\nContenidos oficiales de este bloque (${o.module.source}): ${o.block.contents.join('; ')}.\nExplica estos contenidos, en este orden, sin añadir apartados que no estén en la lista.`;
}

export async function registerLibraryRoutes(app: express.Express, deps: LibraryDeps) {
  const { db, getSession, isParentUnlocked, refreshParentWindow } = deps;
  await initLibraryTables(db);
  const ownChild = (userId: string, childId: string) => db.prepare('SELECT id, name, grade FROM children WHERE id = ? AND parentId = ?').get(String(childId || ''), userId);
  const usedToday = async (childId: string, kind: string) =>
    Number((await db.prepare('SELECT COUNT(*) AS n FROM library_requests WHERE child_id = ? AND kind = ? AND created_at >= ?').get(childId, kind, startOfTodayMadrid()))?.n || 0);
  const logUse = (childId: string, kind: string) => db.prepare('INSERT INTO library_requests (id, child_id, kind, created_at) VALUES (?, ?, ?, ?)').run(crypto.randomUUID(), childId, kind, Date.now());
  const PARENT_ACTIONS = new Set(['lookup_isbn', 'scan_index']);

  app.post('/api_library.php', async (req, res) => {
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

      // ------------------------------------------------ explicación + esquema de un tema
      if (action === 'topic') {
        const grade = str(b.grade || child.grade, 120);
        const subject = str(b.subject, 80);
        const topic = str(b.topic, 160);
        if (subject.length < 2 || topic.length < 2) return res.status(400).json({ error: 'Elige asignatura y tema.' });
        const key = `${norm(grade)}|${norm(subject)}|${norm(topic)}`;
        const row = await db.prepare('SELECT data FROM library_topics WHERE cache_key = ?').get(key);
        if (row) return res.json({ topic: parse(row.data, null), cached: true });
        if ((await usedToday(child.id, 'topic')) >= NEW_TOPICS_PER_DAY) return res.status(429).json({ error: 'Hoy ya has abierto muchos temas nuevos. Mañana más, o repasa los que ya tienes.', code: 'DAILY_LIMIT' });
        let data: any = null;
        let lastErr: any = null;
        for (let attempt = 0; attempt < 2 && !data; attempt++) {
          try {
            const r = await callClaudeJson({
              task: 'library_topic', model: TUTOR_MODEL(), maxTokens: 3000,
              system: isFpGrade(grade)
                ? 'Eres profesor de Formación Profesional en España y explicas los contenidos de los módulos según su currículo oficial, con claridad y rigor, para alumnado adolescente o adulto. Solo escribes contenido correcto y comprobado; si un dato es dudoso, no lo pones. El esquema resume ÚNICAMENTE lo que has escrito en la explicación, con las mismas palabras: no añade nada nuevo.'
                : 'Eres un maestro en España que explica temas del currículo (LOMLOE) con claridad y rigor, adaptado a la edad del alumno. Solo escribes contenido correcto y comprobado; si un dato es dudoso, no lo pones. El esquema resume ÚNICAMENTE lo que has escrito en la explicación, con las mismas palabras: no añade nada nuevo.',
              prompt: `Curso: ${grade}. Asignatura: ${subject}. Tema: ${topic}.${officialPrompt(grade, subject, topic)}
Devuelve JSON:
{"title": "...", "intro": "1–2 frases",
 "sections": [{"heading": "...", "text": "párrafo claro"}] (3 a 5),
 "keyIdeas": ["idea clave"] (3 a 5),
 "example": "un ejemplo de la vida diaria",
 "glossary": [{"term": "...", "definition": "..."}] (hasta 6),
 "scheme": {"central": "idea central (pocas palabras)", "branches": [{"title": "apartado", "points": ["frase corta sacada de la explicación"]}] (3 a 5 ramas, 2 a 4 puntos cada una)}}`,
            });
            data = cleanTopic(r.data);
          } catch (e) { lastErr = e; }
        }
        if (!data) {
          console.error('[BIBLIOTECA] tema:', lastErr?.message);
          return res.status(lastErr instanceof AiUnavailable ? 503 : 502).json({ error: 'No se ha podido preparar este tema ahora mismo. Inténtalo en un rato.', code: 'AI_UNAVAILABLE' });
        }
        await logUse(child.id, 'topic');
        try { await db.prepare('INSERT INTO library_topics (cache_key, grade, subject, topic, data, created_at) VALUES (?, ?, ?, ?, ?, ?)').run(key, grade, subject, topic, JSON.stringify(data), Date.now()); } catch { /* otro lo guardó antes */ }
        return res.json({ topic: data, cached: false });
      }

      // ------------------------------------------------ padres: índice de un libro por ISBN
      if (action === 'lookup_isbn') {
        const isbn = cleanIsbn(b.isbn);
        if (!isbn) return res.status(400).json({ error: 'Ese ISBN no es válido. Revisa los números (13 cifras, suele empezar por 978).' });
        const cached = await db.prepare('SELECT data FROM book_index_cache WHERE isbn = ?').get(isbn);
        if (cached) return res.json({ ...parse(cached.data, {}), isbn, cached: true });
        if ((await usedToday(child.id, 'isbn')) >= ISBN_SEARCHES_PER_DAY) return res.status(429).json({ error: 'Hoy ya se han buscado muchos libros. Prueba mañana o haz fotos del índice.', code: 'DAILY_LIMIT' });
        await logUse(child.id, 'isbn');
        const meta = await googleBooks(isbn);
        let result: any;
        try {
          const { data } = await callClaudeJson({
            task: 'book_index_search', model: SEARCH_MODEL(), maxTokens: 2500, tools: [webSearchTool(4)],
            system: 'Buscas en internet el índice (unidades o temas) de libros de texto españoles. Nunca te inventas un índice: solo lo das si lo has encontrado en una página que lo muestra (web de la editorial, catálogo, librería o documento del colegio) y corresponde a ese ISBN o a ese mismo libro y edición. Si no estás seguro, di que no lo has encontrado.',
            prompt: `ISBN: ${isbn}.${meta ? ` Datos del libro: «${meta.title}», ${meta.publisher || 'editorial desconocida'}${meta.year ? `, ${meta.year}` : ''}.` : ''} Asignatura indicada por la familia: ${str(b.subject, 80) || 'no indicada'}. Curso: ${str(b.grade || child.grade, 120)}.
Busca el índice de este libro. Devuelve JSON: {"found": true|false, "title": "...", "publisher": "...", "topics": ["Unidad 1. ...", "..."], "sourceUrl": "https://... (página donde aparece el índice)", "reason": "si no lo encuentras, por qué"}`,
          });
          result = data;
        } catch (e: any) {
          console.error('[BIBLIOTECA] ISBN:', e?.message);
          return res.status(503).json({ error: 'No se ha podido buscar el libro ahora mismo. Puedes hacer fotos del índice.', code: 'AI_UNAVAILABLE', meta });
        }
        const topics = (Array.isArray(result?.topics) ? result.topics : []).map((t: any) => str(t, 160)).filter(Boolean).slice(0, 40);
        const sourceOk = /^https?:\/\/\S+\.\S+/.test(String(result?.sourceUrl || ''));
        if (!result?.found || topics.length < 3 || !sourceOk) {
          return res.json({ found: false, isbn, meta, reason: str(result?.reason, 300) || 'No he encontrado el índice publicado de este libro.' });
        }
        const out = { found: true, title: str(result.title || meta?.title, 200), publisher: str(result.publisher || meta?.publisher, 100), topics, sourceUrl: str(result.sourceUrl, 400), meta };
        try { await db.prepare('INSERT INTO book_index_cache (isbn, data, created_at) VALUES (?, ?, ?)').run(isbn, JSON.stringify(out), Date.now()); } catch { /* ya estaba */ }
        return res.json({ ...out, isbn });
      }

      // ------------------------------------------------ padres: fotos del índice (varias páginas)
      if (action === 'scan_index') {
        const raw: string[] = Array.isArray(b.images) ? b.images : [];
        if (!raw.length) return res.status(400).json({ error: 'Haz al menos una foto del índice.' });
        if (raw.length > MAX_INDEX_PAGES) return res.status(400).json({ error: `Como máximo ${MAX_INDEX_PAGES} páginas de índice.` });
        let images;
        try { images = raw.map((x) => { const { buffer, mediaType } = decodeImage(String(x)); return { mediaType, base64: buffer.toString('base64') }; }); }
        catch (e: any) { return res.status(400).json({ error: publicErrorMessage(e, 'api_library.php') }); }
        if ((await usedToday(child.id, 'scan')) >= ISBN_SEARCHES_PER_DAY) return res.status(429).json({ error: 'Hoy ya se han escaneado muchos índices. Prueba mañana.', code: 'DAILY_LIMIT' });
        await logUse(child.id, 'scan');
        let data: any;
        try {
          ({ data } = await callClaudeJson({
            task: 'book_index_scan', model: VISION_MODEL(), maxTokens: 3000, images,
            system: 'Lees fotos del índice de un libro de texto y copias las unidades o temas exactamente como aparecen, en orden. No añades nada que no se vea. Si una foto no es un índice, la ignoras.',
            prompt: `Estas son ${images.length} foto(s) de las páginas del índice, en orden (la primera es la primera página). Junta todas las páginas en una sola lista, sin repetir unidades que salgan en dos fotos.
Devuelve JSON: {"isIndex": true|false, "title": "título del libro si se ve", "topics": ["Unidad 1. ...", "..."]}. Pon solo los títulos de unidades o temas principales (no los subapartados ni los números de página).`,
          }));
        } catch (e: any) {
          console.error('[BIBLIOTECA] índice:', e?.message);
          return res.status(503).json({ error: 'No se han podido leer las fotos ahora mismo. Inténtalo en un rato.', code: 'AI_UNAVAILABLE' });
        }
        const seen = new Set<string>();
        const topics = (Array.isArray(data?.topics) ? data.topics : []).map((t: any) => str(t, 160)).filter((t: string) => { const k = norm(t); if (!k || seen.has(k)) return false; seen.add(k); return true; }).slice(0, 40);
        if (data?.isIndex === false || topics.length < 2) return res.status(422).json({ error: 'No veo un índice en las fotos. Haz fotos de frente, con buena luz, de las páginas donde salen las unidades.', code: 'NOT_INDEX' });
        return res.json({ title: str(data.title, 200), topics, pages: images.length });
      }

      return res.status(400).json({ error: 'Acción no válida' });
    } catch (e: any) {
      console.error('[BIBLIOTECA]', e?.message);
      return res.status(500).json({ error: 'No se ha podido completar. Inténtalo de nuevo.' });
    }
  });
}
