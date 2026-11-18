import React, { useEffect, useState } from 'react';
import { Child } from '../types';
import { reviewService, TestSession, TestOutcome, ExplainFeedback } from '../services/reviewService';

export interface ReviewTarget { id: string; subject: string; topic: string }

interface ExamModeProps {
  child: Child;
  region: string;
  isDemo: boolean;
  /** Si viene, es un repaso de "Hoy toca repasar" (test corto de 5) */
  reviewItem?: ReviewTarget | null;
  /** El servidor ya ha sumado los puntos: aquí solo se actualiza la pantalla */
  onPoints?: (newPoints: number, earned: number) => void;
  /** Volver a Repasar */
  onBack?: () => void;
}

const SUBJECTS = ['Matemáticas', 'Lengua', 'Ciencias Naturales', 'Ciencias Sociales', 'Inglés', 'Historia', 'Geografía', 'Física y Química', 'Música', 'Valores'];

// Modo demostración: test de ejemplo sin IA ni servidor
const DEMO_TEST = [
  { question: '¿Cuánto es 7 × 8?', options: ['54', '56', '64', '48'], correctIndex: 1, explanation: '7 × 8 = 56. Truco: 5, 6, 7, 8 → 56 = 7 × 8.' },
  { question: '¿Qué parte de la planta absorbe el agua del suelo?', options: ['Las hojas', 'La flor', 'La raíz', 'El tallo'], correctIndex: 2, explanation: 'La raíz absorbe el agua y las sales minerales.' },
  { question: '¿Cuál de estas palabras es un verbo?', options: ['Correr', 'Mesa', 'Bonito', 'Rápidamente'], correctIndex: 0, explanation: 'Correr expresa una acción: es un verbo.' },
  { question: '¿Cómo se dice "manzana" en inglés?', options: ['Orange', 'Pear', 'Banana', 'Apple'], correctIndex: 3, explanation: 'Apple = manzana.' },
  { question: '¿Cuál es el río más largo de España?', options: ['Ebro', 'Tajo', 'Duero', 'Guadalquivir'], correctIndex: 1, explanation: 'El Tajo es el río más largo de la península ibérica.' },
];

type Phase = 'pick' | 'loading' | 'question' | 'result';

