// =============================================================================
// Tutor "Pregúntame" (v1.4.0)
// - La IA se llama SOLO desde el servidor: la clave nunca llega al navegador.
// - Proveedor: Claude (Anthropic), cuyas condiciones permiten productos para menores
//   con salvaguardas. Modelo por defecto: claude-haiku-5-5 (el más barato).
// - Capa de protección para menores antes y después del modelo.
// - Límite diario de preguntas por niño, historial en el servidor y vista de padres.
// =============================================================================
import crypto from 'crypto';
import type express from 'express';
import { isFpGrade } from '../shared/fpCatalog';
import { fpContextLine } from '../shared/fpCurriculum';
import { callClaude, setMockHandler, withImages, AiMessage, TUTOR_MODEL } from './ai';
import { savePhoto, getObject, initPhotoStorage } from './storage';
import { awardActivity, earnedToday, TUTOR_DAILY_CAP } from './rewards';

type Db = any;

export interface TutorDeps {
  db: Db;
  getSession: (req: express.Request) => Promise<{ tokenHash: string; userId: string; parentUntil: number } | null>;
  isParentUnlocked: (s: { parentUntil: number }) => boolean;
  refreshParentWindow: (tokenHash: string) => Promise<void>;
}

const DEFAULT_DAILY_LIMIT = 30;
const MAX_MESSAGE_CHARS = 1500;
const HISTORY_MESSAGES = 12;
const ANAR = 'Teléfono y chat de la Fundación ANAR: 900 20 20 10 (gratis, confidencial, 24 horas). Si estás en peligro ahora mismo, llama al 112.';

// -----------------------------------------------------------------------------
// Protección para menores
// -----------------------------------------------------------------------------
const normalize = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ');

const FAMILY = '(padre|madre|papa|mama|padrastro|madrastra|tio|tia|abuelo|abuela|hermano|hermana|primo|prima|novio de mi madre|novia de mi padre|entrenador|monitor|profe|profesor|profesora|vecino|vecina)';

const RISK_PATTERNS: { kind: 'abuso' | 'autolesion' | 'acoso'; re: RegExp }[] = [
  // Posible abuso o maltrato por un adulto cercano: NO se avisa a los padres (podría ser uno de ellos)
  { kind: 'abuso', re: new RegExp(`\\b(me (pega|pegan|toca|tocan|hace dano|hacen dano|obliga|obligan|castiga pegando)|me ha (pegado|tocado))\\b.*\\b${FAMILY}\\b`) },
  { kind: 'abuso', re: new RegExp(`\\b(mi|mis) ${FAMILY}s? (me )?(pega|pegan|toca|tocan|hace dano|hacen dano|ha pegado|ha tocado)\\b`) },
  { kind: 'abuso', re: /\b(en casa me (pegan|pega|hacen dano)|me tocan? (mis )?partes|abus(a|an|o|aron|ado) de mi|secreto con un (adulto|mayor)|no se lo digas a (mi|mis) (padres|madre|padre))\b/ },
  // Autolesiones o ideas de muerte
  { kind: 'autolesion', re: /\b(me quiero morir|quiero morirme|quiero matarme|me voy a matar|suicid\w*|no quiero vivir|no quiero seguir viviendo|hacerme dano|cortarme|me corto|me hago dano|desaparecer para siempre|mejor si no existiera)\b/ },
  // Acoso escolar
  { kind: 'acoso', re: /\b(me (pegan|pega|insultan|insulta|amenazan|amenaza|acosan|acosa|empujan|quitan las cosas)|se rien de mi|nadie quiere jugar conmigo|me hacen bullying|bullying|acoso escolar|ciberacoso)\b/ },
];

export const detectRisk = (text: string): 'abuso' | 'autolesion' | 'acoso' | null => {
  const t = normalize(text);
  for (const p of RISK_PATTERNS) if (p.re.test(t)) return p.kind;
  return null;
};

