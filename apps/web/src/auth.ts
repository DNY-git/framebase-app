/**
 * Token persistence — stores the access token in localStorage
 * so page refreshes don't log the user out.
 *
 * Storage is the single source of truth for the *session*, and this module
 * publishes every change to it through `subscribeToSession()`. `authFetch`
 * silently rotates the token pair when it hits a 401 (e.g. on the first load
 * after the 15-minute access token expired), so any in-memory mirror of the
 * session — the auth store — must be told about the new tokens. Without that
 * notification the store kept serving the expired access token to everything
 * that reads it directly (organizations, AI assistant, token-aware pages),
 * and those surfaces came up empty after a page refresh.
 */

const TOKEN_KEY = 'ct_access_token';
const REFRESH_TOKEN_KEY = 'ct_refresh_token';

/** The session as it currently exists in storage. */
export interface StoredSession {
  accessToken: string | null;
  refreshToken: string | null;
}

type SessionListener = (session: StoredSession) => void;

const sessionListeners = new Set<SessionListener>();

/**
 * Subscribes to session (token) changes. The listener is called *after* the
 * change is persisted, so it can read the new values from storage.
 * Returns an unsubscribe function. Listeners are never called on subscribe.
 */
export function subscribeToSession(listener: SessionListener): () => void {
  sessionListeners.add(listener);
  return () => {
    sessionListeners.delete(listener);
  };
}

function publishSession(): void {
  const session: StoredSession = {
    accessToken: getStoredToken(),
    refreshToken: getStoredRefreshToken(),
  };
  for (const listener of sessionListeners) {
    try {
      listener(session);
    } catch {
      // A misbehaving subscriber must never break the auth pipeline.
    }
  }
}

export function getStoredToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function getStoredRefreshToken(): string | null {
  try {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function storeTokens(accessToken: string, refreshToken: string): void {
  try {
    localStorage.setItem(TOKEN_KEY, accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  } catch {
    // localStorage unavailable — tokens only in memory
  }
  publishSession();
}

export function clearTokens(): void {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  } catch {
    // ignore
  }
  publishSession();
}
