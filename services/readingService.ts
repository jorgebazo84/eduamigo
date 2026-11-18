// Cliente de Lectura (opción 6): biblioteca por curso, velocidad, comprensión y grabaciones. Sin Gemini.
const call = async (action: string, body: any) => {
  let res: Response;
  try {
    res = await fetch(`api_reading.php?action=${action}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify(body) });
  } catch {
    throw new Error('Sin conexión. Revisa internet e inténtalo de nuevo.');
  }
  let data: any = {};
  try { data = await res.json(); } catch { /* vacío */ }
  if (!res.ok) throw new Error(data.error || 'Algo ha fallado. Inténtalo de nuevo.');
  return data;
};

export interface WpmReference { course: string; target: number; min: number; max: number }
export interface TextCard {
  id: string; level: number; course: string; title: string; author: string; source: string; genre: string; link: string;
  words: number; timesRead: number; bestComprehension: number | null;
}
export interface ReadingList { level: number; course: string; reference: WpmReference; texts: TextCard[]; easier: TextCard[]; challenge: TextCard[]; allRead: boolean; pointsToday: number; pointsCap: number }
export interface ReadingStart { attemptId: string; text: TextCard & { text: string }; questions: { type: string; label: string; q: string; options: string[] }[]; reference: WpmReference }
export interface ReadingResult {
  recordId: string; words: number; seconds: number; wpm: number; wpmBand: 'below' | 'within' | 'above'; reference: WpmReference; counted: boolean;
  correct: number; total: number;
  detail: { type: string; label: string; q: string; options: string[]; chosen: number; correctIndex: number; correct: boolean; explanation: string }[];
  points: number; pointsCapReached: boolean; newPoints: number; audioSaved: boolean; audioError: string | null;
}
export interface ReadingParentStats {
  reference: WpmReference; course: string; avgWpm: number | null; comprehension: number | null;
  byType: { type: string; label: string; accuracy: number | null; total: number }[];
  trend: { wpm: number; createdAt: number }[];
  records: { id: string; title: string; wpm: number; wpmBand: string; counted: boolean; correct: number; total: number; seconds: number; trackingAccuracy: number | null; createdAt: number; audioUrl: string | null }[];
  totalReadings: number;
}

export const readingService = {
  list: (childId: string): Promise<ReadingList> => call('list', { childId }),
  start: (childId: string, textId: string): Promise<ReadingStart> => call('start', { childId, textId }),
  submit: (p: { childId: string; attemptId: string; seconds: number; answers: number[]; audio?: string | null; trackingAccuracy?: number | null; readWhole?: boolean }): Promise<ReadingResult> => call('submit', p),
  more: (childId: string): Promise<{ text: TextCard }> => call('more', { childId }),
  parentStats: (childId: string): Promise<ReadingParentStats> => call('parent_stats', { childId }),
  deleteAudio: (childId: string, recordId: string) => call('delete_audio', { childId, recordId }),
};

/** Mensaje amable sobre la velocidad, sin convertirlo en una nota. */
export const wpmMessage = (band: string, ref: WpmReference) =>
  band === 'below' ? `Aún vas un poco más despacio de lo habitual en ${ref.course} (de ${ref.min} a ${ref.max} palabras por minuto). ¡Leyendo cada día irás más rápido!`
  : band === 'above' ? `¡Lees más rápido de lo habitual en ${ref.course}! Recuerda que lo importante es entender lo que lees.`
  : `Lees a una velocidad normal para ${ref.course} (de ${ref.min} a ${ref.max} palabras por minuto). ¡Muy bien!`;
