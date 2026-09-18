
import 'dotenv/config';
import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import Database from 'better-sqlite3';
import mysql from 'mysql2/promise';
import pg from 'pg';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import fs from 'fs';

const { Pool: PgPool } = pg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;
  
  // Detect DB type automatically if not specified
  const pgConnString = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL || process.env.POSTGRES_URL;
  const DB_TYPE = process.env.DB_TYPE || (pgConnString ? 'postgres' : (process.env.MYSQL_HOST ? 'mysql' : 'sqlite'));
  console.log(`[DB] Using database type: ${DB_TYPE}`);
  
  let db: any;
  let mysqlPool: mysql.Pool | null = null;
  let pgPool: pg.Pool | null = null;

  // Try to load config from public/config.php if it exists
  let phpConfig: any = {};
  const configPhpPath = path.join(process.cwd(), 'public', 'config.php');
  if (fs.existsSync(configPhpPath)) {
    try {
      const content = fs.readFileSync(configPhpPath, 'utf8');
      const hostMatch = content.match(/define\('DB_HOST',\s*'([^']+)'\)/);
      const nameMatch = content.match(/define\('DB_NAME',\s*'([^']+)'\)/);
      const userMatch = content.match(/define\('DB_USER',\s*'([^']+)'\)/);
      const passMatch = content.match(/define\('DB_PASS',\s*'([^']+)'\)/);
      
      if (hostMatch) phpConfig.host = hostMatch[1];
      if (nameMatch) phpConfig.database = nameMatch[1];
      if (userMatch) phpConfig.user = userMatch[1];
      if (passMatch) phpConfig.password = passMatch[1];
      
      console.log('[DB] Loaded configuration from public/config.php');
    } catch (e) {
      console.error('[DB] Error parsing config.php:', e);
    }
  }

  if (DB_TYPE === 'postgres' || DB_TYPE === 'supabase') {
    try {
      console.log(`[DB] Connecting to PostgreSQL/Supabase...`);
      pgPool = new PgPool({
        connectionString: pgConnString,
        ssl: (pgConnString && pgConnString.includes('localhost')) ? false : { rejectUnauthorized: false }
      });

      await pgPool.query('SELECT 1');
      console.log('[DB] PostgreSQL/Supabase connection test successful');

      const normalizeRow = (row: any) => {
        if (!row || typeof row !== 'object') return row;
        const normalized: any = { ...row };
        if (row.parentid !== undefined && row.parentId === undefined) normalized.parentId = row.parentid;
        if (row.childid !== undefined && row.childId === undefined) normalized.childId = row.childid;
        if (row.userid !== undefined && row.userId === undefined) normalized.userId = row.userid;
        if (row.pointscost !== undefined && row.pointsCost === undefined) normalized.pointsCost = row.pointscost;
        if (row.duedate !== undefined && row.dueDate === undefined) normalized.dueDate = row.duedate;
        if (row.totalquestions !== undefined && row.totalQuestions === undefined) normalized.totalQuestions = row.totalquestions;
        if (row.pointsearned !== undefined && row.pointsEarned === undefined) normalized.pointsEarned = row.pointsearned;
        if (row.streak_lastactive !== undefined && row.streak_lastActive === undefined) normalized.streak_lastActive = row.streak_lastactive;
        if (row.studyguidecontent !== undefined && row.studyGuideContent === undefined) normalized.studyGuideContent = row.studyguidecontent;
        if (row.gradelevel !== undefined && row.gradeLevel === undefined) normalized.gradeLevel = row.gradelevel;
        if (row.isnumeric !== undefined && row.isNumeric === undefined) normalized.isNumeric = row.isnumeric;
        if (row.imageurl !== undefined && row.imageUrl === undefined) normalized.imageUrl = row.imageurl;
        if (row.audiourl !== undefined && row.audioUrl === undefined) normalized.audioUrl = row.audiourl;
        if (row.istracking !== undefined && row.isTracking === undefined) normalized.isTracking = row.istracking;
        if (row.homecoord !== undefined && row.homeCoord === undefined) normalized.homeCoord = row.homecoord;
        if (row.homeaddress !== undefined && row.homeAddress === undefined) normalized.homeAddress = row.homeaddress;
        if (row.schoolcoord !== undefined && row.schoolCoord === undefined) normalized.schoolCoord = row.schoolcoord;
        if (row.schooladdress !== undefined && row.schoolAddress === undefined) normalized.schoolAddress = row.schooladdress;
        if (row.saferadius !== undefined && row.safeRadius === undefined) normalized.safeRadius = row.saferadius;
        if (row.routepath !== undefined && row.routePath === undefined) normalized.routePath = row.routepath;
        if (row.isimportant !== undefined && row.isImportant === undefined) normalized.isImportant = row.isimportant;
        if (row.isread !== undefined && row.isRead === undefined) normalized.isRead = row.isread;
        if (row.originalquestion !== undefined && row.originalQuestion === undefined) normalized.originalQuestion = row.originalquestion;
        if (row.incorrectanswer !== undefined && row.incorrectAnswer === undefined) normalized.incorrectAnswer = row.incorrectanswer;
        if (row.scheduleddate !== undefined && row.scheduledDate === undefined) normalized.scheduledDate = row.scheduleddate;
        if (row.sourceid !== undefined && row.sourceId === undefined) normalized.sourceId = row.sourceid;
        if (row.parentfeedback !== undefined && row.parentFeedback === undefined) normalized.parentFeedback = row.parentfeedback;
        if (row.bookid !== undefined && row.bookId === undefined) normalized.bookId = row.bookid;
        if (row.topicindex !== undefined && row.topicIndex === undefined) normalized.topicIndex = row.topicindex;
        if (row.topictitle !== undefined && row.topicTitle === undefined) normalized.topicTitle = row.topictitle;
        if (row.topicindices !== undefined && row.topicIndices === undefined) normalized.topicIndices = row.topicindices;
        if (row.reportid !== undefined && row.reportId === undefined) normalized.reportId = row.reportid;
        return normalized;
      };

      const convertPlaceholders = (sql: string) => {
        let count = 0;
        return sql.replace(/\?/g, () => `$${++count}`);
      };

      db = {
        prepare: (sql: string) => ({
          run: async (...args: any[]) => {
            const mappedArgs = args.map(a => a === undefined ? null : a);
            const pgSql = convertPlaceholders(sql);
            const res = await pgPool!.query(pgSql, mappedArgs);
            return {
              lastInsertRowid: (res.rows[0] as any)?.id || null,
              changes: res.rowCount
            };
          },
          get: async (...args: any[]) => {
            const mappedArgs = args.map(a => a === undefined ? null : a);
            const pgSql = convertPlaceholders(sql);
            const res = await pgPool!.query(pgSql, mappedArgs);
            return normalizeRow(res.rows[0]);
          },
          all: async (...args: any[]) => {
            const mappedArgs = args.map(a => a === undefined ? null : a);
            const pgSql = convertPlaceholders(sql);
            const res = await pgPool!.query(pgSql, mappedArgs);
            return res.rows.map(normalizeRow);
          }
        }),
        exec: async (sql: string) => {
          await pgPool!.query(sql);
        }
      };
    } catch (err) {
      console.error('[DB] Failed to connect to PostgreSQL/Supabase:', err);
      if (process.env.DB_TYPE === 'postgres' || process.env.DB_TYPE === 'supabase') {
        process.exit(1);
      } else {
        console.log('[DB] Falling back to SQLite due to PostgreSQL connection failure');
        setupSQLite();
      }
    }
  } else if (DB_TYPE === 'mysql') {
    try {
      const mysqlConfig = {
        host: process.env.MYSQL_HOST || phpConfig.host || 'localhost',
        user: process.env.MYSQL_USER || phpConfig.user || 'root',
        password: process.env.MYSQL_PASSWORD || phpConfig.password || '',
        database: process.env.MYSQL_DATABASE || phpConfig.database || 'eduamigo',
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
        supportBigNumbers: true,
        bigNumberStrings: true,
        multipleStatements: true
      };
      
      console.log(`[DB] Connecting to MySQL at ${mysqlConfig.host} as ${mysqlConfig.user}...`);
      mysqlPool = mysql.createPool(mysqlConfig);
      
      // Test connection immediately
      const [testResult] = await mysqlPool.query('SELECT 1');
      console.log('[DB] MySQL connection test successful');
      
      // Helper for MySQL queries to mimic better-sqlite3 API
      db = {
        prepare: (sql: string) => ({
          run: async (...args: any[]) => {
            // Map undefined to null for MySQL
            const mappedArgs = args.map(a => a === undefined ? null : a);
            const [result] = await mysqlPool!.execute(sql, mappedArgs);
            return {
              lastInsertRowid: (result as any).insertId,
              changes: (result as any).affectedRows
            };
          },
          get: async (...args: any[]) => {
            const mappedArgs = args.map(a => a === undefined ? null : a);
            const [rows] = await mysqlPool!.execute(sql, mappedArgs);
            return (rows as any[])[0];
          },
          all: async (...args: any[]) => {
            const mappedArgs = args.map(a => a === undefined ? null : a);
            const [rows] = await mysqlPool!.execute(sql, mappedArgs);
            return rows as any[];
          }
        }),
        exec: async (sql: string) => {
          // With multipleStatements: true, we can execute the whole block
          await mysqlPool!.query(sql);
        }
      };
    } catch (err) {
      console.error('[DB] Failed to connect to MySQL:', err);
      // Fallback to SQLite if MySQL fails but user didn't explicitly force it?
      // No, if they specified MySQL, we should probably fail.
      if (process.env.DB_TYPE === 'mysql') {
        process.exit(1);
      } else {
        console.log('[DB] Falling back to SQLite due to MySQL connection failure');
        setupSQLite();
      }
    }
  } else {
    setupSQLite();
  }

  function setupSQLite() {
    try {
      db = new Database('eduamigo.db');
      console.log('[DB] SQLite connected successfully');
      
      // Wrap SQLite to be async-compatible with the MySQL helper
      const originalPrepare = db.prepare.bind(db);
      db.prepare = (sql: string) => {
        const stmt = originalPrepare(sql);
        return {
          run: async (...args: any[]) => {
            const result = stmt.run(...args);
            return {
              lastInsertRowid: result.lastInsertRowid,
              changes: result.changes
            };
          },
          get: async (...args: any[]) => stmt.get(...args),
          all: async (...args: any[]) => stmt.all(...args)
        };
      };
      const originalExec = db.exec.bind(db);
      db.exec = async (sql: string) => originalExec(sql);
    } catch (err) {
      console.error('[DB] Failed to connect to SQLite:', err);
      process.exit(1);
    }
  }

  try {
    const testHash = await bcrypt.hash('test', 10);
    const testMatch = await bcrypt.compare('test', testHash);
    console.log('Bcrypt test:', testMatch ? 'OK' : 'FAIL');
  } catch (err) {
    console.error('Bcrypt test error:', err);
  }

  // Initialize tables if they don't exist
  // We'll use the db_schema_complete.sql file if it exists and we're on MySQL,
  // or just use the hardcoded ones as a fallback.
  try {
    if (DB_TYPE === 'mysql' && fs.existsSync(path.join(process.cwd(), 'db_schema_complete.sql'))) {
      console.log('[DB] Initializing MySQL from db_schema_complete.sql');
      const schema = fs.readFileSync(path.join(process.cwd(), 'db_schema_complete.sql'), 'utf8');
      await db.exec(schema);
    } else {
      await db.exec(`
        CREATE TABLE IF NOT EXISTS users (
          id VARCHAR(64) PRIMARY KEY,
          email VARCHAR(255) UNIQUE,
          password_hash VARCHAR(255),
          parent_pin VARCHAR(10) DEFAULT '1234'
        );

        CREATE TABLE IF NOT EXISTS children (
          id VARCHAR(64) PRIMARY KEY,
          parentId VARCHAR(64),
          name VARCHAR(255),
          avatar VARCHAR(10),
          points INTEGER DEFAULT 0,
          grade VARCHAR(50),
          country VARCHAR(50) DEFAULT 'España',
          streak_current INTEGER DEFAULT 0,
          streak_last_active BIGINT DEFAULT 0,
          streak_multiplier FLOAT DEFAULT 1.0
        );

        CREATE TABLE IF NOT EXISTS rewards (
          id VARCHAR(64) PRIMARY KEY,
          userId VARCHAR(64),
          title VARCHAR(255),
          pointsCost INTEGER,
          icon VARCHAR(10)
        );

        CREATE TABLE IF NOT EXISTS history (
          id VARCHAR(64) PRIMARY KEY,
          childId VARCHAR(64),
          grade VARCHAR(50),
          subject VARCHAR(100),
          region VARCHAR(100),
          question TEXT,
          answer_json TEXT,
          timestamp BIGINT,
          duration INTEGER,
          sentiment VARCHAR(50),
          imageUrl TEXT,
          audioUrl TEXT,
          transcription TEXT
        );

        CREATE TABLE IF NOT EXISTS exam_results (
          id VARCHAR(64) PRIMARY KEY,
          childId VARCHAR(64),
          grade VARCHAR(50),
          subject VARCHAR(100),
          topic VARCHAR(255),
          score FLOAT,
          totalQuestions INTEGER,
          strengths TEXT,
          weaknesses TEXT,
          studyGuideContent TEXT,
          pointsEarned INTEGER,
          timestamp BIGINT,
          duration INTEGER
        );

        CREATE TABLE IF NOT EXISTS calendar_events (
          id VARCHAR(64) PRIMARY KEY,
          childId VARCHAR(64),
          title VARCHAR(255),
          date VARCHAR(20),
          type VARCHAR(50),
          description TEXT,
          notified INTEGER DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS tasks (
          id VARCHAR(64) PRIMARY KEY,
          childId VARCHAR(64),
          title VARCHAR(255),
          dueDate VARCHAR(20),
          completed INTEGER DEFAULT 0,
          priority VARCHAR(20)
        );

        CREATE TABLE IF NOT EXISTS english_progress (
          child_id VARCHAR(64) PRIMARY KEY,
          user_id VARCHAR(64),
          current_level VARCHAR(50),
          points INTEGER,
          completed_lessons TEXT,
          last_active BIGINT,
          streak INTEGER
        );

        CREATE TABLE IF NOT EXISTS books (
          id VARCHAR(64) PRIMARY KEY,
          userId VARCHAR(64),
          childId VARCHAR(64),
          isbn VARCHAR(20),
          title VARCHAR(255),
          subject VARCHAR(100),
          grade VARCHAR(50),
          topics TEXT
        );

        CREATE TABLE IF NOT EXISTS study_tasks (
          id VARCHAR(64) PRIMARY KEY,
          bookId VARCHAR(64),
          childId VARCHAR(64),
          topicIndex INTEGER,
          topicTitle VARCHAR(255),
          points_reward INTEGER,
          status VARCHAR(20) DEFAULT 'pending',
          summary TEXT,
          handwriting_image TEXT,
          ai_feedback_child TEXT,
          ai_feedback_parent TEXT,
          medical_evaluation TEXT,
          ai_score FLOAT,
          completed_at VARCHAR(50),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS calligraphy_sessions (
          id VARCHAR(64) PRIMARY KEY,
          userId VARCHAR(64),
          childId VARCHAR(64),
          imageUrl TEXT,
          score FLOAT,
          analysis_json TEXT,
          timestamp BIGINT,
          parentId VARCHAR(64)
        );

        CREATE TABLE IF NOT EXISTS math_sessions (
          id VARCHAR(64) PRIMARY KEY,
          userId VARCHAR(64),
          childId VARCHAR(64),
          imageUrl TEXT,
          score FLOAT,
          analysis_json TEXT,
          timestamp BIGINT
        );

        CREATE TABLE IF NOT EXISTS reading_sessions (
          id VARCHAR(64) PRIMARY KEY,
          userId VARCHAR(64),
          childId VARCHAR(64),
          audioUrl TEXT,
          score FLOAT,
          analysis_json TEXT,
          timestamp BIGINT,
          transcription TEXT
        );

        CREATE TABLE IF NOT EXISTS srs_reviews (
          id VARCHAR(64) PRIMARY KEY,
          childId VARCHAR(64),
          topic VARCHAR(255),
          subject VARCHAR(100),
          scheduledDate VARCHAR(20),
          status VARCHAR(20) DEFAULT 'pending',
          sourceId VARCHAR(64),
          createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
    }
  } catch (err) {
    console.error('[DB] Initialization error (safe to ignore if tables exist):', err);
  }

  app.use(express.json());

  // Mock auth.php
  app.post('/auth.php', async (req, res) => {
    const action = req.query.action;
    const { email, password, parentPin, userId, newPin, newPassword, pin } = req.body || {};

    console.log(`[AUTH] Action: ${action}, Email: ${email}, UserId: ${userId}`);

    try {
      if (action === 'register') {
        if (!email || !password) throw new Error('Email y contraseña son obligatorios');
        console.log(`[AUTH] Registering user: ${email}`);
        const id = crypto.randomUUID();
        const hash = await bcrypt.hash(password, 10);
        await db.prepare('INSERT INTO users (id, email, password_hash, parent_pin) VALUES (?, ?, ?, ?)').run(id, email, hash, parentPin || '1234');
        console.log(`[AUTH] User registered: ${id}`);
        res.json({ status: 'success', userId: id, email, pin: parentPin || '1234' });
      } else if (action === 'login') {
        if (!email || !password) throw new Error('Email y contraseña son obligatorios');
        console.log(`[AUTH] Login attempt: ${email}`);
        const user = await db.prepare('SELECT * FROM users WHERE email = ?').get(email);
        if (user) {
          console.log(`[AUTH] User found: ${user.id}`);
          const isMatch = await bcrypt.compare(password, user.password_hash);
          if (isMatch) {
            console.log(`[AUTH] Password match for: ${email}`);
            res.json({ status: 'success', userId: user.id, email: user.email, pin: user.parent_pin });
          } else {
            console.log(`[AUTH] Password mismatch for: ${email}`);
            res.status(400).json({ error: 'Credenciales incorrectas' });
          }
        } else {
          console.log(`[AUTH] User not found: ${email}`);
          res.status(400).json({ error: 'Credenciales incorrectas' });
        }
      } else if (action === 'reset_password') {
        if (!email || !pin || !newPassword) throw new Error('Datos incompletos para restablecer contraseña');
        console.log(`[AUTH] Reset password attempt: ${email}`);
        const user = await db.prepare('SELECT * FROM users WHERE email = ? AND parent_pin = ?').get(email, pin);
        if (!user) {
          console.log(`[AUTH] User/PIN mismatch for: ${email}`);
          return res.status(400).json({ error: 'Email o PIN incorrectos' });
        }
        const hash = await bcrypt.hash(newPassword, 10);
        await db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, user.id);
        console.log(`[AUTH] Password reset successful: ${email}`);
        res.json({ status: 'success' });
      } else if (action === 'update_pin') {
        if (!userId || !newPin) throw new Error('Datos incompletos para actualizar PIN');
        console.log(`[AUTH] Update PIN attempt: ${userId}`);
        await db.prepare('UPDATE users SET parent_pin = ? WHERE id = ?').run(newPin, userId);
        console.log(`[AUTH] PIN updated: ${userId}`);
        res.json({ status: 'success' });
      } else {
        console.log(`[AUTH] Invalid action: ${action}`);
        res.status(400).json({ error: 'Acción no válida' });
      }
    } catch (e: any) {
      console.error('[AUTH] Error:', e);
      res.status(400).json({ error: e.message });
    }
  });

  // Mock api.php
  app.all('/api.php', async (req, res) => {
    const action = req.query.action;
    const userId = req.query.userId as string;
    const id = req.query.id as string;
    const data = req.body || {};

    try {
      if (action === 'get_initial_data') {
        if (!userId) throw new Error('userId es obligatorio');
        const children = await db.prepare('SELECT * FROM children WHERE parentId = ?').all(userId);
        const rewards = await db.prepare('SELECT * FROM rewards WHERE userId = ?').all(userId);
        const history = await db.prepare('SELECT * FROM history WHERE childId IN (SELECT id FROM children WHERE parentId = ?) ORDER BY timestamp DESC LIMIT 100').all(userId);
        const exams = await db.prepare('SELECT * FROM exam_results WHERE childId IN (SELECT id FROM children WHERE parentId = ?) ORDER BY timestamp DESC LIMIT 50').all(userId);
        const events = await db.prepare('SELECT * FROM calendar_events WHERE childId IN (SELECT id FROM children WHERE parentId = ?)').all(userId);
        const tasks = await db.prepare('SELECT * FROM tasks WHERE childId IN (SELECT id FROM children WHERE parentId = ?)').all(userId);

        res.json({
          children,
          rewards,
          history: history.map((h: any) => {
            try {
              const answer = typeof h.answer_json === 'string' ? JSON.parse(h.answer_json || '{}') : (h.answer_json || {});
              return { ...h, answer };
            } catch (e) {
              return { ...h, answer: {} };
            }
          }),
          examHistory: exams.map((e: any) => {
            try {
              return {
                ...e,
                strengths: typeof e.strengths === 'string' ? JSON.parse(e.strengths || '[]') : (e.strengths || []),
                weaknesses: typeof e.weaknesses === 'string' ? JSON.parse(e.weaknesses || '[]') : (e.weaknesses || [])
              };
            } catch (err) {
              return e;
            }
          }),
          events,
          tasks,
          requests: []
        });
      } else if (action === 'add_child') {
        if (!userId || !data.id || !data.name) throw new Error('Datos de hijo incompletos');
        await db.prepare('INSERT INTO children (id, parentId, name, avatar, points, grade, country, streak_current, streak_last_active, streak_multiplier) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
          .run(data.id, userId, data.name, data.avatar, data.points, data.grade, data.country || 'España', data.streak?.current || 0, data.streak?.lastActive || 0, data.streak?.multiplier || 1);
        res.json({ status: 'success' });
      } else if (action === 'update_child') {
        if (!id) throw new Error('id es obligatorio');
        await db.prepare('UPDATE children SET name = ?, grade = ?, avatar = ? WHERE id = ?').run(data.name, data.grade, data.avatar, id);
        res.json({ status: 'success' });
      } else if (action === 'delete_child') {
        if (!id) throw new Error('id es obligatorio');
        await db.prepare('DELETE FROM children WHERE id = ?').run(id);
        res.json({ status: 'success' });
      } else if (action === 'add_reward') {
        if (!userId || !data.id || !data.title) throw new Error('Datos de premio incompletos');
        await db.prepare('INSERT INTO rewards (id, userId, title, pointsCost, icon) VALUES (?, ?, ?, ?, ?)').run(data.id, userId, data.title, data.pointsCost, data.icon);
        res.json({ status: 'success' });
      } else if (action === 'delete_reward') {
        if (!id || !userId) throw new Error('id y userId son obligatorios');
        await db.prepare('DELETE FROM rewards WHERE id = ? AND userId = ?').run(id, userId);
        res.json({ status: 'success' });
      } else if (action === 'save_history') {
        if (!data.id || !data.childId) throw new Error('Datos de historial incompletos');
        await db.prepare('INSERT INTO history (id, childId, grade, subject, region, question, answer_json, timestamp, duration, sentiment, imageUrl, audioUrl, transcription) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
          .run(data.id, data.childId, data.grade, data.subject, data.region, data.question, JSON.stringify(data.answer || {}), data.timestamp, data.duration || null, data.sentiment || null, data.imageUrl || null, data.audioUrl || null, data.transcription || null);
        res.json({ status: 'success' });
      } else if (action === 'add_event') {
        if (!data.id || !data.childId) throw new Error('Datos de evento incompletos');
        await db.prepare('INSERT INTO calendar_events (id, childId, title, date, type, description, notified) VALUES (?, ?, ?, ?, ?, ?, ?)')
          .run(data.id, data.childId, data.title, data.date, data.type, data.description || '', data.notified ? 1 : 0);
        res.json({ status: 'success' });
      } else if (action === 'delete_event') {
        if (!id) throw new Error('id es obligatorio');
        await db.prepare('DELETE FROM calendar_events WHERE id = ?').run(id);
        res.json({ status: 'success' });
      } else if (action === 'add_task') {
        if (!data.id || !data.childId) throw new Error('Datos de tarea incompletos');
        await db.prepare('INSERT INTO tasks (id, childId, title, dueDate, completed, priority) VALUES (?, ?, ?, ?, ?, ?)').run(data.id, data.childId, data.title, data.dueDate, 0, data.priority);
        res.json({ status: 'success' });
      } else if (action === 'toggle_task') {
        if (!id) throw new Error('id es obligatorio');
        await db.prepare('UPDATE tasks SET completed = 1 - completed WHERE id = ?').run(id);
        res.json({ status: 'success' });
      } else if (action === 'delete_task') {
        if (!id) throw new Error('id es obligatorio');
        await db.prepare('DELETE FROM tasks WHERE id = ?').run(id);
        res.json({ status: 'success' });
      } else if (action === 'update_child_points') {
        if (!data.id) throw new Error('id de hijo es obligatorio');
        await db.prepare('UPDATE children SET points = ?, streak_current = ?, streak_last_active = ?, streak_multiplier = ? WHERE id = ?')
          .run(data.points, data.streak?.current || 0, data.streak?.lastActive || 0, data.streak?.multiplier || 1, data.id);
        res.json({ status: 'success' });
      } else {
        res.status(400).json({ error: 'Acción no válida' });
      }
    } catch (e: any) {
      console.error('API Error:', e);
      res.status(400).json({ error: e.message });
    }
  });

  // Mock api_english.php
  app.post('/api_english.php', async (req, res) => {
    const action = req.query.action;
    const data = req.body;
    try {
      if (action === 'get_progress') {
        const progress = await db.prepare('SELECT * FROM english_progress WHERE child_id = ?').get(data.childId);
        if (progress) {
          res.json({
            status: 'success',
            data: {
              userId: progress.user_id,
              childId: progress.child_id,
              currentLevel: progress.current_level,
              points: progress.points,
              completedLessons: typeof progress.completed_lessons === 'string' ? JSON.parse(progress.completed_lessons || '[]') : (progress.completed_lessons || []),
              lastActive: progress.last_active,
              streak: progress.streak
            }
          });
        } else {
          res.json({ status: 'not_found' });
        }
      } else if (action === 'save_progress') {
        if (DB_TYPE === 'mysql') {
          await db.prepare(`
            INSERT INTO english_progress (child_id, user_id, current_level, points, completed_lessons, last_active, streak)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
              current_level = VALUES(current_level),
              points = VALUES(points),
              completed_lessons = VALUES(completed_lessons),
              last_active = VALUES(last_active),
              streak = VALUES(streak)
          `).run(data.childId, data.userId, data.currentLevel, data.points, JSON.stringify(data.completedLessons || []), data.lastActive, data.streak);
        } else {
          await db.prepare(`
            INSERT INTO english_progress (child_id, user_id, current_level, points, completed_lessons, last_active, streak)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(child_id) DO UPDATE SET
              current_level = excluded.current_level,
              points = excluded.points,
              completed_lessons = excluded.completed_lessons,
              last_active = excluded.last_active,
              streak = excluded.streak
          `).run(data.childId, data.userId, data.currentLevel, data.points, JSON.stringify(data.completedLessons || []), data.lastActive, data.streak);
        }
        res.json({ status: 'success' });
      }
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  // Mock api_study.php
  app.all('/api_study.php', async (req, res) => {
    const action = req.query.action;
    const userId = req.query.userId;
    const childId = req.query.childId;
    const id = req.query.id as string;
    const data = req.body;

    try {
      if (action === 'get_study_data') {
        const books = await db.prepare('SELECT * FROM books WHERE userId = ? AND childId = ?').all(userId, childId);
        const tasks = await db.prepare('SELECT * FROM study_tasks WHERE childId = ?').all(childId);
        res.json({
          books: books.map((b: any) => ({ ...b, topics: typeof b.topics === 'string' ? JSON.parse(b.topics || '[]') : (b.topics || []) })),
          tasks: tasks.map((t: any) => ({
            ...t,
            pointsReward: t.points_reward,
            handwritingImage: t.handwriting_image,
            aiFeedbackChild: t.ai_feedback_child,
            aiFeedbackParent: t.ai_feedback_parent,
            medicalEvaluation: t.medical_evaluation,
            aiScore: t.ai_score,
            completedAt: t.completed_at,
            createdAt: t.created_at
          }))
        });
      } else if (action === 'add_book') {
        await db.prepare('INSERT INTO books (id, userId, childId, isbn, title, subject, grade, topics) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
          .run(data.id, userId, data.childId, data.isbn, data.title, data.subject, data.grade, JSON.stringify(data.topics));
        res.json({ success: true });
      } else if (action === 'delete_book') {
        await db.prepare('DELETE FROM books WHERE id = ? AND userId = ?').run(id, userId);
        res.json({ success: true });
      } else if (action === 'add_study_task') {
        await db.prepare('INSERT INTO study_tasks (id, bookId, childId, topicIndex, topicTitle, points_reward) VALUES (?, ?, ?, ?, ?, ?)')
          .run(data.id, data.bookId, data.childId, data.topicIndex, data.topicTitle, data.pointsReward);
        res.json({ success: true });
      } else if (action === 'complete_study_task') {
        await db.prepare('UPDATE study_tasks SET status = "completed", summary = ?, handwriting_image = ?, ai_feedback_child = ?, ai_feedback_parent = ?, medical_evaluation = ?, ai_score = ?, completed_at = CURRENT_TIMESTAMP WHERE id = ?')
          .run(data.summary, data.handwritingImage || null, data.aiFeedbackChild, data.aiFeedbackParent, data.medicalEvaluation || null, data.aiScore, data.id);
        await db.prepare('UPDATE children SET points = points + ? WHERE id = ?').run(data.pointsReward, data.childId);
        res.json({ success: true });
      } else if (action === 'save_calligraphy_session') {
        await db.prepare('INSERT INTO calligraphy_sessions (id, userId, childId, imageUrl, score, analysis_json, timestamp, parentId) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
          .run(data.id, userId, data.childId, data.imageUrl, data.score, JSON.stringify(data.analysis), data.timestamp, data.parentId || null);
        res.json({ success: true });
      } else if (action === 'get_calligraphy_history') {
        const sessions = await db.prepare('SELECT * FROM calligraphy_sessions WHERE childId = ? ORDER BY timestamp DESC').all(childId);
        res.json(sessions.map((s: any) => ({ ...s, analysis: typeof s.analysis_json === 'string' ? JSON.parse(s.analysis_json || '{}') : (s.analysis_json || {}) })));
      } else if (action === 'save_math_session') {
        await db.prepare('INSERT INTO math_sessions (id, userId, childId, imageUrl, score, analysis_json, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?)')
          .run(data.id, userId, data.childId, data.imageUrl, data.score, JSON.stringify(data.analysis), data.timestamp);
        res.json({ success: true });
      } else if (action === 'get_math_history') {
        const sessions = await db.prepare('SELECT * FROM math_sessions WHERE childId = ? ORDER BY timestamp DESC').all(childId);
        res.json(sessions.map((s: any) => ({ ...s, analysis: typeof s.analysis_json === 'string' ? JSON.parse(s.analysis_json || '{}') : (s.analysis_json || {}) })));
      } else if (action === 'save_reading_session') {
        await db.prepare('INSERT INTO reading_sessions (id, userId, childId, audioUrl, score, analysis_json, timestamp, transcription) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
          .run(data.id, userId, data.childId, data.audioUrl || null, data.score, JSON.stringify(data.analysis), data.timestamp, data.transcription || null);
        res.json({ success: true });
      } else if (action === 'get_reading_history') {
        const sessions = await db.prepare('SELECT * FROM reading_sessions WHERE childId = ? ORDER BY timestamp DESC').all(childId);
        res.json(sessions.map((s: any) => ({ ...s, analysis: typeof s.analysis_json === 'string' ? JSON.parse(s.analysis_json || '{}') : (s.analysis_json || {}) })));
      } else if (action === 'get_srs_reviews') {
        const reviews = await db.prepare('SELECT * FROM srs_reviews WHERE childId = ? AND status = "pending"').all(childId);
        res.json(reviews);
      } else if (action === 'add_srs_review') {
        await db.prepare('INSERT INTO srs_reviews (id, childId, topic, subject, scheduledDate, sourceId) VALUES (?, ?, ?, ?, ?, ?)')
          .run(data.id, data.childId, data.topic, data.subject, data.scheduledDate, data.sourceId);
        res.json({ success: true });
      } else if (action === 'complete_srs_review') {
        await db.prepare('UPDATE srs_reviews SET status = "completed" WHERE id = ?').run(id);
        res.json({ success: true });
      }
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    // Support both Express v4 and Express v5 wildcard patterns safely
    app.use((req, res, next) => {
      if (req.method === 'GET' && !req.path.startsWith('/api')) {
        return res.sendFile(path.join(distPath, 'index.html'));
      }
      next();
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
