
import React, { useState } from 'react';
import { StudentRequest, Task, Child } from '../types';

interface RequestManagerProps {
  requests: StudentRequest[];
  tasks: Task[];
  children: Child[];
  onApprove: (requestId: string, dueDate: string) => void;
  onReject: (requestId: string) => void;
  onUpdateTask: (taskId: string, updates: Partial<Task>) => void;
  onDeleteTask: (taskId: string) => void;
}

const RequestManager: React.FC<RequestManagerProps> = ({ 
  requests, tasks, children, onApprove, onReject, onUpdateTask, onDeleteTask 
}) => {
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [tempDate, setTempDate] = useState(new Date().toISOString().split('T')[0]);

  const pendingRequests = requests.filter(r => r.status === 'pending');

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <section className="space-y-4">
        <h3 className="text-xl font-black text-blue-900 flex items-center gap-2">
          📥 Buzón de Solicitudes
          {pendingRequests.length > 0 && (
            <span className="bg-red-500 text-white text-[10px] px-2 py-1 rounded-full animate-bounce">
              {pendingRequests.length} nuevas
            </span>
          )}
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {pendingRequests.map(req => {
            const child = children.find(c => c.id === req.childId);
            const isAssigning = assigningId === req.id;

            return (
              <div key={req.id} className="bg-white p-6 rounded-[2rem] border-2 border-blue-50 shadow-sm flex flex-col justify-between group hover:border-blue-200 transition-all">
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-3xl">{child?.avatar}</span>
                    <div>
                      <p className="font-black text-blue-900 leading-tight">{child?.name} solicita:</p>
                      <p className="text-[10px] text-gray-400 font-bold uppercase">{new Date(req.timestamp).toLocaleString()}</p>
                    </div>
                  </div>
                  <h4 className="text-lg font-black text-blue-700 mb-2">{req.title}</h4>
                  <p className="text-sm text-gray-600 italic mb-6">"{req.message}"</p>
                </div>

                <div className="space-y-3">
                  {isAssigning ? (
                    <div className="bg-blue-50 p-4 rounded-2xl space-y-3 animate-in slide-in-from-top-2">
                      <label className="text-[10px] font-black text-blue-400 uppercase">Asignar Fecha de Tarea</label>
                      <input 
                        type="date" 
                        value={tempDate}
                        onChange={(e) => setTempDate(e.target.value)}
                        className="w-full bg-white p-3 rounded-xl font-bold outline-none border-2 border-transparent focus:border-blue-500"
                      />
                      <div className="flex gap-2">
                        <button 
                          onClick={() => { onApprove(req.id, tempDate); setAssigningId(null); }}
                          className="flex-1 bg-green-500 text-white py-2 rounded-xl font-black text-xs"
                        >
                          Confirmar ✅
                        </button>
                        <button 
                          onClick={() => setAssigningId(null)}
                          className="px-4 py-2 text-gray-400 font-bold text-xs"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <button 
                        onClick={() => setAssigningId(req.id)}
                        className="flex-1 bg-blue-600 text-white py-3 rounded-2xl font-black text-sm shadow-md hover:bg-blue-700 transition-all"
                      >
                        Aprobar y Agendar
                      </button>
                      <button 
                        onClick={() => onReject(req.id)}
                        className="px-4 py-3 bg-red-50 text-red-400 hover:bg-red-500 hover:text-white rounded-2xl transition-all font-black text-sm"
                      >
                        Rechazar
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          {pendingRequests.length === 0 && (
            <div className="col-span-full py-12 text-center bg-gray-50 rounded-[2rem] border-2 border-dashed border-gray-200">
              <p className="text-gray-400 font-bold">No hay solicitudes pendientes. ¡Todo en orden!</p>
            </div>
          )}
        </div>
      </section>

      <section className="space-y-4">
        <h3 className="text-xl font-black text-blue-900">Tareas en curso / Pendientes</h3>
        <div className="bg-white rounded-[2.5rem] border border-blue-50 overflow-hidden shadow-sm">
          <div className="divide-y divide-blue-50">
            {tasks.map(task => {
              const child = children.find(c => c.id === task.childId);
              return (
                <div key={task.id} className={`p-6 flex flex-col md:flex-row items-center justify-between gap-4 transition-all ${task.completed ? 'opacity-50' : ''}`}>
                  <div className="flex items-center gap-4 w-full">
                    <button 
                      onClick={() => onUpdateTask(task.id, { completed: !task.completed })}
                      className={`w-8 h-8 rounded-xl border-2 flex items-center justify-center transition-all ${task.completed ? 'bg-green-500 border-green-500 text-white' : 'border-blue-200 hover:border-blue-500'}`}
                    >
                      {task.completed && <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                    </button>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{child?.avatar}</span>
                        <h4 className={`font-black text-blue-900 leading-tight ${task.completed ? 'line-through' : ''}`}>{task.title}</h4>
                      </div>
                      <div className="flex items-center gap-3 mt-1 ml-9">
                        <span className="text-[10px] font-black text-blue-400 uppercase bg-blue-50 px-2 py-0.5 rounded">{child?.name}</span>
                        <input 
                          type="date" 
                          value={task.dueDate} 
                          onChange={(e) => onUpdateTask(task.id, { dueDate: e.target.value })}
                          className="text-[10px] font-bold text-gray-500 outline-none bg-transparent hover:text-blue-600 transition-colors"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                    <button 
                      onClick={() => onDeleteTask(task.id)}
                      className="p-3 text-red-300 hover:text-red-500 transition-colors"
                      title="Eliminar tarea"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </div>
                </div>
              );
            })}
            {tasks.length === 0 && (
              <div className="p-10 text-center text-blue-300 font-bold italic">No hay tareas programadas actualmente.</div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};

export default RequestManager;
