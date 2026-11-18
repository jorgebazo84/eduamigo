import React, { useEffect, useState } from 'react';
import { subjectsForGrade, ALWAYS } from '../shared/schoolSubjects';
import { reviewService } from '../services/reviewService';
import TopicView from './library/TopicView';

interface Props { childId: string; grade: string; region: string; isDemo?: boolean }
interface BookLite { id: string; title: string; subject: string; topics: string[] }

const ICON: Record<string, string> = {
  'Lengua Castellana y Literatura': '📖', 'Matemáticas': '🔢', 'Conocimiento del Medio Natural, Social y Cultural': '🌍', 'Inglés': '🇬🇧',
  'Geografía e Historia': '🏛️', 'Biología y Geología': '🌿', 'Física y Química': '⚗️', 'Tecnología y Digitalización': '💻', 'Música': '🎵',
  'Educación Física': '⚽', 'Educación Artística (Plástica y Música)': '🎨', 'Educación Plástica, Visual y Audiovisual': '🎨',
};
const DEMO_TOPICS = ['El ciclo del agua', 'Los seres vivos', 'Las plantas', 'El cuerpo humano', 'Los ecosistemas'].map((t, i) => ({ id: `d${i}`, title: t, description: '' }));

/** Biblioteca: temario de su curso por asignatura, sus libros del cole, y cada tema con explicación y esquema. */
const LibraryBrowser: React.FC<Props> = ({ childId, grade, region, isDemo }) => {
  const subjects = subjectsForGrade(grade).filter((s) => !ALWAYS.includes(s) && s !== 'Educación Física');
  const [subject, setSubject] = useState<string | null>(null);
  const [book, setBook] = useState<BookLite | null>(null);
  const [topics, setTopics] = useState<{ id: string; title: string; description: string }[] | null>(null);
  const [topic, setTopic] = useState<{ subject: string; title: string } | null>(null);
  const [custom, setCustom] = useState('');
  const [books, setBooks] = useState<BookLite[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isDemo) return;
    fetch(`api_study.php?action=get_study_data&childId=${encodeURIComponent(childId)}`, { credentials: 'same-origin' })
      .then((r) => r.json()).then((d) => setBooks((d.books || []).map((b: any) => ({ id: b.id, title: b.title, subject: b.subject, topics: b.topics || [] })))).catch(() => {});
  }, [childId, isDemo]);

  const openSubject = async (s: string) => {
    setSubject(s); setBook(null); setTopics(null); setError(null);
    if (isDemo) { setTopics(DEMO_TOPICS); return; }
    try { setTopics(await reviewService.syllabus(childId, s, grade, region)); } catch (e: any) { setError(e.message); setTopics([]); }
  };

  if (topic) return <TopicView childId={childId} grade={grade} subject={topic.subject} topic={topic.title} isDemo={isDemo} onBack={() => setTopic(null)} />;

  if (subject || book) {
    const list = book ? book.topics.map((t, i) => ({ id: `b${i}`, title: t, description: '' })) : topics;
    const subj = book ? book.subject : subject!;
    return (
      <div className="space-y-5 animate-in fade-in" data-testid="topic-list">
        <button onClick={() => { setSubject(null); setBook(null); }} className="text-sm font-black text-blue-600">← Asignaturas</button>
        <h2 className="text-2xl font-black text-blue-900">{book ? `📘 ${book.title}` : `${ICON[subj] || '📚'} ${subj}`}</h2>
        {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl px-4 py-3 text-sm font-bold">{error}</div>}
        {list === null ? <div className="h-40 bg-blue-50 rounded-[2rem] animate-pulse" /> : (
          <div className="grid sm:grid-cols-2 gap-3">
            {list.map((t) => (
              <button key={t.id} onClick={() => setTopic({ subject: subj, title: t.title })} className="text-left bg-white rounded-2xl p-4 border-2 border-blue-50 hover:border-blue-300 transition-all" data-testid="topic-item">
                <p className="font-black text-slate-800">{t.title}</p>
                {t.description && <p className="text-xs text-slate-500 mt-1">{t.description}</p>}
                <p className="text-[11px] font-bold text-blue-500 mt-2">Explicación · 🗺️ esquema</p>
              </button>
            ))}
          </div>
        )}
        {!book && (
          <form onSubmit={(e) => { e.preventDefault(); if (custom.trim().length > 2) setTopic({ subject: subj, title: custom.trim() }); }} className="bg-white rounded-2xl p-4 border border-blue-50 flex gap-2">
            <input value={custom} onChange={(e) => setCustom(e.target.value)} maxLength={120} placeholder="¿Buscas otro tema? Escríbelo: «Los volcanes»" className="flex-1 bg-slate-50 rounded-xl px-3 py-2 text-sm border border-slate-200" />
            <button className="bg-blue-600 text-white rounded-xl px-4 py-2 text-sm font-black">Abrir</button>
          </form>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in" data-testid="library">
      <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-[2rem] p-6 text-white shadow-xl">
        <h2 className="text-2xl font-black">📚 Biblioteca</h2>
        <p className="text-sm text-blue-100">Los temas de {grade}, explicados y con un esquema para imprimir y repasar.</p>
      </div>
      {books.length > 0 && (
        <div className="space-y-2">
          <h3 className="font-black text-slate-700">Mis libros del cole</h3>
          <div className="grid sm:grid-cols-2 gap-3">
            {books.map((b) => (
              <button key={b.id} onClick={() => { setBook(b); setSubject(null); }} className="text-left bg-white rounded-2xl p-4 border-2 border-emerald-100 hover:border-emerald-300" data-testid="book-item">
                <p className="font-black text-slate-800">📘 {b.title}</p>
                <p className="text-xs text-slate-500">{b.subject} · {b.topics.length} temas</p>
              </button>
            ))}
          </div>
        </div>
      )}
      <div className="space-y-2">
        <h3 className="font-black text-slate-700">Asignaturas</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {subjects.map((s) => (
            <button key={s} onClick={() => openSubject(s)} className="bg-white rounded-2xl p-4 border-2 border-blue-50 hover:border-blue-300 text-left" data-testid="subject-item">
              <span className="text-3xl">{ICON[s] || '📚'}</span>
              <p className="font-black text-slate-800 text-sm mt-2 leading-tight">{s}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default LibraryBrowser;
