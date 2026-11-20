// =============================================================================
// Deberes & Fichas (v1.5.0) — todo en el servidor
// - Fichas A4: las de matemáticas de operaciones se generan SIN IA (gratis, solución calculada);
//   problemas con enunciado y el resto de asignaturas, con Claude.
// - Corrección de fichas y deberes por foto con Claude (VISION_MODEL). En las fichas de
//   operaciones, la IA solo LEE lo que escribió el niño: si está bien o mal lo decide el código.
// - Nunca se inventa una nota: si la IA falla, se devuelve un error y no se guarda nada.
// - El niño ve qué está mal y una pista; la solución solo la ven los padres (con PIN).
// - Fotos guardadas 365 días (ver server/storage.ts) y límite diario de correcciones por niño.
// =============================================================================
import { publicErrorMessage } from './errors';
import crypto from 'crypto';
import { awardActivity } from './rewards';
import { academicGrade } from '../shared/grades';
import type express from 'express';
import QRCode from 'qrcode';
import { callClaudeJson, setMockHandler, VISION_MODEL, TUTOR_MODEL } from './ai';
import { addReviewTopic } from './review';
import { savePhoto, getObject, deleteObject, initPhotoStorage, purgeExpiredPhotos } from './storage';

type Db = any;
export interface WorksheetDeps {
  db: Db;
  getSession: (req: express.Request) => Promise<{ tokenHash: string; userId: string; parentUntil: number } | null>;
  isParentUnlocked: (s: { parentUntil: number }) => boolean;
  refreshParentWindow: (tokenHash: string) => Promise<void>;
}

const DEFAULT_CORRECTION_LIMIT = 10;

