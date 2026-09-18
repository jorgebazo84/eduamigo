
import React from 'react';
import { Country } from '../types';

interface SOSModalProps {
  onSelect: (country: Country) => void;
  onClose: () => void;
}

const SOSModal: React.FC<SOSModalProps> = ({ onSelect, onClose }) => {
  const favorites: Country[] = ['República Dominicana', 'Colombia', 'Perú', 'Ecuador'];
  const others: Country[] = [
    'Argentina', 'Bolivia', 'Chile', 'Costa Rica', 'Cuba', 'El Salvador', 
    'España', 'Guatemala', 'Honduras', 'México', 'Nicaragua', 'Panamá', 
    'Paraguay', 'Puerto Rico', 'Uruguay', 'Venezuela'
  ].sort() as Country[];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-red-900/40 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-white max-w-lg w-full rounded-[3rem] p-10 shadow-2xl border-4 border-red-500 animate-in zoom-in duration-300">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
            <span className="text-4xl">🚨</span>
          </div>
          <h2 className="text-3xl font-black text-red-600">Botón SOS</h2>
          <p className="text-gray-500 font-bold mt-2">Dime de qué país eres y te lo explicaré con ejemplos de tu casa.</p>
        </div>

        <div className="space-y-6">
          <div>
            <p className="text-[10px] font-black text-red-400 uppercase tracking-widest mb-3">Favoritos</p>
            <div className="grid grid-cols-2 gap-3">
              {favorites.map((c) => (
                <button
                  key={c}
                  onClick={() => onSelect(c)}
                  className="bg-red-50 hover:bg-red-600 hover:text-white p-4 rounded-2xl text-left font-black text-red-700 transition-all border-2 border-red-100 shadow-sm"
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Otros Países</p>
            <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-2 no-scrollbar">
              {others.map((c) => (
                <button
                  key={c}
                  onClick={() => onSelect(c)}
                  className="bg-gray-50 hover:bg-blue-600 hover:text-white p-3 rounded-xl text-left font-bold text-gray-700 transition-all border border-gray-100"
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        </div>

        <button 
          onClick={onClose}
          className="w-full mt-8 py-4 text-gray-400 font-bold hover:text-gray-600"
        >
          Cerrar
        </button>
      </div>
    </div>
  );
};

export default SOSModal;
