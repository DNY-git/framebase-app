import { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import type { ProjectDomain, ProjectMemberDomain, AuditLogDomain } from '@constructtrack/types';
import { ProjectStatus } from '@constructtrack/types';
import { authFetch } from '../../auth-fetch';
import { useAuthStore } from '../../stores/auth-store';
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
} from '../../shared/components/icons';

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
  if (!cents && cents !== 0) return '—';
  if (cents >= 100_000_00) return `$${(cents / 100_000_00).toFixed(1)}M`;
  if (cents >= 1_000_00) return `$${(cents / 1_000_00).toFixed(1)}M`;
  return `$${(cents / 100).toLocaleString()}`;
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

export function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const canEdit = user?.role === 'admin' || user?.role === 'project_manager';
  const isAdmin = user?.role === 'admin';

  const [project, setProject] = useState<ProjectDomain | null>(null);
  const [members, setMembers] = useState<ProjectMemberDomain[]>([]);
  const [activity, setActivity] = useState<AuditLogDomain[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'members' | 'activity'>('overview');

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

  useEffect(() => {
    fetchProject();
    fetchMembers();
    fetchActivity();
  }, [fetchProject, fetchMembers, fetchActivity]);

  const handleDelete = async () => {
    if (!id) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      const res = await authFetch(`/api/v1/projects/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        const message = (body as { error?: { message?: string } } | null)?.error?.message;
        throw new Error(message ?? `Failed to delete project (${res.status})`);
      }
      navigate('/projects');
    } catch (err) {
      setDeleteError((err as Error).message);
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <span className="text-sm text-foreground-muted">Loading project...</span>
        </div>
        <div className="h-64 animate-pulse rounded-xl border border-border bg-surface" />
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
        <InfoCard icon={<Building className="h-4 w-4" />} label="Budget" value={formatBudget(project.budgetCents)} />
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
          {members.length === 0 ? (
            <div className="rounded-xl border border-border bg-surface p-8 text-center">
              <Users className="mx-auto mb-2 h-8 w-8 text-foreground-muted/30" />
              <p className="text-sm text-foreground-muted">No members assigned</p>
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-surface divide-y divide-border">
              {members.map((m) => (
                <div key={m.id} className="flex items-center justify-between px-5 py-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      User {m.userId?.slice(0, 8)}...
                    </p>
                    <p className="text-xs text-foreground-muted">Joined {formatDate(m.createdAt)}</p>
                  </div>
                  <span className="rounded-full bg-surface-muted px-2 py-0.5 text-xs font-medium text-foreground-muted capitalize">
                    {m.role}
                  </span>
                </div>
              ))}
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
                      <p className="text-sm text-foreground">
                        <span className="font-medium">{log.action}</span>
                        {log.entityType && (
                          <span className="text-foreground-muted"> on {log.entityType}</span>
                        )}
                      </p>
                      {log.after && (
                        <p className="mt-0.5 text-xs text-foreground-muted">
                          {JSON.stringify(log.after)}
                        </p>
                      )}
                    </div>
                    <span className="shrink-0 text-xs text-foreground-muted">{timeAgo(log.createdAt)}</span>
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
      {showDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl border border-border bg-surface p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-foreground">Delete project?</h3>
            <p className="mt-2 text-sm text-foreground-muted">
              <span className="font-medium text-foreground">{project.name}</span> will be permanently
              deleted. This action cannot be undone.
            </p>
            {deleteError && (
              <p className="mt-3 rounded-lg border border-danger/20 bg-danger/5 p-3 text-sm text-danger">
                {deleteError}
              </p>
            )}
            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowDelete(false);
                  setDeleteError(null);
                }}
                disabled={isDeleting}
                className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-surface-muted disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="inline-flex items-center gap-2 rounded-lg bg-danger px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-danger/90 disabled:opacity-50"
              >
                {isDeleting && <Loader2 className="h-4 w-4 animate-spin" />}
                {isDeleting ? 'Deleting…' : 'Delete project'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function InfoCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="mb-1 flex items-center gap-2 text-xs text-foreground-muted">
        {icon} {label}
      </div>
      <p className="text-sm font-medium text-foreground truncate">{value}</p>
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