const RISK_REPLY: Record<'abuso' | 'autolesion' | 'acoso', string> = {
  abuso:
    'Gracias por contármelo. Lo que me cuentas es importante y no es culpa tuya. ' +
    'Yo soy una IA y no puedo ayudarte con esto como lo haría una persona, pero hay personas que sí pueden y que te escucharán sin juzgarte. ' +
    'Puedes hablar con un adulto de confianza, como tu profe o tu tutor del cole. ' + ANAR,
  autolesion:
    'Siento mucho que te sientas así. Lo que sientes importa y no tienes por qué pasarlo solo. ' +
    'Yo soy una IA y lo mejor es que hables ahora con un adulto de confianza: tu familia, tu profe o alguien cercano. ' + ANAR,
  acoso:
    'Siento que te esté pasando esto. Nadie tiene derecho a hacerte daño ni a reírse de ti, y no es culpa tuya. ' +
    'Cuéntaselo a un adulto de confianza: tu familia, tu tutor o tu profe pueden ayudarte a que pare. ' + ANAR,
};

// Datos personales: se tapan antes de enviarlos a la IA
const PERSONAL_PATTERNS: RegExp[] = [
  /(\+?34[\s.-]?)?[6789]\d{2}[\s.-]?\d{3}[\s.-]?\d{3}\b/g,                 // teléfonos españoles
  /[\w.+-]+@[\w-]+\.[\w.]+/g,                                              // emails
  /\b\d{8}[A-HJ-NP-TV-Z]\b/gi,                                             // DNI
  /\b[XYZ]\d{7}[A-HJ-NP-TV-Z]\b/gi,                                        // NIE
  /\b(vivo en|mi direcci[oó]n es|mi casa est[aá] en)\s+[^.,;\n]{3,60}/gi,  // dirección
  /\b(c\/|calle|avenida|avda\.?|plaza|paseo)\s+[A-ZÁÉÍÓÚÑa-záéíóúñ][^.,;\n]{2,40}\s+n?[ºo°]?\s?\d+/gi,
  /\b(mi contrase[nñ]a es|mi clave es|mi pin es)\s+\S+/gi,
];

export const redactPersonal = (text: string): { text: string; redacted: boolean } => {
  let out = text;
  for (const re of PERSONAL_PATTERNS) out = out.replace(re, '[dato personal]');
  return { text: out, redacted: out !== text };
};

const PERSONAL_NOTE = 'Un consejo: no hace falta que me digas datos personales (dirección, teléfono, contraseñas…). Los he tapado para protegerte. 😊\n\n';

