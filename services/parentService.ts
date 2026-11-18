// Cliente del panel de padres (opción 8): resumen semanal, informe, notas del cole y avisos de errores.

const call = async (action: string, body: any) => {
  let res: Response;
  try {
    res = await fetch(`api_parent.php?action=${action}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify(body) });
  } catch {
    throw new Error('Sin conexión. Revisa internet e inténtalo de nuevo.');
  }
  let data: any = {};
  try { data = await res.json(); } catch { /* vacío */ }
  if (!res.ok) { const e: any = new Error(data.error || 'Algo ha fallado. Inténtalo de nuevo.'); e.code = data.code; throw e; }
  return data;
};

export interface ChildWeek {
  id: string; name: string; avatar: string; grade: string; points: number;
  streak: { current: number; best: number; activeToday: boolean; last14: { day: string; active: boolean }[] };
  activeDays: number;
  week: {
    readings: number; readingWpm: number | null; readingPct: number | null;
    mathChallenges: number; mathPct: number | null; tests: number; testPct: number | null;
    sheets: number; tutorQuestions: number; points: number;
  };
  weak: { area: string; text: string }[];
  exams: { title: string; date: string }[];
  reviewsDue: number;
  nextReviews: { topic: string; subject: string; due: string }[];
  alerts: { rewards: number; tutor: number };
  recent: { label: string; points: number; at: number }[];
}

export interface SchoolGrade {
  id: string; childId: string; subject: string; term: string; grade: number; topic: string; note: string;
  date: string; inReview: boolean; createdAt: number;
}

export interface ChildReport {
  week: ChildWeek;
  readings: { title: string; wpm: number; band: string; correct: number; total: number; counted: boolean; at: number }[];
  tests: { subject: string; topic: string; score: number; total: number; at: number }[];
  grades: SchoolGrade[];
  math: { challenges: number; pct: number | null };
  mastered: number; badges: number; generatedAt: number;
}

export interface SentReport { id: string; kind: string; reason: string; status: string; at: number; child: string; fromParent: boolean }

export const parentService = {
  overview: (): Promise<{ children: ChildWeek[] }> => call('overview', {}),
  report: (childId: string): Promise<ChildReport> => call('report', { childId }),
  listGrades: (childId: string): Promise<{ grades: SchoolGrade[]; subjects: string[]; terms: string[]; lowGrade: number }> => call('list_grades', { childId }),
  addGrade: (g: { childId: string; subject: string; term: string; grade: number; topic?: string; note?: string; date?: string }): Promise<{ grade: SchoolGrade; addedToReview: boolean }> => call('add_grade', g),
  deleteGrade: (id: string) => call('delete_grade', { id }),
  reportError: (p: { childId: string; kind: 'worksheet' | 'homework' | 'review' | 'reading' | 'math' | 'calligraphy' | 'english' | 'library' | 'other'; refId?: string; reason?: string; detail?: string }) => call('report_error', p),
  myReports: (): Promise<{ reports: SentReport[] }> => call('my_reports', {}),
};

export const KIND_LABEL: Record<string, string> = {
  worksheet: 'Ficha', homework: 'Deberes', calligraphy: 'Caligrafía', english: 'Inglés', library: 'Biblioteca', review: 'Test de Repasar', reading: 'Lectura', math: 'Mates', tutor: 'Tutor', other: 'Otro',
};
