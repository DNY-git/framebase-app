import { create } from 'zustand';
import { authFetch } from '../auth-fetch';
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
  createOrganization: (name: string) => Promise<{ ok: boolean; message?: string }>;
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  token: getStoredToken() ?? '',
  refreshToken: getStoredRefreshToken() ?? '',
  user: null,
  isAuthenticated: !!getStoredToken(),
  // On fresh page load user is always null, so if we have a stored token
  // we must start in loading state — otherwise ProtectedRoute sees
  // isAuthenticated=true + user=null + isLoadingUser=false and immediately
  // redirects to /login before fetchUser() has a chance to run.
  isLoadingUser: !!getStoredToken(),
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
      // Use authFetch so a 401 triggers an automatic refresh + retry before
      // giving up — the previous raw fetch() cleared the session immediately
      // on any 401, which broke page reloads when the access token had expired.
      const res = await authFetch('/api/v1/auth/me');
      if (res.ok) {
        const body = await res.json();
        const user = body.data ?? body;
        set({ user: { id: user.id, email: user.email, name: user.name, role: user.role, tenantId: user.tenantId, avatarUrl: user.avatarUrl ?? null } });
      } else {
        // authFetch already attempted refresh on 401 — if we're still here,
        // the refresh failed and tokens were cleared by authFetch.
        clearTokens();
        set({ token: '', refreshToken: '', user: null, isAuthenticated: false, isLoadingUser: false, organizations: null });
      }
    } catch {
      // Network error — keep isAuthenticated true, user will be fetched on next load
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

  createOrganization: async (name) => {
    const token = get().token;
    if (!token) return { ok: false, message: 'Not authenticated.' };

    try {
      const res = await fetch('/api/v1/organizations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        return {
          ok: false,
          message:
            (body as { message?: string } | null)?.message ??
            `Failed to create organization (${res.status}).`,
        };
      }

      const data = body?.data ?? body;
      if (!data?.accessToken || !data?.refreshToken) {
        return { ok: false, message: 'Unexpected server response.' };
      }

      storeTokens(data.accessToken, data.refreshToken);
      set({
        token: data.accessToken,
        refreshToken: data.refreshToken,
        user: {
          id: data.user?.id ?? get().user?.id ?? '',
          email: data.user?.email ?? get().user?.email ?? '',
          name: data.user?.name ?? get().user?.name ?? '',
          role: data.user?.role ?? get().user?.role ?? '',
          tenantId: data.user?.tenantId ?? '',
          avatarUrl: data.user?.avatarUrl ?? get().user?.avatarUrl ?? null,
        },
        isAuthenticated: true,
      });
      await get().fetchOrganizations();
      return { ok: true };
    } catch {
      return { ok: false, message: 'Could not reach the server.' };
    }
  },
}));