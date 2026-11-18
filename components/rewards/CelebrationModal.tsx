import React from 'react';
import type { RewardsController } from './useRewards';
import { BADGE_BY_ID, STICKER_BY_ID } from '../../shared/rewardsCatalog';

/** Celebra lo nuevo: medallas, cromos especiales ganados y premios que los padres han decidido. */
export const CelebrationModal: React.FC<{ ctl: RewardsController }> = ({ ctl }) => {
  const s = ctl.summary;
  if (!s) return null;
  const badges = s.news.badges.map((id) => BADGE_BY_ID.get(id)).filter(Boolean) as any[];
  const stickers = s.news.stickers.map((id) => STICKER_BY_ID.get(id)).filter(Boolean) as any[];
  const decided = s.requests.filter((r) => s.news.requests.includes(r.id));
  if (!badges.length && !stickers.length && !decided.length) return null;

  return (
    <div className="fixed inset-0 z-[300] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" role="dialog" data-testid="celebration">
      <div className="bg-white rounded-[2.5rem] max-w-md w-full p-8 shadow-2xl text-center space-y-5 animate-in zoom-in-95 duration-300 max-h-[90vh] overflow-y-auto">
        <div className="text-6xl">🎉</div>
        {badges.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-2xl font-black text-slate-800">{badges.length === 1 ? '¡Nueva medalla!' : '¡Nuevas medallas!'}</h3>
            {badges.map((b) => (
              <div key={b.id} className="bg-amber-50 border border-amber-200 rounded-2xl p-3 flex items-center gap-3 text-left">
                <span className="text-4xl">{b.icon}</span>
                <div><p className="font-black text-slate-800">{b.title}</p><p className="text-xs text-slate-500">{b.description}</p></div>
              </div>
            ))}
          </div>
        )}
        {stickers.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-xl font-black text-rose-600">{stickers.length === 1 ? 'Y te regalamos un cromo especial' : 'Y te regalamos cromos especiales'}</h3>
            {stickers.map((st) => (
              <div key={st.id} className="bg-rose-50 border border-rose-200 rounded-2xl p-3 flex items-center gap-3 text-left">
                <span className="text-4xl">{st.icon}</span>
                <div><p className="font-black text-slate-800">{st.title}</p><p className="text-xs text-slate-500">{st.funFact}</p></div>
              </div>
            ))}
          </div>
        )}
        {decided.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-xl font-black text-slate-800">Tus padres han respondido</h3>
            {decided.map((r) => (
              <div key={r.id} className={`rounded-2xl p-3 text-left border ${r.status === 'approved' ? 'bg-green-50 border-green-200' : 'bg-slate-50 border-slate-200'}`}>
                <p className="font-black text-slate-800">{r.icon} {r.title}</p>
                <p className="text-sm text-slate-600">
                  {r.status === 'approved' ? '¡Te lo han dado! Disfrútalo.' : `Esta vez no. Te hemos devuelto los ${r.cost} puntos.`}
                  {r.note ? ` «${r.note}»` : ''}
                </p>
              </div>
            ))}
          </div>
        )}
        <button onClick={() => ctl.markSeen()} className="w-full py-3 rounded-2xl bg-indigo-600 text-white font-black" data-testid="celebration-close">¡Genial!</button>
      </div>
    </div>
  );
};

export default CelebrationModal;
