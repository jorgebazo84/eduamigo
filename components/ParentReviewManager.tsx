
import React, { useState } from 'react';
import { Child, DailyStudyReport, ReviewPlan, ReviewTask, GradeLevel } from '../types';
import { generateReviewTasks } from '../services/geminiService';

interface ParentReviewManagerProps {
  children: Child[];
  reports: DailyStudyReport[];
  reviewPlans: ReviewPlan[];
  books: any[];
  onCreatePlan: (plan: Omit<ReviewPlan, 'id' | 'status'>) => void;
}

const ParentReviewManager: React.FC<ParentReviewManagerProps> = ({ children, reports, reviewPlans, books, onCreatePlan }) => {
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [loading, setLoading] = useState(false);
  const [proposedTasks, setProposedTasks] = useState<Omit<ReviewTask, 'id' | 'completed'>[]>([]);
  const [selectedTaskIndices, setSelectedTaskIndices] = useState<number[]>([]);

  const selectedReport = reports.find(r => r.id === selectedReportId);
  const child = children.find(c => c.id === selectedReport?.childId);
  const book = books.find(b => b.id === selectedReport?.bookId);

  const handleGenerateTasks = async () => {
    if (!selectedReport || !child || !book) return;
    setLoading(true);
    try {
      const topics = selectedReport.topicIndices.map(i => book.indices[i]);
      const tasks = await generateReviewTasks(child.grade as GradeLevel, topics, difficulty);
      setProposedTasks(tasks);
      setSelectedTaskIndices(tasks.map((_, i) => i));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSendPlan = () => {
    if (!selectedReport || !child) return;
    const tasks: ReviewTask[] = proposedTasks
      .filter((_, i) => selectedTaskIndices.includes(i))
      .map(t => ({ ...t, id: crypto.randomUUID(), completed: false }));

    onCreatePlan({
      childId: child.id,
      reportId: selectedReport.id,
      date: new Date().toISOString().split('T')[0],
      difficulty,
      tasks
    });
    setSelectedReportId(null);
    setProposedTasks([]);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="bg-indigo-900 p-8 rounded-[2.5rem] text-white shadow-xl">
        <h2 className="text-3xl font-black mb-2">Gestión de Repaso Diario 🧠</h2>
        <p className="text-indigo-300 font-bold italic">Supervisa lo que han estudiado hoy y crea un plan de refuerzo a medida.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-4">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-indigo-400">Informes Pendientes</h3>
          {reports.filter(r => r.status === 'pending').map(report => {
            const c = children.find(child => child.id === report.childId);
            const b = books.find(book => book.id === report.bookId);
            return (
              <button
                key={report.id}
                onClick={() => setSelectedReportId(report.id)}
                className={`w-full p-6 rounded-[2rem] border-2 text-left transition-all flex items-center gap-4 ${
                  selectedReportId === report.id 
                  ? 'bg-indigo-50 border-indigo-600 shadow-lg' 
                  : 'bg-white border-indigo-50 hover:border-indigo-200'
                }`}
              >
                <div className="w-12 h-12 bg-indigo-100 rounded-2xl flex items-center justify-center text-2xl">{c?.avatar}</div>
                <div className="flex-1">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-black text-indigo-900">{c?.name}</span>
                    <span className="text-[10px] font-bold text-indigo-400 uppercase">{report.date}</span>
                  </div>
                  <p className="text-xs text-indigo-600 font-bold">{b?.title}</p>
                  <p className="text-[10px] text-slate-400 italic truncate">{report.topicIndices.map(i => b?.indices[i]).join(', ')}</p>
                </div>
              </button>
            );
          })}
          {reports.filter(r => r.status === 'pending').length === 0 && (
            <div className="p-12 text-center bg-gray-50 rounded-[2rem] border-2 border-dashed border-gray-200">
              <p className="text-gray-400 font-bold italic">No hay informes nuevos hoy.</p>
            </div>
          )}
        </div>

        <div className="space-y-6">
          {selectedReport ? (
            <div className="bg-white p-8 rounded-[2.5rem] border-2 border-indigo-50 shadow-xl animate-in slide-in-from-right-4 duration-500">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-black text-indigo-900">Crear Plan de Repaso</h3>
                <button onClick={() => setSelectedReportId(null)} className="text-slate-400 hover:text-red-500">✕</button>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-indigo-400 mb-2">Nivel de Dificultad</label>
                  <div className="flex gap-2">
                    {(['easy', 'medium', 'hard'] as const).map(d => (
                      <button
                        key={d}
                        onClick={() => setDifficulty(d)}
                        className={`flex-1 py-3 rounded-xl font-black text-[10px] uppercase transition-all border-2 ${
                          difficulty === d 
                          ? 'bg-indigo-600 border-indigo-600 text-white shadow-md' 
                          : 'bg-white border-indigo-50 text-indigo-400 hover:border-indigo-200'
                        }`}
                      >
                        {d === 'easy' ? 'Fácil' : d === 'medium' ? 'Medio' : 'Difícil'}
                      </button>
                    ))}
                  </div>
                </div>

                {!proposedTasks.length ? (
                  <button
                    onClick={handleGenerateTasks}
                    disabled={loading}
                    className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-sm shadow-xl hover:bg-indigo-700 transition-all flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : 'GENERAR TAREAS CON IA 🤖'}
                  </button>
                ) : (
                  <div className="space-y-4 animate-in fade-in duration-300">
                    <label className="block text-[10px] font-black uppercase tracking-widest text-indigo-400">Selecciona las tareas a enviar</label>
                    <div className="space-y-2">
                      {proposedTasks.map((task, index) => (
                        <button
                          key={index}
                          onClick={() => setSelectedTaskIndices(prev => 
                            prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
                          )}
                          className={`w-full p-4 rounded-xl text-left transition-all border-2 flex items-start gap-3 ${
                            selectedTaskIndices.includes(index)
                            ? 'bg-indigo-50 border-indigo-600'
                            : 'bg-white border-indigo-50 text-slate-400'
                          }`}
                        >
                          <div className={`mt-1 w-4 h-4 rounded flex-shrink-0 flex items-center justify-center border-2 ${
                            selectedTaskIndices.includes(index) ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-indigo-100'
                          }`}>
                            {selectedTaskIndices.includes(index) && '✓'}
                          </div>
                          <div>
                            <p className={`text-xs font-black ${selectedTaskIndices.includes(index) ? 'text-indigo-900' : 'text-slate-400'}`}>{task.title}</p>
                            <p className="text-[10px] italic mt-1">{task.description}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={handleSendPlan}
                      className="w-full py-4 bg-green-500 text-white rounded-2xl font-black text-sm shadow-xl hover:bg-green-600 transition-all mt-4"
                    >
                      ENVIAR PLAN A {child?.name.toUpperCase()} 🚀
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white p-12 rounded-[2.5rem] border-2 border-dashed border-indigo-100 flex flex-col items-center justify-center text-center opacity-60">
              <div className="text-4xl mb-4">👈</div>
              <p className="text-indigo-900 font-black">Selecciona un informe para empezar</p>
              <p className="text-indigo-400 text-xs font-bold mt-2">La IA te ayudará a crear el mejor plan de repaso.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ParentReviewManager;
