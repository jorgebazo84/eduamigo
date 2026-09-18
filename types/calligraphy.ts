
export interface CalligraphyAnalysis {
  score: number;
  legibility: string;
  strokeFeedback: string;
  spacingFeedback: string;
  spellingErrors: string[];
  generalFeedback: string;
  psychologicalAnalysis?: string; // Rasgos psicológicos/grafológicos para el tutor
  practicePlan: CalligraphyExercise[];
}

export interface CalligraphyExercise {
  title: string;
  description: string;
  target: string; // e.g. "Letra 'g'", "Espaciado", "Ortografía"
  difficulty: 'fácil' | 'medio' | 'difícil';
  printableContent?: string; // Contenido sugerido para la ficha de práctica
}

export interface CalligraphySession {
  id: string;
  childId: string;
  imageUrl: string;
  analysis: CalligraphyAnalysis;
  timestamp: number;
  parentId?: string; // ID de la sesión original si es una práctica de seguimiento
}
