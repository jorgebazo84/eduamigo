import React, { useEffect, useState } from 'react';
import { Child } from '../types';
import { subjectsForGrade, ALWAYS } from '../shared/schoolSubjects';

interface DayView {
  day: string;
  exams: { id: string; title: string; description: string; byChild: boolean }[];
  events: { id: string; title: string; type: string }[];
  reviews: { id: string; subject: string; topic: string }[];
  tasks: { id: string; title: string }[];
  plan: string[];
}
interface WeekData { days: DayView[]; worksheets: { id: string; title: string; subject: string }[]; study: { id: string; topic: string; book: string; subject: string }[] }

const call = async (action: string, body: any) => {
  const r = await fetch(`api_week.php?action=${action}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify(body) }).catch(() => { throw new Error('Sin conexión.'); });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.error || 'Algo ha fallado.');
  return d;
};

const iso = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
const demoWeek = (): WeekData => {
  const t = new Date();
  const days: DayView[] = Array.from({ length: 14 }, (_, i) => ({ day: iso(new Date(t.getTime() + i * 86400000)), exams: [], events: [], reviews: [], tasks: [], plan: [] }));
  days[4].exams.push({ id: 'd1', title: 'Examen de Ciencias: las plantas', description: '', byChild: false });
  days[1].plan.push('Prepara «Examen de Ciencias: las plantas»: repasa el tema con el esquema');
  days[2].plan.push('Prepara «Examen de Ciencias: las plantas»: repasa el tema y haz un test');
  days[3].plan.push('Último repaso para «Examen de Ciencias: las plantas»: haz un test del tema');
  days[0].reviews.push({ id: 'r1', subject: 'Matemáticas', topic: 'Las fracciones' });
  return { days, worksheets: [{ id: 'w', title: 'Sumas con llevadas', subject: 'Matemáticas' }], study: [] };
};

const label = (day: string, i: number) => i === 0 ? 'Hoy' : i === 1 ? 'Mañana' : new Date(day + 'T12:00:00').toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'short' });

/** Mi semana: exámenes, repasos, tareas y fichas pendientes de los próximos 14 días. Sin IA. */
const MyWeek: React.FC<{ child: Child; isDemo?: boolean; onOpen: (view: 'daily-review' | 'library' | 'worksheets') => void }> = ({ child, isDemo, onOpen }) => {
  const subjects = subjectsForGrade(child.grade).filter((s) => !ALWAYS.includes(s));
  const [data, setData] = useState<WeekData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ open: false, subject: subjects[1] || subjects[0], topic: '', date: '' });
  const [msg, setMsg] = useState<string | null>(null);

  const load = () => {
    if (isDemo) { setData(demoWeek()); return; }
    call('week', { childId: child.id }).then(setData).catch((e) => setError(e.message));
  };
  useEffect(load, [child.id, isDemo]); // eslint-disable-line react-hooks/exhaustive-deps

  const addExam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.date) { setMsg('Elige el día del examen.'); return; }
    if (isDemo) { setMsg('En la demo no se guardan exámenes. Con una cuenta, tus padres lo verían y Repasar te ayudaría a prepararlo.'); return; }
    try {
      const r = await call('add_exam', { childId: child.id, subject: form.subject, topic: form.topic, date: form.date });
      setMsg(`¡Apuntado! ${r.inReview ? 'Repasar te ayudará a prepararlo y ' : ''}tus padres lo verán en su agenda.`);
      setForm({ ...form, open: false, topic: '', date: '' });
      load();
    } catch (err: any) { setMsg(err.message); }
  };
  const delExam = async (id: string) => {
    if (!window.confirm('¿Borrar este examen?')) return;
    try { await call('delete_exam', { childId: child.id, id }); load(); } catch (err: any) { setMsg(err.message); }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-5 animate-in fade-in" data-testid="my-week">
      <div className="bg-gradient-to-br from-sky-500 to-blue-700 rounded-[2rem] p-6 text-white shadow-xl flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-black">📅 Mi semana</h2>
          <p className="text-sm text-sky-100">Tus exámenes, lo que toca repasar y lo que tienes pendiente.</p>
        </div>
        <button onClick={() => setForm({ ...form, open: !form.open })} className="bg-white text-blue-700 rounded-xl px-4 py-2 font-black text-sm" data-testid="add-exam-open">➕ Tengo un examen</button>
      </div>
      {msg && <p className="bg-emerald-50 text-emerald-800 rounded-xl px-4 py-2 text-sm font-bold" role="status">{msg}</p>}
      {error && <p className="bg-red-50 text-red-700 rounded-xl px-4 py-2 text-sm font-bold" role="alert">{error}</p>}

      {form.open && (
        <form onSubmit={addExam} className="bg-white rounded-[2rem] p-5 border-2 border-blue-100 grid sm:grid-cols-4 gap-2" data-testid="add-exam-form">
          <select value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} className="sm:col-span-2 bg-slate-50 rounded-xl px-3 py-2 text-sm border border-slate-200" data-testid="exam-subject">
            {subjects.map((s) => <option key={s}>{s}</option>)}
          </select>
          <input type="date" value={form.date} min={iso(new Date())} onChange={(e) => setForm({ ...form, date: e.target.value })} className="bg-slate-50 rounded-xl px-3 py-2 text-sm border border-slate-200" data-testid="exam-date" />
          <button className="bg-blue-600 text-white rounded-xl px-4 py-2 text-sm font-black" data-testid="exam-save">Apuntar</button>
          <input value={form.topic} maxLength={160} onChange={(e) => setForm({ ...form, topic: e.target.value })} placeholder="¿De qué tema? (así te ayudo a prepararlo): «Las plantas»" className="sm:col-span-4 bg-slate-50 rounded-xl px-3 py-2 text-sm border border-slate-200" data-testid="exam-topic" />
        </form>
      )}

      {!data ? <div className="h-64 bg-blue-50 rounded-[2rem] animate-pulse" /> : (
        <>
          {(data.worksheets.length > 0 || data.study.length > 0) && (
            <div className="bg-amber-50 rounded-[2rem] p-5 border border-amber-100 space-y-2" data-testid="pending">
              <p className="font-black text-amber-800">📌 Tienes pendiente</p>
              {data.worksheets.map((w) => <button key={w.id} onClick={() => onOpen('worksheets')} className="block text-left text-sm text-slate-700 hover:underline">📑 Ficha: {w.title}{w.subject ? ` (${w.subject})` : ''}</button>)}
              {data.study.map((s) => <p key={s.id} className="text-sm text-slate-700">📘 Resumir «{s.topic}»{s.book ? ` de ${s.book}` : ''}</p>)}
            </div>
          )}
          <div className="space-y-3">
            {data.days.map((d, i) => {
              const empty = !d.exams.length && !d.events.length && !d.reviews.length && !d.tasks.length && !d.plan.length;
              if (empty && i > 0) return null;
              return (
                <div key={d.day} className={`rounded-[1.5rem] p-4 border-2 ${i === 0 ? 'bg-white border-blue-300' : d.exams.length ? 'bg-rose-50/50 border-rose-200' : 'bg-white border-slate-100'}`} data-testid="week-day">
                  <p className={`font-black capitalize ${i === 0 ? 'text-blue-700' : 'text-slate-700'}`}>{label(d.day, i)}</p>
                  {empty && <p className="text-sm text-slate-400">Hoy no hay nada apuntado. ¡Buen momento para leer o hacer un reto!</p>}
                  <ul className="mt-1 space-y-1 text-sm">
                    {d.exams.map((x) => (
                      <li key={x.id} className="flex items-center justify-between gap-2 font-bold text-rose-700" data-testid="week-exam">
                        <span>📝 {x.title}</span>
                        {x.byChild && <button onClick={() => delExam(x.id)} className="text-xs text-slate-400 hover:text-red-600" aria-label="Borrar examen">✕</button>}
                      </li>
                    ))}
                    {d.events.map((x) => <li key={x.id} className="text-slate-700">🗓️ {x.title}</li>)}
                    {d.reviews.map((r) => (
                      <li key={r.id} className="flex items-center justify-between gap-2 text-slate-700">
                        <span>🧠 Repasar {r.topic}{r.subject ? ` (${r.subject})` : ''}</span>
                        {i === 0 && <button onClick={() => onOpen('daily-review')} className="text-xs font-black text-blue-600">Ir</button>}
                      </li>
                    ))}
                    {d.tasks.map((t) => <li key={t.id} className="text-slate-700">✅ {t.title}</li>)}
                    {d.plan.map((p, k) => <li key={`p${k}`} className="text-indigo-700" data-testid="week-plan">💡 {p}</li>)}
                  </ul>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};

export default MyWeek;
