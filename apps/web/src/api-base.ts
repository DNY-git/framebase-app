/**
 * API base URL helper.
 *
 * In production the frontend (Vercel) and the API (Render) live on different
 * origins, so full-page navigations (e.g. the Google OAuth redirect, which
 * cannot rely on the dev-server proxy or Vercel rewrites the way `fetch`
 * calls can) must point at the absolute API origin. That origin comes from
 * the `VITE_API_URL` environment variable.
 *
 * When `VITE_API_URL` is unset (local dev), paths stay relative so they keep
 * flowing through the Vite dev-server proxy (`/api` → `http://localhost:4000`).
 */
const API_BASE = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') ?? '';

/** Build an API URL: absolute in production, relative in local dev. */
export function apiUrl(path: string): string {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE}${normalized}`;
}