// -----------------------------------------------------------------------------
// Utilidades
// -----------------------------------------------------------------------------
const rnd = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];
/** Número sin separador de miles y con coma decimal (formato escolar español) */
const fmt = (n: number, decimals = 0) => (decimals ? n.toFixed(decimals).replace('.', ',') : String(Math.round(n)));
const gradeNum = (rawGrade: string) => {
  const grade = academicGrade(rawGrade);
  const m = String(grade).match(/(\d)/);
  const n = m ? Number(m[1]) : 4;
  return /ESO|Bachiller/i.test(grade) ? 6 + n : n; // 1º ESO -> 7
};
const todayEs = () => new Date().toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Europe/Madrid' });
const newId = (prefix: string) => `${prefix}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

// Normaliza una respuesta numérica escrita por un niño: "1.234" -> 1234, "12,5" -> 12.5, "R: 3" ...
export const parseNumber = (s: any): number | null => {
  if (s === null || s === undefined) return null;
  let t = String(s).trim().toLowerCase().replace(/\s+/g, '');
  t = t.replace(/^(resultado|solucion|solución|sol|r)[:=]?/, '');
  if (/^-?\d{1,3}(\.\d{3})+(,\d+)?$/.test(t)) t = t.replace(/\./g, ''); // puntos de miles
  t = t.replace(',', '.');
  const m = t.match(/^-?\d+(\.\d+)?$/);
  return m ? Number(t) : null;
};

const fractionEq = (a: string, b: string) => {
  const p = (x: string) => {
    const m = String(x).replace(/\s/g, '').match(/^(-?\d+)\/(\d+)$/);
    return m ? Number(m[1]) / Number(m[2]) : parseNumber(x);
  };
  const x = p(a), y = p(b);
  return x !== null && y !== null && Math.abs(x - y) < 1e-9;
};

// -----------------------------------------------------------------------------
// Generador de matemáticas SIN IA
// -----------------------------------------------------------------------------
export type MathKind =
  | 'remainder_zero_single_digit' | 'with_remainder_single_digit' | 'two_digits' | 'decimals'
  | 'sums_carry' | 'subtractions_borrow' | 'multiplications' | 'times_tables'
  | 'mixed_operations' | 'fractions_decimals';

export const LOCAL_MATH_KINDS = new Set<string>(['remainder_zero_single_digit', 'with_remainder_single_digit', 'two_digits', 'decimals',
  'sums_carry', 'subtractions_borrow', 'multiplications', 'times_tables', 'mixed_operations', 'fractions_decimals']);

const SUBTITLES: Record<string, string> = {
  remainder_zero_single_digit: 'Divisiones exactas (resto 0) con divisor de una cifra',
  with_remainder_single_digit: 'Divisiones con resto y divisor de una cifra',
  two_digits: 'Divisiones con divisor de dos cifras',
  decimals: 'Divisiones con decimales en el dividendo',
  sums_carry: 'Sumas con llevadas',
  subtractions_borrow: 'Restas con llevadas',
  multiplications: 'Multiplicaciones',
  times_tables: 'Tablas de multiplicar',
  mixed_operations: 'Operaciones: sumas, restas y multiplicaciones',
  fractions_decimals: 'Fracciones y números decimales',
};

export function generateMathExercises(kind: MathKind, count: number, grade: string, opts: { includeZeroInQuotient?: boolean; subtractionsMethod?: string } = {}) {
  const g = gradeNum(grade);
  const ex: any[] = [];
  const div = (dividend: number, divisor: number, quotient: number, remainder: number, i: number, label?: string) => ex.push({
    index: i + 1, prompt: label || `${fmt(dividend)} ÷ ${divisor}`, dividend, divisor,
    expectedQuotient: quotient, expectedRemainder: remainder,
    expectedAnswer: remainder ? `Cociente ${quotient}, resto ${remainder}` : String(quotient),
    verticalStepsHint: `Cociente: ${quotient}, Resto: ${remainder}.`, gridRows: 12, exerciseType: 'math_operation', operation: 'division',
  });
  const op = (prompt: string, answer: string, i: number, operation: string) => ex.push({
    index: i + 1, prompt, expectedAnswer: answer, gridRows: 8, exerciseType: 'math_operation', operation,
  });

  for (let i = 0; i < count; i++) {
    const k: MathKind = kind === 'mixed_operations' ? (['sums_carry', 'subtractions_borrow', 'multiplications'] as MathKind[])[i % 3] : kind;
    switch (k) {
      case 'remainder_zero_single_digit': {
        const divisor = pick([2, 3, 4, 5, 6, 7, 8, 9].filter(d => g >= 4 || d <= 5));
        let quotient = g >= 4 ? rnd(120, 2400) : rnd(12, 240);
        if (opts.includeZeroInQuotient && i % 2 === 1) quotient = g >= 4 ? rnd(1, 8) * 1000 + rnd(1, 9) * 10 + rnd(1, 9) : rnd(1, 9) * 100 + rnd(1, 9);
        div(quotient * divisor, divisor, quotient, 0, i);
        break;
      }
      case 'with_remainder_single_digit': {
        const divisor = rnd(3, 9);
        const quotient = g >= 4 ? rnd(100, 1500) : rnd(10, 150);
        const remainder = rnd(1, divisor - 1);
        div(quotient * divisor + remainder, divisor, quotient, remainder, i);
        break;
      }
      case 'two_digits': {
        const divisor = rnd(12, 79);
        const quotient = rnd(15, 250);
        const remainder = rnd(0, divisor - 1);
        div(quotient * divisor + remainder, divisor, quotient, remainder, i);
        break;
      }
      case 'decimals': {
        const divisor = rnd(2, 9);
        const q10 = rnd(105, 999);            // cociente con un decimal (x10)
        const dividend10 = q10 * divisor;     // dividendo con un decimal (x10), división exacta
        const prompt = `${fmt(dividend10 / 10, 1)} ÷ ${divisor}`;
        ex.push({ index: i + 1, prompt, divisor, expectedAnswer: fmt(q10 / 10, 1), gridRows: 12, exerciseType: 'math_operation', operation: 'division_decimal' });
        break;
      }
      case 'sums_carry': {
        const max = g <= 2 ? 99 : g === 3 ? 999 : 9999;
        let a = rnd(Math.ceil(max / 3), max), b = rnd(Math.ceil(max / 4), max);
        if ((a % 10) + (b % 10) < 10) b += 10 - ((a % 10) + (b % 10)); // garantiza al menos una llevada
        op(`${fmt(a)} + ${fmt(b)} =`, fmt(a + b), i, 'sum');
        break;
      }
      case 'subtractions_borrow': {
        const max = g <= 2 ? 99 : g === 3 ? 999 : 9999;
        let a = rnd(Math.ceil(max / 2), max), b = rnd(Math.ceil(max / 5), a - 1);
        if (a % 10 >= b % 10) { b = b - (b % 10) + Math.min(9, (a % 10) + 1 + rnd(0, 8 - Math.min(8, a % 10))); if (b >= a) b = a - 11; }
        op(`${fmt(a)} − ${fmt(b)} =`, fmt(a - b), i, 'subtraction');
        break;
      }
      case 'multiplications': {
        const a = g <= 3 ? rnd(12, 99) : g === 4 ? rnd(101, 999) : rnd(120, 999);
        const b = g <= 4 ? rnd(2, 9) : rnd(12, 79);
        op(`${fmt(a)} × ${b} =`, fmt(a * b), i, 'multiplication');
        break;
      }
      case 'times_tables': {
        const a = rnd(2, 9), b = rnd(2, 10);
        op(`${a} × ${b} =`, fmt(a * b), i, 'multiplication');
        break;
      }
      case 'fractions_decimals': {
        if (i % 2 === 0) {
          const d = pick([4, 5, 6, 8, 10]);
          const a = rnd(1, d - 2), b = rnd(1, d - a - 1);
          const minus = i % 4 === 2 && a > b;
          op(`${a}/${d} ${minus ? '−' : '+'} ${b}/${d} =`, `${minus ? a - b : a + b}/${d}`, i, 'fraction');
        } else {
          const a = rnd(105, 999) / 10, b = rnd(105, 999) / 100;
          op(`${fmt(a, 1)} + ${fmt(b, 2)} =`, fmt(a + b, 2), i, 'decimal');
        }
        break;
      }
    }
  }
  return ex;
}

// -----------------------------------------------------------------------------
// Prompts de IA
// -----------------------------------------------------------------------------
const CHILD_SAFE = `El alumno es menor de edad: lenguaje cercano, positivo y adecuado a su curso; sin datos personales; nada inadecuado para menores.`;

const generationPrompt = (p: any) => `Crea una ficha escolar A4 para imprimir y resolver a lápiz.
Alumno de ${p.grade}. Asignatura: ${p.subject}. ${p.bookTitle ? `Libro de texto: ${p.bookTitle}.` : ''}
Tema / lo que pide la familia: ${p.topic}
Tipo de actividad: ${p.activityType || 'general'}. Dificultad: ${p.difficultyLevel || 'estándar'}.
${p.parentNotes ? `Notas de la familia: ${p.parentNotes}` : ''}
Número de ejercicios: exactamente ${p.count}.
Reglas:
- Currículo LOMLOE de España, adecuado a ${p.grade}. ${CHILD_SAFE}
- En matemáticas nunca uses punto como separador de miles (8496, no 8.496) y usa coma decimal.
- Si la actividad es de comprensión lectora, incluye un texto breve en "readingContext" (máx. 180 palabras; en inglés si la asignatura es Inglés).
Formato JSON:
{"readingContext": string | null,
 "exercises": [{"prompt": "enunciado", "subprompt": "indicación breve o null", "expectedAnswer": "respuesta modelo breve", "linesCount": número de renglones (2-6)}]}`;

const worksheetCorrectionPrompt = (ws: any) => {
  const list = ws.exercises.map((e: any) => `#${e.index}: ${e.prompt}${e.expectedAnswer ? ` | respuesta esperada: ${e.expectedAnswer}` : ''}`).join('\n');
  return `Corrige la foto de esta ficha resuelta a mano por un alumno de ${ws.grade}.
Asignatura: ${ws.subject}. Tema: ${ws.topic}.
${ws.readingContext ? `Texto de lectura de la ficha:\n${ws.readingContext}\n` : ''}Ejercicios de la ficha:
${list}

Instrucciones:
- Lee con cuidado lo que ha escrito el alumno en cada ejercicio. Si algo NO se lee con claridad, escribe en "studentAnswer" exactamente "ILEGIBLE" y no adivines.
- En matemáticas, transcribe en "studentAnswer" solo el resultado final que escribió (en divisiones: "cociente, resto").
- "stepAnalysis": para los padres, qué hizo bien o en qué paso falló (puede incluir la solución).
- "feedback": para el niño, cariñoso y SIN decir la respuesta correcta.
- "hint": para el niño, una pista para que lo vuelva a intentar, SIN dar la solución.
- ${CHILD_SAFE}
Formato JSON:
{"summaryDiagnosis": string, "pedagogicalInsight": string, "areasToReinforce": [string], "suggestedReinforcementTopic": string,
 "exerciseCorrections": [{"index": number, "isCorrect": boolean, "studentAnswer": string, "stepAnalysis": string, "feedback": string, "hint": string,
   "errorType": "subtraction_error|quotient_selection|zero_to_quotient|bring_down_digit|spelling_grammar|concept_error|none"}]}`;
};

