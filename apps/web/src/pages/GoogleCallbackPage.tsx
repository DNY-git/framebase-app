/**
 * GoogleCallbackPage — landing spot for the Google OAuth redirect.
 *
 * The API redirects here with a short-lived one-time code (never a token).
 * This page exchanges the code for a token pair, signs the user in, and
 * routes them to the path they originally requested (`next`).
 */
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { HardHat, Loader2 } from '../shared/components/icons';
import { useAuthStore } from '../stores/auth-store';

export function GoogleCallbackPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login, fetchUser } = useAuthStore();
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const code = searchParams.get('code');
    const errorParam = searchParams.get('error');
    const next = searchParams.get('next') ?? '/';
    if (!next.startsWith('/') || next.startsWith('//')) {
      setError('Invalid redirect target.');
      return;
    }
    if (errorParam) {
      setError(errorParam === 'access_denied' ? 'Sign-in with Google was cancelled.' : 'Google sign-in failed. Please try again.');
      return;
    }
    if (!code) {
      setError('Missing sign-in code. Please try again.');
      return;
    }

    (async () => {
      try {
        const res = await fetch('/api/v1/auth/google/exchange', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code }),
        });
        const body = await res.json().catch(() => null);
        if (!res.ok) {
          throw new Error(
            (body as { message?: string } | null)?.message ?? 'Sign-in with Google failed. Please try again.',
          );
        }
        const data = (body as { data?: { accessToken: string; refreshToken: string; user?: unknown } }).data;
        if (!data?.accessToken || !data?.refreshToken) {
          throw new Error('Unexpected server response.');
        }
        login(data.accessToken, data.refreshToken, data.user as never);
        await fetchUser();
        navigate(next, { replace: true });
      } catch (err) {
        setError((err as Error).message);
      }
    })();
    // Run once on mount — the query params don't change afterwards.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary">
            <HardHat className="h-7 w-7 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Framebase</h1>
          <p className="mt-1 text-sm text-foreground-muted">Signing you in with Google…</p>
        </div>

        <div className="rounded-xl border border-border bg-surface p-6 shadow-sm">
          {error ? (
            <>
              <div className="rounded-lg border border-danger/20 bg-danger/5 p-3 text-sm text-danger">
                {error}
              </div>
              <div className="mt-4 text-center text-sm text-foreground-muted">
                <Link to="/login" className="font-medium text-primary hover:underline">
                  Back to sign in
                </Link>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center gap-2 text-sm text-foreground-muted">
              <Loader2 className="h-4 w-4 animate-spin" />
              Exchanging credentials…
            </div>
          )}
        </div>
      </div>
    </div>
  );
}