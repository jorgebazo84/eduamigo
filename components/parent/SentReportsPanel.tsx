import React, { useEffect, useState } from 'react';
import { parentService, SentReport, KIND_LABEL } from '../../services/parentService';

/** Avisos «Esto está mal» que ha enviado la familia y si ya los ha revisado el equipo. */
export const SentReportsPanel: React.FC<{ isDemo: boolean }> = ({ isDemo }) => {
  const [list, setList] = useState<SentReport[] | null>(null);
  useEffect(() => {
    if (isDemo) { setList([]); return; }
    parentService.myReports().then((r) => setList(r.reports)).catch(() => setList([]));
  }, [isDemo]);
  if (!list) return null;
  return (
    <div className="bg-white rounded-[2rem] p-6 border border-blue-50" data-testid="sent-reports">
      <h3 className="font-black text-lg text-blue-900">🚩 Avisos de errores enviados</h3>
      <p className="text-xs text-slate-500 mb-3">Cuando la IA se equivoca, pulsad «Esto está mal» en la respuesta del tutor o en la corrección. El equipo de EduAmigo los revisa para mejorarla.</p>
      {list.length === 0 ? <p className="text-sm text-slate-500">No habéis enviado ningún aviso.</p> : (
        <div className="divide-y divide-slate-100">
          {list.map((r) => (
            <div key={r.id} className="py-2 flex justify-between gap-3 text-sm">
              <span className="text-slate-700"><b>{KIND_LABEL[r.kind] || r.kind}</b> · {r.child}{r.reason ? ` — «${r.reason}»` : ''}</span>
              <span className={`shrink-0 text-[10px] font-black uppercase px-2 py-1 rounded-full ${r.status === 'reviewed' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{r.status === 'reviewed' ? 'Revisado' : 'Pendiente'}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SentReportsPanel;
