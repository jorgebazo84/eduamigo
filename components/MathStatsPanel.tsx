import React, { useEffect, useState } from 'react';
import { mathService, MathParentStats } from '../services/mathService';
import { gradeLevel, defaultAnswerStyle } from '../services/mathChallenge';

const FAMILY: Record<string, string> = { sumas: 'Sumas', restas: 'Restas', multiplicar: 'Multiplicar', dividir: 'Dividir', otras: 'Decimales, fracciones, %…' };
const MODE: Record<string, string> = { mixed: 'Mezclado', add_sub: 'Sumas y restas', multi: 'Multiplicar', div: 'Dividir', tables: 'Tabla', mistakes: 'Mis fallos' };

/** Padres → Mates: retos de cálculo, aciertos por tipo y lo que se le resiste. */
const MathStatsPanel: React.FC<{ childId: string; grade: string; isDemo: boolean }> = ({ childId, grade, isDemo }) => {
  const [data, setData] = useState<MathParentStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    if (isDemo) return;
    setData(null); setError(null); setMsg('');
    mathService.parentStats(childId).then(setData).catch((e) => setError(e.message));
  }, [childId, isDemo]);

  if (isDemo) return <div className="bg-white rounded-[2rem] p-8 border border-orange-50 text-orange-600 font-bold">En el modo demostración no se guardan los retos.</div>;
  if (error) return <p role="alert" className="text-sm font-bold text-rose-600 bg-rose-50 rounded-2xl px-4 py-3">{error}</p>;
  if (!data) return <p className="text-orange-400 font-bold animate-pulse">Cargando…</p>;

  const auto = defaultAnswerStyle(gradeLevel(grade));
  const setStyle = async (v: string) => {
    setMsg('');
    try {
      await mathService.setAnswerStyle(childId, v === 'auto' ? null : (v as any));
      setData({ ...data, settings: { answerStyle: v === 'auto' ? null : (v as any) } });
      setMsg('Guardado');
    } catch (e: any) { setMsg(e.message); }
  };
  const maxCorrect = Math.max(1, ...data.weeks.map((w) => w.correct));

  return (
    <div className="space-y-6" data-testid="math-stats">
      <section className="grid md:grid-cols-3 gap-4">
        <div className="bg-white rounded-[2rem] p-5 border border-orange-50"><p className="text-[11px] font-black text-orange-300 uppercase">Retos esta semana</p><p className="text-3xl font-black text-orange-700">{data.thisWeek.challenges}</p></div>
        <div className="bg-white rounded-[2rem] p-5 border border-orange-50"><p className="text-[11px] font-black text-orange-300 uppercase">Aciertos esta semana</p><p className="text-3xl font-black text-orange-700">{data.thisWeek.accuracy === null ? '—' : `${data.thisWeek.accuracy} %`}</p></div>
        <div className="bg-white rounded-[2rem] p-5 border border-orange-50"><p className="text-[11px] font-black text-orange-300 uppercase">Récord (mezclado)</p><p className="text-3xl font-black text-orange-700">{data.record}</p></div>
      </section>

      <section className="bg-white rounded-[2rem] p-6 border border-orange-50">
        <h3 className="text-sm font-black text-orange-900 uppercase tracking-wider mb-4">Últimas 4 semanas</h3>
        <div className="flex items-end gap-4 h-36" role="img" aria-label={data.weeks.map((w, i) => `Semana ${i + 1}: ${w.challenges} retos, ${w.correct} aciertos`).join('; ')}>
          {data.weeks.map((w, i) => (
            <div key={i} className="flex-1 flex flex-col items-center justify-end h-full gap-1">
              <span className="text-[11px] font-black text-orange-700">{w.correct}</span>
              <div className="w-full max-w-16 bg-orange-400 rounded-t-xl" style={{ height: `${Math.max(4, (w.correct / maxCorrect) * 100)}%` }} />
              <span className="text-[10px] font-bold text-orange-400">{i === data.weeks.length - 1 ? 'Esta' : `Hace ${data.weeks.length - 1 - i}`}</span>
              <span className="text-[10px] text-orange-300">{w.challenges} retos</span>
            </div>
          ))}
        </div>
        <p className="text-[11px] text-orange-400 mt-2">Aciertos totales en los retos de cada semana.</p>
      </section>

      <section className="grid md:grid-cols-2 gap-4">
        <div className="bg-white rounded-[2rem] p-6 border border-orange-50">
          <h3 className="text-sm font-black text-orange-900 uppercase tracking-wider mb-3">Aciertos por tipo (4 semanas)</h3>
          {data.byFamily.length === 0 ? <p className="text-sm text-orange-400 italic">Todavía no ha hecho retos.</p> : (
            <ul className="space-y-2">
              {data.byFamily.map((f) => (
                <li key={f.family}>
                  <div className="flex justify-between text-sm font-bold text-orange-900"><span>{FAMILY[f.family] || f.family}</span><span>{f.accuracy} % <span className="text-orange-300 font-medium">({f.total})</span></span></div>
                  <div className="h-2 bg-orange-50 rounded-full overflow-hidden"><div className={`h-full ${f.accuracy >= 80 ? 'bg-emerald-500' : f.accuracy >= 60 ? 'bg-amber-400' : 'bg-rose-500'}`} style={{ width: `${f.accuracy}%` }} /></div>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="bg-white rounded-[2rem] p-6 border-2 border-rose-100">
          <h3 className="text-sm font-black text-rose-800 uppercase tracking-wider mb-3">Se le resisten</h3>
          {data.weak.length === 0 ? <p className="text-sm text-rose-400 italic">Nada por ahora. Aparece aquí lo que falla en más del 30 % de sus últimos intentos.</p> : (
            <ul className="space-y-1" data-testid="parent-weak">
              {data.weak.map((w) => <li key={w.key} className="text-sm text-rose-800 flex justify-between"><span>{w.label}{w.example && !w.label.includes(w.example) ? ` (p. ej. ${w.example})` : ''}</span><strong>{w.accuracy} %</strong></li>)}
            </ul>
          )}
          <p className="text-[11px] text-rose-400 mt-3">En el reto, el modo «Mis fallos» le repite justo estas operaciones.</p>
        </div>
      </section>

      <section className="bg-white rounded-[2rem] p-6 border border-orange-50">
        <h3 className="text-sm font-black text-orange-900 uppercase tracking-wider mb-3">Últimos retos</h3>
        {data.recent.length === 0 ? <p className="text-sm text-orange-400 italic">Todavía no ha hecho retos.</p> : (
          <ul className="divide-y divide-orange-50">
            {data.recent.map((r, i) => (
              <li key={i} className="py-2 flex justify-between text-sm">
                <span className="text-orange-900 font-bold">{MODE[r.mode] || r.mode}{r.table ? ` del ${r.table}` : ''} <span className="text-orange-300 font-medium">· {new Date(r.createdAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}</span></span>
                <span className="text-orange-700">✅ {r.correct} · ❌ {r.wrong} · +{r.points} ⭐</span>
              </li>
            ))}
          </ul>
        )}
        <p className="text-[11px] text-orange-400 mt-2">Puntos por retos hoy: {data.pointsToday} de {data.pointsCap} (máximo diario).</p>
      </section>

      <section className="bg-white rounded-[2rem] p-6 border border-orange-50 flex flex-wrap items-center gap-3">
        <label htmlFor="math-style" className="text-sm font-bold text-orange-900">Forma de responder en el reto</label>
        <select id="math-style" value={data.settings.answerStyle || 'auto'} onChange={(e) => setStyle(e.target.value)} className="bg-orange-50 border-2 border-orange-100 rounded-xl px-3 py-2 text-sm font-bold text-orange-800">
          <option value="auto">Según el curso ({auto === 'typed' ? 'escribiendo' : 'eligiendo entre 4'})</option>
          <option value="typed">Escribiendo la respuesta</option>
          <option value="choice">Eligiendo entre 4 opciones</option>
        </select>
        {msg && <span className="text-xs font-bold text-orange-500" role="status">{msg}</span>}
      </section>
    </div>
  );
};

export default MathStatsPanel;
