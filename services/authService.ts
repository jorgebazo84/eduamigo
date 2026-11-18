// Servicio de autenticación (v1.3.0)
// La sesión vive en una cookie httpOnly que pone el servidor: el navegador la envía sola
// en cada petición y el código de la app nunca la ve. El PIN parental no se guarda en el
// dispositivo: se comprueba siempre en el servidor.

export interface AuthResponse {
  userId: string;
  email: string;
  needsPinSetup?: boolean;
  error?: string;
}

export interface PinResult {
  success: boolean;
  error?: string;
  code?: 'PIN_WRONG' | 'PIN_LOCKED' | 'AUTH_REQUIRED' | string;
  attemptsLeft?: number;
}

const post = async (action: string, body: any = {}) => {
  const response = await fetch(`auth.php?action=${action}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify(body)
  });
  let data: any = {};
  try { data = await response.json(); } catch { /* respuesta vacía */ }
  return { ok: response.ok, status: response.status, data };
};

export const authService = {
  async register(email: string, password: string, parentPin: string): Promise<AuthResponse> {
    try {
      const { data } = await post('register', { email, password, parentPin });
      return data;
    } catch {
      return { userId: '', email: '', error: 'Error de conexión con el servidor.' };
    }
  },

  async login(email: string, password: string): Promise<AuthResponse> {
    try {
      const { data } = await post('login', { email, password });
      return data;
    } catch {
      return { userId: '', email: '', error: 'Error de conexión con el servidor.' };
    }
  },

  /** Devuelve la sesión activa de este dispositivo, o null si no hay. */
  async me(): Promise<AuthResponse | null> {
    try {
      const { ok, data } = await post('me');
      return ok && data.userId ? data : null;
    } catch {
      return null;
    }
  },

  async logout(): Promise<void> {
    try { await post('logout'); } catch { /* sin conexión: la cookie caducará */ }
  },

  async verifyPin(pin: string): Promise<PinResult> {
    try {
      const { ok, data } = await post('verify_pin', { pin });
      return { success: ok && data.status === 'success', error: data.error, code: data.code, attemptsLeft: data.attemptsLeft };
    } catch {
      return { success: false, error: 'Error de conexión. Inténtalo de nuevo.' };
    }
  },

  async lockParent(): Promise<void> {
    try { await post('lock_parent'); } catch { /* el servidor la cierra solo en 15 min */ }
  },

  async resetPassword(email: string, pin: string, newPassword: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { data } = await post('reset_password', { email, pin, newPassword });
      return { success: data.status === 'success', error: data.error };
    } catch {
      return { success: false, error: 'Error de conexión.' };
    }
  },

  async updatePin(newPin: string): Promise<{ success: boolean; error?: string; code?: string }> {
    try {
      const { data } = await post('update_pin', { newPin });
      return { success: data.status === 'success', error: data.error, code: data.code };
    } catch {
      return { success: false, error: 'Error de conexión.' };
    }
  }
};
