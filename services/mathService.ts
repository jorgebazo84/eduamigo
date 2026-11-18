// Cliente del reto de cálculo (Mates). Sin IA: todo se calcula en el navegador y se comprueba de nuevo en el servidor.
import type { MathProblem } from '../shared/mathOps';

const call = async (action: string, body: any) => {
  let res: Response;
  try {
    res = await fetch(`api_math.php?action=${action}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify(body) });
  } catch {
    throw new Error('Sin conexión. Revisa internet e inténtalo de nuevo.');
  }
  let data: any = {};
  try { data = await res.json(); } catch { /* vacío */ }
  if (!res.ok) throw new Error(data.error || 'Algo ha fallado. Inténtalo de nuevo.');
  return data;
};

export interface MathConfig {
  answerStyle: 'choice' | 'typed' | null;
  record: number; pointsToday: number; pointsCap: number; pointsLeft: number;
  weak: { key: string; label: string; accuracy: number }[];
  mistakes: MathProblem[];
}
export interface ChallengeResult {
  correct: number; wrong: number; bestStreak: number; points: number; pointsCapReached: boolean; pointsLeft: number;
  newPoints: number; record: number; newRecord: boolean; previousRecord: number;
  weak: { key: string; label: string; accuracy: number }[];
}
export interface MathParentStats {
  weeks: { from: number; challenges: number; accuracy: number | null; correct: number }[];
  thisWeek: { challenges: number; accuracy: number | null; correct: number };
  byFamily: { family: string; accuracy: number; total: number }[];
  weak: { key: string; label: string; accuracy: number; example: string | null }[];
  record: number;
  recent: { mode: string; table: number | null; correct: number; wrong: number; bestStreak: number; points: number; createdAt: number }[];
  pointsToday: number; pointsCap: number;
  settings: { answerStyle: 'choice' | 'typed' | null };
}

export const mathService = {
  config: (childId: string, mode: string, table?: number): Promise<MathConfig> => call('config', { childId, mode, table }),
  saveChallenge: (p: { childId: string; mode: string; table?: number; answerStyle: string; levelStart: number; levelEnd: number; duration: number; answers: { problem: MathProblem; given: number | null }[] }): Promise<ChallengeResult> =>
    call('save_challenge', p),
  parentStats: (childId: string): Promise<MathParentStats> => call('parent_stats', { childId }),
  setAnswerStyle: (childId: string, answerStyle: 'choice' | 'typed' | null) => call('set_settings', { childId, answerStyle }),
};
