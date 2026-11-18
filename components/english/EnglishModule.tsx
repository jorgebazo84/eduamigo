import React, { useEffect, useState } from 'react';
import { Child } from '../../types';
import { englishService, speakEnglish, EnglishState, EnglishLessonView, LessonResult } from '../../services/englishService';
import { LEVEL_LABEL } from '../../shared/englishBank';

interface Props {
  child: Child;
  isDemo?: boolean;
  /** Con cuenta: el servidor ha dado los puntos */
  onPoints?: (newPoints: number, earned: number) => void;
  /** Demo: puntos simulados */
  onDemoPoints?: (points: number) => void;
}

type Phase = 'home' | 'placement' | 'placement_result' | 'lesson' | 'result';

// Lección de ejemplo para la demo (sin servidor ni IA)
const DEMO_LESSON: EnglishLessonView = {
  attemptId: 'demo', level: 'A1', levelLabel: LEVEL_LABEL.A1, theme: 'animals',
  lesson: {
    title: 'Animals on the farm',
    vocabulary: [
      { en: 'cow', es: 'vaca', example: 'The cow gives us milk.' }, { en: 'horse', es: 'caballo', example: 'The horse is very fast.' },
      { en: 'sheep', es: 'oveja', example: 'Sheep live on farms.' }, { en: 'duck', es: 'pato', example: 'The duck can swim.' },
    ],
    grammar: { title: 'Can / can\'t', explanation: 'Usamos "can" para decir lo que alguien sabe o puede hacer, y "can\'t" para lo que no puede.', examples: ['A duck can swim.', 'A cow can\'t fly.'] },
    phrases: ['The horse can run fast.', 'I like the little duck.'],
    reading: { text: 'Lucy lives on a farm. She has a horse called Star and two ducks. Every morning, Lucy gives the animals food. Star can run very fast, but the ducks can swim in the pond.', questions: [
      { q: 'Where does Lucy live?', options: ['On a farm', 'In a city', 'Near the sea', 'In a flat'] },
      { q: 'What is the horse called?', options: ['Star', 'Lucy', 'Duck', 'Pond'] },
      { q: 'What can the ducks do?', options: ['Swim', 'Fly to school', 'Run fast', 'Talk'] },
    ] },
    listening: { text: 'Hello! My name is Tom. I have got a dog and a cat. My dog is big and brown. My cat is small and white.', questions: [
      { q: 'What colour is the dog?', options: ['Brown', 'White', 'Black', 'Grey'] },
      { q: 'Is the cat big or small?', options: ['Small', 'Big', 'Very big', 'Tall'] },
    ] },
    writing: { prompt: 'Write about your favourite animal. What can it do?', promptEs: 'Escribe sobre tu animal favorito. ¿Qué sabe hacer?', minWords: 15 },
  },
};

const McList: React.FC<{ qs: { q: string; options: string[] }[]; answers: number[]; setAnswers: (a: number[]) => void; result?: boolean[]; keyIdx?: number[]; name: string }> = ({ qs, answers, setAnswers, result, keyIdx, name }) => (
  <div className="space-y-4">
    {qs.map((x, i) => (
      <fieldset key={i} className="space-y-2" data-testid={`${name}-q`}>
        <legend className="font-bold text-slate-800 text-sm">{i + 1}. {x.q}</legend>
        <div className="grid sm:grid-cols-2 gap-2">
          {x.options.map((o, j) => {
            const chosen = answers[i] === j;
            const good = keyIdx && keyIdx[i] === j;
            const cls = result ? (good ? 'bg-emerald-50 border-emerald-400 text-emerald-800' : chosen ? 'bg-red-50 border-red-300 text-red-700' : 'bg-white border-slate-200 text-slate-500')
              : chosen ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-slate-200 text-slate-700 hover:border-blue-300';
            return (
              <label key={j} className={`cursor-pointer rounded-xl border-2 px-3 py-2 text-sm font-semibold transition-all ${cls}`}>
                <input type="radio" name={`${name}-${i}`} className="sr-only" disabled={!!result} checked={chosen} onChange={() => { const a = [...answers]; a[i] = j; setAnswers(a); }} />
                {o}{result && good ? ' ✓' : ''}
              </label>
            );
          })}
        </div>
      </fieldset>
    ))}
  </div>
);

