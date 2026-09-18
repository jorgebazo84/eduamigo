
import React from 'react';
import { HistoryItem } from '../types';

interface HistorySidebarProps {
  history: HistoryItem[];
  onSelect: (item: HistoryItem) => void;
}

const HistorySidebar: React.FC<HistorySidebarProps> = ({ history, onSelect }) => {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-blue-900 mb-4">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <h2 className="text-xl font-bold">Tus Consultas</h2>
      </div>

      {history.length === 0 ? (
        <div className="bg-blue-50 rounded-2xl p-6 text-center">
            <p className="text-blue-500 text-sm italic">Todavía no has hecho ninguna pregunta. ¡Empieza ahora!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {history.map((item) => (
            <button
              key={item.id}
              onClick={() => onSelect(item)}
              className="w-full text-left p-4 rounded-xl border border-blue-50 bg-white hover:bg-blue-50 hover:border-blue-200 transition-all shadow-sm group"
            >
              <div className="flex justify-between items-start mb-1">
                <span className="text-[10px] font-bold text-blue-400 uppercase">{item.subject}</span>
                <span className="text-[10px] text-gray-400">{new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              <p className="text-sm font-semibold text-blue-900 line-clamp-2 group-hover:text-blue-600 transition-colors">
                {item.question}
              </p>
              <div className="mt-2 text-[10px] font-medium text-gray-500 bg-gray-100 inline-block px-2 py-0.5 rounded-md">
                {item.grade}
              </div>
            </button>
          ))}
        </div>
      )}

      {history.length > 0 && (
          <p className="text-[10px] text-center text-gray-400 mt-4">Guardamos tus últimas 20 consultas localmente.</p>
      )}
    </div>
  );
};

export default HistorySidebar;
