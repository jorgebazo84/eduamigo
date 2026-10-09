import React, { useState, useEffect } from 'react';
import { Child } from '../types';
import { ALL_STICKERS, Sticker, StickerCategory } from '../types/stickers';

interface StickerAlbumProps {
  child: Child;
  onDeductPoints?: (cost: number) => void;
}

export const StickerAlbum: React.FC<StickerAlbumProps> = ({ child, onDeductPoints }) => {
  const [selectedCategory, setSelectedCategory] = useState<StickerCategory | 'Todos'>('Todos');
  const [unlockedIds, setUnlockedIds] = useState<string[]>([]);
  const [selectedSticker, setSelectedSticker] = useState<Sticker | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const storageKey = `eduamigo_stickers_${child.id}`;

  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        setUnlockedIds(JSON.parse(saved));
      } else {
        // By default unlock the first two common stickers as welcome gifts
        const defaultUnlocked = ['space_sun', 'nat_eagle'];
        setUnlockedIds(defaultUnlocked);
        localStorage.setItem(storageKey, JSON.stringify(defaultUnlocked));
      }
    } catch (e) {
      setUnlockedIds(['space_sun', 'nat_eagle']);
    }
  }, [child.id]);

  const unlockSticker = (sticker: Sticker) => {
    if (unlockedIds.includes(sticker.id)) return;

    if (child.points < sticker.costXP) {
      alert(`Necesitas ${sticker.costXP} puntos para desbloquear este cromo. ¡Tienes ${child.points}! Sigue estudiando para conseguirlos.`);
      return;
    }

    const next = [...unlockedIds, sticker.id];
    setUnlockedIds(next);
    try {
      localStorage.setItem(storageKey, JSON.stringify(next));
    } catch (e) {
      console.warn("Could not save sticker to storage:", e);
    }

    if (onDeductPoints) {
      onDeductPoints(sticker.costXP);
    }

    setToastMessage(`🎉 ¡Has desbloqueado "${sticker.title}"!`);
    setSelectedSticker(sticker);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const filteredStickers = selectedCategory === 'Todos'
    ? ALL_STICKERS
    : ALL_STICKERS.filter(s => s.category === selectedCategory);

  const totalUnlocked = unlockedIds.length;
  const totalStickers = ALL_STICKERS.length;
  const percentComplete = Math.round((totalUnlocked / totalStickers) * 100);

  const getRarityBadge = (rarity: Sticker['rarity']) => {
    switch (rarity) {
      case 'legendario':
        return 'bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-900 border-amber-300';
      case 'épico':
        return 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white border-purple-300';
      case 'raro':
        return 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white border-blue-300';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getCardBorder = (rarity: Sticker['rarity'], isUnlocked: boolean) => {
    if (!isUnlocked) return 'border-dashed border-slate-300 bg-slate-50';
    switch (rarity) {
      case 'legendario':
        return 'border-2 border-amber-400 bg-gradient-to-b from-amber-50/70 to-white shadow-amber-100 shadow-lg';
      case 'épico':
        return 'border-2 border-purple-300 bg-gradient-to-b from-purple-50/70 to-white shadow-purple-100 shadow-lg';
      case 'raro':
        return 'border-2 border-blue-300 bg-gradient-to-b from-blue-50/70 to-white shadow-blue-100 shadow-md';
      default:
        return 'border border-slate-200 bg-white shadow-sm';
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-5xl mx-auto">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[250] bg-slate-900 text-white px-6 py-3 rounded-full text-sm font-bold shadow-2xl animate-in slide-in-from-top flex items-center gap-2">
          <span>✨</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Hero Header */}
      <div className="bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 rounded-[2.5rem] p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <span className="bg-white/20 backdrop-blur text-xs font-black px-3 py-1 rounded-full uppercase tracking-wider mb-2 inline-block">
              Colección J21
            </span>
            <h2 className="text-2xl sm:text-3xl font-black">
              📖 Álbum de Cromos Educativos
            </h2>
            <p className="text-purple-100 text-sm mt-1 max-w-lg">
              Desbloquea personajes históricos, maravillas de la ciencia y misterios del cosmos usando los puntos de tus sesiones de estudio.
            </p>
          </div>

          <div className="bg-white/15 backdrop-blur-md px-6 py-4 rounded-3xl border border-white/20 flex items-center gap-4 self-stretch md:self-auto justify-between">
            <div>
              <span className="text-[10px] font-black uppercase text-purple-200 block">Álbum</span>
              <span className="text-2xl font-black">{totalUnlocked} / {totalStickers}</span>
            </div>
            <div className="w-16 h-16 rounded-full border-4 border-white/40 flex items-center justify-center font-black text-sm">
              {percentComplete}%
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-black/20 h-2.5 rounded-full mt-6 overflow-hidden">
          <div
            className="bg-gradient-to-r from-yellow-300 to-amber-400 h-full rounded-full transition-all duration-700"
            style={{ width: `${percentComplete}%` }}
          />
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
        {(['Todos', 'Espacio', 'Naturaleza', 'Científicos', 'Matemáticas'] as const).map(cat => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-4 py-2 rounded-2xl text-xs font-black whitespace-nowrap transition-all ${
              selectedCategory === cat
                ? 'bg-indigo-600 text-white shadow-md'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            {cat === 'Todos' ? '⭐ Todos' : cat}
          </button>
        ))}
      </div>

      {/* Grid of Stickers */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {filteredStickers.map(sticker => {
          const isUnlocked = unlockedIds.includes(sticker.id);
          const canAfford = child.points >= sticker.costXP;

          return (
            <div
              key={sticker.id}
              onClick={() => isUnlocked && setSelectedSticker(sticker)}
              className={`rounded-3xl p-5 flex flex-col justify-between transition-all relative ${getCardBorder(
                sticker.rarity,
                isUnlocked
              )} ${isUnlocked ? 'cursor-pointer hover:scale-105' : 'opacity-85'}`}
            >
              {/* Rarity & Cost Header */}
              <div className="flex items-center justify-between gap-1 mb-3">
                <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${getRarityBadge(sticker.rarity)}`}>
                  {sticker.rarity}
                </span>
                {!isUnlocked && (
                  <span className="text-[10px] font-black text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                    {sticker.costXP} pts
                  </span>
                )}
              </div>

              {/* Icon / Silhouette */}
              <div className="py-4 text-center">
                <div
                  className={`w-20 h-20 mx-auto rounded-2xl flex items-center justify-center text-4xl shadow-inner transition-transform ${
                    isUnlocked ? 'bg-white shadow-md' : 'bg-slate-200 grayscale opacity-40'
                  }`}
                >
                  {isUnlocked ? sticker.icon : '❓'}
                </div>
              </div>

              {/* Title & Info */}
              <div className="text-center mt-2">
                <h4 className="font-black text-sm text-slate-800 leading-snug">
                  {isUnlocked ? sticker.title : 'Cromo Misterioso'}
                </h4>
                <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">
                  {sticker.category}
                </p>
              </div>

              {/* Action / State */}
              <div className="mt-4 pt-3 border-t border-slate-100/60">
                {isUnlocked ? (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedSticker(sticker);
                    }}
                    className="w-full py-1.5 rounded-xl bg-indigo-50 text-indigo-700 text-xs font-bold hover:bg-indigo-100 transition-colors"
                  >
                    🔍 Ver Curiosidad
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      unlockSticker(sticker);
                    }}
                    className={`w-full py-2 rounded-xl text-xs font-black shadow transition-all ${
                      canAfford
                        ? 'bg-gradient-to-r from-emerald-500 to-green-600 text-white hover:brightness-110 active:scale-95'
                        : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    {canAfford ? `🔓 Canjear (${sticker.costXP} pts)` : `🔒 Faltan ${sticker.costXP - child.points} pts`}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Detail Modal */}
      {selectedSticker && (
        <div className="fixed inset-0 z-[220] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] max-w-md w-full p-8 shadow-2xl border-4 border-indigo-100 animate-in zoom-in-95 duration-200 relative">
            <button
              onClick={() => setSelectedSticker(null)}
              className="absolute top-5 right-5 w-9 h-9 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center font-bold"
            >
              ✕
            </button>

            <div className="text-center space-y-4">
              <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider border inline-block ${getRarityBadge(selectedSticker.rarity)}`}>
                Cromo {selectedSticker.rarity}
              </span>

              <div className="w-28 h-28 mx-auto rounded-3xl bg-indigo-50 flex items-center justify-center text-6xl shadow-inner border-2 border-indigo-100">
                {selectedSticker.icon}
              </div>

              <div>
                <h3 className="text-2xl font-black text-slate-800">{selectedSticker.title}</h3>
                <span className="text-xs text-indigo-500 font-bold uppercase tracking-wider block mt-0.5">
                  {selectedSticker.category}
                </span>
              </div>

              <div className="bg-indigo-50/70 p-5 rounded-2xl border border-indigo-100 text-left">
                <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600 block mb-1">
                  💡 ¿Sabías qué...?
                </span>
                <p className="text-sm text-slate-700 leading-relaxed font-medium">
                  {selectedSticker.funFact}
                </p>
              </div>

              <button
                onClick={() => setSelectedSticker(null)}
                className="w-full py-3 rounded-2xl bg-indigo-600 text-white font-black hover:bg-indigo-500 transition-colors shadow-lg"
              >
                Cerrar Cromo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StickerAlbum;
