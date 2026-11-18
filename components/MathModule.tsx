import React, { useEffect, useRef, useState } from 'react';
import { Subject } from '../types';
import { mathService, MathConfig, ChallengeResult } from '../services/mathService';
import { ChallengeMode, AnswerStyle, gradeLevel, defaultAnswerStyle, generateProblem, makeOptions } from '../services/mathChallenge';
import { MathProblem, problemText, evaluate, parseAnswer, isCorrect } from '../shared/mathOps';

export interface WorksheetIntent { openPhoto?: boolean; homeworkImage?: string; subject?: string }

interface MathModuleProps {
  childId: string;
  childName: string;
  grade: string;
  isDemo: boolean;
  /** El servidor ya ha sumado los puntos del reto: aquí solo se actualiza la pantalla */
  onPoints: (newPoints: number, earned: number) => void;
  /** Modo demostración: puntos solo en pantalla */
  onDemoPoints?: (points: number) => void;
  /** Ir a "Deberes & Fichas" (hacer una foto, corregir la pizarra o ver las fichas de mates) */
  onOpenWorksheets: (intent: WorksheetIntent) => void;
  onActivityLog?: (question: string, subject: Subject, answer: any) => void;
}

const DURATION = 45;
const MODES: { id: ChallengeMode; label: string }[] = [
  { id: 'mixed', label: '🎲 Todo mezclado' },
  { id: 'add_sub', label: '➕ Sumas y restas' },
  { id: 'multi', label: '✖️ Multiplicar' },
  { id: 'div', label: '➗ Dividir' },
  { id: 'tables', label: '🔢 Tablas' },
  { id: 'mistakes', label: '🎯 Mis fallos' },
];

const fmtNum = (n: number) => String(n).replace('.', ',');

