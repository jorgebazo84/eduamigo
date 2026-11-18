// Estado de puntos, racha, medallas, cromos y premios del niño activo.
// Con cuenta: todo viene del servidor. En la demo: se simula en memoria (no se guarda nada).
import { useCallback, useEffect, useRef, useState } from 'react';
import { rewardsService, RewardsSummary, RewardRequest } from '../../services/rewardsService';
import { BADGES, STICKER_BY_ID, WELCOME_STICKERS } from '../../shared/rewardsCatalog';
import type { Child, Reward } from '../../types';

interface Options {
  child: Child | null;
  isDemo: boolean;
  /** Recompensas de la familia en la demo (con cuenta vienen del servidor) */
  demoRewards: Reward[];
  /** Avisa a la app del saldo nuevo, la racha y las medallas */
  onChildUpdate: (childId: string, patch: Partial<Child>) => void;
}

const demoStore = new Map<string, RewardsSummary>();

const today = () => new Date().toISOString().slice(0, 10);
const daysBack = (n: number) => Array.from({ length: 14 }, (_, i) => {
  const d = new Date(Date.now() - (13 - i) * 86400000).toISOString().slice(0, 10);
  return { day: d, active: i >= 14 - n };
});

const demoSummary = (child: Child, rewards: Reward[]): RewardsSummary => {
  const prev = demoStore.get(child.id);
  if (prev) return { ...prev, points: child.points, rewards: rewards.map((r) => ({ ...r })) };
  const s: RewardsSummary = {
    points: child.points,
    streak: { current: 3, best: 5, activeToday: true, restUsedThisWeek: false, nextMilestone: 7, last14: daysBack(3) },
    stickers: WELCOME_STICKERS.map((id) => ({ id, how: 'welcome', at: Date.now() })),
    badges: BADGES.map((b) => {
      const earned = b.id === 'first_step' || b.id === 'streak3';
      const progress = earned ? b.target : b.metric === 'streak' ? Math.min(b.target, 3) : b.metric === 'stickers' ? 2 : 0;
      return { id: b.id, title: b.title, description: b.description, icon: b.icon, target: b.target, progress, earned, earnedAt: earned ? Date.now() : null, gift: b.gift || null };
    }),
    rewards: rewards.map((r) => ({ ...r })),
    requests: [],
    news: { badges: [], stickers: [], requests: [] },
  };
  demoStore.set(child.id, s);
  return s;
};

export function useRewards({ child, isDemo, demoRewards, onChildUpdate }: Options) {
  const [summary, setSummary] = useState<RewardsSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const childId = child?.id || null;
  const onUpdate = useRef(onChildUpdate);
  onUpdate.current = onChildUpdate;

  const publish = useCallback((cid: string, s: RewardsSummary) => {
    setSummary(s);
    onUpdate.current(cid, {
      points: s.points,
      badges: s.badges.filter((b) => b.earned).map((b) => b.id),
      streak: { current: s.streak.current, best: s.streak.best, activeToday: s.streak.activeToday, restUsedThisWeek: s.streak.restUsedThisWeek, lastActive: Date.now() },
    });
  }, []);

  const refresh = useCallback(async () => {
    if (!child) return null;
    if (isDemo) { const s = demoSummary(child, demoRewards); setSummary(s); return s; }
    try {
      const s = await rewardsService.summary(child.id);
      setError(null);
      publish(child.id, s);
      return s;
    } catch (e: any) {
      setError(e.message);
      return null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [childId, isDemo, demoRewards, publish]);

  useEffect(() => { setSummary(null); refresh(); }, [childId, isDemo]); // eslint-disable-line react-hooks/exhaustive-deps

  // ------------------------------------------------ demo: helpers en memoria
  const demoSet = (fn: (s: RewardsSummary) => RewardsSummary) => {
    if (!child) return;
    const next = fn(demoSummary(child, demoRewards));
    demoStore.set(child.id, next);
    publish(child.id, next);
  };

  const demoEarn = (points: number) => demoSet((s) => ({ ...s, points: Math.max(0, s.points + points) }));

  const buySticker = async (stickerId: string) => {
    if (!child) return;
    const st = STICKER_BY_ID.get(stickerId);
    if (!st) return;
    if (isDemo) {
      const s = demoSummary(child, demoRewards);
      if (s.points < st.cost) throw new Error(`Te faltan ${st.cost - s.points} puntos para este cromo.`);
      demoSet((x) => ({ ...x, points: x.points - st.cost, stickers: [...x.stickers, { id: st.id, how: 'bought', at: Date.now() }] }));
      return;
    }
    await rewardsService.buySticker(child.id, stickerId);
    await refresh();
  };

  const requestReward = async (rewardId: string) => {
    if (!child) return;
    if (isDemo) {
      const s = demoSummary(child, demoRewards);
      const r = s.rewards.find((x) => x.id === rewardId);
      if (!r) return;
      if (s.points < r.pointsCost) throw new Error(`Te faltan ${r.pointsCost - s.points} puntos para este premio.`);
      const req: RewardRequest = { id: `demo-${Date.now()}`, rewardId, title: r.title, icon: r.icon, cost: r.pointsCost, status: 'pending', note: '', createdAt: Date.now(), decidedAt: null, seen: true };
      demoSet((x) => ({ ...x, points: x.points - r.pointsCost, requests: [req, ...x.requests] }));
      return;
    }
    await rewardsService.requestReward(child.id, rewardId);
    await refresh();
  };

  const cancelRequest = async (requestId: string) => {
    if (!child) return;
    if (isDemo) {
      const s = demoSummary(child, demoRewards);
      const r = s.requests.find((x) => x.id === requestId && x.status === 'pending');
      if (!r) return;
      demoSet((x) => ({ ...x, points: x.points + r.cost, requests: x.requests.map((q) => q.id === requestId ? { ...q, status: 'cancelled', decidedAt: Date.now() } : q) }));
      return;
    }
    await rewardsService.cancelRequest(child.id, requestId);
    await refresh();
  };

  const markSeen = async () => {
    if (!child || !summary) return;
    const cleared = { ...summary, news: { badges: [], stickers: [], requests: [] }, requests: summary.requests.map((r) => ({ ...r, seen: true })) };
    setSummary(cleared);
    if (isDemo) { demoStore.set(child.id, cleared); return; }
    await rewardsService.markSeen(child.id).catch(() => {});
  };

  return { summary, error, refresh, buySticker, requestReward, cancelRequest, markSeen, demoEarn, todayKey: today() };
}

export type RewardsController = ReturnType<typeof useRewards>;