const ExamMode: React.FC<ExamModeProps> = ({ child, region, isDemo, reviewItem, onPoints, onBack }) => {
  const [phase, setPhase] = useState<Phase>('pick');
  const [subject, setSubject] = useState(SUBJECTS[0]);
  const [topics, setTopics] = useState<{ id: string; title: string; description: string }[]>([]);
  const [topicsLoading, setTopicsLoading] = useState(false);
  const [customTopic, setCustomTopic] = useState('');
  const [usage, setUsage] = useState<{ used: number; limit: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<TestSession | null>(null);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [outcome, setOutcome] = useState<TestOutcome | null>(null);
  const [explainText, setExplainText] = useState('');
  const [explainLoading, setExplainLoading] = useState(false);
  const [explainFeedback, setExplainFeedback] = useState<ExplainFeedback | null>(null);
  const [explainError, setExplainError] = useState<string | null>(null);

  // Uso del día
  useEffect(() => {
    if (isDemo) return;
    reviewService.today(child.id).then((d) => setUsage(d.usage)).catch(() => {});
  }, [child.id, isDemo]);

  // Temario de la asignatura (se guarda en el servidor: siempre el mismo)
  useEffect(() => {
    if (isDemo || reviewItem || phase !== 'pick') return;
    let alive = true;
    setTopicsLoading(true);
    setError(null);
    reviewService.syllabus(child.id, subject, child.grade, region)
      .then((t) => { if (alive) setTopics(t); })
      .catch((e) => { if (alive) { setTopics([]); setError(e.message); } })
      .finally(() => alive && setTopicsLoading(false));
    return () => { alive = false; };
  }, [subject, child.id, child.grade, region, isDemo, reviewItem, phase]);

  // Un repaso empieza directamente
  useEffect(() => {
    if (reviewItem) start({ reviewItemId: reviewItem.id });
  }, [reviewItem?.id]);

  const resetResult = () => {
    setOutcome(null); setExplainText(''); setExplainFeedback(null); setExplainError(null);
  };

  const start = async (p: { topic?: string; reviewItemId?: string }) => {
    setError(null);
    resetResult();
    if (isDemo) {
      setSession({ sessionId: 'demo', subject: 'Repaso general', topic: 'Test de ejemplo', grade: child.grade, kind: 'test', questions: DEMO_TEST.map((q, i) => ({ id: String(i), question: q.question, options: q.options })), used: 0, limit: 0 });
      setAnswers([]); setCurrent(0); setPhase('question');
      return;
    }
    setPhase('loading');
    try {
      const s = await reviewService.startTest({ childId: child.id, subject, topic: p.topic, grade: child.grade, reviewItemId: p.reviewItemId });
      setSession(s);
      setUsage({ used: s.used, limit: s.limit });
      setAnswers([]); setCurrent(0); setPhase('question');
    } catch (e: any) {
      setError(e.message);
      setPhase('pick');
    }
  };

  const answer = async (idx: number) => {
    if (!session) return;
    const next = [...answers];
    next[current] = idx;
    setAnswers(next);
    if (current < session.questions.length - 1) {
      setTimeout(() => setCurrent(current + 1), 250);
      return;
    }
    // Entregar
    if (isDemo) {
      const detail = DEMO_TEST.map((q, i) => ({ id: String(i), question: q.question, options: q.options, chosen: next[i], correctIndex: q.correctIndex, correct: next[i] === q.correctIndex, explanation: q.explanation, subtopic: '' }));
      const correct = detail.filter((d) => d.correct).length;
      setOutcome({
        result: { id: 'demo', childId: child.id, grade: child.grade, subject: 'Repaso general', topic: 'Test de ejemplo', score: correct, totalQuestions: detail.length, score10: Math.round((correct / detail.length) * 100) / 10, strengths: [], weaknesses: [], studyGuideContent: '', timestamp: Date.now(), pointsEarned: 0, duration: 0, kind: 'test' },
        detail, review: null, newPoints: child.points, explainOffered: false, sessionId: 'demo',
      });
      setPhase('result');
      return;
    }
    setPhase('loading');
    try {
      const o = await reviewService.submitTest(child.id, session.sessionId, next);
      setOutcome(o);
      onPoints?.(o.newPoints, o.result.pointsEarned);
      setPhase('result');
    } catch (e: any) {
      setError(e.message);
      setPhase('question');
    }
  };

  const sendExplain = async () => {
    if (!outcome) return;
    setExplainLoading(true);
    setExplainError(null);
    try {
      setExplainFeedback(await reviewService.explain({ childId: child.id, sessionId: outcome.sessionId, text: explainText }));
    } catch (e: any) {
      setExplainError(e.message);
    } finally {
      setExplainLoading(false);
    }
  };

  const remaining = usage ? Math.max(0, usage.limit - usage.used) : null;

  // ---------------------------------------------------------------- cargando
  if (phase === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4" role="status">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-blue-600 font-bold animate-pulse">{outcome || answers.length ? 'Corrigiendo…' : 'Preparando tu test…'}</p>
      </div>
    );
  }

  // ---------------------------------------------------------------- resultado
  if (phase === 'result' && outcome) {
    const r = outcome.result;
    const good = r.score10 >= 8;
    return (
      <div className="space-y-6 pb-20 animate-in fade-in duration-500">
        <div className="bg-white rounded-[2.5rem] p-8 md:p-10 shadow-xl border-t-8 border-blue-600 text-center">
          <div className="text-6xl mb-3" aria-hidden="true">{good ? '🎉' : r.score10 >= 5 ? '💪' : '🌱'}</div>
          <h2 className="text-3xl font-black text-blue-900">{good ? '¡Muy bien!' : r.score10 >= 5 ? '¡Vas por buen camino!' : '¡A seguir practicando!'}</h2>
          <p className="text-blue-400 font-bold mt-1">{r.subject} · {r.topic}</p>
          <div className="flex flex-wrap items-center justify-center gap-4 my-6">
            <div className="bg-blue-50 px-8 py-4 rounded-3xl">
              <p className="text-xs font-black text-blue-400 uppercase">Aciertos</p>
              <p className="text-5xl font-black text-blue-600" data-testid="test-score">{r.score}/{r.totalQuestions}</p>
            </div>
            {!isDemo && (
              <div className="bg-amber-50 px-6 py-4 rounded-3xl">
                <p className="text-xs font-black text-amber-500 uppercase">Puntos</p>
                <p className="text-3xl font-black text-amber-600">+{r.pointsEarned} ⭐</p>
              </div>
            )}
          </div>
          {outcome.review ? (
            <p className="text-sm font-bold text-indigo-700 bg-indigo-50 rounded-2xl px-4 py-3 inline-block" data-testid="review-next">
              {outcome.review.status === 'mastered'
                ? '🏆 ¡Tema dominado! Ya no hace falta repasarlo.'
                : outcome.review.passed
                  ? `✅ Repaso superado. Este tema vuelve ${outcome.review.nextInDays === 1 ? 'mañana' : `dentro de ${outcome.review.nextInDays} días`}.`
                  : '🔁 Este tema vuelve mañana para que lo afiances.'}
            </p>
          ) : !isDemo && (
            <p className="text-sm font-bold text-indigo-700 bg-indigo-50 rounded-2xl px-4 py-3 inline-block" data-testid="review-next">
              {good ? '🧠 Lo he añadido a Repasar: vuelve dentro de unos días para que no se olvide.' : '🧠 Lo he añadido a Repasar: mañana lo repasamos.'}
            </p>
          )}
          {isDemo && <p className="text-sm font-bold text-amber-700 bg-amber-50 rounded-2xl px-4 py-3 mt-2">Esto es un test de ejemplo. Con una cuenta, los tests son del temario de tu curso y se programan los repasos.</p>}
        </div>

        {(r.strengths.length > 0 || r.weaknesses.length > 0) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {r.strengths.length > 0 && (
              <div className="bg-green-50 p-6 rounded-[2rem] border border-green-100">
                <h3 className="font-black text-green-900 mb-2">🌟 Lo dominas</h3>
                <ul className="space-y-1">{r.strengths.map((s, i) => <li key={i} className="text-green-800 text-sm">✅ {s}</li>)}</ul>
              </div>
            )}
            {r.weaknesses.length > 0 && (
              <div className="bg-rose-50 p-6 rounded-[2rem] border border-rose-100">
                <h3 className="font-black text-rose-900 mb-2">🎯 Para repasar</h3>
                <ul className="space-y-1">{r.weaknesses.map((s, i) => <li key={i} className="text-rose-800 text-sm">• {s}</li>)}</ul>
              </div>
            )}
          </div>
        )}

        <div className="bg-white rounded-[2rem] p-6 border border-blue-50 space-y-3">
          <h3 className="font-black text-blue-900">Repasa tus respuestas</h3>
          {outcome.detail.map((d, i) => (
            <div key={d.id} className={`rounded-2xl p-4 border ${d.correct ? 'border-green-100 bg-green-50/40' : 'border-rose-100 bg-rose-50/40'}`}>
              <p className="text-sm font-bold text-blue-900">{d.correct ? '✅' : '❌'} {i + 1}. {d.question}</p>
              {!d.correct && (
                <p className="text-xs text-rose-700 mt-1">
                  {d.chosen >= 0 && d.options[d.chosen] !== undefined ? <>Tú: {d.options[d.chosen]} · </> : null}
                  Correcta: <strong>{d.options[d.correctIndex]}</strong>
                </p>
              )}
              {!d.correct && d.explanation && <p className="text-xs text-slate-600 mt-1">💡 {d.explanation}</p>}
            </div>
          ))}
        </div>

        {outcome.explainOffered && (
          <div className="bg-white rounded-[2rem] p-6 border-2 border-indigo-100 space-y-3" data-testid="explain-box">
            <h3 className="font-black text-indigo-900">✍️ Explícalo con tus palabras <span className="text-xs font-bold text-indigo-400">(opcional)</span></h3>
            <p className="text-sm text-indigo-600">Cuéntame en dos o tres frases lo más importante de «{r.topic}». Explicarlo ayuda a no olvidarlo.</p>
            {!explainFeedback ? (
              <>
                <label htmlFor="explain-text" className="sr-only">Tu explicación</label>
                <textarea id="explain-text" value={explainText} onChange={(e) => setExplainText(e.target.value)} rows={4} maxLength={2500}
                  className="w-full bg-indigo-50/50 border-2 border-indigo-100 rounded-2xl px-4 py-3 text-sm text-indigo-900 outline-none focus:border-indigo-300" />
                {explainError && <p role="alert" className="text-sm font-bold text-rose-600">{explainError}</p>}
                <button onClick={sendExplain} disabled={explainLoading || explainText.trim().length < 20}
                  className="bg-indigo-600 text-white text-sm font-black px-6 py-3 rounded-2xl disabled:opacity-40">
                  {explainLoading ? 'Leyendo…' : 'Enviar mi explicación'}
                </button>
              </>
            ) : (
              <div className="space-y-2 text-sm" data-testid="explain-feedback">
                {explainFeedback.praise && <p className="text-green-800">🌟 {explainFeedback.praise}</p>}
                {explainFeedback.missing && <p className="text-amber-800">🔎 {explainFeedback.missing}</p>}
                {explainFeedback.tip && <p className="text-indigo-800">💡 {explainFeedback.tip}</p>}
              </div>
            )}
          </div>
        )}

        <div className="flex flex-wrap gap-3 justify-center">
          {onBack && <button onClick={onBack} className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black shadow-lg">🧠 Volver a Repasar</button>}
          {!reviewItem && (
            <button onClick={() => { resetResult(); setPhase('pick'); }} className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-black shadow-lg">
              Hacer otro test
            </button>
          )}
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------- preguntas
  if (phase === 'question' && session) {
    const q = session.questions[current];
    const progress = ((current + 1) / session.questions.length) * 100;
    return (
      <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in duration-300">
        <div className="w-full bg-blue-100 h-3 rounded-full overflow-hidden" role="progressbar" aria-valuenow={current + 1} aria-valuemin={1} aria-valuemax={session.questions.length}>
          <div className="bg-blue-600 h-full transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>
        <div className="bg-white rounded-[2.5rem] p-8 md:p-12 shadow-xl border border-blue-50">
          <div className="flex justify-between items-center gap-3 mb-8">
            <span className="text-xs font-black bg-blue-100 text-blue-600 px-3 py-1 rounded-full">PREGUNTA {current + 1} DE {session.questions.length}</span>
            <span className="text-xs text-blue-400 font-bold uppercase text-right">{session.kind === 'review' ? '🧠 Repaso · ' : ''}{session.topic}</span>
          </div>
          <h3 className="text-2xl font-bold text-blue-900 mb-8 leading-snug">{q.question}</h3>
          <div className="grid grid-cols-1 gap-3">
            {q.options.map((opt, i) => (
              <button key={i} onClick={() => answer(i)}
                className={`w-full text-left p-5 rounded-2xl border-2 transition-all font-bold text-blue-900 flex items-center gap-4 ${answers[current] === i ? 'border-blue-500 bg-blue-50' : 'bg-gray-50 border-transparent hover:border-blue-500 hover:bg-blue-50'}`}>
                <span className="w-10 h-10 shrink-0 rounded-full bg-white border-2 border-blue-100 flex items-center justify-center">{String.fromCharCode(65 + i)}</span>
                {opt}
              </button>
            ))}
          </div>
          {current > 0 && (
            <button onClick={() => setCurrent(current - 1)} className="mt-6 text-sm font-black text-blue-400 hover:text-blue-600">← Anterior</button>
          )}
          {error && <p role="alert" className="mt-4 text-sm font-bold text-rose-600">{error}</p>}
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------- elegir tema
  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <div className="bg-blue-600 rounded-[2.5rem] p-8 md:p-10 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 space-y-4">
          <h2 className="text-3xl font-black">Test de repaso ✍️</h2>
          <p className="opacity-90 text-sm max-w-lg">Elige asignatura y tema de {child.grade}. Al terminar verás tus fallos explicados, y el tema se añade a Repasar para que no se te olvide.</p>
          {remaining !== null && <p className="text-xs font-black uppercase tracking-wider opacity-80" aria-live="polite">{remaining === 0 ? 'Hoy ya no te quedan tests' : `Te quedan ${remaining} tests hoy`}</p>}
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Asignatura">
            {SUBJECTS.map((s) => (
              <button key={s} role="radio" aria-checked={subject === s} onClick={() => setSubject(s)}
                className={`px-4 py-2 rounded-xl text-sm font-black border-2 transition-all ${subject === s ? 'bg-white text-blue-700 border-white' : 'bg-white/10 text-white border-white/20 hover:bg-white/20'}`}>
                {s}
              </button>
            ))}
          </div>
        </div>
        <div className="absolute top-0 right-0 p-8 opacity-20 text-8xl" aria-hidden="true">📝</div>
      </div>

      {onBack && <button onClick={onBack} className="text-sm font-black text-indigo-500 hover:text-indigo-700">← Volver a Repasar</button>}
      {error && <p role="alert" className="text-sm font-bold rounded-2xl px-4 py-3 bg-rose-50 text-rose-600">{error}</p>}

      {isDemo ? (
        <button onClick={() => start({})} className="w-full bg-white p-8 rounded-[2rem] border-2 border-blue-100 hover:border-blue-600 shadow-sm text-left">
          <h3 className="text-xl font-black text-blue-900">Test de ejemplo</h3>
          <p className="text-sm text-blue-400 font-medium">En el modo demostración hay un test de prueba de 5 preguntas.</p>
        </button>
      ) : (
        <>
          <form onSubmit={(e) => { e.preventDefault(); if (customTopic.trim()) start({ topic: customTopic.trim() }); }}
            className="bg-white rounded-[2rem] p-5 border border-blue-50 flex flex-wrap gap-3 items-center">
            <label htmlFor="custom-topic" className="text-sm font-black text-blue-900">¿Tu tema no está? Escríbelo:</label>
            <input id="custom-topic" value={customTopic} onChange={(e) => setCustomTopic(e.target.value)} maxLength={120}
              placeholder="Por ejemplo: los números romanos" className="flex-1 min-w-[12rem] bg-blue-50/50 border-2 border-blue-100 rounded-xl px-4 py-2 text-sm text-blue-900 outline-none focus:border-blue-400" />
            <button type="submit" disabled={!customTopic.trim() || remaining === 0} className="bg-blue-600 text-white text-sm font-black px-5 py-2.5 rounded-xl disabled:opacity-40">Empezar</button>
          </form>
          {topicsLoading ? (
            <p className="text-blue-400 font-bold animate-pulse" role="status">Preparando el temario de {subject}…</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {topics.map((t, i) => (
                <button key={t.id} onClick={() => start({ topic: t.title })} disabled={remaining === 0}
                  className="bg-white p-6 rounded-[2rem] border-2 border-transparent hover:border-blue-600 shadow-sm hover:shadow-xl transition-all text-left disabled:opacity-50">
                  <div className="flex items-start justify-between mb-2">
                    <span className="text-blue-600 font-black text-lg">{String(i + 1).padStart(2, '0')}</span>
                    <span className="text-blue-300 text-sm font-bold">Empezar test →</span>
                  </div>
                  <h3 className="text-lg font-black text-blue-900 mb-1">{t.title}</h3>
                  {t.description && <p className="text-sm text-blue-400 font-medium">{t.description}</p>}
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ExamMode;
