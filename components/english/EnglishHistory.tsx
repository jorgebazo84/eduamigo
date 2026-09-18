import React, { useState, useEffect } from 'react';
import { EnglishProgress } from '../../types/english';

interface EnglishHistoryProps {
  userId: string;
  childId: string;
}

const EnglishHistory: React.FC<EnglishHistoryProps> = ({ userId, childId }) => {
  const [progress, setProgress] = useState<EnglishProgress | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProgress();
  }, [childId]);

  const fetchProgress = async () => {
    setLoading(true);
    try {
      const response = await fetch(`api_english.php?action=get_progress`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ childId })
      });
      const data = await response.json();
      if (data.status === 'success') {
        setProgress(data.data);
      }
    } catch (err) {
      console.error("Error fetching English progress", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-slate-500">Cargando progreso de inglés...</div>;
  if (!progress) return <div className="p-8 text-center text-slate-500">No hay datos de inglés para este estudiante.</div>;

  return (
    <div className="bg-white p-8 rounded-[2rem] border border-blue-50 shadow-sm space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-black text-blue-900 flex items-center gap-2">
          🇬🇧 Progreso English Academy
        </h3>
        <span className="bg-blue-100 text-blue-700 px-4 py-1 rounded-full text-xs font-bold">
          Método Cambridge
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100">
          <p className="text-blue-400 text-[10px] font-black uppercase mb-1">Nivel Actual</p>
          <p className="text-2xl font-black text-blue-900">{progress.currentLevel}</p>
        </div>
        <div className="bg-amber-50 p-6 rounded-2xl border border-amber-100">
          <p className="text-amber-400 text-[10px] font-black uppercase mb-1">Puntos Acumulados</p>
          <p className="text-2xl font-black text-amber-900">⭐ {progress.points}</p>
        </div>
        <div className="bg-orange-50 p-6 rounded-2xl border border-orange-100">
          <p className="text-orange-400 text-[10px] font-black uppercase mb-1">Racha Actual</p>
          <p className="text-2xl font-black text-orange-900">🔥 {progress.streak} días</p>
        </div>
      </div>

      <div className="space-y-4">
        <h4 className="font-bold text-slate-700">Lecciones Completadas</h4>
        {progress.completedLessons.length === 0 ? (
          <p className="text-sm text-slate-500 italic">Aún no ha completado ninguna lección.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {progress.completedLessons.map((lessonId, idx) => (
              <div key={idx} className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-center">
                <p className="text-xs font-bold text-slate-600">Lección {lessonId}</p>
                <p className="text-[10px] text-emerald-600 font-bold">Completada ✅</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="pt-4 border-t border-slate-100">
        <p className="text-[10px] text-slate-400 uppercase font-bold">Última actividad: {new Date(progress.lastActive).toLocaleDateString()}</p>
      </div>
    </div>
  );
};

export default EnglishHistory;
