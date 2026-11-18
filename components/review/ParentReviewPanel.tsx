import React, { useEffect, useState } from 'react';
import { Child } from '../../types';
import { reviewService, ParentReviewOverview, ReviewItem, whenText } from '../../services/reviewService';

const SOURCE: Record<string, string> = {
  test: 'Test', worksheet: 'Ficha', homework: 'Deberes', book: 'Libro', studied: 'Estudiado', module: 'Mates',
};
const fmt = (t: number) => new Date(t).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });

/** Padres → Repasos: qué toca, qué domina, qué se le resiste y el historial de tests. */
const ParentReviewPanel: React.FC<{ children: Child[]; isDemo: boolean }> = ({ children, isDemo }) => {
  const [childId, setChildId] = useState(children[0]?.id || '');
  const [data, setData] = useState<ParentReviewOverview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [limit, setLimit] = useState(10);
  const [saveMsg, setSaveMsg] = useState('');

  const load = async (id: string) => {
    if (!id || isDemo) return;
    setError(null);
    try {
      const d = await reviewService.parentOverview(id);
      setData(d);
      setLimit(d.settings.testDailyLimit);
    } catch (e: any) {
      setError(e.message);
    }
  };
  useEffect(() => { setSaveMsg(''); setData(null); load(childId); }, [childId]);

  if (isDemo) {
    return <div className="bg-white rounded-[2rem] p-8 border border-blue-50 text-blue-500 font-bold">En el modo demostración no hay repasos guardados. Con una cuenta, aquí verás qué temas le tocan a cada hijo esta semana, cuáles domina, cuáles se le resisten y sus tests.</div>;
  }
  if (!children.length) {
    return <div className="bg-white rounded-[2rem] p-8 border border-blue-50 text-blue-500 font-bold">Añade un hijo en la pestaña Hijos para ver sus repasos.</div>;
  }

  const archive = async (item: ReviewItem) => {
    if (!confirm(`¿Quitar «${item.topic}» de sus repasos?`)) return;
    try { await reviewService.archiveItem(childId, item.id); load(childId); } catch (e: any) { setError(e.message); }
  };
  const saveLimit = async () => {
    setSaveMsg('');
    try { await reviewService.setLimit(childId, limit); setSaveMsg('Guardado'); load(childId); } catch (e: any) { setSaveMsg(e.message); }
  };

  const List: React.FC<{ items: ReviewItem[]; empty: string; showWhen?: boolean; canArchive?: boolean }> = ({ items, empty, showWhen, canArchive }) => (
    items.length === 0 ? <p className="text-sm text-blue-400 italic">{empty}</p> : (
      <ul className="divide-y divide-blue-50">
        {items.map((i) => (
          <li key={i.id} className="py-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-sm font-bold text-blue-900">{i.topic}</p>
              <p className="text-[11px] text-blue-400">
                {i.subject || 'Sin asignatura'} · {SOURCE[i.sourceType] || i.sourceType}
                {showWhen && data ? ` · ${i.dueDate < data.today ? 'pendiente desde ' + fmt(Date.parse(i.dueDate)) : whenText(i.dueDate, data.today)}` : ''}
                {i.lastScore !== null ? ` · última nota ${i.lastScore}` : ''}
                {i.failsCount ? ` · ${i.failsCount} ${i.failsCount === 1 ? 'repaso fallado' : 'repasos fallados'}` : ''}
              </p>
            </div>
            {canArchive && <button onClick={() => archive(i)} className="text-[11px] font-black text-slate-400 hover:text-rose-500">Quitar</button>}
          </li>
        ))}
      </ul>
    )
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Hijo">
        {children.map((c) => (
          <button key={c.id} role="tab" aria-selected={c.id === childId} onClick={() => setChildId(c.id)}
            className={`px-4 py-2 rounded-xl text-sm font-black border-2 ${c.id === childId ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-indigo-600 border-indigo-100'}`}>
            {c.avatar} {c.name}
          </button>
        ))}
      </div>
      {error && <p role="alert" className="text-sm font-bold text-rose-600 bg-rose-50 rounded-2xl px-4 py-3">{error}</p>}
      {!data && !error && <p className="text-blue-400 font-bold animate-pulse">Cargando…</p>}
      {data && (
        <>
          <p className="text-sm text-blue-500 bg-blue-50 rounded-2xl px-4 py-3">
            Los repasos se programan solos: cada tema que estudia o en el que falla vuelve a los 1, 3, 7, 14 y 30 días. Con un 8 o más avanza; si no, vuelve a empezar. Si apuntáis un examen en la Agenda, los repasos de esa asignatura se adelantan.
          </p>
          <section className="grid md:grid-cols-3 gap-4" data-testid="review-metrics">
            {[['Esta semana', data.week.length], ['Dominados', data.mastered.length], ['Se le resisten', data.struggling.length]].map(([l, v]) => (
              <div key={String(l)} className="bg-white rounded-[2rem] p-5 border border-blue-50">
                <p className="text-[11px] font-black text-blue-300 uppercase tracking-wide">{l}</p>
                <p className="text-3xl font-black text-blue-700">{v}</p>
              </div>
            ))}
          </section>
          {data.overdue > 0 && <p className="text-sm font-bold text-amber-700 bg-amber-50 rounded-2xl px-4 py-3">Tiene {data.overdue} {data.overdue === 1 ? 'repaso atrasado' : 'repasos atrasados'}. La app le propone como mucho 3 al día.</p>}

          <section className="bg-white rounded-[2rem] p-6 border border-blue-50">
            <h3 className="text-sm font-black text-blue-900 uppercase tracking-wider mb-2">Le toca esta semana</h3>
            <List items={data.week} empty="Nada pendiente esta semana." showWhen canArchive />
          </section>
          {data.struggling.length > 0 && (
            <section className="bg-white rounded-[2rem] p-6 border-2 border-amber-100">
              <h3 className="text-sm font-black text-amber-800 uppercase tracking-wider mb-2">Se le resisten</h3>
              <p className="text-xs text-amber-700 mb-2">Ha fallado dos o más repasos. Puede ayudar sentarse con él un rato o pedir una ficha de ese tema.</p>
              <List items={data.struggling} empty="" showWhen />
            </section>
          )}
          <section className="grid md:grid-cols-2 gap-4">
            <div className="bg-white rounded-[2rem] p-6 border border-blue-50">
              <h3 className="text-sm font-black text-blue-900 uppercase tracking-wider mb-2">Más adelante</h3>
              <List items={data.later} empty="Nada programado más adelante." showWhen canArchive />
            </div>
            <div className="bg-white rounded-[2rem] p-6 border border-blue-50">
              <h3 className="text-sm font-black text-emerald-800 uppercase tracking-wider mb-2">🏆 Dominados</h3>
              <List items={data.mastered} empty="Todavía ninguno: un tema se domina tras superar el repaso de 30 días." />
            </div>
          </section>

          <section className="bg-white rounded-[2rem] p-6 border border-blue-50">
            <h3 className="text-sm font-black text-blue-900 uppercase tracking-wider mb-2">Tests</h3>
            {data.tests.length === 0 ? <p className="text-sm text-blue-400 italic">Todavía no ha hecho ningún test.</p> : (
              <ul className="divide-y divide-blue-50">
                {data.tests.map((t) => (
                  <li key={t.id} className="py-3 flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-bold text-blue-900">{t.kind === 'review' ? '🧠 ' : '📝 '}{t.topic}</p>
                      <p className="text-[11px] text-blue-400">{t.subject} · {fmt(t.timestamp)}{t.weaknesses.length ? ` · a reforzar: ${t.weaknesses.join(', ')}` : ''}</p>
                    </div>
                    <span className={`text-sm font-black ${t.score / t.totalQuestions >= 0.8 ? 'text-emerald-600' : t.score / t.totalQuestions >= 0.5 ? 'text-amber-600' : 'text-rose-600'}`}>{t.score}/{t.totalQuestions}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="bg-white rounded-[2rem] p-6 border border-blue-50 flex flex-wrap items-center gap-3">
            <label className="text-sm font-bold text-blue-800 flex items-center gap-3">
              Tests al día
              <input type="number" min={1} max={50} value={limit} onChange={(e) => setLimit(Number(e.target.value))} aria-label="Tests al día"
                className="w-20 bg-blue-50 border-2 border-blue-100 rounded-xl px-3 py-1.5 text-center" />
            </label>
            <span className="text-xs text-blue-400">Hoy lleva {data.usage.used}.</span>
            <button onClick={saveLimit} className="bg-blue-600 text-white text-xs font-black px-4 py-2 rounded-xl">Guardar</button>
            {saveMsg && <span className="text-xs font-bold text-blue-500" role="status">{saveMsg}</span>}
          </section>
        </>
      )}
    </div>
  );
};

export default ParentReviewPanel;
