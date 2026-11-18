import React, { useRef, useState } from 'react';
import { Child, CalendarEvent, EventType } from '../../types';
import { compressPhoto, fileToDataUrl } from '../../services/imageUtils';

interface Found { title: string; date: string; type: EventType; description: string; keep: boolean }

/** Padres: foto de una circular del cole o de la fecha de un examen → eventos para confirmar y guardar en la agenda. */
const CircularScanner: React.FC<{ children: Child[]; isDemo?: boolean; onAddEvent: (e: Omit<CalendarEvent, 'id'>) => void }> = ({ children, isDemo, onAddEvent }) => {
  const fileRef = useRef<HTMLInputElement>(null);
  const [childId, setChildId] = useState(children[0]?.id || '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [found, setFound] = useState<Found[] | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const onFile = async (f?: File | null) => {
    if (!f) return;
    setError(null); setFound(null); setMsg(null);
    if (isDemo) { setError('En la demo no se leen fotos. Con una cuenta, sacamos las fechas de la circular para que las confirméis.'); return; }
    setBusy(true);
    try {
      const { image } = await compressPhoto(await fileToDataUrl(f));
      const r = await fetch('api_parent.php?action=scan_circular', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify({ image }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || 'No se ha podido leer la foto.');
      setFound(d.events.map((e: any) => ({ ...e, keep: true })));
    } catch (e: any) { setError(e.message); }
    finally { setBusy(false); }
  };

  const save = () => {
    if (!found || !childId) return;
    const list = found.filter((e) => e.keep && e.title && e.date);
    list.forEach((e) => onAddEvent({ childId, title: e.title, date: e.date, type: e.type, description: e.description, notified: false }));
    setMsg(`${list.length} ${list.length === 1 ? 'evento guardado' : 'eventos guardados'} en la agenda.`);
    setFound(null);
  };

  return (
    <div className="bg-white rounded-[2rem] p-5 border border-blue-50 space-y-3" data-testid="circular-scanner">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-black text-blue-900">📸 Foto de una circular o de la fecha de un examen</p>
          <p className="text-xs text-slate-500">Sacamos las fechas y las revisáis antes de guardarlas.</p>
        </div>
        <div className="flex gap-2">
          {children.length > 1 && (
            <select value={childId} onChange={(e) => setChildId(e.target.value)} className="bg-slate-50 rounded-xl px-3 py-2 text-sm border border-slate-200">
              {children.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          )}
          <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = ''; }} data-testid="circular-file" />
          <button onClick={() => fileRef.current?.click()} disabled={busy} className="bg-blue-600 text-white rounded-xl px-4 py-2 text-sm font-black">{busy ? 'Leyendo…' : 'Hacer foto'}</button>
        </div>
      </div>
      {error && <p className="text-sm font-bold text-red-700" role="alert">{error}</p>}
      {msg && <p className="text-sm font-bold text-emerald-700" role="status">{msg}</p>}
      {found && (
        <div className="space-y-2" data-testid="circular-found">
          {found.map((e, i) => (
            <div key={i} className="grid sm:grid-cols-12 gap-2 items-center bg-slate-50 rounded-xl p-2">
              <input type="checkbox" checked={e.keep} onChange={(x) => setFound(found.map((f, j) => j === i ? { ...f, keep: x.target.checked } : f))} className="sm:col-span-1 justify-self-center" aria-label="Guardar este evento" />
              <input value={e.title} onChange={(x) => setFound(found.map((f, j) => j === i ? { ...f, title: x.target.value } : f))} className="sm:col-span-5 bg-white rounded-lg px-2 py-1.5 text-sm border border-slate-200" />
              <input type="date" value={e.date} onChange={(x) => setFound(found.map((f, j) => j === i ? { ...f, date: x.target.value } : f))} className="sm:col-span-3 bg-white rounded-lg px-2 py-1.5 text-sm border border-slate-200" />
              <select value={e.type} onChange={(x) => setFound(found.map((f, j) => j === i ? { ...f, type: x.target.value as EventType } : f))} className="sm:col-span-3 bg-white rounded-lg px-2 py-1.5 text-sm border border-slate-200">
                <option value="exam">Examen</option><option value="excursion">Excursión</option><option value="meeting">Reunión</option><option value="other">Otro</option>
              </select>
              {e.description && <p className="sm:col-span-12 text-xs text-slate-500 pl-8">{e.description}</p>}
            </div>
          ))}
          <button onClick={save} className="w-full bg-emerald-500 text-white rounded-xl py-2 text-sm font-black" data-testid="circular-save">Guardar en la agenda</button>
        </div>
      )}
    </div>
  );
};

export default CircularScanner;
