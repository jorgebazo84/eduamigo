
import React, { useState, useEffect, useRef } from 'react';
import { GradeLevel, Subject, Region, ChatTurn } from '../types';
import { getChatExplanation, analyzeSentiment, GeminiError } from '../services/geminiService';

interface ChatInterfaceProps {
  grade: GradeLevel;
  subject: Subject;
  region: Region;
  onActivityLog?: (question: string, subject: Subject, answer: any) => void;
}

const GRADES: GradeLevel[] = [
  '1º Primaria', '2º Primaria', '3º Primaria', '4º Primaria', '5º Primaria', '6º Primaria',
  '1º ESO', '2º ESO', '3º ESO', '4º ESO',
  '1º Bachillerato', '2º Bachillerato'
];

const SUBJECTS: Subject[] = [
  'Matemáticas', 'Ciencias Naturales', 'Historia', 'Lengua y Literatura', 
  'Inglés', 'Geografía', 'Física y Química', 'Arte'
];

const ChatInterface: React.FC<ChatInterfaceProps> = ({ grade, subject, region, onActivityLog }) => {
  const [localGrade, setLocalGrade] = useState<GradeLevel>(grade);
  const [localSubject, setLocalSubject] = useState<Subject>(subject);
  const [history, setHistory] = useState<ChatTurn[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSocratic, setIsSocratic] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLocalGrade(grade);
    setLocalSubject(subject);
  }, [grade, subject]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [history]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    setError(null);
    const userTurn: ChatTurn = { role: 'user', parts: [{ text: input }] };
    const newHistory = [...history, userTurn];
    setHistory(newHistory);
    setInput('');
    setLoading(true);

    try {
      const [responseText, sentiment] = await Promise.all([
        getChatExplanation(localGrade, localSubject, newHistory, region, isSocratic),
        analyzeSentiment(input)
      ]);
      
      setHistory([...newHistory, { role: 'model', parts: [{ text: responseText }] }]);

      if (onActivityLog) {
        onActivityLog(input, localSubject, {
          text: responseText,
          type: 'chat_explanation',
          sentiment
        });
      }
    } catch (err: any) {
      console.error(err);
      if (err instanceof GeminiError && err.status === 429) {
        setError("Límite de cuota alcanzado. Vuelve a intentarlo en un momento.");
      } else {
        setError("Error de conexión. Inténtalo de nuevo.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="bg-blue-600 rounded-[2.5rem] p-8 md:p-10 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10">
          <h2 className="text-2xl md:text-3xl font-bold mb-4">Chat Interactivo ✨</h2>
          
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-black uppercase opacity-70">Asignatura</label>
              <select 
                value={localSubject}
                onChange={(e) => setLocalSubject(e.target.value as Subject)}
                className="bg-white/10 border border-white/20 rounded-xl px-4 py-2 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-white/50"
              >
                {SUBJECTS.map(s => <option key={s} value={s} className="text-slate-900">{s}</option>)}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-black uppercase opacity-70">Curso</label>
              <select 
                value={localGrade}
                onChange={(e) => setLocalGrade(e.target.value as GradeLevel)}
                className="bg-white/10 border border-white/20 rounded-xl px-4 py-2 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-white/50"
              >
                {GRADES.map(g => <option key={g} value={g} className="text-slate-900">{g}</option>)}
              </select>
            </div>
          </div>

          <p className="opacity-90 max-w-lg mt-6 text-xs md:text-sm font-medium">
            Pregúntame lo que quieras sobre {localSubject} ({localGrade}). ¡Estoy aquí para ayudarte!
          </p>
        </div>
        <div className="absolute top-0 right-0 p-8 opacity-20 text-8xl">💬</div>
      </div>

      <div className="bg-white rounded-[2.5rem] shadow-xl border-2 border-blue-100 flex flex-col h-[600px] overflow-hidden">
        <div className="p-6 border-b border-blue-50 flex justify-between items-center bg-blue-50/50">
          <div>
            <h2 className="text-xl font-black text-blue-900">Conversación ✨</h2>
            <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">{localSubject} • {localGrade}</p>
          </div>
          <button 
            onClick={() => setIsSocratic(!isSocratic)}
            className={`px-4 py-2 rounded-xl text-[10px] font-black transition-all ${isSocratic ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-indigo-400 border border-indigo-100'}`}
          >
            {isSocratic ? '🧠 MODO SOCRÁTICO ACTIVO' : '🧠 ACTIVAR MODO SOCRÁTICO'}
          </button>
        </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4 no-scrollbar">
        {history.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center opacity-40">
            <span className="text-6xl mb-4">💬</span>
            <p className="font-bold text-blue-900">Pregúntame lo que quieras sobre {localSubject}.<br/>Recuerdo lo que hablamos en este chat.</p>
          </div>
        )}
        {history.map((turn, i) => (
          <div key={i} className={`flex ${turn.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] p-4 rounded-3xl font-medium text-sm leading-relaxed ${
              turn.role === 'user' 
              ? 'bg-blue-600 text-white rounded-tr-none' 
              : 'bg-blue-50 text-blue-900 rounded-tl-none border border-blue-100'
            }`}>
              {turn.parts[0].text}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-blue-50 p-4 rounded-3xl rounded-tl-none animate-pulse text-blue-400 font-black text-xs">
              Escribiendo...
            </div>
          </div>
        )}
        {error && (
          <div className="text-center p-2 bg-red-50 text-red-500 rounded-xl text-xs font-bold">
            {error}
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="p-6 bg-gray-50 border-t border-blue-50 flex gap-3">
        <input 
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Dime más sobre esto..."
          className="flex-1 bg-white p-4 rounded-2xl text-sm font-bold outline-none border-2 border-transparent focus:border-blue-500 shadow-sm"
        />
        <button 
          type="submit"
          disabled={loading || !input.trim()}
          className="bg-blue-600 text-white px-6 py-4 rounded-2xl font-black shadow-lg hover:bg-blue-700 disabled:opacity-50 transition-all"
        >
          →
        </button>
      </form>
      </div>
    </div>
  );
};

export default ChatInterface;
