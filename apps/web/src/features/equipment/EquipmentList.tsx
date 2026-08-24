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
import { Skeleton } from '@/shared/components/Skeleton';
import { Wrench, Plus } from '../../shared/components/icons';

interface EquipmentEnvelope {
  data: EquipmentDomain[] | { data: EquipmentDomain[] };
}

const TABLE_HEADERS = ['Equipment', 'Type', 'Status', 'Purchase date', 'Purchase cost'];

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

export function EquipmentList({ token }: { token: string }) {
  const [equipment, setEquipment] = useState<EquipmentDomain[]>([]);
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
        <ContentCard className="overflow-hidden p-0">
          <div className="h-11 animate-pulse bg-surface-muted/60" />
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex animate-pulse items-center gap-6 border-t border-border px-4 py-4">
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <Skeleton className="h-9 w-9 rounded-lg" />
                <Skeleton className="h-4 w-40" />
              </div>
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-24" />
            </div>
          ))}
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
            <table className="w-full min-w-[640px] text-sm">
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
