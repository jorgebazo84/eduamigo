
import React from 'react';
import { GradeLevel, Subject } from '../types';

interface StudyFormProps {
  grade: GradeLevel;
  setGrade: (g: GradeLevel) => void;
  subject: Subject;
  setSubject: (s: Subject) => void;
  question: string;
  setQuestion: (q: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onSOS?: () => void;
  loading: boolean;
  isDictating?: boolean;
  onDictate?: () => void;
}

const grades: GradeLevel[] = [
  '1º Primaria', '2º Primaria', '3º Primaria', '4º Primaria', '5º Primaria', '6º Primaria',
  '1º ESO', '2º ESO', '3º ESO', '4º ESO',
  '1º Bachillerato', '2º Bachillerato'
];

const subjects: { name: Subject; icon: string }[] = [
  { name: 'Matemáticas', icon: '🔢' },
  { name: 'Ciencias Naturales', icon: '🌿' },
  { name: 'Historia', icon: '📜' },
  { name: 'Lengua y Literatura', icon: '📖' },
  { name: 'Inglés', icon: '🌍' },
  { name: 'Geografía', icon: '🗺️' },
  { name: 'Física y Química', icon: '🧪' },
  { name: 'Arte', icon: '🎨' },
];

const StudyForm: React.FC<StudyFormProps> = ({
  grade, setGrade, subject, setSubject, question, setQuestion, onSubmit, onSOS, loading, isDictating, onDictate
}) => {
  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-semibold text-blue-800 ml-1">¿En qué curso estás?</label>
          <select 
            value={grade}
            onChange={(e) => setGrade(e.target.value as GradeLevel)}
            className="w-full bg-white border-2 border-blue-100 rounded-xl px-4 py-3 focus:border-blue-500 focus:ring-0 transition-all outline-none text-blue-900"
          >
            {grades.map(g => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold text-blue-800 ml-1">¿Qué materia estás estudiando?</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {subjects.map(s => (
              <button
                key={s.name}
                type="button"
                onClick={() => setSubject(s.name)}
                className={`flex flex-col items-center justify-center p-2 rounded-xl border-2 transition-all ${
                  subject === s.name 
                    ? 'bg-blue-600 border-blue-600 text-white shadow-md transform scale-105' 
                    : 'bg-white border-blue-50 text-blue-900 hover:border-blue-200'
                }`}
              >
                <span className="text-xl mb-1">{s.icon}</span>
                <span className="text-[10px] font-bold leading-tight text-center">{s.name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-2 relative">
        <div className="flex justify-between items-center mb-1">
          <label className="text-sm font-semibold text-blue-800 ml-1">¿Cuál es tu duda?</label>
          <div className="flex gap-2">
            <button 
              type="button" 
              onClick={onDictate}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all ${isDictating ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-blue-100 text-blue-600 hover:bg-blue-200'}`}
            >
              🎤 {isDictating ? 'Escuchando...' : 'Dictar'}
            </button>
            <button 
              type="button" 
              onClick={onSOS}
              className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-red-100 text-red-600 hover:bg-red-600 hover:text-white transition-all border border-red-200"
            >
              🚨 Botón SOS
            </button>
          </div>
        </div>
        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ej: ¿Por qué el cielo es azul? o ¿Cómo funcionan las fracciones?"
          className="w-full bg-white border-2 border-blue-100 rounded-2xl px-5 py-4 min-h-[120px] focus:border-blue-500 focus:ring-0 transition-all outline-none text-lg text-blue-900 shadow-inner resize-none"
          required
        />
        <div className="absolute bottom-4 right-4 flex gap-2">
          <button
            type="submit"
            disabled={loading || !question.trim()}
            className="bg-blue-600 text-white px-6 py-2 rounded-xl font-bold shadow-lg hover:bg-blue-700 active:transform active:scale-95 transition-all disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? 'Pensando...' : 'Preguntar ✨'}
          </button>
        </div>
      </div>
      
      <div className="text-center">
        <button 
          type="button" 
          onClick={onSOS}
          className="text-xs font-black text-red-400 hover:text-red-600 transition-all uppercase tracking-widest"
        >
          “No entiendo este ejercicio, explícame con ejemplos de mi país.”
        </button>
      </div>
    </form>
  );
};

export default StudyForm;
