import { useCallback, useEffect, useMemo, useState } from 'react';
import type { InventoryTransactionDomain, MaterialCatalogItemDomain, MaterialDomain } from '@constructtrack/types';
import { unwrapList, unwrapItem, formatDate } from '../../utils';
import { authFetch } from '../../auth-fetch';
import { FilterDropdown } from '../../shared/components/FilterDropdown';
import { Skeleton } from '../../shared/components/Skeleton';
import { Loader2 } from '../../shared/components/icons';

const TRANSACTION_TYPES = ['receive', 'consume', 'adjust', 'transfer'] as const;
const ADD_NEW_MATERIAL = '__add_new__';

const TYPE_STYLES: Record<string, string> = {
  receive: 'bg-success/10 text-success',
  consume: 'bg-danger/10 text-danger',
  adjust: 'bg-primary/10 text-primary',
  transfer: 'bg-info/10 text-info',
};

export function TransactionLedger() {
  const [transactions, setTransactions] = useState<InventoryTransactionDomain[]>([]);
  const [materials, setMaterials] = useState<MaterialDomain[]>([]);
  const [catalogItems, setCatalogItems] = useState<MaterialCatalogItemDomain[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [filterMaterialId, setFilterMaterialId] = useState('');
  const [filterType, setFilterType] = useState('');
  const [formType, setFormType] = useState<string>('receive');
  const [formQuantity, setFormQuantity] = useState('');
  const [formMaterialId, setFormMaterialId] = useState('');
  const [catalogSelection, setCatalogSelection] = useState<string>('');
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newMaterialName, setNewMaterialName] = useState('');
  const [newMaterialUnit, setNewMaterialUnit] = useState('');
  const [formProjectId, setFormProjectId] = useState('');
  const [formNote, setFormNote] = useState('');
  const [formCostCents, setFormCostCents] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    const controller = new AbortController();
    try {
      const [txRes, matRes, catRes] = await Promise.all([
        authFetch('/api/v1/inventory/transactions', { signal: controller.signal }),
        authFetch('/api/v1/materials', { signal: controller.signal }),
        authFetch('/api/v1/materials/catalog', { signal: controller.signal }),
      ]);
      const [txJson, matJson, catJson] = await Promise.all([
        txRes.json().catch(() => null),
        matRes.json().catch(() => null),
        catRes.json().catch(() => null),
      ]);
      const serverMessage = (body: unknown): string | null =>
        (body && typeof body === 'object' && 'message' in body
          ? String((body as { message: unknown }).message)
          : null);
      if (!txRes.ok) throw new Error(serverMessage(txJson) ?? 'Failed to fetch transactions');
      if (!matRes.ok) throw new Error(serverMessage(matJson) ?? 'Failed to fetch materials');
      if (!catRes.ok) throw new Error(serverMessage(catJson) ?? 'Failed to fetch material catalog');
      setTransactions(unwrapList<InventoryTransactionDomain>(txJson ?? { data: [] }));
      setMaterials(unwrapList<MaterialDomain>(matJson ?? { data: [] }));
      setCatalogItems(unwrapList<MaterialCatalogItemDomain>(catJson ?? { data: [] }));
    } catch (err: unknown) {
      if ((err as Error).name !== 'AbortError') {
        setError((err as Error).message);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Resolves a selected catalog item to an existing Material by name, or
   * creates a new Material for it and returns that id.
   */
  const ensureMaterial = useCallback(
    async (item: { name: string; unit?: string; sku?: string }): Promise<string> => {
      const existing = materials.find((m) => m.name.toLowerCase() === item.name.toLowerCase());
      if (existing) return existing.id;
      const res = await authFetch('/api/v1/materials', {
        method: 'POST',
        body: JSON.stringify({
          name: item.name,
          unit: item.unit ?? 'each',
          sku: item.sku ?? `MAT-${Date.now().toString(36).toUpperCase()}`,
          reorderPoint: 0,
        }),
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => null);
        throw new Error(errBody?.message ?? 'Failed to create material');
      }
      const created = unwrapItem<MaterialDomain>(await res.json());
      setMaterials((prev) => [...prev, created]);
      return created.id;
    },
    [materials],
  );

  async function handleCatalogSelect(value: string) {
    setCatalogSelection(value);
    if (value === ADD_NEW_MATERIAL) {
      setIsAddingNew(true);
      return;
    }
    if (!value) {
      setIsAddingNew(false);
      return;
    }
    setIsAddingNew(false);
    setError(null);
    try {
      const item = catalogItems.find((c) => c.id === value);
      if (!item) return;
      const materialId = await ensureMaterial({ name: item.name, unit: item.unit, sku: item.sku });
      setFormMaterialId(materialId);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function handleCreateNewMaterial(e: React.FormEvent) {
    e.preventDefault();
    if (!newMaterialName.trim()) return;
    setError(null);
    try {
      const materialId = await ensureMaterial({ name: newMaterialName.trim(), unit: newMaterialUnit.trim() || undefined });
      setFormMaterialId(materialId);
      setNewMaterialName('');
      setNewMaterialUnit('');
      setIsAddingNew(false);
      setCatalogSelection('');
    } catch (err) {
      setError((err as Error).message);
    }
  }

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function applyFilters() {
    try {
      const params = new URLSearchParams();
      if (filterMaterialId) params.set('materialId', filterMaterialId);
      if (filterType) params.set('type', filterType);
      const res = await authFetch(`/api/v1/inventory/transactions?${params}`);
      if (!res.ok) throw new Error('Failed to fetch transactions');
      const json = await res.json();
      setTransactions(unwrapList<InventoryTransactionDomain>(json));
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function handleRecordTransaction(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      const quantity = parseInt(formQuantity, 10);
      if (isNaN(quantity) || quantity <= 0) throw new Error('Quantity must be a positive number');
      const body: Record<string, unknown> = { type: formType, quantity, materialId: formMaterialId };
      if (formProjectId) body.projectId = formProjectId;
      if (formNote) body.note = formNote;
      if (formCostCents) body.costCents = parseInt(formCostCents, 10);

      const res = await authFetch('/api/v1/inventory/transactions', {
        method: 'POST',
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => null);
        throw new Error(errBody?.message ?? 'Failed to record transaction');
      }
      setFormQuantity('');
      setFormProjectId('');
      setFormNote('');
      setFormCostCents('');
      await applyFilters();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  }

  const materialMap = useMemo(() => new Map(materials.map((m) => [m.id, m])), [materials]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Transaction Ledger</h1>
        <p className="mt-1 text-sm text-foreground-muted">{transactions.length} transactions</p>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_380px]">
        <section className="rounded-xl border border-border bg-surface p-5 shadow-sm">
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <FilterDropdown
              value={filterMaterialId}
              onChange={setFilterMaterialId}
              placeholder="All materials"
              className="w-full sm:w-52"
              options={[
                { value: '', label: 'All materials' },
                ...materials.map((m) => ({ value: m.id, label: `${m.name} (${m.sku})` })),
              ]}
            />
            <FilterDropdown
              value={filterType}
              onChange={setFilterType}
              placeholder="All types"
              className="w-full sm:w-40"
              options={[
                { value: '', label: 'All types' },
                ...TRANSACTION_TYPES.map((t) => ({ value: t, label: t })),
              ]}
            />
            <button
              type="button"
              onClick={() => { void applyFilters(); }}
              className="h-10 rounded-lg border border-border bg-surface px-4 text-sm font-medium text-foreground transition-colors hover:bg-surface-muted"
            >
              Filter
            </button>
          </div>

          {error && (
            <div className="mb-4 rounded-lg border border-danger/20 bg-danger/5 p-3 text-sm text-danger">
              {error}
              <button onClick={() => fetchData()} className="ml-2 font-medium underline">Retry</button>
            </div>
          )}

          <div className="divide-y divide-border rounded-lg border border-border">
            {isLoading ? (
              <div className="space-y-4 p-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex animate-pulse items-center justify-between gap-3">
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <Skeleton className="h-4 w-36" />
                        <Skeleton className="h-5 w-14 rounded-full" />
                      </div>
                      <Skeleton className="h-3 w-24" />
                    </div>
                    <Skeleton className="h-4 w-16" />
                  </div>
                ))}
              </div>
            ) : !error && transactions.length === 0 ? (
              <div className="p-4 text-center text-sm text-foreground-muted">No transactions found</div>
            ) : (
              transactions.map((tx) => {
                const mat = materialMap.get(tx.materialId);
                const isIncrease = tx.type === 'receive';
                return (
                  <div key={tx.id} className="flex items-center justify-between gap-3 p-3 text-sm">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-foreground">{mat?.name ?? tx.materialId}</span>
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${TYPE_STYLES[tx.type] ?? 'bg-foreground-muted/10 text-foreground-muted'}`}>
                          {tx.type}
                        </span>
                      </div>
                      <div className="text-foreground-muted">{tx.note ?? 'No note'}</div>
                    </div>
                    <div className="text-right">
                      <div className={`font-bold ${isIncrease ? 'text-success' : 'text-danger'}`}>
                        {isIncrease ? '+' : '-'}{tx.quantity}
                      </div>
                      <div className="text-xs text-foreground-muted">{formatDate(tx.createdAt)}</div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>

        <section className="rounded-xl border border-border bg-surface p-5 shadow-sm">
          <h3 className="mb-4 text-sm font-semibold text-foreground">Record Transaction</h3>
          <form onSubmit={(e) => { void handleRecordTransaction(e); }} className="space-y-3">
            <div>
              <label htmlFor="tx-type" className="mb-1.5 block text-sm font-medium text-foreground">Type</label>
              <FilterDropdown
                value={formType}
                onChange={setFormType}
                className="w-full"
                options={TRANSACTION_TYPES.map((t) => ({ value: t, label: t }))}
              />
            </div>
            <div>
              <label htmlFor="tx-catalog" className="mb-1.5 block text-sm font-medium text-foreground">Material catalog</label>
              <FilterDropdown
                value={catalogSelection}
                onChange={(v) => { void handleCatalogSelect(v); }}
                placeholder="Pick from catalog"
                className="w-full"
                options={[
                  { value: '', label: 'Pick from catalog' },
                  ...catalogItems.map((c) => ({ value: c.id, label: `${c.name} (${c.category})` })),
                  { value: ADD_NEW_MATERIAL, label: '+ Add new material' },
                ]}
              />
            </div>
            {isAddingNew && (
              <div className="space-y-3 rounded-lg border border-border bg-surface-muted p-3">
                <div>
                  <label htmlFor="tx-new-name" className="mb-1.5 block text-sm font-medium text-foreground">New material name</label>
                  <input id="tx-new-name" type="text" value={newMaterialName} onChange={(e) => setNewMaterialName(e.target.value)} className="h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm text-foreground placeholder:text-foreground-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" placeholder="e.g. Cement Portland 42.5R" required />
                </div>
                <div>
                  <label htmlFor="tx-new-unit" className="mb-1.5 block text-sm font-medium text-foreground">Unit (optional)</label>
                  <input id="tx-new-unit" type="text" value={newMaterialUnit} onChange={(e) => setNewMaterialUnit(e.target.value)} className="h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm text-foreground placeholder:text-foreground-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" placeholder="e.g. bag" />
                </div>
                <button
                  type="button"
                  onClick={(e) => { void handleCreateNewMaterial(e); }}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  Create &amp; select
                </button>
              </div>
            )}
            <div>
              <label htmlFor="tx-material" className="mb-1.5 block text-sm font-medium text-foreground">Material {catalogSelection ? '(resolved)' : ''}</label>
              <FilterDropdown
                value={formMaterialId}
                onChange={setFormMaterialId}
                placeholder="Select material"
                className="w-full"
                options={[
                  { value: '', label: 'Select material' },
                  ...materials.map((m) => ({ value: m.id, label: `${m.name} (${m.sku})` })),
                ]}
              />
            </div>
            <div>
              <label htmlFor="tx-quantity" className="mb-1.5 block text-sm font-medium text-foreground">Quantity</label>
              <input id="tx-quantity" type="number" min={1} value={formQuantity} onChange={(e) => setFormQuantity(e.target.value)} className="h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm text-foreground placeholder:text-foreground-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" required />
            </div>
            <div>
              <label htmlFor="tx-project" className="mb-1.5 block text-sm font-medium text-foreground">Project ID (optional)</label>
              <input id="tx-project" type="text" value={formProjectId} onChange={(e) => setFormProjectId(e.target.value)} className="h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm text-foreground placeholder:text-foreground-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
            <div>
              <label htmlFor="tx-cost" className="mb-1.5 block text-sm font-medium text-foreground">Cost (cents, optional)</label>
              <input id="tx-cost" type="number" min={0} value={formCostCents} onChange={(e) => setFormCostCents(e.target.value)} className="h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm text-foreground placeholder:text-foreground-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
            <div>
              <label htmlFor="tx-note" className="mb-1.5 block text-sm font-medium text-foreground">Note (optional)</label>
              <input id="tx-note" type="text" value={formNote} onChange={(e) => setFormNote(e.target.value)} className="h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm text-foreground placeholder:text-foreground-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {isSubmitting ? 'Recording...' : 'Record Transaction'}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
