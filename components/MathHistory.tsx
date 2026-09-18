import React, { useState, useEffect } from 'react';
import { MathSession } from '../types/math';

interface MathHistoryProps {
  userId: string;
  childId: string;
}

const MathHistory: React.FC<MathHistoryProps> = ({ userId, childId }) => {
  const [sessions, setSessions] = useState<MathSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState<MathSession | null>(null);

  useEffect(() => {
    const fetchHistory = async () => {
      setLoading(true);
      try {
        if (userId && userId !== 'demo') {
          const response = await fetch(`api_study.php?action=get_math_history&userId=${userId}&childId=${childId}`);
          const data = await response.json();
          setSessions(data);
        }
      } catch (e) {
        console.error("Error loading math history:", e);
      } finally {
        setLoading(false);
      }
    };

    if (childId) {
      fetchHistory();
    }
  }, [childId]);

  if (loading) {
    return <div className="p-8 text-center text-slate-400 text-xs font-bold">Cargando historial de matemáticas...</div>;
  }

  if (sessions.length === 0) {
    return (
      <div className="p-8 text-center bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
        <p className="text-slate-400 italic text-sm">No hay sesiones de matemáticas registradas aún. 🔢</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
        🔢 Progreso de Matemáticas
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sessions.map((session) => (
          <div 
            key={session.id} 
            onClick={() => setSelectedSession(session)}
            className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all cursor-pointer flex gap-4 items-center group"
          >
            <div className="w-12 h-12 rounded-xl bg-orange-50 flex items-center justify-center text-2xl flex-shrink-0">
              🧮
            </div>
            <div className="flex-1">
              <div className="flex justify-between items-start">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  {new Date(session.timestamp).toLocaleDateString()}
                </span>
                <span className={`text-xs font-black ${session.analysis.score >= 7 ? 'text-green-500' : 'text-amber-500'}`}>
                  {session.analysis.score}/10
                </span>
              </div>
              <h4 className="font-bold text-slate-800 text-sm truncate">
                {session.analysis.topic}
              </h4>
              <p className="text-[10px] text-slate-400 mt-1">
                {session.analysis.errors.length} errores detectados · {session.analysis.steps.length} pasos analizados
              </p>
            </div>
            <span className="text-slate-300 group-hover:text-orange-600 transition-colors">→</span>
          </div>
        ))}
      </div>

      {selectedSession && (
        <div className="fixed inset-0 z-[300] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-4xl max-h-[90vh] rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-orange-600 text-white">
              <div>
                <h4 className="font-black text-xl">Detalle de Matemáticas</h4>
                <p className="text-xs opacity-80">{new Date(selectedSession.timestamp).toLocaleString()}</p>
              </div>
              <button 
                onClick={() => setSelectedSession(null)}
                className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-all"
              >
                ✕
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-8 space-y-8 no-scrollbar">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <h5 className="font-black text-slate-800 uppercase text-xs tracking-widest">Imagen Analizada</h5>
                  <div className="rounded-2xl overflow-hidden border-4 border-slate-100 shadow-inner bg-slate-50">
                    <img src={selectedSession.imageUrl} alt="Operación Matemática" className="w-full h-auto" />
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-orange-50 p-4 rounded-2xl">
                      <span className="text-[10px] font-black text-orange-400 uppercase">Puntuación</span>
                      <p className="text-2xl font-black text-orange-600">{selectedSession.analysis.score}/10</p>
                    </div>
                    <div className="bg-rose-50 p-4 rounded-2xl">
                      <span className="text-[10px] font-black text-rose-400 uppercase">Errores</span>
                      <p className="text-2xl font-black text-rose-600">{selectedSession.analysis.errors.length}</p>
                    </div>
                  </div>

                  <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                    <h5 className="font-black text-slate-800 uppercase text-[10px] tracking-widest mb-3">
                      🧠 Análisis del Tutor
                    </h5>
                    <p className="text-sm text-slate-600 leading-relaxed italic">
                      {selectedSession.analysis.feedback}
                    </p>
                  </div>

                  <div className="space-y-3">
                    <h5 className="font-black text-slate-800 uppercase text-[10px] tracking-widest">Pasos Analizados</h5>
                    <div className="space-y-2">
                      {selectedSession.analysis.steps.map((step, i) => (
                        <div key={i} className="bg-white border border-slate-100 p-3 rounded-xl shadow-sm">
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-[10px] font-bold text-slate-400">Paso {i + 1}:</span>
                            <span className={`text-[10px] font-black ${step.isCorrect ? 'text-green-500' : 'text-rose-500'}`}>
                              {step.isCorrect ? '✓ Correcto' : '✗ Error'}
                            </span>
                          </div>
                          <p className="text-xs font-black text-slate-700">{step.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-orange-50 p-6 rounded-3xl">
                <h5 className="font-black text-orange-800 uppercase text-[10px] tracking-widest mb-4">Ejercicios de Refuerzo</h5>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {selectedSession.analysis.suggestedExercises.map((ex, i) => (
                    <div key={i} className="bg-white p-4 rounded-xl border border-orange-100 shadow-sm">
                      <h6 className="font-bold text-orange-900 text-xs mb-1">{ex.title}</h6>
                      <p className="text-[10px] text-slate-500">{ex.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MathHistory;
