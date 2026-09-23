/**
 * Regression tests for "profile/session state is gone after a page refresh".
 *
 * The access token lives for 15 minutes (`JWT_ACCESS_TTL`), so the first load
 * after a break always carries an expired access token plus a valid refresh
 * token. `authFetch` silently rotates that pair, and the auth store has to
 * learn about the rotation — otherwise `useAuthStore().token` still holds the
 * dead token, and every consumer that reads it (organization switcher, AI
 * assistant, token-aware pages, `AppShell`'s outlet context) sends an expired
 * bearer token and comes up empty.
 *
 * These tests exercise the real `auth` + `auth-fetch` + `auth-store` modules;
 * only `globalThis.fetch` is stubbed, and `vi.resetModules()` re-creates the
 * module graph so a fresh store can be "reloaded" with a stored session.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const ACCESS_KEY = 'ct_access_token';
const REFRESH_KEY = 'ct_refresh_token';

const EXPIRED_ACCESS = 'access-expired';
const ORIGINAL_REFRESH = 'refresh-original';
const ROTATED_ACCESS = 'access-rotated';
const ROTATED_REFRESH = 'refresh-rotated';

const USER = {
  id: 'u1',
  email: 'ada@example.com',
  name: 'Ada Okonkwo',
  role: 'ADMIN',
  tenantId: 't1',
  avatarUrl: 'avatars/u1.jpg?v=1',
};

const MEMBERSHIPS = [
  { id: 't1', name: 'FrameBase', slug: 'framebase', role: 'ADMIN' },
];

interface FetchCall {
  url: string;
  method: string;
  authorization: string | null;
}

let calls: FetchCall[] = [];

/** Minimal `Response` stand-in — only the members `authFetch` reads. */
function jsonResponse(body: unknown, status: number): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  } as unknown as Response;
}

function readAuthorization(init?: RequestInit): string | null {
  const headers = init?.headers;
  if (!headers) return null;
  if (headers instanceof Headers) return headers.get('Authorization');
  return (headers as Record<string, string>).Authorization ?? null;
}


/**
 * Stub of the endpoints involved in a reload: `/auth/me` accepts only the
 * rotated access token, `/auth/refresh` rotates the original refresh token.
 */
function stubApi(options: { refreshWorks?: boolean } = {}) {
  const refreshWorks = options.refreshWorks ?? true;

  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url =
        typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
      const method = (init?.method ?? 'GET').toUpperCase();
      calls.push({ url, method, authorization: readAuthorization(init) });

      if (url.includes('/api/v1/auth/me')) {
        return readAuthorization(init) === `Bearer ${ROTATED_ACCESS}`
          ? jsonResponse({ data: USER }, 200)
          : jsonResponse({ message: 'Unauthorized' }, 401);
      }

      if (url.includes('/api/v1/auth/refresh')) {
        const body =
          typeof init?.body === 'string'
            ? (JSON.parse(init.body) as { refreshToken?: string })
            : {};
        if (!refreshWorks || body.refreshToken !== ORIGINAL_REFRESH) {
          return jsonResponse({ message: 'Refresh token has been revoked.' }, 401);
        }
        return jsonResponse(
          {
            data: {
              accessToken: ROTATED_ACCESS,
              refreshToken: ROTATED_REFRESH,
              user: USER,
              expiresIn: 900,
            },
          },
          200,
        );
      }

      if (url.includes('/api/v1/organizations/me')) {
        return readAuthorization(init) === `Bearer ${ROTATED_ACCESS}`
          ? jsonResponse({ data: { memberships: MEMBERSHIPS } }, 200)
          : jsonResponse({ message: 'Unauthorized' }, 401);
      }

      return jsonResponse({ message: 'Not found' }, 404);
    }),
  );
}

/**
 * Simulates a browser reload with an existing (expired) session and returns
 * the freshly initialised modules.
 */
async function reloadWithStoredSession() {
  localStorage.setItem(ACCESS_KEY, EXPIRED_ACCESS);
  localStorage.setItem(REFRESH_KEY, ORIGINAL_REFRESH);
  vi.resetModules();

  const auth = await import('../auth');
  const store = await import('./auth-store');
  return { auth, useAuthStore: store.useAuthStore };
}


describe('session persistence across a page refresh', () => {
  beforeEach(() => {
    localStorage.clear();
    calls = [];
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('starts a reload authenticated but with no user yet (route guard shows a spinner)', async () => {
    stubApi();
    const { useAuthStore } = await reloadWithStoredSession();

    const state = useAuthStore.getState();
    expect(state.token).toBe(EXPIRED_ACCESS);
    expect(state.isAuthenticated).toBe(true);
    expect(state.user).toBeNull();
    expect(state.isLoadingUser).toBe(true);
  });

  it('adopts the rotated token pair when a reload has to refresh an expired access token', async () => {
    stubApi();
    const { auth, useAuthStore } = await reloadWithStoredSession();

    await useAuthStore.getState().fetchUser();

    const state = useAuthStore.getState();
    expect(state.user).toEqual(USER);
    expect(state.isAuthenticated).toBe(true);
    expect(state.isLoadingUser).toBe(false);
    // The store must not keep handing out the expired access token.
    expect(state.token).toBe(ROTATED_ACCESS);
    expect(state.refreshToken).toBe(ROTATED_REFRESH);
    expect(auth.getStoredToken()).toBe(ROTATED_ACCESS);
    expect(auth.getStoredRefreshToken()).toBe(ROTATED_REFRESH);
  });

  it('loads organizations (profile menu) with the refreshed token', async () => {
    stubApi();
    const { useAuthStore } = await reloadWithStoredSession();

    await useAuthStore.getState().fetchUser();
    await useAuthStore.getState().fetchOrganizations();

    expect(useAuthStore.getState().organizations).toEqual(MEMBERSHIPS);
    const orgCall = calls.find((c) => c.url.includes('/api/v1/organizations/me'));
    expect(orgCall?.authorization).toBe(`Bearer ${ROTATED_ACCESS}`);
  });

  it('drops the whole session when the stored tokens are cleared', async () => {
    stubApi();
    const { auth, useAuthStore } = await reloadWithStoredSession();

    await useAuthStore.getState().fetchUser();
    expect(useAuthStore.getState().user).toEqual(USER);

    auth.clearTokens();

    const state = useAuthStore.getState();
    expect(state.token).toBe('');
    expect(state.refreshToken).toBe('');
    expect(state.isAuthenticated).toBe(false);
    expect(state.user).toBeNull();
    expect(state.organizations).toBeNull();
    expect(state.isLoadingUser).toBe(false);
  });

  it('does not refresh when the stored access token is still accepted', async () => {
    stubApi();
    localStorage.setItem(ACCESS_KEY, ROTATED_ACCESS);
    localStorage.setItem(REFRESH_KEY, ORIGINAL_REFRESH);
    vi.resetModules();
    const { useAuthStore } = await import('./auth-store');

    await useAuthStore.getState().fetchUser();

    expect(calls.some((c) => c.url.includes('/api/v1/auth/refresh'))).toBe(false);
    expect(useAuthStore.getState().user).toEqual(USER);
    expect(useAuthStore.getState().token).toBe(ROTATED_ACCESS);
  });
});
