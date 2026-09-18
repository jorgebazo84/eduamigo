import React, { useState } from 'react';
import { Book, StudyTask } from '../types/study';

interface ISBNStudyPlannerProps {
  books: Book[];
  tasks: StudyTask[];
  onAddTask: (task: Omit<StudyTask, 'id' | 'createdAt'>) => void;
}

const ISBNStudyPlanner: React.FC<ISBNStudyPlannerProps> = ({ books, tasks, onAddTask }) => {
  const [selectedBookId, setSelectedBookId] = useState<string>(books[0]?.id || '');
  const [selectedTopicIndex, setSelectedTopicIndex] = useState<number>(0);
  const [points, setPoints] = useState(100);

  const selectedBook = books.find(b => b.id === selectedBookId);

  const handleAssign = () => {
    if (!selectedBook) return;

    const task: Omit<StudyTask, 'id' | 'createdAt'> = {
      bookId: selectedBook.id,
      childId: selectedBook.childId,
      topicIndex: selectedTopicIndex,
      topicTitle: selectedBook.topics[selectedTopicIndex],
      status: 'pending',
      pointsReward: points
    };

    onAddTask(task);
    alert(`Tarea asignada: ${task.topicTitle}`);
  };

  if (books.length === 0) {
    return (
      <div className="p-8 text-center bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
        <p className="text-slate-500 italic">Aún no has registrado ningún libro por ISBN.</p>
      </div>
    );
  }

  return (
    <div className="glass-card p-6 rounded-2xl shadow-lg">
      <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
        🎯 Asignar Tarea de Repaso
      </h3>

      <div className="space-y-6">
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Seleccionar Libro</label>
          <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
            {books.map(book => (
              <button
                key={book.id}
                onClick={() => {
                  setSelectedBookId(book.id);
                  setSelectedTopicIndex(0);
                }}
                className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  selectedBookId === book.id 
                  ? 'bg-ewola text-white shadow-md' 
                  : 'bg-white border border-slate-200 text-slate-600 hover:border-ewola'
                }`}
              >
                {book.subject}: {book.title}
              </button>
            ))}
          </div>
        </div>

        {selectedBook && (
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Seleccionar Tema del Índice</label>
            <select
              value={selectedTopicIndex}
              onChange={(e) => setSelectedTopicIndex(parseInt(e.target.value))}
              className="w-full p-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-ewola"
            >
              {selectedBook.topics.map((topic, index) => (
                <option key={index} value={index}>
                  Tema {index + 1}: {topic}
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Recompensa (Puntos)</label>
          <div className="flex items-center gap-4">
            <input
              type="range"
              min="50"
              max="500"
              step="50"
              value={points}
              onChange={(e) => setPoints(parseInt(e.target.value))}
              className="flex-1 accent-ewola"
            />
            <span className="text-lg font-bold text-ewola w-12 text-center">{points}</span>
          </div>
        </div>

        <button
          onClick={handleAssign}
          className="w-full p-4 bg-slate-800 text-white rounded-xl font-bold hover:bg-slate-700 transition-all shadow-lg active:scale-95"
        >
          📅 Programar para esta semana
        </button>
      </div>

      <div className="mt-8">
        <h4 className="text-sm font-bold text-slate-400 uppercase mb-4">Tareas Programadas</h4>
        <div className="space-y-3">
          {tasks.filter(t => t.status === 'pending').map(task => (
            <div key={task.id} className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-100">
              <div>
                <p className="font-semibold text-slate-700">{task.topicTitle}</p>
                <p className="text-xs text-slate-400">{books.find(b => b.id === task.bookId)?.title}</p>
              </div>
              <div className="bg-yellow-100 text-yellow-700 px-2 py-1 rounded text-xs font-bold">
                +{task.pointsReward} pts
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ISBNStudyPlanner;
