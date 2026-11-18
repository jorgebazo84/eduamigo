import React, { useState } from 'react';
import { parentService } from '../services/parentService';

interface Props {
  childId: string;
  kind: 'worksheet' | 'homework' | 'review' | 'reading' | 'math' | 'calligraphy' | 'english' | 'library' | 'other';
  refId?: string;
  isDemo?: boolean;
  className?: string;
}

/** «Esto está mal»: avisa al equipo de que la IA se ha equivocado en una corrección. */
export const ReportErrorButton: React.FC<Props> = ({ childId, kind, refId, isDemo, className }) => {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [msg, setMsg] = useState('');

  const send = async () => {
    if (isDemo) { setState('sent'); setMsg('En la demo no se envía, pero con una cuenta lo revisaríamos.'); return; }
    setState('sending');
    try {
      await parentService.reportError({ childId, kind, refId, reason: reason.trim() });
      setState('sent'); setMsg('¡Gracias! Lo revisaremos para que no vuelva a pasar.');
    } catch (e: any) { setState('error'); setMsg(e.message); }
  };

  if (state === 'sent') return <p className={`text-xs font-bold text-emerald-700 ${className || ''}`} role="status" data-testid="report-sent">✓ {msg}</p>;

  return (
    <div className={className} data-testid="report-error">
      {!open ? (
        <button type="button" onClick={() => setOpen(true)} className="text-xs font-bold text-slate-400 hover:text-rose-600">🚩 Esto está mal</button>
      ) : (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 space-y-2">
          <p className="text-xs font-black text-rose-800">¿Qué está mal en la corrección?</p>
          <input value={reason} maxLength={500} onChange={(e) => setReason(e.target.value)} placeholder="Ej.: «El ejercicio 3 estaba bien y lo ha marcado mal»"
            className="w-full bg-white rounded-lg px-3 py-2 text-xs border border-rose-200 outline-none" data-testid="report-reason" />
          {state === 'error' && <p className="text-xs text-red-700 font-bold">{msg}</p>}
          <div className="flex gap-2">
            <button type="button" onClick={send} disabled={state === 'sending'} className="bg-rose-600 text-white rounded-lg px-3 py-1.5 text-xs font-black" data-testid="report-send">{state === 'sending' ? 'Enviando…' : 'Enviar aviso'}</button>
            <button type="button" onClick={() => setOpen(false)} className="bg-white text-slate-600 rounded-lg px-3 py-1.5 text-xs font-black border border-slate-200">Cancelar</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportErrorButton;
