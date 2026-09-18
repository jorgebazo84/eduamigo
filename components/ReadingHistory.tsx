import React, { useState, useEffect } from 'react';
import { ReadingSession } from '../types/reading';

interface ReadingHistoryProps {
  userId: string;
  childId: string;
}

const ReadingHistory: React.FC<ReadingHistoryProps> = ({ userId, childId }) => {
  const [sessions, setSessions] = useState<ReadingSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState<ReadingSession | null>(null);

  useEffect(() => {
    const fetchHistory = async () => {
      setLoading(true);
      try {
        if (userId && userId !== 'demo') {
          const response = await fetch(`api_study.php?action=get_reading_history&userId=${userId}&childId=${childId}`);
          const data = await response.json();
          setSessions(data);
        }
      } catch (e) {
        console.error("Error loading reading history:", e);
      } finally {
        setLoading(false);
      }
    };

    if (childId) {
      fetchHistory();
    }
  }, [childId]);

  if (loading) {
    return <div className="p-8 text-center text-slate-400 text-xs font-bold">Cargando historial de lectura...</div>;
  }

  if (sessions.length === 0) {
    return (
      <div className="p-8 text-center bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
        <p className="text-slate-400 italic text-sm">No hay sesiones de lectura registradas aún. 📖</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
        📖 Progreso de Lectura
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sessions.map((session) => (
          <div 
            key={session.id} 
            onClick={() => setSelectedSession(session)}
            className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all cursor-pointer flex gap-4 items-center group"
          >
            <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-2xl flex-shrink-0">
              🎙️
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
                {session.text.substring(0, 40)}...
              </h4>
              <p className="text-[10px] text-slate-400 mt-1">
                Fluidez: {session.analysis.fluency}/10 · Comprensión: {session.analysis.comprehension}/10
              </p>
            </div>
            <span className="text-slate-300 group-hover:text-blue-600 transition-colors">→</span>
          </div>
        ))}
      </div>

      {selectedSession && (
        <div className="fixed inset-0 z-[300] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-4xl max-h-[90vh] rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-blue-600 text-white">
              <div>
                <h4 className="font-black text-xl">Detalle de Lectura</h4>
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
                  <h5 className="font-black text-slate-800 uppercase text-xs tracking-widest">Texto Leído</h5>
                  <div className="p-6 rounded-2xl border-2 border-blue-50 bg-blue-50/30 text-slate-700 leading-relaxed italic">
                    "{selectedSession.text}"
                  </div>
                  {selectedSession.audioUrl && (
                    <div className="mt-4">
                       <h5 className="font-black text-slate-800 uppercase text-[10px] tracking-widest mb-2">Grabación</h5>
                       <audio controls src={selectedSession.audioUrl} className="w-full" />
                    </div>
                  )}
                </div>

                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-blue-50 p-4 rounded-2xl">
                      <span className="text-[10px] font-black text-blue-400 uppercase">Puntuación General</span>
                      <p className="text-2xl font-black text-blue-600">{selectedSession.analysis.score}/10</p>
                    </div>
                    <div className="bg-emerald-50 p-4 rounded-2xl">
                      <span className="text-[10px] font-black text-emerald-400 uppercase">Fluidez</span>
                      <p className="text-2xl font-black text-emerald-600">{selectedSession.analysis.fluency}/10</p>
                    </div>
                  </div>

                  <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                    <h5 className="font-black text-slate-800 uppercase text-[10px] tracking-widest mb-3">
                      📝 Feedback Detallado
                    </h5>
                    <p className="text-sm text-slate-600 leading-relaxed">
                      {selectedSession.analysis.feedback}
                    </p>
                  </div>

                  <div className="space-y-3">
                    <h5 className="font-black text-slate-800 uppercase text-[10px] tracking-widest">Métricas Clave</h5>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-white border border-slate-100 p-3 rounded-xl shadow-sm">
                        <span className="text-[10px] font-bold text-slate-400">Entonación:</span>
                        <p className="text-xs font-black text-slate-700">{selectedSession.analysis.intonation}/10</p>
                      </div>
                      <div className="bg-white border border-slate-100 p-3 rounded-xl shadow-sm">
                        <span className="text-[10px] font-bold text-slate-400">Precisión:</span>
                        <p className="text-xs font-black text-slate-700">{selectedSession.analysis.accuracy}/10</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 p-6 rounded-3xl">
                <h5 className="font-black text-blue-800 uppercase text-[10px] tracking-widest mb-4">Ejercicios Recomendados</h5>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {selectedSession.analysis.suggestedExercises.map((ex, i) => (
                    <div key={i} className="bg-white p-4 rounded-xl border border-blue-100 shadow-sm">
                      <h6 className="font-bold text-blue-900 text-xs mb-1">{ex.title}</h6>
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

export default ReadingHistory;
