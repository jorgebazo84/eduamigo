import React, { useEffect, useState } from 'react';
import { gamesService, GamesParentView } from '../../services/gamesService';
import { AREA_LABEL, GameArea } from '../../shared/gamesCatalog';

/** Padres: tiempo de juego, si hace falta estudiar antes, qué juegos están activos y cómo le va en cada uno. */
const GamesParentPanel: React.FC<{ childId: string; childName: string; isDemo: boolean }> = ({ childId, childName, isDemo }) => {
  const [view, setView] = useState<GamesParentView | null>(null);
  const [form, setForm] = useState<{ enabled: boolean; minutes: number; requireStudy: boolean; disabled: string[] } | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isDemo) {
      const v: GamesParentView = { settings: { enabled: true, minutes: 30, requireStudy: true, disabled: [] }, games: [], stats: [{ id: 'seguro', title: '¿Seguro o trampa?', emoji: '🛡️', practice: false, rounds: 3, percent: 83, last: Date.now() }], minutesToday: 12, minutesWeek: 75, pointsToday: 18, pointsCap: 40 };
      setView(v); setForm(v.settings); return;
    }
    gamesService.parentGet(childId).then((v) => { setView(v); setForm(v.settings); }).catch((e) => setError(e.message));
  }, [childId, isDemo]);

  const save = async () => {
    if (!form) return;
    setMsg(null); setError(null);
    if (isDemo) { setMsg('En la demo no se guardan los cambios.'); return; }
    try { const r = await gamesService.parentSet(childId, form); setForm(r.settings); setMsg('Guardado ✓'); } catch (e: any) { setError(e.message); }
  };

  if (error && !view) return <p className="bg-rose-50 border border-rose-200 rounded-2xl px-4 py-3 text-sm font-bold text-rose-700">{error}</p>;
  if (!view || !form) return <div className="h-40 bg-violet-50 rounded-[2rem] animate-pulse" />;
  const toggle = (id: string) => setForm({ ...form, disabled: form.disabled.includes(id) ? form.disabled.filter((x) => x !== id) : [...form.disabled, id] });
  const areas = [...new Set(view.games.map((g) => g.area))] as GameArea[];
  return (
    <div className="space-y-5" data-testid="games-parent">
      <div className="grid sm:grid-cols-3 gap-3">
        <div className="bg-white rounded-2xl p-4 border border-violet-100"><p className="text-xs font-black text-violet-500 uppercase">Hoy</p><p className="text-xl font-black" data-testid="gp-today">{Math.round(view.minutesToday)} min</p></div>
        <div className="bg-white rounded-2xl p-4 border border-violet-100"><p className="text-xs font-black text-violet-500 uppercase">Últimos 7 días</p><p className="text-xl font-black">{view.minutesWeek} min</p></div>
        <div className="bg-white rounded-2xl p-4 border border-violet-100"><p className="text-xs font-black text-violet-500 uppercase">Puntos de juegos hoy</p><p className="text-xl font-black">{view.pointsToday} / {view.pointsCap}</p></div>
      </div>

      <div className="bg-white rounded-[2rem] p-5 border border-violet-100 space-y-4">
        <h4 className="font-black text-violet-900">Ajustes de juegos de {childName}</h4>
        <label className="flex items-center gap-3 font-bold text-sm"><input type="checkbox" data-testid="gp-enabled" checked={form.enabled} onChange={(e) => setForm({ ...form, enabled: e.target.checked })} className="w-5 h-5" /> Juegos activados</label>
        <label className="flex items-center gap-3 font-bold text-sm"><input type="checkbox" data-testid="gp-study" checked={form.requireStudy} onChange={(e) => setForm({ ...form, requireStudy: e.target.checked })} className="w-5 h-5" /> Solo después de estudiar algo ese día</label>
        <label className="flex items-center gap-3 font-bold text-sm">Minutos al día:
          <input type="number" data-testid="gp-minutes" min={0} max={180} value={form.minutes} onChange={(e) => setForm({ ...form, minutes: Number(e.target.value) })} className="w-24 bg-violet-50 rounded-xl px-3 py-2 font-black" />
        </label>
        {areas.map((a) => (
          <div key={a}>
            <p className="text-xs font-black text-slate-500 mb-1">{AREA_LABEL[a]}</p>
            <div className="flex flex-wrap gap-2">
              {view.games.filter((g) => g.area === a).map((g) => {
                const on = !form.disabled.includes(g.id);
                return <button key={g.id} type="button" data-testid={`gp-game-${g.id}`} onClick={() => toggle(g.id)} className={`rounded-xl px-3 py-2 text-xs font-black border ${on ? 'bg-violet-600 text-white border-violet-600' : 'bg-white text-slate-400 border-slate-200 line-through'}`}>{g.emoji} {g.title}</button>;
              })}
            </div>
          </div>
        ))}
        <p className="text-xs text-slate-500">Cada partida da hasta 10 puntos según los aciertos, con un máximo de {view.pointsCap} al día. Los juegos no cuentan para la racha. Las prácticas de FP sí cuentan como estudio y no gastan tiempo de juego.</p>
        <div className="flex items-center gap-3">
          <button onClick={save} data-testid="gp-save" className="bg-violet-600 text-white rounded-xl px-5 py-2 font-black">Guardar</button>
          {msg && <span className="text-sm font-bold text-emerald-700">{msg}</span>}
          {error && <span className="text-sm font-bold text-rose-700">{error}</span>}
        </div>
      </div>

      <div className="bg-white rounded-[2rem] p-5 border border-violet-100">
        <h4 className="font-black text-violet-900 mb-3">Cómo le va (últimos 30 días)</h4>
        {view.stats.length === 0 ? <p className="text-sm text-slate-500">Todavía no ha jugado.</p> : (
          <table className="w-full text-sm" data-testid="gp-stats">
            <thead><tr className="text-left text-xs text-slate-500"><th className="py-1">Juego</th><th>Partidas</th><th>Aciertos</th><th>Última vez</th></tr></thead>
            <tbody>{view.stats.map((s) => (
              <tr key={s.id} className="border-t border-slate-100"><td className="py-2 font-bold">{s.emoji} {s.title}{s.practice && <span className="ml-1 text-[10px] font-black text-emerald-700">PRÁCTICA FP</span>}</td><td>{s.rounds}</td><td className={s.percent < 50 ? 'text-rose-600 font-black' : 'font-black'}>{s.percent} %</td><td className="text-slate-500">{new Date(s.last).toLocaleDateString('es-ES')}</td></tr>
            ))}</tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default GamesParentPanel;
