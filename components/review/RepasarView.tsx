import React, { useEffect, useState } from 'react';
import { Child } from '../../types';
import { reviewService, TodayData, ReviewItem, whenText } from '../../services/reviewService';
import type { ReviewTarget } from '../ExamMode';

interface RepasarViewProps {
  child: Child;
  isDemo: boolean;
  /** Empieza el repaso de un tema (test corto) */
  onStartReview: (item: ReviewTarget) => void;
  /** Test libre de cualquier tema */
  onFreeTest: () => void;
}

const SOURCE: Record<string, string> = {
  test: 'de un test', worksheet: 'de una ficha', homework: 'de los deberes', book: 'de tu libro', studied: 'lo estudiaste', module: 'de Mates',
};

const RepasarView: React.FC<RepasarViewProps> = ({ child, isDemo, onStartReview, onFreeTest }) => {
  const [data, setData] = useState<TodayData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [books, setBooks] = useState<{ id: string; title: string; subject: string; topics: string[] }[]>([]);
  const [bookId, setBookId] = useState('');
  const [picked, setPicked] = useState<number[]>([]);
  const [studiedMsg, setStudiedMsg] = useState<string | null>(null);

  const load = () => {
    if (isDemo) return;
    reviewService.today(child.id).then(setData).catch((e) => setError(e.message));
  };

  useEffect(() => {
    load();
    if (isDemo) return;
    fetch(`api_study.php?action=get_study_data&childId=${encodeURIComponent(child.id)}`, { credentials: 'same-origin' })
      .then((r) => (r.ok ? r.json() : { books: [] }))
      .then((d) => setBooks((d.books || []).map((b: any) => ({ id: b.id, title: b.title, subject: b.subject, topics: Array.isArray(b.topics) ? b.topics : [] }))))
      .catch(() => setBooks([]));
  }, [child.id, isDemo]);

  const book = books.find((b) => b.id === bookId);

  const saveStudied = async () => {
    if (!book || !picked.length) return;
    try {
      const r = await reviewService.studiedToday(child.id, book.id, picked);
      setStudiedMsg(`¡Apuntado! ${r.added === 1 ? 'Ese tema vuelve' : 'Esos temas vuelven'} mañana para repasarlo${r.added === 1 ? '' : 's'}.`);
      setPicked([]); setBookId('');
      load();
    } catch (e: any) {
      setStudiedMsg(e.message);
    }
  };

  const ItemRow: React.FC<{ item: ReviewItem; due?: boolean }> = ({ item, due }) => (
    <div className={`p-5 rounded-3xl flex flex-col md:flex-row justify-between items-start md:items-center gap-3 ${due ? 'bg-white/10 border border-white/20' : 'bg-white border border-indigo-50'}`}>
      <div>
        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase inline-block mb-1 ${due ? 'bg-white/20 text-white' : 'bg-indigo-50 text-indigo-500'}`}>{item.subject || 'Repaso'}</span>
        <h3 className={`text-lg font-black ${due ? 'text-white' : 'text-indigo-900'}`}>{item.topic}</h3>
        <p className={`text-xs font-bold ${due ? 'text-indigo-100' : 'text-indigo-400'}`}>
          {due ? `Viene ${SOURCE[item.sourceType] || ''}` : `Vuelve ${whenText(item.dueDate, data?.today || '')}`}
          {item.reviewsCount > 0 ? ` · ${item.reviewsCount} ${item.reviewsCount === 1 ? 'repaso' : 'repasos'}` : ''}
        </p>
      </div>
      {due && (
        <button onClick={() => onStartReview({ id: item.id, subject: item.subject, topic: item.topic })}
          className="bg-white text-indigo-700 px-6 py-3 rounded-2xl font-black text-sm shadow-lg hover:scale-105 transition-all whitespace-nowrap">
          Repasar (5 preguntas) →
        </button>
      )}
    </div>
  );

  if (isDemo) {
    return (
      <div className="space-y-6">
        <div className="bg-indigo-600 rounded-[2.5rem] p-8 text-white shadow-xl">
          <h2 className="text-2xl font-black">🧠 Repasar</h2>
          <p className="text-indigo-100 mt-2 text-sm">Con una cuenta, aquí aparecen cada día los temas que tocan repasar: lo que has estudiado, los tests y las fichas en las que fallaste. Vuelven a los 1, 3, 7, 14 y 30 días para que no se olviden.</p>
        </div>
        <button onClick={onFreeTest} className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-black shadow-lg">📝 Probar un test de ejemplo</button>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-16">
      <section className="bg-indigo-600 rounded-[2.5rem] p-8 text-white shadow-xl space-y-5" aria-labelledby="hoy-repasar">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center text-2xl" aria-hidden="true">🧠</div>
          <div>
            <h2 id="hoy-repasar" className="text-2xl font-black">Hoy toca repasar</h2>
            <p className="text-indigo-100 text-xs font-bold">Pocos minutos al día para que no se te olvide lo que ya sabes.</p>
          </div>
        </div>
        {error && <p role="alert" className="text-sm font-bold bg-white/10 rounded-2xl px-4 py-3">{error}</p>}
        {!data && !error && <p className="text-indigo-100 font-bold animate-pulse">Cargando…</p>}
        {data && data.due.length === 0 && (
          <p className="text-indigo-50 font-bold" data-testid="nothing-due">🎉 ¡Hoy no tienes nada pendiente!{data.mastered > 0 ? ` Ya dominas ${data.mastered} ${data.mastered === 1 ? 'tema' : 'temas'}.` : ''}</p>
        )}
        {data && data.due.map((i) => <ItemRow key={i.id} item={i} due />)}
        {data && data.dueTotal > data.due.length && (
          <p className="text-xs font-bold text-indigo-100">Y {data.dueTotal - data.due.length} más para los próximos días: mejor poco a poco.</p>
        )}
        {data && <p className="text-[11px] font-bold text-indigo-200">Tests hoy: {data.usage.used} de {data.usage.limit}</p>}
      </section>

      <section className="bg-white rounded-[2.5rem] p-8 border border-indigo-50 space-y-4" aria-labelledby="estudiado-hoy">
        <h2 id="estudiado-hoy" className="text-xl font-black text-indigo-900">📚 ¿Qué has estudiado hoy?</h2>
        {books.length === 0 ? (
          <p className="text-sm text-indigo-400">Cuando tus padres añadan tus libros en Biblioteca, aquí podrás marcar los temas que has estudiado y se programarán sus repasos.</p>
        ) : (
          <>
            <div className="flex flex-wrap gap-2">
              {books.map((b) => (
                <button key={b.id} onClick={() => { setBookId(b.id); setPicked([]); setStudiedMsg(null); }}
                  className={`px-4 py-2 rounded-xl text-sm font-black border-2 ${bookId === b.id ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-indigo-600 border-indigo-100'}`}>
                  {b.title}
                </button>
              ))}
            </div>
            {book && (
              <div className="space-y-2">
                {book.topics.map((t, i) => (
                  <label key={i} className="flex items-center gap-3 text-sm font-bold text-indigo-900">
                    <input type="checkbox" checked={picked.includes(i)} onChange={() => setPicked((p) => (p.includes(i) ? p.filter((x) => x !== i) : [...p, i]))} className="w-5 h-5" />
                    {t}
                  </label>
                ))}
                {book.topics.length === 0 && <p className="text-sm text-indigo-400">Este libro no tiene temas todavía.</p>}
                <button onClick={saveStudied} disabled={!picked.length} className="bg-indigo-600 text-white text-sm font-black px-6 py-3 rounded-2xl disabled:opacity-40">Lo he estudiado</button>
              </div>
            )}
          </>
        )}
        {studiedMsg && <p role="status" className="text-sm font-bold text-indigo-700">{studiedMsg}</p>}
      </section>

      {data && data.upcoming.length > 0 && (
        <section className="space-y-3" aria-labelledby="proximos">
          <h2 id="proximos" className="text-xl font-black text-indigo-900">🗓️ Próximos repasos</h2>
          {data.upcoming.slice(0, 8).map((i) => <ItemRow key={i.id} item={i} />)}
        </section>
      )}

      <button onClick={onFreeTest} className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-black shadow-lg">📝 Hacer un test de cualquier tema</button>
    </div>
  );
};

export default RepasarView;
