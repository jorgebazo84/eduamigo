import React from 'react';
import type { RewardsController } from './rewards/useRewards';
import { STICKERS } from '../shared/rewardsCatalog';

interface GamificationCenterProps {
  ctl: RewardsController;
  onOpenShop?: () => void;
}

const DAY_LETTER = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
const letterOf = (day: string) => DAY_LETTER[(new Date(day + 'T12:00:00Z').getUTCDay() + 6) % 7];

/** Barra lateral: racha (con el día de descanso), colección de cromos y medallas con su progreso. */
export const GamificationCenter: React.FC<GamificationCenterProps> = ({ ctl, onOpenShop }) => {
  const s = ctl.summary;
  if (!s) {
    return (
      <div className="space-y-4" data-testid="gamification-loading">
        <div className="h-40 rounded-[2rem] bg-orange-100 animate-pulse" />
        <div className="h-32 rounded-[2rem] bg-indigo-100 animate-pulse" />
      </div>
    );
  }
  const { streak } = s;
  const owned = s.stickers.length;
  const earned = s.badges.filter((b) => b.earned);
  const next = s.badges.filter((b) => !b.earned).sort((a, b) => b.progress / b.target - a.progress / a.target).slice(0, 3);

  let streakHint: string;
  if (streak.current === 0) streakHint = 'Haz una actividad hoy para empezar tu racha.';
  else if (!streak.activeToday) streakHint = streak.restUsedThisWeek
    ? '¡Hoy toca estudiar! Ya usaste tu día de descanso esta semana.'
    : 'Aún no has estudiado hoy. Si hoy descansas, tu racha no se rompe (1 día por semana).';
  else streakHint = streak.nextMilestone ? `¡Hoy ya cuenta! Te faltan ${streak.nextMilestone - streak.current} días para llegar a ${streak.nextMilestone}.` : '¡Hoy ya cuenta! Eres una leyenda de la constancia.';

  return (
    <div className="space-y-5 animate-in fade-in duration-500" data-testid="gamification">
      {/* Racha */}
      <div className="bg-gradient-to-br from-orange-500 to-red-600 p-6 rounded-[2rem] text-white shadow-xl relative overflow-hidden">
        <p className="text-[10px] font-black uppercase tracking-widest opacity-80 mb-1">Tu racha</p>
        <h3 className="text-4xl font-black" data-testid="streak-current">{streak.current} {streak.current === 1 ? 'día' : 'días'} 🔥</h3>
        <p className="text-[11px] font-bold opacity-90 mt-1">Tu mejor racha: {streak.best} {streak.best === 1 ? 'día' : 'días'}</p>
        <div className="flex gap-1 mt-4" aria-label="Últimos 14 días">
          {streak.last14.map((d) => (
            <div key={d.day} className="flex flex-col items-center gap-0.5 flex-1">
              <div className={`w-full aspect-square rounded-md ${d.active ? 'bg-yellow-300' : 'bg-white/20'}`} title={d.day} />
              <span className="text-[8px] font-black opacity-70">{letterOf(d.day)}</span>
            </div>
          ))}
        </div>
        <p className="text-xs text-orange-50 mt-3 font-medium leading-snug" data-testid="streak-hint">{streakHint}</p>
        <div className="absolute -bottom-6 -right-6 text-8xl opacity-10">🔥</div>
      </div>

      {/* Cromos */}
      <button type="button" onClick={onOpenShop} className="w-full text-left bg-gradient-to-br from-indigo-600 to-purple-600 p-6 rounded-[2rem] text-white shadow-xl relative overflow-hidden hover:brightness-110 transition-all">
        <p className="text-[10px] font-black uppercase tracking-widest opacity-80 mb-1">Álbum de cromos</p>
        <h3 className="text-4xl font-black">{owned} / {STICKERS.length} 📖</h3>
        <div className="w-full bg-black/20 h-2 rounded-full mt-3 overflow-hidden">
          <div className="bg-yellow-300 h-full rounded-full" style={{ width: `${Math.round((owned / STICKERS.length) * 100)}%` }} />
        </div>
        <p className="text-xs text-indigo-100 mt-3">Tienes {s.points} puntos. Toca para ver tu álbum y tus premios.</p>
      </button>

      {/* Medallas */}
      <div className="bg-white p-5 rounded-[2rem] border-2 border-blue-50 shadow-sm">
        <h3 className="text-base font-black text-blue-900 mb-3">🏅 Medallas ({earned.length}/{s.badges.length})</h3>
        <div className="grid grid-cols-4 gap-2 mb-4">
          {s.badges.map((b) => (
            <div key={b.id} title={`${b.title}: ${b.description}`}
              className={`aspect-square rounded-xl flex items-center justify-center text-2xl border ${b.earned ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-100 grayscale opacity-30'}`}
              data-testid={`badge-${b.id}`} data-earned={b.earned ? '1' : '0'}>
              {b.icon}
            </div>
          ))}
        </div>
        {next.length > 0 && (
          <div className="space-y-2">
            <p className="text-[10px] font-black uppercase text-slate-400">Las próximas</p>
            {next.map((b) => (
              <div key={b.id}>
                <div className="flex justify-between text-[11px] font-bold text-slate-600">
                  <span>{b.icon} {b.title}</span><span>{b.progress}/{b.target}</span>
                </div>
                <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden mt-0.5">
                  <div className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.round((b.progress / b.target) * 100)}%` }} />
                </div>
                <p className="text-[10px] text-slate-400">{b.description}{b.gift ? ' · regala un cromo especial' : ''}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default GamificationCenter;
