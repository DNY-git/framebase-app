import { useCallback, useEffect, useState } from 'react';
import type { EquipmentDomain } from '@constructtrack/types';
import { EquipmentStatus } from '@constructtrack/types';
import { EquipmentDetail } from './EquipmentDetail';
import { EquipmentForm } from './EquipmentForm';
import { authFetch } from '../../auth-fetch';
import { unwrapList, formatCurrency, formatDate } from '../../utils';
import { PageHeader } from '@/components/ui/page-header';
import { FilterBar } from '@/components/ui/filter-bar';
import { ContentCard } from '@/components/ui/content-card';
import { EmptyState } from '@/components/ui/empty-state';
import { SearchInput } from '@/components/ui/search-input';
import { FilterDropdown } from '@/shared/components/FilterDropdown';
import { Wrench, Loader2, Plus } from '../../shared/components/icons';

interface EquipmentEnvelope {
  data: EquipmentDomain[] | { data: EquipmentDomain[] };
}

interface UtilizationMetric {
  equipmentId: string;
  utilizationPercentage: number;
}

const TABLE_HEADERS = ['Equipment', 'Type', 'Status', 'Purchase date', 'Purchase cost', 'Utilisation'];

const STATUS_STYLES: Record<string, string> = {
  [EquipmentStatus.AVAILABLE]: 'bg-success/10 text-success',
  [EquipmentStatus.ASSIGNED]: 'bg-primary/10 text-primary',
  [EquipmentStatus.MAINTENANCE]: 'bg-warning/10 text-warning',
  [EquipmentStatus.RETIRED]: 'bg-foreground-muted/10 text-foreground-muted',
};

const STATUS_DOT: Record<string, string> = {
  [EquipmentStatus.AVAILABLE]: 'bg-success',
  [EquipmentStatus.ASSIGNED]: 'bg-primary',
  [EquipmentStatus.MAINTENANCE]: 'bg-warning',
  [EquipmentStatus.RETIRED]: 'bg-foreground-muted',
};

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: EquipmentStatus.AVAILABLE, label: 'Available' },
  { value: EquipmentStatus.ASSIGNED, label: 'Assigned' },
  { value: EquipmentStatus.MAINTENANCE, label: 'Maintenance' },
  { value: EquipmentStatus.RETIRED, label: 'Retired' },
];

function utilisationTextClass(percent: number): string {
  if (percent >= 70) return 'text-success';
  if (percent >= 40) return 'text-warning';
  return 'text-danger';
}

function unwrapUtilization(json: unknown): number | null {
  const root = json as { data?: UtilizationMetric | { data?: UtilizationMetric } };
  const metric =
    root.data && typeof root.data === 'object' && 'data' in root.data
      ? (root.data as { data?: UtilizationMetric }).data
      : (root.data as UtilizationMetric | undefined);
  if (metric && typeof metric.utilizationPercentage === 'number') {
    return Math.min(100, Math.max(0, metric.utilizationPercentage));
  }
  return null;
}

