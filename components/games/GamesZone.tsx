import React, { useEffect, useState } from 'react';
import { AREA_LABEL, GameArea, GAMES, GAMES_DAILY_POINTS, GAMES_DEFAULT_MINUTES } from '../../shared/gamesCatalog';
import { gamesService, GamesState, RoundView, AnswerResult, FinishResult } from '../../services/gamesService';
import { gradeIndex } from '../../shared/grades';
import GameItemView from './GameItemView';

interface Props {
  child: { id: string; name: string; grade: string };
  isDemo?: boolean;
  onPoints: (newPoints: number, earned: number) => void;
  onGoStudy: () => void;
}

// Demo sin cuenta: tres preguntas de «¿Seguro o trampa?» corregidas aquí mismo
const DEMO_ITEMS = [
  { pub: { type: 'choice', prompt: 'Tu contraseña es 123456.', options: ['✅ Seguro', '⚠️ Trampa'] }, key: 1, why: 'Es de las primeras que prueban los atacantes.' },
  { pub: { type: 'choice', prompt: 'Activas la verificación en dos pasos en tu cuenta.', options: ['✅ Seguro', '⚠️ Trampa'] }, key: 0, why: 'Aunque sepan tu contraseña, necesitarán el código.' },
  { pub: { type: 'choice', prompt: 'Alguien de un juego online te pide una foto y que no se lo digas a tus padres.', options: ['✅ Seguro', '⚠️ Trampa'] }, key: 1, why: 'Pedir secretos es señal de peligro: cuéntaselo a un adulto.' },
];

const AREAS: GameArea[] = ['practica', 'mates', 'lengua', 'ingles', 'informatica', 'ciencias'];

