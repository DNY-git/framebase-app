import { useState, useRef, useCallback, useEffect } from 'react';
import type { FeatureCollection, Geometry } from 'geojson';
import type { ReportTemplateDomain, ReportRunDomain } from '@constructtrack/types';
import { authFetch } from '../../auth-fetch';
import { useAuthStore } from '../../stores/auth-store';
import { FilterDropdown } from '@/shared/components/FilterDropdown';
import { Skeleton } from '@/shared/components/Skeleton';
import { ConfirmDialog } from '@/shared/components/ConfirmDialog';
import { StatusStatRow } from '@/components/ui/status-stat-row';
import nigeriaGeoJson from '@/assets/nigeria-states.json';
import { SimpleNigeriaMap } from './SimpleNigeriaMap';
import type { ChoroplethFeatureProperties } from '@bklitui/ui/charts';
import {
  FileText,
  Plus,
  Loader2,
  CheckCircle,
  Clock,
  AlertTriangle,
  MapPin,
  Download,
  Trash,
  X,
  Filter,
} from '../../shared/components/icons';

type RegionFeatureCollection = FeatureCollection<
  Geometry,
  ChoroplethFeatureProperties & { value?: number }
>;

/**
 * Regional spend choropleth — real D3.js + React map of Nigeria states.
 * Source: `so-dipe/GeoJSON` Nigeria states GeoJSON (MIT, 37 states incl. FCT) — `Nigeria and its States.geojson` with `properties.state` in caps (e.g. LAGOS, FCT, AKWA-IBOM).
 * Shades by project count per state (more projects → darker), using d3.scaleSequential + interpolateBlues. States with no projects use neutral surface-muted.
 */
function RegionalSpendMap() {
  const [features, setFeatures] = useState<RegionFeatureCollection | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        // Aggregate project counts per region
        const res = await authFetch('/api/v1/projects?perPage=100');
        const body = await res.json().catch(() => null);
        const projects: Array<{ region?: string }> = body?.data ?? body?.items ?? [];
        const countByState = new Map<string, number>();
        for (const p of projects) {
          if (!p.region) continue;
          const key = String(p.region).toUpperCase().trim();
          countByState.set(key, (countByState.get(key) ?? 0) + 1);
        }

        // Load GeoJSON and inject counts
        const geo = (nigeriaGeoJson as unknown as { features: Array<{ properties: Record<string, unknown>; geometry: Geometry }> });
        const enriched: RegionFeatureCollection = {
          type: 'FeatureCollection',
          features: geo.features.map((f) => {
            const state = String((f.properties as Record<string, unknown>).state ?? '').toUpperCase();
            const count = countByState.get(state) ?? 0;
            return {
              ...f,
              properties: { ...(f.properties as Record<string, unknown>), value: count, state },
            } as unknown as FeatureCollection<Geometry, ChoroplethFeatureProperties & { value?: number }>['features'][number];
          }),
        } as RegionFeatureCollection;

        if (!cancelled) {
          // If no project has region, still render map with neutral colors (not empty)
          setFeatures(enriched);
        }
      } catch {
        if (!cancelled) setFeatures(null);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, []);

  if (isLoading) {
    return (
      <div className="flex h-72 items-center justify-center rounded-lg border border-border bg-surface-muted/30">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-border border-t-primary" />
      </div>
    );
  }

  if (!features || features.features.length === 0) {
    return (
      <div className="flex h-72 flex-col items-center justify-center rounded-lg border border-border bg-surface-muted/30 px-6 text-center">
        <MapPin className="mb-2 h-8 w-8 text-foreground-muted/30" />
        <p className="text-sm font-medium text-foreground">No regional data available yet</p>
        <p className="mt-1 max-w-md text-xs text-foreground-muted">
          Projects have no region set yet. Add a region (state) to a project via the project form to see it on the map.
        </p>
      </div>
    );
  }

  const counts = features.features.map((f) => Number(f.properties?.value ?? 0));
  const hasAnyData = counts.some((c) => c > 0);

  return (
    <div className="space-y-3">
      <SimpleNigeriaMap data={features} />
      <div className="flex items-center justify-between gap-3">
        <span className={`text-xs ${hasAnyData ? 'text-foreground-muted' : 'text-warning'}`}>
          {hasAnyData ? 'Shaded by project count per state' : 'No projects with region yet'}
        </span>
        <span className="text-xs text-foreground-muted">Hover for counts</span>
      </div>
    </div>
  );
}

