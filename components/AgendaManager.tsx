
import React, { useState } from 'react';
import { CalendarEvent, Task, Child, EventType } from '../types';

interface AgendaManagerProps {
  children: Child[];
  events: CalendarEvent[];
  tasks: Task[];
  onAddEvent: (event: Omit<CalendarEvent, 'id'>) => void;
  onDeleteEvent: (id: string) => void;
  onAddTask: (task: Omit<Task, 'id'>) => void;
  onToggleTask: (id: string) => void;
  onDeleteTask: (id: string) => void;
}

const eventTypes: { type: EventType; label: string; icon: string; color: string }[] = [
  { type: 'exam', label: 'Examen', icon: '📝', color: 'bg-red-500' },
  { type: 'meeting', label: 'Reunión', icon: '👥', color: 'bg-blue-500' },
  { type: 'excursion', label: 'Excursión', icon: '🌲', color: 'bg-green-500' },
  { type: 'support', label: 'Clase Apoyo', icon: '🎓', color: 'bg-yellow-500' },
  { type: 'medical', label: 'Médico', icon: '🏥', color: 'bg-purple-500' },
  { type: 'other', label: 'Otro', icon: '📌', color: 'bg-gray-500' },
];

const AgendaManager: React.FC<AgendaManagerProps> = ({ 
  children, events, tasks, onAddEvent, onDeleteEvent, onAddTask, onToggleTask, onDeleteTask 
}) => {
  const [activeView, setActiveView] = useState<'calendar' | 'tasks'>('calendar');
  const [selectedChildId, setSelectedChildId] = useState<string>('all');
  
  // Form states
  const [showEventForm, setShowEventForm] = useState(false);
  const [newEvent, setNewEvent] = useState({ title: '', date: '', type: 'exam' as EventType, childId: '' });
  
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [newTask, setNewTask] = useState({ title: '', dueDate: '', priority: 'medium' as any, childId: '' });

  const filteredEvents = events
    .filter(e => selectedChildId === 'all' || e.childId === selectedChildId)
    .sort((a, b) => a.date.localeCompare(b.date));

  const filteredTasks = tasks
    .filter(t => selectedChildId === 'all' || t.childId === selectedChildId)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));

  const handleAddEventSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEvent.title || !newEvent.date || !newEvent.childId) return;
    onAddEvent(newEvent);
    setNewEvent({ title: '', date: '', type: 'exam', childId: '' });
    setShowEventForm(false);
  };

  const handleAddTaskSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.title || !newTask.dueDate || !newTask.childId) return;
    onAddTask({ ...newTask, completed: false });
    setNewTask({ title: '', dueDate: '', priority: 'medium', childId: '' });
    setShowTaskForm(false);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex gap-2 p-1 bg-blue-100 rounded-2xl">
          <button 
            onClick={() => setActiveView('calendar')} 
            className={`px-6 py-2 rounded-xl text-xs font-black transition-all ${activeView === 'calendar' ? 'bg-white text-blue-600 shadow-sm' : 'text-blue-500'}`}
          >
            🗓️ Calendario
          </button>
          <button 
            onClick={() => setActiveView('tasks')} 
            className={`px-6 py-2 rounded-xl text-xs font-black transition-all ${activeView === 'tasks' ? 'bg-white text-blue-600 shadow-sm' : 'text-blue-500'}`}
          >
            ✅ Tareas
          </button>
        </div>

        <select 
          value={selectedChildId} 
          onChange={(e) => setSelectedChildId(e.target.value)}
          className="bg-white border-2 border-blue-100 rounded-xl px-4 py-2 text-sm font-bold text-blue-900 outline-none focus:border-blue-500"
        >
          <option value="all">Todos los hijos 👦👧</option>
          {children.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {activeView === 'calendar' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-black text-blue-900">Próximos Eventos</h3>
            <button 
              onClick={() => setShowEventForm(!showEventForm)}
              className="bg-blue-600 text-white px-4 py-2 rounded-xl text-xs font-black shadow-lg hover:bg-blue-700 transition-all"
            >
              {showEventForm ? 'Cerrar' : '+ Nuevo Evento'}
            </button>
          </div>

          {showEventForm && (
            <form onSubmit={handleAddEventSubmit} className="bg-white p-6 rounded-[2rem] border-2 border-blue-600 shadow-xl animate-in zoom-in duration-300 grid grid-cols-1 md:grid-cols-4 gap-4">
              <input 
                type="text" placeholder="Título (Ej: Examen Mates)" 
                value={newEvent.title} onChange={e => setNewEvent({...newEvent, title: e.target.value})}
                className="bg-blue-50 p-3 rounded-xl font-bold text-sm outline-none"
              />
              <input 
                type="date" 
                value={newEvent.date} onChange={e => setNewEvent({...newEvent, date: e.target.value})}
                className="bg-blue-50 p-3 rounded-xl font-bold text-sm outline-none"
              />
              <select 
                value={newEvent.type} onChange={e => setNewEvent({...newEvent, type: e.target.value as EventType})}
                className="bg-blue-50 p-3 rounded-xl font-bold text-sm outline-none"
              >
                {eventTypes.map(t => <option key={t.type} value={t.type}>{t.icon} {t.label}</option>)}
              </select>
              <select 
                value={newEvent.childId} onChange={e => setNewEvent({...newEvent, childId: e.target.value})}
                className="bg-blue-50 p-3 rounded-xl font-bold text-sm outline-none"
              >
                <option value="">¿Para quién?</option>
                {children.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <button type="submit" className="md:col-span-4 bg-blue-600 text-white py-3 rounded-xl font-black">Añadir a la Agenda 🚀</button>
            </form>
          )}

          <div className="grid grid-cols-1 gap-3">
            {filteredEvents.map(event => {
              const child = children.find(c => c.id === event.childId);
              const typeInfo = eventTypes.find(t => t.type === event.type)!;
              return (
                <div key={event.id} className="bg-white p-4 rounded-2xl border border-blue-50 shadow-sm flex items-center justify-between group hover:border-blue-200 transition-all">
                  <div className="flex items-center gap-4">
                    <div className={`${typeInfo.color} w-12 h-12 rounded-xl flex items-center justify-center text-xl shadow-inner text-white`}>
                      {typeInfo.icon}
                    </div>
                    <div>
                      <h4 className="font-black text-blue-900 leading-tight">{event.title}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] font-bold text-gray-400 uppercase">{event.date}</span>
                        <span className="text-[10px] font-black text-blue-400 bg-blue-50 px-2 py-0.5 rounded">{child?.name}</span>
                      </div>
                    </div>
                  </div>
                  <button onClick={() => onDeleteEvent(event.id)} className="text-red-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                </div>
              );
            })}
            {filteredEvents.length === 0 && (
              <div className="text-center py-10 bg-white rounded-3xl border-2 border-dashed border-blue-50 text-blue-300 italic">No hay eventos próximos.</div>
            )}
          </div>
        </div>
      )}

      {activeView === 'tasks' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-black text-blue-900">Tareas Pendientes</h3>
            <div className="flex gap-2">
              <button 
                onClick={() => alert("Simulando sincronización con Classroom... ¡Sincronizado!")}
                className="bg-green-100 text-green-700 px-4 py-2 rounded-xl text-xs font-black hover:bg-green-200 transition-all"
              >
                🔄 Sync Classroom
              </button>
              <button 
                onClick={() => setShowTaskForm(!showTaskForm)}
                className="bg-blue-600 text-white px-4 py-2 rounded-xl text-xs font-black shadow-lg hover:bg-blue-700 transition-all"
              >
                {showTaskForm ? 'Cerrar' : '+ Nueva Tarea'}
              </button>
            </div>
          </div>

          {showTaskForm && (
            <form onSubmit={handleAddTaskSubmit} className="bg-white p-6 rounded-[2rem] border-2 border-blue-600 shadow-xl animate-in zoom-in duration-300 grid grid-cols-1 md:grid-cols-4 gap-4">
              <input 
                type="text" placeholder="¿Qué hay que hacer?" 
                value={newTask.title} onChange={e => setNewTask({...newTask, title: e.target.value})}
                className="bg-blue-50 p-3 rounded-xl font-bold text-sm outline-none"
              />
              <input 
                type="date" 
                value={newTask.dueDate} onChange={e => setNewTask({...newTask, dueDate: e.target.value})}
                className="bg-blue-50 p-3 rounded-xl font-bold text-sm outline-none"
              />
              <select 
                value={newTask.priority} onChange={e => setNewTask({...newTask, priority: e.target.value as any})}
                className="bg-blue-50 p-3 rounded-xl font-bold text-sm outline-none"
              >
                <option value="low">Prioridad Baja</option>
                <option value="medium">Prioridad Media</option>
                <option value="high">Prioridad Alta</option>
              </select>
              <select 
                value={newTask.childId} onChange={e => setNewTask({...newTask, childId: e.target.value})}
                className="bg-blue-50 p-3 rounded-xl font-bold text-sm outline-none"
              >
                <option value="">¿Para quién?</option>
                {children.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <button type="submit" className="md:col-span-4 bg-blue-600 text-white py-3 rounded-xl font-black">Añadir Tarea ✍️</button>
            </form>
          )}

          <div className="grid grid-cols-1 gap-3">
            {filteredTasks.map(task => {
              const child = children.find(c => c.id === task.childId);
              return (
                <div key={task.id} className={`bg-white p-4 rounded-2xl border shadow-sm flex items-center justify-between group transition-all ${task.completed ? 'opacity-50 border-transparent' : 'border-blue-50 hover:border-blue-200'}`}>
                  <div className="flex items-center gap-4">
                    <button 
                      onClick={() => onToggleTask(task.id)}
                      className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${task.completed ? 'bg-green-500 border-green-500 text-white' : 'border-blue-200 hover:border-blue-500'}`}
                    >
                      {task.completed && <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                    </button>
                    <div>
                      <h4 className={`font-black text-blue-900 leading-tight ${task.completed ? 'line-through' : ''}`}>{task.title}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] font-bold text-gray-400 uppercase">Límite: {task.dueDate}</span>
                        <span className="text-[10px] font-black text-blue-400 bg-blue-50 px-2 py-0.5 rounded">{child?.name}</span>
                        {task.priority === 'high' && <span className="text-[9px] font-black bg-red-100 text-red-600 px-2 py-0.5 rounded uppercase">Urgente</span>}
                      </div>
                    </div>
                  </div>
                  <button onClick={() => onDeleteTask(task.id)} className="text-red-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                </div>
              );
            })}
             {filteredTasks.length === 0 && (
              <div className="text-center py-10 bg-white rounded-3xl border-2 border-dashed border-blue-50 text-blue-300 italic">No hay tareas pendientes. ¡Día libre!</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AgendaManager;
