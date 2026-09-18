
import React from 'react';
import { Child } from '../types';

interface ChildSelectorProps {
  children: Child[];
  onSelect: (child: Child) => void;
  onAddChild?: () => void;
}

const ChildSelector: React.FC<ChildSelectorProps> = ({ children, onSelect, onAddChild }) => {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-12 animate-in fade-in zoom-in duration-500">
      <div className="text-center space-y-2">
        <h2 className="text-4xl font-black text-blue-900">¿Quién va a estudiar hoy?</h2>
        <p className="text-blue-500 font-medium">Selecciona tu perfil para ganar puntos</p>
      </div>

      <div className="flex flex-wrap justify-center gap-8">
        {children.map((child) => (
          <button
            key={child.id}
            onClick={() => onSelect(child)}
            className="group flex flex-col items-center space-y-4 transition-all hover:scale-110"
          >
            <div className="w-32 h-32 rounded-[2.5rem] bg-white shadow-xl border-4 border-transparent group-hover:border-blue-500 flex items-center justify-center text-6xl group-hover:shadow-blue-200 transition-all overflow-hidden relative">
              <span className="z-10">{child.avatar}</span>
              <div className="absolute inset-0 bg-blue-50 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            </div>
            <div className="text-center">
              <p className="text-xl font-black text-blue-900">{child.name}</p>
              <p className="text-sm font-bold text-blue-400">{child.grade}</p>
              <div className="mt-2 inline-flex items-center gap-1 bg-yellow-100 px-3 py-1 rounded-full text-xs font-black text-yellow-700">
                ⭐ {child.points} pts
              </div>
            </div>
          </button>
        ))}

        {onAddChild && children.length < 4 && (
          <button
            onClick={onAddChild}
            className="group flex flex-col items-center space-y-4 opacity-50 hover:opacity-100 transition-all"
          >
            <div className="w-32 h-32 rounded-[2.5rem] border-4 border-dashed border-blue-200 flex items-center justify-center text-4xl text-blue-300 group-hover:border-blue-400 group-hover:text-blue-500 transition-all">
              +
            </div>
            <p className="text-sm font-bold text-blue-400">Añadir Hijo</p>
          </button>
        )}
      </div>
    </div>
  );
};

export default ChildSelector;
