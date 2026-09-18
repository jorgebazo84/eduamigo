import React from 'react';
import { StudyTask, Book } from '../types/study';

interface StudyReportListProps {
  tasks: StudyTask[];
  books: Book[];
}

const StudyReportList: React.FC<StudyReportListProps> = ({ tasks, books }) => {
  const completedTasks = tasks.filter(t => t.status === 'completed').sort((a, b) => (b.completedAt || 0) - (a.completedAt || 0));

  if (completedTasks.length === 0) {
    return (
      <div className="p-8 text-center bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
        <p className="text-slate-500 italic">Aún no hay repasos completados.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
        📊 Informes de Repaso de la IA
      </h3>
      
      {completedTasks.map(task => {
        const book = books.find(b => b.id === task.bookId);
        return (
          <div key={task.id} className="glass-card p-6 rounded-2xl border border-white/20 shadow-md">
            <div className="flex justify-between items-start mb-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-ewola bg-sky-50 px-2 py-1 rounded mb-2 inline-block">
                  {book?.subject}
                </span>
                <h4 className="text-lg font-bold text-slate-800">{task.topicTitle}</h4>
                <p className="text-xs text-slate-500">{book?.title}</p>
              </div>
              <div className={`text-2xl font-black ${task.aiScore && task.aiScore >= 8 ? 'text-emerald-500' : 'text-ewola'}`}>
                {task.aiScore}/10
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 mb-4">
              <p className="text-xs font-bold text-slate-400 uppercase mb-2">Resumen del Alumno:</p>
              <p className="text-sm text-slate-600 italic">"{task.summary}"</p>
            </div>

            <div className="space-y-3">
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-ewola/10 flex items-center justify-center flex-shrink-0">
                  🤖
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase">Análisis del Tutor IA:</p>
                  <p className="text-sm text-slate-700 leading-relaxed">{task.aiFeedbackParent}</p>
                </div>
              </div>

              {task.handwritingImage && (
                <div className="flex gap-3 mt-4 pt-4 border-t border-slate-100">
                  <div className="w-8 h-8 rounded-full bg-rose-50 flex items-center justify-center flex-shrink-0">
                    ✍️
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-bold text-slate-500 uppercase mb-2">Análisis de Escritura (Grafología):</p>
                    <div className="flex flex-col md:flex-row gap-4">
                      <img 
                        src={task.handwritingImage} 
                        alt="Escritura" 
                        className="w-full md:w-32 h-auto rounded-xl shadow-sm border border-slate-200"
                        referrerPolicy="no-referrer"
                      />
                      <div className="flex-1 bg-rose-50/50 p-4 rounded-2xl border border-rose-100">
                        <p className="text-sm text-rose-900 leading-relaxed italic">
                          {task.medicalEvaluation || "Evaluando rasgos psicológicos..."}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-4 pt-4 border-t border-slate-100 flex justify-between items-center text-[10px] text-slate-400 font-medium">
              <span>📅 {task.completedAt ? new Date(task.completedAt).toLocaleDateString() : ''}</span>
              <span className="text-emerald-500 font-bold">✅ COMPLETADO</span>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default StudyReportList;
