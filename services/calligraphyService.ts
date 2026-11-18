// Cliente de Caligrafía (opción 9): la foto se analiza en el servidor con Claude.

const call = async (action: string, body: any) => {
  let res: Response;
  try {
    res = await fetch(`api_calligraphy.php?action=${action}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify(body) });
  } catch {
    throw new Error('Sin conexión. Revisa internet e inténtalo de nuevo.');
  }
  let data: any = {};
  try { data = await res.json(); } catch { /* vacío */ }
  if (!res.ok) { const e: any = new Error(data.error || 'Algo ha fallado. Inténtalo de nuevo.'); e.code = data.code; throw e; }
  return data;
};

export interface PracticeSheet { title: string; description: string; target: string; difficulty: string; printableContent: string }
export interface CalligraphyResult {
  score: number; transcription: string; legibility: string; strokeFeedback: string; spacingFeedback: string;
  spellingErrors: { wrong: string; right: string }[]; generalFeedback: string; practicePlan: PracticeSheet[];
}
export interface CalligraphyRecord { id: string; score: number; analysis: CalligraphyResult; photoUrl: string | null; points: number; at: number }
export interface Graphology { observations: string[]; traits: string[]; notice: string }

export const calligraphyService = {
  analyze: (childId: string, image: string, thumb?: string): Promise<{ id: string; analysis: CalligraphyResult; photoUrl: string; points: number; newPoints: number }> => call('analyze', { childId, image, thumb }),
  history: (childId: string): Promise<{ records: CalligraphyRecord[] }> => call('history', { childId }),
  parentHistory: (childId: string): Promise<{ graphologyEnabled: boolean; notice: string; records: (CalligraphyRecord & { graphology: Graphology | null })[] }> => call('parent_history', { childId }),
  setGraphology: (childId: string, enabled: boolean) => call('set_graphology', { childId, enabled }),
};
