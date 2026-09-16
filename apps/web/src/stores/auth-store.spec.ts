import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock auth module before importing the store
const mockGetStoredToken = vi.fn(() => null);
const mockGetStoredRefreshToken = vi.fn(() => null);
const mockStoreTokens = vi.fn();
const mockClearTokens = vi.fn();

vi.mock('../auth', () => ({
  getStoredToken: () => mockGetStoredToken(),
  getStoredRefreshToken: () => mockGetStoredRefreshToken(),
  storeTokens: (...args: unknown[]) => mockStoreTokens(...args),
  clearTokens: (...args: unknown[]) => mockClearTokens(...args),
}));

// Mock authFetch — we'll control its return value per-test
const mockAuthFetch = vi.fn();

vi.mock('../auth-fetch', () => ({
  authFetch: (...args: unknown[]) => mockAuthFetch(...args),
}));

import { useAuthStore } from './auth-store';

function resetStore() {
  useAuthStore.setState({
    token: '',
    refreshToken: '',
    user: null,
    isAuthenticated: false,
    isLoadingUser: false,
    organizations: null,
  });
}

describe('auth-store', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetStore();
  });

  describe('initial state', () => {
    it('sets isLoadingUser=true when stored token exists (no user yet)', () => {
      useAuthStore.setState({
        token: 'stored-access-token',
        refreshToken: 'stored-refresh-token',
        isAuthenticated: true,
        isLoadingUser: true,
      });

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(true);
      expect(state.user).toBeNull();
      expect(state.isLoadingUser).toBe(true);
    });
  });

  describe('fetchUser', () => {
    it('does nothing when no token is stored', async () => {
      const { fetchUser } = useAuthStore.getState();
      await fetchUser();
      expect(mockAuthFetch).not.toHaveBeenCalled();
    });

    it('sets user on successful response', async () => {
      const mockUser = { id: 'u1', email: 'a@b.com', name: 'A', role: 'OWNER', tenantId: 't1', avatarUrl: null };
      mockAuthFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: mockUser }),
      });

      useAuthStore.setState({ token: 'valid-token', isAuthenticated: true, isLoadingUser: true });
      await useAuthStore.getState().fetchUser();

      const state = useAuthStore.getState();
      expect(state.user).toEqual(mockUser);
      expect(state.isLoadingUser).toBe(false);
      expect(state.isAuthenticated).toBe(true);
      expect(mockAuthFetch).toHaveBeenCalledWith('/api/v1/auth/me');
    });

    it('clears session when response is 401 and refresh fails', async () => {
      mockAuthFetch.mockResolvedValue({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ message: 'Unauthorized' }),
      });

      useAuthStore.setState({ token: 'expired-token', refreshToken: 'refresh-token', isAuthenticated: true, isLoadingUser: true });
      await useAuthStore.getState().fetchUser();

      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(state.token).toBe('');
      expect(state.refreshToken).toBe('');
      expect(state.isLoadingUser).toBe(false);
      expect(mockClearTokens).toHaveBeenCalled();
    });

    it('does not clear session on network error (transient failure)', async () => {
      mockAuthFetch.mockRejectedValue(new Error('Network failure'));

      useAuthStore.setState({ token: 'valid-token', refreshToken: 'refresh-token', isAuthenticated: true, isLoadingUser: true });
      await useAuthStore.getState().fetchUser();

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(true);
      expect(state.token).toBe('valid-token');
      expect(state.isLoadingUser).toBe(false);
    });

    it('uses authFetch instead of raw fetch (refresh happens before clearing)', async () => {
      const mockUser = { id: 'u1', email: 'a@b.com', name: 'A', role: 'OWNER', tenantId: 't1', avatarUrl: null };
      mockAuthFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: mockUser }),
      });

      useAuthStore.setState({ token: 'expired-access', refreshToken: 'valid-refresh', isAuthenticated: true, isLoadingUser: true });
      await useAuthStore.getState().fetchUser();

      expect(mockAuthFetch).toHaveBeenCalledTimes(1);
      expect(mockAuthFetch).toHaveBeenCalledWith('/api/v1/auth/me');

      const state = useAuthStore.getState();
      expect(state.user).toEqual(mockUser);
      expect(state.isAuthenticated).toBe(true);
      expect(mockClearTokens).not.toHaveBeenCalled();
    });

    it('sets isLoadingUser back to false even on error', async () => {
      mockAuthFetch.mockRejectedValue(new Error('fail'));

      useAuthStore.setState({ token: 'tok', isAuthenticated: true, isLoadingUser: true });
      await useAuthStore.getState().fetchUser();

      expect(useAuthStore.getState().isLoadingUser).toBe(false);
    });
  });

  describe('login', () => {
    it('stores tokens and sets user', () => {
      const mockUser = { id: 'u1', email: 'a@b.com', name: 'A', role: 'OWNER', tenantId: 't1' };
      useAuthStore.getState().login('access', 'refresh', mockUser);

      const state = useAuthStore.getState();
      expect(state.token).toBe('access');
      expect(state.refreshToken).toBe('refresh');
      expect(state.user).toEqual(mockUser);
      expect(state.isAuthenticated).toBe(true);
      expect(mockStoreTokens).toHaveBeenCalledWith('access', 'refresh');
    });
  });

  describe('logout', () => {
    it('clears everything', () => {
      useAuthStore.setState({ token: 't', refreshToken: 'r', user: { id: 'u1', email: 'a@b.com', name: 'A', role: 'OWNER', tenantId: 't1' }, isAuthenticated: true });
      useAuthStore.getState().logout();

      const state = useAuthStore.getState();
      expect(state.token).toBe('');
      expect(state.refreshToken).toBe('');
      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(mockClearTokens).toHaveBeenCalled();
    });
  });
});
