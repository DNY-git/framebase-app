/**
 * Team page — organization members and invitations.
 *
 *  - Members table with role management (OWNER/ADMIN only)
 *  - Invite form (OWNER/ADMIN only)
 *  - Pending invitations with dev acceptance links (development-only)
 *
 * Non-management roles see a permission notice (Phase 10 — view members
 * requires organization-level permissions; the server enforces this too).
 */
import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '../../stores/auth-store';
import { authFetch } from '../../auth-fetch';
import { PageLayout } from '../../shared/components/PageLayout';
import { Skeleton } from '../../shared/components/Skeleton';
import {
  Users,
  UserPlus,
  Mail,
  Copy,
  Loader2,
  Shield,
  CheckCircle,
  AlertCircle,
  Clock,
  Building,
} from '../../shared/components/icons';
import { Role } from '@constructtrack/types';
import { DeleteMinusButton } from '../../shared/components/DeleteMinusButton';
import { ConfirmDialog } from '../../shared/components/ConfirmDialog';

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
  avatarUrl: string | null;
  joinedAt: string;
}

interface PendingInvitation {
  id: string;
  email: string;
  role: string;
  status: string;
  expiresAt: string;
  usageLimit: number | null;
  usedCount: number;
  createdAt: string;
  devAcceptUrl: string | null;
}

const ROLE_OPTIONS: { value: string; label: string }[] = [
  { value: Role.OWNER, label: 'Owner' },
  { value: Role.ADMIN, label: 'Admin' },
  { value: Role.PROJECT_MANAGER, label: 'Project Manager' },
  { value: Role.SITE_ENGINEER, label: 'Site Engineer' },
  { value: Role.CREW, label: 'Crew' },
  { value: Role.PROCUREMENT, label: 'Procurement' },
  { value: Role.FLEET_MANAGER, label: 'Fleet Manager' },
  { value: Role.VIEWER, label: 'Viewer' },
];

const INVITABLE_ROLES = ROLE_OPTIONS.filter((r) => r.value !== Role.OWNER);

