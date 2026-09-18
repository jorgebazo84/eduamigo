import React, { useState, useEffect } from 'react';
import { CalligraphySession } from '../types/calligraphy';

interface CalligraphyHistoryProps {
  userId: string;
  childId: string;
  onPracticeAgain?: (session: CalligraphySession) => void;
  onPrintExercise?: (exercise: any) => void;
}

const CalligraphyHistory: React.FC<CalligraphyHistoryProps> = ({ 
  userId, 
  childId, 
  onPracticeAgain,
  onPrintExercise 
}) => {
  const [sessions, setSessions] = useState<CalligraphySession[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState<CalligraphySession | null>(null);

  useEffect(() => {
    const fetchHistory = async () => {
      setLoading(true);
      try {
        const response = await fetch(`api_study.php?action=get_calligraphy_history&userId=${userId}&childId=${childId}`);
        const data = await response.json();
        if (Array.isArray(data)) {
          setSessions(data);
        } else {
          throw new Error('Invalid data');
        }
      } catch (e) {
        console.error("Error cargando historial de caligrafía desde servidor:", e);
      } finally {
        setLoading(false);
      }
    };

    if (userId && childId) {
      fetchHistory();
    }
  }, [userId, childId]);

  if (loading) {
    return <div className="p-8 text-center text-slate-400">Cargando historial de caligrafía...</div>;
  }

  if (sessions.length === 0) {
    return (
      <div className="p-8 text-center bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
        <p className="text-slate-400 italic">No hay sesiones de caligrafía registradas aún.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
        ✍️ Progreso de Caligrafía y Ortografía
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sessions.map((session) => (
          <div 
            key={session.id} 
            onClick={() => setSelectedSession(session)}
            className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all cursor-pointer flex gap-4 items-center group"
          >
            <div className="w-16 h-16 rounded-xl overflow-hidden bg-slate-100 flex-shrink-0 border border-slate-200">
              <img src={session.imageUrl} alt="Escritura" className="w-full h-full object-cover" />
            </div>
            <div className="flex-1">
              <div className="flex justify-between items-start">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  {new Date(session.timestamp).toLocaleDateString()}
                  {session.parentId && <span className="ml-2 text-indigo-500">🔄 Seguimiento</span>}
                </span>
                <span className={`text-xs font-black ${session.analysis.score >= 7 ? 'text-green-500' : 'text-amber-500'}`}>
                  {session.analysis.score}/10
                </span>
              </div>
              <h4 className="font-bold text-slate-800 text-sm truncate">
                {session.analysis.generalFeedback.substring(0, 40)}...
              </h4>
              <p className="text-[10px] text-slate-400 mt-1">
                {session.analysis.spellingErrors.length} errores detectados
              </p>
            </div>
            <span className="text-slate-300 group-hover:text-ewola transition-colors">→</span>
          </div>
        ))}
      </div>

      {selectedSession && (
        <div className="fixed inset-0 z-[300] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-4xl max-h-[90vh] rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-indigo-600 text-white">
              <div>
                <h4 className="font-black text-xl">Detalle de la Sesión</h4>
                <p className="text-xs opacity-80">{new Date(selectedSession.timestamp).toLocaleString()}</p>
              </div>
              <div className="flex items-center gap-4">
                {onPracticeAgain && (
                  <button 
                    onClick={() => {
                      onPracticeAgain(selectedSession);
                      setSelectedSession(null);
                    }}
                    className="bg-white text-indigo-600 px-4 py-2 rounded-xl text-xs font-black hover:bg-indigo-50 transition-all"
                  >
                    🔄 Practicar de Nuevo
                  </button>
                )}
                <button 
                  onClick={() => setSelectedSession(null)}
                  className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-all"
                >
                  ✕
                </button>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-8 space-y-8 no-scrollbar">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <h5 className="font-black text-slate-800 uppercase text-xs tracking-widest">Imagen Analizada</h5>
                  <div className="rounded-2xl overflow-hidden border-4 border-slate-100 shadow-inner bg-slate-50">
                    <img src={selectedSession.imageUrl} alt="Escritura Original" className="w-full h-auto" />
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-blue-50 p-4 rounded-2xl">
                      <span className="text-[10px] font-black text-blue-400 uppercase">Puntuación</span>
                      <p className="text-2xl font-black text-blue-600">{selectedSession.analysis.score}/10</p>
                    </div>
                    <div className="bg-rose-50 p-4 rounded-2xl">
                      <span className="text-[10px] font-black text-rose-400 uppercase">Errores Ortográficos</span>
                      <p className="text-2xl font-black text-rose-600">{selectedSession.analysis.spellingErrors.length}</p>
                    </div>
                  </div>

                  <div className="bg-indigo-50 p-6 rounded-2xl border border-indigo-100">
                    <h5 className="font-black text-indigo-900 uppercase text-[10px] tracking-widest mb-3 flex items-center gap-2">
                      🧠 Evaluación Psicológica y Grafológica
                    </h5>
                    <p className="text-sm text-indigo-800 leading-relaxed italic">
                      {selectedSession.analysis.psychologicalAnalysis || "Análisis no disponible para esta sesión."}
                    </p>
                  </div>

                  <div className="space-y-3">
                    <h5 className="font-black text-slate-800 uppercase text-[10px] tracking-widest">Análisis del Tutor</h5>
                    <div className="bg-white border border-slate-100 p-4 rounded-xl shadow-sm">
                      <span className="text-[10px] font-bold text-slate-400">Legibilidad:</span>
                      <p className="text-xs text-slate-600 mt-1">{selectedSession.analysis.legibility}</p>
                    </div>
                    <div className="bg-white border border-slate-100 p-4 rounded-xl shadow-sm">
                      <span className="text-[10px] font-bold text-slate-400">Trazo:</span>
                      <p className="text-xs text-slate-600 mt-1">{selectedSession.analysis.strokeFeedback}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 p-6 rounded-3xl">
                <h5 className="font-black text-slate-800 uppercase text-[10px] tracking-widest mb-4">Plan de Mejora Asignado</h5>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {selectedSession.analysis.practicePlan.map((ex, i) => (
                    <div key={i} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
                      <div>
                        <h6 className="font-bold text-slate-800 text-xs mb-1">{ex.title}</h6>
                        <p className="text-[10px] text-slate-500 mb-3">{ex.description}</p>
                      </div>
                      {onPrintExercise && (
                        <button 
                          onClick={() => onPrintExercise(ex)}
                          className="text-[10px] font-black text-indigo-600 hover:text-indigo-700 mt-auto pt-2 border-t border-slate-50"
                        >
                          🖨️ Imprimir Ficha
                        </button>
                      )}
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

export default CalligraphyHistory;
