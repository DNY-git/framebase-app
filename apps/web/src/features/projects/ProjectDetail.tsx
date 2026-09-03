import { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import type { ProjectDomain, ProjectMemberDomain, AuditLogDomain } from '@constructtrack/types';
import { ProjectStatus, ProjectRole } from '@constructtrack/types';
import { authFetch } from '../../auth-fetch';
import { useAuthStore } from '../../stores/auth-store';
import { Skeleton } from '../../shared/components/Skeleton';
import { ProjectForm } from './ProjectForm';
import {
  ArrowLeft,
  Edit,
  Trash,
  Calendar,
  MapPin,
  Users,
  Clock,
  Loader2,
  Building,
  UserPlus,
} from '../../shared/components/icons';
import { ConfirmDialog } from '../../shared/components/ConfirmDialog';
import { formatCompactCurrency } from '../../utils';

const STATUS_STYLES: Record<string, string> = {
  [ProjectStatus.PLANNING]: 'bg-info/10 text-info',
  [ProjectStatus.ACTIVE]: 'bg-success/10 text-success',
  [ProjectStatus.ON_HOLD]: 'bg-warning/10 text-warning',
  [ProjectStatus.COMPLETED]: 'bg-primary/10 text-primary',
  [ProjectStatus.ARCHIVED]: 'bg-foreground-muted/10 text-foreground-muted',
};

function formatDate(d?: Date | string | null): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatBudget(cents?: number): string {
  return formatCompactCurrency(cents ?? null);
}

/** Organization member directory entry (GET /organizations/directory). */
interface DirectoryEntry {
  id: string;
  name: string;
  email: string;
  role: string;
  avatarUrl: string | null;
  joinedAt: string;
}

const PROJECT_ROLE_LABELS: Record<string, string> = {
  [ProjectRole.VIEWER]: 'Viewer',
  [ProjectRole.CREW]: 'Crew',
  [ProjectRole.ENGINEER]: 'Engineer',
  [ProjectRole.MANAGER]: 'Manager',
  [ProjectRole.ADMIN]: 'Admin',
};

function projectRoleLabel(role: string): string {
  return PROJECT_ROLE_LABELS[role] ?? role.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function initials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function timeAgo(date: Date | string): string {
  const now = new Date();
  const then = new Date(date);
  const diffMs = now.getTime() - then.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return formatDate(date);
}

function formatCentsCompact(cents: number): string {
  return formatCompactCurrency(cents);
}

function describeActivity(log: AuditLogDomain): string {
  const after = log.after as Record<string, unknown> | undefined;
  const before = log.before as Record<string, unknown> | undefined;
  const action = log.action;

  if (action === 'project_created') {
    const name = (after?.name as string) ?? 'Project';
    const code = after?.code ? ` (${after.code as string})` : '';
    return `Project created — ${name}${code}`;
  }
  if (action === 'project_updated') {
    if (!before || !after) return 'Project updated';
    const changes: string[] = [];
    const meaningfulKeys = ['name', 'status', 'phase', 'budgetCents', 'location', 'managerId', 'description', 'startDate', 'endDate'] as const;
    for (const key of meaningfulKeys) {
      const b = before[key];
      const a = after[key];
      if (JSON.stringify(b) !== JSON.stringify(a)) {
        if (key === 'status' && typeof a === 'string') {
          changes.push(`Status changed to ${String(a).replace(/_/g, ' ')}`);
        } else if (key === 'budgetCents' && typeof a === 'number') {
          changes.push(`Budget updated to ${formatCentsCompact(a)}`);
        } else if (key === 'location' && typeof a === 'string' && a) {
          changes.push(`Location set to ${a}`);
        } else if (key === 'name' && typeof a === 'string' && a) {
          changes.push(`Renamed to "${a}"`);
        } else if (key === 'phase' && typeof a === 'string' && a) {
          changes.push(`Phase set to ${a}`);
        } else if (key === 'managerId') {
          if (a) changes.push('Manager assigned');
          else changes.push('Manager unassigned');
        } else if (key === 'description') {
          changes.push('Description updated');
        } else if (key === 'startDate' || key === 'endDate') {
          if (a) changes.push(`${key === 'startDate' ? 'Start date' : 'End date'} set to ${formatDate(a as string)}`);
        }
      }
    }
    if (changes.length === 0) return 'Project updated';
    if (changes.length === 1) return changes[0];
    return changes.slice(0, 2).join(' · ') + (changes.length > 2 ? ` +${changes.length - 2} more` : '');
  }
  if (action === 'project_archived') return 'Project archived';
  if (action === 'project_deleted') return 'Project deleted';
  if (action === 'project_member_added') {
    const role = after?.role ? ` as ${projectRoleLabel(after.role as string)}` : '';
    return `Member added${role}`;
  }
  if (action === 'project_member_removed') {
    const role = before?.role ? ` (${projectRoleLabel(before.role as string)})` : '';
    return `Member removed${role}`;
  }
  if (action === 'project_member_role_updated') {
    const r = after?.role ? projectRoleLabel(after.role as string) : 'new role';
    return `Member role changed to ${r}`;
  }
  // Fallback: humanize action
  return action.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const canEdit =
    user?.role === 'owner' ||
    user?.role === 'admin' ||
    user?.role === 'project_manager';
  const isAdmin = user?.role === 'owner' || user?.role === 'admin';

  const [project, setProject] = useState<ProjectDomain | null>(null);
  const [members, setMembers] = useState<ProjectMemberDomain[]>([]);
  const [directory, setDirectory] = useState<DirectoryEntry[]>([]);
  const [activity, setActivity] = useState<AuditLogDomain[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [pendingRemoveUserId, setPendingRemoveUserId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'members' | 'activity'>('overview');

  // Member assignment state
  const [assignUserId, setAssignUserId] = useState('');
  const [assignRole, setAssignRole] = useState<string>(ProjectRole.ENGINEER);
  const [isAssigning, setIsAssigning] = useState(false);
  const [memberError, setMemberError] = useState<string | null>(null);
  const [removingUserId, setRemovingUserId] = useState<string | null>(null);

  const fetchProject = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await authFetch(`/api/v1/projects/${id}`);
      if (!res.ok) throw new Error('Failed to load project');
      const body = await res.json();
      setProject(body.data ?? body);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  const fetchMembers = useCallback(async () => {
    if (!id) return;
    try {
      const res = await authFetch(`/api/v1/projects/${id}/members`);
      if (!res.ok) throw new Error('Failed to load members');
      const body = await res.json();
      const items = body.data ?? body;
      setMembers(Array.isArray(items) ? items : []);
    } catch {
      // Members are optional
    }
  }, [id]);

  const fetchActivity = useCallback(async () => {
    if (!id) return;
    try {
      const res = await authFetch(`/api/v1/projects/${id}/activity?limit=20`);
      if (!res.ok) throw new Error('Failed to load activity');
      const body = await res.json();
      const items = body.data ?? body;
      setActivity(Array.isArray(items) ? items : []);
    } catch {
      // Activity is optional
    }
  }, [id]);

  const fetchDirectory = useCallback(async () => {
    try {
      const res = await authFetch('/api/v1/organizations/directory');
      if (!res.ok) return;
      const body = await res.json();
      const items = body.data ?? body;
      setDirectory(Array.isArray(items) ? items : []);
    } catch {
      // Directory is optional (non-manager roles get nothing)
      setDirectory([]);
    }
  }, []);

  useEffect(() => {
    fetchProject();
    fetchMembers();
    fetchActivity();
    fetchDirectory();
  }, [fetchProject, fetchMembers, fetchActivity, fetchDirectory]);

  // Clear stale member errors when project context changes or members reload.
  useEffect(() => {
    setMemberError(null);
  }, [id]);

  useEffect(() => {
    if (activeTab !== 'members') setMemberError(null);
  }, [activeTab]);

  const handleAssignMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !assignUserId) return;
    setIsAssigning(true);
    setMemberError(null);
    try {
      const res = await authFetch(`/api/v1/projects/${id}/members`, {
        method: 'POST',
        body: JSON.stringify({ userId: assignUserId, role: assignRole }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(
          (body as { message?: string } | null)?.message ??
            `Failed to add member (${res.status})`,
        );
      }
      setAssignUserId('');
      await fetchMembers();
    } catch (err) {
      setMemberError((err as Error).message);
    } finally {
      setIsAssigning(false);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!id) return;
    if (userId === user?.id) {
      setMemberError('You cannot remove yourself from a project you manage.');
      return;
    }
    setRemovingUserId(userId);
    setMemberError(null);
    try {
      const res = await authFetch(`/api/v1/projects/${id}/members/${userId}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(
          (body as { message?: string } | null)?.message ??
            `Failed to remove member (${res.status})`,
        );
      }
      await fetchMembers();
    } catch (err) {
      setMemberError((err as Error).message);
    } finally {
      setRemovingUserId(null);
    }
  };

  const memberDirectory = useCallback(
    (userId: string): DirectoryEntry | undefined =>
      directory.find((d) => d.id === userId),
    [directory],
  );

  const assignableMembers = directory.filter(
    (d) => !members.some((m) => m.userId === d.id),
  );

  const handleDelete = async () => {
    if (!id) return;
    setIsDeleting(true);
    setError(null);
    try {
      const res = await authFetch(`/api/v1/projects/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        const message = (body as { error?: { message?: string } } | null)?.error?.message;
        throw new Error(message ?? `Failed to delete project (${res.status})`);
      }
      navigate('/projects');
    } catch (err) {
      setError((err as Error).message);
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex flex-col gap-3 border-b border-border pb-4 md:flex-row md:items-start md:justify-between">
          <div className="space-y-2">
            <Skeleton className="h-7 w-72" />
            <Skeleton className="h-4 w-48" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-9 w-20" />
            <Skeleton className="h-9 w-20" />
          </div>
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="space-y-3 rounded-xl border border-border bg-surface p-5">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
          <div className="space-y-3 rounded-xl border border-border bg-surface p-5">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
          <div className="space-y-3 rounded-xl border border-border bg-surface p-5">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/3" />
          </div>
        </div>
        <div className="flex gap-2 border-b border-border pb-4">
          <Skeleton className="h-8 w-28 rounded-full" />
          <Skeleton className="h-8 w-24 rounded-full" />
          <Skeleton className="h-8 w-28 rounded-full" />
        </div>
        <Skeleton className="h-48 w-full rounded-xl border border-border" />
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="space-y-4">
        <Link to="/projects" className="inline-flex items-center gap-1 text-sm text-foreground-muted hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to Projects
        </Link>
        <div className="rounded-xl border border-border bg-surface p-12 text-center">
          <p className="text-sm font-medium text-foreground">{error ?? 'Project not found'}</p>
          <button
            onClick={fetchProject}
            className="mt-3 text-sm font-medium text-primary hover:underline"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link
            to="/projects"
            className="mb-2 inline-flex items-center gap-1 text-sm text-foreground-muted hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> All Projects
          </Link>
          <div className="flex items-center gap-3">
            <span className="rounded-md bg-surface-muted px-2 py-0.5 text-xs font-mono font-semibold text-foreground-muted">
              {project.code}
            </span>
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[project.status] ?? 'bg-foreground-muted/10 text-foreground-muted'}`}>
              {project.status.replace(/_/g, ' ')}
            </span>
          </div>
          <h1 className="mt-2 text-2xl font-bold text-foreground">{project.name}</h1>
          {project.description && (
            <p className="mt-1 text-sm text-foreground-muted">{project.description}</p>
          )}
        </div>
        {canEdit && (
          <div className="flex items-center gap-2">
            {isAdmin && (
              <button
                onClick={() => setShowDelete(true)}
                className="inline-flex items-center gap-2 rounded-lg border border-danger/30 px-4 py-2 text-sm font-medium text-danger transition-colors hover:bg-danger/10"
              >
                <Trash className="h-4 w-4" /> Delete
              </button>
            )}
            <button
              onClick={() => setShowEdit(true)}
              className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-surface-muted"
            >
              <Edit className="h-4 w-4" /> Edit
            </button>
          </div>
        )}
      </div>

      {/* Quick Info Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <InfoCard icon={<Building className="h-4 w-4" />} label="Budget" value={formatBudget(project.budgetCents)} valueClassName="money" />
        <InfoCard icon={<MapPin className="h-4 w-4" />} label="Location" value={project.location ?? '—'} />
        <InfoCard icon={<Calendar className="h-4 w-4" />} label="Timeline" value={
          project.startDate || project.endDate
            ? `${formatDate(project.startDate)} — ${formatDate(project.endDate)}`
            : '—'
        } />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {(['overview', 'members', 'activity'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2.5 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${
              activeTab === tab
                ? 'border-primary text-foreground'
                : 'border-transparent text-foreground-muted hover:text-foreground'
            }`}
          >
            {tab}
            {tab === 'members' && members.length > 0 && (
              <span className="ml-1.5 rounded-full bg-surface-muted px-1.5 py-0.5 text-xs">{members.length}</span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-surface p-6">
            <h3 className="mb-4 text-sm font-semibold text-foreground">Project Details</h3>
            <dl className="grid gap-4 sm:grid-cols-2">
              <Detail label="Status" value={project.status.replace(/_/g, ' ')} />
              <Detail label="Phase" value={project.phase ?? '—'} />
              <Detail label="Created" value={formatDate(project.createdAt)} />
              <Detail label="Updated" value={formatDate(project.updatedAt)} />
            </dl>
          </div>
        </div>
      )}

      {activeTab === 'members' && (
        <div className="space-y-4">
          {canEdit && (
            <form
              onSubmit={handleAssignMember}
              className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4 shadow-sm sm:flex-row sm:items-end"
            >
              <div className="flex-1">
                <label htmlFor="assign-user" className="mb-1.5 block text-xs font-medium text-foreground-muted">
                  Assign organization member
                </label>
                <select
                  id="assign-user"
                  value={assignUserId}
                  onChange={(e) => setAssignUserId(e.target.value)}
                  required
                  className="h-10 w-full rounded-lg appearance-none border-0 bg-surface px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary sm:w-64"
                >
                  <option value="" disabled>
                    {assignableMembers.length > 0
                      ? 'Select a member…'
                      : 'No unassigned members'}
                  </option>
                  {assignableMembers.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.email})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="assign-role" className="mb-1.5 block text-xs font-medium text-foreground-muted">
                  Project role
                </label>
                <select
                  id="assign-role"
                  value={assignRole}
                  onChange={(e) => setAssignRole(e.target.value)}
                  className="h-10 rounded-lg appearance-none border-0 bg-surface px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary sm:w-44"
                >
                  {Object.values(ProjectRole).map((r) => (
                    <option key={r} value={r}>
                      {projectRoleLabel(r)}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="submit"
                disabled={isAssigning || assignableMembers.length === 0}
                className="flex h-10 items-center justify-center gap-2 rounded-lg bg-action px-4 text-sm font-medium text-action-foreground transition-colors hover:bg-action/90 disabled:opacity-50"
              >
                {isAssigning ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                Add member
              </button>
            </form>
          )}

          {memberError && (
            <div className="rounded-lg border border-danger/20 bg-danger/5 p-3 text-sm text-danger">
              {memberError}
            </div>
          )}

          {members.length === 0 ? (
            <div className="rounded-xl border border-border bg-surface p-8 text-center">
              <Users className="mx-auto mb-2 h-8 w-8 text-foreground-muted/30" />
              <p className="text-sm text-foreground-muted">No members assigned</p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-border bg-surface">
              <div className="divide-y divide-border">
                {members.map((m) => {
                  const entry = memberDirectory(m.userId);
                  return (
                    <div key={m.id} className="flex items-center justify-between px-5 py-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/10 text-xs font-semibold text-primary">
                          {entry?.avatarUrl ? (
                            <img
                              src={`/api/v1/auth/${entry.id}/avatar?v=${encodeURIComponent(entry.avatarUrl)}`}
                              alt=""
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            initials(entry?.name ?? '?')
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-foreground">
                            {entry?.name ?? `User ${m.userId?.slice(0, 8)}…`}
                            {m.userId === user?.id && (
                              <span className="ml-1.5 text-xs text-foreground-muted">(you)</span>
                            )}
                          </p>
                          <p className="truncate text-xs text-foreground-muted">
                            {entry?.email ?? `Member since ${formatDate(m.createdAt)}`}
                          </p>
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-3">
                        <span className="rounded-full bg-surface-muted px-2 py-0.5 text-xs font-medium text-foreground-muted capitalize">
                          {projectRoleLabel(m.role)}
                        </span>
                        {canEdit && m.userId !== user?.id && (
                          <button
                            onClick={() => setPendingRemoveUserId(m.userId)}
                            disabled={removingUserId === m.userId}
                            title="Remove from project"
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-danger/20 text-danger transition-colors hover:bg-danger/5 disabled:opacity-50"
                          >
                            {removingUserId === m.userId ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Trash className="h-3.5 w-3.5" />
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'activity' && (
        <div className="space-y-4">
          {activity.length === 0 ? (
            <div className="rounded-xl border border-border bg-surface p-8 text-center">
              <Clock className="mx-auto mb-2 h-8 w-8 text-foreground-muted/30" />
              <p className="text-sm text-foreground-muted">No activity yet</p>
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-surface divide-y divide-border">
              {activity.map((log) => (
                <div key={log.id} className="px-5 py-3">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm text-foreground">{describeActivity(log)}</p>
                      <p className="mt-0.5 text-xs text-foreground-muted">{timeAgo(log.createdAt)}</p>
                    </div>
                    <span className="shrink-0 rounded-full bg-surface-muted px-2 py-0.5 text-[10px] font-medium capitalize text-foreground-muted">{log.entityType.replace(/_/g, ' ')}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Edit Modal */}
      {showEdit && (
        <ProjectForm
          project={project}
          onClose={() => setShowEdit(false)}
          onSaved={() => {
            setShowEdit(false);
            fetchProject();
            fetchActivity();
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmDialog
        open={showDelete}
        title="Delete project?"
        description={
          <span>
            <span className="font-medium text-foreground">{project.name}</span> will be permanently
            deleted. This action cannot be undone.
          </span>
        }
        confirmLabel="Delete project"
        isLoading={isDeleting}
        onConfirm={handleDelete}
        onCancel={() => {
          setShowDelete(false);
          setError(null);
        }}
      />

      <ConfirmDialog
        open={pendingRemoveUserId !== null}
        title="Remove member?"
        description="This member will be removed from the project."
        confirmLabel="Remove"
        onConfirm={() => {
          const uid = pendingRemoveUserId;
          setPendingRemoveUserId(null);
          if (uid) void handleRemoveMember(uid);
        }}
        onCancel={() => setPendingRemoveUserId(null)}
      />
    </div>
  );
}

function InfoCard({ icon, label, value, valueClassName }: { icon: React.ReactNode; label: string; value: string; valueClassName?: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="mb-1 flex items-center gap-2 text-xs text-foreground-muted">
        {icon} {label}
      </div>
      <p className={`text-sm font-medium text-foreground truncate ${valueClassName ?? ''}`}>{value}</p>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-foreground-muted">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium text-foreground capitalize">{value}</dd>
    </div>
  );
}
