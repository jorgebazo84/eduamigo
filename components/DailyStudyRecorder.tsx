
import React, { useState } from 'react';
import { Child, DailyStudyReport } from '../types';

interface DailyStudyRecorderProps {
  child: Child;
  books: any[]; // Assuming books have an id, title, and indices (array of strings)
  onAddReport: (report: Omit<DailyStudyReport, 'id' | 'timestamp' | 'status'>) => void;
}

const DailyStudyRecorder: React.FC<DailyStudyRecorderProps> = ({ child, books, onAddReport }) => {
  const [selectedBookId, setSelectedBookId] = useState<string>('');
  const [selectedTopics, setSelectedTopics] = useState<number[]>([]);

  const selectedBook = books.find(b => b.id === selectedBookId);

  const handleToggleTopic = (index: number) => {
    setSelectedTopics(prev => 
      prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
    );
  };

  const handleSubmit = () => {
    if (!selectedBookId || selectedTopics.length === 0) return;
    onAddReport({
      childId: child.id,
      bookId: selectedBookId,
      topicIndices: selectedTopics,
      date: new Date().toISOString().split('T')[0]
    });
    setSelectedBookId('');
    setSelectedTopics([]);
  };

  return (
    <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border-2 border-blue-50 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center gap-4 mb-6">
        <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center text-2xl">📝</div>
        <div>
          <h2 className="text-2xl font-black text-blue-900">¿Qué has estudiado hoy?</h2>
          <p className="text-blue-400 font-bold">Cuéntame qué temas habéis dado en el cole.</p>
        </div>
      </div>

      <div className="space-y-6">
        <div>
          <label className="block text-[10px] font-black uppercase tracking-widest text-blue-400 mb-2">Selecciona la asignatura</label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {books.map(book => (
              <button
                key={book.id}
                onClick={() => { setSelectedBookId(book.id); setSelectedTopics([]); }}
                className={`p-4 rounded-2xl font-black text-xs transition-all border-2 ${
                  selectedBookId === book.id 
                  ? 'bg-blue-600 border-blue-600 text-white shadow-lg scale-105' 
                  : 'bg-white border-blue-50 text-blue-900 hover:border-blue-200'
                }`}
              >
                {book.title}
              </button>
            ))}
          </div>
        </div>

        {selectedBook && (
          <div className="animate-in fade-in slide-in-from-top-2 duration-300">
            <label className="block text-[10px] font-black uppercase tracking-widest text-blue-400 mb-2">Selecciona los temas vistos hoy</label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {selectedBook.indices?.map((topic: string, index: number) => (
                <button
                  key={index}
                  onClick={() => handleToggleTopic(index)}
                  className={`p-3 rounded-xl text-left text-xs font-bold transition-all border-2 flex items-center gap-3 ${
                    selectedTopics.includes(index)
                    ? 'bg-blue-50 border-blue-600 text-blue-900'
                    : 'bg-white border-blue-50 text-slate-500 hover:border-blue-100'
                  }`}
                >
                  <div className={`w-5 h-5 rounded-md flex items-center justify-center border-2 ${
                    selectedTopics.includes(index) ? 'bg-blue-600 border-blue-600 text-white' : 'border-blue-100'
                  }`}>
                    {selectedTopics.includes(index) && '✓'}
                  </div>
                  {topic}
                </button>
              ))}
            </div>
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={!selectedBookId || selectedTopics.length === 0}
          className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black text-sm shadow-xl hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-4"
        >
          ENVIAR A MIS PADRES 🚀
        </button>
      </div>
    </div>
  );
};

export default DailyStudyRecorder;
