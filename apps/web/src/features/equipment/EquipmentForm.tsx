import { useState, useEffect, useMemo } from 'react';
import { authFetch } from '../../auth-fetch';
import { X, Loader2 } from '../../shared/components/icons';
import { DatePicker } from '../../components/ui';
import { EquipmentCategory, type EquipmentDomain } from '@constructtrack/types';

interface EquipmentFormProps {
  onClose: () => void;
  onSaved: (saved?: EquipmentDomain) => void;
  /** When provided the form edits this equipment (PATCH) instead of creating one. */
  equipment?: EquipmentDomain;
  /** Render the form body without the modal overlay (used inside the detail screen). */
  inline?: boolean;
}

interface CatalogItem {
  id: string;
  name: string;
  category: EquipmentCategory;
}

interface FieldError {
  field: string;
  message: string;
}

const CATEGORY_LABELS: Record<EquipmentCategory, string> = {
  [EquipmentCategory.EARTHMOVING]: 'Earthmoving',
  [EquipmentCategory.LIFTING]: 'Lifting & Access',
  [EquipmentCategory.TRANSPORT]: 'Transport & Haulage',
  [EquipmentCategory.CONCRETE]: 'Concrete',
  [EquipmentCategory.POWER]: 'Power & Tools',
};

const CATEGORY_OPTIONS = Object.values(EquipmentCategory);

/** API validation errors arrive as an envelope: { message, errors: [{ field, message }] }. */
function parseErrorResponse(body: unknown): { message: string; fieldErrors: FieldError[] } {
  if (body && typeof body === 'object') {
    const b = body as { message?: unknown; errors?: unknown };
    const message =
      typeof b.message === 'string' ? b.message : 'Failed to save equipment';
    const fieldErrors = Array.isArray(b.errors)
      ? (b.errors as FieldError[]).filter(
          (e) => e && typeof e.field === 'string' && typeof e.message === 'string',
        )
      : [];
    return { message, fieldErrors };
  }
  return { message: 'Failed to save equipment', fieldErrors: [] };
}

function toDateInput(value?: string | Date | null): string {
  if (!value) return '';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
}

