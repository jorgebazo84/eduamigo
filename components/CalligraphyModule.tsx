import React, { useEffect, useRef, useState } from 'react';
import { calligraphyService, CalligraphyResult, CalligraphyRecord, PracticeSheet } from '../services/calligraphyService';
import { compressPhoto, fileToDataUrl } from '../services/imageUtils';
import PracticeSheetPrint from './PracticeSheetPrint';
import ReportErrorButton from './ReportErrorButton';

interface Props {
  childId: string;
  childName: string;
  grade: string;
  isDemo?: boolean;
  onPoints?: (newPoints: number, earned: number) => void;
  onDemoPoints?: (points: number) => void;
}

const DEMO_RESULT: CalligraphyResult = {
  score: 7.5, transcription: 'Mi perro se llama Toby y le gusta correr por el parque.',
  legibility: 'Se lee muy bien casi todo.', strokeFeedback: 'Haces las letras con un trazo firme.', spacingFeedback: 'Algunas palabras están muy juntas: deja un dedo de espacio.',
  spellingErrors: [{ wrong: 'parqe', right: 'parque' }],
  generalFeedback: '¡Muy bien! Tu letra se entiende y se nota que te has esforzado.',
  practicePlan: [
    { title: 'Espacio entre palabras', description: 'Copia dejando un dedo entre palabra y palabra.', target: 'Espaciado', difficulty: 'fácil', printableContent: 'Mi perro corre.\nEl sol brilla.\nMe gusta leer.' },
    { title: 'La "qu"', description: 'Practica palabras con "que" y "qui".', target: 'Ortografía', difficulty: 'fácil', printableContent: 'parque parque parque\nqueso queso queso\nquince quince quince' },
  ],
};