const GamesZone: React.FC<Props> = ({ child, isDemo, onPoints, onGoStudy }) => {
  const [state, setState] = useState<GamesState | null>(null);
  const [round, setRound] = useState<RoundView | null>(null);
  const [idx, setIdx] = useState(0);
  const [results, setResults] = useState<(AnswerResult | null)[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [final, setFinal] = useState<FinishResult | null>(null);
  const [demoNote, setDemoNote] = useState<string | null>(null);

  const load = async () => {
    setError(null);
    if (isDemo) {
      const L = gradeIndex(child.grade);
      setState({ games: GAMES.filter((g) => !g.practice && L >= g.min && L <= g.max).map((g) => ({ ...g, off: false })), lock: null, studied: true, minutesLimit: GAMES_DEFAULT_MINUTES, minutesUsed: 0, pointsToday: 0, pointsCap: GAMES_DAILY_POINTS, practicePointsToday: 0, practiceCap: 40, requireStudy: true, enabled: true, fpIt: false });
      return;
    }
    try { setState(await gamesService.state(child.id)); } catch (e: any) { setError(e.message); }
  };
  useEffect(() => { setRound(null); setFinal(null); load(); }, [child.id, isDemo]); // eslint-disable-line react-hooks/exhaustive-deps

  const start = async (gameId: string) => {
    setError(null); setFinal(null); setDemoNote(null);
    if (isDemo) {
      if (gameId !== 'seguro') setDemoNote('En la demo puedes probar «¿Seguro o trampa?». Con una cuenta tienes todos los juegos.');
      setRound({ roundId: 'demo', gameId: 'seguro', items: DEMO_ITEMS.map((d) => d.pub), minutesLeft: null });
      setIdx(0); setResults(DEMO_ITEMS.map(() => null));
      return;
    }
    setBusy(true);
    try {
      const r = await gamesService.start(child.id, gameId);
      setRound(r); setIdx(0); setResults(r.items.map(() => null));
    } catch (e: any) { setError(e.message); load(); } finally { setBusy(false); }
  };

  const answer = async (a: any) => {
    if (!round) return;
    if (isDemo) {
      const d = DEMO_ITEMS[idx];
      const r = { correct: a === d.key, show: d.pub.options[d.key], explain: d.why, note: '' };
      setResults(results.map((x, i) => (i === idx ? r : x)));
      return;
    }
    setBusy(true);
    try {
      const r = await gamesService.answer(child.id, round.roundId, idx, a);
      setResults(results.map((x, i) => (i === idx ? r : x)));
    } catch (e: any) { setError(e.message); } finally { setBusy(false); }
  };

  const guess = async (letter: string) => {
    if (!round) return;
    setBusy(true);
    try {
      const r = await gamesService.guess(child.id, round.roundId, idx, letter);
      setRound({ ...round, items: round.items.map((it, i) => (i === idx ? r.item : it)) });
      if (r.done) setResults(results.map((x, i) => (i === idx ? { correct: r.correct, show: r.show || '', explain: r.correct ? '¡Adivinada!' : 'Se acabaron los intentos.', note: '' } : x)));
    } catch (e: any) { setError(e.message); } finally { setBusy(false); }
  };

  const finish = async () => {
    if (!round) return;
    if (isDemo) {
      const correct = results.filter((r) => r?.correct).length;
      setFinal({ correct, total: results.length, points: 0, newPoints: 0, capReached: false, state: state! });
      setRound(null); return;
    }
    setBusy(true);
    try {
      const f = await gamesService.finish(child.id, round.roundId);
      setFinal(f); setState(f.state); setRound(null);
      if (f.points > 0) onPoints(f.newPoints, f.points);
    } catch (e: any) { setError(e.message); setRound(null); load(); } finally { setBusy(false); }
  };

  const info = round ? GAMES.find((g) => g.id === round.gameId) : null;

  // ------------------------------------------------------------------ partida
  if (round && info) {
    const item = round.items[idx];
    const res = results[idx];
    const last = idx === round.items.length - 1;
    return (
      <div className="max-w-2xl mx-auto space-y-4 animate-in fade-in" data-testid="game-round">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-black text-indigo-900">{info.emoji} {info.title}</h2>
          <span className="text-sm font-black text-slate-500" data-testid="round-progress">{idx + 1} / {round.items.length}</span>
        </div>
        {demoNote && <p className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-2 text-sm font-bold text-amber-800">{demoNote}</p>}
        <div className="bg-indigo-50/60 rounded-[2rem] p-5 border border-indigo-100">
          <GameItemView key={`${round.roundId}-${idx}`} item={item} result={res} busy={busy} onAnswer={answer} onGuess={guess} />
        </div>
        {res && (
          <div className={`rounded-2xl p-4 border-2 ${res.correct ? 'bg-emerald-50 border-emerald-300' : 'bg-rose-50 border-rose-300'}`} data-testid="item-feedback">
            <p className="font-black text-lg">{res.correct ? '✅ ¡Bien!' : '❌ No es correcto'}</p>
            {!res.correct && res.show && <p className="text-sm font-bold text-slate-700">Solución: {res.show}</p>}
            {res.explain && <p className="text-sm text-slate-700">{res.explain}</p>}
            {res.note && <p className="text-xs text-slate-500">{res.note}</p>}
          </div>
        )}
        {error && <p className="bg-rose-50 border border-rose-200 rounded-2xl px-4 py-2 text-sm font-bold text-rose-700">{error}</p>}
        <div className="flex gap-2">
          <button onClick={() => { setRound(null); load(); }} className="rounded-2xl px-4 py-3 font-black text-sm bg-slate-100 text-slate-600">Salir</button>
          {res && !last && <button data-testid="next-item" onClick={() => setIdx(idx + 1)} className="flex-1 rounded-2xl px-4 py-3 font-black bg-indigo-600 text-white">Siguiente ➜</button>}
          {res && last && <button data-testid="finish-round" disabled={busy} onClick={finish} className="flex-1 rounded-2xl px-4 py-3 font-black bg-emerald-600 text-white">Terminar 🏁</button>}
        </div>
      </div>
    );
  }

  // ------------------------------------------------------------------ portada
  const st = state;
  const pct = st ? Math.min(100, Math.round((100 * st.minutesUsed) / Math.max(1, st.minutesLimit))) : 0;
  const lockMsg = st?.lock === 'study' ? 'Los juegos se abren cuando hayas estudiado algo hoy: un repaso, una lectura, un reto de mates…'
    : st?.lock === 'time' ? 'Se ha acabado el tiempo de juego de hoy. ¡Mañana más!'
    : st?.lock === 'disabled' ? 'Tus padres han desactivado los juegos.' : null;
  return (
    <div className="space-y-6 animate-in fade-in" data-testid="games-zone">
      <div className="bg-gradient-to-br from-violet-600 to-fuchsia-600 rounded-[2rem] p-6 text-white shadow-xl">
        <h2 className="text-2xl font-black">🎮 Zona de juegos{st?.fpIt ? ' y prácticas' : ''}</h2>
        <p className="text-sm text-violet-100">Para jugar después de estudiar. Cada partida da hasta 10 puntos según tus aciertos.</p>
        {st && (
          <div className="grid sm:grid-cols-2 gap-3 mt-4">
            <div className="bg-white/15 rounded-2xl p-3" data-testid="games-time">
              <p className="text-xs font-black uppercase">Tiempo de juego hoy</p>
              <p className="font-black">{Math.floor(st.minutesUsed)} de {st.minutesLimit} min</p>
              <div className="h-2 bg-white/30 rounded-full mt-1"><div className="h-2 bg-white rounded-full" style={{ width: `${pct}%` }} /></div>
            </div>
            <div className="bg-white/15 rounded-2xl p-3" data-testid="games-points">
              <p className="text-xs font-black uppercase">Puntos de juegos hoy</p>
              <p className="font-black">{st.pointsToday} de {st.pointsCap}</p>
            </div>
          </div>
        )}
      </div>
      {final && (
        <div className="bg-white rounded-[2rem] p-5 border-2 border-emerald-200 text-center" data-testid="round-result">
          <p className="text-2xl font-black text-emerald-700">{final.correct} de {final.total} aciertos</p>
          <p className="font-bold text-slate-600">{isDemo ? 'En la demo no se ganan puntos.' : final.points ? `+${final.points} puntos` : final.capReached ? 'Hoy ya has llegado al máximo de puntos, pero puedes seguir practicando.' : 'Esta vez sin puntos. ¡Prueba otra vez!'}</p>
        </div>
      )}
      {error && <p className="bg-rose-50 border border-rose-200 rounded-2xl px-4 py-2 text-sm font-bold text-rose-700">{error}</p>}
      {lockMsg && (
        <div className="bg-amber-50 border-2 border-amber-200 rounded-[2rem] p-5 flex flex-col sm:flex-row gap-3 items-center justify-between" data-testid="games-lock">
          <p className="font-black text-amber-900">🔒 {lockMsg}</p>
          {st?.lock === 'study' && <button onClick={onGoStudy} className="rounded-2xl px-4 py-2 font-black bg-amber-500 text-white">Ir a estudiar</button>}
        </div>
      )}
      {!st && !error && <div className="h-40 bg-violet-50 rounded-[2rem] animate-pulse" />}
      {st && AREAS.map((area) => {
        const list = st.games.filter((g) => g.area === area);
        if (!list.length) return null;
        const practice = area === 'practica';
        return (
          <section key={area} className="space-y-2">
            <h3 className="font-black text-slate-700">{AREA_LABEL[area]}{practice && <span className="ml-2 text-xs font-bold text-emerald-700">Cuentan como estudio · {st.practicePointsToday} de {st.practiceCap} puntos hoy</span>}</h3>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {list.map((g) => {
                const locked = !practice && (!!st.lock || g.off);
                return (
                  <button key={g.id} data-testid={`game-${g.id}`} disabled={busy || locked} onClick={() => start(g.id)}
                    className={`text-left rounded-2xl p-4 border-2 transition-all ${locked ? 'bg-slate-50 border-slate-100 opacity-60' : 'bg-white border-violet-100 hover:border-violet-400'}`}>
                    <p className="font-black text-slate-800">{g.emoji} {g.title}</p>
                    <p className="text-xs text-slate-500 mt-1">{g.off ? 'Desactivado por tus padres' : g.description}</p>
                  </button>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
};

export default GamesZone;