/** Inglés: prueba de nivel, lección del día (vocabulario, gramática, audición, lectura y redacción). */
const EnglishModule: React.FC<Props> = ({ child, isDemo, onPoints, onDemoPoints }) => {
  const [phase, setPhase] = useState<Phase>('home');
  const [state, setState] = useState<EnglishState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [placement, setPlacement] = useState<{ placementId: string; questions: { id: string; question: string; options: string[] }[] } | null>(null);
  const [pAnswers, setPAnswers] = useState<number[]>([]);
  const [pResult, setPResult] = useState<{ levelLabel: string } | null>(null);
  const [lesson, setLesson] = useState<EnglishLessonView | null>(null);
  const [rAns, setRAns] = useState<number[]>([]);
  const [lAns, setLAns] = useState<number[]>([]);
  const [writing, setWriting] = useState('');
  const [result, setResult] = useState<LessonResult | null>(null);

  const loadState = () => {
    if (isDemo) { setState({ level: 'A1', levelLabel: LEVEL_LABEL.A1, placed: true, lessonsAtLevel: 2, promoteAfter: 5, pointsToday: 0, pointsCap: 80, lessonsToday: 0, lessonsPerDay: 4 }); return; }
    englishService.state(child.id).then(setState).catch((e) => setError(e.message));
  };
  useEffect(() => { loadState(); setPhase('home'); }, [child.id, isDemo]); // eslint-disable-line react-hooks/exhaustive-deps

  const startPlacement = async () => {
    if (isDemo) { setError('La prueba de nivel necesita una cuenta.'); return; }
    setBusy(true); setError(null);
    try { const p = await englishService.placementStart(child.id); setPlacement(p); setPAnswers([]); setPhase('placement'); }
    catch (e: any) { setError(e.message); } finally { setBusy(false); }
  };
  const submitPlacement = async () => {
    if (!placement) return;
    setBusy(true);
    try {
      const r = await englishService.placementSubmit(child.id, placement.placementId, placement.questions.map((_, i) => (pAnswers[i] ?? -1)));
      setPResult({ levelLabel: r.levelLabel }); setPhase('placement_result'); loadState();
    } catch (e: any) { setError(e.message); } finally { setBusy(false); }
  };

  const startLesson = async () => {
    setBusy(true); setError(null);
    try {
      const l = isDemo ? DEMO_LESSON : await englishService.lessonStart(child.id);
      setLesson(l); setRAns([]); setLAns([]); setWriting(''); setResult(null); setPhase('lesson');
    } catch (e: any) { setError(e.message); } finally { setBusy(false); }
  };

  const submitLesson = async () => {
    if (!lesson) return;
    if (isDemo) {
      const key = { reading: [0, 0, 0], listening: [0, 0] };
      const reading = lesson.lesson.reading.questions.map((_, i) => rAns[i] === 0);
      const listening = lesson.lesson.listening.questions.map((_, i) => lAns[i] === 0);
      const mcCorrect = [...reading, ...listening].filter(Boolean).length;
      const pts = 10 + 3 * mcCorrect;
      onDemoPoints?.(pts);
      setResult({ mcCorrect, mcTotal: 5, reading, listening, key, writing: writing.trim() ? { error: 'En la demo no se corrige la redacción. Con una cuenta, un profesor de IA te la corrige.' } : null, points: pts, newPoints: 0, promoted: null });
      setPhase('result'); return;
    }
    setBusy(true); setError(null);
    try {
      const r = await englishService.lessonSubmit(child.id, lesson.attemptId, lesson.lesson.reading.questions.map((_, i) => rAns[i] ?? -1), lesson.lesson.listening.questions.map((_, i) => lAns[i] ?? -1), writing);
      setResult(r); setPhase('result');
      onPoints?.(r.newPoints, r.points);
      loadState();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e: any) { setError(e.message); } finally { setBusy(false); }
  };

  const wc = writing.trim().split(/\s+/).filter(Boolean).length;
  const allAnswered = lesson && lesson.lesson.reading.questions.every((_, i) => rAns[i] !== undefined) && lesson.lesson.listening.questions.every((_, i) => lAns[i] !== undefined);

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in" data-testid="english">
      <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-[2rem] p-6 text-white shadow-xl">
        <p className="text-[10px] font-black uppercase tracking-widest opacity-80">🇬🇧 Inglés</p>
        <h2 className="text-2xl font-black">{phase === 'lesson' && lesson ? lesson.lesson.title : `Hello, ${child.name}!`}</h2>
        {state && <p className="text-sm text-blue-100 mt-1" data-testid="english-level">Tu nivel: <b>{state.levelLabel}</b>{state.placed ? '' : ' (sin prueba de nivel)'} · Puntos de inglés hoy: {state.pointsToday}/{state.pointsCap}</p>}
      </div>
      {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl px-4 py-3 text-sm font-bold" role="alert">{error}</div>}

      {phase === 'home' && state && (
        <div className="grid md:grid-cols-2 gap-4">
          <div className="bg-white rounded-[2rem] p-6 border border-blue-50 space-y-3">
            <h3 className="font-black text-lg text-blue-900">📘 Lección del día</h3>
            <p className="text-sm text-slate-600">Vocabulario, un poco de gramática, escuchar, leer y escribir. Unos 15 minutos.</p>
            <p className="text-xs text-slate-400">Lecciones hoy: {state.lessonsToday}/{state.lessonsPerDay} · Llevas {state.lessonsAtLevel} en tu nivel (subes al hacer {state.promoteAfter} con buena nota).</p>
            <button onClick={startLesson} disabled={busy} className="w-full bg-blue-600 text-white rounded-xl py-3 font-black" data-testid="start-lesson">{busy ? 'Preparando…' : '¡Empezar!'}</button>
          </div>
          <div className="bg-white rounded-[2rem] p-6 border border-blue-50 space-y-3">
            <h3 className="font-black text-lg text-blue-900">🎯 Prueba de nivel</h3>
            <p className="text-sm text-slate-600">25 preguntas para saber qué nivel te va mejor. No pasa nada si no sabes alguna: elige la que te parezca.</p>
            <button onClick={startPlacement} disabled={busy} className="w-full bg-white border-2 border-blue-200 text-blue-700 rounded-xl py-3 font-black" data-testid="start-placement">{state.placed ? 'Repetir la prueba' : 'Hacer la prueba'}</button>
          </div>
        </div>
      )}

      {phase === 'placement' && placement && (
        <div className="bg-white rounded-[2rem] p-6 border border-blue-50 space-y-5" data-testid="placement">
          <p className="text-sm text-slate-500">Elige la respuesta correcta. Las preguntas van de más fácil a más difícil.</p>
          <McList name="placement" qs={placement.questions.map((x) => ({ q: x.question, options: x.options }))} answers={pAnswers} setAnswers={setPAnswers} />
          <button onClick={submitPlacement} disabled={busy} className="w-full bg-blue-600 text-white rounded-xl py-3 font-black" data-testid="submit-placement">{busy ? 'Calculando…' : 'Ver mi nivel'}</button>
        </div>
      )}

      {phase === 'placement_result' && pResult && (
        <div className="bg-white rounded-[2rem] p-8 border border-blue-50 text-center space-y-4" data-testid="placement-result">
          <p className="text-5xl">🎉</p>
          <p className="text-xl font-black text-blue-900">Tu nivel es {pResult.levelLabel}</p>
          <p className="text-sm text-slate-500">Las lecciones se adaptan a este nivel. Cuando lo domines, subirás solo.</p>
          <button onClick={startLesson} className="bg-blue-600 text-white rounded-xl px-6 py-3 font-black">Empezar una lección</button>
        </div>
      )}

      {phase === 'lesson' && lesson && (
        <div className="space-y-5" data-testid="lesson">
          <section className="bg-white rounded-[2rem] p-6 border border-blue-50 space-y-3">
            <h3 className="font-black text-blue-900">1. Vocabulario</h3>
            <div className="grid sm:grid-cols-2 gap-2">
              {lesson.lesson.vocabulary.map((v, i) => (
                <button key={i} onClick={() => speakEnglish(`${v.en}. ${v.example}`)} className="text-left bg-blue-50 rounded-xl p-3 hover:bg-blue-100">
                  <p className="font-black text-blue-900">🔊 {v.en} <span className="font-semibold text-slate-500">· {v.es}</span></p>
                  <p className="text-xs text-slate-600 italic">{v.example}</p>
                </button>
              ))}
            </div>
          </section>
          <section className="bg-white rounded-[2rem] p-6 border border-blue-50 space-y-2">
            <h3 className="font-black text-blue-900">2. {lesson.lesson.grammar.title}</h3>
            <p className="text-sm text-slate-700">{lesson.lesson.grammar.explanation}</p>
            <ul className="text-sm text-slate-600 list-disc pl-5">{lesson.lesson.grammar.examples.map((e, i) => <li key={i}>{e}</li>)}</ul>
            {lesson.lesson.phrases.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-2">
                {lesson.lesson.phrases.map((p, i) => <button key={i} onClick={() => speakEnglish(p, 0.8)} className="bg-slate-100 rounded-full px-3 py-1 text-xs font-bold text-slate-700">🔊 {p}</button>)}
              </div>
            )}
          </section>
          <section className="bg-white rounded-[2rem] p-6 border border-blue-50 space-y-3">
            <h3 className="font-black text-blue-900">3. Escucha</h3>
            <p className="text-xs text-slate-500">Pulsa para escucharlo las veces que quieras (sin ver el texto) y contesta.</p>
            <div className="flex gap-2">
              <button onClick={() => speakEnglish(lesson.lesson.listening.text)} className="bg-indigo-600 text-white rounded-xl px-4 py-2 font-black text-sm" data-testid="listen">🔊 Escuchar</button>
              <button onClick={() => speakEnglish(lesson.lesson.listening.text, 0.7)} className="bg-indigo-50 text-indigo-700 rounded-xl px-4 py-2 font-black text-sm">🐢 Más despacio</button>
            </div>
            <McList name="listening" qs={lesson.lesson.listening.questions} answers={lAns} setAnswers={setLAns} />
          </section>
          <section className="bg-white rounded-[2rem] p-6 border border-blue-50 space-y-3">
            <h3 className="font-black text-blue-900">4. Lee</h3>
            <p className="text-sm leading-relaxed text-slate-800 bg-amber-50/50 rounded-xl p-4" data-testid="reading-text">{lesson.lesson.reading.text}</p>
            <McList name="reading" qs={lesson.lesson.reading.questions} answers={rAns} setAnswers={setRAns} />
          </section>
          <section className="bg-white rounded-[2rem] p-6 border border-blue-50 space-y-3">
            <h3 className="font-black text-blue-900">5. Escribe</h3>
            <p className="text-sm text-slate-800 font-semibold">{lesson.lesson.writing.prompt}</p>
            {lesson.lesson.writing.promptEs && <p className="text-xs text-slate-500">{lesson.lesson.writing.promptEs}</p>}
            <textarea value={writing} onChange={(e) => setWriting(e.target.value)} rows={5} maxLength={2000} className="w-full rounded-xl border-2 border-slate-200 p-3 text-sm outline-none focus:border-blue-400" placeholder="Write here…" data-testid="writing" />
            <p className={`text-xs font-bold ${wc >= lesson.lesson.writing.minWords ? 'text-emerald-600' : 'text-slate-400'}`}>{wc} / {lesson.lesson.writing.minWords} palabras</p>
          </section>
          <button onClick={submitLesson} disabled={busy || !allAnswered} className="w-full bg-emerald-500 disabled:bg-slate-300 text-white rounded-2xl py-4 font-black text-lg" data-testid="submit-lesson">
            {busy ? 'Corrigiendo…' : allAnswered ? 'Terminar la lección' : 'Contesta todas las preguntas'}
          </button>
        </div>
      )}

      {phase === 'result' && result && lesson && (
        <div className="space-y-5" data-testid="lesson-result">
          <div className="bg-white rounded-[2rem] p-6 border border-blue-50 text-center space-y-2">
            <p className="text-4xl">{result.mcCorrect === result.mcTotal ? '🏆' : '👏'}</p>
            <p className="text-xl font-black text-blue-900" data-testid="mc-score">{result.mcCorrect} de {result.mcTotal} respuestas bien</p>
            <p className="text-sm font-bold text-amber-600">+{result.points} puntos</p>
            {result.promoted && <p className="bg-emerald-50 text-emerald-800 rounded-xl px-4 py-2 font-black" data-testid="promoted">🚀 ¡Subes de nivel! Ahora estás en {result.promoted}</p>}
          </div>
          {result.writing && (
            <div className="bg-white rounded-[2rem] p-6 border border-blue-50 space-y-3" data-testid="writing-result">
              <h3 className="font-black text-blue-900">Tu redacción {result.writing.score !== undefined ? `· ${result.writing.score}/10` : ''}</h3>
              {result.writing.error ? <p className="text-sm text-slate-600">{result.writing.error}</p> : (
                <>
                  <p className="text-sm text-slate-700">{result.writing.feedback}</p>
                  {(result.writing.corrections || []).length > 0 && (
                    <ul className="space-y-2">
                      {result.writing.corrections!.map((c, i) => (
                        <li key={i} className="text-sm bg-slate-50 rounded-xl p-3"><span className="line-through text-red-600">{c.original}</span> → <b className="text-emerald-700">{c.correction}</b><br /><span className="text-xs text-slate-500">{c.explanation}</span></li>
                      ))}
                    </ul>
                  )}
                  {result.writing.nextStep && <p className="text-xs text-blue-700 font-bold">👉 {result.writing.nextStep}</p>}
                </>
              )}
            </div>
          )}
          <div className="bg-white rounded-[2rem] p-6 border border-blue-50 space-y-4">
            <h3 className="font-black text-blue-900">Repasa tus respuestas</h3>
            <McList name="r-listening" qs={lesson.lesson.listening.questions} answers={lAns} setAnswers={() => {}} result={result.listening} keyIdx={result.key.listening} />
            <McList name="r-reading" qs={lesson.lesson.reading.questions} answers={rAns} setAnswers={() => {}} result={result.reading} keyIdx={result.key.reading} />
          </div>
          <button onClick={() => { setPhase('home'); setLesson(null); }} className="w-full bg-blue-600 text-white rounded-2xl py-3 font-black">Volver</button>
        </div>
      )}
    </div>
  );
};

export default EnglishModule;
