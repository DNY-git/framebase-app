import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { MaterialWithStockDomain } from '@constructtrack/types';
import { unwrapList } from '../../utils';
import { authFetch } from '../../auth-fetch';
import { PageHeader } from '@/components/ui/page-header';
import { FilterBar } from '@/components/ui/filter-bar';
import { ContentCard } from '@/components/ui/content-card';
import { EmptyState } from '@/components/ui/empty-state';
import { SearchInput } from '@/components/ui/search-input';
import { FilterDropdown } from '@/shared/components/FilterDropdown';
import { Package, Loader2, Plus } from '../../shared/components/icons';

const TABLE_HEADERS = ['Item', 'Quantity on hand', 'Unit', 'Reorder threshold', 'Status'];

function formatQuantity(quantity: number): string {
  return quantity.toLocaleString();
}

export function MaterialList() {
  const navigate = useNavigate();
  const [materials, setMaterials] = useState<MaterialWithStockDomain[]>([]);
  const [lowStockItems, setLowStockItems] = useState<MaterialWithStockDomain[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchInput, setSearchInput] = useState('');
  const [stockFilter, setStockFilter] = useState('');

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    const controller = new AbortController();
    try {
      const [catalogRes, lowStockRes] = await Promise.all([
        authFetch('/api/v1/materials', { signal: controller.signal }),
        authFetch('/api/v1/materials/low-stock', { signal: controller.signal }),
      ]);

      if (!catalogRes.ok) throw new Error('Failed to fetch materials');
      const catalogJson = await catalogRes.json();
      setMaterials(unwrapList<MaterialWithStockDomain>(catalogJson));

      if (lowStockRes.ok) {
        const lowStockJson = await lowStockRes.json();
        setLowStockItems(Array.isArray(lowStockJson.data) ? lowStockJson.data : []);
      }
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

  const lowStockIds = new Set(lowStockItems.map((m) => m.id));

  const displayed = materials.filter((material) => {
    if (stockFilter === 'low' && !lowStockIds.has(material.id)) return false;
    if (stockFilter === 'ok' && lowStockIds.has(material.id)) return false;
    if (!searchInput) return true;
    const q = searchInput.toLowerCase();
    return material.name?.toLowerCase().includes(q) || material.sku?.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inventory"
        subtitle="Track materials and stock levels"
        actions={
          <button
            type="button"
            onClick={() => navigate('/inventory/deliveries')}
            className="inline-flex items-center gap-2 rounded-lg bg-success px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-success/90"
          >
            <Plus className="h-4 w-4" /> Add stock
          </button>
        }
      />

      <FilterBar>
        <SearchInput
          value={searchInput}
          onChange={setSearchInput}
          placeholder="Search materials..."
          ariaLabel="Search materials"
          className="w-full max-w-xs"
        />
        <FilterDropdown
          value={stockFilter}
          onChange={setStockFilter}
          placeholder="All stock"
          className="w-full sm:w-44"
          options={[
            { value: '', label: 'All stock' },
            { value: 'low', label: 'Low stock' },
            { value: 'ok', label: 'In stock' },
          ]}
        />
      </FilterBar>

      {error && (
        <div className="rounded-lg border border-danger/20 bg-danger/5 p-3 text-sm text-danger">
          {error}
          <button onClick={() => fetchData()} className="ml-2 font-medium underline">Retry</button>
        </div>
      )}

      {isLoading ? (
        <ContentCard className="flex items-center gap-2 p-6 text-sm text-foreground-muted">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          Loading materials...
        </ContentCard>
      ) : displayed.length === 0 ? (
        <EmptyState
          title="No materials found"
          description={searchInput || stockFilter ? 'Try adjusting your filters' : 'Add stock to get started'}
          icon={Package}
        />
      ) : (
        <ContentCard className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
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
                {displayed.map((material) => {
                  const qty = material.stockLevel?.quantity ?? 0;
                  const isLow = lowStockIds.has(material.id);
                  return (
                    <tr key={material.id} className="transition-colors hover:bg-surface-muted/50">
                      <td className="px-4 py-3">
                        <div className="min-w-0">
                          <div className="truncate font-medium text-foreground">{material.name}</div>
                          <div className="text-xs font-mono text-foreground-muted">SKU: {material.sku}</div>
                        </div>
                      </td>
                      <td className={`px-4 py-3 tabular-nums font-semibold ${isLow ? 'text-danger' : 'text-foreground'}`}>
                        {formatQuantity(qty)}
                      </td>
                      <td className="px-4 py-3 text-foreground-muted">{material.unit}</td>
                      <td className="px-4 py-3 tabular-nums text-foreground-muted">
                        {formatQuantity(material.reorderPoint)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${
                            isLow ? 'bg-warning/10 text-warning' : 'bg-success/10 text-success'
                          }`}
                        >
                          {isLow ? 'Low stock' : 'In stock'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </ContentCard>
      )}
    </div>
  );
}
