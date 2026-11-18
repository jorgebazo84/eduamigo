import React, { useEffect, useState } from 'react';
import { parentService, ChildWeek } from '../../services/parentService';
import type { Child } from '../../types';

interface Props {
  children: Child[];
  isDemo: boolean;
  /** Ir a otra pestaña (premios, progreso del tutor…) con el hijo elegido */
  onGoTo: (tab: 'rewards' | 'progress' | 'family' | 'worksheets', childId: string, area?: string) => void;
  onOpenReport: (childId: string) => void;
}

const DAY = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
const fmtDate = (d: string) => new Date(d + 'T12:00:00').toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' });
const daysTo = (d: string) => Math.round((new Date(d + 'T12:00:00').getTime() - new Date(new Date().toISOString().slice(0, 10) + 'T12:00:00').getTime()) / 86400000);

const demoWeek = (c: Child): ChildWeek => ({
  id: c.id, name: c.name, avatar: c.avatar, grade: c.grade, points: c.points,
  streak: { current: 3, best: 5, activeToday: true, last14: Array.from({ length: 14 }, (_, i) => ({ day: new Date(Date.now() - (13 - i) * 86400000).toISOString().slice(0, 10), active: i >= 11 || i === 7 || i === 8 })) },
  activeDays: 4,
  week: { readings: 3, readingWpm: 98, readingPct: 75, mathChallenges: 4, mathPct: 86, tests: 2, testPct: 70, sheets: 1, tutorQuestions: 5, points: 410 },
  weak: [{ area: 'Mates', text: 'Le cuestan: 7 × 8, 6 × 7' }, { area: 'Lectura', text: 'Preguntas de «Lo que se deduce»: acierta el 50 %' }],
  exams: [{ title: 'Examen de Ciencias: las plantas', date: new Date(Date.now() + 4 * 86400000).toISOString().slice(0, 10) }],
  reviewsDue: 2,
  nextReviews: [{ topic: 'Las fracciones', subject: 'Matemáticas', due: new Date().toISOString().slice(0, 10) }],
  alerts: { rewards: 1, tutor: 0 },
  recent: [{ label: 'Lectura: El viaje de una gota de agua', points: 30, at: Date.now() - 3600000 }, { label: 'Reto de Mates: 18 aciertos', points: 64, at: Date.now() - 7200000 }],
});

const Stat: React.FC<{ icon: string; label: string; value: string | number; sub?: string | null }> = ({ icon, label, value, sub }) => (
  <div className="bg-slate-50 rounded-2xl p-3">
    <p className="text-[10px] font-black uppercase text-slate-400">{icon} {label}</p>
    <p className="text-xl font-black text-slate-800">{value}</p>
    {sub && <p className="text-[10px] font-bold text-slate-500">{sub}</p>}
  </div>
);