interface PaginatedResponse<T> {
  data: T[];
  meta: { page: number; perPage: number; totalItems: number; totalPages: number };
}

function formatDate(d?: Date | string | null): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

/**
 * Opens a self-contained print-friendly document (browser "Save as PDF"
 * works from the print dialog — no extra PDF dependency needed).
 */
function printRun(run: ReportRunDomain, templateName: string): void {
  const sections = run.resultData?.sections ?? [];
  const win = window.open('', '_blank', 'width=800,height=900');
  if (!win) return;
  const esc = (s: unknown): string =>
    String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  win.document.write(`<!doctype html>
<html><head><meta charset="utf-8" /><title>${esc(templateName)} — ${esc(formatDate(run.createdAt))}</title>
<style>
  body { font-family: ui-sans-serif, system-ui, sans-serif; margin: 48px; color: #18181b; }
  h1 { font-size: 20px; margin: 0; }
  .meta { color: #71717a; font-size: 12px; margin-top: 4px; }
  section { margin-top: 24px; }
  h2 { font-size: 14px; margin: 0 0 6px; text-transform: uppercase; letter-spacing: .05em; color: #52525b; }
  p { font-size: 13px; line-height: 1.6; white-space: pre-wrap; margin: 0; }
  hr { border: 0; border-top: 1px solid #e4e4e7; margin: 24px 0; }
</style></head>
<body>
<h1>${esc(templateName)}</h1>
<div class="meta">Generated ${esc(formatDate(run.createdAt))}${run.completedAt ? ` &middot; Completed ${esc(formatDate(run.completedAt))}` : ''} &middot; Status: ${esc(run.status)}</div>
<hr />
${sections.length === 0
    ? `<section><p>No stored output content is available for this report run (generated before content persistence was added).</p></section>`
    : sections.map((s) => `<section><h2>${esc(s.title)}</h2><p>${esc(s.content)}</p></section>`).join('\n')}
</body></html>`);
  win.document.close();
  win.focus();
  win.print();
}

async function deleteTemplate(id: string, onError: (message: string) => void, onDeleted: () => void): Promise<void> {
  try {
    const res = await authFetch(`/api/v1/reports/templates/${id}`, { method: 'DELETE' });
    if (!res.ok && res.status !== 204) {
      const body = await res.json().catch(() => null);
      throw new Error(body?.message ?? 'Failed to delete template');
    }
    onDeleted();
  } catch (err) {
    onError((err as Error).message);
  }
}

const RUN_STATUS_STYLES: Record<string, string> = {
  pending: 'bg-foreground-muted/10 text-foreground-muted',
  generating: 'bg-info/10 text-info',
  succeeded: 'bg-success/10 text-success',
  failed: 'bg-danger/10 text-danger',
};

const RUN_STATUS_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  pending: Clock,
  generating: Loader2,
  succeeded: CheckCircle,
  failed: AlertTriangle,
};

