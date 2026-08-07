import { create } from 'zustand';
import {
  getStoredToken,
  getStoredRefreshToken,
  storeTokens,
  clearTokens,
} from '../auth';

export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  tenantId: string;
}

interface AuthStore {
  token: string;
  refreshToken: string;
  user: User | null;
  isAuthenticated: boolean;
  isLoadingUser: boolean;
  login: (token: string, refreshToken: string, user?: User) => void;
  logout: () => void;
  setUser: (user: User) => void;
  fetchUser: () => Promise<void>;
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  token: getStoredToken() ?? '',
  refreshToken: getStoredRefreshToken() ?? '',
  user: null,
  isAuthenticated: !!getStoredToken(),
  isLoadingUser: false,

  login: (token, refreshToken, user) => {
    storeTokens(token, refreshToken);
    set({ token, refreshToken, user: user ?? null, isAuthenticated: true });
  },

  logout: () => {
    clearTokens();
    set({ token: '', refreshToken: '', user: null, isAuthenticated: false });
  },

  setUser: (user) => set({ user }),

  fetchUser: async () => {
    const { token } = get();
    if (!token) return;

    set({ isLoadingUser: true });
    try {
      const res = await fetch('/api/v1/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const body = await res.json();
        const user = body.data ?? body;
        set({ user: { id: user.id, email: user.email, name: user.name, role: user.role, tenantId: user.tenantId } });
      }
    } catch {
      // silent — user will remain null, will be fetched on next app load
    } finally {
      set({ isLoadingUser: false });
    }
  },
}));
