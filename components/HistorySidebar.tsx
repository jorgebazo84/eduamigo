import React from 'react';
import { TutorConversationSummary } from '../services/tutorService';

interface HistorySidebarProps {
  items: TutorConversationSummary[];
  onSelect: (conversationId: string) => void;
}

// Últimas conversaciones con el tutor. Al pulsar una, se vuelve a abrir completa.
const HistorySidebar: React.FC<HistorySidebarProps> = ({ items, onSelect }) => {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-blue-900 mb-4">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <h2 className="text-xl font-bold">Tus preguntas</h2>
      </div>
      {items.length === 0 ? (
        <div className="bg-blue-50 rounded-2xl p-6 text-center">
          <p className="text-blue-500 text-sm italic">Todavía no has hecho ninguna pregunta. ¡Empieza ahora!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.slice(0, 15).map((item) => (
            <button
              key={item.id}
              onClick={() => onSelect(item.id)}
              className="w-full text-left p-4 rounded-xl border border-blue-50 bg-white hover:bg-blue-50 hover:border-blue-200 transition-all shadow-sm group"
            >
              <div className="flex justify-between items-start mb-1 gap-2">
                <span className="text-[10px] font-bold text-blue-400 uppercase">{item.subject || 'Duda'}</span>
                <span className="text-[10px] text-gray-400 shrink-0">
                  {new Date(item.updatedAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                </span>
              </div>
              <p className="text-sm font-semibold text-blue-900 line-clamp-2 group-hover:text-blue-600 transition-colors">
                {item.title}
              </p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default HistorySidebar;
