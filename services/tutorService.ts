// Cliente del tutor "Pregúntame". Todas las llamadas a la IA pasan por el servidor.

export type TutorMode = 'guided' | 'explain' | 'other_way';

export interface TutorMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  mode?: TutorMode;
  safety?: string | null;
  /** Foto del ejercicio (si el niño la ha enviado) */
  photoUrl?: string;
}

export interface TutorConversationSummary {
  id: string;
  subject: string;
  title: string;
  updatedAt: number;
}

export interface TutorAskResult {
  ok: boolean;
  conversationId?: string;
  userMessage?: TutorMessage;
  reply?: TutorMessage;
  used?: number;
  limit?: number;
  error?: string;
  code?: string;
}

export interface ParentTutorOverview {
  settings: { dailyLimit: number; country: string };
  usage: { today: number; week: number };
  alerts: { id: string; kind: 'autolesion' | 'acoso'; createdAt: number; seen: boolean; conversationId: string }[];
  reports: { id: string; createdAt: number; reason: string; content: string }[];
  conversations: {
    id: string; subject: string; title: string; updatedAt: number;
    turns: number; explainRequests: number; otherWayRequests: number;
    stuck: boolean; solvedWithHints: boolean;
  }[];
}

const call = async (action: string, body: any) => {
  const res = await fetch(`api_tutor.php?action=${action}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify(body),
  });
  let data: any = {};
  try { data = await res.json(); } catch { /* vacío */ }
  return { ok: res.ok, status: res.status, data };
};

export const tutorService = {
  async ask(params: { childId: string; conversationId?: string | null; message?: string; mode?: TutorMode; subject?: string; region?: string; image?: string; thumb?: string }): Promise<TutorAskResult> {
    try {
      const { ok, data } = await call('ask', params);
      if (!ok) return { ok: false, error: data.error, code: data.code, used: data.used, limit: data.limit, conversationId: data.conversationId };
      return { ok: true, ...data };
    } catch {
      return { ok: false, error: 'Sin conexión. Revisa internet e inténtalo de nuevo.', code: 'NETWORK' };
    }
  },

  async usage(childId: string): Promise<{ used: number; limit: number } | null> {
    try {
      const { ok, data } = await call('usage', { childId });
      return ok ? data : null;
    } catch { return null; }
  },

  async conversations(childId: string): Promise<TutorConversationSummary[]> {
    try {
      const { ok, data } = await call('conversations', { childId });
      return ok && Array.isArray(data) ? data : [];
    } catch { return []; }
  },

  async conversation(childId: string, conversationId: string): Promise<{ id: string; subject: string; messages: TutorMessage[] } | null> {
    try {
      const { ok, data } = await call('conversation', { childId, conversationId });
      return ok ? data : null;
    } catch { return null; }
  },

  async report(childId: string, messageId: string, reason = ''): Promise<boolean> {
    try {
      const { ok } = await call('report', { childId, messageId, reason });
      return ok;
    } catch { return false; }
  },

  // --- Padres (requieren PIN) ---
  async parentOverview(childId: string): Promise<ParentTutorOverview | null> {
    try {
      const { ok, data } = await call('parent_overview', { childId });
      return ok ? data : null;
    } catch { return null; }
  },

  async parentConversation(childId: string, conversationId: string): Promise<{ messages: TutorMessage[]; title: string } | null> {
    try {
      const { ok, data } = await call('parent_conversation', { childId, conversationId });
      return ok ? data : null;
    } catch { return null; }
  },

  async markAlertsSeen(childId: string): Promise<void> {
    try { await call('mark_alerts_seen', { childId }); } catch { /* nada */ }
  },

  async setSettings(childId: string, dailyLimit: number, country: string): Promise<{ ok: boolean; error?: string }> {
    try {
      const { ok, data } = await call('set_settings', { childId, dailyLimit, country });
      return { ok, error: data.error };
    } catch { return { ok: false, error: 'Sin conexión.' }; }
  },

  async unseenAlerts(): Promise<number> {
    try {
      const res = await fetch('api_tutor_alerts.php', { method: 'POST', credentials: 'same-origin' });
      if (!res.ok) return 0;
      const data = await res.json();
      return Number(data.unseen) || 0;
    } catch { return 0; }
  },
};

/** Lee un texto en voz alta con la voz del propio dispositivo (gratis, sin IA). */
export const speak = (text: string, lang = 'es-ES') => {
  try {
    if (!('speechSynthesis' in window)) return false;
    window.speechSynthesis.cancel();
    const clean = text.replace(/[*_#>`]/g, '').replace(/\[[^\]]*\]/g, '');
    const u = new SpeechSynthesisUtterance(clean);
    u.lang = lang;
    u.rate = 0.95;
    window.speechSynthesis.speak(u);
    return true;
  } catch { return false; }
};