/** Portada del panel de padres: la semana de cada hijo en una tarjeta. */
export const ParentOverview: React.FC<Props> = ({ children, isDemo, onGoTo, onOpenReport }) => {
  const [data, setData] = useState<ChildWeek[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isDemo) { setData(children.map(demoWeek)); return; }
    parentService.overview().then((r) => setData(r.children)).catch((e) => setError(e.message));
  }, [isDemo, children.length]); // eslint-disable-line react-hooks/exhaustive-deps

  if (error) return <p className="text-red-600 font-bold">{error}</p>;
  if (!data) return <div className="space-y-4"><div className="h-64 rounded-[2rem] bg-blue-50 animate-pulse" /></div>;
  if (!data.length) {
    return (
      <div className="bg-white rounded-[2rem] p-10 text-center border-2 border-dashed border-blue-100">
        <p className="text-4xl mb-3">👨‍👩‍👧</p>
        <p className="font-black text-blue-900">Todavía no hay hijos</p>
        <button onClick={() => onGoTo('family', '')} className="mt-4 bg-blue-600 text-white px-5 py-2 rounded-xl font-black text-sm">Añadir un hijo</button>
      </div>
    );
  }

  const alerts = data.flatMap((c) => [
    ...(c.alerts.rewards ? [{ key: `r-${c.id}`, text: `${c.name} ha pedido ${c.alerts.rewards === 1 ? 'un premio' : `${c.alerts.rewards} premios`}`, action: () => onGoTo('rewards', c.id), btn: 'Responder', tone: 'amber' }] : []),
    ...(c.alerts.tutor ? [{ key: `t-${c.id}`, text: `Hay ${c.alerts.tutor === 1 ? 'una conversación' : `${c.alerts.tutor} conversaciones`} de ${c.name} con el tutor que conviene mirar`, action: () => onGoTo('progress', c.id, 'tutor'), btn: 'Ver', tone: 'rose' }] : []),
  ]);

  return (
    <div className="space-y-6 animate-in fade-in" data-testid="parent-overview">
      {alerts.length > 0 && (
        <div className="space-y-2" data-testid="parent-alerts">
          {alerts.map((a) => (
            <div key={a.key} className={`flex items-center justify-between gap-3 rounded-2xl px-5 py-3 border-2 ${a.tone === 'amber' ? 'bg-amber-50 border-amber-200' : 'bg-rose-50 border-rose-200'}`}>
              <p className="text-sm font-bold text-slate-800">🔔 {a.text}</p>
              <button onClick={a.action} className="shrink-0 bg-white px-4 py-1.5 rounded-xl text-xs font-black border border-slate-200 hover:bg-slate-50">{a.btn}</button>
            </div>
          ))}
        </div>
      )}

      {data.map((c) => (
        <div key={c.id} className="bg-white rounded-[2rem] p-6 border border-blue-50 shadow-sm space-y-5" data-testid="child-week">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="text-4xl">{c.avatar}</span>
              <div>
                <h3 className="text-xl font-black text-blue-900">{c.name}</h3>
                <p className="text-xs font-bold text-slate-400">{c.grade} · ⭐ {c.points} puntos</p>
              </div>
            </div>
            <button onClick={() => onOpenReport(c.id)} className="bg-indigo-50 text-indigo-700 px-4 py-2 rounded-xl text-xs font-black hover:bg-indigo-100" data-testid="open-report">📄 Informe PDF</button>
          </div>

          {/* Días de estudio */}
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex gap-1">
              {c.streak.last14.slice(-7).map((d) => (
                <div key={d.day} className="flex flex-col items-center gap-0.5">
                  <div className={`w-7 h-7 rounded-lg ${d.active ? 'bg-emerald-400' : 'bg-slate-100'}`} title={d.day} />
                  <span className="text-[9px] font-black text-slate-400">{DAY[(new Date(d.day + 'T12:00:00Z').getUTCDay() + 6) % 7]}</span>
                </div>
              ))}
            </div>
            <p className="text-sm text-slate-600" data-testid="active-days">
              <b>{c.activeDays} de 7 días</b> estudiando esta semana · racha de <b>{c.streak.current}</b> 🔥{c.streak.activeToday ? ' · hoy ya ha estudiado' : ' · hoy aún no'}
            </p>
          </div>

          {/* Qué ha hecho */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-2" data-testid="week-stats">
            <Stat icon="📖" label="Lecturas" value={c.week.readings} sub={c.week.readingWpm ? `${c.week.readingWpm} pal/min · ${c.week.readingPct ?? '—'} % comprensión` : null} />
            <Stat icon="🔢" label="Retos Mates" value={c.week.mathChallenges} sub={c.week.mathPct !== null ? `${c.week.mathPct} % aciertos` : null} />
            <Stat icon="🧠" label="Tests" value={c.week.tests} sub={c.week.testPct !== null ? `${c.week.testPct} % aciertos` : null} />
            <Stat icon="📑" label="Fichas" value={c.week.sheets} sub="corregidas" />
            <Stat icon="💬" label="Al tutor" value={c.week.tutorQuestions} sub="preguntas" />
            <Stat icon="⭐" label="Puntos" value={c.week.points} sub="ganados" />
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {/* Dónde falla */}
            <div className="rounded-2xl border-2 border-orange-100 bg-orange-50/50 p-4" data-testid="weak-spots">
              <h4 className="font-black text-orange-800 text-sm mb-2">🎯 Dónde le cuesta</h4>
              {c.weak.length === 0 ? <p className="text-sm text-slate-500">Aún no hay datos suficientes. Cuantas más actividades haga, más preciso será.</p> : (
                <ul className="space-y-1.5">
                  {c.weak.map((w, i) => <li key={i} className="text-sm text-slate-700"><b className="text-orange-700">{w.area}:</b> {w.text}</li>)}
                </ul>
              )}
              <button onClick={() => onGoTo('progress', c.id)} className="mt-3 text-xs font-black text-orange-700 hover:underline">Ver su progreso →</button>
            </div>

            {/* Lo que viene */}
            <div className="rounded-2xl border-2 border-blue-100 bg-blue-50/40 p-4" data-testid="coming-up">
              <h4 className="font-black text-blue-800 text-sm mb-2">🗓️ Lo que viene</h4>
              {c.exams.length === 0 && c.nextReviews.length === 0 ? <p className="text-sm text-slate-500">No hay exámenes apuntados. Apuntadlos en Familia → Agenda y Repasar preparará el tema antes.</p> : (
                <ul className="space-y-1.5 text-sm text-slate-700">
                  {c.exams.map((e, i) => <li key={`e${i}`}>📝 <b>{e.title}</b> — {fmtDate(e.date)}{daysTo(e.date) <= 3 ? <span className="text-red-600 font-black"> ({daysTo(e.date) === 0 ? 'hoy' : `en ${daysTo(e.date)} días`})</span> : null}</li>)}
                  {c.reviewsDue > 0 && <li>🧠 <b>{c.reviewsDue}</b> {c.reviewsDue === 1 ? 'repaso pendiente hoy' : 'repasos pendientes hoy'}</li>}
                  {c.nextReviews.filter((r) => daysTo(r.due) > 0).slice(0, 3).map((r, i) => <li key={`r${i}`}>🔁 Repasar {r.topic} — {fmtDate(r.due)}</li>)}
                </ul>
              )}
              <button onClick={() => onGoTo('family', c.id, 'agenda')} className="mt-3 text-xs font-black text-blue-700 hover:underline">Apuntar un examen →</button>
            </div>
          </div>

          {c.recent.length > 0 && (
            <details className="text-sm">
              <summary className="cursor-pointer font-black text-slate-500 text-xs">Lo último que ha hecho</summary>
              <ul className="mt-2 space-y-1">
                {c.recent.map((r, i) => <li key={i} className="flex justify-between text-slate-600"><span>{r.label}</span><span className="text-xs text-slate-400">{new Date(r.at).toLocaleString('es-ES', { weekday: 'short', hour: '2-digit', minute: '2-digit' })}</span></li>)}
              </ul>
            </details>
          )}
        </div>
      ))}
    </div>
  );
};

export default ParentOverview;
