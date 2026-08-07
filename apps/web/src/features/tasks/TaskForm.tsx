import { useState, useEffect } from 'react';
import type { TaskDomain } from '@constructtrack/types';
import { TaskStatus, TaskPriority } from '@constructtrack/types';
import { authFetch } from '../../auth-fetch';
import { FilterDropdown } from '../../shared/components/FilterDropdown';
import { X, Loader2 } from '../../shared/components/icons';

interface TaskFormProps {
  projectId: string;
  task?: TaskDomain | null;
  onClose: () => void;
  onSaved: () => void;
}

const STATUS_OPTIONS: { value: TaskStatus; label: string }[] = [
  { value: TaskStatus.TODO, label: 'To Do' },
  { value: TaskStatus.IN_PROGRESS, label: 'In Progress' },
  { value: TaskStatus.BLOCKED, label: 'Blocked' },
  { value: TaskStatus.DONE, label: 'Done' },
  { value: TaskStatus.CANCELLED, label: 'Cancelled' },
];

const PRIORITY_OPTIONS: { value: TaskPriority; label: string }[] = [
  { value: TaskPriority.LOW, label: 'Low' },
  { value: TaskPriority.MEDIUM, label: 'Medium' },
  { value: TaskPriority.HIGH, label: 'High' },
  { value: TaskPriority.CRITICAL, label: 'Critical' },
];

export function TaskForm({ projectId, task, onClose, onSaved }: TaskFormProps) {
  const isEdit = !!task;

  const [title, setTitle] = useState(task?.title ?? '');
  const [description, setDescription] = useState(task?.description ?? '');
  const [status, setStatus] = useState<TaskStatus>(task?.status ?? TaskStatus.TODO);
  const [priority, setPriority] = useState<TaskPriority>(task?.priority ?? TaskPriority.MEDIUM);
  const [dueDate, setDueDate] = useState(task?.dueDate ? String(task.dueDate).slice(0, 10) : '');
  const [assigneeId, setAssigneeId] = useState(task?.assigneeId ?? '');

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    function handleEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const isMongoId = /^[0-9a-fA-F]{24}$/.test(assigneeId);
    const payload: Record<string, unknown> = {
      title,
      description: description || undefined,
      priority,
      dueDate: dueDate || undefined,
      assigneeId: isMongoId ? assigneeId : undefined,
    };

    if (!isEdit) {
      payload.status = status;
    } else {
      payload.status = status;
    }

    try {
      const url = isEdit
        ? `/api/v1/projects/${projectId}/tasks/${task!.id}`
        : `/api/v1/projects/${projectId}/tasks`;
      const method = isEdit ? 'PATCH' : 'POST';
      const res = await authFetch(url, {
        method,
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        const details = body?.errors?.map((e: { message: string }) => e.message).join('. ');
        throw new Error(details || body?.message || `Failed to ${isEdit ? 'update' : 'create'} task`);
      }
      onSaved();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div
        className="w-full max-w-lg rounded-xl border border-border bg-surface shadow-xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="text-lg font-semibold text-foreground">
            {isEdit ? 'Edit Task' : 'New Task'}
          </h2>
          <button onClick={onClose} className="rounded-lg p-1 text-foreground-muted hover:bg-surface-muted hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
          {error && (
            <div className="rounded-lg border border-danger/20 bg-danger/5 p-3 text-sm text-danger">{error}</div>
          )}

          <div>
            <label htmlFor="t-title" className="mb-1.5 block text-sm font-medium text-foreground">Title *</label>
            <input
              id="t-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              maxLength={200}
              className="h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm text-foreground placeholder:text-foreground-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="Task title"
            />
          </div>

          <div>
            <label htmlFor="t-desc" className="mb-1.5 block text-sm font-medium text-foreground">Description</label>
            <textarea
              id="t-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={2000}
              rows={3}
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-foreground-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary resize-none"
              placeholder="Describe the task..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="t-status" className="mb-1.5 block text-sm font-medium text-foreground">Status</label>
              <FilterDropdown
                value={status}
                onChange={(v) => setStatus(v as TaskStatus)}
                className="w-full"
                options={STATUS_OPTIONS}
              />
            </div>
            <div>
              <label htmlFor="t-priority" className="mb-1.5 block text-sm font-medium text-foreground">Priority</label>
              <FilterDropdown
                value={priority}
                onChange={(v) => setPriority(v as TaskPriority)}
                className="w-full"
                options={PRIORITY_OPTIONS}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="t-due" className="mb-1.5 block text-sm font-medium text-foreground">Due Date</label>
              <input
                id="t-due"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label htmlFor="t-assignee" className="mb-1.5 block text-sm font-medium text-foreground">Assignee ID</label>
              <input
                id="t-assignee"
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value)}
                pattern="[0-9a-fA-F]{24}"
                title="Must be a valid 24-character hex ID (e.g. 507f1f77bcf86cd799439011)"
                className="h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm text-foreground placeholder:text-foreground-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="24-char hex ID (optional)"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-surface-muted"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              {isEdit ? 'Save Changes' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
