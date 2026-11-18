import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Subject } from '../types';
import { readingService, ReadingList, ReadingStart, ReadingResult, TextCard, WpmReference, wpmMessage } from '../services/readingService';
import { READING_LIBRARY, WPM_REFERENCE, QUESTION_LABELS, bandForLevel, wordCount } from '../shared/readingLibrary';
import { gradeLevel } from '../services/mathChallenge';

interface ReadingModuleProps {
  childId: string;
  childName: string;
  grade: string;
  isDemo: boolean;
  /** El servidor ya ha sumado los puntos: aquí solo se actualiza la pantalla */
  onPoints: (newPoints: number, earned: number) => void;
  onDemoPoints?: (points: number) => void;
  onActivityLog?: (question: string, subject: Subject, answer: any) => void;
}

const GENRE_ICON: Record<string, string> = {
  cuento: '📖', fábula: '🦊', poema: '🎵', leyenda: '🏰', novela: '📚', teatro: '🎭', ciencias: '🔬', sociales: '🌍', noticia: '📰', instrucciones: '🛠️', mito: '⚡', epopeya: '🛡️',
};

const normalizeWord = (w: string) => w.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zñ0-9]/g, '');

// Reconocimiento de voz SOLO si el navegador lo hace dentro del dispositivo (la voz no sale a ningún servicio)
async function onDeviceRecognitionAvailable(): Promise<boolean> {
  const SR: any = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  if (!SR || typeof SR.available !== 'function') return false;
  try {
    const st = await SR.available({ langs: ['es-ES'], processLocally: true });
    return st === 'available';
  } catch { return false; }
}

const blobToDataUrl = (b: Blob) => new Promise<string>((resolve, reject) => { const r = new FileReader(); r.onload = () => resolve(String(r.result)); r.onerror = reject; r.readAsDataURL(b); });

type Phase = 'library' | 'reading' | 'confirm' | 'questions' | 'saving' | 'result';

