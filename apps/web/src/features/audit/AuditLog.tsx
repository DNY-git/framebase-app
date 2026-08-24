import { useState, useCallback, useEffect } from 'react';
import type { AuditLogDomain } from '@constructtrack/types';
import { authFetch } from '../../auth-fetch';
import { FilterDropdown } from '../../shared/components/FilterDropdown';
import { Skeleton } from '../../shared/components/Skeleton';
import {
  ClipboardList,
  ChevronLeft,
  ChevronRight,
} from '../../shared/components/icons';

interface PaginatedResponse<T> {
  data: T[];
  meta: { page: number; perPage: number; totalItems: number; totalPages: number };
}

function formatDate(d?: Date | string | null): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
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

const ACTION_STYLES: Record<string, string> = {
  project_created: 'bg-success/10 text-success',
  project_updated: 'bg-info/10 text-info',
  project_deleted: 'bg-danger/10 text-danger',
  project_archived: 'bg-foreground-muted/10 text-foreground-muted',
  project_member_added: 'bg-success/10 text-success',
  project_member_removed: 'bg-danger/10 text-danger',
  task_created: 'bg-success/10 text-success',
  task_updated: 'bg-info/10 text-info',
  task_deleted: 'bg-danger/10 text-danger',
  register: 'bg-success/10 text-success',
  login: 'bg-info/10 text-info',
  logout: 'bg-foreground-muted/10 text-foreground-muted',
};

const ENTITY_TYPES = ['', 'project', 'task', 'project_member', 'task_dependency', 'user'];

export function AuditLog() {
  const [logs, setLogs] = useState<AuditLogDomain[]>([]);
  const [meta, setMeta] = useState({ page: 1, perPage: 20, totalItems: 0, totalPages: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterEntity, setFilterEntity] = useState('');
  const [filterAction, setFilterAction] = useState('');
  const [page, setPage] = useState(1);

  const fetchLogs = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    const params = new URLSearchParams({ page: String(page), perPage: '20' });
    if (filterEntity) params.set('entityType', filterEntity);
    if (filterAction) params.set('action', filterAction);

    try {
      const res = await authFetch(`/api/v1/audit?${params}`);
      if (!res.ok) throw new Error('Failed to load audit logs');
      const body: PaginatedResponse<AuditLogDomain> = await res.json();
      setLogs(body.data ?? []);
      setMeta(body.meta ?? { page: 1, perPage: 20, totalItems: 0, totalPages: 0 });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  }, [page, filterEntity, filterAction]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Audit Log</h1>
        <p className="mt-1 text-sm text-foreground-muted">Track all system activity and mutations</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <FilterDropdown
          value={filterEntity}
          onChange={(v) => { setFilterEntity(v); setPage(1); }}
          placeholder="All entities"
          className="w-full sm:w-48"
          options={[
            { value: '', label: 'All entities' },
            ...ENTITY_TYPES.filter(Boolean).map((t) => ({ value: t, label: t })),
          ]}
        />
        <input
          type="text"
          value={filterAction}
          onChange={(e) => setFilterAction(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { setPage(1); fetchLogs(); } }}
          placeholder="Filter by action..."
          className="h-10 w-full max-w-xs rounded-lg border border-border bg-surface px-3 text-sm text-foreground placeholder:text-foreground-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>

      {error && (
        <div className="rounded-lg border border-danger/20 bg-danger/5 p-3 text-sm text-danger">
          {error}
          <button onClick={fetchLogs} className="ml-2 font-medium underline">Retry</button>
        </div>
      )}

      {/* Log Table */}
      <div className="rounded-xl border border-border bg-surface shadow-sm overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-muted">
              <th className="px-4 py-3 font-medium text-foreground-muted">Action</th>
              <th className="px-4 py-3 font-medium text-foreground-muted">Entity</th>
              <th className="px-4 py-3 font-medium text-foreground-muted">Entity ID</th>
              <th className="px-4 py-3 font-medium text-foreground-muted">Actor</th>
              <th className="px-4 py-3 font-medium text-foreground-muted">Time</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              <>
                {Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td className="px-4 py-3"><Skeleton className="h-5 w-20 rounded-full" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-4 w-16" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-4 w-24 font-mono" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-4 w-24" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-4 w-16" /></td>
                  </tr>
                ))}
              </>
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center">
                  <ClipboardList className="mx-auto mb-2 h-8 w-8 text-foreground-muted/30" />
                  <p className="text-sm text-foreground-muted">No audit logs found</p>
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id} className="hover:bg-surface-muted/50 transition-colors">
                  <td className="px-4 py-3">
                    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${ACTION_STYLES[log.action] ?? 'bg-foreground-muted/10 text-foreground-muted'}`}>
                      {log.action}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-foreground-muted">{log.entityType}</td>
                  <td className="px-4 py-3 font-mono text-xs text-foreground-muted">{log.entityId.slice(0, 8)}...</td>
                  <td className="px-4 py-3 font-mono text-xs text-foreground-muted">{log.actorId.slice(0, 8)}...</td>
                  <td className="px-4 py-3">
                    <span title={formatDate(log.createdAt)} className="text-foreground-muted">{timeAgo(log.createdAt)}</span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {meta.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-foreground-muted transition-colors hover:bg-surface-muted disabled:opacity-40"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-sm text-foreground-muted">
            Page {page} of {meta.totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
            disabled={page >= meta.totalPages}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-foreground-muted transition-colors hover:bg-surface-muted disabled:opacity-40"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
