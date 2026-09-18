
import React, { useState } from 'react';
import { Child, AICorrection, Subject } from '../types';

interface AICorrectionManagerProps {
  children: Child[];
  corrections: AICorrection[];
  onAddCorrection: (correction: Omit<AICorrection, 'id' | 'timestamp'>) => void;
  onDeleteCorrection: (id: string) => void;
}

const AICorrectionManager: React.FC<AICorrectionManagerProps> = ({ 
  children, corrections, onAddCorrection, onDeleteCorrection 
}) => {
  const [showForm, setShowForm] = useState(false);
  const [childId, setChildId] = useState(children[0]?.id || '');
  const [subject, setSubject] = useState('');
  const [originalQuestion, setOriginalQuestion] = useState('');
  const [incorrectAnswer, setIncorrectAnswer] = useState('');
  const [correction, setCorrection] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!childId || !subject || !originalQuestion || !incorrectAnswer || !correction) return;

    onAddCorrection({
      childId,
      subject,
      originalQuestion,
      incorrectAnswer,
      correction
    });

    setSubject('');
    setOriginalQuestion('');
    setIncorrectAnswer('');
    setCorrection('');
    setShowForm(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-xl font-black text-blue-900">Correcciones de IA</h3>
          <p className="text-xs font-bold text-blue-400">Ayuda a la IA a aprender de sus errores para mejorar las explicaciones.</p>
        </div>
        <button 
          onClick={() => setShowForm(!showForm)}
          className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-xs font-black shadow-md hover:bg-indigo-700 transition-all"
        >
          {showForm ? 'Cancelar' : '+ Nueva Corrección'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-[2rem] border-2 border-indigo-600 shadow-xl animate-in zoom-in duration-300 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-black text-indigo-400 uppercase ml-2">Hijo</label>
              <select 
                value={childId}
                onChange={e => setChildId(e.target.value)}
                className="w-full bg-indigo-50 p-3 rounded-xl font-bold outline-none"
              >
                {children.map(c => <option key={c.id} value={c.id}>{c.avatar} {c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-black text-indigo-400 uppercase ml-2">Asignatura</label>
              <input 
                value={subject}
                onChange={e => setSubject(e.target.value)}
                placeholder="Ej: Matemáticas"
                className="w-full bg-indigo-50 p-3 rounded-xl font-bold outline-none"
                required
              />
            </div>
          </div>
          
          <div>
            <label className="text-[10px] font-black text-indigo-400 uppercase ml-2">Pregunta Original</label>
            <textarea 
              value={originalQuestion}
              onChange={e => setOriginalQuestion(e.target.value)}
              placeholder="¿Qué preguntó el niño?"
              className="w-full bg-indigo-50 p-3 rounded-xl font-bold outline-none h-20 resize-none"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-black text-red-400 uppercase ml-2">Respuesta Incorrecta de la IA</label>
              <textarea 
                value={incorrectAnswer}
                onChange={e => setIncorrectAnswer(e.target.value)}
                placeholder="¿Qué dijo la IA que estaba mal?"
                className="w-full bg-red-50 p-3 rounded-xl font-bold outline-none h-24 resize-none"
                required
              />
            </div>
            <div>
              <label className="text-[10px] font-black text-green-400 uppercase ml-2">Corrección del Padre</label>
              <textarea 
                value={correction}
                onChange={e => setCorrection(e.target.value)}
                placeholder="¿Cuál es la explicación correcta?"
                className="w-full bg-green-50 p-3 rounded-xl font-bold outline-none h-24 resize-none"
                required
              />
            </div>
          </div>

          <button type="submit" className="w-full bg-indigo-600 text-white py-3 rounded-xl font-black shadow-lg">
            Guardar Corrección y Enseñar a la IA 🧠
          </button>
        </form>
      )}

      <div className="space-y-4">
        {corrections.map(item => {
          const child = children.find(c => c.id === item.childId);
          return (
            <div key={item.id} className="bg-white p-6 rounded-[2rem] border border-indigo-50 shadow-sm hover:border-indigo-200 transition-all relative group">
              <button 
                onClick={() => onDeleteCorrection(item.id)}
                className="absolute top-4 right-4 p-2 text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                🗑️
              </button>
              <div className="flex items-center gap-3 mb-4">
                <span className="text-2xl">{child?.avatar || '👤'}</span>
                <div>
                  <h4 className="font-black text-indigo-900">{child?.name || 'Desconocido'}</h4>
                  <p className="text-[10px] font-bold text-indigo-400 uppercase">{item.subject} • {new Date(item.timestamp).toLocaleDateString()}</p>
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="bg-slate-50 p-3 rounded-xl">
                  <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Pregunta</p>
                  <p className="text-sm font-bold text-slate-700 italic">"{item.originalQuestion}"</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="bg-red-50 p-3 rounded-xl border border-red-100">
                    <p className="text-[10px] font-black text-red-400 uppercase mb-1">Error IA</p>
                    <p className="text-sm font-bold text-red-700">{item.incorrectAnswer}</p>
                  </div>
                  <div className="bg-green-50 p-3 rounded-xl border border-green-100">
                    <p className="text-[10px] font-black text-green-400 uppercase mb-1">Corrección</p>
                    <p className="text-sm font-bold text-green-700">{item.correction}</p>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        {corrections.length === 0 && !showForm && (
          <div className="py-12 text-center bg-gray-50 rounded-[2rem] border-2 border-dashed border-gray-200">
            <p className="text-gray-400 font-bold italic">No hay correcciones registradas todavía.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AICorrectionManager;
