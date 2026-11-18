// Opción 10 — Zona de juegos, y opción 11 — prácticas de FP de Informática.
// - Juegos sin IA: el servidor prepara cada partida, guarda las soluciones y corrige cada respuesta.
// - Se abren cuando el niño ha estudiado algo ese día (los padres pueden quitar esta condición).
// - Tiempo de juego al día: 30 minutos por defecto; los padres lo cambian o apagan los juegos que quieran.
// - Puntos: hasta 10 por partida según los aciertos, máximo 40 al día. No cuentan para la racha.
// - Prácticas de FP (Monta un PC, Red IP, Ley de Ohm, Ofimática): cuentan como estudio, sin desbloqueo ni tiempo de juego.
import type express from 'express';
import crypto from 'crypto';
import { GAMES, GAME_BY_ID, GAMES_DEFAULT_MINUTES, GAMES_DAILY_POINTS, PRACTICE_DAILY_POINTS, ROUND_MAX_POINTS } from '../shared/gamesCatalog';
import { gradeIndex } from '../shared/grades';
import { isItGb } from '../shared/fpCurriculum';
import { makeRound, gradeItem, hangLetter, GameItem } from './gamesBank';
import { awardActivity, awardGamePoints, earnedToday, studiedToday, startOfTodayMadrid } from './rewards';

type Db = any;
export interface GamesDeps {
  db: Db;
  getSession: (req: express.Request) => Promise<{ tokenHash: string; userId: string; parentUntil: number } | null>;
  isParentUnlocked: (s: { parentUntil: number }) => boolean;
  refreshParentWindow: (tokenHash: string) => Promise<void>;
}

const ROUND_TTL_MS = 30 * 60 * 1000;     // una partida caduca a la media hora
const ROUND_TIME_CAP_MS = 15 * 60 * 1000; // una partida cuenta como mucho 15 minutos de juego
const ROUNDS_PER_DAY = 60;                // tope de seguridad
const MAX_MINUTES = 180;
const parse = (s: any, d: any) => { try { return JSON.parse(s); } catch { return d; } };