const ReadingModule: React.FC<ReadingModuleProps> = ({ childId, childName, grade, isDemo, onPoints, onDemoPoints, onActivityLog }) => {
  const level = gradeLevel(grade);
  const [phase, setPhase] = useState<Phase>('library');
  const [list, setList] = useState<ReadingList | null>(null);
  const [tab, setTab] = useState<'mine' | 'easier' | 'challenge'>('mine');
  const [error, setError] = useState<string | null>(null);
  const [current, setCurrent] = useState<ReadingStart | null>(null);
  const [moreLoading, setMoreLoading] = useState(false);

  // Lectura en voz alta
  const [recordVoice, setRecordVoice] = useState(true);
  const [isReading, setIsReading] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [micError, setMicError] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [tracking, setTracking] = useState<boolean>(false);
  const [recognized, setRecognized] = useState<Set<number>>(new Set());
  const [playingModel, setPlayingModel] = useState(false);
  const startRef = useRef(0);
  const timerRef = useRef<any>(null);
  const recRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioBlobRef = useRef<Blob | null>(null);
  const recognizerRef = useRef<any>(null);

  // Preguntas y resultado
  const [answers, setAnswers] = useState<number[]>([]);
  const [showText, setShowText] = useState(false);
  const [readWhole, setReadWhole] = useState(true);
  const [result, setResult] = useState<ReadingResult | null>(null);

  const loadList = () => {
    if (isDemo) return;
    readingService.list(childId).then(setList).catch((e) => setError(e.message));
  };
  useEffect(() => { loadList(); onDeviceRecognitionAvailable().then(setTracking); }, [childId, isDemo]);
  useEffect(() => () => { stopAll(); window.speechSynthesis?.cancel(); }, []);

  // Modo demostración: biblioteca local, sin servidor
  const demoTexts = useMemo(() => READING_LIBRARY.filter((t) => t.level === bandForLevel(level)).map((t) => ({
    id: t.id, level: t.level, course: t.course, title: t.title, author: t.author, source: t.source, genre: t.genre, link: t.link, words: wordCount(t.text), timesRead: 0, bestComprehension: null,
  })), [level]);
  const reference: WpmReference = list?.reference || WPM_REFERENCE[level];

  const words = useMemo(() => (current ? current.text.text.split(/(\s+)/) : []), [current]);
  const wordIdx = useMemo(() => { let n = -1; return words.map((w) => (/\S/.test(w) ? ++n : -1)); }, [words]);

  const open = async (t: TextCard) => {
    setError(null); setResult(null); setAnswers([]); setShowText(false); setReadWhole(true); setSeconds(0); setElapsed(0); setRecognized(new Set());
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(null); audioBlobRef.current = null; setMicError(null);
    if (isDemo) {
      const src = READING_LIBRARY.find((x) => x.id === t.id)!;
      setCurrent({ attemptId: 'demo', text: { ...t, text: src.text }, questions: src.questions.map((q) => ({ type: q.type, label: QUESTION_LABELS[q.type], q: q.q, options: q.options })), reference });
      setPhase('reading');
      return;
    }
    try {
      setCurrent(await readingService.start(childId, t.id));
      setPhase('reading');
    } catch (e: any) { setError(e.message); }
  };

  const playModel = () => {
    if (!current || !('speechSynthesis' in window)) return;
    if (playingModel) { window.speechSynthesis.cancel(); setPlayingModel(false); return; }
    const u = new SpeechSynthesisUtterance(current.text.text.replace(/\n+/g, '. '));
    u.lang = 'es-ES'; u.rate = level <= 2 ? 0.8 : 0.92;
    u.onend = () => setPlayingModel(false);
    window.speechSynthesis.cancel(); window.speechSynthesis.speak(u); setPlayingModel(true);
  };

  const startReading = async () => {
    window.speechSynthesis?.cancel(); setPlayingModel(false);
    setMicError(null);
    if (recordVoice) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mime = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg'].find((m) => (window as any).MediaRecorder?.isTypeSupported?.(m));
        const rec = new MediaRecorder(stream, mime ? { mimeType: mime, audioBitsPerSecond: 32000 } : undefined);
        chunksRef.current = [];
        rec.ondataavailable = (e) => e.data.size && chunksRef.current.push(e.data);
        rec.onstop = () => {
          const blob = new Blob(chunksRef.current, { type: rec.mimeType || 'audio/webm' });
          audioBlobRef.current = blob;
          setAudioUrl(URL.createObjectURL(blob));
          stream.getTracks().forEach((t) => t.stop());
        };
        rec.start();
        recRef.current = rec;
      } catch {
        setMicError('No se ha podido usar el micrófono. Puedes leer igualmente: medimos el tiempo.');
      }
    }
    if (tracking && current) {
      try {
        const SR: any = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        const r = new SR();
        r.lang = 'es-ES'; r.continuous = true; r.interimResults = true; r.processLocally = true;
        const target = current.text.text.split(/\s+/).filter(Boolean).map(normalizeWord);
        r.onresult = (ev: any) => {
          let said = '';
          for (let i = 0; i < ev.results.length; i++) said += ev.results[i][0].transcript + ' ';
          const tokens = said.split(/\s+/).map(normalizeWord).filter(Boolean);
          const hit = new Set<number>(); let last = -1;
          tokens.forEach((tk) => { for (let i = last + 1; i < Math.min(target.length, last + 6); i++) if (target[i] === tk) { hit.add(i); last = i; break; } });
          setRecognized(hit);
        };
        r.onerror = () => {};
        r.start();
        recognizerRef.current = r;
      } catch { /* sin seguimiento */ }
    }
    startRef.current = Date.now();
    setIsReading(true);
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => setElapsed(Math.floor((Date.now() - startRef.current) / 1000)), 500);
  };

  const stopAll = () => {
    clearInterval(timerRef.current);
    try { if (recRef.current && recRef.current.state !== 'inactive') recRef.current.stop(); } catch { /* nada */ }
    recRef.current = null;
    try { recognizerRef.current?.stop(); } catch { /* nada */ }
    recognizerRef.current = null;
  };

  const finishReading = () => {
    const secs = Math.max(1, Math.round((Date.now() - startRef.current) / 1000));
    stopAll();
    setIsReading(false);
    setSeconds(secs);
    const wpm = (current?.text.words || 0) / (secs / 60);
    // Si ha terminado demasiado pronto para el texto, le preguntamos si lo ha leído entero
    setPhase(wpm > reference.max * 1.6 ? 'confirm' : 'questions');
  };

  const submit = async () => {
    if (!current) return;
    setPhase('saving');
    if (isDemo) {
      const src = READING_LIBRARY.find((x) => x.id === current.text.id)!;
      const detail = src.questions.map((q, i) => ({ type: q.type, label: QUESTION_LABELS[q.type], q: q.q, options: q.options, chosen: answers[i] ?? -1, correctIndex: q.correct, correct: answers[i] === q.correct, explanation: q.explanation }));
      const correct = detail.filter((d) => d.correct).length;
      const wpm = Math.round(current.text.words / (seconds / 60));
      const band = wpm < reference.min ? 'below' : wpm > reference.max ? 'above' : 'within';
      onDemoPoints?.(10 + correct * 5);
      setResult({ recordId: 'demo', words: current.text.words, seconds, wpm, wpmBand: band, reference, counted: readWhole, correct, total: 4, detail, points: 10 + correct * 5, pointsCapReached: false, newPoints: 0, audioSaved: false, audioError: null });
      setPhase('result');
      return;
    }
    try {
      const audio = recordVoice && audioBlobRef.current && audioBlobRef.current.size > 0 ? await blobToDataUrl(audioBlobRef.current) : null;
      const total = current.text.text.split(/\s+/).filter(Boolean).length;
      const r = await readingService.submit({
        childId, attemptId: current.attemptId, seconds, answers, audio, readWhole,
        trackingAccuracy: tracking && recognized.size ? Math.round((recognized.size / total) * 100) : null,
      });
      setResult(r);
      onPoints(r.newPoints, r.points);
      onActivityLog?.(`Lectura: ${current.text.title}`, 'Lengua', { type: 'reading', wpm: r.wpm, comprehension: `${r.correct}/${r.total}` });
      setPhase('result');
      loadList();
    } catch (e: any) {
      setError(e.message);
      setPhase('questions');
    }
  };

  const more = async () => {
    setMoreLoading(true); setError(null);
    try { const { text } = await readingService.more(childId); loadList(); await open(text); }
    catch (e: any) { setError(e.message); }
    finally { setMoreLoading(false); }
  };

  const fontSize = level <= 2 ? 'text-2xl leading-loose' : level <= 4 ? 'text-xl leading-loose' : 'text-lg leading-relaxed';
  const isPoem = current?.text.genre === 'poema' || current?.text.genre === 'teatro';

  // ================================================================== BIBLIOTECA
  if (phase === 'library') {
    const cards = isDemo ? demoTexts : list ? (tab === 'mine' ? list.texts : tab === 'easier' ? list.easier : list.challenge) : [];
    return (
      <div className="space-y-6 pb-20 max-w-5xl mx-auto animate-in fade-in duration-500">
        <div className="bg-gradient-to-r from-emerald-500 to-teal-600 rounded-[2.5rem] p-6 sm:p-8 text-white shadow-xl">
          <h2 className="text-2xl sm:text-3xl font-black">📖 ¡A leer, {childName}!</h2>
          <p className="opacity-90 text-sm mt-1">Lecturas de {reference.course}: cuentos, poemas y textos de lo que estudias en clase. Lee en voz alta, contesta 4 preguntas y mira cómo mejoras.</p>
          <p className="text-xs font-black uppercase tracking-wider opacity-80 mt-3">En {reference.course} se suelen leer unas {reference.target} palabras por minuto</p>
          {list && <p className="text-xs font-bold opacity-80 mt-1">⭐ Puntos por lecturas hoy: {list.pointsToday} de {list.pointsCap}</p>}
        </div>
        {error && <p role="alert" className="text-sm font-bold text-rose-600 bg-rose-50 rounded-2xl px-4 py-3">{error}</p>}
        {!isDemo && (
          <div className="flex flex-wrap gap-2" role="tablist" aria-label="Nivel de las lecturas">
            {([['mine', `📘 Mi curso`], ['easier', '🌱 Más fáciles'], ['challenge', '🚀 Un reto']] as const).map(([id, label]) => (
              <button key={id} role="tab" aria-selected={tab === id} onClick={() => setTab(id)}
                className={`px-4 py-2 rounded-xl text-sm font-black border-2 ${tab === id ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-emerald-700 border-emerald-100'}`}>
                {label}
              </button>
            ))}
          </div>
        )}
        {!isDemo && !list && !error && <p className="text-emerald-500 font-bold animate-pulse">Cargando lecturas…</p>}
        {isDemo && <p className="text-sm font-bold text-amber-700 bg-amber-50 rounded-2xl px-4 py-3">Modo demostración: puedes probar las lecturas, pero no se guardan ni se graba la voz.</p>}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4" data-testid="reading-list">
          {cards.map((t) => (
            <button key={t.id} onClick={() => open(t)} className="text-left bg-white rounded-[2rem] p-6 border-2 border-transparent hover:border-emerald-400 shadow-sm hover:shadow-lg transition-all">
              <div className="flex items-start justify-between gap-3">
                <span className="text-3xl" aria-hidden="true">{GENRE_ICON[t.genre] || '📖'}</span>
                {t.timesRead > 0 && <span className="text-[10px] font-black bg-emerald-50 text-emerald-700 px-2 py-1 rounded-full">✓ Leída{t.bestComprehension !== null ? ` · ${Math.round((t.bestComprehension / 100) * 4)}/4` : ''}</span>}
              </div>
              <h3 className="text-lg font-black text-emerald-900 mt-2">{t.title}</h3>
              <p className="text-xs font-bold text-emerald-600">{t.author}</p>
              <p className="text-xs text-slate-400 mt-1">{t.link} · {t.words} palabras</p>
            </button>
          ))}
        </div>
        {list?.allRead && tab === 'mine' && (
          <button onClick={more} disabled={moreLoading} className="bg-emerald-600 text-white px-6 py-3 rounded-2xl font-black shadow-lg disabled:opacity-50">
            {moreLoading ? 'Preparando una lectura nueva…' : '✨ ¡Las has leído todas! Quiero una lectura nueva'}
          </button>
        )}
      </div>
    );
  }

  if (!current) return null;

  // ================================================================== LEER
  if (phase === 'reading') {
    return (
      <div className="space-y-6 pb-20 max-w-4xl mx-auto">
        <button onClick={() => { stopAll(); setIsReading(false); setPhase('library'); }} className="text-sm font-black text-emerald-600">← Volver a las lecturas</button>
        <article className="bg-white rounded-[2.5rem] p-6 sm:p-10 shadow-xl border border-emerald-50">
          <p className="text-xs font-black text-emerald-500 uppercase tracking-wider">{current.text.link}</p>
          <h2 className="text-3xl font-black text-emerald-900 mt-1">{current.text.title}</h2>
          <p className="text-sm font-bold text-slate-400 mb-6">{current.text.author} · {current.text.source}</p>
          <div className={`${fontSize} text-slate-800 ${isPoem ? 'whitespace-pre-line' : ''}`} data-testid="reading-text">
            {words.map((w, i) => (wordIdx[i] < 0 ? <React.Fragment key={i}>{w}</React.Fragment> :
              <span key={i} className={recognized.has(wordIdx[i]) ? 'bg-emerald-100 rounded' : ''}>{w}</span>))}
          </div>
        </article>
        <div className="bg-white rounded-[2rem] p-6 border border-emerald-50 space-y-4">
          {!isReading ? (
            <>
              <div className="flex flex-wrap gap-3">
                <button onClick={playModel} className="bg-emerald-50 text-emerald-800 px-5 py-3 rounded-2xl font-black">{playingModel ? '⏹️ Parar' : '🔊 Escuchar cómo se lee'}</button>
                <button onClick={startReading} className="bg-emerald-600 text-white px-8 py-3 rounded-2xl font-black shadow-lg">🎙️ Empiezo a leer</button>
              </div>
              {!isDemo && (
                <label className="flex items-center gap-3 text-sm font-bold text-emerald-900">
                  <input type="checkbox" checked={recordVoice} onChange={(e) => setRecordVoice(e.target.checked)} className="w-5 h-5" />
                  Grabar mi voz para que la escuchen mis padres
                </label>
              )}
              <p className="text-xs text-slate-400">Pulsa «Empiezo a leer», lee el texto en voz alta y pulsa «He terminado». {tracking ? 'Las palabras se irán iluminando mientras lees (tu voz se reconoce dentro de este dispositivo).' : ''}</p>
            </>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-4">
              <span className="text-lg font-black text-emerald-700" aria-live="off">⏱️ {elapsed} s {recRef.current ? '· 🔴 grabando' : ''}</span>
              <button onClick={finishReading} className="bg-rose-500 text-white px-8 py-3 rounded-2xl font-black shadow-lg">✋ He terminado</button>
            </div>
          )}
          {micError && <p role="status" className="text-sm font-bold text-amber-700">{micError}</p>}
        </div>
      </div>
    );
  }

  // ================================================================== ¿LO HAS LEÍDO ENTERO?
  if (phase === 'confirm') {
    return (
      <div className="max-w-xl mx-auto bg-white rounded-[2.5rem] p-8 shadow-xl text-center space-y-4" role="dialog" aria-labelledby="confirm-title">
        <div className="text-5xl" aria-hidden="true">🤔</div>
        <h2 id="confirm-title" className="text-2xl font-black text-emerald-900">¡Qué rápido! ¿Lo has leído entero?</h2>
        <p className="text-sm text-slate-500">Has tardado {seconds} segundos en {current.text.words} palabras.</p>
        <div className="flex flex-wrap justify-center gap-3">
          <button onClick={() => { setReadWhole(true); setPhase('questions'); }} className="bg-emerald-600 text-white px-6 py-3 rounded-2xl font-black">Sí, entero</button>
          <button onClick={() => { setReadWhole(false); setPhase('questions'); }} className="bg-emerald-50 text-emerald-800 px-6 py-3 rounded-2xl font-black">No, me he saltado partes</button>
          <button onClick={() => { setPhase('reading'); setElapsed(0); }} className="text-emerald-600 px-6 py-3 rounded-2xl font-black">Volver a leer</button>
        </div>
      </div>
    );
  }

  // ================================================================== PREGUNTAS
  if (phase === 'questions' || phase === 'saving') {
    const done = current.questions.every((_, i) => answers[i] !== undefined);
    return (
      <div className="space-y-6 pb-20 max-w-4xl mx-auto">
        <div className="bg-white rounded-[2.5rem] p-6 sm:p-8 shadow-xl border border-emerald-50 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-2xl font-black text-emerald-900">¿Lo has entendido?</h2>
            <button onClick={() => setShowText(!showText)} className="text-sm font-black text-emerald-600">{showText ? 'Ocultar el texto' : '👀 Volver a mirar el texto'}</button>
          </div>
          {showText && <div className={`bg-emerald-50/50 rounded-2xl p-4 text-slate-700 ${isPoem ? 'whitespace-pre-line' : ''}`}>{current.text.text}</div>}
          {audioUrl && <div className="text-sm text-emerald-800 font-bold flex flex-wrap items-center gap-3">🎧 Escúchate: <audio controls src={audioUrl} className="h-10" /></div>}
          {current.questions.map((q, i) => (
            <fieldset key={i} className="space-y-2">
              <legend className="font-black text-emerald-900"><span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 block">{q.label}</span>{i + 1}. {q.q}</legend>
              <div className="grid sm:grid-cols-2 gap-2">
                {q.options.map((o, j) => (
                  <label key={j} className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer text-sm font-bold ${answers[i] === j ? 'border-emerald-500 bg-emerald-50 text-emerald-900' : 'border-slate-100 text-slate-700 hover:border-emerald-200'}`}>
                    <input type="radio" name={`q${i}`} checked={answers[i] === j} onChange={() => { const a = [...answers]; a[i] = j; setAnswers(a); }} className="w-4 h-4" />
                    {o}
                  </label>
                ))}
              </div>
            </fieldset>
          ))}
          {error && <p role="alert" className="text-sm font-bold text-rose-600">{error}</p>}
          <button onClick={submit} disabled={!done || phase === 'saving'} className="bg-emerald-600 text-white px-8 py-4 rounded-2xl font-black shadow-lg disabled:opacity-40">
            {phase === 'saving' ? 'Guardando…' : 'Comprobar'}
          </button>
        </div>
      </div>
    );
  }

  // ================================================================== RESULTADO
  if (phase === 'result' && result) {
    return (
      <div className="space-y-6 pb-20 max-w-4xl mx-auto" data-testid="reading-result">
        <div className="bg-white rounded-[2.5rem] p-8 shadow-xl border-t-8 border-emerald-500 text-center space-y-4">
          <div className="text-5xl" aria-hidden="true">{result.correct === result.total ? '🌟' : result.correct >= 2 ? '👏' : '📚'}</div>
          <h2 className="text-3xl font-black text-emerald-900">{current.text.title}</h2>
          <div className="flex flex-wrap justify-center gap-4">
            <div className="bg-emerald-50 px-6 py-4 rounded-3xl"><p className="text-xs font-black text-emerald-500 uppercase">Comprensión</p><p className="text-4xl font-black text-emerald-700" data-testid="reading-comprehension">{result.correct}/{result.total}</p></div>
            <div className="bg-sky-50 px-6 py-4 rounded-3xl"><p className="text-xs font-black text-sky-500 uppercase">Palabras por minuto</p><p className="text-4xl font-black text-sky-700" data-testid="reading-wpm">{result.counted ? result.wpm : '—'}</p></div>
            <div className="bg-amber-50 px-6 py-4 rounded-3xl"><p className="text-xs font-black text-amber-500 uppercase">Puntos</p><p className="text-4xl font-black text-amber-600">+{result.points}</p></div>
          </div>
          {result.counted
            ? <p className="text-sm font-bold text-sky-800 bg-sky-50 rounded-2xl px-4 py-3 inline-block" data-testid="wpm-message">{wpmMessage(result.wpmBand, result.reference)}</p>
            : <p className="text-sm font-bold text-slate-500">Esta vez no contamos la velocidad. La próxima, lee el texto entero en voz alta.</p>}
          {result.audioSaved && <p className="text-xs font-bold text-emerald-600">🎙️ Tu lectura se ha guardado para que la escuchen tus padres.</p>}
          {result.audioError && <p className="text-xs font-bold text-amber-600">No se ha podido guardar la grabación ({result.audioError}).</p>}
          {result.pointsCapReached && <p className="text-xs font-bold text-amber-700">Hoy ya has llegado al máximo de puntos por lecturas. ¡Pero leer siempre suma!</p>}
        </div>
        <div className="bg-white rounded-[2rem] p-6 border border-emerald-50 space-y-3">
          <h3 className="font-black text-emerald-900">Tus respuestas</h3>
          {result.detail.map((d, i) => (
            <div key={i} className={`rounded-2xl p-4 border ${d.correct ? 'border-green-100 bg-green-50/40' : 'border-rose-100 bg-rose-50/40'}`}>
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">{d.label}</p>
              <p className="text-sm font-bold text-emerald-900">{d.correct ? '✅' : '❌'} {d.q}</p>
              {!d.correct && <p className="text-xs text-rose-700 mt-1">La respuesta era: <strong>{d.options[d.correctIndex]}</strong></p>}
              <p className="text-xs text-slate-600 mt-1">💡 {d.explanation}</p>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap justify-center gap-3">
          <button onClick={() => setPhase('library')} className="bg-emerald-600 text-white px-8 py-4 rounded-2xl font-black shadow-lg">Otra lectura</button>
          <button onClick={() => open(current.text)} className="bg-emerald-50 text-emerald-800 px-8 py-4 rounded-2xl font-black">Volver a leer esta</button>
        </div>
      </div>
    );
  }
  return null;
};

export default ReadingModule;
