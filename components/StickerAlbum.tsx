import React, { useState } from 'react';
import { STICKERS, STICKER_CATEGORIES, Sticker, StickerCategory, StickerRarity } from '../shared/rewardsCatalog';
import type { RewardsController } from './rewards/useRewards';

interface StickerAlbumProps {
  ctl: RewardsController;
}

const rarityBadge = (rarity: StickerRarity) => {
  switch (rarity) {
    case 'legendario': return 'bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-900 border-amber-300';
    case 'épico': return 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white border-purple-300';
    case 'raro': return 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white border-blue-300';
    case 'especial': return 'bg-gradient-to-r from-rose-500 to-orange-500 text-white border-rose-300';
    default: return 'bg-slate-100 text-slate-700 border-slate-200';
  }
};

const cardBorder = (rarity: StickerRarity, owned: boolean) => {
  if (!owned) return 'border-dashed border-slate-300 bg-slate-50';
  switch (rarity) {
    case 'legendario': return 'border-2 border-amber-400 bg-gradient-to-b from-amber-50/70 to-white shadow-lg';
    case 'épico': return 'border-2 border-purple-300 bg-gradient-to-b from-purple-50/70 to-white shadow-lg';
    case 'raro': return 'border-2 border-blue-300 bg-gradient-to-b from-blue-50/70 to-white shadow-md';
    case 'especial': return 'border-2 border-rose-300 bg-gradient-to-b from-rose-50/70 to-white shadow-lg';
    default: return 'border border-slate-200 bg-white shadow-sm';
  }
};