const homeworkPrompt = (p: any) => `Corrige la foto de los deberes o el cuaderno de un alumno de ${p.grade}.
${p.subject ? `Asignatura indicada: ${p.subject}.` : 'Detecta la asignatura.'} ${p.bookTitle ? `Libro: ${p.bookTitle}.` : ''} ${p.notes ? `Contexto: ${p.notes}` : ''}
${p.clarificationsText}
NO INVENTES lo que pone el papel. Si un número o palabra no se lee con claridad (borrón, tachado, cortado):
- marca "hasReadingDoubts": true, añade una pregunta corta en "clarificationQuestions" (con "unclearSnippet" y "suggestedOptions" si hay alternativas)
- y en ese ejercicio pon "isAmbiguousOrUnclear": true y explica la duda en "unclearReason".
Si todo se lee bien: "hasReadingDoubts": false y "clarificationQuestions": [].
Para cada ejercicio visible:
- "statement", "studentAnswer" (transcripción fiel), "correctSolution" (para los padres), "status": "correct" | "partial" | "incorrect",
- "rootError" (si falló, tipo de error sin dar la solución), "teacherExplanation" (para los padres),
- "hint": pista para el niño SIN dar la solución.
Además:
- "whatChildIsMissing" (2-4 líneas, con empatía), "summaryDiagnosis" (para los padres), "detectedSubject", "detectedTopic".
- "remedialGuide": guía para imprimir adaptada a ${p.grade}, usando ejemplos PARECIDOS (no los mismos ejercicios de la foto):
  {"title", "gradeAdaptedSummary", "coreConcepts": [{"concept","explanation","stepByStepExample","memoryTip"}], "mistakesAnalysis": [{"errorIdentified","whyItHappens","howToAvoidIt"}], "congratulationAndAdvice"}
- "reinforcementExercises": 4 a 6 ejercicios NUEVOS para practicar lo que falló: [{"prompt","subprompt","expectedAnswer","linesCount"}]
- ${CHILD_SAFE}
Responde con un JSON con exactamente esas claves.`;

