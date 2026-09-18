
import React, { useState, useEffect } from 'react';
import { Child, CalendarEvent, ExamResult, StudyPlan } from '../types';
import { generateStudyPlan } from '../services/geminiService';

interface StudyPlannerProps {
  child: Child;
  events: CalendarEvent[];
  examResults: ExamResult[];
  plan: StudyPlan | null;
  loading: boolean;
  onLoadPlan: () => void;
  onToggleSession: (sessionId: string) => void;
}

const StudyPlanner: React.FC<StudyPlannerProps> = ({ child, events, examResults, plan, loading, onLoadPlan, onToggleSession }) => {
  const completedSessions = plan?.sessions.filter(s => s.completed).length || 0;
  const totalSessions = plan?.sessions.length || 0;
  const progress = totalSessions > 0 ? (completedSessions / totalSessions) * 100 : 0;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="bg-indigo-900 p-8 rounded-[2.5rem] text-white shadow-xl flex flex-col md:flex-row justify-between items-center gap-6">
        <div>
          <h2 className="text-3xl font-black mb-2">Planificador IA 🗓️</h2>
          <p className="text-indigo-300 font-bold">Analizo tu agenda y tus notas para crear el mejor plan hoy.</p>
          {totalSessions > 0 && (
            <div className="mt-4 space-y-2">
              <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-indigo-200">
                <span>Progreso de hoy</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <div className="w-full h-2 bg-indigo-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-green-400 transition-all duration-1000" 
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}
        </div>
        <button 
          onClick={onLoadPlan}
          className="bg-white text-indigo-900 px-6 py-3 rounded-2xl font-black text-xs hover:bg-indigo-100 transition-all"
        >
          {loading ? 'CALCULANDO...' : 'RECALCULAR PLAN'}
        </button>
      </div>

      {loading ? (
        <div className="py-20 flex flex-col items-center gap-4 text-indigo-400">
           <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
           <p className="font-black animate-pulse">Optimizando tu tiempo de estudio...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {plan?.sessions.map((session) => (
            <div key={session.id} className={`bg-white p-6 rounded-[2rem] border-2 shadow-sm flex flex-col md:flex-row gap-6 items-center transition-all ${
              session.completed ? 'border-green-100 opacity-60' : 'border-indigo-50'
            }`}>
               <div className={`w-16 h-16 rounded-2xl flex items-center justify-center font-black text-xl ${
                 session.completed ? 'bg-green-100 text-green-600' : 'bg-indigo-100 text-indigo-600'
               }`}>
                 {session.completed ? '✓' : `${session.durationMinutes}'`}
               </div>
               <div className="flex-1 text-center md:text-left">
                 <h3 className={`text-lg font-black ${session.completed ? 'text-green-900 line-through' : 'text-indigo-900'}`}>
                   {session.topic}
                 </h3>
                 <p className="text-sm text-indigo-400 italic">"{session.recommendation}"</p>
               </div>
               <button 
                onClick={() => onToggleSession(session.id)}
                className={`px-8 py-3 rounded-xl font-black text-xs shadow-md transition-all ${
                  session.completed 
                  ? 'bg-white border-2 border-green-500 text-green-600' 
                  : 'bg-indigo-600 text-white hover:bg-indigo-700'
                }`}
               >
                 {session.completed ? 'COMPLETADO' : 'EMPEZAR AHORA 🚀'}
               </button>
            </div>
          ))}
          {!plan?.sessions.length && (
            <div className="py-12 text-center bg-gray-50 rounded-[2rem] border-2 border-dashed border-gray-200">
              <p className="text-gray-400 font-bold italic">No hay tareas urgentes. ¡Usa el temario para repasar lo que quieras!</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default StudyPlanner;