export async function initGamesTables(db: Db) {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS game_settings (
      child_id VARCHAR(64) PRIMARY KEY,
      enabled INTEGER DEFAULT 1,
      minutes INTEGER DEFAULT ${GAMES_DEFAULT_MINUTES},
      require_study INTEGER DEFAULT 1,
      disabled_json TEXT DEFAULT '[]',
      updated_at BIGINT
    );
    CREATE TABLE IF NOT EXISTS game_rounds (
      id VARCHAR(64) PRIMARY KEY,
      user_id VARCHAR(64) NOT NULL,
      child_id VARCHAR(64) NOT NULL,
      game_id VARCHAR(24) NOT NULL,
      practice INTEGER DEFAULT 0,
      items_json TEXT NOT NULL,
      results_json TEXT NOT NULL,
      started_at BIGINT NOT NULL,
      last_at BIGINT NOT NULL,
      finished_at BIGINT,
      correct INTEGER,
      total INTEGER,
      points INTEGER
    );
    CREATE INDEX IF NOT EXISTS idx_game_rounds_child ON game_rounds (child_id, started_at);
  `);
}

async function settingsOf(db: Db, childId: string) {
  const r = await db.prepare('SELECT * FROM game_settings WHERE child_id = ?').get(childId);
  return {
    enabled: r ? !!Number(r.enabled) : true,
    minutes: r ? Number(r.minutes) : GAMES_DEFAULT_MINUTES,
    requireStudy: r ? !!Number(r.require_study) : true,
    disabled: r ? (parse(r.disabled_json, []) as string[]) : [],
  };
}

/** Minutos de juego gastados hoy (las prácticas no cuentan) */
async function minutesUsedToday(db: Db, childId: string) {
  const rows = await db.prepare('SELECT started_at, last_at FROM game_rounds WHERE child_id = ? AND practice = 0 AND started_at >= ?').all(childId, startOfTodayMadrid());
  const ms = rows.reduce((a: number, r: any) => a + Math.min(ROUND_TIME_CAP_MS, Math.max(0, Number(r.last_at) - Number(r.started_at))), 0);
  return Math.round((ms / 60000) * 10) / 10;
}

/** Juegos que le tocan por curso; las prácticas, solo a quien estudia FP de Informática */
function gamesFor(grade: string) {
  const L = gradeIndex(grade);
  const it = isItGb(grade);
  return GAMES.filter((g) => (g.practice ? it : L >= g.min && L <= g.max));
}

/** Lo que ve el navegador de un ejercicio: sin la solución; en el ahorcado, las letras ya descubiertas */
function publicItem(it: GameItem, res: any) {
  if (it.pub.type === 'hangman') {
    const word: string = it.key;
    const guessed: string[] = res?.guessed || [];
    return { ...it.pub, revealed: word.split('').map((c) => (guessed.includes(hangLetter(c)) ? c : null)), guessed, errors: res?.errors || 0 };
  }
  return it.pub;
}

export async function registerGamesRoutes(app: express.Express, deps: GamesDeps) {
  const { db, getSession, isParentUnlocked, refreshParentWindow } = deps;
  await initGamesTables(db);
  const ownChild = (userId: string, childId: string) => db.prepare('SELECT id, name, grade FROM children WHERE id = ? AND parentId = ?').get(String(childId || ''), userId);
  const PARENT_ACTIONS = new Set(['parent_get', 'parent_set']);

  const stateFor = async (child: any) => {
    const settings = await settingsOf(db, child.id);
    const studied = await studiedToday(db, child.id);
    const used = await minutesUsedToday(db, child.id);
    const pointsToday = await earnedToday(db, child.id, 'games');
    const practicePoints = await earnedToday(db, child.id, 'practice');
    let lock: string | null = null;
    if (!settings.enabled) lock = 'disabled';
    else if (settings.requireStudy && !studied) lock = 'study';
    else if (used >= settings.minutes) lock = 'time';
    return {
      games: gamesFor(child.grade).map((g) => ({ ...g, off: !g.practice && settings.disabled.includes(g.id) })),
      lock, studied, minutesLimit: settings.minutes, minutesUsed: used,
      pointsToday, pointsCap: GAMES_DAILY_POINTS, practicePointsToday: practicePoints, practiceCap: PRACTICE_DAILY_POINTS,
      requireStudy: settings.requireStudy, enabled: settings.enabled, fpIt: isItGb(child.grade),
    };
  };

  app.post('/api_games.php', async (req, res) => {
    const action = String(req.query.action || '');
    const b = req.body || {};
    try {
      const session = await getSession(req);
      if (!session) return res.status(401).json({ error: 'Sesión no válida. Vuelve a iniciar sesión.', code: 'AUTH_REQUIRED' });
      const userId = session.userId;
      if (PARENT_ACTIONS.has(action)) {
        if (!isParentUnlocked(session)) return res.status(403).json({ error: 'Esta acción necesita el PIN de padres.', code: 'PIN_REQUIRED' });
        await refreshParentWindow(session.tokenHash);
      }
      const child = await ownChild(userId, b.childId);
      if (!child) return res.status(404).json({ error: 'Perfil no encontrado' });

      if (action === 'state') return res.json(await stateFor(child));

      // ------------------------------------------------ empezar partida
      if (action === 'start') {
        const game = GAME_BY_ID[String(b.gameId || '')];
        if (!game || !gamesFor(child.grade).some((g) => g.id === game.id)) return res.status(404).json({ error: 'Ese juego no está disponible para tu curso.' });
        const st = await stateFor(child);
        if (!game.practice) {
          if (st.lock === 'disabled') return res.status(403).json({ error: 'Tus padres han desactivado los juegos.', code: 'GAMES_OFF' });
          if (st.lock === 'study') return res.status(403).json({ error: 'Los juegos se abren cuando hayas estudiado algo hoy.', code: 'STUDY_FIRST' });
          if (st.lock === 'time') return res.status(429).json({ error: 'Se ha acabado el tiempo de juego de hoy. ¡Mañana más!', code: 'TIME_UP' });
          if (st.games.find((g) => g.id === game.id)?.off) return res.status(403).json({ error: 'Tus padres han desactivado este juego.', code: 'GAME_OFF' });
        }
        const today = Number((await db.prepare('SELECT COUNT(*) AS n FROM game_rounds WHERE child_id = ? AND started_at >= ?').get(child.id, startOfTodayMadrid()))?.n || 0);
        if (today >= ROUNDS_PER_DAY) return res.status(429).json({ error: 'Por hoy ya has jugado mucho. ¡Mañana más!', code: 'DAILY_LIMIT' });
        const items = makeRound(game.id, gradeIndex(child.grade));
        if (!items.length) return res.status(500).json({ error: 'No se ha podido preparar la partida.' });
        const id = crypto.randomUUID();
        const now = Date.now();
        await db.prepare('INSERT INTO game_rounds (id, user_id, child_id, game_id, practice, items_json, results_json, started_at, last_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
          .run(id, userId, child.id, game.id, game.practice ? 1 : 0, JSON.stringify(items), JSON.stringify(items.map(() => null)), now, now);
        return res.json({ roundId: id, gameId: game.id, items: items.map((it) => publicItem(it, null)), minutesLeft: game.practice ? null : Math.max(0, st.minutesLimit - st.minutesUsed) });
      }

      // ------------------------------------------------ partida en curso
      const loadRound = async () => {
        const r = await db.prepare('SELECT * FROM game_rounds WHERE id = ? AND child_id = ?').get(String(b.roundId || ''), child.id);
        if (!r) return { error: 'Partida no encontrada', status: 404 } as const;
        if (r.finished_at) return { error: 'Esta partida ya ha terminado.', status: 409 } as const;
        if (Date.now() - Number(r.started_at) > ROUND_TTL_MS) return { error: 'La partida ha caducado. Empieza otra.', status: 410 } as const;
        return { r, items: parse(r.items_json, []) as GameItem[], results: parse(r.results_json, []) as any[] };
      };
      const save = (id: string, results: any[]) => db.prepare('UPDATE game_rounds SET results_json = ?, last_at = ? WHERE id = ?').run(JSON.stringify(results), Date.now(), id);

      if (action === 'answer') {
        const L = await loadRound();
        if ('error' in L) return res.status(L.status).json({ error: L.error });
        const i = Number(b.index);
        const it = L.items[i];
        if (!it || it.pub.type === 'hangman') return res.status(400).json({ error: 'Ejercicio no válido' });
        if (L.results[i]) return res.status(409).json({ error: 'Ya has respondido a este ejercicio.', ...L.results[i] });
        const raw = b.answer;
        const answer = typeof raw === 'string' ? raw.slice(0, 300) : Array.isArray(raw) ? raw.slice(0, 60).map((x: any) => (typeof x === 'string' ? x.slice(0, 60) : Number(x))) : Number(raw);
        const g = gradeItem(it, answer);
        L.results[i] = { correct: g.correct, show: it.show, explain: it.explain || '', note: g.note || '' };
        await save(L.r.id, L.results);
        return res.json(L.results[i]);
      }

      if (action === 'guess') {
        const L = await loadRound();
        if ('error' in L) return res.status(L.status).json({ error: L.error });
        const i = Number(b.index);
        const it = L.items[i];
        if (!it || it.pub.type !== 'hangman') return res.status(400).json({ error: 'Ejercicio no válido' });
        const cur = L.results[i] || { guessed: [], errors: 0, done: false };
        if (cur.done) return res.status(409).json({ error: 'Esta palabra ya ha terminado.' });
        const letter = hangLetter(String(b.letter || '').toUpperCase().slice(0, 1));
        if (!/^[A-ZÑ]$/.test(letter)) return res.status(400).json({ error: 'Letra no válida' });
        const word: string = it.key;
        if (!cur.guessed.includes(letter)) {
          cur.guessed.push(letter);
          if (!word.split('').some((c) => hangLetter(c) === letter)) cur.errors++;
        }
        const won = word.split('').every((c) => cur.guessed.includes(hangLetter(c)));
        const lost = cur.errors >= it.pub.maxErrors;
        if (won || lost) Object.assign(cur, { done: true, correct: won, show: word, explain: '' });
        L.results[i] = cur;
        await save(L.r.id, L.results);
        return res.json({ item: publicItem(it, cur), done: !!cur.done, correct: !!cur.correct, show: cur.done ? word : undefined });
      }

      if (action === 'finish') {
        const L = await loadRound();
        if ('error' in L) return res.status(L.status).json({ error: L.error });
        const total = L.items.length;
        const correct = L.results.filter((r) => r?.correct).length;
        const game = GAME_BY_ID[L.r.game_id];
        const wanted = Math.round((ROUND_MAX_POINTS * correct) / Math.max(1, total));
        let award = { awarded: 0, newPoints: 0 };
        if (game.practice) {
          const left = Math.max(0, PRACTICE_DAILY_POINTS - (await earnedToday(db, child.id, 'practice')));
          // Cuenta como estudio aunque no dé puntos (racha y desbloqueo de juegos), si ha respondido algo
          if (L.results.some(Boolean)) award = await awardActivity(db, { userId, childId: child.id, points: Math.min(wanted, left), source: 'practice', label: `Práctica: ${game.title} (${correct}/${total})`, refId: L.r.id });
        } else {
          const left = Math.max(0, GAMES_DAILY_POINTS - (await earnedToday(db, child.id, 'games')));
          award = await awardGamePoints(db, { userId, childId: child.id, points: Math.min(wanted, left), label: `Juego: ${game.title} (${correct}/${total})`, refId: L.r.id });
        }
        await db.prepare('UPDATE game_rounds SET finished_at = ?, correct = ?, total = ?, points = ? WHERE id = ?').run(Date.now(), correct, total, award.awarded, L.r.id);
        const st = await stateFor(child);
        return res.json({ correct, total, points: award.awarded, newPoints: award.newPoints, capReached: wanted > award.awarded, state: st });
      }

      // ------------------------------------------------ padres
      if (action === 'parent_get') {
        const settings = await settingsOf(db, child.id);
        const since = Date.now() - 30 * 86400000;
        const rows = await db.prepare('SELECT game_id, practice, correct, total, started_at, last_at, finished_at, points FROM game_rounds WHERE child_id = ? AND started_at >= ? ORDER BY started_at DESC').all(child.id, since);
        const byGame = new Map<string, { rounds: number; correct: number; total: number; last: number }>();
        let week = 0;
        const weekAgo = Date.now() - 7 * 86400000;
        for (const r of rows) {
          if (r.finished_at) {
            const g = byGame.get(r.game_id) || { rounds: 0, correct: 0, total: 0, last: 0 };
            g.rounds++; g.correct += Number(r.correct || 0); g.total += Number(r.total || 0); g.last = Math.max(g.last, Number(r.started_at));
            byGame.set(r.game_id, g);
          }
          if (!Number(r.practice) && Number(r.started_at) >= weekAgo) week += Math.min(ROUND_TIME_CAP_MS, Math.max(0, Number(r.last_at) - Number(r.started_at)));
        }
        return res.json({
          settings, games: gamesFor(child.grade).filter((g) => !g.practice).map((g) => ({ id: g.id, title: g.title, emoji: g.emoji, area: g.area })),
          stats: [...byGame.entries()].map(([id, g]) => ({ id, title: GAME_BY_ID[id]?.title || id, emoji: GAME_BY_ID[id]?.emoji || '🎮', practice: !!GAME_BY_ID[id]?.practice, rounds: g.rounds, percent: g.total ? Math.round((100 * g.correct) / g.total) : 0, last: g.last }))
            .sort((a, b) => b.last - a.last),
          minutesToday: await minutesUsedToday(db, child.id), minutesWeek: Math.round(week / 60000),
          pointsToday: await earnedToday(db, child.id, 'games'), pointsCap: GAMES_DAILY_POINTS,
        });
      }

      if (action === 'parent_set') {
        const minutes = Math.round(Number(b.minutes));
        if (!Number.isFinite(minutes) || minutes < 0 || minutes > MAX_MINUTES) return res.status(400).json({ error: `Los minutos van de 0 a ${MAX_MINUTES}.` });
        const valid = new Set(GAMES.filter((g) => !g.practice).map((g) => g.id));
        const disabled = (Array.isArray(b.disabled) ? b.disabled : []).map(String).filter((x: string) => valid.has(x));
        await db.prepare(`INSERT INTO game_settings (child_id, enabled, minutes, require_study, disabled_json, updated_at) VALUES (?, ?, ?, ?, ?, ?)
          ON CONFLICT(child_id) DO UPDATE SET enabled = excluded.enabled, minutes = excluded.minutes, require_study = excluded.require_study, disabled_json = excluded.disabled_json, updated_at = excluded.updated_at`)
          .run(child.id, b.enabled === false ? 0 : 1, minutes, b.requireStudy === false ? 0 : 1, JSON.stringify([...new Set(disabled)]), Date.now());
        return res.json({ settings: await settingsOf(db, child.id) });
      }

      return res.status(400).json({ error: 'Acción no válida' });
    } catch (e: any) {
      console.error('[JUEGOS]', e?.message);
      return res.status(500).json({ error: 'Error en los juegos' });
    }
  });
}
