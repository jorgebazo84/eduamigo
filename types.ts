
export type GradeLevel = 
  | '1º Primaria' | '2º Primaria' | '3º Primaria' | '4º Primaria' | '5º Primaria' | '6º Primaria'
  | '1º ESO' | '2º ESO' | '3º ESO' | '4º ESO'
  | '1º Bachillerato' | '2º Bachillerato';

export type Subject = string; // More flexible to include all official subjects

export type Term = '1ª Evaluación' | '2ª Evaluación' | '3ª Evaluación' | 'Final';
export type GradeValue = string | number;

export interface AcademicGrade {
  id: string;
  childId: string;
  subject: Subject;
  gradeLevel: GradeLevel;
  term: Term;
  value: GradeValue;
  isNumeric: boolean;
  timestamp: number;
}

export type Region = 
  | 'Andalucía' | 'Aragón' | 'Asturias' | 'Baleares' | 'Canarias' | 'Cantabria' 
  | 'Castilla-La Mancha' | 'Castilla y León' | 'Cataluña' | 'Comunidad Valenciana' 
  | 'Extremadura' | 'Galicia' | 'Madrid' | 'Murcia' | 'Navarra' | 'País Vasco' | 'La Rio_ja';

export type Country = 
  | 'República Dominicana' | 'Colombia' | 'Perú' | 'Ecuador' | 'Argentina' | 'Bolivia' 
  | 'Chile' | 'Costa Rica' | 'Cuba' | 'El Salvador' | 'España' | 'Guatemala' 
  | 'Honduras' | 'México' | 'Nicaragua' | 'Panamá' | 'Paraguay' | 'Puerto Rico' 
  | 'Uruguay' | 'Venezuela';

export type ViewMode = 'ask' | 'chat' | 'student' | 'parent' | 'library' | 'exam' | 'shop' | 'location' | 'vision' | 'voice' | 'planner' | 'scanner' | 'calligraphy' | 'reading' | 'math' | 'daily-report' | 'daily-review' | 'english' | 'pomodoro' | 'static-library';
export type UserRole = 'student' | 'parent' | 'demo' | null;

export type EventType = 'exam' | 'meeting' | 'excursion' | 'support' | 'medical' | 'other';

export interface CalendarEvent {
  id: string;
  childId: string;
  title: string;
  date: string;
  type: EventType;
  description?: string;
  notified?: boolean;
}

export interface StudentRequest {
  id: string;
  childId: string;
  title: string;
  message: string;
  timestamp: number;
  status: 'pending' | 'approved' | 'rejected';
}

export interface Task {
  id: string;
  childId: string;
  title: string;
  dueDate: string;
  completed: boolean;
  priority: 'low' | 'medium' | 'high';
  fromRequestId?: string;
}

// --- Chat History ---
export interface ChatTurn {
  role: 'user' | 'model';
  parts: { text: string }[];
}

export interface ChatHistory {
  childId: string;
  turns: ChatTurn[];
}

// --- Gamification ---
export interface Badge {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlockedAt?: number;
}

export interface Streak {
  current: number;
  lastActive: number; // timestamp
  multiplier: number;
}

// --- Study Planning ---
export interface StudySession {
  id: string;
  topic: string;
  durationMinutes: number;
  recommendation: string;
  completed: boolean;
  completedAt?: number;
}

export interface StudyPlan {
  childId: string;
  date: string;
  sessions: StudySession[];
}

export interface Insight {
  subject: Subject;
  weakness: string;
  suggestion: string;
}

export type SchoolCommType = 'email' | 'circular' | 'interview' | 'warning';

export interface SchoolCommunication {
  id: string;
  childId: string;
  type: SchoolCommType;
  sender: string;
  subject: string;
  content: string;
  date: string;
  isImportant: boolean;
  isRead: boolean;
}

export interface QuickNote {
  id: string;
  childId: string;
  text: string;
  timestamp: number;
  source: string;
}

// --- Location Types ---
export interface Coordinate {
  lat: number;
  lng: number;
}

export interface RoutePoint {
  coord: Coordinate;
  timestamp: number;
  status: 'normal' | 'home' | 'school' | 'deviation';
}

export interface DeviationRecord {
  timestamp: number;
  coord: Coordinate;
}

export interface LocationState {
  childId: string;
  isTracking: boolean;
  currentCoord: Coordinate | null;
  history: RoutePoint[];
  deviationHistory: DeviationRecord[];
  homeCoord: Coordinate | null;
  homeAddress?: string;
  schoolCoord: Coordinate | null;
  schoolAddress?: string;
  safeRadius: number;
  routePath: Coordinate[];
  destination: 'home' | 'school' | null;
  groundingUrls: string[];
}

export interface ExplanationResponse {
  explanation: string;
  examples: string[];
  funFact: string;
  isSOS?: boolean;
  country?: Country;
}

export interface SyllabusTopic {
  id: string;
  title: string;
  description: string;
  subtopics: string[];
}

export interface Exercise {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface TopicDetail {
  title: string;
  content: string;
  keyPoints: string[];
  examples: string[];
  summary: string;
  exercises: Exercise[];
}

export interface HistoryItem {
  id: string;
  childId: string;
  grade: GradeLevel;
  subject: Subject;
  region: Region;
  question: string;
  answer: ExplanationResponse;
  timestamp: number;
  duration?: number;
  sentiment?: string;
  imageUrl?: string;
  audioUrl?: string;
  transcription?: string;
}

export interface ExamResult {
  id: string;
  childId: string;
  grade: GradeLevel;
  subject: Subject;
  topic: string;
  score: number;
  totalQuestions: number;
  strengths: string[];
  weaknesses: string[];
  studyGuideContent: string;
  timestamp: number;
  pointsEarned: number;
  duration?: number;
}

export interface Reward {
  id: string;
  title: string;
  pointsCost: number;
  icon: string;
}

export interface DailyStudyReport {
  id: string;
  childId: string;
  bookId: string;
  topicIndices: number[];
  date: string;
  timestamp: number;
  status: 'pending' | 'reviewed';
}

export interface ReviewTask {
  id: string;
  title: string;
  description: string;
  difficulty: 'easy' | 'medium' | 'hard';
  completed: boolean;
  answer?: string;
  aiFeedback?: string;
  score?: number;
  conceptsToReinforce?: string[];
  duration?: number;
}

export interface ReviewPlan {
  id: string;
  childId: string;
  reportId: string;
  date: string;
  difficulty: 'easy' | 'medium' | 'hard';
  tasks: ReviewTask[];
  status: 'pending' | 'active' | 'completed';
  parentFeedback?: string;
}

export interface AICorrection {
  id: string;
  childId: string;
  subject: Subject;
  originalQuestion: string;
  incorrectAnswer: string;
  correction: string;
  timestamp: number;
}

export interface Child {
  id: string;
  name: string;
  avatar: string;
  points: number;
  grade: GradeLevel;
  country?: Country;
  badges: string[]; // ids of unlocked badges
  streak: Streak;
}

export interface SRSReview {
  id: string;
  childId: string;
  topic: string;
  subject: Subject;
  scheduledDate: string;
  status: 'pending' | 'completed';
  sourceId: string;
}
