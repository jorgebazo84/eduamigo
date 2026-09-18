
export interface ReadingAnalysis {
  score: number;
  fluency: string;
  intonation: string;
  accuracy: string;
  comprehensionScore: number;
  comprehensionFeedback: string;
  generalFeedback: string;
  suggestedExercises: ReadingExercise[];
  transcription: string;
}

export interface ReadingExercise {
  title: string;
  description: string;
  text: string;
  difficulty: 'fácil' | 'medio' | 'difícil';
}

export interface ReadingSession {
  id: string;
  userId: string;
  childId: string;
  audioUrl?: string;
  textRead: string;
  analysis: ReadingAnalysis;
  timestamp: number;
  transcription?: string;
}
