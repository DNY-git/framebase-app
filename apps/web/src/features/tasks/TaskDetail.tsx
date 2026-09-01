import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import type { TaskDomain, TaskDependencyDomain, AuditLogDomain } from '@constructtrack/types';
import { TaskStatus, TaskPriority } from '@constructtrack/types';
import { authFetch } from '../../auth-fetch';
import { useAuthStore } from '../../stores/auth-store';
import { Skeleton } from '../../shared/components/Skeleton';
import { TaskForm } from './TaskForm';
import {
  ArrowLeft,
  Edit,
  Calendar,
  Clock,
  AlertTriangle,
  CheckSquare,
  ExternalLink,
  AlertCircle,
} from '../../shared/components/icons';
import { TaskConnectionsBoard } from './TaskConnectionsBoard';

/* ─── Helpers ─── */

const STATUS_STYLES: Record<string, string> = {
  [TaskStatus.TODO]: 'bg-info/10 text-info',
  [TaskStatus.IN_PROGRESS]: 'bg-warning/10 text-warning',
  [TaskStatus.BLOCKED]: 'bg-danger/10 text-danger',
  [TaskStatus.DONE]: 'bg-success/10 text-success',
  [TaskStatus.CANCELLED]: 'bg-foreground-muted/10 text-foreground-muted',
};

const STATUS_LABELS: Record<string, string> = {
  [TaskStatus.TODO]: 'To Do',
  [TaskStatus.IN_PROGRESS]: 'In Progress',
  [TaskStatus.BLOCKED]: 'Blocked',
  [TaskStatus.DONE]: 'Done',
  [TaskStatus.CANCELLED]: 'Cancelled',
};

const PRIORITY_STYLES: Record<string, string> = {
  [TaskPriority.LOW]: 'bg-foreground-muted/10 text-foreground-muted',
  [TaskPriority.MEDIUM]: 'bg-info/10 text-info',
  [TaskPriority.HIGH]: 'bg-warning/10 text-warning',
  [TaskPriority.CRITICAL]: 'bg-danger/10 text-danger',
};

const PRIORITY_LABELS: Record<string, string> = {
  [TaskPriority.LOW]: 'Low',
  [TaskPriority.MEDIUM]: 'Medium',
  [TaskPriority.HIGH]: 'High',
  [TaskPriority.CRITICAL]: 'Critical',
};

function formatDate(d?: Date | string | null): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
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

/* ─── Component ─── */

