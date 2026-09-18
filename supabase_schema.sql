-- ==========================================================
-- EduAmigo: Esquema de Base de Datos para Supabase (PostgreSQL)
-- ==========================================================
-- Ejecuta este script completo en el SQL Editor de tu proyecto Supabase.
-- Compatible 100% con PostgreSQL y Supabase.

-- 1. Tabla de Usuarios (Padres)
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(64) PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255),
  password_hash VARCHAR(255),
  parent_pin VARCHAR(10) DEFAULT '1234',
  name VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tabla de Hijos
CREATE TABLE IF NOT EXISTS children (
  id VARCHAR(64) PRIMARY KEY,
  parentId VARCHAR(64) NOT NULL,
  name VARCHAR(255) NOT NULL,
  avatar VARCHAR(10) NOT NULL,
  points INTEGER DEFAULT 0,
  grade VARCHAR(50) NOT NULL,
  country VARCHAR(50) DEFAULT 'España',
  streak_current INTEGER DEFAULT 0,
  streak_lastActive BIGINT DEFAULT 0,
  streak_multiplier REAL DEFAULT 1.0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Tabla de Historial de Consultas (Chat / Tutoría)
CREATE TABLE IF NOT EXISTS history (
  id VARCHAR(64) PRIMARY KEY,
  childId VARCHAR(64) NOT NULL,
  grade VARCHAR(50) NOT NULL,
  subject VARCHAR(100) NOT NULL,
  region VARCHAR(100) NOT NULL,
  question TEXT NOT NULL,
  answer JSONB,
  answer_json JSONB,
  timestamp BIGINT NOT NULL,
  duration INTEGER,
  sentiment VARCHAR(50),
  imageUrl TEXT,
  audioUrl TEXT,
  transcription TEXT
);

-- 4. Tabla de Resultados de Exámenes
CREATE TABLE IF NOT EXISTS exam_results (
  id VARCHAR(64) PRIMARY KEY,
  childId VARCHAR(64) NOT NULL,
  grade VARCHAR(50) NOT NULL,
  subject VARCHAR(100) NOT NULL,
  topic VARCHAR(255) NOT NULL,
  score NUMERIC NOT NULL,
  totalQuestions INTEGER NOT NULL,
  strengths JSONB,
  weaknesses JSONB,
  studyGuideContent TEXT,
  pointsEarned INTEGER DEFAULT 0,
  timestamp BIGINT NOT NULL,
  duration INTEGER
);

-- 5. Tabla de Premios (Rewards)
CREATE TABLE IF NOT EXISTS rewards (
  id VARCHAR(64) PRIMARY KEY,
  userId VARCHAR(64),
  title VARCHAR(255) NOT NULL,
  pointsCost INTEGER NOT NULL,
  icon VARCHAR(10) NOT NULL
);

-- 6. Tabla de Eventos de Agenda / Calendario
CREATE TABLE IF NOT EXISTS calendar_events (
  id VARCHAR(64) PRIMARY KEY,
  childId VARCHAR(64) NOT NULL,
  title VARCHAR(255) NOT NULL,
  date VARCHAR(20) NOT NULL,
  type VARCHAR(50) NOT NULL,
  description TEXT,
  notified BOOLEAN DEFAULT FALSE
);

-- 7. Tabla de Tareas (Tasks)
CREATE TABLE IF NOT EXISTS tasks (
  id VARCHAR(64) PRIMARY KEY,
  childId VARCHAR(64) NOT NULL,
  title VARCHAR(255) NOT NULL,
  dueDate VARCHAR(20) NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  priority VARCHAR(20) DEFAULT 'medium',
  fromRequestId VARCHAR(64)
);

-- 8. Tabla de Peticiones de Alumnos
CREATE TABLE IF NOT EXISTS student_requests (
  id VARCHAR(64) PRIMARY KEY,
  childId VARCHAR(64) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  timestamp BIGINT NOT NULL,
  status VARCHAR(20) DEFAULT 'pending'
);

-- 9. Tabla de Comunicaciones Escolares
CREATE TABLE IF NOT EXISTS school_communications (
  id VARCHAR(64) PRIMARY KEY,
  childId VARCHAR(64) NOT NULL,
  type VARCHAR(50) NOT NULL,
  sender VARCHAR(255) NOT NULL,
  subject VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  date VARCHAR(20) NOT NULL,
  isImportant BOOLEAN DEFAULT FALSE,
  isRead BOOLEAN DEFAULT FALSE
);

-- 10. Tabla de Notas Rápidas
CREATE TABLE IF NOT EXISTS quick_notes (
  id VARCHAR(64) PRIMARY KEY,
  childId VARCHAR(64) NOT NULL,
  text TEXT NOT NULL,
  timestamp BIGINT NOT NULL,
  source VARCHAR(100) NOT NULL
);

-- 11. Tabla de Correcciones de IA
CREATE TABLE IF NOT EXISTS ai_corrections (
  id VARCHAR(64) PRIMARY KEY,
  childId VARCHAR(64) NOT NULL,
  subject VARCHAR(100) NOT NULL,
  originalQuestion TEXT NOT NULL,
  incorrectAnswer TEXT NOT NULL,
  correction TEXT NOT NULL,
  timestamp BIGINT NOT NULL
);

-- 12. Tabla de Notas Académicas
CREATE TABLE IF NOT EXISTS academic_grades (
  id VARCHAR(64) PRIMARY KEY,
  childId VARCHAR(64) NOT NULL,
  subject VARCHAR(100) NOT NULL,
  gradeLevel VARCHAR(50) NOT NULL,
  term VARCHAR(50) NOT NULL,
  value VARCHAR(20) NOT NULL,
  isNumeric BOOLEAN DEFAULT TRUE,
  timestamp BIGINT NOT NULL
);

-- 13. Tabla de Libros e ISBN
CREATE TABLE IF NOT EXISTS books (
  id VARCHAR(64) PRIMARY KEY,
  userId VARCHAR(64) NOT NULL,
  childId VARCHAR(64) NOT NULL,
  isbn VARCHAR(20) NOT NULL,
  title VARCHAR(255) NOT NULL,
  subject VARCHAR(100) NOT NULL,
  grade VARCHAR(50) NOT NULL,
  topics JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 14. Tabla de Sesiones de Caligrafía
CREATE TABLE IF NOT EXISTS calligraphy_sessions (
  id VARCHAR(64) PRIMARY KEY,
  userId VARCHAR(64) NOT NULL,
  childId VARCHAR(64) NOT NULL,
  parentId VARCHAR(64),
  imageUrl TEXT NOT NULL,
  score REAL DEFAULT 0,
  analysis_json JSONB NOT NULL,
  timestamp BIGINT NOT NULL
);

-- 15. Tabla de Estado de Localización
CREATE TABLE IF NOT EXISTS location_states (
  childId VARCHAR(64) PRIMARY KEY,
  isTracking BOOLEAN DEFAULT FALSE,
  homeCoord JSONB,
  homeAddress VARCHAR(255),
  schoolCoord JSONB,
  schoolAddress VARCHAR(255),
  safeRadius INTEGER DEFAULT 200,
  routePath JSONB,
  destination VARCHAR(50)
);

-- 16. Tabla de Progreso de Inglés
CREATE TABLE IF NOT EXISTS english_progress (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  child_id VARCHAR(255) UNIQUE NOT NULL,
  current_level VARCHAR(50) DEFAULT 'Pre-A1 Starters',
  points INTEGER DEFAULT 0,
  completed_lessons TEXT,
  last_active BIGINT,
  streak INTEGER DEFAULT 0
);

-- 17. Tabla de Repaso Espaciado (SRS)
CREATE TABLE IF NOT EXISTS srs_reviews (
  id VARCHAR(64) PRIMARY KEY,
  childId VARCHAR(64) NOT NULL,
  topic VARCHAR(255) NOT NULL,
  subject VARCHAR(100) NOT NULL,
  scheduledDate VARCHAR(20) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  sourceId VARCHAR(64) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 18. Tabla de Sesiones de Lectura
CREATE TABLE IF NOT EXISTS reading_sessions (
  id VARCHAR(64) PRIMARY KEY,
  userId VARCHAR(64) NOT NULL,
  childId VARCHAR(64) NOT NULL,
  audioUrl TEXT,
  score REAL DEFAULT 0,
  analysis_json JSONB,
  timestamp BIGINT NOT NULL,
  transcription TEXT
);

-- 19. Tabla de Sesiones de Matemáticas
CREATE TABLE IF NOT EXISTS math_sessions (
  id VARCHAR(64) PRIMARY KEY,
  userId VARCHAR(64) NOT NULL,
  childId VARCHAR(64) NOT NULL,
  imageUrl TEXT,
  score REAL DEFAULT 0,
  analysis_json JSONB,
  timestamp BIGINT NOT NULL
);

-- 20. Tabla de Tareas de Estudio
CREATE TABLE IF NOT EXISTS study_tasks (
  id VARCHAR(64) PRIMARY KEY,
  bookId VARCHAR(64) NOT NULL,
  childId VARCHAR(64) NOT NULL,
  topicIndex INTEGER NOT NULL,
  topicTitle VARCHAR(255) NOT NULL,
  points_reward INTEGER DEFAULT 0,
  status VARCHAR(20) DEFAULT 'pending',
  summary TEXT,
  handwriting_image TEXT,
  ai_feedback_child TEXT,
  ai_feedback_parent TEXT,
  medical_evaluation TEXT,
  ai_score REAL DEFAULT 0,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 21. Tabla de Informes de Estudio Diarios
CREATE TABLE IF NOT EXISTS daily_study_reports (
  id VARCHAR(64) PRIMARY KEY,
  childId VARCHAR(64) NOT NULL,
  bookId VARCHAR(64) NOT NULL,
  topicIndices JSONB NOT NULL,
  date VARCHAR(20) NOT NULL,
  timestamp BIGINT NOT NULL,
  status VARCHAR(20) DEFAULT 'pending'
);

-- 22. Tabla de Planes de Repaso
CREATE TABLE IF NOT EXISTS review_plans (
  id VARCHAR(64) PRIMARY KEY,
  childId VARCHAR(64) NOT NULL,
  reportId VARCHAR(64) NOT NULL,
  date VARCHAR(20) NOT NULL,
  difficulty VARCHAR(20) DEFAULT 'medium',
  tasks JSONB NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  parentFeedback TEXT
);

-- Índices de optimización de consultas
CREATE INDEX IF NOT EXISTS idx_children_parentId ON children(parentId);
CREATE INDEX IF NOT EXISTS idx_history_childId ON history(childId);
CREATE INDEX IF NOT EXISTS idx_exam_results_childId ON exam_results(childId);
CREATE INDEX IF NOT EXISTS idx_calendar_events_childId ON calendar_events(childId);
CREATE INDEX IF NOT EXISTS idx_tasks_childId ON tasks(childId);
CREATE INDEX IF NOT EXISTS idx_rewards_userId ON rewards(userId);
CREATE INDEX IF NOT EXISTS idx_study_tasks_childId ON study_tasks(childId);
CREATE INDEX IF NOT EXISTS idx_srs_reviews_childId ON srs_reviews(childId);