// -----------------------------------------------------------------------------
// Instrucciones del tutor
// -----------------------------------------------------------------------------
const systemPrompt = (child: { name: string; grade: string; country?: string }, subject: string, region: string) => {
  const country = child.country && child.country !== 'España' ? child.country : null;
  return `Eres "EduAmigo", un tutor de estudio para niños y adolescentes en España. Hablas con ${child.name}, que está en ${child.grade}. Asignatura: ${subject || 'la que diga el alumno'}. ${isFpGrade(child.grade) ? `${fpContextLine(child.grade)} Currículo de referencia: el del título de FP (real decreto y currículo de ${region || 'España'}).` : `Currículo de referencia: LOMLOE, ${region || 'España'}.`}

QUIÉN ERES
- Eres una inteligencia artificial, no una persona. Si te preguntan, dilo con naturalidad.
- Tono cercano, paciente y alegre. Frases cortas. Vocabulario adecuado a ${child.grade}. Puedes usar algún emoji, sin abusar.
${country ? `- ${child.name} tiene raíces en ${country}: cuando ayude, usa ejemplos cotidianos de ${country} (comida, lugares, costumbres), con respeto y sin estereotipos. Mantén la terminología escolar de España.` : ''}

CÓMO ENSEÑAS (MUY IMPORTANTE)
- Por defecto GUÍAS, no resuelves: haz una pregunta o da UNA pista cada vez para que el alumno avance por sí mismo. Comprueba lo que ya sabe.
- Si te pide la solución de un ejercicio o deberes concretos, no la des directamente: explica el método con un ejemplo PARECIDO (otros números u otra frase) y anímale a aplicarlo al suyo.
- Las dudas de concepto ("¿qué es la fotosíntesis?") sí se explican directamente, de forma breve y clara, con un ejemplo.
- Cuando el alumno acierte, díselo y refuerza por qué está bien. Cuando se equivoque, sin reñir: señala dónde está el fallo y da otra pista.
- Respuestas de 2 a 6 frases. Usa listas numeradas para los pasos. No uses tablas ni enlaces.

LÍMITES
- Solo temas escolares y de estudio. Si pregunta otra cosa, reconduce con amabilidad hacia el estudio.
- Nunca pidas datos personales (nombre completo, dirección, teléfono, colegio, fotos, contraseñas). Si los da, recuérdale que no hace falta.
- Nada de contenido violento, sexual, de miedo, de dietas, de apuestas o inapropiado para menores. Nada de relaciones románticas ni de "ser su amigo secreto".
- No des consejos médicos, legales ni psicológicos. Si el alumno cuenta que está mal, que alguien le hace daño o que tiene pensamientos de hacerse daño, responde con cariño, dile que hable con un adulto de confianza y menciona el Teléfono ANAR 900 20 20 10.
- Si no sabes algo o no estás seguro, dilo y sugiere consultarlo con su profe.`;
};

const MODE_INSTRUCTION: Record<string, string> = {
  guided: '',
  explain: '\n\n[Instrucción del sistema: el alumno ha pedido la explicación completa porque no lo entiende. Explícalo paso a paso con un ejemplo parecido al suyo (no resuelvas su ejercicio exacto si es de deberes) y termina con una pregunta corta para comprobar que lo ha entendido.]',
  other_way: '\n\n[Instrucción del sistema: el alumno no ha entendido la última explicación. Explícalo de OTRA forma distinta: otra analogía, un dibujo descrito con palabras o un ejemplo de la vida diaria. Más sencillo y más corto.]',
};

export const MODE_CHILD_TEXT: Record<string, string> = {
  explain: 'No lo entiendo. ¿Me lo explicas entero?',
  other_way: '¿Me lo explicas de otra forma?',
};

// -----------------------------------------------------------------------------
// Proveedor de IA (módulo compartido server/ai.ts)
// -----------------------------------------------------------------------------
type ChatMsg = AiMessage;

// Respuesta simulada para pruebas automáticas
setMockHandler('tutor', (system, messages) => {
  const lastMsg = messages[messages.length - 1];
  const last = typeof lastMsg?.content === 'string'
    ? lastMsg.content
    : (lastMsg?.content || []).map((b: any) => (b.type === 'text' ? b.text : '[imagen]')).join(' ');
  const mode = last.includes('explicación completa') ? 'explain' : last.includes('de OTRA forma') ? 'other_way' : 'guided';
  const country = (system.match(/raíces en ([^:]+):/) || [])[1];
  const hasImage = messages.some(m => Array.isArray(m.content) && m.content.some((b: any) => b.type === 'image'));
  const visible = last.split('\n\n[Instrucción del sistema')[0];
  return `[simulado:${mode}${country ? `:${country}` : ''}${hasImage ? ':foto' : ''}] Pista para "${visible.slice(0, 80)}": ¿qué sabes ya de esto?`;
});

// Limpieza de la respuesta: sin enlaces (el niño no debe salir a webs desconocidas)
const sanitizeOutput = (text: string) =>
  text.replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, '$1').replace(/https?:\/\/\S+/g, '[enlace eliminado]').slice(0, 4000);

