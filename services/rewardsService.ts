// Cliente de puntos, racha, medallas, cromos y premios de familia (opción 7).
// Todo se decide en el servidor: el navegador solo pide y muestra.

const call = async (action: string, body: any) => {
  let res: Response;
  try {
    res = await fetch(`api_rewards.php?action=${action}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify(body) });
  } catch {
    throw new Error('Sin conexión. Revisa internet e inténtalo de nuevo.');
  }
  let data: any = {};
  try { data = await res.json(); } catch { /* vacío */ }
  if (!res.ok) { const e: any = new Error(data.error || 'Algo ha fallado. Inténtalo de nuevo.'); e.code = data.code; throw e; }
  return data;
};

export interface StreakInfo {
  current: number; best: number; activeToday: boolean; restUsedThisWeek: boolean;
  nextMilestone: number | null; last14: { day: string; active: boolean }[];
}
export interface BadgeState {
  id: string; title: string; description: string; icon: string; target: number; progress: number;
  earned: boolean; earnedAt: number | null; gift: string | null;
}
export interface OwnedSticker { id: string; how: 'bought' | 'badge' | 'welcome' | string; at: number }
export interface FamilyReward { id: string; title: string; pointsCost: number; icon: string }
export interface RewardRequest {
  id: string; rewardId: string | null; title: string; icon: string; cost: number;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled'; note: string; createdAt: number; decidedAt: number | null; seen: boolean;
}
export interface RewardsSummary {
  points: number; streak: StreakInfo; stickers: OwnedSticker[]; badges: BadgeState[];
  rewards: FamilyReward[]; requests: RewardRequest[];
  news: { badges: string[]; stickers: string[]; requests: string[] };
}
export interface LedgerRow { id: string; delta: number; source: string; sourceLabel: string; label: string; balance: number; at: number }
export interface ParentRewardsOverview {
  points: number; streak: StreakInfo; badges: BadgeState[]; stickersOwned: number; stickersTotal: number;
  ledger: LedgerRow[]; earnedWeek: { source: string; label: string; points: number }[]; spentWeek: number;
  requests: RewardRequest[];
}

export const rewardsService = {
  summary: (childId: string): Promise<RewardsSummary> => call('summary', { childId }),
  markSeen: (childId: string) => call('mark_seen', { childId }),
  buySticker: (childId: string, stickerId: string): Promise<{ newPoints: number }> => call('buy_sticker', { childId, stickerId }),
  requestReward: (childId: string, rewardId: string): Promise<{ newPoints: number; requestId: string }> => call('request_reward', { childId, rewardId }),
  cancelRequest: (childId: string, requestId: string): Promise<{ newPoints: number }> => call('cancel_request', { childId, requestId }),
  pomodoroStart: (childId: string): Promise<{ sessionId: string }> => call('pomodoro_start', { childId }),
  pomodoroDone: (childId: string, sessionId: string, concentration: boolean): Promise<{ awarded: number; newPoints: number; capped: boolean }> =>
    call('pomodoro_done', { childId, sessionId, concentration }),
  pendingRequests: (): Promise<{ total: number; byChild: Record<string, number> }> => call('pending_requests', {}),
  parentOverview: (childId: string): Promise<ParentRewardsOverview> => call('parent_overview', { childId }),
  decideRequest: (requestId: string, approve: boolean, note?: string): Promise<{ newPoints: number }> => call('decide_request', { requestId, approve, note }),
  adjustPoints: (childId: string, delta: number, reason: string): Promise<{ newPoints: number }> => call('adjust_points', { childId, delta, reason }),
};

export const STATUS_LABEL: Record<RewardRequest['status'], string> = {
  pending: 'Esperando a tus padres', approved: '¡Aceptado!', rejected: 'No aceptado', cancelled: 'Cancelado',
};