function formatDate(d?: string | Date | null): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function initials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function roleLabel(role?: string): string {
  if (!role) return '—';
  const found = ROLE_OPTIONS.find((r) => r.value === role);
  if (found) return found.label;
  return role.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function isExpired(expiresAt: string): boolean {
  return new Date(expiresAt).getTime() < Date.now();
}

export function Team() {
  const { user } = useAuthStore();
  const canManage = user?.role === Role.OWNER || user?.role === Role.ADMIN;

  const [members, setMembers] = useState<TeamMember[]>([]);
  const [invitations, setInvitations] = useState<PendingInvitation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Invite form
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<string>(Role.SITE_ENGINEER);
  const [inviteExpiryDays, setInviteExpiryDays] = useState<number>(3);
  const [inviteUsageLimit, setInviteUsageLimit] = useState<number | null>(null);
  const [showInvitePopover, setShowInvitePopover] = useState(false);
  const [isInviting, setIsInviting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);

  // Editing pending invitation expiration
  const [editingExpiresId, setEditingExpiresId] = useState<string | null>(null);
  const [editingExpiryDays, setEditingExpiryDays] = useState<number>(3);
  const [editingUsageLimit, setEditingUsageLimit] = useState<number | null>(null);
  const [savingExpires, setSavingExpires] = useState<string | null>(null);

  // New member role changes
  const [savingMember, setSavingMember] = useState<string | null>(null);
  const [memberError, setMemberError] = useState<string | null>(null);

  const loadAll = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [membersRes, invitesRes] = await Promise.all([
        authFetch('/api/v1/organizations/members'),
        authFetch('/api/v1/organizations/invitations'),
      ]);
      if (!membersRes.ok) {
        const body = await membersRes.json().catch(() => null);
        throw new Error(body?.message ?? 'Failed to load team');
      }
      const membersBody = await membersRes.json();
      setMembers((membersBody.data ?? membersBody) ?? []);
      if (invitesRes.ok) {
        const invitesBody = await invitesRes.json();
        setInvitations((invitesBody.data ?? invitesBody) ?? []);
      } else {
        setInvitations([]);
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (canManage) {
      loadAll();
    } else {
      setIsLoading(false);
    }
  }, [canManage, loadAll]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setIsInviting(true);
    setInviteError(null);
    setInviteSuccess(null);
    try {
      const payload: Record<string, unknown> = { email: inviteEmail.trim(), role: inviteRole };
      const expiresAt = new Date(Date.now() + inviteExpiryDays * 24 * 3600 * 1000).toISOString();
      payload.expiresAt = expiresAt;
      if (inviteUsageLimit != null) payload.usageLimit = inviteUsageLimit;
      const res = await authFetch('/api/v1/organizations/invitations', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(body?.message ?? 'Failed to create invitation');
      }
      setInviteEmail('');
      // Reflect real delivery state — never fake a "sent" confirmation.
      if (body?.data?.emailSent) {
        setInviteSuccess(`Invitation emailed to ${body.data.email ?? inviteEmail}.`);
      } else {
        setInviteSuccess(
          body?.data?.emailError ??
            'Invitation created — email delivery is not configured, copy the accept link below.',
        );
      }
      await loadAll();
    } catch (err) {
      setInviteError((err as Error).message);
    } finally {
      setIsInviting(false);
    }
  };

  const handleRoleChange = async (memberId: string, role: string) => {
    setSavingMember(memberId);
    setMemberError(null);
    try {
      const res = await authFetch(`/api/v1/organizations/members/${memberId}`, {
        method: 'PATCH',
        body: JSON.stringify({ role }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.message ?? 'Failed to update role');
      }
      await loadAll();
    } catch (err) {
      setMemberError((err as Error).message);
      await loadAll();
    } finally {
      setSavingMember(null);
    }
  };

  const handleRemove = async (memberId: string) => {
    setMemberError(null);
    try {
      const res = await authFetch(`/api/v1/organizations/members/${memberId}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.message ?? 'Failed to remove member');
      }
      await loadAll();
    } catch (err) {
      setMemberError((err as Error).message);
    }
  };

  const handleRevoke = async (invitationId: string) => {
    setMemberError(null);
    try {
      const res = await authFetch(`/api/v1/organizations/invitations/${invitationId}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.message ?? 'Failed to revoke invitation');
      }
      await loadAll();
    } catch (err) {
      setMemberError((err as Error).message);
    }
  };

  const handleUpdateExpires = async (invitationId: string) => {
    setSavingExpires(invitationId);
    setMemberError(null);
    try {
      const iso = new Date(Date.now() + editingExpiryDays * 24 * 3600 * 1000).toISOString();
      const payload: Record<string, unknown> = { expiresAt: iso };
      if (editingUsageLimit != null) payload.usageLimit = editingUsageLimit;
      else payload.usageLimit = null;
      const res = await authFetch(`/api/v1/organizations/invitations/${invitationId}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.message ?? 'Failed to update expiration');
      }
      setEditingExpiresId(null);
      await loadAll();
    } catch (err) {
      setMemberError((err as Error).message);
    } finally {
      setSavingExpires(null);
    }
  };

  const [pendingDelete, setPendingDelete] = useState<{ kind: 'remove' | 'revoke'; id: string } | null>(null);
  const confirmPendingDelete = async () => {
    if (!pendingDelete) return;
    if (pendingDelete.kind === 'remove') await handleRemove(pendingDelete.id);
    else await handleRevoke(pendingDelete.id);
    setPendingDelete(null);
  };

  const handleCopyLink = async (url: string | null) => {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setInviteSuccess('Dev link copied to clipboard.');
      setTimeout(() => setInviteSuccess(null), 3000);
    } catch {
      setInviteError('Could not copy link.');
    }
  };

  if (!canManage) {
    return (
      <PageLayout title="Team" subtitle="Members and invitations">
        <div className="rounded-xl border border-border bg-surface p-10 text-center shadow-sm">
          <Shield className="mx-auto h-10 w-10 text-foreground-muted" />
          <h2 className="mt-4 text-base font-semibold text-foreground">Restricted area</h2>
          <p className="mt-1 max-w-md mx-auto text-sm text-foreground-muted">
            Only organization owners and administrators can view the team and manage members.
            Your role is {roleLabel(user?.role)}.
          </p>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout title="Team" subtitle="Manage your organization's members and invitations">

      {error && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-danger/20 bg-danger/5 p-3 text-sm text-danger">
          <AlertCircle className="h-4 w-4" /> {error}
        </div>
      )}
      {memberError && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-danger/20 bg-danger/5 p-3 text-sm text-danger">
          <AlertCircle className="h-4 w-4" /> {memberError}
        </div>
      )}
      {inviteSuccess && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-success/20 bg-success/5 p-3 text-sm text-success">
          <CheckCircle className="h-4 w-4" /> {inviteSuccess}
        </div>
      )}
      {inviteError && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-danger/20 bg-danger/5 p-3 text-sm text-danger">
          <AlertCircle className="h-4 w-4" /> {inviteError}
        </div>
      )}

      {isLoading ? (
        <div className="space-y-6">
          <section className="rounded-xl border border-border bg-surface shadow-sm">
            <div className="flex items-center gap-2 border-b border-border px-5 py-4">
              <Skeleton className="h-4 w-4 rounded-full" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-5 w-8 rounded-full" />
            </div>
            <div className="px-5 py-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-6 border-b border-border py-4 last:border-0">
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <Skeleton className="h-9 w-9 rounded-full" />
                    <div className="space-y-1.5">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-12" />
                </div>
              ))}
            </div>
          </section>
          <section className="rounded-xl border border-border bg-surface shadow-sm">
            <div className="flex items-center gap-2 border-b border-border px-5 py-4">
              <Skeleton className="h-4 w-4 rounded-full" />
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-5 w-8 rounded-full" />
            </div>
            <div className="px-5 py-4">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="mt-3 h-4 w-3/4" />
            </div>
          </section>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Members */}
          <section className="rounded-xl border border-border bg-surface shadow-sm">
            <div className="flex items-center gap-2 border-b border-border px-5 py-4">
              <Users className="h-4 w-4 text-foreground-muted" />
              <h2 className="text-sm font-semibold text-foreground">Members</h2>
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                {members.length}
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border text-xs uppercase tracking-wide text-foreground-muted">
                    <th className="px-5 py-2.5 font-medium">Member</th>
                    <th className="px-5 py-2.5 font-medium">Role</th>
                    <th className="px-5 py-2.5 font-medium">Joined</th>
                    <th className="px-5 py-2.5 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {members.map((member) => {
                    const isSelf = member.id === user?.id;
                    return (
                      <tr key={member.id} className="border-b border-border last:border-b-0">
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                              {member.avatarUrl ? (
                                <img
                                  src={`/api/v1/auth/${member.id}/avatar?v=${encodeURIComponent(member.avatarUrl)}`}
                                  alt=""
                                  className="h-full w-full rounded-full object-cover"
                                />
                              ) : (
                                initials(member.name)
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="truncate font-medium text-foreground">
                                {member.name}
                                {isSelf && <span className="ml-1.5 text-xs text-foreground-muted">(you)</span>}
                              </p>
                              <p className="truncate text-xs text-foreground-muted">{member.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3">
                          {isSelf || member.id === user?.id ? (
                            <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium uppercase text-primary">
                              {roleLabel(member.role)}
                            </span>
                          ) : (
                            <div className="flex items-center gap-2">
                              <select
                                value={member.role}
                                onChange={(e) => handleRoleChange(member.id, e.target.value)}
                                disabled={savingMember === member.id}
                                className="h-8 rounded-lg border-0 bg-surface px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
                              >
                                {ROLE_OPTIONS.map((opt) => (
                                  <option key={opt.value} value={opt.value}>
                                    {opt.label}
                                  </option>
                                ))}
                              </select>
                              {savingMember === member.id && (
                                <Loader2 className="h-3.5 w-3.5 animate-spin text-foreground-muted" />
                              )}
                            </div>
                          )}
                        </td>
                        <td className="px-5 py-3 text-xs text-foreground-muted">
                          {formatDate(member.joinedAt)}
                        </td>
                         <td className="px-5 py-3 text-right">
                            <div className="flex justify-end">
                              {!isSelf && (
                                <DeleteMinusButton label="Remove member" onClick={() => setPendingDelete({ kind: 'remove', id: member.id })} />
                              )}
                            </div>
                          </td>
                      </tr>
                    );
                  })}
                  {members.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-5 py-10 text-center text-sm text-foreground-muted">
                        No members yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* Invite */}
          <section className="rounded-xl border border-border bg-surface p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <UserPlus className="h-4 w-4 text-foreground-muted" />
              <h2 className="text-sm font-semibold text-foreground">Invite a member</h2>
            </div>
            <form onSubmit={handleInvite} className="mt-4 flex flex-col gap-3 sm:flex-row">
              <div className="relative flex-1">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground-muted" />
                <input
                  type="email"
                  required
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="colleague@example.com"
                  className="h-10 w-full rounded-lg border border-border bg-surface pl-9 pr-3 text-sm text-foreground placeholder:text-foreground-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value)}
                className="h-10 rounded-lg border-0 bg-surface px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary sm:w-52"
              >
                {INVITABLE_ROLES.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <div className="relative flex items-center gap-2">
                <span className="hidden text-xs text-foreground-muted sm:inline">
                  {inviteExpiryDays}d • {inviteUsageLimit == null ? 'No limit' : `Limit ${inviteUsageLimit}`}
                </span>
                <button
                  type="button"
                  onClick={() => setShowInvitePopover((v) => !v)}
                  className="text-xs font-medium text-primary hover:underline"
                >
                  Edit expiry
                </button>
                {showInvitePopover && (
                  <div className="absolute right-0 top-full z-20 mt-2 w-72 rounded-xl border border-border bg-surface p-4 shadow-xl">
                    <p className="text-xs font-semibold text-foreground">Expiry duration</p>
                    <div className="mt-2 grid grid-cols-4 gap-2">
                      {[1, 3, 7, 30].map((d) => (
                        <button
                          key={d}
                          type="button"
                          onClick={() => setInviteExpiryDays(d)}
                          className={`rounded-lg px-2 py-2 text-xs font-medium ${inviteExpiryDays === d ? 'bg-primary text-primary-foreground' : 'bg-surface-muted text-foreground hover:bg-surface-muted/80'}`}
                        >
                          {d}d
                        </button>
                      ))}
                    </div>
                    <p className="mt-4 text-xs font-semibold text-foreground">Usage limit</p>
                    <div className="mt-2 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setInviteUsageLimit(null)}
                        className={`rounded-lg px-3 py-1.5 text-xs font-medium ${inviteUsageLimit == null ? 'bg-primary text-primary-foreground' : 'border border-border bg-surface text-foreground'}`}
                      >
                        No limit
                      </button>
                      <span className="text-xs text-foreground-muted">or</span>
                      <input
                        type="number"
                        min={1}
                        max={50}
                        value={inviteUsageLimit ?? ''}
                        onChange={(e) => {
                          const v = e.target.value ? parseInt(e.target.value, 10) : null;
                          if (v == null || (v >= 1 && v <= 50)) setInviteUsageLimit(v);
                        }}
                        placeholder="1-50"
                        className="h-8 w-20 rounded-lg border border-border bg-surface px-2 text-xs text-foreground placeholder:text-foreground-muted focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                    <div className="mt-4 flex justify-end">
                      <button type="button" onClick={() => setShowInvitePopover(false)} className="rounded-lg bg-action px-3 py-1.5 text-xs font-medium text-action-foreground">Done</button>
                    </div>
                  </div>
                )}
              </div>
              <button
                type="submit"
                disabled={isInviting}
                className="flex h-10 items-center justify-center gap-2 rounded-lg bg-action px-4 text-sm font-medium text-action-foreground transition-colors hover:bg-action/90 disabled:opacity-50"
              >
                {isInviting ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                 Invite
               </button>
            </form>
          </section>

          {/* Pending invitations */}
          {!isLoading && invitations.length > 0 && (
            <section className="rounded-xl border border-border bg-surface shadow-sm">
              <div className="flex items-center gap-2 border-b border-border px-5 py-4">
                <Mail className="h-4 w-4 text-foreground-muted" />
                <h2 className="text-sm font-semibold text-foreground">Pending invitations</h2>
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                  {invitations.filter((i) => i.status === 'pending').length}
                </span>
              </div>
              <div className="divide-y divide-border">
                {invitations
                  .filter((inv) => inv.status === 'pending')
                  .map((inv) => {
                    const expired = isExpired(inv.expiresAt);
                    return (
                      <div key={inv.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-foreground">{inv.email}</p>
                          <p className="mt-0.5 flex items-center gap-1.5 text-xs text-foreground-muted">
                            <Building className="h-3 w-3" />
                            {roleLabel(inv.role)}
                          </p>
                        </div>
                        <div className="relative flex items-center gap-2">
                          {editingExpiresId === inv.id ? (
                            <div className="absolute right-0 top-full z-20 mt-2 w-72 rounded-xl border border-border bg-surface p-4 shadow-xl">
                              <p className="text-xs font-semibold text-foreground">Expiry duration</p>
                              <div className="mt-2 grid grid-cols-4 gap-2">
                                {[1, 3, 7, 30].map((d) => (
                                  <button
                                    key={d}
                                    type="button"
                                    onClick={() => setEditingExpiryDays(d)}
                                    className={`rounded-lg px-2 py-2 text-xs font-medium ${editingExpiryDays === d ? 'bg-primary text-primary-foreground' : 'bg-surface-muted text-foreground'}`}
                                  >
                                    {d}d
                                  </button>
                                ))}
                              </div>
                              <p className="mt-3 text-xs font-semibold text-foreground">Usage limit</p>
                              <div className="mt-2 flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => setEditingUsageLimit(null)}
                                  className={`rounded-lg px-3 py-1.5 text-xs font-medium ${editingUsageLimit == null ? 'bg-primary text-primary-foreground' : 'border border-border bg-surface text-foreground'}`}
                                >
                                  No limit
                                </button>
                                <span className="text-xs text-foreground-muted">or</span>
                                <input
                                  type="number"
                                  min={1}
                                  max={50}
                                  value={editingUsageLimit ?? ''}
                                  onChange={(e) => {
                                    const v = e.target.value ? parseInt(e.target.value, 10) : null;
                                    if (v == null || (v >= 1 && v <= 50)) setEditingUsageLimit(v);
                                  }}
                                  placeholder="1-50"
                                  className="h-8 w-20 rounded-lg border border-border bg-surface px-2 text-xs text-foreground placeholder:text-foreground-muted focus:outline-none focus:ring-1 focus:ring-primary"
                                />
                              </div>
                              <div className="mt-3 flex justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() => setEditingExpiresId(null)}
                                  className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground"
                                >
                                  Cancel
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleUpdateExpires(inv.id)}
                                  disabled={savingExpires === inv.id}
                                  className="rounded-lg bg-action px-3 py-1.5 text-xs font-medium text-action-foreground disabled:opacity-50"
                                >
                                  {savingExpires === inv.id ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Save'}
                                </button>
                              </div>
                            </div>
                          ) : null}
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-[10px] font-medium uppercase ${
                              expired ? 'bg-danger/10 text-danger' : 'bg-info/20 text-info'
                            }`}
                          >
                            {expired ? (
                              <span className="inline-flex items-center gap-1">
                                <Clock className="h-3 w-3" /> Expired {formatDate(inv.expiresAt)}
                              </span>
                            ) : (
                              `Expires ${formatDate(inv.expiresAt)}`
                            )}
                          </span>
                          <span className="rounded-full bg-surface-muted px-2 py-0.5 text-[10px] font-medium text-foreground-muted">
                            {inv.usageLimit == null ? 'No limit' : `Limit ${inv.usageLimit}${inv.usedCount ? ` • ${inv.usedCount} used` : ''}`}
                          </span>
                        </div>
                        <button
                          onClick={() => handleCopyLink(inv.devAcceptUrl)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-surface-muted"
                        >
                          <Copy className="h-3.5 w-3.5" /> Copy link
                        </button>
                        {!expired && (
                          <button
                            type="button"
                            onClick={() => {
                              const diffDays = Math.round((new Date(inv.expiresAt).getTime() - Date.now()) / (24 * 3600 * 1000));
                              const snap = [1, 3, 7, 30].reduce((a, b) => Math.abs(b - diffDays) < Math.abs(a - diffDays) ? b : a, 3);
                              setEditingExpiryDays(snap);
                              setEditingUsageLimit(inv.usageLimit ?? null);
                              setEditingExpiresId((prev) => (prev === inv.id ? null : inv.id));
                            }}
                            className="inline-flex items-center gap-1.5 rounded-lg border-0 bg-surface px-2.5 py-1.5 text-xs font-medium text-primary hover:underline"
                          >
                            Edit expiry
                          </button>
                        )}
                        {!expired && (
                            <DeleteMinusButton label="Revoke invitation" onClick={() => setPendingDelete({ kind: 'revoke', id: inv.id })} />
                          )}
                      </div>
                    );
                  })}
              </div>
            </section>
          )}
        </div>
      )}

      <ConfirmDialog
        open={pendingDelete !== null}
        title={pendingDelete?.kind === 'remove' ? 'Remove member?' : 'Revoke invitation?'}
        description={
          pendingDelete?.kind === 'remove'
            ? 'This member will be removed from the organization.'
            : 'The invitation will be revoked and can no longer be accepted.'
        }
        confirmLabel={pendingDelete?.kind === 'remove' ? 'Remove' : 'Revoke'}
        onConfirm={confirmPendingDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </PageLayout>
  );
}