import React, { useEffect, useState } from 'react';
import { readingService, ReadingParentStats } from '../services/readingService';

const BAND: Record<string, { text: string; cls: string }> = {
  below: { text: 'por debajo', cls: 'text-amber-600' },
  within: { text: 'lo esperado', cls: 'text-emerald-600' },
  above: { text: 'por encima', cls: 'text-sky-600' },
};
const fmt = (t: number) => new Date(t).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });

/** Padres → Lectura: velocidad frente a lo esperado, comprensión por tipo de pregunta y grabaciones. */
const ReadingStatsPanel: React.FC<{ childId: string; isDemo: boolean }> = ({ childId, isDemo }) => {
  const [data, setData] = useState<ReadingParentStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = () => { setError(null); readingService.parentStats(childId).then(setData).catch((e) => setError(e.message)); };
  useEffect(() => { if (!isDemo) { setData(null); load(); } }, [childId, isDemo]);

  if (isDemo) return <div className="bg-white rounded-[2rem] p-8 border border-emerald-50 text-emerald-600 font-bold">En el modo demostración no se guardan las lecturas.</div>;
  if (error) return <p role="alert" className="text-sm font-bold text-rose-600 bg-rose-50 rounded-2xl px-4 py-3">{error}</p>;
  if (!data) return <p className="text-emerald-400 font-bold animate-pulse">Cargando…</p>;

  const del = async (id: string) => {
    if (!confirm('¿Borrar esta grabación? No se podrá recuperar.')) return;
    try { await readingService.deleteAudio(childId, id); load(); } catch (e: any) { setError(e.message); }
  };
  const ref = data.reference;
  const maxW = Math.max(ref.max, ...data.trend.map((t) => t.wpm), 1);

  return (
    <div className="space-y-6" data-testid="reading-stats">
      <section className="grid md:grid-cols-3 gap-4">
        <div className="bg-white rounded-[2rem] p-5 border border-emerald-50"><p className="text-[11px] font-black text-emerald-400 uppercase">Lecturas</p><p className="text-3xl font-black text-emerald-700">{data.totalReadings}</p></div>
        <div className="bg-white rounded-[2rem] p-5 border border-emerald-50"><p className="text-[11px] font-black text-emerald-400 uppercase">Velocidad (últimas 5)</p><p className="text-3xl font-black text-emerald-700">{data.avgWpm ?? '—'} <span className="text-sm">ppm</span></p><p className="text-[11px] text-slate-400">En {ref.course}: de {ref.min} a {ref.max} (media {ref.target})</p></div>
        <div className="bg-white rounded-[2rem] p-5 border border-emerald-50"><p className="text-[11px] font-black text-emerald-400 uppercase">Comprensión</p><p className="text-3xl font-black text-emerald-700">{data.comprehension === null ? '—' : `${data.comprehension} %`}</p></div>
      </section>

      <section className="bg-white rounded-[2rem] p-6 border border-emerald-50">
        <h3 className="text-sm font-black text-emerald-900 uppercase tracking-wider mb-1">Velocidad lectora</h3>
        <p className="text-[11px] text-slate-400 mb-4">Palabras por minuto en voz alta. La franja verde es lo habitual en {ref.course} (Ripoll y otros, 2020, recogido por el Ministerio de Educación). Es una orientación, no una nota.</p>
        {data.trend.length === 0 ? <p className="text-sm text-emerald-400 italic">Todavía no hay lecturas con velocidad.</p> : (
          <div className="relative h-40 flex items-end gap-2" role="img" aria-label={`Velocidad en las últimas lecturas: ${data.trend.map((t) => t.wpm).join(', ')} palabras por minuto`}>
            <div className="absolute inset-x-0 bg-emerald-50 border-y border-emerald-200" style={{ bottom: `${(ref.min / maxW) * 100}%`, height: `${((ref.max - ref.min) / maxW) * 100}%` }} />
            {data.trend.map((t, i) => (
              <div key={i} className="relative flex-1 flex flex-col items-center justify-end h-full">
                <span className="text-[10px] font-black text-emerald-800">{t.wpm}</span>
                <div className="w-full max-w-8 bg-emerald-500 rounded-t-lg" style={{ height: `${(t.wpm / maxW) * 100}%` }} />
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="bg-white rounded-[2rem] p-6 border border-emerald-50">
        <h3 className="text-sm font-black text-emerald-900 uppercase tracking-wider mb-3">Comprensión por tipo de pregunta</h3>
        <ul className="space-y-2">
          {data.byType.map((t) => (
            <li key={t.type}>
              <div className="flex justify-between text-sm font-bold text-emerald-900"><span>{t.label}</span><span>{t.accuracy === null ? '—' : `${t.accuracy} %`} <span className="text-slate-300 font-medium">({t.total})</span></span></div>
              <div className="h-2 bg-emerald-50 rounded-full overflow-hidden"><div className={`h-full ${t.accuracy === null ? '' : t.accuracy >= 75 ? 'bg-emerald-500' : t.accuracy >= 50 ? 'bg-amber-400' : 'bg-rose-500'}`} style={{ width: `${t.accuracy || 0}%` }} /></div>
            </li>
          ))}
        </ul>
        <p className="text-[11px] text-slate-400 mt-3">Si falla más las de «Lo que se deduce» o «Interpretación», ayuda preguntarle por qué pasan las cosas cuando leéis juntos.</p>
      </section>

      <section className="bg-white rounded-[2rem] p-6 border border-emerald-50">
        <h3 className="text-sm font-black text-emerald-900 uppercase tracking-wider mb-3">Lecturas y grabaciones</h3>
        {data.records.length === 0 ? <p className="text-sm text-emerald-400 italic">Todavía no ha hecho ninguna lectura.</p> : (
          <ul className="divide-y divide-emerald-50">
            {data.records.map((r) => (
              <li key={r.id} className="py-3 space-y-2">
                <div className="flex flex-wrap justify-between gap-2 text-sm">
                  <span className="font-bold text-emerald-900">{r.title} <span className="text-slate-300 font-medium">· {fmt(r.createdAt)}</span></span>
                  <span className="text-slate-600">
                    {r.counted ? <>{r.wpm} ppm (<span className={BAND[r.wpmBand]?.cls}>{BAND[r.wpmBand]?.text}</span>)</> : <span className="text-slate-400">velocidad no contada</span>}
                    {' · '}comprensión {r.correct}/{r.total}{r.trackingAccuracy !== null ? ` · ${r.trackingAccuracy} % de palabras reconocidas` : ''}
                  </span>
                </div>
                {r.audioUrl && (
                  <div className="flex flex-wrap items-center gap-3">
                    <audio controls preload="none" src={r.audioUrl} className="h-9" aria-label={`Grabación de ${r.title}`} />
                    <button onClick={() => del(r.id)} className="text-[11px] font-black text-slate-400 hover:text-rose-500">Borrar grabación</button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
        <p className="text-[11px] text-slate-400 mt-3">Las grabaciones solo las puede escuchar vuestra familia y se borran solas a los 365 días.</p>
      </section>
    </div>
  );
};

export default ReadingStatsPanel;
