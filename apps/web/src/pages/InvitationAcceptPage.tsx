/**
 * Invitation accept page (/invitations/:token).
 *
 * Development acceptance flow: resolve the invitation publicly, then:
 *  - invitee already has an account → sign in / accept as that user
 *  - invitee has no account → create account (name + password) + accept
 *
 * On success the API returns a token pair already scoped to the invited
 * organization, so the user is switched immediately.
 */
import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { HardHat, Loader2, AlertCircle, CheckCircle, Building, Shield, ArrowRight, Clock } from '../shared/components/icons';
import { useAuthStore } from '../stores/auth-store';

interface InvitationInfo {
  email: string;
  role: string;
  organizationId: string;
  organizationName: string;
  organizationSlug: string;
  status: string;
  expiresAt: string;
  hasAccount: boolean;
}

interface AcceptResponse {
  data?: {
    accessToken: string;
    refreshToken: string;
    user?: { id: string; email: string; name: string; role: string; tenantId: string; avatarUrl?: string | null };
  };
  message?: string;
}

function statusOf(res: Response, body: AcceptResponse): string {
  return body?.message ?? `Request failed (${res.status}).`;
}

export function InvitationAcceptPage() {
  const { token: invitationToken = '' } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated, login, fetchUser, token: authToken } = useAuthStore();

  const [info, setInfo] = useState<InvitationInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadErrorCode, setLoadErrorCode] = useState<string | null>(null);
  const [accepting, setAccepting] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // New-account form
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    setLoadErrorCode(null);
    try {
      const res = await fetch(`/api/v1/invitations/${invitationToken}`);
      const body = await res.json().catch(() => null);
      if (!res.ok || !body?.data) {
        setLoadErrorCode(body?.errorCode ?? null);
        throw new Error(body?.message ?? 'Could not load this invitation.');
      }
      setInfo(body.data);
      if (body.data.email) {
        setName('');
      }
    } catch (err) {
      setLoadError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [invitationToken]);

  useEffect(() => {
    load();
  }, [load]);

  const handleAccept = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setAccepting(true);
    setError(null);
    const wantsNewAccount = info && !info.hasAccount;

    const body = wantsNewAccount ? { name, password } : undefined;

    try {
      const headers = new Headers(body ? { 'Content-Type': 'application/json' } : {});
      if (authToken) headers.set('Authorization', `Bearer ${authToken}`);
      const res = await fetch(`/api/v1/invitations/${invitationToken}/accept`, {
        method: 'POST',
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });
      const parsed: AcceptResponse = await res.json().catch(() => null);
      if (!res.ok || !parsed?.data) {
        throw new Error(statusOf(res, parsed));
      }
      const data = parsed.data;
      login(data.accessToken, data.refreshToken, data.user);
      await fetchUser();
      setAccepted(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setAccepting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (loadError) {
    // Dedicated expired state — distinct from revoked / not-found.
    if (loadErrorCode === 'INVITATION_EXPIRED') {
      return (
        <div className="flex min-h-screen items-center justify-center bg-background p-4">
          <div className="w-full max-w-sm rounded-xl border border-border bg-surface p-6 text-center shadow-sm">
            <Clock className="mx-auto h-10 w-10 text-warning" />
            <h1 className="mt-4 text-lg font-bold text-foreground">This invite has expired</h1>
            <p className="mt-1 text-sm text-foreground-muted">
              Invitation links are time-limited for security. Ask your organization's admin to send you a fresh
              invitation.
            </p>
            <Link to="/" className="mt-4 inline-block text-sm font-medium text-primary hover:underline">
              Go to dashboard
            </Link>
          </div>
        </div>
      );
    }
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="w-full max-w-sm rounded-xl border border-border bg-surface p-6 text-center shadow-sm">
          <AlertCircle className="mx-auto h-10 w-10 text-danger" />
          <h1 className="mt-4 text-lg font-bold text-foreground">Invitation unavailable</h1>
          <p className="mt-1 text-sm text-foreground-muted">{loadError}</p>
          <Link to="/" className="mt-4 inline-block text-sm font-medium text-primary hover:underline">
            Go to dashboard
          </Link>
        </div>
      </div>
    );
  }

  if (accepted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="w-full max-w-sm rounded-xl border border-border bg-surface p-6 text-center shadow-sm">
          <CheckCircle className="mx-auto h-10 w-10 text-success" />
          <h1 className="mt-4 text-lg font-bold text-foreground">You're in!</h1>
          <p className="mt-1 text-sm text-foreground-muted">
            You are now a member of {info?.organizationName} as {info?.role.replace(/_/g, ' ')}.
          </p>
          <button
            onClick={() => navigate('/')}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go to dashboard <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  const loggedInAsInvitee =
    isAuthenticated && user?.email?.toLowerCase() === info?.email?.toLowerCase();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-primary">
            <HardHat className="h-7 w-7 text-primary-foreground" />
          </div>
          <h1 className="text-xl font-bold text-foreground">You've been invited</h1>
        </div>

        <div className="rounded-xl border border-border bg-surface p-6 shadow-sm">
          <div className="flex items-center gap-3 rounded-lg bg-primary/5 p-3">
            <Building className="h-8 w-8 shrink-0 text-primary" />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-foreground">{info?.organizationName}</p>
              <p className="mt-0.5 flex items-center gap-1.5 text-xs text-foreground-muted">
                <Shield className="h-3 w-3" />
                {info?.role?.replace(/_/g, ' ')} · {info?.email}
              </p>
            </div>
          </div>

          {error && (
            <div className="mt-4 rounded-lg border border-danger/20 bg-danger/5 p-3 text-sm text-danger">{error}</div>
          )}

          {info?.hasAccount ? (
            loggedInAsInvitee ? (
              <div className="mt-5">
                <p className="text-sm text-foreground-muted">
                  Signed in as <span className="font-medium text-foreground">{user?.name}</span>. Accepting adds
                  you to <span className="font-medium text-foreground">{info.organizationName}</span>.
                </p>
                <button
                  onClick={() => handleAccept()}
                  disabled={accepting}
                  className="mt-4 flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-primary text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
                >
                  {accepting && <Loader2 className="h-4 w-4 animate-spin" />}
                  Accept invitation
                </button>
              </div>
            ) : (
              <div className="mt-5">
                <p className="text-sm text-foreground-muted">
                  This invitation is for <span className="font-medium text-foreground">{info.email}</span>. Log in
                  with that account to accept it.
                </p>
                <Link
                  to={`/login?next=${encodeURIComponent(`/invitations/${invitationToken}`)}`}
                  className="mt-4 flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-primary text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  Log in to accept
                </Link>
              </div>
            )
          ) : (
            <form onSubmit={(e) => handleAccept(e)} className="mt-5 space-y-4">
              <div>
                <label htmlFor="inv-email" className="mb-1.5 block text-sm font-medium text-foreground">Email</label>
                <input
                  id="inv-email"
                  value={info?.email ?? ''}
                  disabled
                  className="h-10 w-full rounded-lg border border-border bg-surface-muted px-3 text-sm text-foreground-muted"
                />
              </div>
              <div>
                <label htmlFor="inv-name" className="mb-1.5 block text-sm font-medium text-foreground">Full name</label>
                <input
                  id="inv-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder="Your name"
                  className="h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm text-foreground placeholder:text-foreground-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label htmlFor="inv-password" className="mb-1.5 block text-sm font-medium text-foreground">Password</label>
                <input
                  id="inv-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                  placeholder="At least 8 chars, with upper, lower, and digit"
                  className="h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm text-foreground placeholder:text-foreground-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <button
                type="submit"
                disabled={accepting}
                className="flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-primary text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
              >
                {accepting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create account & accept'}
              </button>
              <p className="text-center text-xs text-foreground-muted">
                Already have an account?{' '}
                <Link to={`/login?next=${encodeURIComponent(`/invitations/${invitationToken}`)}`} className="text-primary hover:underline">
                  Log in
                </Link>
              </p>
            </form>
          )}
        </div>

        <p className="mt-4 text-center text-xs text-foreground-muted">
          Development invitation link — production email delivery is added later.
        </p>
      </div>
    </div>
  );
}