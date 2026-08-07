import { useState, useCallback, useEffect } from 'react';
import { Link } from 'react-router-dom';
import type { TaskDomain, ProjectDomain } from '@constructtrack/types';
import { TaskStatus, TaskPriority } from '@constructtrack/types';
import { authFetch } from '../../auth-fetch';
import { useAuthStore } from '../../stores/auth-store';
import { PageLayout } from '../../shared/components/PageLayout';
import { FilterDropdown } from '../../shared/components/FilterDropdown';
import { TaskForm } from './TaskForm';
import {
  CheckSquare,
  Search,
  Plus,
  Clock,
  AlertTriangle,
} from '../../shared/components/icons';

/* ─── Constants ─── */

const COLUMNS: { status: TaskStatus; label: string }[] = [
  { status: TaskStatus.TODO, label: 'To Do' },
  { status: TaskStatus.IN_PROGRESS, label: 'In Progress' },
  { status: TaskStatus.BLOCKED, label: 'Blocked' },
  { status: TaskStatus.DONE, label: 'Done' },
];

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
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function isOverdue(dueDate?: Date | string | null): boolean {
  if (!dueDate) return false;
  return new Date(dueDate) < new Date();
}

/* ─── Main Component ─── */

export function TaskBoard() {
  const { user } = useAuthStore();
  const canCreate = user?.role !== 'viewer';

  const [projects, setProjects] = useState<ProjectDomain[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [tasks, setTasks] = useState<TaskDomain[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<'kanban' | 'table'>('kanban');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [priorityFilter, setPriorityFilter] = useState('');

  // Fetch projects
  useEffect(() => {
    authFetch('/api/v1/projects?perPage=100')
      .then(async (res) => {
        if (!res.ok) return;
        const body = await res.json();
        const items = body.data ?? [];
        setProjects(items);
        if (items.length === 1) setSelectedProjectId(items[0].id);
      })
      .catch(() => {});
  }, []);

  // Fetch tasks for selected project
  const fetchTasks = useCallback(async () => {
    if (!selectedProjectId) { setTasks([]); return; }
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: '1', perPage: '200' });
      if (search) params.set('search', search);
      const res = await authFetch(`/api/v1/projects/${selectedProjectId}/tasks?${params}`);
      if (!res.ok) throw new Error('Failed to load tasks');
      const body = await res.json();
      const items = body.data ?? body.items ?? [];
      setTasks(items);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  }, [selectedProjectId, search]);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
  };

  const filteredTasks = tasks.filter((t) => {
    if (priorityFilter && t.priority !== priorityFilter) return false;
    return true;
  });

  const tasksByStatus = COLUMNS.map((col) => ({
    ...col,
    tasks: filteredTasks.filter((t) => t.status === col.status),
  }));

  return (
    <PageLayout
      title="Tasks"
      subtitle="Plan, assign and track project tasks"
      actions={
        canCreate && selectedProjectId ? (
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" /> New Task
          </button>
        ) : undefined
      }
    >
      <div className="space-y-6">

      {/* Project Selector + Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <FilterDropdown
          value={selectedProjectId}
          onChange={setSelectedProjectId}
          placeholder="Select a project..."
          className="w-full sm:w-56"
          options={[
            { value: '', label: 'Select a project...' },
            ...projects.map((p) => ({ value: p.id, label: `${p.name} (${p.code})` })),
          ]}
        />

        {selectedProjectId && (
          <>
            <form onSubmit={handleSearch} className="flex flex-1 items-center gap-2">
              <div className="relative flex-1 max-w-xs">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground-muted" />
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Search tasks..."
                  className="h-10 w-full rounded-lg border border-border bg-surface pl-9 pr-3 text-sm text-foreground placeholder:text-foreground-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </form>

            <FilterDropdown
              value={priorityFilter}
              onChange={setPriorityFilter}
              placeholder="All Priorities"
              className="w-full sm:w-44"
              options={[
                { value: '', label: 'All Priorities' },
                { value: TaskPriority.LOW, label: 'Low' },
                { value: TaskPriority.MEDIUM, label: 'Medium' },
                { value: TaskPriority.HIGH, label: 'High' },
                { value: TaskPriority.CRITICAL, label: 'Critical' },
              ]}
            />

            {/* View Toggle */}
            <div className="flex rounded-lg border border-border bg-surface p-0.5">
              <button
                onClick={() => setView('kanban')}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  view === 'kanban' ? 'bg-primary text-primary-foreground' : 'text-foreground-muted hover:text-foreground'
                }`}
              >
                Board
              </button>
              <button
                onClick={() => setView('table')}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  view === 'table' ? 'bg-primary text-primary-foreground' : 'text-foreground-muted hover:text-foreground'
                }`}
              >
                Table
              </button>
            </div>
          </>
        )}
      </div>

      {error && (
        <div className="rounded-lg border border-danger/20 bg-danger/5 p-3 text-sm text-danger">
          {error}
          <button onClick={fetchTasks} className="ml-2 font-medium underline">Retry</button>
        </div>
      )}

      {/* No Project Selected */}
      {!selectedProjectId && (
        <div className="rounded-xl border border-border bg-surface p-12 text-center">
          <CheckSquare className="mx-auto mb-3 h-12 w-12 text-foreground-muted/30" />
          <p className="text-sm font-medium text-foreground">Select a project to view tasks</p>
          <p className="mt-1 text-xs text-foreground-muted">Choose from the dropdown above</p>
        </div>
      )}

      {/* Loading */}
      {isLoading && selectedProjectId && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-32 animate-pulse rounded-xl border border-border bg-surface" />
          ))}
        </div>
      )}

      {/* Kanban View */}
      {!isLoading && selectedProjectId && view === 'kanban' && (
        <div className="grid gap-4 lg:grid-cols-4">
          {tasksByStatus.map((col) => (
            <div key={col.status} className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-sm font-semibold text-foreground">{col.label}</h3>
                <span className="rounded-full bg-surface-muted px-2 py-0.5 text-xs font-medium text-foreground-muted">
                  {col.tasks.length}
                </span>
              </div>
              <div className="min-h-[200px] space-y-2 rounded-xl border border-border p-2">
                {col.tasks.length === 0 ? (
                  <p className="px-2 pt-4 text-center text-xs text-foreground-muted/50">No tasks</p>
                ) : (
                  col.tasks.map((task) => (
                    <TaskCard key={task.id} task={task} />
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Table View */}
      {!isLoading && selectedProjectId && view === 'table' && (
        <div className="rounded-xl border border-border bg-surface overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-muted">
                <th className="px-4 py-3 font-medium text-foreground-muted">Title</th>
                <th className="px-4 py-3 font-medium text-foreground-muted">Status</th>
                <th className="px-4 py-3 font-medium text-foreground-muted">Priority</th>
                <th className="px-4 py-3 font-medium text-foreground-muted">Due Date</th>
                <th className="px-4 py-3 font-medium text-foreground-muted">Assignee</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredTasks.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-foreground-muted">
                    No tasks found
                  </td>
                </tr>
              ) : (
                filteredTasks.map((task) => (
                  <tr key={task.id} className="hover:bg-surface-muted/50 transition-colors">
                    <td className="px-4 py-3">
                      <Link
                        to={`/tasks/${task.id}`}
                        className="font-medium text-foreground hover:text-primary transition-colors"
                      >
                        {task.title}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={task.status} />
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${PRIORITY_STYLES[task.priority]}`}>
                        {PRIORITY_LABELS[task.priority]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {task.dueDate ? (
                        <span className={`inline-flex items-center gap-1 text-xs ${isOverdue(task.dueDate) && task.status !== TaskStatus.DONE ? 'text-danger font-medium' : 'text-foreground-muted'}`}>
                          {isOverdue(task.dueDate) && task.status !== TaskStatus.DONE && <AlertTriangle className="h-3 w-3" />}
                          {formatDate(task.dueDate)}
                        </span>
                      ) : (
                        <span className="text-xs text-foreground-muted">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-foreground-muted">
                      {task.assigneeId ? task.assigneeId.slice(0, 8) + '...' : 'Unassigned'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Task Form Modal */}
      {showForm && selectedProjectId && (
        <TaskForm
          projectId={selectedProjectId}
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); fetchTasks(); }}
        />
      )}
      </div>
    </PageLayout>
  );
}

/* ─── Task Card (Kanban) ─── */

function TaskCard({ task }: { task: TaskDomain }) {
  return (
    <Link
      to={`/tasks/${task.id}`}
      className="block rounded-lg border border-border bg-surface p-3 shadow-sm transition-all hover:shadow-md hover:border-primary/30"
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <h4 className="text-sm font-medium text-foreground line-clamp-2">{task.title}</h4>
        <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${PRIORITY_STYLES[task.priority]}`}>
          {PRIORITY_LABELS[task.priority]}
        </span>
      </div>
      {task.description && (
        <p className="mb-2 text-xs text-foreground-muted line-clamp-2">{task.description}</p>
      )}
      <div className="flex items-center justify-between text-xs text-foreground-muted">
        {task.dueDate ? (
          <span className={`inline-flex items-center gap-1 ${isOverdue(task.dueDate) && task.status !== TaskStatus.DONE ? 'text-danger' : ''}`}>
            <Clock className="h-3 w-3" />
            {formatDate(task.dueDate)}
          </span>
        ) : (
          <span />
        )}
        {task.assigneeId && (
          <span className="rounded-full bg-surface-muted px-1.5 py-0.5">
            {task.assigneeId.slice(0, 6)}
          </span>
        )}
      </div>
    </Link>
  );
}

/* ─── Status Badge ─── */

function StatusBadge({ status }: { status: TaskStatus }) {
  const styles: Record<string, string> = {
    [TaskStatus.TODO]: 'bg-info/10 text-info',
    [TaskStatus.IN_PROGRESS]: 'bg-warning/10 text-warning',
    [TaskStatus.BLOCKED]: 'bg-danger/10 text-danger',
    [TaskStatus.DONE]: 'bg-success/10 text-success',
    [TaskStatus.CANCELLED]: 'bg-foreground-muted/10 text-foreground-muted',
  };
  const labels: Record<string, string> = {
    [TaskStatus.TODO]: 'To Do',
    [TaskStatus.IN_PROGRESS]: 'In Progress',
    [TaskStatus.BLOCKED]: 'Blocked',
    [TaskStatus.DONE]: 'Done',
    [TaskStatus.CANCELLED]: 'Cancelled',
  };
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${styles[status]}`}>
      {labels[status]}
    </span>
  );
}