export function EquipmentList({ token }: { token: string }) {
  const [equipment, setEquipment] = useState<EquipmentDomain[]>([]);
  const [utilization, setUtilization] = useState<Record<string, number | null>>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchInput, setSearchInput] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showForm, setShowForm] = useState(false);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    const controller = new AbortController();
    try {
      const res = await authFetch('/api/v1/equipment', { signal: controller.signal });
      if (!res.ok) throw new Error('Failed to fetch equipment');
      const json = (await res.json()) as EquipmentEnvelope;
      const envelope = json as unknown as import('../../utils').PaginatedEnvelope<EquipmentDomain>;
      const items = unwrapList<EquipmentDomain>(envelope);
      setEquipment(items);
      setSelectedId((current) => current ?? items[0]?.id ?? null);

      const to = new Date();
      const from = new Date();
      from.setDate(to.getDate() - 30);
      const query = `from=${from.toISOString().slice(0, 10)}&to=${to.toISOString().slice(0, 10)}`;
      const results = await Promise.all(
        items.map(async (eq) => {
          try {
            const utilRes = await authFetch(`/api/v1/equipment/${eq.id}/utilization?${query}`, {
              signal: controller.signal,
            });
            if (!utilRes.ok) return { id: eq.id, value: null };
            return { id: eq.id, value: unwrapUtilization(await utilRes.json()) };
          } catch {
            return { id: eq.id, value: null };
          }
        }),
      );
      setUtilization(Object.fromEntries(results.map((r) => [r.id, r.value])));
    } catch (err: unknown) {
      if ((err as Error).name !== 'AbortError') {
        setError((err as Error).message);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredEquipment = equipment.filter((eq) => {
    if (statusFilter && eq.status !== statusFilter) return false;
    if (!searchInput) return true;
    const q = searchInput.toLowerCase();
    return (
      eq.name?.toLowerCase().includes(q) ||
      eq.serialNumber?.toLowerCase().includes(q) ||
      eq.category?.toLowerCase().includes(q)
    );
  });

  const selectedEquipment = filteredEquipment.find((item) => item.id === selectedId) ?? filteredEquipment[0];

  return (
    <div className="space-y-6">
      <PageHeader title="Equipment" subtitle="Manage and track all construction equipment" />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <FilterBar className="flex-1">
          <SearchInput
            value={searchInput}
            onChange={setSearchInput}
            placeholder="Search equipment..."
            ariaLabel="Search equipment"
            className="w-full max-w-xs"
          />
          <FilterDropdown
            value={statusFilter}
            onChange={setStatusFilter}
            placeholder="All statuses"
            className="w-full sm:w-44"
            options={STATUS_OPTIONS}
          />
        </FilterBar>
        <button
          onClick={() => setShowForm(true)}
          className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-success px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-success/90"
        >
          <Plus className="h-4 w-4" /> Add equipment
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-danger/20 bg-danger/5 p-3 text-sm text-danger">
          {error}
          <button onClick={() => fetchData()} className="ml-2 font-medium underline">Retry</button>
        </div>
      )}

      {isLoading ? (
        <ContentCard className="flex items-center gap-2 p-6 text-sm text-foreground-muted">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          Loading equipment...
        </ContentCard>
      ) : filteredEquipment.length === 0 ? (
        <EmptyState
          title="No equipment found"
          description={searchInput || statusFilter ? 'Try adjusting your filters' : 'Add equipment to your fleet to get started'}
          icon={Wrench}
        />
      ) : (
        <ContentCard className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-sm">
              <thead>
                <tr className="border-b border-border bg-surface-muted/60 text-left">
                  {TABLE_HEADERS.map((header) => (
                    <th
                      key={header}
                      className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-foreground-muted"
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredEquipment.map((eq) => {
                  const isSelected = eq.id === selectedEquipment?.id;
                  const utilPercent = utilization[eq.id];
                  return (
                    <tr
                      key={eq.id}
                      onClick={() => setSelectedId(eq.id)}
                      className={`cursor-pointer transition-colors hover:bg-surface-muted/50 ${
                        isSelected ? 'bg-primary/5' : ''
                      }`}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <span
                            className={`h-2.5 w-2.5 shrink-0 rounded-full ${STATUS_DOT[eq.status] ?? 'bg-foreground-muted'}`}
                            aria-hidden
                          />
                          <div className="min-w-0">
                            <div className="truncate font-medium text-foreground">{eq.name}</div>
                            <div className="text-xs font-mono text-foreground-muted">{eq.serialNumber}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-foreground">{eq.category}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium capitalize ${
                            STATUS_STYLES[eq.status] ?? 'bg-foreground-muted/10 text-foreground-muted'
                          }`}
                        >
                          {eq.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-foreground-muted">
                        {eq.purchaseDate ? formatDate(eq.purchaseDate) : '—'}
                      </td>
                      <td className="px-4 py-3 tabular-nums text-foreground">
                        {typeof eq.purchaseCostCents === 'number' ? formatCurrency(eq.purchaseCostCents) : '—'}
                      </td>
                      <td className="px-4 py-3">
                        {utilPercent != null ? (
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 w-16 overflow-hidden rounded-full bg-surface-muted">
                              <div
                                className={`h-full rounded-full ${
                                  utilPercent >= 70 ? 'bg-success' : utilPercent >= 40 ? 'bg-warning' : 'bg-danger'
                                }`}
                                style={{ width: `${utilPercent}%` }}
                              />
                            </div>
                            <span className={`text-xs font-semibold tabular-nums ${utilisationTextClass(utilPercent)}`}>
                              {Math.round(utilPercent)}%
                            </span>
                          </div>
                        ) : (
                          <span className="text-foreground-muted">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </ContentCard>
      )}

      {selectedEquipment && <EquipmentDetail token={token} equipment={selectedEquipment} />}

      {showForm && (
        <EquipmentForm
          onClose={() => setShowForm(false)}
          onSaved={() => {
            setShowForm(false);
            fetchData();
          }}
        />
      )}
    </div>
  );
}
