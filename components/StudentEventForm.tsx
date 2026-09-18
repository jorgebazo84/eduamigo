
import React, { useState } from 'react';
import { EventType } from '../types';

interface StudentEventFormProps {
  onAdd: (title: string, date: string, type: EventType) => void;
  onClose: () => void;
}

const eventTypes: { type: EventType; label: string; icon: string; color: string }[] = [
  { type: 'exam', label: 'Examen', icon: '📝', color: 'bg-red-500' },
  { type: 'excursion', label: 'Excursión', icon: '🌲', color: 'bg-green-500' },
  { type: 'meeting', label: 'Reunión', icon: '👥', color: 'bg-blue-500' },
  { type: 'support', label: 'Clase Apoyo', icon: '🎓', color: 'bg-yellow-500' },
  { type: 'medical', label: 'Médico', icon: '🏥', color: 'bg-purple-500' },
  { type: 'other', label: 'Otro', icon: '📌', color: 'bg-gray-500' },
];

const StudentEventForm: React.FC<StudentEventFormProps> = ({ onAdd, onClose }) => {
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [type, setType] = useState<EventType>('exam');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !date) return;
    onAdd(title, date, type);
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-indigo-900/40 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-white max-w-lg w-full rounded-[3rem] p-10 shadow-2xl border-4 border-indigo-500 animate-in zoom-in duration-300">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-4xl">📅</span>
          </div>
          <h2 className="text-3xl font-black text-indigo-900">Agendar Evento</h2>
          <p className="text-gray-500 font-bold mt-2">Apunta tus exámenes o excursiones. ¡Ganarás 20 puntos!</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3 mb-4">
            {eventTypes.map((t) => (
              <button
                key={t.type}
                type="button"
                onClick={() => setType(t.type)}
                className={`flex items-center gap-2 p-3 rounded-2xl border-2 transition-all font-bold text-xs ${
                  type === t.type 
                    ? 'bg-indigo-600 border-indigo-600 text-white' 
                    : 'bg-gray-50 border-transparent text-gray-600 hover:bg-indigo-50'
                }`}
              >
                <span>{t.icon}</span>
                {t.label}
              </button>
            ))}
          </div>

          <div>
            <label className="text-xs font-black text-indigo-400 uppercase ml-2 mb-1 block">¿De qué se trata?</label>
            <input 
              value={title} 
              onChange={e => setTitle(e.target.value)}
              className="w-full bg-indigo-50 p-4 rounded-2xl outline-none font-bold text-indigo-900 border-2 border-transparent focus:border-indigo-600"
              placeholder="Ej: Examen de Mates Temas 4 y 5"
              required
            />
          </div>

          <div>
            <label className="text-xs font-black text-indigo-400 uppercase ml-2 mb-1 block">¿Cuándo es?</label>
            <input 
              type="date"
              value={date} 
              onChange={e => setDate(e.target.value)}
              className="w-full bg-indigo-50 p-4 rounded-2xl outline-none font-bold text-indigo-900 border-2 border-transparent focus:border-indigo-600"
              required
            />
          </div>

          <div className="pt-4 flex flex-col gap-3">
            <button type="submit" className="bg-indigo-600 text-white py-4 rounded-2xl font-black shadow-lg hover:bg-indigo-700 transition-all text-lg flex items-center justify-center gap-2">
              Guardar y ganar +20 ⭐
            </button>
            <button type="button" onClick={onClose} className="text-gray-400 font-bold py-2">
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default StudentEventForm;
