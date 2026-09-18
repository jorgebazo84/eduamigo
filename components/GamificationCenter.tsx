
import React from 'react';
import { Child, Badge } from '../types';

interface GamificationCenterProps {
  child: Child;
}

const ALL_BADGES: Badge[] = [
  { id: 'math-10', title: 'Matemático Veloz', description: 'Has resuelto 10 dudas de Mates.', icon: '🔢' },
  { id: 'science-pro', title: 'Científico Novato', description: 'Dominas los temas de Ciencias.', icon: '🌿' },
  { id: 'streak-5', title: 'Imparable', description: '5 días seguidos estudiando.', icon: '🔥' },
  { id: 'exam-master', title: 'Maestro del Examen', description: 'Has sacado un 10 en un test.', icon: '🎯' },
];

const GamificationCenter: React.FC<GamificationCenterProps> = ({ child }) => {
  // Asegurar que streak siempre tenga un valor para evitar errores de renderizado
  const currentStreak = child?.streak?.current ?? 0;
  const multiplier = child?.streak?.multiplier ?? 1.0;
  const childBadges = child?.badges ?? [];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 gap-6">
        <div className="bg-gradient-to-br from-orange-500 to-red-600 p-8 rounded-[2.5rem] text-white shadow-xl relative overflow-hidden">
           <div className="relative z-10">
             <p className="text-[10px] font-black uppercase tracking-widest opacity-80 mb-1">Tu Racha Actual</p>
             <h3 className="text-5xl font-black flex items-center gap-3">
               {currentStreak} Días 🔥
             </h3>
             <p className="mt-4 text-xs font-bold bg-white/20 px-3 py-1 rounded-full w-fit">
               Multiplicador de puntos: x{multiplier}
             </p>
           </div>
           <div className="absolute -bottom-6 -right-6 text-9xl opacity-10">🔥</div>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] border-2 border-blue-50 shadow-sm">
           <h3 className="text-xl font-black text-blue-900 mb-6 flex items-center gap-2">
             🏅 Tus Medallas
           </h3>
           <div className="grid grid-cols-4 gap-4">
             {ALL_BADGES.map(badge => {
               const isUnlocked = childBadges.includes(badge.id);
               return (
                 <div 
                   key={badge.id} 
                   className={`flex flex-col items-center gap-2 transition-all ${isUnlocked ? 'opacity-100 scale-100' : 'opacity-20 grayscale scale-90'}`}
                   title={badge.description}
                 >
                   <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center text-3xl shadow-inner">
                     {badge.icon}
                   </div>
                   <p className="text-[8px] font-black text-center text-blue-900 leading-tight">{badge.title}</p>
                 </div>
               );
             })}
           </div>
        </div>
      </div>
    </div>
  );
};

export default GamificationCenter;