export function EquipmentForm({ onClose, onSaved, equipment, inline = false }: EquipmentFormProps) {
  const isEdit = !!equipment;

  const [source, setSource] = useState<'catalog' | 'custom'>(isEdit ? 'custom' : 'catalog');
  const [catalogItems, setCatalogItems] = useState<CatalogItem[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [selectedCatalogId, setSelectedCatalogId] = useState('');

  const [name, setName] = useState(equipment?.name ?? '');
  const [serialNumber, setSerialNumber] = useState(equipment?.serialNumber ?? '');
  const [category, setCategory] = useState<EquipmentCategory | ''>(
    (equipment?.category as EquipmentCategory | undefined) ?? '',
  );
  const [purchaseDate, setPurchaseDate] = useState(toDateInput(equipment?.purchaseDate));
  const [purchaseCost, setPurchaseCost] = useState(
    equipment?.purchaseCostCents != null ? String(equipment.purchaseCostCents / 100) : '',
  );

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldError[]>([]);

  useEffect(() => {
    function handleEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  useEffect(() => {
    let cancelled = false;
    setCatalogLoading(true);
    authFetch('/api/v1/equipment/catalog')
      .then((res) => (res.ok ? res.json() : { data: [] }))
      .then((json) => {
        if (!cancelled) setCatalogItems(json.data ?? []);
      })
      .catch(() => {
        // Catalog is optional — custom entry still works.
      })
      .finally(() => {
        if (!cancelled) setCatalogLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const selectedCatalogItem = useMemo(
    () => catalogItems.find((item) => item.id === selectedCatalogId),
    [catalogItems, selectedCatalogId],
  );

  /** Live preview of the entered amount, formatted as currency. */
  const costPreview = useMemo(() => {
    const major = parseFloat(purchaseCost);
    if (!Number.isFinite(major) || major < 0) return null;
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(major);
  }, [purchaseCost]);

  function switchSource(next: 'catalog' | 'custom') {
    setSource(next);
    setError(null);
    setFieldErrors([]);
    if (next === 'catalog') {
      setName(selectedCatalogItem?.name ?? '');
      setCategory(selectedCatalogItem?.category ?? '');
    } else {
      setSelectedCatalogId('');
    }
  }

  function selectCatalogItem(id: string) {
    setSelectedCatalogId(id);
    const item = catalogItems.find((i) => i.id === id);
    if (item) {
      setName(item.name);
      setCategory(item.category);
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setFieldErrors([]);

    const majorCost = parseFloat(purchaseCost);
    const payload: Record<string, unknown> = {
      name,
      serialNumber,
      category,
      purchaseDate: purchaseDate || undefined,
      // Backend stores integer minor units (cents); the form collects major units.
      purchaseCostCents:
        Number.isFinite(majorCost) && majorCost >= 0 ? Math.round(majorCost * 100) : undefined,
    };

    try {
      const url = isEdit ? `/api/v1/equipment/${equipment!.id}` : '/api/v1/equipment';
      const res = await authFetch(url, {
        method: isEdit ? 'PATCH' : 'POST',
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        const parsed = parseErrorResponse(body);
        setError(parsed.message);
        setFieldErrors(parsed.fieldErrors);
        return;
      }
      const saved = (await res.json().catch(() => null)) as { data?: EquipmentDomain } | null;
      onSaved(saved?.data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const inputClass =
    'h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm text-foreground placeholder:text-foreground-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary';

  const formBody = (
    <form onSubmit={handleSubmit} className="space-y-4 px-6 py-4">
      {/* Source selector — pick a known type or add a new one (create mode only) */}
      {!isEdit && (
        <div className="grid grid-cols-2 gap-2 rounded-lg border border-border bg-surface-muted/40 p-1">
          <button
            type="button"
            onClick={() => switchSource('catalog')}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              source === 'catalog'
                ? 'bg-surface text-foreground shadow-sm'
                : 'text-foreground-muted hover:text-foreground'
            }`}
          >
            Select existing item
          </button>
          <button
            type="button"
            onClick={() => switchSource('custom')}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              source === 'custom'
                ? 'bg-surface text-foreground shadow-sm'
                : 'text-foreground-muted hover:text-foreground'
            }`}
          >
            + Add new equipment
          </button>
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-danger/20 bg-danger/5 p-3 text-sm text-danger">
          <p>{error}</p>
          {fieldErrors.length > 0 && (
            <ul className="mt-1.5 list-inside list-disc space-y-0.5 text-xs">
              {fieldErrors.map((fe, i) => (
                <li key={i}>
                  <span className="font-medium">{fe.field}</span>: {fe.message}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {source === 'catalog' && !isEdit && (
        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">Equipment type *</label>
          <select
            value={selectedCatalogId}
            onChange={(e) => selectCatalogItem(e.target.value)}
            required
            disabled={catalogLoading}
            className={inputClass}
          >
            <option value="" disabled>
              {catalogLoading ? 'Loading catalog…' : 'Choose from predefined items'}
            </option>
            {catalogItems.map((item) => (
              <option key={item.id} value={item.id}>
                {CATEGORY_LABELS[item.category]} — {item.name}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-foreground-muted">
            The serial number and purchase details below make this unit unique.
          </p>
        </div>
      )}

      <div>
        <label className="mb-1.5 block text-sm font-medium text-foreground">Name *</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={source === 'catalog' && !isEdit ? 'CAT Excavator #001' : 'Excavator 320'}
          required
          className={inputClass}
        />
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-foreground">Serial number *</label>
        <input
          type="text"
          value={serialNumber}
          onChange={(e) => setSerialNumber(e.target.value)}
          placeholder="SN-2026-0001"
          required
          className={inputClass}
        />
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-foreground">Category *</label>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as EquipmentCategory)}
          required
          disabled={source === 'catalog' && !isEdit && !!selectedCatalogItem}
          className={inputClass}
        >
          <option value="" disabled>
            Select a category
          </option>
          {CATEGORY_OPTIONS.map((c) => (
            <option key={c} value={c}>
              {CATEGORY_LABELS[c]}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">Purchase date</label>
          <DatePicker
            value={purchaseDate}
            onChange={setPurchaseDate}
            placeholder="Select purchase date"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">Purchase cost</label>
          <input
            type="number"
            min={0}
            step="0.01"
            value={purchaseCost}
            onChange={(e) => setPurchaseCost(e.target.value)}
            placeholder="12000.00"
            className={inputClass}
          />
          {costPreview !== null && (
            <p className="mt-1 text-xs text-foreground-muted">
              You entered {costPreview}
            </p>
          )}
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
          {isEdit ? 'Save changes' : 'Add equipment'}
        </button>
      </div>
    </form>
  );

  if (inline) {
    return (
      <div className="mt-4 rounded-lg border border-border bg-surface-muted/30 p-1">
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <h3 className="text-sm font-semibold text-foreground">Edit Equipment</h3>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-foreground-muted hover:bg-surface-muted hover:text-foreground"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        {formBody}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden="true" />
      <div className="relative w-full max-w-md rounded-xl bg-surface shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-base font-semibold text-foreground">Add Equipment</h2>
          <button onClick={onClose} className="rounded-lg p-1 text-foreground-muted hover:bg-surface-muted hover:text-foreground" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>
        {formBody}
      </div>
    </div>
  );
}
