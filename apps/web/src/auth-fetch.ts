/**
 * Authenticated fetch wrapper with automatic token refresh.
 *
 * On a 401 response, it attempts a single token refresh using the stored
 * refresh token. If successful, the original request is retried once.
 * If refresh fails, the user is redirected to /login.
 *
 * After a successful refresh the resolved promise is kept alive for a
 * short debounce window so that concurrent 401s from parallel requests
 * reuse the same (already resolved) promise instead of firing a second
 * refresh that would hit a revoked token.
 */

import { getStoredToken, getStoredRefreshToken, storeTokens, clearTokens } from './auth';

let refreshPromise: Promise<boolean> | null = null;
let refreshClearTimer: ReturnType<typeof setTimeout> | null = null;

/** Debounce window (ms) — concurrent 401s within this period reuse the
 *  same resolved promise instead of triggering a second refresh. */
const REFRESH_DEBOUNCE_MS = 500;

async function tryRefresh(): Promise<boolean> {
  const refreshToken = getStoredRefreshToken();
  if (!refreshToken) return false;

  try {
    const res = await fetch('/api/v1/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    if (!res.ok) return false;

    const body = await res.json();
    if (body.data?.accessToken && body.data?.refreshToken) {
      storeTokens(body.data.accessToken, body.data.refreshToken);
      return true;
    }

    return false;
  } catch {
    return false;
  }
}

function redirectToLogin() {
  clearTokens();
  if (window.location.pathname !== '/login' && window.location.pathname !== '/register') {
    window.location.href = '/login';
  }
}

function scheduleRefreshCleanup() {
  if (refreshClearTimer !== null) clearTimeout(refreshClearTimer);
  refreshClearTimer = setTimeout(() => {
    refreshPromise = null;
    refreshClearTimer = null;
  }, REFRESH_DEBOUNCE_MS);
}

export async function authFetch(url: string, init?: RequestInit): Promise<Response> {
  const token = getStoredToken();

  const headers = new Headers(init?.headers);
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  if (!headers.has('Content-Type') && init?.body && typeof init.body === 'string') {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(url, { ...init, headers });

  if (response.status === 401) {
    const refreshToken = getStoredRefreshToken();
    if (!refreshToken || url.includes('/auth/refresh') || url.includes('/auth/login')) {
      redirectToLogin();
      return response;
    }

    // Only start a new refresh when no in-flight / debounced refresh exists.
    if (!refreshPromise) {
      refreshPromise = tryRefresh();
    }

    const refreshed = await refreshPromise;

    if (refreshed) {
      // Keep the resolved promise around briefly so that parallel 401s
      // reuse it instead of firing a second (token-reuse) refresh.
      scheduleRefreshCleanup();

      const newToken = getStoredToken();
      if (newToken) {
        const retryHeaders = new Headers(init?.headers);
        retryHeaders.set('Authorization', `Bearer ${newToken}`);
        if (!retryHeaders.has('Content-Type') && init?.body && typeof init.body === 'string') {
          retryHeaders.set('Content-Type', 'application/json');
        }
        return fetch(url, { ...init, headers: retryHeaders });
      }
    }

    // Refresh failed — clear immediately so the next 401 can retry.
    refreshPromise = null;
    if (refreshClearTimer !== null) {
      clearTimeout(refreshClearTimer);
      refreshClearTimer = null;
    }
    redirectToLogin();
  }

  return response;
}

export function logoutAll() {
  const token = getStoredToken();
  const refreshToken = getStoredRefreshToken();

  fetch('/api/v1/auth/logout', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ refreshToken }),
  }).catch(() => {}).finally(() => {
    clearTokens();
  });
}
