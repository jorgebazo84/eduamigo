import React, { useEffect, useState } from 'react';
import { englishService, EnglishParentStats } from '../../services/englishService';
import type { EnglishLevel } from '../../shared/englishBank';

/** Padres: nivel de inglés, lecciones hechas con sus redacciones corregidas y cambio de nivel a mano. */
const EnglishHistory: React.FC<{ childId: string; isDemo?: boolean }> = ({ childId, isDemo }) => {
  const [data, setData] = useState<EnglishParentStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const load = () => {
    if (isDemo) { setError('Con una cuenta verás aquí su nivel de inglés, sus lecciones y sus redacciones corregidas.'); return; }
    englishService.parentStats(childId).then(setData).catch((e) => setError(e.message));
  };
  useEffect(load, [childId, isDemo]); // eslint-disable-line react-hooks/exhaustive-deps

  if (error) return <p className="text-sm text-slate-600 bg-white rounded-2xl p-5">{error}</p>;
  if (!data) return <div className="h-40 bg-blue-50 rounded-[2rem] animate-pulse" />;
  const avg = data.lessons.length ? Math.round(data.lessons.reduce((s, l) => s + l.mcCorrect / Math.max(1, l.mcTotal), 0) / data.lessons.length * 100) : null;

  const change = async (level: EnglishLevel) => {
    try { await englishService.setLevel(childId, level); setMsg('Nivel cambiado.'); load(); setTimeout(() => setMsg(null), 3000); }
    catch (e: any) { setMsg(e.message); }
  };

  return (
    <div className="space-y-4" data-testid="english-stats">
      <div className="bg-white rounded-[2rem] p-6 border border-blue-50 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-[10px] font-black uppercase text-slate-400">Nivel actual</p>
          <p className="text-2xl font-black text-blue-900">{data.levelLabel}</p>
          <p className="text-xs text-slate-500">{data.setBy === 'parent' ? 'Elegido por vosotros' : data.setBy === 'progress' ? 'Ha subido por sus resultados' : data.placed ? 'Según la prueba de nivel' : 'Según su curso (aún no ha hecho la prueba)'}</p>
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="eng-level" className="text-xs font-bold text-slate-500">Cambiar nivel</label>
          <select id="eng-level" value={data.level} onChange={(e) => change(e.target.value as EnglishLevel)} className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm">
            {data.levels.map((l) => <option key={l.id} value={l.id}>{l.label}</option>)}
          </select>
        </div>
        {msg && <p className="w-full text-xs font-bold text-emerald-700">{msg}</p>}
      </div>
      <div className="bg-white rounded-[2rem] p-6 border border-blue-50">
        <h4 className="font-black text-slate-800 mb-1">Lecciones ({data.lessons.length}){avg !== null ? ` · ${avg} % de aciertos de media` : ''}</h4>
        {data.lessons.length === 0 ? <p className="text-sm text-slate-500">Todavía no ha hecho ninguna lección.</p> : (
          <div className="divide-y divide-slate-100">
            {data.lessons.map((l) => (
              <details key={l.id} className="py-2">
                <summary className="cursor-pointer text-sm flex justify-between gap-3">
                  <span className="font-bold text-slate-700">{l.title} <span className="text-xs text-slate-400">({l.level})</span></span>
                  <span className="text-xs text-slate-500">{l.mcCorrect}/{l.mcTotal}{l.writing?.score !== undefined ? ` · redacción ${l.writing.score}` : ''} · {new Date(l.at).toLocaleDateString('es-ES')}</span>
                </summary>
                {l.writingText && (
                  <div className="mt-2 bg-slate-50 rounded-xl p-3 text-sm space-y-2">
                    <p className="italic text-slate-700">«{l.writingText}»</p>
                    {l.writing?.feedback && <p className="text-slate-600">{l.writing.feedback}</p>}
                    {(l.writing?.corrections || []).map((c, i) => <p key={i} className="text-xs"><span className="line-through text-red-600">{c.original}</span> → <b className="text-emerald-700">{c.correction}</b> · {c.explanation}</p>)}
                  </div>
                )}
              </details>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default EnglishHistory;