// Medianoche de hoy en Madrid, en milisegundos
const startOfTodayMadrid = () => {
  const now = new Date();
  const madrid = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Madrid' }));
  const offset = now.getTime() - madrid.getTime();
  madrid.setHours(0, 0, 0, 0);
  return madrid.getTime() + offset;
};

// -----------------------------------------------------------------------------
// Rutas
// -----------------------------------------------------------------------------
export async function registerTutorRoutes(app: express.Express, deps: TutorDeps) {
  const { db, getSession, isParentUnlocked, refreshParentWindow } = deps;

  await db.exec(`
    CREATE TABLE IF NOT EXISTS tutor_conversations (
      id VARCHAR(64) PRIMARY KEY,
      user_id VARCHAR(64) NOT NULL,
      child_id VARCHAR(64) NOT NULL,
      subject VARCHAR(100),
      title VARCHAR(255),
      created_at BIGINT NOT NULL,
      updated_at BIGINT NOT NULL,
      explain_requests INTEGER DEFAULT 0,
      other_way_requests INTEGER DEFAULT 0,
      user_turns INTEGER DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS tutor_messages (
      id VARCHAR(64) PRIMARY KEY,
      conversation_id VARCHAR(64) NOT NULL,
      child_id VARCHAR(64) NOT NULL,
      role VARCHAR(16) NOT NULL,
      content TEXT,
      mode VARCHAR(16),
      created_at BIGINT NOT NULL,
      hidden_from_parent INTEGER DEFAULT 0,
      safety VARCHAR(32),
      input_tokens INTEGER DEFAULT 0,
      output_tokens INTEGER DEFAULT 0,
      cache_read_tokens INTEGER DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS tutor_alerts (
      id VARCHAR(64) PRIMARY KEY,
      user_id VARCHAR(64) NOT NULL,
      child_id VARCHAR(64) NOT NULL,
      conversation_id VARCHAR(64),
      kind VARCHAR(32) NOT NULL,
      created_at BIGINT NOT NULL,
      seen INTEGER DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS tutor_reports (
      id VARCHAR(64) PRIMARY KEY,
      user_id VARCHAR(64) NOT NULL,
      child_id VARCHAR(64) NOT NULL,
      message_id VARCHAR(64) NOT NULL,
      reason TEXT,
      created_at BIGINT NOT NULL
    );
  `);
  try { await db.exec('ALTER TABLE children ADD COLUMN tutor_daily_limit INTEGER DEFAULT 30'); } catch { /* ya existe */ }
  try { await db.exec('ALTER TABLE tutor_messages ADD COLUMN photo_id VARCHAR(64)'); } catch { /* ya existe */ }
  await initPhotoStorage(db);

  const ownChild = async (userId: string, childId: string) =>
    childId ? db.prepare('SELECT id, name, grade, country, tutor_daily_limit FROM children WHERE id = ? AND parentId = ?').get(childId, userId) : null;

  const usedToday = async (childId: string) => {
    const row = await db.prepare("SELECT COUNT(*) AS n FROM tutor_messages WHERE child_id = ? AND role = 'user' AND created_at >= ?").get(childId, startOfTodayMadrid());
    return Number(row?.n || 0);
  };

  const limitOf = (child: any) => {
    const n = Number(child?.tutor_daily_limit);
    return Number.isFinite(n) && n > 0 ? n : DEFAULT_DAILY_LIMIT;
  };

  const PARENT_ACTIONS = new Set(['parent_overview', 'parent_conversation', 'mark_alerts_seen', 'set_settings']);

  app.post('/api_tutor.php', async (req, res) => {
    const action = String(req.query.action || '');
    const body = req.body || {};
    try {
      const session = await getSession(req);
      if (!session) return res.status(401).json({ error: 'Sesión no válida. Vuelve a iniciar sesión.', code: 'AUTH_REQUIRED' });
      const userId = session.userId;

      if (PARENT_ACTIONS.has(action)) {
        if (!isParentUnlocked(session)) return res.status(403).json({ error: 'Esta acción necesita el PIN de padres.', code: 'PIN_REQUIRED' });
        await refreshParentWindow(session.tokenHash);
      }

      const child = await ownChild(userId, String(body.childId || ''));
      if (!child) return res.status(404).json({ error: 'Perfil no encontrado' });

      // ---------------------------------------------------------------- ask
      if (action === 'ask') {
        const mode: 'guided' | 'explain' | 'other_way' = ['explain', 'other_way'].includes(body.mode) ? body.mode : 'guided';
        const hasImage = mode === 'guided' && typeof body.image === 'string' && body.image.length > 0;
        let message = String(mode === 'guided' ? (body.message || '') : MODE_CHILD_TEXT[mode]).trim().slice(0, MAX_MESSAGE_CHARS);
        if (!message && hasImage) message = 'No sé hacer este ejercicio. ¿Me ayudas?';
        if (!message) throw new Error('Escribe tu pregunta.');
        const subject = String(body.subject || '').slice(0, 100);
        const region = String(body.region || '').slice(0, 60);

        const limit = limitOf(child);
        const used = await usedToday(child.id);
        if (used >= limit) {
          return res.status(429).json({
            error: `Hoy ya has hecho tus ${limit} preguntas. ¡Buen trabajo! Mañana podrás seguir preguntando.`,
            code: 'DAILY_LIMIT', used, limit,
          });
        }

        const risk = mode === 'guided' ? detectRisk(message) : null;
        const hidden = risk === 'abuso' ? 1 : 0;

        // Conversación: existente (de este niño) o nueva
        let conversationId = String(body.conversationId || '');
        const now = Date.now();
        if (conversationId) {
          const conv = await db.prepare('SELECT id FROM tutor_conversations WHERE id = ? AND child_id = ? AND user_id = ?').get(conversationId, child.id, userId);
          if (!conv) conversationId = '';
        }
        // La foto solo se admite al empezar una pregunta nueva ("No sé hacer este ejercicio")
        if (hasImage && conversationId) conversationId = '';
        let newConversation = false;
        if (!conversationId) {
          if (mode !== 'guided') throw new Error('Primero escribe tu pregunta.');
          conversationId = crypto.randomUUID();
          newConversation = true;
          await db.prepare('INSERT INTO tutor_conversations (id, user_id, child_id, subject, title, created_at, updated_at, explain_requests, other_way_requests, user_turns) VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0, 0)')
            // El título nunca revela un mensaje protegido
            .run(conversationId, userId, child.id, subject, hidden ? 'Conversación' : redactPersonal(message).text.slice(0, 120), now, now);
        }

        const { text: safeText, redacted } = redactPersonal(message);

        let photoId: string | null = null;
        if (hasImage) {
          const photo = await savePhoto(db, { userId, childId: child.id, kind: 'tutor', image: String(body.image), thumb: body.thumb });
          photoId = photo.id;
        }
        const userMsgId = crypto.randomUUID();
        await db.prepare('INSERT INTO tutor_messages (id, conversation_id, child_id, role, content, mode, created_at, hidden_from_parent, safety, photo_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
          .run(userMsgId, conversationId, child.id, 'user', safeText, mode, now, hidden, risk || (redacted ? 'datos_personales' : null), photoId);
        await db.prepare(`UPDATE tutor_conversations SET updated_at = ?, user_turns = user_turns + 1,
            explain_requests = explain_requests + ?, other_way_requests = other_way_requests + ? WHERE id = ?`)
          .run(now, mode === 'explain' ? 1 : 0, mode === 'other_way' ? 1 : 0, conversationId);

        let reply: string;
        let usage = { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0 };
        if (risk) {
          // Respuesta fija: no se envía a la IA. Aviso a los padres salvo posible abuso en el entorno cercano.
          reply = RISK_REPLY[risk];
          if (risk !== 'abuso') {
            await db.prepare('INSERT INTO tutor_alerts (id, user_id, child_id, conversation_id, kind, created_at, seen) VALUES (?, ?, ?, ?, ?, ?, 0)')
              .run(crypto.randomUUID(), userId, child.id, conversationId, risk, now);
          }
        } else {
          // Historial reciente, sin los intercambios de riesgo (esos no se envían a la IA)
          const rows = await db.prepare("SELECT role, content, mode, safety, photo_id FROM tutor_messages WHERE conversation_id = ? AND (safety IS NULL OR safety = 'datos_personales') ORDER BY created_at DESC LIMIT ?").all(conversationId, HISTORY_MESSAGES);
          rows.reverse();
          // La foto del ejercicio (si la hay) acompaña al primer mensaje en el que se envió
          const photoRow = rows.find((r: any) => r.photo_id);
          let photoBlock: { mediaType: any; base64: string } | null = null;
          if (photoRow) {
            const prow = await db.prepare('SELECT object_key, media_type, deleted FROM photos WHERE id = ? AND user_id = ?').get(photoRow.photo_id, userId);
            const buf = prow && !Number(prow.deleted) ? await getObject(prow.object_key) : null;
            if (buf) photoBlock = { mediaType: prow.media_type, base64: buf.toString('base64') };
          }
          const lastIdx = rows.length - 1;
          const history: ChatMsg[] = rows.map((r: any, i: number) => {
            let text = r.content;
            if (i === lastIdx && r.role === 'user') text += MODE_INSTRUCTION[mode] || ''; // instrucción del botón pulsado
            if (r.photo_id && photoBlock) {
              text = `[El alumno ha enviado una foto del ejercicio. Ayúdale a entender cómo hacerlo, paso a paso y sin resolverlo por él.]\n${text}`;
              return { role: r.role, content: withImages(text, [photoBlock]) };
            }
            return { role: r.role, content: text };
          });
          // La API exige que la conversación empiece por el alumno
          while (history.length && history[0].role !== 'user') history.shift();
          try {
            const ai = await callClaude({ system: systemPrompt(child, subject, region), messages: history, model: TUTOR_MODEL(), maxTokens: 700, task: 'tutor' });
            reply = sanitizeOutput(ai.text) || 'Vaya, no se me ha ocurrido nada. ¿Me lo preguntas de otra forma?';
            usage = ai;
          } catch (e) {
            // Se borra la pregunta para que no cuente en el límite si el tutor no ha respondido
            await db.prepare('DELETE FROM tutor_messages WHERE id = ?').run(userMsgId);
            await db.prepare('UPDATE tutor_conversations SET user_turns = user_turns - 1 WHERE id = ?').run(conversationId);
            return res.status(503).json({ error: 'El tutor no está disponible ahora mismo. Inténtalo en un rato.', code: 'TUTOR_UNAVAILABLE', conversationId });
          }
          if (redacted) reply = PERSONAL_NOTE + reply;
        }

        const replyId = crypto.randomUUID();
        await db.prepare('INSERT INTO tutor_messages (id, conversation_id, child_id, role, content, mode, created_at, hidden_from_parent, safety, input_tokens, output_tokens, cache_read_tokens) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
          .run(replyId, conversationId, child.id, 'assistant', reply, mode, Date.now(), hidden, risk, usage.inputTokens, usage.outputTokens, usage.cacheReadTokens);
        // Puntos por preguntar dudas (5 por pregunta nueva, máximo 20 al día). Los mensajes de riesgo no dan puntos.
        let tutorPoints: { awarded: number; newPoints: number } | null = null;
        if (newConversation && !risk) {
          const already = await earnedToday(db, child.id, 'tutor');
          tutorPoints = await awardActivity(db, { userId, childId: child.id, points: Math.max(0, Math.min(5, TUTOR_DAILY_CAP - already)), source: 'tutor', label: 'Pregunta al tutor', refId: conversationId });
        }
        if (usage.inputTokens || usage.outputTokens) {
          console.log(`[TUTOR] child=${child.id.slice(0, 8)} in=${usage.inputTokens} cache=${usage.cacheReadTokens} out=${usage.outputTokens}`);
        }
        return res.json({
          status: 'success', conversationId,
          userMessage: { id: userMsgId, role: 'user', content: safeText, mode, photoUrl: photoId ? `api_photo.php?id=${photoId}` : undefined },
          reply: { id: replyId, role: 'assistant', content: reply, safety: risk },
          used: used + 1, limit,
          ...(tutorPoints ? { pointsAwarded: tutorPoints.awarded, newPoints: tutorPoints.newPoints } : {}),
        });
      }

      // ---------------------------------------------------------------- usage
      if (action === 'usage') {
        return res.json({ used: await usedToday(child.id), limit: limitOf(child) });
      }

      // ---------------------------------------------------------------- conversations (vista del niño)
      if (action === 'conversations') {
        const rows = await db.prepare('SELECT id, subject, title, updated_at FROM tutor_conversations WHERE child_id = ? AND user_id = ? ORDER BY updated_at DESC LIMIT 30').all(child.id, userId);
        return res.json(rows.map((r: any) => ({ id: r.id, subject: r.subject, title: r.title, updatedAt: Number(r.updated_at) })));
      }

      if (action === 'conversation') {
        const conv = await db.prepare('SELECT * FROM tutor_conversations WHERE id = ? AND child_id = ? AND user_id = ?').get(String(body.conversationId || ''), child.id, userId);
        if (!conv) return res.status(404).json({ error: 'Conversación no encontrada' });
        const msgs = await db.prepare('SELECT id, role, content, mode, safety, photo_id FROM tutor_messages WHERE conversation_id = ? ORDER BY created_at ASC').all(conv.id);
        return res.json({ id: conv.id, subject: conv.subject, title: conv.title, messages: msgs.map((m: any) => ({ ...m, photoUrl: m.photo_id ? `api_photo.php?id=${m.photo_id}` : undefined })) });
      }

      // ---------------------------------------------------------------- report ("Esto está mal")
      if (action === 'report') {
        const msg = await db.prepare("SELECT id FROM tutor_messages WHERE id = ? AND child_id = ? AND role = 'assistant'").get(String(body.messageId || ''), child.id);
        if (!msg) return res.status(404).json({ error: 'Mensaje no encontrado' });
        await db.prepare('INSERT INTO tutor_reports (id, user_id, child_id, message_id, reason, created_at) VALUES (?, ?, ?, ?, ?, ?)')
          .run(crypto.randomUUID(), userId, child.id, msg.id, String(body.reason || '').slice(0, 500), Date.now());
        console.log(`[TUTOR] Respuesta marcada como incorrecta: ${msg.id}`);
        return res.json({ status: 'success' });
      }

      // ---------------------------------------------------------------- padres
      if (action === 'parent_overview') {
        // Solo conversaciones con algo visible para los padres (las protegidas no aparecen)
        const conversations = await db.prepare('SELECT * FROM tutor_conversations c WHERE c.child_id = ? AND c.user_id = ? AND EXISTS (SELECT 1 FROM tutor_messages m WHERE m.conversation_id = c.id AND m.hidden_from_parent = 0) ORDER BY c.updated_at DESC LIMIT 50').all(child.id, userId);
        const alerts = await db.prepare('SELECT id, kind, created_at, seen, conversation_id FROM tutor_alerts WHERE child_id = ? AND user_id = ? ORDER BY created_at DESC LIMIT 20').all(child.id, userId);
        const reports = await db.prepare('SELECT r.id, r.created_at, r.reason, m.content FROM tutor_reports r JOIN tutor_messages m ON m.id = r.message_id WHERE r.child_id = ? AND r.user_id = ? AND m.hidden_from_parent = 0 ORDER BY r.created_at DESC LIMIT 20').all(child.id, userId);
        const weekAgo = Date.now() - 7 * 24 * 3600 * 1000;
        const weekRow = await db.prepare("SELECT COUNT(*) AS n FROM tutor_messages WHERE child_id = ? AND role = 'user' AND created_at >= ?").get(child.id, weekAgo);
        return res.json({
          settings: { dailyLimit: limitOf(child), country: child.country || 'España' },
          usage: { today: await usedToday(child.id), week: Number(weekRow?.n || 0) },
          alerts: alerts.map((a: any) => ({ id: a.id, kind: a.kind, createdAt: Number(a.created_at), seen: !!Number(a.seen), conversationId: a.conversation_id })),
          reports: reports.map((r: any) => ({ id: r.id, createdAt: Number(r.created_at), reason: r.reason, content: r.content })),
          conversations: conversations.map((c: any) => {
            const turns = Number(c.user_turns) || 0;
            const explain = Number(c.explain_requests) || 0;
            const otherWay = Number(c.other_way_requests) || 0;
            return {
              id: c.id, subject: c.subject, title: c.title, updatedAt: Number(c.updated_at),
              turns, explainRequests: explain, otherWayRequests: otherWay,
              // Señales objetivas (sin adivinar emociones)
              stuck: explain + otherWay >= 2,
              solvedWithHints: turns >= 2 && explain === 0,
            };
          }),
        });
      }

      if (action === 'parent_conversation') {
        const conv = await db.prepare('SELECT * FROM tutor_conversations WHERE id = ? AND child_id = ? AND user_id = ?').get(String(body.conversationId || ''), child.id, userId);
        if (!conv) return res.status(404).json({ error: 'Conversación no encontrada' });
        const msgs = (await db.prepare('SELECT id, role, content, mode, safety, photo_id FROM tutor_messages WHERE conversation_id = ? AND hidden_from_parent = 0 ORDER BY created_at ASC').all(conv.id))
          .map((m: any) => ({ ...m, photoUrl: m.photo_id ? `api_photo.php?id=${m.photo_id}` : undefined }));
        if (!msgs.length) return res.status(404).json({ error: 'Conversación no encontrada' });
        return res.json({ id: conv.id, subject: conv.subject, title: conv.title, messages: msgs });
      }

      if (action === 'mark_alerts_seen') {
        await db.prepare('UPDATE tutor_alerts SET seen = 1 WHERE child_id = ? AND user_id = ?').run(child.id, userId);
        return res.json({ status: 'success' });
      }

      if (action === 'set_settings') {
        const limit = Math.round(Number(body.dailyLimit));
        if (!Number.isFinite(limit) || limit < 1 || limit > 200) throw new Error('El límite debe estar entre 1 y 200 preguntas al día.');
        const country = String(body.country || 'España').slice(0, 50);
        await db.prepare('UPDATE children SET tutor_daily_limit = ?, country = ? WHERE id = ? AND parentId = ?').run(limit, country, child.id, userId);
        return res.json({ status: 'success' });
      }

      return res.status(400).json({ error: 'Acción no válida' });
    } catch (e: any) {
      return res.status(400).json({ error: e?.message || 'Error' });
    }
  });

  // Avisos sin leer de toda la familia (para el globo del botón Padres). No muestra contenido.
  app.post('/api_tutor_alerts.php', async (req, res) => {
    const session = await getSession(req);
    if (!session) return res.status(401).json({ error: 'Sin sesión', code: 'AUTH_REQUIRED' });
    const row = await db.prepare('SELECT COUNT(*) AS n FROM tutor_alerts WHERE user_id = ? AND seen = 0').get(session.userId);
    res.json({ unseen: Number(row?.n || 0) });
  });
}