export function Reports() {
  const { user } = useAuthStore();
  const canCreate =
    user?.role === 'owner' || user?.role === 'admin' || user?.role === 'project_manager';

  const [templates, setTemplates] = useState<ReportTemplateDomain[]>([]);
  const [runs, setRuns] = useState<ReportRunDomain[]>([]);
  const [pendingDelete, setPendingDelete] = useState<{ id: string; name: string } | null>(null);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(true);
  const [isLoadingRuns, setIsLoadingRuns] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateTemplate, setShowCreateTemplate] = useState(false);
  const [showGenerateReport, setShowGenerateReport] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [showTemplateFilter, setShowTemplateFilter] = useState(false);
  const templateFilterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showTemplateFilter) return;
    function onClick(e: MouseEvent) {
      if (templateFilterRef.current && !templateFilterRef.current.contains(e.target as Node)) {
        setShowTemplateFilter(false);
      }
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [showTemplateFilter]);

  const fetchTemplates = useCallback(async () => {
    setIsLoadingTemplates(true);
    try {
      const res = await authFetch('/api/v1/reports/templates?perPage=100');
      if (!res.ok) throw new Error('Failed to load templates');
      const body: PaginatedResponse<ReportTemplateDomain> = await res.json();
      setTemplates(body.data ?? []);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoadingTemplates(false);
    }
  }, []);

  const fetchRuns = useCallback(async () => {
    setIsLoadingRuns(true);
    try {
      const params = new URLSearchParams({ perPage: '50' });
      if (selectedTemplateId) params.set('templateId', selectedTemplateId);
      const res = await authFetch(`/api/v1/reports?${params}`);
      if (!res.ok) throw new Error('Failed to load report runs');
      const body: PaginatedResponse<ReportRunDomain> = await res.json();
      setRuns(body.data ?? []);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoadingRuns(false);
    }
  }, [selectedTemplateId]);

  useEffect(() => { fetchTemplates(); fetchRuns(); }, [fetchTemplates, fetchRuns]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Reports</h1>
          <p className="mt-1 text-sm text-foreground-muted">Generate and manage construction reports</p>
        </div>
        {canCreate && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowCreateTemplate(true)}
              className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-surface-muted"
            >
              <Plus className="h-4 w-4" /> New Template
            </button>
            <button
              onClick={() => setShowGenerateReport(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-action px-4 py-2.5 text-sm font-medium text-action-foreground transition-colors hover:bg-action/90"
            >
              <FileText className="h-4 w-4" /> Generate Report
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="rounded-lg border border-danger/20 bg-danger/5 p-3 text-sm text-danger">
          {error}
          <button onClick={() => { setError(null); fetchTemplates(); fetchRuns(); }} className="ml-2 font-medium underline">Retry</button>
        </div>
      )}

      {/* Summary stats — compact inline status-count row */}
      <StatusStatRow
        items={[
          { label: 'Report templates', count: templates.length },
          { label: 'Report runs', count: runs.length, tone: 'info' },
          {
            label: 'Succeeded',
            count: runs.filter((r) => r.status === 'succeeded').length,
            tone: 'success',
          },
          {
            label: 'Failed',
            count: runs.filter((r) => r.status === 'failed').length,
            tone: 'danger',
          },
        ]}
      />

      {/* Templates */}
      <section className="rounded-xl border border-border bg-surface p-5 shadow-sm">
        <h3 className="mb-4 text-sm font-semibold text-foreground">Report Templates</h3>
        {isLoadingTemplates ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-border bg-surface-muted/40 p-4">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="mt-2 h-3 w-24" />
                <Skeleton className="mt-4 h-8 w-full" />
              </div>
            ))}
          </div>
        ) : templates.length === 0 ? (
          <div className="rounded-lg border border-border p-8 text-center">
            <FileText className="mx-auto mb-2 h-8 w-8 text-foreground-muted/30" />
            <p className="text-sm text-foreground-muted">No templates yet. Create one to get started.</p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {templates.map((t) => (
              <div
                key={t.id}
                className="rounded-lg border border-border p-4 transition-colors hover:bg-surface-muted/50"
              >
                <div className="mb-2 flex items-start justify-between">
                  <h4 className="text-sm font-medium text-foreground">{t.name}</h4>
                  {t.type && (
                    <span className="rounded-full bg-surface-muted px-2 py-0.5 text-xs font-medium text-foreground-muted">
                      {t.type}
                    </span>
                  )}
                </div>
                {t.description && (
                  <p className="text-xs text-foreground-muted line-clamp-2">{t.description}</p>
                )}
                <div className="mt-3 flex items-center justify-between">
                  <div className="text-xs text-foreground-muted">
                    Created {formatDate(t.createdAt)}
                  </div>
                  {canCreate && (
                    <button
                      type="button"
                      onClick={() => setPendingDelete({ id: t.id, name: t.name })}
                      title="Delete template"
                      className="rounded-lg border border-danger/20 p-1.5 text-danger transition-colors hover:bg-danger/5"
                    >
                      <Trash className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Report Runs */}
      <section className="rounded-xl border border-border bg-surface p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">Report History</h3>
          <div className="relative" ref={templateFilterRef}>
            <button
              type="button"
              onClick={() => setShowTemplateFilter((s) => !s)}
              aria-label="Filter by template"
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-surface text-foreground-muted transition-colors hover:bg-surface-muted hover:text-foreground"
            >
              <Filter className="h-4 w-4" />
            </button>
            {showTemplateFilter && (
              <div className="absolute right-0 z-20 mt-1 w-56 rounded-lg border border-border bg-popover p-2 shadow-lg">
                <FilterDropdown
                  value={selectedTemplateId ?? ''}
                  onChange={(v) => { setSelectedTemplateId(v || null); setShowTemplateFilter(false); }}
                  placeholder="All templates"
                  className="w-full"
                  options={[
                    { value: '', label: 'All templates' },
                    ...templates.map((t) => ({ value: t.id, label: t.name })),
                  ]}
                />
              </div>
            )}
          </div>
        </div>

        {isLoadingRuns ? (
          <div className="divide-y divide-border rounded-lg border border-border">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between gap-3 p-3">
                <div className="min-w-0 flex-1 space-y-2">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="h-5 w-16 rounded-full" />
                <Skeleton className="h-4 w-20" />
              </div>
            ))}
          </div>
        ) : runs.length === 0 ? (
          <div className="rounded-lg border border-border p-8 text-center">
            <FileText className="mx-auto mb-2 h-8 w-8 text-foreground-muted/30" />
            <p className="text-sm text-foreground-muted">No reports generated yet</p>
          </div>
        ) : (
          <div className="divide-y divide-border rounded-lg border border-border">
            {runs.map((run) => {
              const StatusIcon = RUN_STATUS_ICONS[run.status] ?? Clock;
              return (
                <div key={run.id} className="flex items-center justify-between gap-4 p-3 text-sm">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-foreground">
                        {run.templateName ?? templates.find((t) => t.id === run.templateId)?.name ?? 'Report'}
                      </span>
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${RUN_STATUS_STYLES[run.status] ?? ''}`}>
                        <StatusIcon className={`h-3 w-3 ${run.status === 'generating' ? 'animate-spin' : ''}`} />
                        {run.status}
                      </span>
                    </div>
                    <div className="mt-0.5 text-xs text-foreground-muted">
                      {formatDate(run.createdAt)}
                      {run.completedAt && ` — completed ${formatDate(run.completedAt)}`}
                    </div>
                    {run.status === 'failed' && run.errorMessage && (
                      <div className="mt-1 text-xs text-danger">Error: {run.errorMessage}</div>
                    )}
                  </div>
                  {run.status === 'succeeded' && (
                    <button
                      type="button"
                      onClick={() => printRun(run, run.templateName ?? templates.find((t) => t.id === run.templateId)?.name ?? 'Report')}
                      className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-surface-muted"
                    >
                      <Download className="h-3.5 w-3.5" /> Print / PDF
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Regional Spend — D3.js choropleth of Nigeria states by project count */}
      <div className="rounded-xl border border-border bg-surface p-5 shadow-sm">
        <div className="mb-5">
          <h3 className="text-sm font-semibold text-foreground">Regional Spend</h3>
          <p className="mt-0.5 text-xs text-foreground-muted">
            Projects per state — darker blue = more projects. Nigeria states GeoJSON via so-dipe/GeoJSON (MIT).
          </p>
        </div>
        <RegionalSpendMap />
      </div>

      {/* Create Template Modal */}
      {showCreateTemplate && (
        <CreateTemplateModal
          onClose={() => setShowCreateTemplate(false)}
          onSaved={() => { setShowCreateTemplate(false); fetchTemplates(); }}
        />
      )}

      {/* Generate Report Modal */}
      {showGenerateReport && (
        <GenerateReportModal
          templates={templates}
          onClose={() => setShowGenerateReport(false)}
          onSaved={() => { setShowGenerateReport(false); fetchRuns(); }}
        />
      )}

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete template?"
        description={`Template "${pendingDelete?.name}" will be permanently deleted. Existing report runs are preserved in Report History.`}
        confirmLabel="Delete"
        onConfirm={() => {
          const target = pendingDelete;
          setPendingDelete(null);
          if (target) void deleteTemplate(target.id, setError, () => { fetchTemplates(); fetchRuns(); });
        }}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
function CreateTemplateModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState('daily_log');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const res = await authFetch('/api/v1/reports/templates', {
        method: 'POST',
        body: JSON.stringify({ name, description: description || undefined, type }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.message ?? 'Failed to create template');
      }
      onSaved();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="w-full max-w-lg rounded-xl border border-border bg-surface shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="text-lg font-semibold text-foreground">New Report Template</h2>
          <button onClick={onClose} className="rounded-lg p-1 text-foreground-muted hover:bg-surface-muted hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
          {error && <div className="rounded-lg border border-danger/20 bg-danger/5 p-3 text-sm text-danger">{error}</div>}
          <div>
            <label htmlFor="tpl-name" className="mb-1.5 block text-sm font-medium text-foreground">Name</label>
            <input id="tpl-name" value={name} onChange={(e) => setName(e.target.value)} required maxLength={200} className="h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm text-foreground placeholder:text-foreground-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" placeholder="e.g. Weekly Progress Report" />
          </div>
          <div>
            <label htmlFor="tpl-desc" className="mb-1.5 block text-sm font-medium text-foreground">Description</label>
            <textarea id="tpl-desc" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={1000} rows={2} className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-foreground-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary resize-none" placeholder="Brief description" />
          </div>
          <div>
            <label htmlFor="tpl-type" className="mb-1.5 block text-sm font-medium text-foreground">Type</label>
            <FilterDropdown
              value={type}
              onChange={setType}
              className="w-full"
              options={[
                { value: 'daily_log', label: 'Daily Log' },
                { value: 'weekly_summary', label: 'Weekly Summary' },
                { value: 'safety', label: 'Safety Report' },
                { value: 'custom', label: 'Custom' },
              ]}
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-surface-muted">Cancel</button>
            <button type="submit" disabled={isLoading} className="flex items-center gap-2 rounded-lg bg-action px-4 py-2 text-sm font-medium text-action-foreground transition-colors hover:bg-action/90 disabled:opacity-50">
              {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              Create Template
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function GenerateReportModal({ templates, onClose, onSaved }: { templates: ReportTemplateDomain[]; onClose: () => void; onSaved: () => void }) {
  const [templateId, setTemplateId] = useState(templates[0]?.id ?? '');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!templateId) {
      setError('Select a template first');
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const res = await authFetch('/api/v1/reports', {
        method: 'POST',
        body: JSON.stringify({ templateId }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.message ?? 'Failed to generate report');
      }
      onSaved();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="w-full max-w-lg rounded-xl border border-border bg-surface shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="text-lg font-semibold text-foreground">Generate Report</h2>
          <button onClick={onClose} className="rounded-lg p-1 text-foreground-muted hover:bg-surface-muted hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
          {error && <div className="rounded-lg border border-danger/20 bg-danger/5 p-3 text-sm text-danger">{error}</div>}
          {templates.length === 0 ? (
            <div className="rounded-lg border border-border bg-surface-muted/40 p-4 text-sm text-foreground-muted">
              <p className="font-medium text-foreground">No report templates yet</p>
              <p className="mt-1">
                A report is generated from a template. Use the “New Template” button first, then come back here to
                generate a report from it.
              </p>
            </div>
          ) : (
            <div>
              <label htmlFor="rpt-template" className="mb-1.5 block text-sm font-medium text-foreground">Template</label>
              <FilterDropdown
                value={templateId}
                onChange={setTemplateId}
                placeholder="Select template"
                className="w-full"
                options={templates.map((t) => ({ value: t.id, label: t.name }))}
              />
            </div>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-surface-muted">Cancel</button>
            <button type="submit" disabled={isLoading || templates.length === 0} className="flex items-center gap-2 rounded-lg bg-action px-4 py-2 text-sm font-medium text-action-foreground transition-colors hover:bg-action/90 disabled:opacity-50">
              {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              Generate
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
