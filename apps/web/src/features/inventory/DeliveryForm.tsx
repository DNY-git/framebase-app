import { useCallback, useEffect, useMemo, useState } from 'react';
import type { DeliveryReceiptDomain, MaterialDomain } from '@constructtrack/types';
import { unwrapList, formatDate, formatCurrency } from '../../utils';
import { authFetch } from '../../auth-fetch';
import { FilterDropdown } from '../../shared/components/FilterDropdown';
import { Loader2, CheckCircle } from '../../shared/components/icons';

export function DeliveryForm() {
  const [deliveries, setDeliveries] = useState<DeliveryReceiptDomain[]>([]);
  const [materials, setMaterials] = useState<MaterialDomain[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [supplier, setSupplier] = useState('');
  const [materialId, setMaterialId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [costCents, setCostCents] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    const controller = new AbortController();
    try {
      const res = await authFetch('/api/v1/materials', { signal: controller.signal });
      if (!res.ok) throw new Error('Failed to fetch materials');
      const json = await res.json();
      setMaterials(unwrapList<MaterialDomain>(json));
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

  useEffect(() => {
    if (!successMessage) return;
    const timer = setTimeout(() => setSuccessMessage(null), 5000);
    return () => clearTimeout(timer);
  }, [successMessage]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccessMessage(null);
    try {
      const quantityNum = parseInt(quantity, 10);
      if (isNaN(quantityNum) || quantityNum <= 0) throw new Error('Quantity must be a positive number');
      const body: Record<string, unknown> = { supplier, materialId, quantity: quantityNum };
      if (costCents) body.costCents = parseInt(costCents, 10);
      if (notes) body.notes = notes;

      const res = await authFetch('/api/v1/deliveries', {
        method: 'POST',
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => null);
        throw new Error(errBody?.message ?? 'Failed to record delivery');
      }
      const json = await res.json() as { data: { delivery: DeliveryReceiptDomain } };
      const delivery = json.data?.delivery;
      if (delivery) {
        setDeliveries((prev) => [delivery, ...prev]);
        setSuccessMessage(`Delivery recorded for ${delivery.supplier}`);
      }

      setSupplier('');
      setMaterialId('');
      setQuantity('');
      setCostCents('');
      setNotes('');
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
        <h1 className="text-2xl font-bold text-foreground">Deliveries</h1>
        <p className="mt-1 text-sm text-foreground-muted">Record and track material deliveries</p>
      </div>

      <div className="grid gap-5 lg:grid-cols-[380px_1fr]">
        <section className="rounded-xl border border-border bg-surface p-5 shadow-sm">
          <h3 className="mb-4 text-sm font-semibold text-foreground">Record Delivery</h3>
          <form onSubmit={(e) => { void handleSubmit(e); }} className="space-y-3">
            <div>
              <label htmlFor="del-supplier" className="mb-1.5 block text-sm font-medium text-foreground">Supplier</label>
              <input id="del-supplier" type="text" value={supplier} onChange={(e) => setSupplier(e.target.value)} className="h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm text-foreground placeholder:text-foreground-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" required />
            </div>
            <div>
              <label htmlFor="del-material" className="mb-1.5 block text-sm font-medium text-foreground">Material</label>
              <FilterDropdown
                value={materialId}
                onChange={setMaterialId}
                placeholder="Select material"
                className="w-full"
                options={[
                  { value: '', label: 'Select material' },
                  ...materials.map((m) => ({ value: m.id, label: `${m.name} (${m.sku})` })),
                ]}
              />
            </div>
            <div>
              <label htmlFor="del-quantity" className="mb-1.5 block text-sm font-medium text-foreground">Quantity</label>
              <input id="del-quantity" type="number" min={1} value={quantity} onChange={(e) => setQuantity(e.target.value)} className="h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm text-foreground placeholder:text-foreground-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" required />
            </div>
            <div>
              <label htmlFor="del-cost" className="mb-1.5 block text-sm font-medium text-foreground">Cost (cents, optional)</label>
              <input id="del-cost" type="number" min={0} value={costCents} onChange={(e) => setCostCents(e.target.value)} className="h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm text-foreground placeholder:text-foreground-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
            <div>
              <label htmlFor="del-notes" className="mb-1.5 block text-sm font-medium text-foreground">Notes (optional)</label>
              <textarea id="del-notes" value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-foreground-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary resize-none" rows={3} />
            </div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {isSubmitting ? 'Recording...' : 'Record Delivery'}
            </button>
            {successMessage && (
              <div className="flex items-center gap-2 rounded-lg border border-success/20 bg-success/5 p-3 text-sm text-success">
                <CheckCircle className="h-4 w-4" />
                {successMessage}
              </div>
            )}
            {error && <div className="rounded-lg border border-danger/20 bg-danger/5 p-3 text-sm text-danger">{error}</div>}
          </form>
        </section>

        <section className="rounded-xl border border-border bg-surface p-5 shadow-sm">
          <h3 className="mb-4 text-sm font-semibold text-foreground">Recent Deliveries</h3>
          <p className="mb-4 text-xs text-foreground-muted">{deliveries.length} recorded</p>
          <div className="divide-y divide-border rounded-lg border border-border">
            {isLoading ? (
              <div className="flex items-center gap-2 p-4 text-sm text-foreground-muted">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                Loading materials...
              </div>
            ) : deliveries.length === 0 ? (
              <div className="p-4 text-center text-sm text-foreground-muted">No deliveries recorded yet</div>
            ) : (
              deliveries.map((del) => {
                const mat = materialMap.get(del.materialId);
                return (
                  <div key={del.id} className="p-3 text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="font-medium text-foreground">{del.supplier}</div>
                        <div className="text-foreground-muted">{mat?.name ?? del.materialId}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-success">+{del.quantity}</div>
                        <div className="text-xs text-foreground-muted">{formatCurrency(del.costCents ?? 0)}</div>
                      </div>
                    </div>
                    {del.notes && <div className="mt-1 text-foreground-muted">{del.notes}</div>}
                    <div className="mt-1 text-xs text-foreground-muted">{formatDate(del.createdAt)}</div>
                  </div>
                );
              })
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
