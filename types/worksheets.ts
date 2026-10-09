import { GradeLevel, Subject } from '../types';

export interface WorksheetExercise {
  index: number;
  prompt: string;
  subprompt?: string;
  contextText?: string; // Breve texto de lectura, enunciado o mapa conceptual
  dividend?: number;
  divisor?: number;
  expectedQuotient?: number;
  expectedRemainder?: number;
  expectedAnswer?: string; // Respuesta esperada para asignaturas de texto (Lengua, Ciencias, Inglés)
  verticalStepsHint?: string;
  gridRows?: number; // Filas recomendadas de cuadrícula (para mates)
  linesCount?: number; // Número de renglones de pauta escolar para escribir a lápiz
  exerciseType?: 'math_operation' | 'ruled_text' | 'fill_blank' | 'multiple_choice';
}

export interface WorksheetCorrectionExercise {
  index: number;
  isCorrect: boolean;
  studentAnswer: string;
  stepAnalysis: string;
  feedback: string;
  errorType?: 'subtraction_error' | 'quotient_selection' | 'zero_to_quotient' | 'bring_down_digit' | 'spelling_grammar' | 'concept_error' | 'none';
}

export interface WorksheetCorrection {
  correctedAt: number;
  score: number; // 0 - 10
  totalExercises: number;
  correctExercises: number;
  summaryDiagnosis: string;
  pedagogicalInsight: string;
  areasToReinforce: string[];
  exerciseCorrections: WorksheetCorrectionExercise[];
  suggestedReinforcementTopic?: string;
  awardedXp: number;
}

export interface PrintableWorksheet {
  id: string;
  childId: string;
  childName: string; // Nombre impreso visiblemente en cabecera
  date: string; // Fecha impresa visiblemente en cabecera
  subject: Subject | string;
  grade: GradeLevel | string;
  bookTitle: string; // Libro registrado de referencia
  topic: string;
  subtitle?: string;
  exercises: WorksheetExercise[];
  qrCodeDataUrl: string; // Código QR generado para reconocimiento óptico automático
  formatType: 'divisions_grid' | 'arithmetic_grid' | 'word_problems' | 'open_questions_ruled' | 'language_grammar' | 'science_concepts';
  readingContext?: string; // Por ejemplo, lectura corta para Lengua o Inglés
  pedagogicalPreferences: {
    subtractionsMethod?: 'written_subtraction' | 'mental_direct' | 'abn';
    divisionsType?: 'remainder_zero_single_digit' | 'with_remainder_single_digit' | 'two_digits' | 'decimals' | 'custom';
    spacingLevel?: 'extra_spacious' | 'standard';
    includeZeroInQuotient?: boolean;
    activityType?: string;
    parentNotes?: string;
  };
  status: 'ready' | 'printed' | 'corrected';
  createdAt: number;
  scannedImageUrl?: string;
  correction?: WorksheetCorrection;
  originType?: 'wizard' | 'homework_reinforcement';
  originHomeworkId?: string;
}

export interface WorksheetInquiryQuestion {
  id: string;
  question: string;
  pedagogicalContext: string;
  options: {
    label: string;
    description: string;
    isRecommended?: boolean;
    value: string;
  }[];
}

// ============================================================================
// TIPOS PARA CORRECCIÓN DE DEBERES DE CLASE / CASA Y GENERACIÓN DE REFUERZO
// ============================================================================

export interface HomeworkClarificationQuestion {
  exerciseIndex: number;
  question: string; // Pregunta pedagógica directa al usuario (ej: "¿Cuál es el segundo número escrito a lápiz?")
  unclearSnippet?: string; // Fragmento confuso o borroso detectado (ej: "4? + 12")
  suggestedOptions?: string[]; // Opciones interpretadas por la IA si hay alternativas plausibles
  userClarification?: string; // Texto introducido o seleccionado por el alumno / tutor
  clarified: boolean;
}

export interface HomeworkExerciseCorrection {
  index: number;
  statement: string; // Enunciado del ejercicio detectado en la foto
  studentAnswer: string; // Lo que escribió el niño en su cuaderno u hoja
  correctSolution: string; // La solución correcta completa
  status: 'correct' | 'partial' | 'incorrect';
  rootError?: string; // Diagnóstico específico del fallo (aritmético, conceptual, lectura...)
  teacherExplanation: string; // Explicación pedagógica del paso
  isAmbiguousOrUnclear?: boolean; // Si hubo dudas de caligrafía o trazo en este ejercicio
  unclearReason?: string; // Explicación de la duda de lectura
  userClarification?: string; // Aclaración confirmada por el usuario
}

export interface RemedialGuideDocument {
  title: string;
  gradeAdaptedSummary: string; // Explicación pedagógica general adaptada a la edad y curso del alumno
  coreConcepts: {
    concept: string;
    explanation: string;
    stepByStepExample: string;
    memoryTip?: string;
  }[];
  mistakesAnalysis: {
    errorIdentified: string;
    whyItHappens: string;
    howToAvoidIt: string;
  }[];
  congratulationAndAdvice: string;
}

export interface ScannedHomeworkRecord {
  id: string;
  childId: string;
  childName: string;
  grade: string;
  subject: string;
  topic: string;
  bookTitle?: string;
  createdAt: number;
  date: string;
  imageUrl: string;
  notes?: string;
  score: number; // 0 a 10
  totalExercises: number;
  correctExercises: number;
  summaryDiagnosis: string;
  whatChildIsMissing: string; // Lo que específicamente no está entendiendo el niño
  exercises: HomeworkExerciseCorrection[];
  remedialGuide: RemedialGuideDocument; // Documento 1: Explicación pedagógica A4 imprimible
  reinforcementWorksheetId: string; // Documento 2: Ficha imprimible de ejercicios vinculada
  reinforcementWorksheet?: PrintableWorksheet;
  awardedXp: number;
  // Métricas de esfuerzo, autonomía e interés del niño y feedback del tutor
  completedByStudent?: boolean; // Realizado de forma autónoma por el propio alumno
  effortLevel?: 'alto' | 'medio' | 'bajo'; // Nivel de dedicación y cuidado en la tarea
  interestLevel?: 'muy_motivado' | 'positivo' | 'le_cuesta_o_bloqueo'; // Interés/actitud percibida
  childSelfReflection?: string; // Lo que el niño indica que le ha costado o su sensación
  tutorFeedback?: {
    reviewedAt: number;
    tutorComment: string;
    tutorSticker?: string; // Ej: 🌟, 🏆, 💪, 🚀
    bonusPoints?: number;
  };
  // Protocolo contra alucinaciones: dudas de lectura y aclaraciones interactivas
  hasReadingDoubts?: boolean;
  clarificationQuestions?: HomeworkClarificationQuestion[];
  clarificationsResolved?: boolean;
  legibilityStatus?: 'perfecta' | 'dudas_aclaradas' | 'dificil';
}

