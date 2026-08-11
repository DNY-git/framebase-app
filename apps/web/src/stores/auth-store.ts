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
  avatarUrl?: string | null;
}

export interface OrgOption {
  id: string;
  name: string;
  slug: string;
  role: string;
}

interface AuthStore {
  token: string;
  refreshToken: string;
  user: User | null;
  isAuthenticated: boolean;
  isLoadingUser: boolean;
  organizations: OrgOption[] | null;
  login: (token: string, refreshToken: string, user?: User) => void;
  logout: () => void;
  setUser: (user: User) => void;
  fetchUser: () => Promise<void>;
  fetchOrganizations: () => Promise<void>;
  switchOrganization: (tenantId: string) => Promise<boolean>;
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  token: getStoredToken() ?? '',
  refreshToken: getStoredRefreshToken() ?? '',
  user: null,
  isAuthenticated: !!getStoredToken(),
  isLoadingUser: false,
  organizations: null,

  login: (token, refreshToken, user) => {
    storeTokens(token, refreshToken);
    set({ token, refreshToken, user: user ?? null, isAuthenticated: true });
  },

  logout: () => {
    clearTokens();
    set({ token: '', refreshToken: '', user: null, isAuthenticated: false, organizations: null });
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
        set({ user: { id: user.id, email: user.email, name: user.name, role: user.role, tenantId: user.tenantId, avatarUrl: user.avatarUrl ?? null } });
      }
    } catch {
      // silent — user will remain null, will be fetched on next app load
    } finally {
      set({ isLoadingUser: false });
    }
  },

  fetchOrganizations: async () => {
    const token = get().token;
    if (!token) return;

    try {
      const res = await fetch('/api/v1/organizations/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const body = await res.json();
      const data = body.data ?? body;
      set({
        organizations: (data.memberships ?? []).map((m: OrgOption) => m),
      });
    } catch {
      // silent — the switcher simply stays hidden/empty
    }
  },

  switchOrganization: async (tenantId) => {
    const token = get().token;
    if (!token) return false;

    try {
      const res = await fetch('/api/v1/organizations/switch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ tenantId }),
      });
      if (!res.ok) return false;

      const body = await res.json();
      const data = body.data ?? body;
      if (!data?.accessToken || !data?.refreshToken) return false;

      storeTokens(data.accessToken, data.refreshToken);
      set({
        token: data.accessToken,
        refreshToken: data.refreshToken,
        user: {
          id: data.user?.id ?? get().user?.id ?? '',
          email: data.user?.email ?? get().user?.email ?? '',
          name: data.user?.name ?? get().user?.name ?? '',
          role: data.user?.role ?? get().user?.role ?? '',
          tenantId: data.user?.tenantId ?? tenantId,
          avatarUrl: data.user?.avatarUrl ?? get().user?.avatarUrl ?? null,
        },
        isAuthenticated: true,
      });
      return true;
    } catch {
      return false;
    }
  },
}));