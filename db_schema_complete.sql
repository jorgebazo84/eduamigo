-- EduAmigo: Esquema Completo de Base de Datos (MySQL)
-- Este script crea todas las tablas necesarias para una instalación limpia de la aplicación.

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- 1. Tabla de Usuarios (Padres)
CREATE TABLE IF NOT EXISTS `users` (
  `id` varchar(64) NOT NULL,
  `email` varchar(255) NOT NULL,
  `password` varchar(255) DEFAULT NULL,
  `password_hash` varchar(255) DEFAULT NULL,
  `parent_pin` varchar(10) DEFAULT '1234',
  `name` varchar(255) DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. Tabla de Hijos
CREATE TABLE IF NOT EXISTS `children` (
  `id` varchar(64) NOT NULL,
  `parentId` varchar(64) NOT NULL,
  `name` varchar(255) NOT NULL,
  `avatar` varchar(10) NOT NULL,
  `points` int(11) DEFAULT 0,
  `grade` varchar(50) NOT NULL,
  `country` varchar(50) DEFAULT 'España',
  `streak_current` int(11) DEFAULT 0,
  `streak_lastActive` bigint(20) DEFAULT 0,
  `streak_multiplier` float DEFAULT 1,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`parentId`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. Tabla de Historial de Consultas (Chat)
CREATE TABLE IF NOT EXISTS `history` (
  `id` varchar(64) NOT NULL,
  `childId` varchar(64) NOT NULL,
  `grade` varchar(50) NOT NULL,
  `subject` varchar(100) NOT NULL,
  `region` varchar(100) NOT NULL,
  `question` TEXT NOT NULL,
  `answer` JSON DEFAULT NULL, -- Almacena ExplanationResponse
  `answer_json` JSON DEFAULT NULL, -- Almacena ExplanationResponse
  `timestamp` bigint(20) NOT NULL,
  `duration` int(11) DEFAULT NULL,
  `sentiment` varchar(50) DEFAULT NULL,
  `imageUrl` TEXT DEFAULT NULL,
  `audioUrl` TEXT DEFAULT NULL,
  `transcription` TEXT DEFAULT NULL,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`childId`) REFERENCES `children`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. Tabla de Resultados de Exámenes
CREATE TABLE IF NOT EXISTS `exam_results` (
  `id` varchar(64) NOT NULL,
  `childId` varchar(64) NOT NULL,
  `grade` varchar(50) NOT NULL,
  `subject` varchar(100) NOT NULL,
  `topic` varchar(255) NOT NULL,
  `score` int(11) NOT NULL,
  `totalQuestions` int(11) NOT NULL,
  `strengths` JSON DEFAULT NULL,
  `weaknesses` JSON DEFAULT NULL,
  `studyGuideContent` TEXT DEFAULT NULL,
  `pointsEarned` int(11) DEFAULT 0,
  `timestamp` bigint(20) NOT NULL,
  `duration` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`childId`) REFERENCES `children`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 5. Tabla de Premios (Rewards)
CREATE TABLE IF NOT EXISTS `rewards` (
  `id` varchar(64) NOT NULL,
  `userId` varchar(64) DEFAULT NULL,
  `title` varchar(255) NOT NULL,
  `pointsCost` int(11) NOT NULL,
  `icon` varchar(10) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 6. Tabla de Eventos de Agenda
CREATE TABLE IF NOT EXISTS `calendar_events` (
  `id` varchar(64) NOT NULL,
  `childId` varchar(64) NOT NULL,
  `title` varchar(255) NOT NULL,
  `date` varchar(20) NOT NULL,
  `type` varchar(50) NOT NULL,
  `description` TEXT DEFAULT NULL,
  `notified` tinyint(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`childId`) REFERENCES `children`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 7. Tabla de Tareas (Tasks)
CREATE TABLE IF NOT EXISTS `tasks` (
  `id` varchar(64) NOT NULL,
  `childId` varchar(64) NOT NULL,
  `title` varchar(255) NOT NULL,
  `dueDate` varchar(20) NOT NULL,
  `completed` tinyint(1) NOT NULL DEFAULT 0,
  `priority` enum('low', 'medium', 'high') DEFAULT 'medium',
  `fromRequestId` varchar(64) DEFAULT NULL,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`childId`) REFERENCES `children`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 8. Tabla de Peticiones de Alumnos
CREATE TABLE IF NOT EXISTS `student_requests` (
  `id` varchar(64) NOT NULL,
  `childId` varchar(64) NOT NULL,
  `title` varchar(255) NOT NULL,
  `message` TEXT NOT NULL,
  `timestamp` bigint(20) NOT NULL,
  `status` enum('pending', 'approved', 'rejected') DEFAULT 'pending',
  PRIMARY KEY (`id`),
  FOREIGN KEY (`childId`) REFERENCES `children`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 9. Tabla de Comunicaciones Escolares
CREATE TABLE IF NOT EXISTS `school_communications` (
  `id` varchar(64) NOT NULL,
  `childId` varchar(64) NOT NULL,
  `type` varchar(50) NOT NULL,
  `sender` varchar(255) NOT NULL,
  `subject` varchar(255) NOT NULL,
  `content` TEXT NOT NULL,
  `date` varchar(20) NOT NULL,
  `isImportant` tinyint(1) NOT NULL DEFAULT 0,
  `isRead` tinyint(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`childId`) REFERENCES `children`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 10. Tabla de Notas Rápidas
CREATE TABLE IF NOT EXISTS `quick_notes` (
  `id` varchar(64) NOT NULL,
  `childId` varchar(64) NOT NULL,
  `text` TEXT NOT NULL,
  `timestamp` bigint(20) NOT NULL,
  `source` varchar(100) NOT NULL,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`childId`) REFERENCES `children`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 11. Tabla de Correcciones de IA
CREATE TABLE IF NOT EXISTS `ai_corrections` (
  `id` varchar(64) NOT NULL,
  `childId` varchar(64) NOT NULL,
  `subject` varchar(100) NOT NULL,
  `originalQuestion` TEXT NOT NULL,
  `incorrectAnswer` TEXT NOT NULL,
  `correction` TEXT NOT NULL,
  `timestamp` bigint(20) NOT NULL,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`childId`) REFERENCES `children`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 12. Tabla de Notas Académicas
CREATE TABLE IF NOT EXISTS `academic_grades` (
  `id` varchar(64) NOT NULL,
  `childId` varchar(64) NOT NULL,
  `subject` varchar(100) NOT NULL,
  `gradeLevel` varchar(50) NOT NULL,
  `term` varchar(50) NOT NULL,
  `value` varchar(20) NOT NULL,
  `isNumeric` tinyint(1) NOT NULL DEFAULT 1,
  `timestamp` bigint(20) NOT NULL,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`childId`) REFERENCES `children`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 13. Tabla de Libros e ISBN
CREATE TABLE IF NOT EXISTS `books` (
  `id` varchar(64) NOT NULL,
  `userId` varchar(64) NOT NULL,
  `childId` varchar(64) NOT NULL,
  `isbn` varchar(20) NOT NULL,
  `title` varchar(255) NOT NULL,
  `subject` varchar(100) NOT NULL,
  `grade` varchar(50) NOT NULL,
  `topics` JSON NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`childId`) REFERENCES `children`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 14. Tabla de Sesiones de Caligrafía
CREATE TABLE IF NOT EXISTS `calligraphy_sessions` (
  `id` varchar(64) NOT NULL,
  `userId` varchar(64) NOT NULL,
  `childId` varchar(64) NOT NULL,
  `parentId` varchar(64) DEFAULT NULL,
  `imageUrl` TEXT NOT NULL,
  `score` float DEFAULT 0,
  `analysis_json` JSON NOT NULL,
  `timestamp` bigint(20) NOT NULL,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`childId`) REFERENCES `children`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 15. Tabla de Estado de Localización
CREATE TABLE IF NOT EXISTS `location_states` (
  `childId` varchar(64) NOT NULL,
  `isTracking` tinyint(1) NOT NULL DEFAULT 0,
  `homeCoord` JSON DEFAULT NULL,
  `homeAddress` varchar(255) DEFAULT NULL,
  `schoolCoord` JSON DEFAULT NULL,
  `schoolAddress` varchar(255) DEFAULT NULL,
  `safeRadius` int(11) DEFAULT 200,
  `routePath` JSON DEFAULT NULL,
  `destination` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`childId`),
  FOREIGN KEY (`childId`) REFERENCES `children`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 16. Tabla de Progreso de Inglés
CREATE TABLE IF NOT EXISTS `english_progress` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `user_id` VARCHAR(255) NOT NULL,
    `child_id` VARCHAR(255) NOT NULL,
    `current_level` VARCHAR(50) DEFAULT 'Pre-A1 Starters',
    `points` INT DEFAULT 0,
    `completed_lessons` TEXT,
    `last_active` INT,
    `streak` INT DEFAULT 0,
    UNIQUE KEY `unique_child` (`child_id`),
    FOREIGN KEY (`child_id`) REFERENCES `children`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 17. Tabla de Repaso Espaciado (SRS)
CREATE TABLE IF NOT EXISTS `srs_reviews` (
  `id` varchar(64) NOT NULL,
  `childId` varchar(64) NOT NULL,
  `topic` varchar(255) NOT NULL,
  `subject` varchar(100) NOT NULL,
  `scheduledDate` varchar(20) NOT NULL, -- YYYY-MM-DD
  `status` enum('pending', 'completed') DEFAULT 'pending',
  `sourceId` varchar(64) NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`childId`) REFERENCES `children`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 18. Tabla de Sesiones de Lectura
CREATE TABLE IF NOT EXISTS `reading_sessions` (
  `id` varchar(64) NOT NULL,
  `userId` varchar(64) NOT NULL,
  `childId` varchar(64) NOT NULL,
  `audioUrl` TEXT DEFAULT NULL,
  `score` float DEFAULT 0,
  `analysis_json` JSON DEFAULT NULL,
  `timestamp` bigint(20) NOT NULL,
  `transcription` TEXT DEFAULT NULL,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`childId`) REFERENCES `children`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 19. Tabla de Sesiones de Matemáticas
CREATE TABLE IF NOT EXISTS `math_sessions` (
  `id` varchar(64) NOT NULL,
  `userId` varchar(64) NOT NULL,
  `childId` varchar(64) NOT NULL,
  `imageUrl` TEXT DEFAULT NULL,
  `score` float DEFAULT 0,
  `analysis_json` JSON DEFAULT NULL,
  `timestamp` bigint(20) NOT NULL,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`childId`) REFERENCES `children`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 20. Tabla de Tareas de Estudio
CREATE TABLE IF NOT EXISTS `study_tasks` (
  `id` varchar(64) NOT NULL,
  `bookId` varchar(64) NOT NULL,
  `childId` varchar(64) NOT NULL,
  `topicIndex` INTEGER NOT NULL,
  `topicTitle` varchar(255) NOT NULL,
  `points_reward` INTEGER DEFAULT 0,
  `status` enum('pending', 'completed') DEFAULT 'pending',
  `summary` TEXT DEFAULT NULL,
  `handwriting_image` TEXT DEFAULT NULL,
  `ai_feedback_child` TEXT DEFAULT NULL,
  `ai_feedback_parent` TEXT DEFAULT NULL,
  `medical_evaluation` TEXT DEFAULT NULL,
  `ai_score` float DEFAULT 0,
  `completed_at` TIMESTAMP NULL DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`childId`) REFERENCES `children`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 21. Tabla de Informes de Estudio Diarios
CREATE TABLE IF NOT EXISTS `daily_study_reports` (
  `id` varchar(64) NOT NULL,
  `childId` varchar(64) NOT NULL,
  `bookId` varchar(64) NOT NULL,
  `topicIndices` JSON NOT NULL,
  `date` varchar(20) NOT NULL,
  `timestamp` bigint(20) NOT NULL,
  `status` enum('pending', 'reviewed') DEFAULT 'pending',
  PRIMARY KEY (`id`),
  FOREIGN KEY (`childId`) REFERENCES `children`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 22. Tabla de Planes de Repaso
CREATE TABLE IF NOT EXISTS `review_plans` (
  `id` varchar(64) NOT NULL,
  `childId` varchar(64) NOT NULL,
  `reportId` varchar(64) NOT NULL,
  `date` varchar(20) NOT NULL,
  `difficulty` enum('easy', 'medium', 'hard') DEFAULT 'medium',
  `tasks` JSON NOT NULL,
  `status` enum('pending', 'active', 'completed') DEFAULT 'pending',
  `parentFeedback` TEXT DEFAULT NULL,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`childId`) REFERENCES `children`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`reportId`) REFERENCES `daily_study_reports`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

SET FOREIGN_KEY_CHECKS = 1;
