import React, { useEffect, useState } from 'react';
import { parentService, ChildReport } from '../../services/parentService';

interface Props { childId: string; childName: string; isDemo: boolean; onClose: () => void }

const fmt = (t: number) => new Date(t).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' });

/** Informe imprimible (o guardar como PDF) con datos reales del servidor: para enseñarlo en el cole. */
export const ParentReport: React.FC<Props> = ({ childId, childName, isDemo, onClose }) => {
  const [r, setR] = useState<ChildReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isDemo) { setError('El informe se genera con los datos reales de tu hijo. Crea una cuenta para verlo.'); return; }
    parentService.report(childId).then(setR).catch((e) => setError(e.message));
  }, [childId, isDemo]);

  const w = r?.week;
  const counted = r?.readings.filter((x) => x.counted) || [];
  const firstWpm = counted[0]?.wpm; const lastWpm = counted[counted.length - 1]?.wpm;
  const compr = r && r.readings.length ? Math.round(r.readings.reduce((a, x) => a + x.correct, 0) / Math.max(1, r.readings.reduce((a, x) => a + x.total, 0)) * 100) : null;
  const testAvg = r && r.tests.length ? Math.round((r.tests.reduce((a, t) => a + t.score / Math.max(1, t.total), 0) / r.tests.length) * 100) / 10 : null;

  return (
    <div className="fixed inset-0 z-[400] bg-black/60 backdrop-blur-sm overflow-y-auto p-4" role="dialog" data-testid="report-modal">
      <style>{`@media print { body * { visibility: hidden !important; } #print-report, #print-report * { visibility: visible !important; } #print-report { position: absolute; left: 0; top: 0; width: 100%; box-shadow: none !important; } .no-print { display: none !important; } }`}</style>
      <div className="max-w-3xl mx-auto">
        <div className="no-print flex justify-end gap-2 mb-3">
          {r && <button onClick={() => window.print()} className="bg-indigo-600 text-white px-5 py-2 rounded-xl font-black text-sm">🖨️ Imprimir o guardar PDF</button>}
          <button onClick={onClose} className="bg-white text-slate-700 px-5 py-2 rounded-xl font-black text-sm">Cerrar</button>
        </div>
        <div id="print-report" className="bg-white rounded-3xl p-8 shadow-2xl text-slate-800 space-y-6">
          {error && <p className="text-slate-600 font-bold">{error}</p>}
          {!r && !error && <div className="h-64 bg-slate-50 rounded-2xl animate-pulse" />}
          {r && w && (
            <>
              <header className="border-b-2 border-slate-100 pb-4">
                <p className="text-xs font-black uppercase tracking-widest text-indigo-500">EduAmigo · Informe de progreso</p>
                <h2 className="text-3xl font-black">{w.avatar} {childName}</h2>
                <p className="text-sm text-slate-500">{w.grade} · Últimos 90 días · Generado el {new Date(r.generatedAt).toLocaleDateString('es-ES')}</p>
              </header>

              <section className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                <div className="bg-slate-50 rounded-xl p-3"><p className="text-[10px] font-black uppercase text-slate-400">Racha actual</p><p className="text-2xl font-black">{w.streak.current} {w.streak.current === 1 ? 'día' : 'días'}</p><p className="text-[10px] text-slate-400">Mejor: {w.streak.best}</p></div>
                <div className="bg-slate-50 rounded-xl p-3"><p className="text-[10px] font-black uppercase text-slate-400">Esta semana</p><p className="text-2xl font-black">{w.activeDays} de 7 días</p></div>
                <div className="bg-slate-50 rounded-xl p-3"><p className="text-[10px] font-black uppercase text-slate-400">Temas dominados</p><p className="text-2xl font-black">{r.mastered}</p></div>
                <div className="bg-slate-50 rounded-xl p-3"><p className="text-[10px] font-black uppercase text-slate-400">Medallas</p><p className="text-2xl font-black">{r.badges}</p></div>
              </section>

              <section>
                <h3 className="font-black text-lg mb-2">📖 Lectura</h3>
                {r.readings.length === 0 ? <p className="text-sm text-slate-500">Sin lecturas en este periodo.</p> : (
                  <p className="text-sm">
                    {r.readings.length} {r.readings.length === 1 ? 'lectura' : 'lecturas'}. {counted.length > 1 ? <>Velocidad: de <b>{firstWpm}</b> a <b>{lastWpm}</b> palabras por minuto. </> : counted.length === 1 ? <>Velocidad: <b>{lastWpm}</b> palabras por minuto. </> : null}
                    Comprensión: <b>{compr} %</b> de preguntas acertadas.
                  </p>
                )}
              </section>

              <section>
                <h3 className="font-black text-lg mb-2">🔢 Matemáticas</h3>
                <p className="text-sm">{r.math.challenges} {r.math.challenges === 1 ? 'reto' : 'retos'} de cálculo{r.math.pct !== null ? <> con un <b>{r.math.pct} %</b> de aciertos</> : null}.</p>
              </section>

              <section>
                <h3 className="font-black text-lg mb-2">🧠 Tests de repaso</h3>
                {r.tests.length === 0 ? <p className="text-sm text-slate-500">Sin tests en este periodo.</p> : (
                  <>
                    <p className="text-sm mb-2">{r.tests.length} {r.tests.length === 1 ? 'test' : 'tests'} · nota media <b>{testAvg}</b> sobre 10.</p>
                    <table className="w-full text-sm">
                      <thead><tr className="text-left text-slate-400 text-xs"><th>Fecha</th><th>Tema</th><th className="text-right">Nota</th></tr></thead>
                      <tbody>{r.tests.slice(0, 12).map((t, i) => <tr key={i} className="border-t border-slate-100"><td className="py-1">{fmt(t.at)}</td><td>{t.topic}{t.subject ? ` (${t.subject})` : ''}</td><td className="text-right font-bold">{Math.round((t.score / Math.max(1, t.total)) * 100) / 10}</td></tr>)}</tbody>
                    </table>
                  </>
                )}
              </section>

              <section>
                <h3 className="font-black text-lg mb-2">📝 Notas del colegio</h3>
                {r.grades.length === 0 ? <p className="text-sm text-slate-500">No se han apuntado notas.</p> : (
                  <table className="w-full text-sm">
                    <thead><tr className="text-left text-slate-400 text-xs"><th>Asignatura</th><th>Evaluación</th><th className="text-right">Nota</th></tr></thead>
                    <tbody>{r.grades.slice(0, 20).map((g) => <tr key={g.id} className="border-t border-slate-100"><td className="py-1">{g.subject}{g.topic ? ` — ${g.topic}` : ''}</td><td>{g.term}</td><td className={`text-right font-bold ${g.grade < 5 ? 'text-red-600' : ''}`}>{g.grade}</td></tr>)}</tbody>
                  </table>
                )}
              </section>

              <section>
                <h3 className="font-black text-lg mb-2">🎯 Dónde le cuesta ahora</h3>
                {w.weak.length === 0 ? <p className="text-sm text-slate-500">No se detectan dificultades claras con los datos actuales.</p> : (
                  <ul className="list-disc pl-5 text-sm space-y-1">{w.weak.map((x, i) => <li key={i}><b>{x.area}:</b> {x.text}</li>)}</ul>
                )}
              </section>
              <p className="text-[10px] text-slate-400 border-t border-slate-100 pt-3">Datos registrados por EduAmigo con la actividad del alumno. Las notas del colegio las apuntan los padres.</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ParentReport;
