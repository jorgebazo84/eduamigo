// Cliente de "Repasar": test, repaso espaciado y temarios. Todo pasa por el servidor.
export class ReviewError extends Error {
  code?: string;
  constructor(message: string, code?: string) { super(message); this.code = code; }
}

const call = async (action: string, body: any) => {
  let res: Response;
  try {
    res = await fetch(`api_review.php?action=${action}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify(body),
    });
  } catch {
    throw new ReviewError('Sin conexión. Revisa internet e inténtalo de nuevo.', 'NETWORK');
  }
  let data: any = {};
  try { data = await res.json(); } catch { /* vacío */ }
  if (!res.ok) throw new ReviewError(data.error || 'Algo ha fallado. Inténtalo de nuevo.', data.code);
  return data;
};

export interface ReviewItem {
  id: string; subject: string; topic: string; sourceType: string; stage: number; dueDate: string;
  status: 'active' | 'mastered' | 'archived'; lastScore: number | null; reviewsCount: number; failsCount: number;
  createdAt: number; struggling: boolean;
}
export interface TodayData {
  today: string; due: ReviewItem[]; dueTotal: number; upcoming: ReviewItem[]; mastered: number;
  usage: { used: number; limit: number };
}
export interface TestQuestion { id: string; question: string; options: string[] }
export interface TestSession {
  sessionId: string; subject: string; topic: string; grade: string; kind: 'test' | 'review';
  questions: TestQuestion[]; used: number; limit: number;
}
export interface QuestionResult extends TestQuestion { chosen: number; correctIndex: number; correct: boolean; explanation: string; subtopic: string }
export interface TestOutcome {
  result: { id: string; childId: string; grade: string; subject: string; topic: string; score: number; totalQuestions: number; score10: number;
    strengths: string[]; weaknesses: string[]; studyGuideContent: string; timestamp: number; pointsEarned: number; duration: number; kind: 'test' | 'review' };
  detail: QuestionResult[];
  review: null | { passed: boolean; stage: number; status: string; dueDate: string; nextInDays: number | null };
  newPoints: number; explainOffered: boolean; sessionId: string;
}
export interface ExplainFeedback { praise: string; missing: string; tip: string; understood: boolean }
export interface ParentReviewOverview {
  today: string; week: ReviewItem[]; later: ReviewItem[]; struggling: ReviewItem[]; mastered: ReviewItem[]; overdue: number;
  tests: { id: string; subject: string; topic: string; score: number; totalQuestions: number; timestamp: number; kind: string; strengths: string[]; weaknesses: string[] }[];
  settings: { testDailyLimit: number }; usage: { used: number; limit: number };
}

export const reviewService = {
  today: (childId: string): Promise<TodayData> => call('today', { childId }),
  syllabus: async (childId: string, subject: string, grade: string, region: string): Promise<{ id: string; title: string; description: string }[]> =>
    (await call('syllabus', { childId, subject, grade, region })).topics,
  startTest: (p: { childId: string; subject?: string; topic?: string; grade?: string; reviewItemId?: string }): Promise<TestSession> => call('start_test', p),
  submitTest: (childId: string, sessionId: string, answers: number[]): Promise<TestOutcome> => call('submit_test', { childId, sessionId, answers }),
  explain: async (p: { childId: string; sessionId?: string; subject?: string; topic?: string; text: string }): Promise<ExplainFeedback> =>
    (await call('explain', p)).feedback,
  studiedToday: (childId: string, bookId: string, topicIndices: number[]): Promise<{ added: number }> => call('studied_today', { childId, bookId, topicIndices }),
  addTopic: (p: { childId: string; subject: string; topic: string; sourceType?: string; sourceId?: string; score?: number }) => call('add_topic', p),
  parentOverview: (childId: string): Promise<ParentReviewOverview> => call('parent_overview', { childId }),
  setLimit: (childId: string, limit: number) => call('set_limit', { childId, limit }),
  archiveItem: (childId: string, itemId: string) => call('archive_item', { childId, itemId }),
};

/** Cuándo vuelve un tema, en palabras para el niño. */
export const whenText = (day: string, today: string) => {
  if (day <= today) return 'hoy';
  const d = Math.round((Date.parse(day) - Date.parse(today)) / 86400000);
  if (d === 1) return 'mañana';
  if (d < 7) return `en ${d} días`;
  return new Date(day + 'T12:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'long' });
};
