import React, { useEffect, useState } from 'react';
import { calligraphyService, CalligraphyRecord, Graphology } from '../services/calligraphyService';

type Rec = CalligraphyRecord & { graphology: Graphology | null };

/** Padres: historial de caligrafía con la foto, la nota, los consejos y (si está activada) la grafología. */
const CalligraphyHistory: React.FC<{ childId: string; isDemo?: boolean }> = ({ childId, isDemo }) => {
  const [data, setData] = useState<{ graphologyEnabled: boolean; notice: string; records: Rec[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const load = () => {
    if (isDemo) { setError('Con una cuenta verás aquí las fotos de su letra, la nota, los consejos y la evolución.'); return; }
    calligraphyService.parentHistory(childId).then(setData).catch((e) => setError(e.message));
  };
  useEffect(load, [childId, isDemo]); // eslint-disable-line react-hooks/exhaustive-deps

  if (error) return <p className="text-sm text-slate-600 bg-white rounded-2xl p-5">{error}</p>;
  if (!data) return <div className="h-40 bg-indigo-50 rounded-[2rem] animate-pulse" />;

  const toggle = async () => {
    try { await calligraphyService.setGraphology(childId, !data.graphologyEnabled); load(); } catch (e: any) { setError(e.message); }
  };
  const scores = [...data.records].reverse().map((r) => r.score);

  return (
    <div className="space-y-4" data-testid="calligraphy-parent">
      <div className="bg-white rounded-[2rem] p-5 border border-indigo-50 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-black text-slate-800">Análisis grafológico</p>
          <p className="text-xs text-slate-500 max-w-xl">Solo lo veis vosotros; vuestro hijo nunca lo ve. {data.notice}</p>
        </div>
        <button onClick={toggle} className={`px-4 py-2 rounded-xl text-xs font-black ${data.graphologyEnabled ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`} data-testid="toggle-graphology">
          {data.graphologyEnabled ? 'Activado · Desactivar' : 'Desactivado · Activar'}
        </button>
      </div>
      {scores.length > 1 && (
        <div className="bg-white rounded-[2rem] p-5 border border-indigo-50">
          <p className="text-xs font-black text-slate-500 mb-2">Evolución de la nota</p>
          <div className="flex items-end gap-1 h-24">{scores.map((s, i) => <div key={i} className="flex-1 bg-indigo-400 rounded-t" style={{ height: `${s * 10}%` }} title={String(s)} />)}</div>
        </div>
      )}
      {data.records.length === 0 ? <p className="text-sm text-slate-500 bg-white rounded-2xl p-5">Todavía no ha analizado ninguna foto de su letra.</p> : data.records.map((r) => (
        <details key={r.id} className="bg-white rounded-2xl p-4 border border-indigo-50">
          <summary className="cursor-pointer flex items-center gap-3">
            {r.photoUrl && <img src={r.photoUrl} alt="" className="w-14 h-14 object-cover rounded-xl" />}
            <span className="font-black text-slate-800">Nota {r.score}</span>
            <span className="text-xs text-slate-400">{new Date(r.at).toLocaleDateString('es-ES')}</span>
          </summary>
          <div className="mt-3 space-y-2 text-sm text-slate-700">
            {r.photoUrl && <img src={r.photoUrl} alt="Foto de su escritura" className="max-h-64 rounded-xl border" />}
            {r.analysis.transcription && <p><b>Texto:</b> «{r.analysis.transcription}»</p>}
            <p><b>Se lee:</b> {r.analysis.legibility}</p>
            <p><b>Trazo:</b> {r.analysis.strokeFeedback}</p>
            <p><b>Espacios:</b> {r.analysis.spacingFeedback}</p>
            {r.analysis.spellingErrors.length > 0 && <p><b>Ortografía:</b> {r.analysis.spellingErrors.map((e) => e.right ? `${e.wrong} → ${e.right}` : e.wrong).join(', ')}</p>}
            {r.graphology && (
              <div className="bg-purple-50 border border-purple-100 rounded-xl p-3 space-y-1" data-testid="graphology">
                <p className="text-xs font-black text-purple-700">🔎 Grafología (orientativa)</p>
                <ul className="list-disc pl-5 text-xs text-slate-700">{r.graphology.observations.map((o, i) => <li key={i}>{o}</li>)}</ul>
                {r.graphology.traits.length > 0 && <ul className="list-disc pl-5 text-xs text-slate-600 italic">{r.graphology.traits.map((o, i) => <li key={i}>{o}</li>)}</ul>}
                <p className="text-[10px] text-slate-500">{r.graphology.notice}</p>
              </div>
            )}
          </div>
        </details>
      ))}
    </div>
  );
};

export default CalligraphyHistory;