/** Álbum de cromos: se elige el cromo que se quiere (sin sobres sorpresa). Los especiales se ganan. */
export const StickerAlbum: React.FC<StickerAlbumProps> = ({ ctl }) => {
  const [category, setCategory] = useState<StickerCategory | 'Todos'>('Todos');
  const [selected, setSelected] = useState<Sticker | null>(null);
  const [confirm, setConfirm] = useState<Sticker | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);
  const s = ctl.summary;
  if (!s) return <div className="h-64 rounded-[2.5rem] bg-indigo-50 animate-pulse" />;

  const owned = new Set(s.stickers.map((x) => x.id));
  const list = category === 'Todos' ? STICKERS : STICKERS.filter((x) => x.category === category);
  const pct = Math.round((owned.size / STICKERS.length) * 100);
  const badgeFor = (stickerId: string) => s.badges.find((b) => b.gift === stickerId);

  const buy = async (st: Sticker) => {
    setBusy(true);
    try {
      await ctl.buySticker(st.id);
      setConfirm(null);
      setSelected(st);
      setMessage({ text: `🎉 ¡Has conseguido «${st.title}»!`, ok: true });
    } catch (e: any) {
      setConfirm(null);
      setMessage({ text: e.message, ok: false });
    } finally {
      setBusy(false);
      setTimeout(() => setMessage(null), 3500);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-5xl mx-auto" data-testid="sticker-album">
      {message && (
        <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-[250] px-6 py-3 rounded-full text-sm font-bold shadow-2xl ${message.ok ? 'bg-slate-900 text-white' : 'bg-red-600 text-white'}`} role="status">
          {message.text}
        </div>
      )}

      <div className="bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 rounded-[2.5rem] p-6 sm:p-8 text-white shadow-xl">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-2xl sm:text-3xl font-black">📖 Álbum de cromos</h2>
            <p className="text-purple-100 text-sm mt-1 max-w-lg">
              Elige el cromo que quieras y cámbialo por tus puntos. Los cromos <b>especiales</b> no se compran: se ganan con las medallas y la racha.
            </p>
          </div>
          <div className="bg-white/15 px-6 py-4 rounded-3xl border border-white/20 flex items-center gap-6 self-stretch md:self-auto justify-between">
            <div>
              <span className="text-[10px] font-black uppercase text-purple-200 block">Tus puntos</span>
              <span className="text-2xl font-black" data-testid="album-points">{s.points}</span>
            </div>
            <div>
              <span className="text-[10px] font-black uppercase text-purple-200 block">Álbum</span>
              <span className="text-2xl font-black" data-testid="album-count">{owned.size} / {STICKERS.length}</span>
            </div>
          </div>
        </div>
        <div className="w-full bg-black/20 h-2.5 rounded-full mt-6 overflow-hidden">
          <div className="bg-gradient-to-r from-yellow-300 to-amber-400 h-full rounded-full transition-all duration-700" style={{ width: `${pct}%` }} />
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
        {(['Todos', ...STICKER_CATEGORIES] as const).map((cat) => (
          <button key={cat} onClick={() => setCategory(cat)}
            className={`px-4 py-2 rounded-2xl text-xs font-black whitespace-nowrap transition-all ${category === cat ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}>
            {cat === 'Todos' ? '⭐ Todos' : cat}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {list.map((st) => {
          const has = owned.has(st.id);
          const special = st.rarity === 'especial';
          const afford = s.points >= st.cost;
          const badge = special ? badgeFor(st.id) : undefined;
          return (
            <div key={st.id} data-testid={`sticker-${st.id}`} data-owned={has ? '1' : '0'}
              onClick={() => has && setSelected(st)}
              className={`rounded-3xl p-4 flex flex-col justify-between transition-all ${cardBorder(st.rarity, has)} ${has ? 'cursor-pointer hover:scale-105' : ''}`}>
              <div className="flex items-center justify-between gap-1 mb-2">
                <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${rarityBadge(st.rarity)}`}>{st.rarity}</span>
                {!has && !special && <span className="text-[10px] font-black text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">{st.cost} pts</span>}
              </div>
              <div className="py-3 text-center">
                <div className={`w-20 h-20 mx-auto rounded-2xl flex items-center justify-center text-4xl ${has ? 'bg-white shadow-md' : 'bg-slate-200 grayscale opacity-40'}`}>
                  {has ? st.icon : '❓'}
                </div>
              </div>
              <div className="text-center">
                {/* El nombre se ve siempre: así sabe qué cromo está eligiendo */}
                <h4 className={`font-black text-sm leading-snug ${has ? 'text-slate-800' : 'text-slate-500'}`}>{st.title}</h4>
                <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">{st.category}</p>
              </div>
              <div className="mt-3 pt-3 border-t border-slate-100/60">
                {has ? (
                  <button type="button" onClick={(e) => { e.stopPropagation(); setSelected(st); }}
                    className="w-full py-1.5 rounded-xl bg-indigo-50 text-indigo-700 text-xs font-bold hover:bg-indigo-100">
                    🔍 Ver curiosidad
                  </button>
                ) : special ? (
                  <p className="text-[10px] text-center font-bold text-rose-600 leading-tight">
                    {badge ? `Se gana con la medalla «${badge.title}» (${badge.progress}/${badge.target})` : 'Se gana con tu constancia'}
                  </p>
                ) : (
                  <button type="button" disabled={!afford || busy} onClick={(e) => { e.stopPropagation(); setConfirm(st); }}
                    className={`w-full py-2 rounded-xl text-xs font-black shadow transition-all ${afford ? 'bg-gradient-to-r from-emerald-500 to-green-600 text-white hover:brightness-110 active:scale-95' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}>
                    {afford ? `🔓 Conseguir (${st.cost} pts)` : `🔒 Faltan ${st.cost - s.points} pts`}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Confirmación: para que no gaste puntos sin querer */}
      {confirm && (
        <div className="fixed inset-0 z-[220] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" role="dialog">
          <div className="bg-white rounded-[2rem] max-w-sm w-full p-6 shadow-2xl text-center space-y-4">
            <div className="text-5xl">{confirm.icon}</div>
            <p className="font-black text-slate-800 text-lg">¿Cambias {confirm.cost} puntos por «{confirm.title}»?</p>
            <p className="text-sm text-slate-500">Te quedarán {s.points - confirm.cost} puntos.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirm(null)} className="flex-1 py-3 rounded-2xl bg-slate-100 font-black text-slate-600">Ahora no</button>
              <button onClick={() => buy(confirm)} disabled={busy} className="flex-1 py-3 rounded-2xl bg-emerald-500 text-white font-black" data-testid="confirm-buy">
                {busy ? '…' : '¡Sí, lo quiero!'}
              </button>
            </div>
          </div>
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 z-[220] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" role="dialog">
          <div className="bg-white rounded-[2.5rem] max-w-md w-full p-8 shadow-2xl border-4 border-indigo-100 relative text-center space-y-4">
            <button onClick={() => setSelected(null)} className="absolute top-5 right-5 w-9 h-9 rounded-full bg-slate-100 text-slate-500 font-bold" aria-label="Cerrar">✕</button>
            <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider border inline-block ${rarityBadge(selected.rarity)}`}>Cromo {selected.rarity}</span>
            <div className="w-28 h-28 mx-auto rounded-3xl bg-indigo-50 flex items-center justify-center text-6xl border-2 border-indigo-100">{selected.icon}</div>
            <div>
              <h3 className="text-2xl font-black text-slate-800">{selected.title}</h3>
              <span className="text-xs text-indigo-500 font-bold uppercase tracking-wider block mt-0.5">{selected.category}</span>
            </div>
            <div className="bg-indigo-50/70 p-5 rounded-2xl border border-indigo-100 text-left">
              <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600 block mb-1">💡 ¿Sabías que…?</span>
              <p className="text-sm text-slate-700 leading-relaxed font-medium" data-testid="sticker-fact">{selected.funFact}</p>
            </div>
            <button onClick={() => setSelected(null)} className="w-full py-3 rounded-2xl bg-indigo-600 text-white font-black">Cerrar</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default StickerAlbum;
