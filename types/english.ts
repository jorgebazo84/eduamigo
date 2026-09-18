import { GradeLevel } from '../types';

export type EnglishLevel = 'Pre-A1 Starters' | 'A1 Movers' | 'A2 Flyers' | 'A2 Key' | 'B1 Preliminary' | 'B2 First';

export interface EnglishProgress {
  userId: string;
  childId: string;
  currentLevel: EnglishLevel;
  points: number;
  completedLessons: string[]; // IDs of completed lessons
  lastActive: number;
  streak: number;
}

export interface EnglishLesson {
  id: string;
  level: EnglishLevel;
  title: string;
  description: string;
  skills: {
    listening: {
      audioPrompt: string;
      questions: { question: string; options: string[]; correctIndex: number }[];
    };
    reading: {
      text: string;
      questions: { question: string; options: string[]; correctIndex: number }[];
    };
    writing: {
      prompt: string;
      minWords: number;
    };
    speaking: {
      topic: string;
      suggestedPhrases: string[];
    };
  };
}

export interface EnglishEvaluation {
  score: number;
  feedback: string;
  corrections: { original: string; correction: string; explanation: string }[];
  nextSteps: string;
}

export interface PlacementTestSection {
  id: string;
  title: string;
  instructions: string;
  questions: {
    id: string;
    question: string;
    options: string[];
    correctIndex: number;
    level: EnglishLevel;
  }[];
}

export interface PlacementTest {
  id: string;
  sections: PlacementTestSection[];
  writingPrompt: {
    prompt: string;
    minWords: number;
  };
}