export const MathModule: React.FC<MathModuleProps> = ({ childId, childName, grade, isDemo, onPoints, onDemoPoints, onOpenWorksheets, onActivityLog }) => {
  const level = gradeLevel(grade);
  const [tab, setTab] = useState<'challenge' | 'board'>('challenge');

  // ------------------------------------------------------------------ reto: ajustes
  const [mode, setMode] = useState<ChallengeMode>('mixed');
  const [table, setTable] = useState(7);
  const [config, setConfig] = useState<MathConfig | null>(null);
  const [answerStyle, setAnswerStyle] = useState<AnswerStyle>(defaultAnswerStyle(level));
  const [styleTouched, setStyleTouched] = useState(false);

  useEffect(() => {
    if (isDemo) return;
    mathService.config(childId, mode, mode === 'tables' ? table : undefined)
      .then((c) => {
        setConfig(c);
        if (!styleTouched) setAnswerStyle(c.answerStyle || defaultAnswerStyle(level));
      })
      .catch(() => setConfig(null));
  }, [childId, mode, table, isDemo]);

  // ------------------------------------------------------------------ reto: partida
  const [phase, setPhase] = useState<'setup' | 'playing' | 'saving' | 'done'>('setup');
  const [problem, setProblem] = useState<MathProblem | null>(null);
  const [options, setOptions] = useState<number[]>([]);
  const [typed, setTyped] = useState('');
  const [timeLeft, setTimeLeft] = useState(DURATION);
  const [streak, setStreak] = useState(0);
  const [stats, setStats] = useState({ correct: 0, wrong: 0, best: 0 });
  const [flash, setFlash] = useState<null | { ok: boolean; answer: number }>(null);
  const [result, setResult] = useState<ChallengeResult | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const answersRef = useRef<{ problem: MathProblem; given: number | null }[]>([]);
  const difficultyRef = useRef(level);
  const runRef = useRef({ okRow: 0, koRow: 0, levelEnd: level });
  const timerRef = useRef<any>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const nextProblem = () => {
    const p = generateProblem(mode, difficultyRef.current, { table, mistakes: config?.mistakes });
    setProblem(p);
    setOptions(makeOptions(p));
    setTyped('');
    setTimeout(() => inputRef.current?.focus(), 30);
  };

  const start = () => {
    answersRef.current = [];
    difficultyRef.current = level;
    runRef.current = { okRow: 0, koRow: 0, levelEnd: level };
    setStats({ correct: 0, wrong: 0, best: 0 });
    setStreak(0);
    setResult(null);
    setSaveError(null);
    setTimeLeft(DURATION);
    setPhase('playing');
    nextProblem();
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) { clearInterval(timerRef.current); finish(); return 0; }
        return t - 1;
      });
    }, 1000);
  };

  useEffect(() => () => clearInterval(timerRef.current), []);

  const answer = (given: number | null) => {
    if (!problem || phase !== 'playing' || flash) return;
    const ok = isCorrect(problem, given);
    answersRef.current.push({ problem, given });
    // Dificultad adaptativa: 4 seguidas bien → sube; 2 seguidas mal → baja (sin pasar ±2 del curso)
    const r = runRef.current;
    if (ok) { r.okRow++; r.koRow = 0; } else { r.koRow++; r.okRow = 0; }
    if (r.okRow >= 4) { difficultyRef.current = Math.min(10, level + 2, difficultyRef.current + 1); r.okRow = 0; }
    if (r.koRow >= 2) { difficultyRef.current = Math.max(1, level - 2, difficultyRef.current - 1); r.koRow = 0; }
    r.levelEnd = difficultyRef.current;
    const newStreak = ok ? streak + 1 : 0;
    setStreak(newStreak);
    setStats((s) => ({ correct: s.correct + (ok ? 1 : 0), wrong: s.wrong + (ok ? 0 : 1), best: Math.max(s.best, newStreak) }));
    setFlash({ ok, answer: evaluate(problem) as number });
    setTimeout(() => { setFlash(null); nextProblem(); }, ok ? 300 : 1100);
  };

  const finish = async () => {
    setPhase('saving');
    const answers = answersRef.current;
    const correct = answers.filter((a) => isCorrect(a.problem, a.given)).length;
    onActivityLog?.('Reto de cálculo', 'Matemáticas', { type: 'math_speed_challenge', score: correct, total: answers.length });
    if (isDemo) {
      const pts = correct > 0 ? Math.max(5, correct * 3) : 0;
      onDemoPoints?.(pts);
      setResult({ correct, wrong: answers.length - correct, bestStreak: 0, points: pts, pointsCapReached: false, pointsLeft: 0, newPoints: 0, record: correct, newRecord: false, previousRecord: 0, weak: [] });
      setPhase('done');
      return;
    }
    if (!answers.length) { setPhase('done'); setResult(null); return; }
    try {
      const r = await mathService.saveChallenge({ childId, mode, table: mode === 'tables' ? table : undefined, answerStyle, levelStart: level, levelEnd: runRef.current.levelEnd, duration: DURATION, answers });
      setResult(r);
      onPoints(r.newPoints, r.points);
      mathService.config(childId, mode, mode === 'tables' ? table : undefined).then(setConfig).catch(() => {});
    } catch (e: any) {
      setSaveError(e.message);
    }
    setPhase('done');
  };

  // ------------------------------------------------------------------ pizarra
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawing = useRef(false);
  const [isEraser, setIsEraser] = useState(false);
  const [boardUsed, setBoardUsed] = useState(false);

  useEffect(() => {
    if (tab !== 'board' || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * 2;
    canvas.height = rect.height * 2;
    ctx.scale(2, 2);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, rect.width, rect.height);
    setBoardUsed(false);
  }, [tab]);

  const coords = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    if ('touches' in e && e.touches.length) return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
    const m = e as React.MouseEvent;
    return { x: m.clientX - rect.left, y: m.clientY - rect.top };
  };
  const startDraw = (e: any) => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    drawing.current = true;
    const { x, y } = coords(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };
  const draw = (e: any) => {
    if (!drawing.current) return;
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const { x, y } = coords(e);
    ctx.strokeStyle = isEraser ? '#ffffff' : '#1e293b';
    ctx.lineWidth = isEraser ? 18 : 4;
    ctx.lineTo(x, y);
    ctx.stroke();
    setBoardUsed(true);
  };
  const clearBoard = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, rect.width, rect.height);
    setBoardUsed(false);
  };
  const correctBoard = () => {
    if (!canvasRef.current) return;
    onOpenWorksheets({ homeworkImage: canvasRef.current.toDataURL('image/jpeg', 0.85) });
  };

  // ------------------------------------------------------------------ pantalla
  const tabBtn = (id: 'challenge' | 'board', label: string) => (
    <button onClick={() => setTab(id)} role="tab" aria-selected={tab === id}
      className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${tab === id ? 'bg-white text-orange-600 shadow-md' : 'text-white/80 hover:bg-white/10'}`}>
      {label}
    </button>
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20 max-w-5xl mx-auto">
      <div className="bg-gradient-to-r from-amber-500 via-orange-600 to-red-500 rounded-[2.5rem] p-6 sm:p-8 text-white shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl sm:text-3xl font-black">🔢 ¡Hola {childName}!</h2>
            <p className="opacity-90 text-sm font-medium mt-1">Cálculo mental contra reloj a tu nivel, y una pizarra para hacer cuentas.</p>
          </div>
          <div className="bg-black/20 p-1.5 rounded-2xl flex gap-1 self-start sm:self-center border border-white/10" role="tablist">
            {tabBtn('challenge', '⚡ Reto de cálculo')}
            {tabBtn('board', '✏️ Pizarra')}
          </div>
        </div>
        <div className="flex flex-wrap gap-2 mt-4">
          <button onClick={() => onOpenWorksheets({ openPhoto: true })} className="bg-white/15 hover:bg-white/25 border border-white/20 text-white text-xs font-black px-4 py-2 rounded-xl">📸 Hago una foto de mis cuentas</button>
          <button onClick={() => onOpenWorksheets({ subject: 'Matemáticas' })} className="bg-white/15 hover:bg-white/25 border border-white/20 text-white text-xs font-black px-4 py-2 rounded-xl">📄 Mis fichas de mates</button>
        </div>
      </div>

      {tab === 'challenge' && phase === 'setup' && (
        <div className="bg-white rounded-[2.5rem] p-6 sm:p-8 border border-orange-100 shadow-sm space-y-6">
          <div>
            <h3 className="text-sm font-black text-orange-900 uppercase tracking-wider mb-3">¿Qué practicamos?</h3>
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Modo">
              {MODES.map((m) => {
                const disabled = m.id === 'mistakes' && !isDemo && !(config?.mistakes?.length);
                return (
                  <button key={m.id} role="radio" aria-checked={mode === m.id} disabled={disabled || (isDemo && m.id === 'mistakes')} onClick={() => setMode(m.id)}
                    title={disabled ? 'Aún no hay operaciones que se te resistan' : undefined}
                    className={`px-4 py-2 rounded-xl text-sm font-black border-2 transition-all disabled:opacity-40 ${mode === m.id ? 'bg-orange-600 text-white border-orange-600' : 'bg-white text-orange-700 border-orange-100 hover:border-orange-300'}`}>
                    {m.label}
                  </button>
                );
              })}
            </div>
          </div>
          {mode === 'tables' && (
            <div>
              <h3 className="text-sm font-black text-orange-900 uppercase tracking-wider mb-3">¿Qué tabla?</h3>
              <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Tabla">
                {[2, 3, 4, 5, 6, 7, 8, 9, 10].map((t) => (
                  <button key={t} role="radio" aria-checked={table === t} onClick={() => setTable(t)}
                    className={`w-12 h-12 rounded-xl text-lg font-black border-2 ${table === t ? 'bg-orange-600 text-white border-orange-600' : 'bg-white text-orange-700 border-orange-100'}`}>
                    {t}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm font-black text-orange-900">Responder:</span>
            {(['typed', 'choice'] as AnswerStyle[]).map((s) => (
              <button key={s} onClick={() => { setAnswerStyle(s); setStyleTouched(true); }} aria-pressed={answerStyle === s}
                className={`px-4 py-2 rounded-xl text-sm font-black border-2 ${answerStyle === s ? 'bg-orange-100 text-orange-800 border-orange-300' : 'bg-white text-orange-500 border-orange-100'}`}>
                {s === 'typed' ? '⌨️ Escribiendo' : '👆 Eligiendo entre 4'}
              </button>
            ))}
          </div>
          {config && config.weak.length > 0 && (
            <div className="bg-rose-50 border border-rose-100 rounded-2xl p-4" data-testid="weak-facts">
              <p className="text-sm font-black text-rose-900 mb-1">🎯 Se te resisten</p>
              <p className="text-sm text-rose-700">{config.weak.slice(0, 5).map((w) => w.label).join(' · ')}</p>
              <p className="text-xs text-rose-500 mt-1">Prueba el modo «Mis fallos» para dominarlas.</p>
            </div>
          )}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="text-sm font-bold text-orange-700 space-y-0.5">
              {config && <p>🏆 Tu récord aquí: <strong>{config.record}</strong> aciertos</p>}
              {config && <p>⭐ Puntos por retos hoy: {config.pointsToday} de {config.pointsCap}{config.pointsLeft === 0 ? ' (hoy ya no suman, ¡pero sigue practicando!)' : ''}</p>}
            </div>
            <button onClick={start} className="bg-orange-600 hover:bg-orange-700 text-white px-10 py-4 rounded-2xl font-black text-lg shadow-lg">¡Empezar! ({DURATION} s)</button>
          </div>
        </div>
      )}

      {tab === 'challenge' && phase === 'playing' && problem && (
        <div className={`bg-white rounded-[2.5rem] p-6 sm:p-10 shadow-xl border-4 transition-colors ${flash ? (flash.ok ? 'border-green-400' : 'border-rose-400') : 'border-orange-100'}`}>
          <div className="flex justify-between items-center mb-8 text-sm font-black">
            <span className={`px-4 py-2 rounded-full ${timeLeft <= 10 ? 'bg-rose-100 text-rose-600' : 'bg-orange-100 text-orange-700'}`} aria-live="off">⏱️ {timeLeft} s</span>
            <span className="text-green-600">✅ {stats.correct}</span>
            <span className="text-orange-600">🔥 {streak}</span>
          </div>
          <p className="text-center text-5xl sm:text-6xl font-black text-slate-800 mb-8 tracking-wide" data-testid="math-problem" data-op={JSON.stringify(problem)}>
            {problemText(problem)} = ?
          </p>
          {flash && !flash.ok && <p className="text-center text-lg font-black text-rose-600 mb-4" role="status">Era {fmtNum(flash.answer)}</p>}
          {answerStyle === 'typed' ? (
            <form onSubmit={(e) => { e.preventDefault(); const v = parseAnswer(typed); if (v !== null) answer(v); }} className="flex justify-center gap-3">
              <label htmlFor="math-answer" className="sr-only">Tu respuesta</label>
              <input id="math-answer" ref={inputRef} value={typed} onChange={(e) => setTyped(e.target.value)} inputMode="decimal" autoComplete="off" disabled={!!flash}
                className="w-48 text-center text-4xl font-black border-4 border-orange-200 rounded-2xl py-3 outline-none focus:border-orange-500" />
              <button type="submit" disabled={parseAnswer(typed) === null || !!flash} className="bg-orange-600 text-white px-6 rounded-2xl font-black text-lg disabled:opacity-40">OK</button>
            </form>
          ) : (
            <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
              {options.map((o, i) => (
                <button key={i} onClick={() => answer(o)} disabled={!!flash} className="bg-orange-50 hover:bg-orange-100 border-2 border-orange-200 rounded-2xl py-5 text-3xl font-black text-orange-900">
                  {fmtNum(o)}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'challenge' && phase === 'saving' && <p className="text-center text-orange-600 font-black animate-pulse py-16" role="status">Guardando tu reto…</p>}

      {tab === 'challenge' && phase === 'done' && (
        <div className="bg-white rounded-[2.5rem] p-8 shadow-xl border border-orange-100 text-center space-y-5" data-testid="challenge-result">
          <div className="text-6xl" aria-hidden="true">{result?.newRecord ? '🏆' : '⚡'}</div>
          <h3 className="text-3xl font-black text-orange-900">{result?.newRecord ? '¡Nuevo récord!' : '¡Reto terminado!'}</h3>
          {result && (
            <>
              <div className="flex flex-wrap justify-center gap-4">
                <div className="bg-green-50 px-6 py-4 rounded-3xl"><p className="text-xs font-black text-green-600 uppercase">Aciertos</p><p className="text-4xl font-black text-green-700" data-testid="challenge-correct">{result.correct}</p></div>
                <div className="bg-rose-50 px-6 py-4 rounded-3xl"><p className="text-xs font-black text-rose-500 uppercase">Fallos</p><p className="text-4xl font-black text-rose-600">{result.wrong}</p></div>
                {!isDemo && <div className="bg-orange-50 px-6 py-4 rounded-3xl"><p className="text-xs font-black text-orange-500 uppercase">Mejor racha</p><p className="text-4xl font-black text-orange-600">{result.bestStreak}</p></div>}
                <div className="bg-amber-50 px-6 py-4 rounded-3xl"><p className="text-xs font-black text-amber-500 uppercase">Puntos</p><p className="text-4xl font-black text-amber-600">+{result.points}</p></div>
              </div>
              {!isDemo && <p className="text-sm font-bold text-orange-700">{result.newRecord ? `Tu récord anterior era ${result.previousRecord}.` : `Tu récord: ${result.record} aciertos.`}</p>}
              {result.pointsCapReached && <p className="text-sm font-bold text-amber-700 bg-amber-50 rounded-2xl px-4 py-2 inline-block">Hoy ya has llegado al máximo de puntos por retos. ¡Mañana más! Practicar sigue contando para tu récord.</p>}
              {result.weak.length > 0 && <p className="text-sm text-rose-700">🎯 Para practicar: {result.weak.slice(0, 3).map((w) => w.label).join(' · ')}</p>}
            </>
          )}
          {saveError && <p role="alert" className="text-sm font-bold text-rose-600">{saveError}</p>}
          <div className="flex flex-wrap justify-center gap-3">
            <button onClick={start} className="bg-orange-600 text-white px-8 py-4 rounded-2xl font-black shadow-lg">Otra vez</button>
            <button onClick={() => setPhase('setup')} className="bg-orange-50 text-orange-700 px-8 py-4 rounded-2xl font-black">Cambiar de modo</button>
          </div>
        </div>
      )}

      {tab === 'board' && (
        <div className="bg-white rounded-[2.5rem] p-6 border border-orange-100 shadow-sm space-y-4">
          <p className="text-sm text-orange-800 font-medium">Haz aquí tus cuentas con el dedo o el ratón. Cuando termines, pulsa «Corrígeme» y te digo en qué te has equivocado (sin darte la solución).</p>
          <canvas ref={canvasRef} className="w-full h-[420px] border-2 border-orange-100 rounded-2xl touch-none bg-white cursor-crosshair" aria-label="Pizarra para hacer cuentas"
            onMouseDown={startDraw} onMouseMove={draw} onMouseUp={() => (drawing.current = false)} onMouseLeave={() => (drawing.current = false)}
            onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={() => (drawing.current = false)} />
          <div className="flex flex-wrap gap-3">
            <button onClick={() => setIsEraser(false)} aria-pressed={!isEraser} className={`px-4 py-2 rounded-xl text-sm font-black border-2 ${!isEraser ? 'bg-orange-100 border-orange-300 text-orange-800' : 'border-orange-100 text-orange-500'}`}>✏️ Lápiz</button>
            <button onClick={() => setIsEraser(true)} aria-pressed={isEraser} className={`px-4 py-2 rounded-xl text-sm font-black border-2 ${isEraser ? 'bg-orange-100 border-orange-300 text-orange-800' : 'border-orange-100 text-orange-500'}`}>🧽 Goma</button>
            <button onClick={clearBoard} className="px-4 py-2 rounded-xl text-sm font-black border-2 border-orange-100 text-orange-500">🗑️ Borrar todo</button>
            <button onClick={correctBoard} disabled={!boardUsed || isDemo} className="ml-auto bg-orange-600 text-white px-6 py-2 rounded-xl text-sm font-black disabled:opacity-40">✅ Corrígeme</button>
          </div>
          {isDemo && <p className="text-xs font-bold text-amber-700">En el modo demostración la pizarra no se corrige. Crea una cuenta para probarlo.</p>}
        </div>
      )}
    </div>
  );
};
export default MathModule;