/** Caligrafía: foto de lo que ha escrito → nota, consejos, faltas de ortografía y fichas para imprimir. */
const CalligraphyModule: React.FC<Props> = ({ childId, childName, grade, isDemo, onPoints, onDemoPoints }) => {
  const [tab, setTab] = useState<'new' | 'history'>('new');
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ id: string; analysis: CalligraphyResult; points: number } | null>(null);
  const [history, setHistory] = useState<CalligraphyRecord[] | null>(null);
  const [sheet, setSheet] = useState<PracticeSheet | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (tab !== 'history') return;
    if (isDemo) { setHistory([]); return; }
    calligraphyService.history(childId).then((r) => setHistory(r.records)).catch((e) => setError(e.message));
  }, [tab, childId, isDemo]);

  const onFile = async (f?: File | null) => {
    if (!f) return;
    setError(null); setResult(null);
    try { setPreview(await fileToDataUrl(f)); } catch (e: any) { setError(e.message); }
  };

  const analyze = async () => {
    if (!preview) return;
    setBusy(true); setError(null);
    try {
      if (isDemo) {
        await new Promise((r) => setTimeout(r, 600));
        setResult({ id: 'demo', analysis: DEMO_RESULT, points: 15 }); onDemoPoints?.(15);
      } else {
        const { image, thumb } = await compressPhoto(preview);
        const r = await calligraphyService.analyze(childId, image, thumb);
        setResult({ id: r.id, analysis: r.analysis, points: r.points });
        onPoints?.(r.newPoints, r.points);
      }
    } catch (e: any) { setError(e.message); }
    finally { setBusy(false); }
  };

  const showResult = (a: CalligraphyResult, id: string, points?: number) => (
    <div className="space-y-4" data-testid="calligraphy-result">
      <div className="bg-white rounded-[2rem] p-6 border border-indigo-50 flex items-center gap-5">
        <div className={`w-20 h-20 rounded-2xl flex items-center justify-center text-3xl font-black ${a.score >= 7 ? 'bg-emerald-100 text-emerald-700' : a.score >= 5 ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'}`} data-testid="calligraphy-score">{a.score}</div>
        <div className="flex-1">
          <p className="font-black text-slate-800">{a.generalFeedback}</p>
          {points !== undefined && <p className="text-xs font-bold text-amber-600">+{points} puntos</p>}
        </div>
      </div>
      {a.transcription && <p className="text-sm text-slate-600 bg-slate-50 rounded-2xl p-4"><b>He leído:</b> «{a.transcription}»</p>}
      <div className="grid md:grid-cols-3 gap-3">
        {[['👀 Se lee', a.legibility], ['✏️ Trazo', a.strokeFeedback], ['↔️ Espacios', a.spacingFeedback]].map(([t, v]) => (
          <div key={t} className="bg-white rounded-2xl p-4 border border-indigo-50"><p className="text-xs font-black text-indigo-600">{t}</p><p className="text-sm text-slate-700">{v}</p></div>
        ))}
      </div>
      {a.spellingErrors.length > 0 && (
        <div className="bg-white rounded-2xl p-4 border border-rose-100">
          <p className="text-xs font-black text-rose-600 mb-2">🔤 Ortografía</p>
          <div className="flex flex-wrap gap-2">{a.spellingErrors.map((e, i) => <span key={i} className="bg-rose-50 rounded-xl px-3 py-1 text-sm"><s className="text-rose-600">{e.wrong}</s>{e.right ? <> → <b className="text-emerald-700">{e.right}</b></> : null}</span>)}</div>
        </div>
      )}
      <div className="bg-white rounded-2xl p-4 border border-indigo-50 space-y-3">
        <p className="text-xs font-black text-indigo-600">🖨️ Fichas para practicar</p>
        {a.practicePlan.map((p, i) => (
          <div key={i} className="flex items-center justify-between gap-3 bg-indigo-50/50 rounded-xl p-3">
            <div><p className="font-bold text-slate-800 text-sm">{p.title}</p><p className="text-xs text-slate-500">{p.description}</p></div>
            <button onClick={() => setSheet(p)} className="shrink-0 bg-indigo-600 text-white rounded-xl px-3 py-2 text-xs font-black" data-testid="open-sheet">Imprimir</button>
          </div>
        ))}
      </div>
      <ReportErrorButton childId={childId} kind="calligraphy" refId={id} isDemo={isDemo} className="text-right" />
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in pb-20" data-testid="calligraphy">
      <div className="bg-gradient-to-br from-indigo-600 to-purple-600 rounded-[2rem] p-6 text-white shadow-xl">
        <h2 className="text-2xl font-black">✍️ Taller de caligrafía</h2>
        <p className="text-sm text-indigo-100">Escribe unas frases en tu cuaderno, hazle una foto y te digo cómo mejorar tu letra.</p>
      </div>
      <div className="flex gap-2 justify-center">
        {(['new', 'history'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`px-5 py-2 rounded-xl text-xs font-black ${tab === t ? 'bg-indigo-600 text-white' : 'bg-white text-indigo-600 border border-indigo-100'}`}>{t === 'new' ? '📸 Nueva foto' : '📜 Mi historial'}</button>
        ))}
      </div>
      {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl px-4 py-3 text-sm font-bold" role="alert">{error}</div>}

      {tab === 'new' && (
        <>
          <div className="bg-white rounded-[2rem] p-6 border border-indigo-50 space-y-4 text-center">
            <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} data-testid="calligraphy-file" />
            {preview ? <img src={preview} alt="Tu escritura" className="max-h-72 mx-auto rounded-2xl border" /> : <div className="text-6xl py-6">📝</div>}
            <div className="flex gap-2 justify-center flex-wrap">
              <button onClick={() => fileRef.current?.click()} className="bg-indigo-50 text-indigo-700 rounded-xl px-5 py-3 font-black text-sm">{preview ? 'Otra foto' : '📸 Hacer o elegir foto'}</button>
              {preview && <button onClick={analyze} disabled={busy} className="bg-indigo-600 text-white rounded-xl px-5 py-3 font-black text-sm" data-testid="analyze">{busy ? 'Mirando tu letra…' : '🔍 Analizar mi letra'}</button>}
            </div>
            <p className="text-[11px] text-slate-400">Consejo: buena luz, foto de frente y que se vea solo lo que has escrito.</p>
          </div>
          {result && showResult(result.analysis, result.id, result.points)}
        </>
      )}

      {tab === 'history' && (
        history === null ? <div className="h-40 bg-indigo-50 rounded-[2rem] animate-pulse" /> : history.length === 0 ? (
          <p className="text-center text-sm text-slate-500 bg-white rounded-2xl p-6">Aún no hay fotos analizadas.</p>
        ) : (
          <div className="space-y-3">
            {history.map((r) => (
              <details key={r.id} className="bg-white rounded-2xl p-4 border border-indigo-50">
                <summary className="cursor-pointer flex items-center gap-3">
                  {r.photoUrl && <img src={r.photoUrl} alt="" className="w-14 h-14 object-cover rounded-xl" />}
                  <span className="font-black text-slate-800">Nota {r.score}</span>
                  <span className="text-xs text-slate-400">{new Date(r.at).toLocaleDateString('es-ES')}</span>
                </summary>
                <div className="mt-3">{showResult(r.analysis, r.id)}</div>
              </details>
            ))}
          </div>
        )
      )}
      {sheet && <PracticeSheetPrint title={sheet.title} childName={childName} content={sheet.printableContent} onClose={() => setSheet(null)} />}
    </div>
  );
};

export default CalligraphyModule;
