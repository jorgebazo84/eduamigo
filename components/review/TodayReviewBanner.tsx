import React, { useEffect, useState } from 'react';
import { reviewService } from '../../services/reviewService';

/** Aviso corto al entrar: cuántos temas tocan hoy. Lleva a Repasar. */
const TodayReviewBanner: React.FC<{ childId: string; isDemo: boolean; onOpen: () => void; refreshKey?: number }> = ({ childId, isDemo, onOpen, refreshKey }) => {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (isDemo) return;
    reviewService.today(childId).then((d) => setN(d.dueTotal)).catch(() => setN(0));
  }, [childId, isDemo, refreshKey]);
  if (!n) return null;
  return (
    <button onClick={onOpen} data-testid="today-banner"
      className="w-full bg-indigo-600 text-white rounded-[2rem] px-6 py-4 shadow-lg flex items-center justify-between gap-4 hover:bg-indigo-700 transition-all">
      <span className="flex items-center gap-3 text-left">
        <span className="text-2xl" aria-hidden="true">🧠</span>
        <span>
          <span className="block font-black">Hoy toca repasar {Math.min(n, 3)} {Math.min(n, 3) === 1 ? 'tema' : 'temas'}</span>
          <span className="block text-xs font-bold text-indigo-100">Unos minutos y listo</span>
        </span>
      </span>
      <span className="font-black text-sm whitespace-nowrap">Vamos →</span>
    </button>
  );
};

export default TodayReviewBanner;
