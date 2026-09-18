
import React, { useState } from 'react';
import { Child, ReviewPlan, ReviewTask, GradeLevel } from '../types';

interface ReviewTaskModuleProps {
  child: Child;
  plan: ReviewPlan;
  onCompleteTask: (planId: string, taskId: string, answer: string) => void;
}

const ReviewTaskModule: React.FC<ReviewTaskModuleProps> = ({ child, plan, onCompleteTask }) => {
  const [activeTaskId, setActiveTaskId] = useState<string | null>(plan.tasks.find(t => !t.completed)?.id || null);
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false);

  const activeTask = plan.tasks.find(t => t.id === activeTaskId);
  const completedCount = plan.tasks.filter(t => t.completed).length;
  const totalCount = plan.tasks.length;
  const progress = (completedCount / totalCount) * 100;

  const handleSubmit = async () => {
    if (!activeTaskId || !answer) return;
    setLoading(true);
    try {
      await onCompleteTask(plan.id, activeTaskId, answer);
      setAnswer('');
      const nextTask = plan.tasks.find(t => !t.completed && t.id !== activeTaskId);
      if (nextTask) {
        setActiveTaskId(nextTask.id);
      } else {
        setActiveTaskId(null);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (plan.status === 'completed' || !activeTaskId) {
    return (
      <div className="bg-white p-12 rounded-[2.5rem] shadow-xl border-2 border-green-50 text-center animate-in zoom-in duration-500">
        <div className="text-6xl mb-6">🏆</div>
        <h2 className="text-3xl font-black text-green-900 mb-2">¡Misión Cumplida!</h2>
        <p className="text-green-600 font-bold mb-8 italic">Has completado todo el repaso de hoy. ¡Eres un crack!</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
          {plan.tasks.map(task => (
            <div key={task.id} className="bg-green-50 p-6 rounded-2xl text-left border border-green-100">
              <p className="text-[10px] font-black uppercase tracking-widest text-green-400 mb-1">{task.title}</p>
              <p className="text-xs font-bold text-green-900 mb-2">{task.aiFeedback}</p>
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black text-green-500 uppercase">Puntuación</span>
                <span className="text-lg font-black text-green-600">{task.score}/100</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="bg-blue-900 p-8 rounded-[2.5rem] text-white shadow-xl flex flex-col md:flex-row justify-between items-center gap-6">
        <div>
          <h2 className="text-3xl font-black mb-2">Misión de Repaso 🚀</h2>
          <p className="text-blue-300 font-bold">Tus padres te han enviado este plan para que seas el mejor.</p>
          <div className="mt-4 space-y-2">
            <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-blue-200">
              <span>Progreso de la misión</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="w-full h-2 bg-blue-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-green-400 transition-all duration-1000" 
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>
        <div className="bg-blue-800 px-6 py-3 rounded-2xl font-black text-xs text-blue-100 border border-blue-700">
          DIFICULTAD: {plan.difficulty.toUpperCase()}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="space-y-4">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-blue-400">Tareas de hoy</h3>
          {plan.tasks.map((task, index) => (
            <button
              key={task.id}
              onClick={() => !task.completed && setActiveTaskId(task.id)}
              disabled={task.completed}
              className={`w-full p-6 rounded-[2rem] border-2 text-left transition-all flex items-center gap-4 ${
                activeTaskId === task.id 
                ? 'bg-blue-50 border-blue-600 shadow-lg' 
                : task.completed 
                  ? 'bg-green-50 border-green-100 opacity-60' 
                  : 'bg-white border-blue-50 hover:border-blue-200'
              }`}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm ${
                task.completed ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'
              }`}>
                {task.completed ? '✓' : index + 1}
              </div>
              <div className="flex-1">
                <p className={`text-xs font-black ${task.completed ? 'text-green-900 line-through' : 'text-blue-900'}`}>{task.title}</p>
                <p className="text-[10px] text-slate-400 italic truncate">{task.description}</p>
              </div>
            </button>
          ))}
        </div>

        <div className="md:col-span-2">
          {activeTask && (
            <div className="bg-white p-8 rounded-[2.5rem] border-2 border-blue-50 shadow-xl animate-in slide-in-from-right-4 duration-500">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center text-2xl">✍️</div>
                <div>
                  <h3 className="text-2xl font-black text-blue-900">{activeTask.title}</h3>
                  <p className="text-blue-400 font-bold italic">{activeTask.description}</p>
                </div>
              </div>

              <div className="space-y-6">
                <textarea
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  placeholder="Escribe tu respuesta aquí..."
                  className="w-full h-48 p-6 rounded-[2rem] border-2 border-blue-50 bg-blue-50/30 focus:border-blue-600 focus:bg-white transition-all text-blue-900 font-bold text-sm outline-none resize-none"
                />

                <button
                  onClick={handleSubmit}
                  disabled={!answer || loading}
                  className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black text-sm shadow-xl hover:bg-blue-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : 'ENVIAR RESPUESTA 🚀'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReviewTaskModule;
