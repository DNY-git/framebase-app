import { useState, useEffect } from 'react';
import type { ProjectDomain } from '@constructtrack/types';
import { ProjectStatus } from '@constructtrack/types';
import { authFetch } from '../../auth-fetch';
import { FilterDropdown } from '../../shared/components/FilterDropdown';
import { X, Loader2 } from '../../shared/components/icons';

interface ProjectFormProps {
  project?: ProjectDomain | null;
  onClose: () => void;
  onSaved: () => void;
}

const STATUS_OPTIONS: { value: ProjectStatus; label: string }[] = [
  { value: ProjectStatus.PLANNING, label: 'Planning' },
  { value: ProjectStatus.ACTIVE, label: 'Active' },
  { value: ProjectStatus.ON_HOLD, label: 'On Hold' },
  { value: ProjectStatus.COMPLETED, label: 'Completed' },
];

export function ProjectForm({ project, onClose, onSaved }: ProjectFormProps) {
  const isEdit = !!project;

  const [code, setCode] = useState(project?.code ?? '');
  const [name, setName] = useState(project?.name ?? '');
  const [description, setDescription] = useState(project?.description ?? '');
  const [status, setStatus] = useState<ProjectStatus>(project?.status ?? ProjectStatus.PLANNING);
  const [phase, setPhase] = useState(project?.phase ?? '');
  const [startDate, setStartDate] = useState(project?.startDate ? String(project.startDate).slice(0, 10) : '');
  const [endDate, setEndDate] = useState(project?.endDate ? String(project.endDate).slice(0, 10) : '');
  const [budgetCents, setBudgetCents] = useState(project?.budgetCents != null ? String(project.budgetCents) : '');
  const [location, setLocation] = useState(project?.location ?? '');

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

    const payload: Record<string, unknown> = {
      name,
      description: description || undefined,
      phase: phase || undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      budgetCents: budgetCents ? parseInt(budgetCents, 10) : undefined,
      location: location || undefined,
    };

    if (!isEdit) {
      payload.code = code;
    } else {
      payload.status = status;
    }

    try {
      const url = isEdit ? `/api/v1/projects/${project!.id}` : '/api/v1/projects';
      const method = isEdit ? 'PATCH' : 'POST';
      const res = await authFetch(url, {
        method,
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.message ?? `Failed to ${isEdit ? 'update' : 'create'} project`);
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
            {isEdit ? 'Edit Project' : 'New Project'}
          </h2>
          <button onClick={onClose} className="rounded-lg p-1 text-foreground-muted hover:bg-surface-muted hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
          {error && (
            <div className="rounded-lg border border-danger/20 bg-danger/5 p-3 text-sm text-danger">{error}</div>
          )}

          {!isEdit && (
            <div>
              <label htmlFor="p-code" className="mb-1.5 block text-sm font-medium text-foreground">Code *</label>
              <input
                id="p-code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                required
                maxLength={20}
                pattern="^[A-Za-z0-9-]+$"
                className="h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm text-foreground placeholder:text-foreground-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="e.g. RIV-01"
              />
            </div>
          )}

          <div>
            <label htmlFor="p-name" className="mb-1.5 block text-sm font-medium text-foreground">Name *</label>
            <input
              id="p-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={200}
              className="h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm text-foreground placeholder:text-foreground-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="Project name"
            />
          </div>

          <div>
            <label htmlFor="p-desc" className="mb-1.5 block text-sm font-medium text-foreground">Description</label>
            <textarea
              id="p-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={2000}
              rows={3}
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-foreground-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary resize-none"
              placeholder="Brief description of the project"
            />
          </div>

          {isEdit && (
            <div>
              <label htmlFor="p-status" className="mb-1.5 block text-sm font-medium text-foreground">Status</label>
              <FilterDropdown
                value={status}
                onChange={(v) => setStatus(v as ProjectStatus)}
                className="w-full"
                options={STATUS_OPTIONS}
              />
            </div>
          )}

          <div>
            <label htmlFor="p-phase" className="mb-1.5 block text-sm font-medium text-foreground">Phase</label>
            <input
              id="p-phase"
              value={phase}
              onChange={(e) => setPhase(e.target.value)}
              maxLength={100}
              className="h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm text-foreground placeholder:text-foreground-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="e.g. Design, Construction"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="p-start" className="mb-1.5 block text-sm font-medium text-foreground">Start Date</label>
              <input
                id="p-start"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label htmlFor="p-end" className="mb-1.5 block text-sm font-medium text-foreground">End Date</label>
              <input
                id="p-end"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="p-budget" className="mb-1.5 block text-sm font-medium text-foreground">Budget (cents)</label>
              <input
                id="p-budget"
                type="number"
                value={budgetCents}
                onChange={(e) => setBudgetCents(e.target.value)}
                min={0}
                className="h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm text-foreground placeholder:text-foreground-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="e.g. 12500000"
              />
            </div>
            <div>
              <label htmlFor="p-location" className="mb-1.5 block text-sm font-medium text-foreground">Location</label>
              <input
                id="p-location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                maxLength={300}
                className="h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm text-foreground placeholder:text-foreground-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="City, State"
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
              {isEdit ? 'Save Changes' : 'Create Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
