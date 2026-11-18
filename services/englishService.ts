// Cliente de Inglés (opción 9): todo lo decide el servidor con Claude. Ya no hay IA en el navegador.
import type { EnglishLevel } from '../shared/englishBank';

const call = async (action: string, body: any) => {
  let res: Response;
  try {
    res = await fetch(`api_english.php?action=${action}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify(body) });
  } catch {
    throw new Error('Sin conexión. Revisa internet e inténtalo de nuevo.');
  }
  let data: any = {};
  try { data = await res.json(); } catch { /* vacío */ }
  if (!res.ok) { const e: any = new Error(data.error || 'Algo ha fallado. Inténtalo de nuevo.'); e.code = data.code; throw e; }
  return data;
};

export interface EnglishState {
  level: EnglishLevel; levelLabel: string; placed: boolean; lessonsAtLevel: number; promoteAfter: number;
  pointsToday: number; pointsCap: number; lessonsToday: number; lessonsPerDay: number;
}
export interface McQuestion { q: string; options: string[] }
export interface EnglishLessonView {
  attemptId: string; level: EnglishLevel; levelLabel: string; theme: string;
  lesson: {
    title: string;
    vocabulary: { en: string; es: string; example: string }[];
    grammar: { title: string; explanation: string; examples: string[] };
    phrases: string[];
    reading: { text: string; questions: McQuestion[] };
    listening: { text: string; questions: McQuestion[] };
    writing: { prompt: string; promptEs: string; minWords: number };
  };
}
export interface WritingResult { score?: number; feedback?: string; corrections?: { original: string; correction: string; explanation: string }[]; nextStep?: string; error?: string }
export interface LessonResult {
  mcCorrect: number; mcTotal: number; reading: boolean[]; listening: boolean[]; key: { reading: number[]; listening: number[] };
  writing: WritingResult | null; points: number; newPoints: number; promoted: string | null;
}
export interface EnglishParentStats {
  level: EnglishLevel; levelLabel: string; placed: boolean; setBy: string | null; levels: { id: EnglishLevel; label: string }[];
  lessons: { id: string; title: string; level: string; mcCorrect: number; mcTotal: number; writingText: string; writing: WritingResult | null; points: number; at: number }[];
  placements: { level: string; detail: Record<string, number>; at: number }[];
}

export const englishService = {
  state: (childId: string): Promise<EnglishState> => call('state', { childId }),
  placementStart: (childId: string): Promise<{ placementId: string; questions: { id: string; question: string; options: string[] }[] }> => call('placement_start', { childId }),
  placementSubmit: (childId: string, placementId: string, answers: number[]): Promise<{ level: EnglishLevel; levelLabel: string; correctByLevel: Record<string, number> }> => call('placement_submit', { childId, placementId, answers }),
  lessonStart: (childId: string): Promise<EnglishLessonView> => call('lesson_start', { childId }),
  lessonSubmit: (childId: string, attemptId: string, reading: number[], listening: number[], writing: string): Promise<LessonResult> => call('lesson_submit', { childId, attemptId, reading, listening, writing }),
  parentStats: (childId: string): Promise<EnglishParentStats> => call('parent_stats', { childId }),
  setLevel: (childId: string, level: EnglishLevel) => call('set_level', { childId, level }),
};

/** Lee un texto en inglés con la voz del dispositivo (no se envía nada a ningún sitio) */
export function speakEnglish(text: string, rate = 0.9) {
  if (!('speechSynthesis' in window)) return false;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'en-GB';
  u.rate = rate;
  const voice = window.speechSynthesis.getVoices().find((v) => v.lang?.startsWith('en-GB')) || window.speechSynthesis.getVoices().find((v) => v.lang?.startsWith('en'));
  if (voice) u.voice = voice;
  window.speechSynthesis.speak(u);
  return true;
}
