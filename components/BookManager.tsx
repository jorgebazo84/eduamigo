import React, { useState } from 'react';
import { studyService } from '../services/studyService';
import { Book, ISBNLookupResponse } from '../types/study';
import { Subject, GradeLevel } from '../types';

interface BookManagerProps {
  userId: string;
  childId: string;
  onBookAdded: (book: Book) => void;
}

const BookManager: React.FC<BookManagerProps> = ({ userId, childId, onBookAdded }) => {
  const [isbn, setIsbn] = useState('');
  const [subject, setSubject] = useState<Subject | string>('Matemáticas');
  const [grade, setGrade] = useState<GradeLevel | string>('4º Primaria');
  const [publisher, setPublisher] = useState('');
  const [publisherSuggestions, setPublisherSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<ISBNLookupResponse['books']>([]);
  const [showSelection, setShowSelection] = useState(false);

  const handlePublisherChange = async (val: string) => {
    setPublisher(val);
    if (val.length >= 2) {
      try {
        const suggestions = await studyService.suggestPublishers(val);
        setPublisherSuggestions(suggestions);
      } catch (err) {
        console.error("Error fetching suggestions", err);
      }
    } else {
      setPublisherSuggestions([]);
    }
  };

  const handleLookup = async () => {
    if (!isbn) return;
    setLoading(true);
    setError(null);
    setResults([]);
    setShowSelection(false);
    try {
      const data = await studyService.lookupBookByISBN(isbn, subject, grade, publisher);
      
      if (data.books.length === 0) {
        setError('No pudimos encontrar el libro. Verifica el ISBN e inténtalo de nuevo.');
        return;
      }

      if (data.books.length === 1) {
        addBook(data.books[0]);
      } else {
        setResults(data.books);
        setShowSelection(true);
      }
    } catch (err) {
      setError('Error al buscar el libro. Inténtalo de nuevo.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const addBook = (bookData: ISBNLookupResponse['books'][0]) => {
    const newBook: Book = {
      id: crypto.randomUUID(),
      userId,
      childId,
      isbn,
      title: bookData.title,
      publisher: bookData.publisher,
      subject,
      grade: bookData.suggestedGrade || grade,
      topics: bookData.topics,
      createdAt: Date.now()
    };

    onBookAdded(newBook);
    setIsbn('');
    setPublisher('');
    setResults([]);
    setShowSelection(false);
  };

  return (
    <div className="glass-card p-6 rounded-2xl shadow-lg border border-white/20">
      <h3 className="text-xl font-bold text-ewola mb-4 flex items-center gap-2">
        📚 Registrar Libro de Texto
      </h3>
      <p className="text-sm text-slate-600 mb-6">
        Introduce el ISBN y opcionalmente la editorial para recuperar los temas automáticamente.
      </p>

      {!showSelection ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">ISBN</label>
              <input
                type="text"
                value={isbn}
                onChange={(e) => setIsbn(e.target.value)}
                placeholder="Ej: 9788467586930"
                className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-ewola outline-none transition-all"
              />
            </div>
            <div className="relative">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Editorial (Opcional)</label>
              <input
                type="text"
                value={publisher}
                onChange={(e) => handlePublisherChange(e.target.value)}
                placeholder="Ej: SM, Santillana..."
                className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-ewola outline-none transition-all"
              />
              {publisherSuggestions.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden">
                  {publisherSuggestions.map((s, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        setPublisher(s);
                        setPublisherSuggestions([]);
                      }}
                      className="w-full text-left px-4 py-2 text-sm hover:bg-sky-50 transition-colors"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Asignatura</label>
              <select
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full p-3 rounded-xl border border-slate-200 outline-none"
              >
                <option>Matemáticas</option>
                <option>Lengua</option>
                <option>Ciencias Naturales</option>
                <option>Ciencias Sociales</option>
                <option>Inglés</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Curso</label>
              <input
                type="text"
                value={grade}
                onChange={(e) => setGrade(e.target.value)}
                className="w-full p-3 rounded-xl border border-slate-200 outline-none"
              />
            </div>
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <button
            onClick={handleLookup}
            disabled={loading || !isbn}
            className={`w-full p-4 rounded-xl font-bold text-white transition-all shadow-md ${
              loading ? 'bg-slate-400' : 'bg-ewola hover:bg-sky-500'
            }`}
          >
            {loading ? 'Buscando temas...' : '🔍 Buscar y Añadir Libro'}
          </button>
        </div>
      ) : (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
          <p className="text-sm font-semibold text-slate-700">Se han encontrado varios libros. Selecciona el correcto:</p>
          <div className="space-y-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
            {results.map((book, idx) => (
              <button
                key={idx}
                onClick={() => addBook(book)}
                className="w-full text-left p-4 rounded-xl border border-slate-100 hover:border-ewola hover:bg-sky-50 transition-all group"
              >
                <p className="font-bold text-slate-800 group-hover:text-ewola">{book.title}</p>
                <p className="text-xs text-slate-500">{book.publisher} • {book.suggestedGrade || grade} • {book.topics.length} temas</p>
              </button>
            ))}
          </div>
          <button
            onClick={() => setShowSelection(false)}
            className="w-full p-3 text-sm font-bold text-slate-500 hover:text-slate-700 transition-all"
          >
            ← Volver a buscar
          </button>
        </div>
      )}
    </div>
  );
};

export default BookManager;
