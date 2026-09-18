
import React from 'react';
import { Child, Reward } from '../types';

interface RewardsShopProps {
  child: Child;
  rewards: Reward[];
}

const RewardsShop: React.FC<RewardsShopProps> = ({ child, rewards }) => {
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="bg-gradient-to-r from-yellow-400 to-orange-500 rounded-[2.5rem] p-10 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="text-center md:text-left">
            <h2 className="text-4xl font-black mb-2">¡Tus Recompensas! 🏆</h2>
            <p className="text-yellow-100 font-medium">Sigue estudiando para canjear tus puntos por premios increíbles.</p>
          </div>
          <div className="bg-white/20 backdrop-blur-md px-8 py-4 rounded-3xl border border-white/30 text-center">
            <p className="text-xs font-bold uppercase tracking-widest text-yellow-100">Puntos Disponibles</p>
            <p className="text-5xl font-black">{child.points}</p>
          </div>
        </div>
        <div className="absolute -bottom-10 -right-10 text-9xl opacity-10">💎</div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pb-20">
        {rewards.length > 0 ? rewards.map((reward) => {
          const progress = Math.min(100, (child.points / reward.pointsCost) * 100);
          const canAfford = child.points >= reward.pointsCost;

          return (
            <div key={reward.id} className="bg-white rounded-[2rem] p-6 shadow-sm border border-blue-50 flex flex-col space-y-6">
              <div className="flex justify-between items-start">
                <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center text-4xl shadow-inner">
                  {reward.icon}
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold text-blue-400 uppercase">Coste</p>
                  <p className="text-xl font-black text-blue-600">{reward.pointsCost} <span className="text-sm">pts</span></p>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-bold text-blue-900">{reward.title}</h3>
                <div className="mt-4 space-y-2">
                  <div className="flex justify-between text-xs font-bold">
                    <span className={canAfford ? 'text-green-500' : 'text-blue-400'}>
                      {canAfford ? '¡CONSEGUIDO!' : 'PROGRESO'}
                    </span>
                    <span className="text-blue-900">{Math.round(progress)}%</span>
                  </div>
                  <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-1000 ${canAfford ? 'bg-green-500' : 'bg-blue-500'}`}
                      style={{ width: `${progress}%` }}
                    ></div>
                  </div>
                </div>
              </div>

              <button 
                disabled={!canAfford}
                className={`w-full py-3 rounded-xl font-bold transition-all ${
                  canAfford 
                  ? 'bg-green-500 text-white shadow-lg hover:bg-green-600 active:scale-95' 
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                }`}
              >
                {canAfford ? '¡Canjear ahora! ✨' : 'Faltan ' + (reward.pointsCost - child.points) + ' puntos'}
              </button>
            </div>
          );
        }) : (
          <div className="col-span-full py-20 text-center bg-white rounded-[2rem] border-2 border-dashed border-blue-100">
             <div className="text-5xl mb-4">🎁</div>
             <p className="text-blue-400 font-bold">Dile a tus papis que añadan recompensas desde el Panel de Control.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default RewardsShop;
