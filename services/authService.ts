
import { UserRole } from '../types';

export interface AuthResponse {
  userId: string;
  email: string;
  pin: string;
  error?: string;
}

export const authService = {
  async register(email: string, password: string, parentPin: string): Promise<AuthResponse> {
    try {
      const response = await fetch('auth.php?action=register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, parentPin })
      });
      return await response.json();
    } catch (err) {
      return { userId: '', email: '', pin: '', error: 'Error de conexión con el servidor.' };
    }
  },

  async login(email: string, password: string): Promise<AuthResponse> {
    try {
      const response = await fetch('auth.php?action=login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      return await response.json();
    } catch (err) {
      return { userId: '', email: '', pin: '', error: 'Error de conexión con el servidor.' };
    }
  },

  async resetPassword(email: string, pin: string, newPassword: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch('auth.php?action=reset_password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, pin, newPassword })
      });
      const data = await response.json();
      return { success: data.status === 'success', error: data.error };
    } catch (err) {
      return { success: false, error: 'Error de conexión.' };
    }
  },

  async updatePin(userId: string, newPin: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch('auth.php?action=update_pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, newPin })
      });
      const data = await response.json();
      return { success: data.status === 'success', error: data.error };
    } catch (err) {
      return { success: false, error: 'Error de conexión.' };
    }
  }
};
