// Cliente de la zona de juegos y las prácticas de FP: el servidor prepara y corrige todo.
import type { GameInfo } from '../shared/gamesCatalog';

const call = async (action: string, body: any) => {
  let res: Response;
  try {
    res = await fetch(`api_games.php?action=${action}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify(body) });
  } catch {
    throw new Error('Sin conexión. Revisa internet e inténtalo de nuevo.');
  }
  let data: any = {};
  try { data = await res.json(); } catch { /* vacío */ }
  if (!res.ok) { const e: any = new Error(data.error || 'Algo ha fallado. Inténtalo de nuevo.'); e.code = data.code; throw e; }
  return data;
};

export interface GamesState {
  games: (GameInfo & { off: boolean })[];
  lock: null | 'disabled' | 'study' | 'time';
  studied: boolean; minutesLimit: number; minutesUsed: number;
  pointsToday: number; pointsCap: number; practicePointsToday: number; practiceCap: number;
  requireStudy: boolean; enabled: boolean; fpIt: boolean;
}
export interface RoundView { roundId: string; gameId: string; items: any[]; minutesLeft: number | null }
export interface AnswerResult { correct: boolean; show: string; explain: string; note: string }
export interface FinishResult { correct: number; total: number; points: number; newPoints: number; capReached: boolean; state: GamesState }
export interface GamesParentView {
  settings: { enabled: boolean; minutes: number; requireStudy: boolean; disabled: string[] };
  games: { id: string; title: string; emoji: string; area: string }[];
  stats: { id: string; title: string; emoji: string; practice: boolean; rounds: number; percent: number; last: number }[];
  minutesToday: number; minutesWeek: number; pointsToday: number; pointsCap: number;
}

export const gamesService = {
  state: (childId: string): Promise<GamesState> => call('state', { childId }),
  start: (childId: string, gameId: string): Promise<RoundView> => call('start', { childId, gameId }),
  answer: (childId: string, roundId: string, index: number, answer: any): Promise<AnswerResult> => call('answer', { childId, roundId, index, answer }),
  guess: (childId: string, roundId: string, index: number, letter: string): Promise<{ item: any; done: boolean; correct: boolean; show?: string }> => call('guess', { childId, roundId, index, letter }),
  finish: (childId: string, roundId: string): Promise<FinishResult> => call('finish', { childId, roundId }),
  parentGet: (childId: string): Promise<GamesParentView> => call('parent_get', { childId }),
  parentSet: (childId: string, s: { enabled: boolean; minutes: number; requireStudy: boolean; disabled: string[] }) => call('parent_set', { childId, ...s }),
};
