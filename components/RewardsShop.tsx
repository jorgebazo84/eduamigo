import React, { useState } from 'react';
import { StickerAlbum } from './StickerAlbum';
import type { RewardsController } from './rewards/useRewards';
import { STATUS_LABEL } from '../services/rewardsService';

interface RewardsShopProps {
  ctl: RewardsController;
  isDemo?: boolean;
}

const statusStyle: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700', approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700', cancelled: 'bg-slate-100 text-slate-500',
};

/** Tienda: álbum de cromos y premios de familia (que siempre aprueban los padres). */
export const RewardsShop: React.FC<RewardsShopProps> = ({ ctl, isDemo }) => {
  const [tab, setTab] = useState<'stickers' | 'family'>('stickers');
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);
  const s = ctl.summary;

  const flash = (text: string, ok: boolean) => { setMessage({ text, ok }); setTimeout(() => setMessage(null), 4000); };

  const ask = async (rewardId: string, title: string) => {
    setBusy(rewardId);
    try {
      await ctl.requestReward(rewardId);
      flash(isDemo ? `Has pedido «${title}». Con una cuenta, tus padres lo verían en su panel para aceptarlo.` : `¡Pedido! Tus padres verán que quieres «${title}». Los puntos quedan guardados hasta que respondan.`, true);
    } catch (e: any) { flash(e.message, false); }
    finally { setBusy(null); }
  };

  const cancel = async (requestId: string) => {
    setBusy(requestId);
    try { await ctl.cancelRequest(requestId); flash('Petición cancelada. Te hemos devuelto los puntos.', true); }
    catch (e: any) { flash(e.message, false); }
    finally { setBusy(null); }
  };

  const pending = s?.requests.filter((r) => r.status === 'pending') || [];
  const done = s?.requests.filter((r) => r.status !== 'pending').slice(0, 8) || [];

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-5xl mx-auto">
      {message && (
        <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-[250] max-w-md text-center px-6 py-3 rounded-3xl text-sm font-bold shadow-2xl ${message.ok ? 'bg-slate-900 text-white' : 'bg-red-600 text-white'}`} role="status">
          {message.text}
        </div>
      )}
      <div className="flex justify-center">
        <div className="bg-slate-200/80 p-1.5 rounded-2xl flex gap-1 shadow-inner border border-slate-300/60">
          <button type="button" onClick={() => setTab('stickers')}
            className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-black transition-all ${tab === 'stickers' ? 'bg-white text-indigo-600 shadow-md' : 'text-slate-600'}`}>
            📖 Álbum de cromos
          </button>
          <button type="button" onClick={() => setTab('family')}
            className={`relative px-5 py-2.5 rounded-xl text-xs sm:text-sm font-black transition-all ${tab === 'family' ? 'bg-white text-amber-600 shadow-md' : 'text-slate-600'}`}>
            🎁 Premios de familia
            {pending.length > 0 && <span className="absolute -top-1 -right-1 bg-amber-500 text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center">{pending.length}</span>}
          </button>
        </div>
      </div>

      {tab === 'stickers' ? <StickerAlbum ctl={ctl} /> : !s ? (
        <div className="h-64 rounded-[2.5rem] bg-amber-50 animate-pulse" />
      ) : (
        <div className="space-y-8" data-testid="family-rewards">
          <div className="bg-gradient-to-r from-yellow-400 to-orange-500 rounded-[2.5rem] p-8 text-white shadow-xl flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="text-center md:text-left">
              <h2 className="text-3xl font-black mb-2">Premios de familia 🏆</h2>
              <p className="text-yellow-50 font-medium text-sm max-w-md">Pide un premio cuando tengas puntos. Tus padres lo verán y te dirán si te lo dan. Si no, te devolvemos los puntos.</p>
            </div>
            <div className="bg-white/20 px-8 py-4 rounded-3xl border border-white/30 text-center">
              <p className="text-xs font-bold uppercase tracking-widest text-yellow-50">Tus puntos</p>
              <p className="text-5xl font-black" data-testid="family-points">{s.points}</p>
            </div>
          </div>

          {pending.length > 0 && (
            <div className="bg-amber-50 border-2 border-amber-200 rounded-[2rem] p-5 space-y-3">
              <h3 className="font-black text-amber-800">⏳ Esperando a tus padres</h3>
              {pending.map((r) => (
                <div key={r.id} className="bg-white rounded-2xl p-3 flex items-center justify-between gap-3" data-testid="pending-request">
                  <span className="font-bold text-slate-700">{r.icon} {r.title} <span className="text-xs text-slate-400">({r.cost} pts guardados)</span></span>
                  <button onClick={() => cancel(r.id)} disabled={busy === r.id} className="text-xs font-black text-slate-500 bg-slate-100 px-3 py-1.5 rounded-xl hover:bg-slate-200">Cancelar</button>
                </div>
              ))}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {s.rewards.length > 0 ? s.rewards.map((reward) => {
              const progress = Math.min(100, (s.points / reward.pointsCost) * 100);
              const can = s.points >= reward.pointsCost;
              const already = pending.some((p) => p.rewardId === reward.id);
              return (
                <div key={reward.id} className="bg-white rounded-[2rem] p-6 shadow-sm border border-blue-50 flex flex-col space-y-5">
                  <div className="flex justify-between items-start">
                    <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center text-4xl">{reward.icon}</div>
                    <div className="text-right">
                      <p className="text-xs font-bold text-blue-400 uppercase">Coste</p>
                      <p className="text-xl font-black text-blue-600">{reward.pointsCost} <span className="text-sm">pts</span></p>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-blue-900">{reward.title}</h3>
                    <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden mt-3">
                      <div className={`h-full ${can ? 'bg-green-500' : 'bg-blue-500'}`} style={{ width: `${progress}%` }} />
                    </div>
                  </div>
                  <button type="button" disabled={!can || busy === reward.id || already} onClick={() => ask(reward.id, reward.title)}
                    data-testid={`ask-${reward.id}`}
                    className={`w-full py-3 rounded-xl font-bold transition-all ${can && !already ? 'bg-green-500 text-white shadow-lg hover:bg-green-600 active:scale-95' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}>
                    {already ? 'Ya lo has pedido' : can ? '🙋 Pedir este premio' : `Faltan ${reward.pointsCost - s.points} puntos`}
                  </button>
                </div>
              );
            }) : (
              <div className="col-span-full py-16 text-center bg-white rounded-[2rem] border-2 border-dashed border-blue-100">
                <div className="text-5xl mb-4">🎁</div>
                <p className="text-blue-400 font-bold">Dile a tus padres que añadan premios desde su panel.</p>
              </div>
            )}
          </div>

          {done.length > 0 && (
            <div className="bg-white rounded-[2rem] p-5 border border-slate-100">
              <h3 className="font-black text-slate-700 mb-3">Tus últimos premios</h3>
              <div className="space-y-2">
                {done.map((r) => (
                  <div key={r.id} className="flex items-center justify-between gap-3 text-sm">
                    <span className="font-bold text-slate-700">{r.icon} {r.title}{r.note ? <span className="text-slate-400 font-medium"> — «{r.note}»</span> : null}</span>
                    <span className={`text-[10px] font-black uppercase px-2 py-1 rounded-full ${statusStyle[r.status]}`}>{STATUS_LABEL[r.status]}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default RewardsShop;
