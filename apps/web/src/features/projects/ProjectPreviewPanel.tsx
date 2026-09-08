import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { ProjectDomain } from '@constructtrack/types';
import GradualBlur from '../../components/GradualBlur';
import { authFetch } from '../../auth-fetch';
import { formatCompactCurrency } from '../../utils';
import { X, MapPin, Calendar, Building, FolderKanban, ExternalLink } from '../../shared/components/icons';

interface TaskCountResponse {
  meta?: { totalItems?: number };
  data?: unknown[];
}

function formatDate(d?: Date | string | null): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function progressPercent(p: ProjectDomain): number {
  if (!p.startDate || !p.endDate) return 0;
  const start = new Date(p.startDate).getTime();
  const end = new Date(p.endDate).getTime();
  if (end <= start) return 0;
  const now = Date.now();
  if (now <= start) return 0;
  if (now >= end) return 100;
  return Math.round(((now - start) / (end - start)) * 100);
}

export function ProjectPreviewPanel({
  project,
  onClose,
}: {
  project: ProjectDomain | null;
  onClose: () => void;
}): React.JSX.Element | null {
  const navigate = useNavigate();
  const [taskCount, setTaskCount] = useState<number | null>(null);

  useEffect(() => {
    if (!project) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [project, onClose]);

  useEffect(() => {
    if (!project) {
      setTaskCount(null);
      return;
    }
    // Fetch task count for preview (best-effort)
    authFetch(`/api/v1/tasks?projectId=${project.id}&perPage=1`)
      .then((r) => (r.ok ? r.json() : null))
      .then((j: TaskCountResponse | null) => {
        if (j?.meta?.totalItems != null) setTaskCount(j.meta.totalItems);
        else if (Array.isArray(j?.data)) setTaskCount(j.data.length);
        else setTaskCount(null);
      })
      .catch(() => setTaskCount(null));
  }, [project]);

  if (!project) return null;

  const pct = progressPercent(project);

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px]" onClick={onClose} aria-hidden="true" />
      <div className="relative flex h-dvh w-[420px] max-w-[92vw] flex-col border-l border-border bg-surface shadow-2xl">
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-border px-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-foreground-muted">Project</p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate(`/projects/${project.id}`)}
              className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
            >
              <ExternalLink className="h-3 w-3" /> Expand
            </button>
            <button
              onClick={onClose}
              aria-label="Close preview"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-foreground-muted hover:bg-surface-muted hover:text-foreground"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="relative min-h-0 flex-1">
          <div className="h-full overflow-y-auto p-5 pb-24">
          <h2 className="text-lg font-bold text-foreground">{project.name}</h2>
          <p className="mt-1 font-mono text-xs text-foreground-muted">{project.code}</p>

          <div className="mt-3">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium capitalize text-primary">
              <span className="h-2 w-2 rounded-full bg-primary" /> {project.status.replace(/_/g, ' ')}
            </span>
          </div>

          <div className="mt-6 space-y-5">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-foreground-muted">Progress</p>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface-muted">
                <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
              </div>
              <p className="mt-1 text-xs text-foreground-muted">{pct}%</p>
            </div>

            <div>
              <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-foreground-muted"><Building className="h-3 w-3" /> Budget</p>
              <p className="money mt-1 text-sm font-semibold text-foreground">{formatCompactCurrency(project.budgetCents)}</p>
            </div>

            {taskCount != null && (
              <div>
                <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-foreground-muted"><FolderKanban className="h-3 w-3" /> Tasks</p>
                <p className="mt-1 text-sm font-semibold text-foreground">{taskCount}</p>
              </div>
            )}

            <div>
              <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-foreground-muted"><MapPin className="h-3 w-3" /> Location</p>
              <p className="mt-1 text-sm text-foreground">{project.location ?? '—'}</p>
            </div>

            <div>
              <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-foreground-muted"><Calendar className="h-3 w-3" /> Timeline</p>
              <p className="mt-1 text-sm text-foreground">{formatDate(project.startDate)} — {formatDate(project.endDate)}</p>
            </div>

            {project.phase && (
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-foreground-muted">Phase</p>
                <p className="mt-1 text-sm text-foreground">{project.phase}</p>
              </div>
            )}

            {project.description && (
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-foreground-muted">Description</p>
                <p className="mt-1 text-sm leading-5 text-foreground-muted">{project.description}</p>
              </div>
            )}
          </div>


          </div>
          <GradualBlur
            target="parent"
            position="bottom"
            height="6rem"
            strength={2}
            divCount={5}
            curve="bezier"
            exponential={true}
            opacity={1}
          />
        </div>
      </div>
    </div>
  );
}
