import React from 'react';
import { Book } from '../types/study';

interface BookListProps {
  books: Book[];
  onDeleteBook: (id: string) => void;
}

const BookList: React.FC<BookListProps> = ({ books, onDeleteBook }) => {
  if (books.length === 0) {
    return (
      <div className="glass-card p-6 rounded-2xl border-2 border-dashed border-slate-200 text-center">
        <p className="text-slate-400 italic">No hay libros registrados para este perfil.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-xl font-bold text-ewola flex items-center gap-2">
        📚 Libros Registrados ({books.length})
      </h3>
      <div className="grid grid-cols-1 gap-3">
        {books.map((book) => (
          <div 
            key={book.id} 
            className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex justify-between items-center group hover:border-ewola/30 transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-ewola/10 rounded-lg flex items-center justify-center text-xl">
                📖
              </div>
              <div>
                <h4 className="font-bold text-slate-800 text-sm leading-tight">{book.title}</h4>
                <div className="flex gap-2 mt-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-ewola bg-ewola/5 px-1.5 py-0.5 rounded">
                    {book.subject}
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    ISBN: {book.isbn}
                  </span>
                </div>
              </div>
            </div>
            <button 
              onClick={() => {
                if(window.confirm(`¿Estás seguro de eliminar "${book.title}"?`)) {
                  onDeleteBook(book.id);
                }
              }}
              className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
              title="Eliminar libro"
            >
              🗑️
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default BookList;