// -----------------------------------------------------------------------------
// Modo simulado (pruebas automáticas)
// -----------------------------------------------------------------------------
setMockHandler('worksheet_generate', (_s, messages) => {
  const text = String((messages[0]?.content as any) || '');
  const n = Number((text.match(/exactamente (\d+)/) || [])[1]) || 4;
  return JSON.stringify({
    readingContext: /comprensi/i.test(text) ? 'Texto simulado de lectura.' : null,
    exercises: Array.from({ length: n }, (_, i) => ({ prompt: `Pregunta simulada ${i + 1}`, subprompt: null, expectedAnswer: `Respuesta ${i + 1}`, linesCount: 3 })),
  });
});
setMockHandler('worksheet_correct', (_s, messages) => {
  const text = (messages[0]?.content as any[]).find((b: any) => b.type === 'text')?.text || '';
  const items = [...text.matchAll(/#(\d+): ([^|\n]+)(?:\| respuesta esperada: ([^\n]+))?/g)];
  // Simula: acierta los impares y falla los pares
  return JSON.stringify({
    summaryDiagnosis: 'Diagnóstico simulado', pedagogicalInsight: 'Observación simulada', areasToReinforce: ['Repasar llevadas'], suggestedReinforcementTopic: 'Llevadas',
    exerciseCorrections: items.map(m => {
      const idx = Number(m[1]); const expected = (m[3] || '').trim();
      const ok = idx % 2 === 1;
      return { index: idx, isCorrect: ok, studentAnswer: ok ? expected : '1', stepAnalysis: `Análisis para padres #${idx} (solución ${expected})`, feedback: ok ? '¡Bien!' : 'Casi, revisa el paso final', hint: 'Revisa la llevada de las decenas', errorType: ok ? 'none' : 'concept_error' };
    }),
  });
});
setMockHandler('homework_correct', (_s, messages) => {
  const text = (messages[0]?.content as any[]).find((b: any) => b.type === 'text')?.text || '';
  const clarified = text.includes('ACLARACIONES CONFIRMADAS');
  return JSON.stringify({
    detectedSubject: 'Matemáticas', detectedTopic: 'Sumas', summaryDiagnosis: 'Resumen simulado para padres', whatChildIsMissing: 'Le cuestan las llevadas',
    hasReadingDoubts: !clarified,
    clarificationQuestions: clarified ? [] : [{ exerciseIndex: 2, question: '¿Has escrito 45 o 46?', unclearSnippet: '4?', suggestedOptions: ['45', '46'] }],
    exercises: [
      { index: 1, statement: '23 + 19', studentAnswer: '42', correctSolution: '42', status: 'correct', teacherExplanation: 'Correcto', hint: '¡Bien hecho!' },
      { index: 2, statement: '27 + 19', studentAnswer: clarified ? '45' : '4?', correctSolution: '46 (7+9=16, me llevo 1)', status: 'incorrect', rootError: 'Olvidó la llevada', teacherExplanation: 'Solución: 46', hint: 'Mira qué pasa al sumar las unidades', isAmbiguousOrUnclear: !clarified, unclearReason: clarified ? undefined : 'Borrón en la cifra de las unidades' },
    ],
    remedialGuide: { title: 'Guía simulada', gradeAdaptedSummary: 'Resumen', coreConcepts: [{ concept: 'Llevadas', explanation: 'Explicación', stepByStepExample: '18 + 25', memoryTip: 'Truco' }], mistakesAnalysis: [{ errorIdentified: 'Llevada', whyItHappens: 'Prisa', howToAvoidIt: 'Ir despacio' }], congratulationAndAdvice: '¡Ánimo!' },
    reinforcementExercises: [1, 2, 3, 4].map(i => ({ prompt: `${30 + i} + ${18 + i} =`, subprompt: null, expectedAnswer: String(48 + 2 * i), linesCount: 2 })),
  });
});

// -----------------------------------------------------------------------------
// Vista del niño: se quitan las soluciones
// -----------------------------------------------------------------------------
const stripExercise = (e: any) => {
  const { expectedQuotient, expectedRemainder, expectedAnswer, verticalStepsHint, ...rest } = e;
  return rest;
};
export const worksheetForChild = (ws: any) => ({
  ...ws,
  exercises: (ws.exercises || []).map(stripExercise),
  correction: ws.correction ? {
    ...ws.correction,
    exerciseCorrections: (ws.correction.exerciseCorrections || []).map(({ stepAnalysis, ...c }: any) => c),
  } : undefined,
});
export const homeworkForChild = (hw: any) => ({
  ...hw,
  exercises: (hw.exercises || []).map(({ correctSolution, teacherExplanation, ...e }: any) => e),
  summaryDiagnosis: undefined,
  reinforcementWorksheet: hw.reinforcementWorksheet ? worksheetForChild(hw.reinforcementWorksheet) : undefined,
});

// -----------------------------------------------------------------------------
// Rutas
// -----------------------------------------------------------------------------
export async function registerWorksheetRoutes(app: express.Express, deps: WorksheetDeps) {
  const { db, getSession, isParentUnlocked, refreshParentWindow } = deps;
  await initPhotoStorage(db);
  await db.exec(`
    CREATE TABLE IF NOT EXISTS worksheets (
      id VARCHAR(64) PRIMARY KEY,
      user_id VARCHAR(64) NOT NULL,
      child_id VARCHAR(64) NOT NULL,
      data TEXT NOT NULL,
      status VARCHAR(20) DEFAULT 'ready',
      photo_id VARCHAR(64),
      created_at BIGINT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS homework_records (
      id VARCHAR(64) PRIMARY KEY,
      user_id VARCHAR(64) NOT NULL,
      child_id VARCHAR(64) NOT NULL,
      data TEXT NOT NULL,
      photo_id VARCHAR(64),
      created_at BIGINT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS photo_corrections (
      id VARCHAR(64) PRIMARY KEY,
      child_id VARCHAR(64) NOT NULL,
      kind VARCHAR(20),
      created_at BIGINT NOT NULL
    );
  `);
  try { await db.exec('ALTER TABLE children ADD COLUMN correction_daily_limit INTEGER DEFAULT 10'); } catch { /* ya existe */ }

  // Limpieza de fotos caducadas al arrancar y cada 12 horas
  purgeExpiredPhotos(db).catch(e => console.error('[FOTOS] purge', e));
  setInterval(() => purgeExpiredPhotos(db).catch(() => {}), 12 * 3600 * 1000).unref();

  const ownChild = (userId: string, childId: string) =>
    db.prepare('SELECT id, name, grade, correction_daily_limit FROM children WHERE id = ? AND parentId = ?').get(childId, userId);

  const startOfTodayMadrid = () => {
    const now = new Date();
    const madrid = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Madrid' }));
    const offset = now.getTime() - madrid.getTime();
    madrid.setHours(0, 0, 0, 0);
    return madrid.getTime() + offset;
  };
  const correctionsToday = async (childId: string) =>
    Number((await db.prepare('SELECT COUNT(*) AS n FROM photo_corrections WHERE child_id = ? AND created_at >= ?').get(childId, startOfTodayMadrid()))?.n || 0);
  const correctionLimit = (child: any) => {
    const n = Number(child?.correction_daily_limit);
    return Number.isFinite(n) && n > 0 ? n : DEFAULT_CORRECTION_LIMIT;
  };

  // Si la IA falla, la foto recién subida no se conserva
  const discardPhoto = async (p: { id: string; key: string; thumbKey: string | null }) => {
    await deleteObject(p.key);
    if (p.thumbKey) await deleteObject(p.thumbKey);
    await db.prepare('DELETE FROM photos WHERE id = ?').run(p.id);
  };

  const loadWorksheet = async (userId: string, id: string) => {
    const row = await db.prepare('SELECT * FROM worksheets WHERE id = ? AND user_id = ?').get(id, userId);
    return row ? { row, ws: JSON.parse(row.data) } : null;
  };
  const saveWorksheet = (ws: any, userId: string, photoId?: string | null) =>
    db.prepare('UPDATE worksheets SET data = ?, status = ?, photo_id = COALESCE(?, photo_id) WHERE id = ? AND user_id = ?')
      .run(JSON.stringify(ws), ws.status || 'ready', photoId || null, ws.id, userId);

  const insertWorksheet = async (ws: any, userId: string) => {
    await db.prepare('INSERT INTO worksheets (id, user_id, child_id, data, status, created_at) VALUES (?, ?, ?, ?, ?, ?)')
      .run(ws.id, userId, ws.childId, JSON.stringify(ws), ws.status || 'ready', ws.createdAt);
  };

  const buildWorksheet = async (p: any, exercises: any[], extra: any = {}) => {
    const id = newId('WS');
    // El QR solo lleva el identificador de la ficha (sin datos del niño)
    const qrCodeDataUrl = await QRCode.toDataURL(JSON.stringify({ app: 'EduAmigo', id, v: '1.5' }), { width: 140, margin: 1, errorCorrectionLevel: 'M' });
    return {
      id, childId: p.childId, childName: p.childName, date: todayEs(), subject: p.subject, grade: p.grade,
      bookTitle: p.bookTitle || 'Libro del alumno', topic: p.topic, subtitle: extra.subtitle,
      exercises, qrCodeDataUrl, formatType: extra.formatType || 'open_questions_ruled', readingContext: extra.readingContext || undefined,
      pedagogicalPreferences: {
        subtractionsMethod: p.subtractionsMethod, divisionsType: p.divisionsType, includeZeroInQuotient: !!p.includeZeroInQuotient,
        activityType: p.activityType, parentNotes: p.parentNotes, spacingLevel: 'extra_spacious',
      },
      status: 'ready', createdAt: Date.now(), originType: extra.originType || 'wizard', originHomeworkId: extra.originHomeworkId,
    };
  };

  /** Genera una ficha: mates de operaciones sin IA; el resto con Claude. */
  const generateWorksheet = async (p: any) => {
    const count = Math.min(10, Math.max(2, Number(p.exercisesCount) || 4));
    const isMath = /matem/i.test(p.subject || '');
    // El tipo elegido manda: antes, "Problemas" o "Fracciones" acababan generando divisiones
    const kind = isMath ? (p.activityType && LOCAL_MATH_KINDS.has(p.activityType) ? p.activityType : (!p.activityType ? (p.divisionsType || 'remainder_zero_single_digit') : null)) : null;
    if (kind) {
      const exercises = generateMathExercises(kind as MathKind, count, p.grade, { includeZeroInQuotient: p.includeZeroInQuotient });
      const isDivision = ['remainder_zero_single_digit', 'with_remainder_single_digit', 'two_digits', 'decimals'].includes(kind);
      return buildWorksheet(p, exercises, { subtitle: SUBTITLES[kind], formatType: isDivision ? 'divisions_grid' : 'arithmetic_grid' });
    }
    const { data } = await callClaudeJson<any>({
      system: 'Eres un maestro experto en crear fichas escolares en España.',
      prompt: generationPrompt({ ...p, count }), model: TUTOR_MODEL(), maxTokens: 2500, task: 'worksheet_generate',
    });
    const raw = Array.isArray(data?.exercises) ? data.exercises : [];
    if (!raw.length) throw new Error('La IA no ha generado ejercicios');
    const exercises = raw.slice(0, count).map((e: any, i: number) => ({
      index: i + 1, prompt: String(e.prompt || '').slice(0, 600), subprompt: e.subprompt ? String(e.subprompt).slice(0, 300) : undefined,
      expectedAnswer: e.expectedAnswer ? String(e.expectedAnswer).slice(0, 600) : undefined,
      linesCount: Math.min(8, Math.max(2, Number(e.linesCount) || 4)),
      exerciseType: isMath ? 'math_operation' : 'ruled_text', gridRows: isMath ? 10 : undefined,
    }));
    return buildWorksheet(p, exercises, {
      subtitle: `Repaso: ${p.topic}`.slice(0, 120),
      formatType: isMath ? 'word_problems' : 'open_questions_ruled',
      readingContext: data?.readingContext ? String(data.readingContext).slice(0, 2500) : undefined,
    });
  };

  /** En operaciones con solución conocida, la nota la pone el código, no la IA. */
  const verifyMath = (ws: any, corrections: any[]) => corrections.map(c => {
    const ex = ws.exercises.find((e: any) => e.index === Number(c.index));
    if (!ex || ex.exerciseType !== 'math_operation' || !ex.operation) return c;
    const said = String(c.studentAnswer || '');
    if (/ilegible/i.test(said)) return { ...c, isCorrect: false, unreadable: true };
    let ok: boolean | null = null;
    if (ex.operation === 'division') {
      const nums = said.match(/\d+/g)?.map(Number) || [];
      ok = nums.length > 0 && nums[0] === ex.expectedQuotient && (ex.expectedRemainder ? nums[1] === ex.expectedRemainder : (nums[1] === undefined || nums[1] === 0));
    } else if (ex.operation === 'fraction') {
      ok = fractionEq(said, ex.expectedAnswer);
    } else {
      const a = parseNumber(said), b = parseNumber(ex.expectedAnswer);
      ok = a !== null && b !== null && Math.abs(a - b) < 1e-9;
    }
    return { ...c, isCorrect: ok, verifiedByCode: true };
  });

  app.post('/api_worksheets.php', async (req, res) => {
    const action = String(req.query.action || '');
    const b = req.body || {};
    try {
      const session = await getSession(req);
      if (!session) return res.status(401).json({ error: 'Sesión no válida. Vuelve a iniciar sesión.', code: 'AUTH_REQUIRED' });
      const userId = session.userId;
      const parent = isParentUnlocked(session);
      const PARENT_ONLY = new Set(['generate', 'delete_worksheet', 'delete_homework', 'feedback', 'set_limit']);
      if (PARENT_ONLY.has(action)) {
        if (!parent) return res.status(403).json({ error: 'Esta acción necesita el PIN de padres.', code: 'PIN_REQUIRED' });
        await refreshParentWindow(session.tokenHash);
      }

      // ------------------------------------------------------------ listar
      if (action === 'list') {
        const childId = b.childId ? String(b.childId) : null;
        if (childId && !(await ownChild(userId, childId))) return res.status(404).json({ error: 'Perfil no encontrado' });
        if (!parent && !childId) return res.status(400).json({ error: 'Falta el perfil del niño' });
        const wsRows = await db.prepare(`SELECT * FROM worksheets WHERE user_id = ? ${childId ? 'AND child_id = ?' : ''} ORDER BY created_at DESC LIMIT 200`).all(...(childId ? [userId, childId] : [userId]));
        const hwRows = await db.prepare(`SELECT * FROM homework_records WHERE user_id = ? ${childId ? 'AND child_id = ?' : ''} ORDER BY created_at DESC LIMIT 200`).all(...(childId ? [userId, childId] : [userId]));
        const worksheets = wsRows.map((r: any) => { const ws = JSON.parse(r.data); return parent ? ws : worksheetForChild(ws); });
        const homework = hwRows.map((r: any) => { const hw = JSON.parse(r.data); return parent ? hw : homeworkForChild(hw); });
        return res.json({ worksheets, homework, view: parent ? 'parent' : 'child' });
      }

      // ------------------------------------------------------------ uso
      if (action === 'usage') {
        const child = await ownChild(userId, String(b.childId || ''));
        if (!child) return res.status(404).json({ error: 'Perfil no encontrado' });
        return res.json({ used: await correctionsToday(child.id), limit: correctionLimit(child) });
      }

      // ------------------------------------------------------------ generar ficha (padres)
      if (action === 'generate') {
        const child = await ownChild(userId, String(b.childId || ''));
        if (!child) return res.status(404).json({ error: 'Perfil no encontrado' });
        const p = { ...b, childId: child.id, childName: child.name, grade: b.grade || child.grade, subject: String(b.subject || 'Matemáticas'), topic: String(b.topic || 'Repaso').slice(0, 300) };
        let ws;
        try { ws = await generateWorksheet(p); }
        catch (e: any) {
          return res.status(503).json({ error: 'No se ha podido crear la ficha con la IA ahora mismo. Inténtalo en un rato (las fichas de operaciones de mates funcionan siempre).', code: 'AI_UNAVAILABLE' });
        }
        await insertWorksheet(ws, userId);
        return res.json({ status: 'success', worksheet: ws });
      }

      if (action === 'delete_worksheet') {
        await db.prepare('DELETE FROM worksheets WHERE id = ? AND user_id = ?').run(String(b.id || ''), userId);
        return res.json({ status: 'success' });
      }
      if (action === 'delete_homework') {
        await db.prepare('DELETE FROM homework_records WHERE id = ? AND user_id = ?').run(String(b.id || ''), userId);
        return res.json({ status: 'success' });
      }

      if (action === 'set_limit') {
        const child = await ownChild(userId, String(b.childId || ''));
        if (!child) return res.status(404).json({ error: 'Perfil no encontrado' });
        const n = Math.round(Number(b.limit));
        if (!Number.isFinite(n) || n < 1 || n > 50) throw new Error('El límite debe estar entre 1 y 50 fotos al día.');
        await db.prepare('UPDATE children SET correction_daily_limit = ? WHERE id = ?').run(n, child.id);
        return res.json({ status: 'success' });
      }

      // ------------------------------------------------------------ corregir ficha por foto
      if (action === 'correct_worksheet') {
        const found = await loadWorksheet(userId, String(b.worksheetId || ''));
        if (!found) return res.status(404).json({ error: 'No encuentro esa ficha. ¿Es de este perfil?' });
        const { ws } = found;
        const child = await ownChild(userId, ws.childId);
        if (!child) return res.status(404).json({ error: 'Perfil no encontrado' });
        const used = await correctionsToday(child.id);
        const limit = correctionLimit(child);
        if (used >= limit) return res.status(429).json({ error: `Hoy ya has corregido ${limit} fotos. ¡Mañana más!`, code: 'DAILY_LIMIT', used, limit });

        const photo = await savePhoto(db, { userId, childId: child.id, kind: 'worksheet', image: String(b.image || ''), thumb: b.thumb });
        let data: any;
        try {
          ({ data } = await callClaudeJson<any>({
            system: 'Eres un maestro de Primaria en España experto en corregir fichas escritas a mano.',
            prompt: worksheetCorrectionPrompt(ws), images: [{ mediaType: photo.mediaType as any, base64: photo.buffer.toString('base64') }],
            model: VISION_MODEL(), maxTokens: 2500, task: 'worksheet_correct',
          }));
        } catch (e) {
          await discardPhoto(photo);
          return res.status(503).json({ error: 'No se ha podido corregir la ficha ahora mismo. Inténtalo de nuevo en un rato: no se ha guardado ninguna nota.', code: 'AI_UNAVAILABLE' });
        }
        const raw = Array.isArray(data?.exerciseCorrections) ? data.exerciseCorrections : [];
        if (!raw.length) { await discardPhoto(photo); return res.status(422).json({ error: 'No he podido leer la ficha en la foto. Prueba con más luz y que se vea entera.', code: 'UNREADABLE' }); }
        const corrections = verifyMath(ws, raw.map((c: any) => ({
          index: Number(c.index), isCorrect: !!c.isCorrect, studentAnswer: String(c.studentAnswer ?? ''),
          stepAnalysis: String(c.stepAnalysis || ''), feedback: String(c.feedback || ''), hint: String(c.hint || ''), errorType: c.errorType || 'none',
        })));
        const total = ws.exercises.length;
        const correct = corrections.filter((c: any) => c.isCorrect).length;
        const correction = {
          correctedAt: Date.now(), score: Math.round((correct / Math.max(1, total)) * 100) / 10, totalExercises: total, correctExercises: correct,
          summaryDiagnosis: String(data.summaryDiagnosis || ''), pedagogicalInsight: String(data.pedagogicalInsight || ''),
          areasToReinforce: Array.isArray(data.areasToReinforce) ? data.areasToReinforce.slice(0, 5).map(String) : [],
          suggestedReinforcementTopic: data.suggestedReinforcementTopic ? String(data.suggestedReinforcementTopic) : undefined,
          exerciseCorrections: corrections, awardedXp: 10 + correct * 5,
        };
        ws.correction = correction;
        ws.status = 'corrected';
        ws.scannedImageUrl = `api_photo.php?id=${photo.id}`;
        await saveWorksheet(ws, userId, photo.id);
        await db.prepare('INSERT INTO photo_corrections (id, child_id, kind, created_at) VALUES (?, ?, ?, ?)').run(crypto.randomUUID(), child.id, 'worksheet', Date.now());
        // El tema de la ficha entra en "Repasar" (mañana si hay fallos; a los 3 días si ha ido bien)
        await addReviewTopic(db, { userId, childId: child.id, subject: ws.subject, topic: ws.topic, sourceType: 'worksheet', sourceId: ws.id, score: correction.score }).catch((e) => console.error('[REPASO]', e));
        // Puntos de la ficha: los da el servidor y solo una vez por ficha
        const award = await awardActivity(db, { userId, childId: child.id, points: correction.awardedXp, source: 'worksheet', label: `Ficha: ${ws.topic || ws.subject}`, refId: ws.id });
        return res.json({ status: 'success', worksheet: parent ? ws : worksheetForChild(ws), used: used + 1, limit, newPoints: award.newPoints, awarded: award.awarded });
      }

      // ------------------------------------------------------------ corregir deberes del cole por foto
      if (action === 'correct_homework') {
        const child = await ownChild(userId, String(b.childId || ''));
        if (!child) return res.status(404).json({ error: 'Perfil no encontrado' });
        let existing: any = null;
        let photo: { id: string; buffer: Buffer; mediaType: string; key?: string; thumbKey?: string | null };
        if (b.homeworkId) {
          // Segunda pasada tras aclarar la letra: reutiliza la foto guardada y no cuenta en el límite
          const row = await db.prepare('SELECT * FROM homework_records WHERE id = ? AND user_id = ? AND child_id = ?').get(String(b.homeworkId), userId, child.id);
          if (!row) return res.status(404).json({ error: 'No encuentro esos deberes.' });
          existing = JSON.parse(row.data);
          const prow = await db.prepare('SELECT * FROM photos WHERE id = ? AND user_id = ?').get(row.photo_id, userId);
          const buf = prow && !Number(prow.deleted) ? await getObject(prow.object_key) : null;
          if (!buf) return res.status(410).json({ error: 'La foto ya no está disponible. Haz una nueva.' });
          photo = { id: prow.id, buffer: buf, mediaType: prow.media_type };
        } else {
          const used = await correctionsToday(child.id);
          const limit = correctionLimit(child);
          if (used >= limit) return res.status(429).json({ error: `Hoy ya has corregido ${limit} fotos. ¡Mañana más!`, code: 'DAILY_LIMIT', used, limit });
          photo = await savePhoto(db, { userId, childId: child.id, kind: 'homework', image: String(b.image || ''), thumb: b.thumb });
        }
        const clar: Record<string, string> = b.clarifications && typeof b.clarifications === 'object' ? b.clarifications : {};
        const clarificationsText = Object.keys(clar).length
          ? `ACLARACIONES CONFIRMADAS POR EL ALUMNO O LA FAMILIA (tómalas como ciertas):\n${Object.entries(clar).map(([i, t]) => `- Ejercicio #${i}: lo escrito es "${String(t).slice(0, 200)}"`).join('\n')}`
          : '';
        let data: any;
        try {
          ({ data } = await callClaudeJson<any>({
            system: 'Eres un profesor de Primaria y Secundaria en España experto en corregir deberes escritos a mano.',
            prompt: homeworkPrompt({ grade: child.grade, subject: b.subject, bookTitle: b.bookTitle, notes: b.notes, clarificationsText }),
            images: [{ mediaType: photo.mediaType as any, base64: photo.buffer.toString('base64') }],
            model: VISION_MODEL(), maxTokens: 4000, task: 'homework_correct',
          }));
        } catch (e) {
          if (!existing && photo.key) await discardPhoto(photo as any);
          return res.status(503).json({ error: 'No se han podido corregir los deberes ahora mismo. Inténtalo de nuevo en un rato: no se ha guardado ninguna nota.', code: 'AI_UNAVAILABLE' });
        }
        const exercises = (Array.isArray(data?.exercises) ? data.exercises : []).map((e: any, i: number) => ({
          index: Number(e.index) || i + 1, statement: String(e.statement || ''), studentAnswer: String(e.studentAnswer || ''),
          correctSolution: String(e.correctSolution || ''), status: ['correct', 'partial', 'incorrect'].includes(e.status) ? e.status : 'incorrect',
          rootError: e.rootError ? String(e.rootError) : undefined, teacherExplanation: String(e.teacherExplanation || ''), hint: String(e.hint || ''),
          isAmbiguousOrUnclear: !!e.isAmbiguousOrUnclear, unclearReason: e.unclearReason ? String(e.unclearReason) : undefined,
          userClarification: clar[String(Number(e.index) || i + 1)] || undefined,
        }));
        if (!exercises.length) return res.status(422).json({ error: 'No he podido leer los deberes en la foto. Prueba con más luz y que se vea la hoja entera.', code: 'UNREADABLE' });
        const correct = exercises.filter((e: any) => e.status === 'correct').length + exercises.filter((e: any) => e.status === 'partial').length * 0.5;
        const hasDoubts = !!data.hasReadingDoubts && Array.isArray(data.clarificationQuestions) && data.clarificationQuestions.length > 0;
        const id = existing?.id || newId('HW');
        // Ficha de refuerzo vinculada (sin IA adicional: usa los ejercicios que ya ha propuesto)
        let reinforcementWorksheet = existing?.reinforcementWorksheet;
        const refEx = Array.isArray(data.reinforcementExercises) ? data.reinforcementExercises.slice(0, 6) : [];
        if (!hasDoubts && refEx.length) {
          const isMath = /matem/i.test(String(data.detectedSubject || b.subject || ''));
          reinforcementWorksheet = await buildWorksheet(
            { childId: child.id, childName: child.name, grade: child.grade, subject: String(data.detectedSubject || b.subject || 'Repaso'), topic: `Refuerzo: ${data.detectedTopic || 'deberes'}`, bookTitle: b.bookTitle },
            refEx.map((e: any, i: number) => ({ index: i + 1, prompt: String(e.prompt || ''), subprompt: e.subprompt ? String(e.subprompt) : undefined, expectedAnswer: e.expectedAnswer ? String(e.expectedAnswer) : undefined, linesCount: Math.min(6, Math.max(2, Number(e.linesCount) || 3)), exerciseType: isMath ? 'math_operation' : 'ruled_text' })),
            { subtitle: 'Ficha de refuerzo de los deberes', formatType: isMath ? 'word_problems' : 'open_questions_ruled', originType: 'homework_reinforcement', originHomeworkId: id },
          );
          if (!existing?.reinforcementWorksheet) await insertWorksheet(reinforcementWorksheet, userId);
        }
        const record = {
          id, childId: child.id, childName: child.name, grade: child.grade,
          subject: String(data.detectedSubject || b.subject || ''), topic: String(data.detectedTopic || ''), bookTitle: b.bookTitle,
          createdAt: existing?.createdAt || Date.now(), date: existing?.date || todayEs(), imageUrl: `api_photo.php?id=${photo.id}`, notes: b.notes,
          score: Math.round((correct / Math.max(1, exercises.length)) * 100) / 10, totalExercises: exercises.length, correctExercises: Math.floor(correct),
          summaryDiagnosis: String(data.summaryDiagnosis || ''), whatChildIsMissing: String(data.whatChildIsMissing || ''),
          exercises, remedialGuide: data.remedialGuide || null,
          reinforcementWorksheetId: reinforcementWorksheet?.id || '', reinforcementWorksheet,
          awardedXp: hasDoubts ? 0 : 15 + Math.floor(correct) * 5,
          completedByStudent: b.completedByStudent ?? existing?.completedByStudent, effortLevel: b.effortLevel ?? existing?.effortLevel,
          interestLevel: b.interestLevel ?? existing?.interestLevel, childSelfReflection: b.childSelfReflection ?? existing?.childSelfReflection,
          tutorFeedback: existing?.tutorFeedback,
          hasReadingDoubts: hasDoubts,
          clarificationQuestions: hasDoubts ? data.clarificationQuestions.slice(0, 8).map((q: any) => ({
            exerciseIndex: Number(q.exerciseIndex), question: String(q.question || ''), unclearSnippet: q.unclearSnippet ? String(q.unclearSnippet) : undefined,
            suggestedOptions: Array.isArray(q.suggestedOptions) ? q.suggestedOptions.slice(0, 4).map(String) : undefined, clarified: false,
          })) : [],
          clarificationsResolved: !hasDoubts && Object.keys(clar).length > 0,
          legibilityStatus: hasDoubts ? 'dificil' : Object.keys(clar).length ? 'dudas_aclaradas' : 'perfecta',
        };
        if (existing) {
          await db.prepare('UPDATE homework_records SET data = ? WHERE id = ? AND user_id = ?').run(JSON.stringify(record), id, userId);
        } else {
          await db.prepare('INSERT INTO homework_records (id, user_id, child_id, data, photo_id, created_at) VALUES (?, ?, ?, ?, ?, ?)').run(id, userId, child.id, JSON.stringify(record), photo.id, record.createdAt);
          await db.prepare('INSERT INTO photo_corrections (id, child_id, kind, created_at) VALUES (?, ?, ?, ?)').run(crypto.randomUUID(), child.id, 'homework', Date.now());
        }
        if (!hasDoubts && record.topic) {
          await addReviewTopic(db, { userId, childId: child.id, subject: record.subject, topic: record.topic, sourceType: 'homework', sourceId: id, score: record.score }).catch((e) => console.error('[REPASO]', e));
        }
        // Puntos de los deberes: cuando ya no hay dudas de letra, una sola vez por deberes
        let award: { awarded: number; newPoints: number | null } = { awarded: 0, newPoints: null };
        if (!hasDoubts) award = await awardActivity(db, { userId, childId: child.id, points: record.awardedXp, source: 'homework', label: `Deberes: ${record.topic || record.subject || 'corregidos'}`, refId: id });
        return res.json({ status: 'success', record: parent ? record : homeworkForChild(record), newPoints: award.newPoints, awarded: award.awarded });
      }

      // ------------------------------------------------------------ comentario del tutor (padres)
      if (action === 'feedback') {
        const row = await db.prepare('SELECT * FROM homework_records WHERE id = ? AND user_id = ?').get(String(b.homeworkId || ''), userId);
        if (!row) return res.status(404).json({ error: 'No encuentro esos deberes.' });
        const hw = JSON.parse(row.data);
        const bonus = Math.max(0, Math.min(200, Math.round(Number(b.bonusPoints) || 0)));
        hw.tutorFeedback = { reviewedAt: Date.now(), tutorComment: String(b.tutorComment || '').slice(0, 1000), tutorSticker: String(b.tutorSticker || '🌟').slice(0, 8), bonusPoints: bonus };
        await db.prepare('UPDATE homework_records SET data = ? WHERE id = ?').run(JSON.stringify(hw), row.id);
        return res.json({ status: 'success', record: hw });
      }

      return res.status(400).json({ error: 'Acción no válida' });
    } catch (e: any) {
      return res.status(400).json({ error: publicErrorMessage(e, 'api_worksheets.php') });
    }
  });

  // Fotos: solo para la familia dueña. Si el original ya caducó, se sirve la miniatura.
  app.get('/api_photo.php', async (req, res) => {
    try {
      const session = await getSession(req);
      if (!session) return res.status(401).end();
      const row = await db.prepare('SELECT * FROM photos WHERE id = ? AND user_id = ?').get(String(req.query.id || ''), session.userId);
      if (!row) return res.status(404).end();
      const wantThumb = req.query.thumb === '1' || Number(row.deleted) === 1;
      const key = wantThumb ? row.thumb_key : row.object_key;
      if (!key) return res.status(410).end();
      const buf = await getObject(key);
      if (!buf) return res.status(404).end();
      res.setHeader('Content-Type', wantThumb ? 'image/jpeg' : row.media_type || 'image/jpeg');
      res.setHeader('Cache-Control', 'private, max-age=86400');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      return res.end(buf);
    } catch {
      return res.status(500).end();
    }
  });
}
