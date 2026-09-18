
export interface MathAnalysis {
  topic: string;
  score: number;
  steps: MathStep[];
  errors: MathError[];
  generalFeedback: string;
  suggestedExercises: MathExercise[];
}

export interface MathStep {
  stepNumber: number;
  description: string;
  isCorrect: boolean;
  explanation: string;
}

export interface MathError {
  location: string;
  errorType: string;
  correction: string;
  explanation: string;
}

export interface MathExercise {
  title: string;
  problem: string;
  difficulty: 'fácil' | 'medio' | 'difícil';
  solution?: string;
}

export interface MathSession {
  id: string;
  userId: string;
  childId: string;
  imageUrl: string;
  analysis: MathAnalysis;
  timestamp: number;
}