export function TaskDetail() {
  const { taskId } = useParams<{ taskId: string }>();
  const { user } = useAuthStore();
  const canEdit = user?.role !== 'viewer';

  const [task, setTask] = useState<TaskDomain | null>(null);
  const [dependencies, setDependencies] = useState<{ predecessors: TaskDependencyDomain[]; successors: TaskDependencyDomain[] }>({ predecessors: [], successors: [] });
  const [activity, setActivity] = useState<AuditLogDomain[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showEdit, setShowEdit] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'connections' | 'dependencies' | 'activity'>('details');
  const [projectName, setProjectName] = useState<string | undefined>(undefined);

  const fetchTask = useCallback(async () => {
    if (!taskId) return;
    setIsLoading(true);
    setError(null);
    try {
      // We need projectId — try fetching from projects list first
      const projRes = await authFetch('/api/v1/projects?perPage=100');
      if (!projRes.ok) throw new Error('Failed to load projects');
      const projBody = await projRes.json();
      const projects = projBody.data ?? [];

      // Find which project has this task
      let found: TaskDomain | null = null;
      for (const proj of projects) {
        const taskRes = await authFetch(`/api/v1/projects/${proj.id}/tasks/${taskId}`);
        if (taskRes.ok) {
          const taskBody = await taskRes.json();
          found = taskBody.data ?? taskBody;
          break;
        }
      }

      if (!found) throw new Error('Task not found');
      setTask(found);
      // Fetch project name for connections board
      try {
        const projDetailRes = await authFetch(`/api/v1/projects/${found.projectId}`);
        if (projDetailRes.ok) {
          const projDetailBody = await projDetailRes.json();
          setProjectName(projDetailBody.data?.name ?? projDetailBody.name ?? undefined);
        }
      } catch {
        // ignore
      }

      // Fetch dependencies
      const depRes = await authFetch(`/api/v1/projects/${found.projectId}/tasks/${taskId}/dependencies`);
      if (depRes.ok) {
        const depBody = await depRes.json();
        setDependencies(depBody.data ?? { predecessors: [], successors: [] });
      }

      // Fetch activity
      const actRes = await authFetch(`/api/v1/projects/${found.projectId}/tasks/${taskId}/activity?limit=20`);
      if (actRes.ok) {
        const actBody = await actRes.json();
        setActivity(Array.isArray(actBody.data) ? actBody.data : Array.isArray(actBody) ? actBody : []);
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  }, [taskId]);

  useEffect(() => { fetchTask(); }, [fetchTask]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex flex-col gap-3 border-b border-border pb-4 md:flex-row md:items-start md:justify-between">
          <div className="space-y-2">
            <Skeleton className="h-6 w-64" />
            <Skeleton className="h-4 w-40" />
          </div>
          <Skeleton className="h-9 w-24" />
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
        <Skeleton className="h-40 w-full rounded-xl border border-border" />
      </div>
    );
  }

  if (error || !task) {
    return (
      <div className="space-y-4">
        <Link to="/tasks" className="inline-flex items-center gap-1 text-sm text-foreground-muted hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to Tasks
        </Link>
        <div className="rounded-xl border border-border bg-surface p-12 text-center">
          <p className="text-sm font-medium text-foreground">{error ?? 'Task not found'}</p>
          <button onClick={fetchTask} className="mt-3 text-sm font-medium text-primary hover:underline">Retry</button>
        </div>
      </div>
    );
  }

  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== TaskStatus.DONE;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link to="/tasks" className="mb-2 inline-flex items-center gap-1 text-sm text-foreground-muted hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Back to Tasks
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[task.status]}`}>
              {STATUS_LABELS[task.status]}
            </span>
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${PRIORITY_STYLES[task.priority]}`}>
              {PRIORITY_LABELS[task.priority]}
            </span>
            {isOverdue && (
              <span className="inline-flex items-center gap-1 rounded-full bg-danger/10 px-2.5 py-0.5 text-xs font-medium text-danger">
                <AlertTriangle className="h-3 w-3" /> Overdue
              </span>
            )}
          </div>
          <h1 className="mt-2 text-2xl font-bold text-foreground">{task.title}</h1>
          {task.description && (
            <p className="mt-1 max-w-2xl text-sm text-foreground-muted">{task.description}</p>
          )}
        </div>
        {canEdit && (
          <button
            onClick={() => setShowEdit(true)}
            className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-surface-muted"
          >
            <Edit className="h-4 w-4" /> Edit
          </button>
        )}
      </div>

      {/* Quick Info */}
      <div className="grid gap-4 sm:grid-cols-4">
        <InfoCard icon={<Clock className="h-4 w-4" />} label="Due Date" value={formatDate(task.dueDate)} danger={!!isOverdue} />
        <InfoCard icon={<CheckSquare className="h-4 w-4" />} label="Status" value={STATUS_LABELS[task.status]} />
        <InfoCard icon={<AlertCircle className="h-4 w-4" />} label="Priority" value={PRIORITY_LABELS[task.priority]} />
        <InfoCard icon={<Calendar className="h-4 w-4" />} label="Created" value={formatDate(task.createdAt)} />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {(['details', 'connections', 'dependencies', 'activity'] as const).map((tab) => (
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
            {tab === 'dependencies' && (dependencies.predecessors.length + dependencies.successors.length) > 0 && (
              <span className="ml-1.5 rounded-full bg-surface-muted px-1.5 py-0.5 text-xs">
                {dependencies.predecessors.length + dependencies.successors.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'details' && (
        <div className="rounded-xl border border-border bg-surface p-6">
          <dl className="grid gap-4 sm:grid-cols-2">
            <Detail label="Project ID" value={task.projectId} mono />
            <Detail label="Assignee" value={task.assigneeId ?? 'Unassigned'} />
            <Detail label="Phase" value={task.phaseId ?? '—'} />
            <Detail label="Parent Task" value={task.parentId ?? '—'} />
            <Detail label="Order" value={String(task.order)} />
            <Detail label="Last Updated" value={formatDate(task.updatedAt)} />
          </dl>
        </div>
      )}

      {activeTab === 'connections' && task && (
        <TaskConnectionsBoard task={task} projectId={task.projectId} projectName={projectName} onDependencyChange={fetchTask} />
      )}

      {activeTab === 'dependencies' && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-border bg-surface p-5">
            <h3 className="mb-3 text-sm font-semibold text-foreground">Predecessors (blocks this task)</h3>
            {dependencies.predecessors.length === 0 ? (
              <p className="text-xs text-foreground-muted">No predecessors</p>
            ) : (
              <ul className="space-y-2">
                {dependencies.predecessors.map((d) => (
                  <li key={d.id} className="flex items-center gap-2 text-sm">
                    <ExternalLink className="h-3 w-3 text-foreground-muted" />
                    <span className="font-mono text-xs text-foreground-muted">{d.predecessorId.slice(0, 8)}...</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="rounded-xl border border-border bg-surface p-5">
            <h3 className="mb-3 text-sm font-semibold text-foreground">Successors (this task blocks)</h3>
            {dependencies.successors.length === 0 ? (
              <p className="text-xs text-foreground-muted">No successors</p>
            ) : (
              <ul className="space-y-2">
                {dependencies.successors.map((d) => (
                  <li key={d.id} className="flex items-center gap-2 text-sm">
                    <ExternalLink className="h-3 w-3 text-foreground-muted" />
                    <span className="font-mono text-xs text-foreground-muted">{d.successorId.slice(0, 8)}...</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {activeTab === 'activity' && (
        <div className="rounded-xl border border-border bg-surface">
          {activity.length === 0 ? (
            <div className="p-8 text-center">
              <Clock className="mx-auto mb-2 h-8 w-8 text-foreground-muted/30" />
              <p className="text-sm text-foreground-muted">No activity yet</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {activity.map((log) => (
                <div key={log.id} className="px-5 py-3">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm text-foreground">
                        <span className="font-medium">{log.action}</span>
                        {log.entityType && <span className="text-foreground-muted"> on {log.entityType}</span>}
                      </p>
                      {log.after && (
                        <p className="mt-0.5 text-xs text-foreground-muted">{JSON.stringify(log.after)}</p>
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
        <TaskForm
          projectId={task.projectId}
          task={task}
          onClose={() => setShowEdit(false)}
          onSaved={() => { setShowEdit(false); fetchTask(); }}
        />
      )}
    </div>
  );
}

/* ─── Sub-components ─── */

function InfoCard({ icon, label, value, danger }: { icon: React.ReactNode; label: string; value: string; danger?: boolean }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="mb-1 flex items-center gap-2 text-xs text-foreground-muted">{icon} {label}</div>
      <p className={`text-sm font-medium truncate ${danger ? 'text-danger' : 'text-foreground'}`}>{value}</p>
    </div>
  );
}

function Detail({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <dt className="text-xs text-foreground-muted">{label}</dt>
      <dd className={`mt-0.5 text-sm font-medium text-foreground break-all ${mono ? 'font-mono text-xs' : ''}`}>{value}</dd>
    </div>
  );
}
