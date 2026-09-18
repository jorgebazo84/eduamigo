import { GradeLevel, Subject } from '../types';

export interface Book {
  id: string;
  userId: string;
  childId: string;
  isbn: string;
  title: string;
  publisher?: string;
  subject: Subject | string;
  grade: GradeLevel | string;
  topics: string[]; // Lista de títulos de temas/capítulos
  createdAt: number;
}

export interface StudyTask {
  id: string;
  bookId: string;
  childId: string;
  topicIndex: number;
  topicTitle: string;
  status: 'pending' | 'completed';
  summary?: string;
  handwritingImage?: string; // Base64 o URL de la imagen de escritura
  aiFeedbackChild?: string;
  aiFeedbackParent?: string;
  medicalEvaluation?: string; // Evaluación psicológica basada en la escritura
  aiScore?: number; // 1-10
  pointsReward: number;
  completedAt?: number;
  createdAt: number;
}

export interface ISBNLookupResponse {
  books: {
    title: string;
    publisher: string;
    topics: string[];
    suggestedGrade: string;
  }[];
}

export interface EvaluationResponse {
  score: number;
  feedbackChild: string;
  feedbackParent: string;
  conceptsMissed: string[];
  isPassed: boolean;
}
