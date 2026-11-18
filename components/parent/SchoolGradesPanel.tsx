import React, { useCallback, useEffect, useState } from 'react';
import { parentService, SchoolGrade } from '../../services/parentService';
import { subjectsForGrade, TERMS, LOW_GRADE } from '../../shared/schoolSubjects';

interface Props { childId: string; childName: string; grade: string; isDemo: boolean }

/** Notas del colegio: se guardan en el servidor. Una nota baja manda el tema a Repasar. */
export const SchoolGradesPanel: React.FC<Props> = ({ childId, childName, grade, isDemo }) => {
  const subjects = subjectsForGrade(grade);
  const [grades, setGrades] = useState<SchoolGrade[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ subject: subjects[0], other: '', term: TERMS[0], grade: '', topic: '', date: new Date().toISOString().slice(0, 10) });
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (isDemo) { setLoading(false); return; }
    try { setGrades((await parentService.listGrades(childId)).grades); } catch (e: any) { setMsg({ text: e.message, ok: false }); }
    finally { setLoading(false); }
  }, [childId, isDemo]);
  useEffect(() => { setLoading(true); load(); }, [load]);

  const flash = (text: string, ok: boolean) => { setMsg({ text, ok }); setTimeout(() => setMsg(null), 5000); };

  const save = async () => {
    const value = Number(String(form.grade).replace(',', '.'));
    const subject = form.subject === 'Otra asignatura' ? form.other.trim() : form.subject;
    if (!subject) { flash('Escribe la asignatura.', false); return; }
    if (!Number.isFinite(value) || value < 0 || value > 10 || form.grade === '') { flash('La nota debe estar entre 0 y 10.', false); return; }
    if (isDemo) { flash('En la demo no se guardan notas. Con una cuenta, una nota baja pasa sola a Repasar.', true); return; }
    setBusy(true);
    try {
      const r = await parentService.addGrade({ childId, subject, term: form.term, grade: value, topic: form.topic.trim(), date: form.date });
      setGrades((g) => [r.grade, ...g]);
      setForm({ ...form, grade: '', topic: '' });
      flash(r.addedToReview ? `Nota guardada. Como es baja, «${form.topic.trim() || subject}» pasa a Repasar de ${childName}.` : 'Nota guardada.', true);
    } catch (e: any) { flash(e.message, false); }
    finally { setBusy(false); }
  };

  const remove = async (id: string) => {
    if (!window.confirm('¿Borrar esta nota?')) return;
    try { await parentService.deleteGrade(id); setGrades((g) => g.filter((x) => x.id !== id)); } catch (e: any) { flash(e.message, false); }
  };

  const bySubject = grades.reduce<Record<string, SchoolGrade[]>>((acc, g) => { (acc[g.subject] = acc[g.subject] || []).push(g); return acc; }, {});
  const low = Number(String(form.grade).replace(',', '.')) < LOW_GRADE && form.grade !== '';

  return (
    <div className="bg-white rounded-[2rem] p-6 border border-blue-50 space-y-5" data-testid="school-grades">
      <div>
        <h3 className="font-black text-lg text-blue-900">📝 Notas del colegio de {childName}</h3>
        <p className="text-xs text-slate-500">Si apuntáis una nota por debajo de {LOW_GRADE}, ese tema pasa a Repasar para que lo refuerce.</p>
      </div>
      {msg && <div className={`rounded-xl px-4 py-2 text-sm font-bold ${msg.ok ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-700'}`} role="status">{msg.text}</div>}

      <div className="grid md:grid-cols-5 gap-2">
        <select value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} className="md:col-span-2 bg-slate-50 rounded-xl px-3 py-2 text-sm border border-slate-200" data-testid="grade-subject">
          {[...subjects, 'Otra asignatura'].map((s) => <option key={s}>{s}</option>)}
        </select>
        <select value={form.term} onChange={(e) => setForm({ ...form, term: e.target.value })} className="bg-slate-50 rounded-xl px-3 py-2 text-sm border border-slate-200" data-testid="grade-term">
          {TERMS.map((t) => <option key={t}>{t}</option>)}
        </select>
        <input inputMode="decimal" value={form.grade} onChange={(e) => setForm({ ...form, grade: e.target.value })} placeholder="Nota (0–10)" className="bg-slate-50 rounded-xl px-3 py-2 text-sm border border-slate-200" data-testid="grade-value" />
        <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="bg-slate-50 rounded-xl px-3 py-2 text-sm border border-slate-200" />
        {form.subject === 'Otra asignatura' && (
          <input value={form.other} maxLength={80} onChange={(e) => setForm({ ...form, other: e.target.value })} placeholder="Nombre de la asignatura" className="md:col-span-5 bg-slate-50 rounded-xl px-3 py-2 text-sm border border-slate-200" />
        )}
        <input value={form.topic} maxLength={160} onChange={(e) => setForm({ ...form, topic: e.target.value })}
          placeholder={low ? '¿De qué tema era? (recomendado: así Repasar sabe qué reforzar)' : 'Tema (opcional): «Las fracciones»'}
          className={`md:col-span-4 rounded-xl px-3 py-2 text-sm border ${low ? 'bg-amber-50 border-amber-300' : 'bg-slate-50 border-slate-200'}`} data-testid="grade-topic" />
        <button onClick={save} disabled={busy} className="bg-blue-600 text-white rounded-xl px-4 py-2 text-sm font-black" data-testid="grade-save">Guardar nota</button>
      </div>

      {loading ? <div className="h-24 bg-slate-50 rounded-2xl animate-pulse" /> : grades.length === 0 ? (
        <p className="text-sm text-slate-500">Aún no hay notas apuntadas.</p>
      ) : (
        <div className="space-y-3" data-testid="grade-list">
          {Object.entries(bySubject).map(([subject, list]) => (
            <div key={subject} className="rounded-2xl border border-slate-100 p-3">
              <p className="font-black text-sm text-slate-700 mb-1">{subject}</p>
              <div className="flex flex-wrap gap-2">
                {list.map((g) => (
                  <span key={g.id} className={`inline-flex items-center gap-2 rounded-xl px-3 py-1 text-xs font-bold ${g.grade < 5 ? 'bg-red-50 text-red-700' : g.grade < LOW_GRADE ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'}`}>
                    {g.term}: {g.grade}{g.topic ? ` · ${g.topic}` : ''}{g.inReview ? ' · 🧠 en Repasar' : ''}
                    <button onClick={() => remove(g.id)} className="text-slate-400 hover:text-red-600" aria-label="Borrar nota">✕</button>
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SchoolGradesPanel;
