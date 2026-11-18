import React, { useRef, useState } from 'react';
import { Book } from '../types/study';
import { libraryService, IsbnResult } from '../services/libraryService';
import { compressPhoto, fileToDataUrl } from '../services/imageUtils';
import { subjectsForGrade, ALWAYS } from '../shared/schoolSubjects';

interface BookManagerProps {
  userId: string;
  childId: string;
  grade?: string;
  isDemo?: boolean;
  onBookAdded: (book: Book) => void;
}

const MAX_PAGES = 8;

/** Padres: añadir un libro del cole buscando su índice por ISBN o haciendo fotos del índice (varias páginas). */
const BookManager: React.FC<BookManagerProps> = ({ userId, childId, grade = '', isDemo, onBookAdded }) => {
  const subjects = subjectsForGrade(grade).filter((s) => !ALWAYS.includes(s));
  const [subject, setSubject] = useState(subjects[1] || subjects[0]);
  const [isbn, setIsbn] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [found, setFound] = useState<IsbnResult | null>(null);
  const [mode, setMode] = useState<'search' | 'review' | 'scan'>('search');
  const [title, setTitle] = useState('');
  const [topics, setTopics] = useState<string[]>([]);
  const [newTopic, setNewTopic] = useState('');
  const [pages, setPages] = useState<{ image: string; thumb: string }[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  const reset = () => { setMode('search'); setFound(null); setTitle(''); setTopics([]); setPages([]); setIsbn(''); setError(null); };

  const search = async () => {
    setError(null); setFound(null);
    if (isDemo) { setError('En la demo no se buscan libros. Con una cuenta, busca por ISBN o haz fotos del índice.'); return; }
    setBusy(true);
    try {
      const r = await libraryService.lookupIsbn(childId, isbn, subject, grade);
      setFound(r);
      setTitle(r.title || r.meta?.title || '');
      if (r.found && r.topics) { setTopics(r.topics); setMode('review'); }
    } catch (e: any) { setError(e.message); } finally { setBusy(false); }
  };

  const addPage = async (f?: File | null) => {
    if (!f) return;
    if (pages.length >= MAX_PAGES) { setError(`Como máximo ${MAX_PAGES} páginas.`); return; }
    try { const c = await compressPhoto(await fileToDataUrl(f)); setPages((p) => [...p, c]); setError(null); }
    catch (e: any) { setError(e.message); }
  };

  const readIndex = async () => {
    if (!pages.length) return;
    setBusy(true); setError(null);
    try {
      const r = await libraryService.scanIndex(childId, pages.map((p) => p.image));
      setTopics(r.topics);
      if (!title && r.title) setTitle(r.title);
      setMode('review');
    } catch (e: any) { setError(e.message); } finally { setBusy(false); }
  };

  const save = () => {
    const list = topics.map((t) => t.trim()).filter(Boolean);
    if (!title.trim()) { setError('Escribe el título del libro.'); return; }
    if (list.length < 1) { setError('El libro necesita al menos un tema.'); return; }
    onBookAdded({ id: crypto.randomUUID(), userId, childId, isbn: isbn.replace(/[^0-9Xx]/g, ''), title: title.trim(), publisher: found?.publisher || found?.meta?.publisher, subject, grade, topics: list, createdAt: Date.now() });
    reset();
  };

  const move = (i: number, d: number) => setPages((p) => { const a = [...p]; const j = i + d; if (j < 0 || j >= a.length) return a; [a[i], a[j]] = [a[j], a[i]]; return a; });

  return (
    <div className="bg-white rounded-[2rem] p-6 border border-blue-50 space-y-4" data-testid="book-manager">
      <div>
        <h3 className="font-black text-lg text-blue-900">📚 Añadir un libro del cole</h3>
        <p className="text-xs text-slate-500">Busca su índice por el ISBN (está en la contraportada, encima del código de barras). Si no aparece o no coincide con el libro de tu hijo, haz fotos de las páginas del índice.</p>
      </div>
      {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-3 py-2 text-sm font-bold" role="alert">{error}</div>}

      {mode === 'search' && (
        <>
          <div className="grid sm:grid-cols-3 gap-2">
            <select value={subject} onChange={(e) => setSubject(e.target.value)} className="bg-slate-50 rounded-xl px-3 py-2 text-sm border border-slate-200" data-testid="book-subject">
              {subjects.map((s) => <option key={s}>{s}</option>)}
            </select>
            <input value={isbn} onChange={(e) => setIsbn(e.target.value)} inputMode="numeric" placeholder="ISBN: 978-84-..." className="bg-slate-50 rounded-xl px-3 py-2 text-sm border border-slate-200" data-testid="book-isbn" />
            <button onClick={search} disabled={busy || isbn.replace(/\D/g, '').length < 10} className="bg-blue-600 disabled:bg-slate-300 text-white rounded-xl px-4 py-2 text-sm font-black" data-testid="book-search">{busy ? 'Buscando en internet…' : '🔎 Buscar índice'}</button>
          </div>
          {found && !found.found && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-900" data-testid="book-not-found">
              {found.meta?.title ? <p><b>Libro:</b> {found.meta.title}{found.meta.publisher ? ` · ${found.meta.publisher}` : ''}</p> : null}
              <p>{found.reason || 'No he encontrado el índice publicado de este libro.'} Haz fotos del índice y lo leo yo.</p>
            </div>
          )}
          <button onClick={() => { setMode('scan'); setError(null); }} className="w-full bg-slate-100 text-slate-700 rounded-xl py-2 text-sm font-black" data-testid="go-scan">📸 Hacer fotos del índice</button>
        </>
      )}

      {mode === 'scan' && (
        <div className="space-y-3" data-testid="index-scan">
          <p className="text-sm text-slate-600">Haz una foto de cada página del índice, <b>en orden</b> (hasta {MAX_PAGES}). De frente y con buena luz.</p>
          <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => { addPage(e.target.files?.[0]); e.target.value = ''; }} data-testid="index-file" />
          <div className="flex flex-wrap gap-2">
            {pages.map((p, i) => (
              <div key={i} className="relative w-24 rounded-xl overflow-hidden border-2 border-slate-200" data-testid="index-page">
                <img src={p.thumb} alt={`Página ${i + 1}`} className="w-full h-28 object-cover" />
                <span className="absolute top-1 left-1 bg-slate-900 text-white text-[10px] font-black rounded px-1.5">{i + 1}</span>
                <div className="flex justify-between bg-white text-xs">
                  <button onClick={() => move(i, -1)} aria-label="Antes" className="px-2">◀</button>
                  <button onClick={() => setPages((a) => a.filter((_, j) => j !== i))} aria-label="Quitar" className="px-2 text-red-600">✕</button>
                  <button onClick={() => move(i, 1)} aria-label="Después" className="px-2">▶</button>
                </div>
              </div>
            ))}
            {pages.length < MAX_PAGES && (
              <button onClick={() => fileRef.current?.click()} className="w-24 h-[8.5rem] rounded-xl border-2 border-dashed border-blue-200 text-blue-600 text-xs font-black">+ Página {pages.length + 1}</button>
            )}
          </div>
          <div className="flex gap-2">
            <button onClick={readIndex} disabled={busy || !pages.length} className="flex-1 bg-blue-600 disabled:bg-slate-300 text-white rounded-xl py-2 text-sm font-black" data-testid="read-index">{busy ? 'Leyendo el índice…' : `Leer el índice (${pages.length} ${pages.length === 1 ? 'página' : 'páginas'})`}</button>
            <button onClick={reset} className="bg-slate-100 text-slate-600 rounded-xl px-4 py-2 text-sm font-black">Cancelar</button>
          </div>
        </div>
      )}

      {mode === 'review' && (
        <div className="space-y-3" data-testid="index-review">
          {found?.found && found.sourceUrl && (
            <p className="text-xs text-slate-500">Índice encontrado en <a href={found.sourceUrl} target="_blank" rel="noreferrer" className="text-blue-600 underline break-all">{found.sourceUrl}</a></p>
          )}
          <p className="text-sm font-bold text-slate-700">¿Coincide con el índice del libro de tu hijo? Puedes corregir, quitar o añadir temas.</p>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Título del libro" className="w-full bg-slate-50 rounded-xl px-3 py-2 text-sm border border-slate-200 font-bold" data-testid="book-title" />
          <ol className="space-y-1.5">
            {topics.map((t, i) => (
              <li key={i} className="flex gap-2 items-center">
                <span className="text-xs text-slate-400 w-5 text-right">{i + 1}</span>
                <input value={t} onChange={(e) => setTopics((a) => a.map((x, j) => j === i ? e.target.value : x))} className="flex-1 bg-slate-50 rounded-lg px-2 py-1.5 text-sm border border-slate-200" />
                <button onClick={() => setTopics((a) => a.filter((_, j) => j !== i))} className="text-red-500 text-sm px-2" aria-label="Quitar tema">✕</button>
              </li>
            ))}
          </ol>
          <form onSubmit={(e) => { e.preventDefault(); if (newTopic.trim()) { setTopics((a) => [...a, newTopic.trim()]); setNewTopic(''); } }} className="flex gap-2">
            <input value={newTopic} onChange={(e) => setNewTopic(e.target.value)} placeholder="Añadir un tema" className="flex-1 bg-slate-50 rounded-lg px-2 py-1.5 text-sm border border-slate-200" />
            <button className="bg-slate-100 rounded-lg px-3 text-sm font-black">+</button>
          </form>
          <div className="flex flex-wrap gap-2">
            <button onClick={save} className="flex-1 bg-emerald-500 text-white rounded-xl py-2.5 text-sm font-black" data-testid="save-book">✅ Sí, guardar el libro</button>
            {found?.found && <button onClick={() => { setMode('scan'); setTopics([]); }} className="flex-1 bg-amber-100 text-amber-800 rounded-xl py-2.5 text-sm font-black" data-testid="mismatch-scan">No coincide: escanear el índice</button>}
            <button onClick={reset} className="bg-slate-100 text-slate-600 rounded-xl px-4 py-2.5 text-sm font-black">Cancelar</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default BookManager;
