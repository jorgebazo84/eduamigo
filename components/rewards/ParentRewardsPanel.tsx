import React, { useCallback, useEffect, useState } from 'react';
import { rewardsService, ParentRewardsOverview, STATUS_LABEL } from '../../services/rewardsService';

interface Props {
  childId: string;
  childName: string;
  isDemo: boolean;
  /** Para refrescar el saldo del niño en la app tras decidir o ajustar */
  onPointsChanged?: (childId: string, newPoints: number) => void;
}

const fmt = (t: number) => new Date(t).toLocaleString('es-ES', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

/** Padres: peticiones de premios, de dónde salen los puntos, racha, medallas y ajustes con motivo. */
export const ParentRewardsPanel: React.FC<Props> = ({ childId, childName, isDemo, onPointsChanged }) => {
  const [data, setData] = useState<ParentRewardsOverview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [adjust, setAdjust] = useState({ amount: '', reason: '', sign: 1 });
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (isDemo) return;
    try { setData(await rewardsService.parentOverview(childId)); setError(null); }
    catch (e: any) { setError(e.message); }
  }, [childId, isDemo]);
  useEffect(() => { setData(null); load(); }, [load]);

  if (isDemo) {
    return (
      <div className="bg-white rounded-[2rem] p-6 border border-blue-50 text-sm text-slate-600 space-y-2" data-testid="parent-rewards-demo">
        <p className="font-black text-blue-900">Puntos y premios</p>
        <p>Con una cuenta, aquí verías las peticiones de premios de tus hijos para aceptarlas o rechazarlas, de dónde salen sus puntos, su racha y sus medallas, y podrías darles o quitarles puntos explicando el motivo.</p>
      </div>
    );
  }
  if (error) return <p className="text-red-600 font-bold">{error}</p>;
  if (!data) return <div className="h-48 rounded-[2rem] bg-blue-50 animate-pulse" />;

  const pending = data.requests.filter((r) => r.status === 'pending');
  const decided = data.requests.filter((r) => r.status !== 'pending').slice(0, 10);

  const decide = async (id: string, approve: boolean) => {
    setBusy(id);
    try {
      const r = await rewardsService.decideRequest(id, approve, notes[id]);
      onPointsChanged?.(childId, r.newPoints);
      await load();
    } catch (e: any) { setMsg(e.message); }
    finally { setBusy(null); }
  };

  const doAdjust = async () => {
    const n = Math.round(Number(adjust.amount));
    if (!n || n < 1) { setMsg('Indica cuántos puntos.'); return; }
    if (adjust.reason.trim().length < 3) { setMsg('Escribe el motivo: tu hijo lo verá en su historial.'); return; }
    setBusy('adjust');
    try {
      const r = await rewardsService.adjustPoints(childId, n * adjust.sign, adjust.reason.trim());
      onPointsChanged?.(childId, r.newPoints);
      setAdjust({ amount: '', reason: '', sign: 1 });
      setMsg(adjust.sign > 0 ? `Has dado ${n} puntos a ${childName}.` : `Has quitado ${n} puntos a ${childName}.`);
      await load();
    } catch (e: any) { setMsg(e.message); }
    finally { setBusy(null); setTimeout(() => setMsg(null), 4000); }
  };

  const earnedTotal = data.earnedWeek.reduce((a, b) => a + b.points, 0);

  return (
    <div className="space-y-6 animate-in fade-in" data-testid="parent-rewards">
      {msg && <div className="bg-slate-900 text-white rounded-2xl px-4 py-3 text-sm font-bold" role="status">{msg}</div>}

      {/* Peticiones */}
      <div className={`rounded-[2rem] p-6 border-2 ${pending.length ? 'bg-amber-50 border-amber-300' : 'bg-white border-blue-50'}`}>
        <h3 className="font-black text-lg text-slate-800 mb-3">🙋 Premios pedidos {pending.length ? `(${pending.length})` : ''}</h3>
        {pending.length === 0 ? <p className="text-sm text-slate-500">{childName} no tiene premios esperando respuesta.</p> : (
          <div className="space-y-3">
            {pending.map((r) => (
              <div key={r.id} className="bg-white rounded-2xl p-4 space-y-3" data-testid="parent-pending">
                <div className="flex justify-between items-center gap-3">
                  <p className="font-black text-slate-800">{r.icon} {r.title}</p>
                  <span className="text-xs font-bold text-slate-500">{r.cost} pts · {fmt(r.createdAt)}</span>
                </div>
                <input value={notes[r.id] || ''} onChange={(e) => setNotes({ ...notes, [r.id]: e.target.value })} maxLength={300}
                  placeholder="Mensaje para tu hijo (opcional): «El sábado por la tarde»"
                  className="w-full bg-slate-50 rounded-xl px-3 py-2 text-sm outline-none border border-slate-200" />
                <div className="flex gap-2">
                  <button onClick={() => decide(r.id, true)} disabled={busy === r.id} className="flex-1 py-2 rounded-xl bg-green-500 text-white font-black text-sm" data-testid="approve">✅ Aceptar</button>
                  <button onClick={() => decide(r.id, false)} disabled={busy === r.id} className="flex-1 py-2 rounded-xl bg-slate-200 text-slate-700 font-black text-sm" data-testid="reject">No, devolver los puntos</button>
                </div>
              </div>
            ))}
          </div>
        )}
        {decided.length > 0 && (
          <details className="mt-4">
            <summary className="text-xs font-black text-slate-500 cursor-pointer">Premios anteriores</summary>
            <div className="mt-2 space-y-1">
              {decided.map((r) => (
                <p key={r.id} className="text-sm text-slate-600">{r.icon} {r.title} · {r.cost} pts · <b>{STATUS_LABEL[r.status]}</b>{r.decidedAt ? ` · ${fmt(r.decidedAt)}` : ''}</p>
              ))}
            </div>
          </details>
        )}
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white rounded-2xl p-4 border border-blue-50"><p className="text-[10px] font-black uppercase text-slate-400">Puntos</p><p className="text-2xl font-black text-blue-700" data-testid="parent-points">{data.points}</p></div>
        <div className="bg-white rounded-2xl p-4 border border-blue-50"><p className="text-[10px] font-black uppercase text-slate-400">Racha</p><p className="text-2xl font-black text-orange-600">{data.streak.current} 🔥</p><p className="text-[10px] text-slate-400">Mejor: {data.streak.best}</p></div>
        <div className="bg-white rounded-2xl p-4 border border-blue-50"><p className="text-[10px] font-black uppercase text-slate-400">Medallas</p><p className="text-2xl font-black text-amber-600">{data.badges.filter((b) => b.earned).length}/{data.badges.length}</p></div>
        <div className="bg-white rounded-2xl p-4 border border-blue-50"><p className="text-[10px] font-black uppercase text-slate-400">Cromos</p><p className="text-2xl font-black text-indigo-600">{data.stickersOwned}/{data.stickersTotal}</p></div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-white rounded-[2rem] p-5 border border-blue-50">
          <h4 className="font-black text-slate-800 mb-3">Últimos 7 días</h4>
          {data.earnedWeek.length === 0 ? <p className="text-sm text-slate-500">Esta semana aún no ha ganado puntos.</p> : (
            <div className="space-y-2">
              {data.earnedWeek.map((r) => (
                <div key={r.source}>
                  <div className="flex justify-between text-xs font-bold text-slate-600"><span>{r.label}</span><span>+{r.points}</span></div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-blue-500" style={{ width: `${Math.round((r.points / Math.max(1, earnedTotal)) * 100)}%` }} /></div>
                </div>
              ))}
            </div>
          )}
          <p className="text-xs text-slate-500 mt-3">Gastado en cromos y premios: <b>{data.spentWeek}</b> puntos.</p>
        </div>

        <div className="bg-white rounded-[2rem] p-5 border border-blue-50 space-y-3">
          <h4 className="font-black text-slate-800">Dar o quitar puntos</h4>
          <div className="flex gap-2">
            <button onClick={() => setAdjust({ ...adjust, sign: 1 })} className={`flex-1 py-2 rounded-xl text-sm font-black ${adjust.sign > 0 ? 'bg-green-500 text-white' : 'bg-slate-100 text-slate-500'}`}>+ Dar</button>
            <button onClick={() => setAdjust({ ...adjust, sign: -1 })} className={`flex-1 py-2 rounded-xl text-sm font-black ${adjust.sign < 0 ? 'bg-red-500 text-white' : 'bg-slate-100 text-slate-500'}`}>− Quitar</button>
          </div>
          <input type="number" min={1} max={1000} value={adjust.amount} onChange={(e) => setAdjust({ ...adjust, amount: e.target.value })} placeholder="Puntos"
            className="w-full bg-slate-50 rounded-xl px-3 py-2 text-sm outline-none border border-slate-200" data-testid="adjust-amount" />
          <input value={adjust.reason} maxLength={150} onChange={(e) => setAdjust({ ...adjust, reason: e.target.value })} placeholder="Motivo (lo verá tu hijo): «Ha ayudado en casa»"
            className="w-full bg-slate-50 rounded-xl px-3 py-2 text-sm outline-none border border-slate-200" data-testid="adjust-reason" />
          <button onClick={doAdjust} disabled={busy === 'adjust'} className="w-full py-2 rounded-xl bg-blue-600 text-white font-black text-sm" data-testid="adjust-save">Guardar</button>
        </div>
      </div>

      {/* Historial */}
      <div className="bg-white rounded-[2rem] p-5 border border-blue-50">
        <h4 className="font-black text-slate-800 mb-3">Historial de puntos</h4>
        {data.ledger.length === 0 ? <p className="text-sm text-slate-500">Todavía no hay movimientos.</p> : (
          <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto" data-testid="ledger">
            {data.ledger.map((r) => (
              <div key={r.id} className="py-2 flex items-center justify-between gap-3 text-sm">
                <div className="min-w-0">
                  <p className="font-bold text-slate-700 truncate">{r.label}</p>
                  <p className="text-[10px] text-slate-400">{r.sourceLabel} · {fmt(r.at)}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className={`font-black ${r.delta >= 0 ? 'text-green-600' : 'text-red-500'}`}>{r.delta >= 0 ? `+${r.delta}` : r.delta}</p>
                  <p className="text-[10px] text-slate-400">saldo {r.balance}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ParentRewardsPanel;
