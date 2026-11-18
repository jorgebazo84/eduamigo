import React, { useEffect, useState } from 'react';
import { libraryService, speakSpanish, LibraryTopic } from '../../services/libraryService';
import { reviewService } from '../../services/reviewService';
import SchemeView from './SchemeView';
import ReportErrorButton from '../ReportErrorButton';

interface Props {
  childId: string; grade: string; subject: string; topic: string; isDemo?: boolean; onBack: () => void;
}

const DEMO_TOPIC: LibraryTopic = {
  title: 'El ciclo del agua', intro: 'El agua del planeta se mueve sin parar entre el mar, el aire y la tierra.',
  sections: [
    { heading: 'Evaporación', text: 'El calor del sol calienta el agua de mares y ríos y la convierte en vapor que sube al aire.' },
    { heading: 'Condensación', text: 'El vapor sube, se enfría y forma gotitas que se juntan en las nubes.' },
    { heading: 'Precipitación', text: 'Cuando las gotas pesan mucho, caen como lluvia, nieve o granizo y el agua vuelve a ríos y mares.' },
  ],
  keyIdeas: ['El sol mueve el ciclo del agua.', 'El agua cambia de estado: líquido, vapor y hielo.'],
  example: 'Cuando hierves agua y la tapa se llena de gotas, ves la condensación.',
  glossary: [{ term: 'Vapor', definition: 'Agua en estado gaseoso.' }],
  scheme: { central: 'El ciclo del agua', branches: [
    { title: 'Evaporación', points: ['El sol calienta el agua de mares y ríos', 'El agua se convierte en vapor'] },
    { title: 'Condensación', points: ['El vapor se enfría y forma nubes'] },
    { title: 'Precipitación', points: ['Cae como lluvia, nieve o granizo'] },
  ] },
};

/** Un tema: explicación para leer o escuchar, esquema imprimible y botón para mandarlo a Repasar. */
export const TopicView: React.FC<Props> = ({ childId, grade, subject, topic, isDemo, onBack }) => {
  const [data, setData] = useState<LibraryTopic | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scheme, setScheme] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    setData(null); setError(null);
    if (isDemo) { setData({ ...DEMO_TOPIC, title: topic || DEMO_TOPIC.title }); return; }
    libraryService.topic(childId, subject, topic, grade).then((r) => setData(r.topic)).catch((e) => setError(e.message));
  }, [childId, subject, topic, grade, isDemo]);

  const toReview = async () => {
    if (isDemo) { setMsg('Con una cuenta, este tema se añadiría a Repasar.'); return; }
    try { await reviewService.addTopic({ childId, subject, topic, sourceType: 'library' }); setMsg('¡Hecho! Este tema saldrá en Repasar para que no se te olvide.'); }
    catch (e: any) { setMsg(e.message); }
  };

  return (
    <div className="space-y-5 animate-in fade-in" data-testid="topic-view">
      <button onClick={onBack} className="text-sm font-black text-blue-600">← Volver</button>
      {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl px-4 py-3 text-sm font-bold" role="alert">{error}</div>}
      {!data && !error && <div className="space-y-3"><div className="h-10 bg-blue-50 rounded-xl animate-pulse" /><div className="h-48 bg-blue-50 rounded-[2rem] animate-pulse" /><p className="text-sm text-slate-500 text-center">Preparando la explicación y el esquema…</p></div>}
      {data && (
        <>
          <div className="bg-gradient-to-br from-blue-600 to-cyan-600 rounded-[2rem] p-6 text-white shadow-xl">
            <p className="text-[10px] font-black uppercase tracking-widest opacity-80">{subject} · {grade}</p>
            <h2 className="text-2xl font-black">{data.title}</h2>
            <p className="text-sm text-blue-50 mt-1">{data.intro}</p>
            <div className="flex flex-wrap gap-2 mt-4">
              <button onClick={() => setScheme(true)} className="bg-white text-blue-700 rounded-xl px-4 py-2 text-sm font-black" data-testid="open-scheme">🗺️ Ver esquema</button>
              <button onClick={() => speakSpanish([data.title, data.intro, ...data.sections.map((s) => `${s.heading}. ${s.text}`)].join('. '))} className="bg-white/20 rounded-xl px-4 py-2 text-sm font-black">🔊 Escuchar</button>
              <button onClick={() => window.speechSynthesis?.cancel()} className="bg-white/10 rounded-xl px-3 py-2 text-sm font-black">⏹</button>
              <button onClick={toReview} className="bg-white/20 rounded-xl px-4 py-2 text-sm font-black" data-testid="to-review">🧠 Repasar este tema</button>
            </div>
          </div>
          {msg && <p className="bg-emerald-50 text-emerald-800 rounded-xl px-4 py-2 text-sm font-bold" role="status">{msg}</p>}
          {data.sections.map((s, i) => (
            <section key={i} className="bg-white rounded-[2rem] p-6 border border-blue-50">
              <h3 className="font-black text-blue-900 mb-1">{s.heading}</h3>
              <p className="text-slate-700 leading-relaxed">{s.text}</p>
            </section>
          ))}
          {data.keyIdeas.length > 0 && (
            <section className="bg-amber-50 rounded-[2rem] p-6 border border-amber-100">
              <h3 className="font-black text-amber-800 mb-2">⭐ Ideas clave</h3>
              <ul className="list-disc pl-5 space-y-1 text-slate-800">{data.keyIdeas.map((k, i) => <li key={i}>{k}</li>)}</ul>
            </section>
          )}
          {data.example && <section className="bg-white rounded-[2rem] p-6 border border-blue-50"><h3 className="font-black text-blue-900 mb-1">💡 Un ejemplo</h3><p className="text-slate-700">{data.example}</p></section>}
          {data.glossary.length > 0 && (
            <section className="bg-white rounded-[2rem] p-6 border border-blue-50">
              <h3 className="font-black text-blue-900 mb-2">📖 Palabras importantes</h3>
              <dl className="grid sm:grid-cols-2 gap-2">{data.glossary.map((g, i) => <div key={i} className="bg-slate-50 rounded-xl p-3"><dt className="font-black text-slate-800">{g.term}</dt><dd className="text-sm text-slate-600">{g.definition}</dd></div>)}</dl>
            </section>
          )}
          <ReportErrorButton childId={childId} kind="library" refId={`${subject}|${topic}`.slice(0, 64)} isDemo={isDemo} className="text-right" />
          {scheme && <SchemeView scheme={data.scheme} subject={subject} grade={grade} onClose={() => setScheme(false)} />}
        </>
      )}
    </div>
  );
};

export default TopicView;
