import React, { useState, useEffect } from 'react';
import { Child, Badge } from '../types';
import { ALL_STICKERS, Sticker } from '../types/stickers';

interface GamificationCenterProps {
  child: Child;
}

const ALL_BADGES: Badge[] = [
  { id: 'math-10', title: 'Matemático Veloz', description: 'Has resuelto 10 retos de Mates.', icon: '🔢' },
  { id: 'science-pro', title: 'Científico Novato', description: 'Dominas los temas de Ciencias.', icon: '🌿' },
  { id: 'english-speaker', title: 'Voz Británica', description: 'Completaste una práctica de Speaking.', icon: '🗣️' },
  { id: 'reading-star', title: 'Devorador de Libros', description: 'Has completado sesiones de lectura fluida.', icon: '📖' },
  { id: 'streak-5', title: 'Imparable', description: '5 días seguidos estudiando.', icon: '🔥' },
  { id: 'exam-master', title: 'Maestro del Examen', description: 'Has sacado un 10 en un test.', icon: '🎯' },
  { id: 'curious-mind', title: 'Mente Curiosa', description: 'Has hecho más de 20 preguntas al tutor.', icon: '💡' },
  { id: 'artist-sketch', title: 'Pizarra Creativa', description: 'Has dibujado operaciones en la pizarra táctil.', icon: '🎨' },
];

export const GamificationCenter: React.FC<GamificationCenterProps> = ({ child }) => {
  const currentStreak = child?.streak?.current ?? 0;
  const multiplier = child?.streak?.multiplier ?? 1.0;
  const childBadges = child?.badges ?? [];

  const [unlockedStickersCount, setUnlockedStickersCount] = useState(0);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(`eduamigo_stickers_${child.id}`);
      if (saved) {
        const ids = JSON.parse(saved);
        setUnlockedStickersCount(ids.length);
      } else {
        setUnlockedStickersCount(2); // default starter stickers
      }
    } catch (e) {
      setUnlockedStickersCount(2);
    }
  }, [child.id]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Streak card */}
        <div className="bg-gradient-to-br from-orange-500 to-red-600 p-8 rounded-[2.5rem] text-white shadow-xl relative overflow-hidden flex flex-col justify-between">
          <div className="relative z-10">
            <p className="text-[10px] font-black uppercase tracking-widest opacity-80 mb-1">Tu Racha Actual</p>
            <h3 className="text-5xl font-black flex items-center gap-3">
              {currentStreak} Días 🔥
            </h3>
            <p className="mt-4 text-xs font-bold bg-white/20 px-3 py-1 rounded-full w-fit">
              Multiplicador de puntos: x{multiplier}
            </p>
          </div>
          <p className="text-xs text-orange-100 mt-4 relative z-10">
            ¡Estudia todos los días para multiplicar tus puntos de recompensas!
          </p>
          <div className="absolute -bottom-6 -right-6 text-9xl opacity-10">🔥</div>
        </div>

        {/* Sticker album teaser */}
        <div className="bg-gradient-to-br from-indigo-600 to-purple-600 p-8 rounded-[2.5rem] text-white shadow-xl relative overflow-hidden flex flex-col justify-between">
          <div className="relative z-10">
            <p className="text-[10px] font-black uppercase tracking-widest opacity-80 mb-1">Colección de Cromos</p>
            <h3 className="text-5xl font-black flex items-center gap-3">
              {unlockedStickersCount} / {ALL_STICKERS.length} 📖
            </h3>
            <p className="mt-4 text-xs font-bold bg-white/20 px-3 py-1 rounded-full w-fit">
              {Math.round((unlockedStickersCount / ALL_STICKERS.length) * 100)}% Completado
            </p>
          </div>
          <p className="text-xs text-indigo-100 mt-4 relative z-10">
            Visita la Tienda de Recompensas para canjear tus puntos por nuevos cromos coleccionables.
          </p>
          <div className="absolute -bottom-6 -right-6 text-9xl opacity-10">✨</div>
        </div>
      </div>

      {/* Badges container */}
      <div className="bg-white p-8 rounded-[2.5rem] border-2 border-blue-50 shadow-sm">
        <h3 className="text-xl font-black text-blue-900 mb-6 flex items-center gap-2">
          🏅 Tus Medallas y Logros
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {ALL_BADGES.map(badge => {
            const isUnlocked = childBadges.includes(badge.id) || (currentStreak >= 5 && badge.id === 'streak-5');
            return (
              <div 
                key={badge.id} 
                className={`flex flex-col items-center gap-2 p-3 rounded-2xl border transition-all ${
                  isUnlocked 
                    ? 'border-blue-100 bg-blue-50/40 opacity-100 scale-100 shadow-sm' 
                    : 'border-slate-100 bg-slate-50 opacity-30 grayscale scale-95'
                }`}
                title={badge.description}
              >
                <div className="w-16 h-16 rounded-2xl bg-white flex items-center justify-center text-3xl shadow-sm border border-slate-100">
                  {badge.icon}
                </div>
                <p className="text-xs font-black text-center text-blue-900 leading-tight">{badge.title}</p>
                <p className="text-[10px] text-slate-500 text-center line-clamp-2">{badge.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default GamificationCenter;
