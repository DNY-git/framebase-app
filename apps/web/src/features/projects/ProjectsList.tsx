import { useState, useCallback, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import type { ProjectDomain } from '@constructtrack/types';
import { ProjectStatus } from '@constructtrack/types';
import { authFetch } from '../../auth-fetch';
import { ProjectForm } from './ProjectForm';
import { PageLayout } from '../../shared/components/PageLayout';
import { FilterDropdown } from '../../shared/components/FilterDropdown';

/** Organization member directory entry (GET /organizations/directory). */
interface DirectoryEntry {
  id: string;
  name: string;
  email: string;
  role: string;
  avatarUrl: string | null;
  joinedAt: string;
}
import {
  Search,
  Plus,
  ChevronLeft,
  ChevronRight,
  FolderKanban,
  User,
} from '../../shared/components/icons';

const STATUS_STYLES: Record<string, string> = {
  [ProjectStatus.PLANNING]: 'bg-info/10 text-info',
  [ProjectStatus.ACTIVE]: 'bg-success/10 text-success',
  [ProjectStatus.ON_HOLD]: 'bg-warning/10 text-warning',
  [ProjectStatus.COMPLETED]: 'bg-primary/10 text-primary',
  [ProjectStatus.ARCHIVED]: 'bg-foreground-muted/10 text-foreground-muted',
  delayed: 'bg-danger/10 text-danger',
};

// Solid dot colour used as the row indicator next to each project name.
const STATUS_DOT: Record<string, string> = {
  [ProjectStatus.PLANNING]: 'bg-info',
  [ProjectStatus.ACTIVE]: 'bg-success',
  [ProjectStatus.ON_HOLD]: 'bg-warning',
  [ProjectStatus.COMPLETED]: 'bg-primary',
  [ProjectStatus.ARCHIVED]: 'bg-foreground-muted',
  delayed: 'bg-danger',
};

const STATUS_OPTIONS: { value: ProjectStatus | ''; label: string }[] = [
  { value: '', label: 'All projects' },
  { value: ProjectStatus.PLANNING, label: 'Planning' },
  { value: ProjectStatus.ACTIVE, label: 'Active' },
  { value: ProjectStatus.ON_HOLD, label: 'On Hold' },
  { value: ProjectStatus.COMPLETED, label: 'Completed' },
  { value: ProjectStatus.ARCHIVED, label: 'Archived' },
];

function formatDate(d?: Date | string | null): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatBudget(cents?: number): string {
  if (!cents && cents !== 0) return '—';
  if (cents >= 100_000_00) return `${(cents / 100_000_00).toFixed(1)}M`;
  if (cents >= 1_000_00) return `${(cents / 1_000_00).toFixed(1)}M`;
  return `${(cents / 100).toLocaleString()}`;
}

function displayStatus(p: ProjectDomain): string {
  if (p.status === ProjectStatus.ACTIVE && p.endDate && new Date(p.endDate).getTime() < Date.now()) {
    return 'delayed';
  }
  return p.status;
}

function initials(name?: string): string {
  if (!name) return '?';
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

interface ProjectsResponse {
  data: ProjectDomain[];
  meta: { page: number; perPage: number; totalItems: number; totalPages: number };
}

export function ProjectsList() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const [projects, setProjects] = useState<ProjectDomain[]>([]);
  const [directoryMap, setDirectoryMap] = useState<Map<string, DirectoryEntry>>(new Map());
  const [meta, setMeta] = useState({ page: 1, perPage: 12, totalItems: 0, totalPages: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<ProjectDomain[]>([]);
  const [suggestOpen, setSuggestOpen] = useState(false);

  const page = parseInt(searchParams.get('page') ?? '1', 10);
  const search = searchParams.get('search') ?? '';
  const status = searchParams.get('status') ?? '';
  const [searchInput, setSearchInput] = useState(search);
  const showNew = searchParams.get('new') === '1';

  const fetchProjects = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    const params = new URLSearchParams({ page: String(page), perPage: '12' });
    if (search) params.set('search', search);
    if (status) params.set('status', status);

    try {
      const res = await authFetch(`/api/v1/projects?${params}`);
      if (!res.ok) throw new Error('Failed to load projects');
      const body: ProjectsResponse = await res.json();
      const items = body.data ?? [];
      setProjects(items);
      setMeta(body.meta ?? { page: 1, perPage: 12, totalItems: 0, totalPages: 0 });
      return items;
    } catch (err) {
      setError((err as Error).message);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [page, search, status]);

  const loadDirectory = useCallback(async () => {
    try {
      const res = await authFetch('/api/v1/organizations/directory');
      if (!res.ok) return;
      const body = await res.json();
      const items = body.data ?? body;
      if (!Array.isArray(items)) return;
      setDirectoryMap(new Map(items.map((d: DirectoryEntry) => [d.id, d])));
    } catch {
      // Directory is optional (non-manager roles get nothing) — Manager
      // column degrades to a placeholder when unavailable.
      setDirectoryMap(new Map());
    }
  }, []);

  useEffect(() => {
    fetchProjects();
    loadDirectory();
  }, [fetchProjects, loadDirectory]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const next = new URLSearchParams(searchParams);
    if (searchInput) next.set('search', searchInput);
    else next.delete('search');
    next.set('page', '1');
    setSearchParams(next);
  };

  useEffect(() => {
    const t = setTimeout(() => {
      if (searchInput.trim() === search) return;
      const next = new URLSearchParams(searchParams);
      if (searchInput.trim()) next.set('search', searchInput.trim());
      else next.delete('search');
      next.set('page', '1');
      setSearchParams(next);
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  useEffect(() => {
    const q = searchInput.trim();
    if (q.length < 2) {
      setSuggestions([]);
      setSuggestOpen(false);
      return;
    }
    let cancelled = false;
    const t = setTimeout(async () => {
      try {
        const res = await authFetch(`/api/v1/projects?search=${encodeURIComponent(q)}&page=1&perPage=5`);
        if (!res.ok) return;
        const body: ProjectsResponse = await res.json();
        if (!cancelled) {
          setSuggestions(body.data ?? []);
          setSuggestOpen(true);
        }
      } catch {
        if (!cancelled) setSuggestions([]);
      }
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [searchInput]);

  const handleStatusFilter = (value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set('status', value);
    else next.delete('status');
    next.set('page', '1');
    setSearchParams(next);
  };

  const goToPage = (p: number) => {
    const next = new URLSearchParams(searchParams);
    next.set('page', String(p));
    setSearchParams(next);
  };

  const renderToolbar = () => (
    <div className="flex flex-col gap-1">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <form onSubmit={handleSearch} className="flex flex-1 items-center gap-2">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground-muted" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onFocus={() => suggestions.length > 0 && setSuggestOpen(true)}
              onBlur={() => setTimeout(() => setSuggestOpen(false), 150)}
              placeholder="Search projects..."
              className="h-10 w-full rounded-lg border border-border bg-surface pl-9 pr-3 text-sm text-foreground placeholder:text-foreground-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
            {suggestOpen && suggestions.length > 0 && (
              <ul className="absolute left-0 right-0 top-full z-50 mt-1 max-h-72 overflow-y-auto rounded-lg bg-surface py-1 shadow-lg scrollbar-thin">
                {suggestions.map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        navigate(`/projects/${p.id}`);
                      }}
                      className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm transition-colors hover:bg-surface-muted"
                    >
                      <span className="truncate font-medium text-foreground">{p.name}</span>
                      <span className="shrink-0 text-xs text-foreground-muted">{p.code}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </form>
        <FilterDropdown
          value={status}
          onChange={handleStatusFilter}
          placeholder="All projects"
          className="w-full sm:w-44"
          options={STATUS_OPTIONS}
        />
        <button
          onClick={() => {
            const next = new URLSearchParams(searchParams);
            next.set('new', '1');
            setSearchParams(next);
          }}
          className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-action px-4 py-2.5 text-sm font-medium text-action-foreground shadow-sm transition-colors hover:bg-action/90"
        >
          <Plus className="h-4 w-4" /> New project
        </button>
      </div>
    </div>
  );

  return (
    <PageLayout
      title="Projects"
      subtitle="Manage and track all construction projects"
    >
      <div className="space-y-4">
        {renderToolbar()}

        {error && (
          <div className="rounded-lg border border-danger/20 bg-danger/5 p-3 text-sm text-danger">
            {error}
            <button onClick={() => fetchProjects()} className="ml-2 font-medium underline">
              Retry
            </button>
          </div>
        )}

        {isLoading ? (
          <div className="overflow-hidden rounded-xl border border-border bg-surface">
            <div className="h-11 animate-pulse bg-surface-muted" />
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex animate-pulse items-center gap-6 border-t border-border px-4 py-4">
                <div className="h-9 w-9 rounded-lg bg-surface-muted" />
                <div className="h-4 w-40 rounded bg-surface-muted" />
                <div className="h-4 w-24 rounded bg-surface-muted" />
                <div className="h-4 w-20 rounded bg-surface-muted" />
                <div className="h-4 w-16 rounded bg-surface-muted" />
                <div className="h-4 w-24 rounded bg-surface-muted" />
                <div className="h-4 w-24 rounded bg-surface-muted" />
                <div className="h-4 w-24 rounded bg-surface-muted" />
              </div>
            ))}
          </div>
        ) : projects.length === 0 ? (
          <div className="rounded-xl border border-border bg-surface p-12 text-center">
            <FolderKanban className="mx-auto mb-3 h-12 w-12 text-foreground-muted/30" />
            <p className="text-sm font-medium text-foreground">No projects found</p>
            <p className="mt-1 text-xs text-foreground-muted">
              {search || status ? 'Try adjusting your filters' : 'Create your first project to get started'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border bg-surface">
            <table className="w-full table-fixed text-sm">
              <colgroup>
                <col className="w-[26%]" />
                <col className="w-[12%]" />
                <col className="w-[18%]" />
                <col className="w-[12%]" />
                <col className="w-[12%]" />
                <col className="w-[10%]" />
                <col className="w-[10%]" />
              </colgroup>
              <thead>
                <tr className="border-b border-border bg-surface-muted/60 text-left">
                  <th className="px-4 py-3 pl-[38px] text-xs font-semibold uppercase tracking-wide text-foreground-muted">
                    Projects
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-foreground-muted">
                    Location
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-foreground-muted">
                    Manager
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-foreground-muted">
                    Status
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-foreground-muted">
                    Budget
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-foreground-muted">
                    Start date
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-foreground-muted">
                    End date
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {projects.map((project) => {
                  const statusValue = displayStatus(project);
                  const managerEntry = project.managerId
                    ? directoryMap.get(project.managerId) ?? null
                    : null;

                  return (
                    <tr
                      key={project.id}
                      onClick={() => navigate(`/projects/${project.id}`)}
                      className="group cursor-pointer transition-colors hover:bg-surface-muted/50"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <span
                            className={`h-2.5 w-2.5 shrink-0 rounded-full ${
                              STATUS_DOT[statusValue] ?? 'bg-foreground-muted'
                            }`}
                            aria-hidden
                          />
                          <div className="min-w-0">
                            <Link
                              to={`/projects/${project.id}`}
                              onClick={(e) => e.stopPropagation()}
                              className="block truncate font-medium text-foreground transition-colors group-hover:text-primary"
                            >
                              {project.name}
                            </Link>
                            <span className="block truncate text-xs font-mono text-foreground-muted">{project.code}</span>
                          </div>
                        </div>
                      </td>
                      <td className="truncate px-4 py-3 text-foreground-muted">{project.location ?? '—'}</td>
                      <td className="px-4 py-3">
                        {managerEntry ? (
                          <div className="flex items-center gap-2">
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/10 text-xs font-semibold text-primary">
                              {managerEntry.avatarUrl ? (
                                <img
                                  src={`/api/v1/auth/${managerEntry.id}/avatar?v=${encodeURIComponent(managerEntry.avatarUrl)}`}
                                  alt=""
                                  className="h-full w-full rounded-full object-cover"
                                />
                              ) : (
                                initials(managerEntry.name)
                              )}
                            </span>
                            <span className="truncate text-foreground">{managerEntry.name}</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-dashed border-border bg-surface-muted text-foreground-muted">
                              <User className="h-4 w-4" />
                            </span>
                            <span className="text-foreground-muted">Unassigned</span>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium capitalize ${
                            STATUS_STYLES[statusValue] ?? 'bg-foreground-muted text-white'
                          }`}
                        >
                          {statusValue.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-foreground money">{formatBudget(project.budgetCents)}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-foreground-muted">{formatDate(project.startDate)}</td>
                       <td className="px-4 py-3 whitespace-nowrap text-foreground-muted">{formatDate(project.endDate)}</td>
                     </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {meta.totalPages > 1 && (
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={() => goToPage(page - 1)}
              disabled={page <= 1}
              aria-label="Previous page"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-foreground-muted transition-colors hover:bg-surface-muted disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-sm text-foreground-muted">
              Page {page} of {meta.totalPages}
            </span>
            <button
              onClick={() => goToPage(page + 1)}
              disabled={page >= meta.totalPages}
              aria-label="Next page"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-foreground-muted transition-colors hover:bg-surface-muted disabled:opacity-40"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}

        {showNew && (
          <ProjectForm
            onClose={() => {
              const next = new URLSearchParams(searchParams);
              next.delete('new');
              setSearchParams(next);
            }}
            onSaved={() => {
              const next = new URLSearchParams(searchParams);
              next.delete('new');
              setSearchParams(next);
              fetchProjects();
            }}
          />
        )}
      </div>
    </PageLayout>
  );
}
