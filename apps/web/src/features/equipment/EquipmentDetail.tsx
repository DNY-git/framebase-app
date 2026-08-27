import { useCallback, useEffect, useMemo, useState } from 'react';
import type {
  DowntimeLogDomain,
  EquipmentDomain,
  EquipmentUsageLogDomain,
  MaintenanceRecordDomain,
} from '@constructtrack/types';
import { authFetch } from '../../auth-fetch';
import { Skeleton } from '../../shared/components/Skeleton';
import { DatePicker } from '../../components/ui';
import { EquipmentForm } from './EquipmentForm';

interface UtilizationMetric {
  equipmentId: string;
  name: string;
  fromDate: string;
  toDate: string;
  totalHours: number;
  utilizationPercentage: number;
  utilizationHours: number;
  downTimeHours: number;
  costCents?: number;
}

interface MaintenanceAlert {
  id: string;
  equipmentId: string;
  equipmentName: string;
  type: string;
  status: string;
  nextDueAt: string | null;
  daysUntilDue: number | null;
  isOverdue: boolean;
  notes?: string;
}

interface PaginatedEnvelope<T> {
  data: T[] | { data: T[] };
}

interface DetailEnvelope<T> {
  data: T | { data: T };
}

interface EquipmentDetailProps {
  token: string;
  equipment: EquipmentDomain;
  onUpdated?: (equipment: EquipmentDomain) => void;
}

function formatDate(date?: string | Date | null): string {
  if (!date) return 'Not scheduled';
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(
    new Date(date),
  );
}

function formatCurrency(cents?: number): string {
  if (typeof cents !== 'number') return 'Not set';
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function unwrapItem<T>(json: DetailEnvelope<T>): T {
  if (json.data && typeof json.data === 'object' && 'data' in json.data) {
    return json.data.data as T;
  }
  return json.data as T;
}

function unwrapList<T>(json: PaginatedEnvelope<T>): T[] {
  if (Array.isArray(json.data)) return json.data;
  if (json.data && typeof json.data === 'object' && Array.isArray(json.data.data)) {
    return json.data.data;
  }
  return [];
}

async function fetchJson<T>(url: string, _token: string): Promise<T> {
  const res = await authFetch(url);
  if (!res.ok) {
    const message = await res.text();
    throw new Error(message || 'Request failed');
  }
  return res.json() as Promise<T>;
}

export function EquipmentDetail({ token, equipment, onUpdated }: EquipmentDetailProps): React.JSX.Element {
  const [current, setCurrent] = useState<EquipmentDomain>(equipment);
  const [isEditing, setIsEditing] = useState(false);
  const [utilization, setUtilization] = useState<UtilizationMetric | null>(null);
  const [maintenanceAlerts, setMaintenanceAlerts] = useState<MaintenanceAlert[]>([]);
  const [maintenanceHistory, setMaintenanceHistory] = useState<MaintenanceRecordDomain[]>([]);
  const [usageTimeline, setUsageTimeline] = useState<EquipmentUsageLogDomain[]>([]);
  const [downtimeHistory, setDowntimeHistory] = useState<DowntimeLogDomain[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [usageError, setUsageError] = useState<string | null>(null);
  const [usageSaving, setUsageSaving] = useState(false);
  const [editingUsageId, setEditingUsageId] = useState<string | null>(null);
  const [editingDraft, setEditingDraft] = useState<{ date: string; hoursUsed: string }>({ date: '', hoursUsed: '' });
  const [showAddUsage, setShowAddUsage] = useState(false);
  const [addDraft, setAddDraft] = useState<{ date: string; hoursUsed: string }>(() => ({
    date: new Date().toISOString().slice(0, 10),
    hoursUsed: '',
  }));
  const [refreshKey, setRefreshKey] = useState(0);

  const [maintenanceError, setMaintenanceError] = useState<string | null>(null);
  const [maintenanceSaving, setMaintenanceSaving] = useState(false);
  const [showAddMaintenance, setShowAddMaintenance] = useState(false);
  const [maintenanceDraft, setMaintenanceDraft] = useState<{
    date: string;
    type: string;
    status: string;
    cost: string;
    notes: string;
  }>(() => ({
    date: new Date().toISOString().slice(0, 10),
    type: 'scheduled',
    status: 'pending',
    cost: '',
    notes: '',
  }));
  const [downtimeError, setDowntimeError] = useState<string | null>(null);
  const [downtimeSaving, setDowntimeSaving] = useState(false);
  const [showAddDowntime, setShowAddDowntime] = useState(false);
  const [downtimeDraft, setDowntimeDraft] = useState<{
    startDate: string;
    endDate: string;
    reason: string;
    notes: string;
  }>(() => ({
    startDate: new Date().toISOString().slice(0, 10),
    endDate: '',
    reason: 'breakdown',
    notes: '',
  }));

  // Keep local state in sync when the selected equipment changes.
  useEffect(() => {
    setCurrent(equipment);
    setIsEditing(false);
  }, [equipment]);

  const dateRange = useMemo(() => {
    const to = new Date();
    const from = new Date();
    from.setDate(to.getDate() - 30);
    return {
      from: from.toISOString().slice(0, 10),
      to: to.toISOString().slice(0, 10),
    };
  }, []);

  useEffect(() => {
    let isActive = true;

    async function loadDetail() {
      setIsLoading(true);
      setError(null);
      try {
        const query = `from=${dateRange.from}&to=${dateRange.to}`;
        const [utilizationJson, alertsJson, maintenanceJson, usageJson, downtimeJson] =
          await Promise.all([
            fetchJson<DetailEnvelope<UtilizationMetric>>(
              `/api/v1/equipment/${current.id}/utilization?${query}`,
              token,
            ),
            fetchJson<DetailEnvelope<MaintenanceAlert[]>>(
              '/api/v1/equipment/maintenance/upcoming?days=30',
              token,
            ),
            fetchJson<PaginatedEnvelope<MaintenanceRecordDomain>>(
              `/api/v1/equipment/${current.id}/maintenance-history?perPage=5`,
              token,
            ),
            fetchJson<PaginatedEnvelope<EquipmentUsageLogDomain>>(
              `/api/v1/equipment/${current.id}/usage-timeline?${query}&perPage=8`,
              token,
            ),
            fetchJson<PaginatedEnvelope<DowntimeLogDomain>>(
              `/api/v1/equipment/${current.id}/downtime-history?perPage=5`,
              token,
            ),
          ]);

        if (!isActive) return;
        setUtilization(unwrapItem(utilizationJson));
        setMaintenanceAlerts(unwrapItem(alertsJson).filter((alert) => alert.equipmentId === current.id));
        setMaintenanceHistory(unwrapList(maintenanceJson));
        setUsageTimeline(unwrapList(usageJson));
        setDowntimeHistory(unwrapList(downtimeJson));
      } catch (err) {
        if (isActive) setError((err as Error).message);
      } finally {
        if (isActive) setIsLoading(false);
      }
    }

    void loadDetail();

    return () => {
      isActive = false;
    };
  }, [dateRange.from, dateRange.to, current.id, token, refreshKey]);

  // Hours Used / Utilization are derived from usage logs, so saving one
  // must re-run the detail queries to refresh every derived figure.
  const refreshDerivedData = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  async function saveUsageEntry(url: string, method: 'POST' | 'PATCH', body: Record<string, unknown>) {
    setUsageSaving(true);
    setUsageError(null);
    try {
      const res = await authFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => null);
        throw new Error(errBody?.message ?? 'Failed to save usage entry');
      }
      setShowAddUsage(false);
      setEditingUsageId(null);
      setAddDraft({ date: new Date().toISOString().slice(0, 10), hoursUsed: '' });
      refreshDerivedData();
    } catch (err) {
      setUsageError((err as Error).message);
    } finally {
      setUsageSaving(false);
    }
  }

  function startEditingUsage(log: EquipmentUsageLogDomain) {
    setShowAddUsage(false);
    setUsageError(null);
    setEditingUsageId(log.id);
    setEditingDraft({
      date: new Date(log.date).toISOString().slice(0, 10),
      hoursUsed: String(log.hoursUsed),
    });
  }

  function submitEditedUsage(id: string) {
    const hours = parseFloat(editingDraft.hoursUsed);
    if (!Number.isFinite(hours) || hours < 0) {
      setUsageError('Hours used must be zero or a positive number');
      return;
    }
    void saveUsageEntry(`/api/v1/equipment/${current.id}/usage/${id}`, 'PATCH', {
      date: editingDraft.date,
      hoursUsed: hours,
    });
  }

  function submitNewUsage() {
    const hours = parseFloat(addDraft.hoursUsed);
    if (!Number.isFinite(hours) || hours <= 0) {
      setUsageError('Hours used must be a positive number');
      return;
    }
    void saveUsageEntry(`/api/v1/equipment/${current.id}/usage`, 'POST', {
      date: addDraft.date,
      hoursUsed: hours,
    });
  }

  async function submitNewMaintenance() {
    const cost = maintenanceDraft.cost.trim() === '' ? undefined : Math.round(parseFloat(maintenanceDraft.cost) * 100);
    if (maintenanceDraft.cost.trim() !== '' && (!Number.isFinite(cost) || (cost as number) < 0)) {
      setMaintenanceError('Cost must be zero or a positive number');
      return;
    }
    setMaintenanceSaving(true);
    setMaintenanceError(null);
    try {
      const res = await authFetch(`/api/v1/equipment/${current.id}/maintenance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: maintenanceDraft.type,
          status: maintenanceDraft.status,
          date: maintenanceDraft.date,
          ...(typeof cost === 'number' ? { costCents: cost } : {}),
          ...(maintenanceDraft.notes.trim() ? { notes: maintenanceDraft.notes.trim() } : {}),
        }),
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => null);
        throw new Error(errBody?.message ?? 'Failed to save maintenance record');
      }
      setShowAddMaintenance(false);
      setMaintenanceDraft({
        date: new Date().toISOString().slice(0, 10),
        type: 'scheduled',
        status: 'pending',
        cost: '',
        notes: '',
      });
      refreshDerivedData();
    } catch (err) {
      setMaintenanceError((err as Error).message);
    } finally {
      setMaintenanceSaving(false);
    }
  }

  async function submitNewDowntime() {
    if (!downtimeDraft.startDate) {
      setDowntimeError('A start date is required');
      return;
    }
    setDowntimeSaving(true);
    setDowntimeError(null);
    try {
      const res = await authFetch(`/api/v1/equipment/${current.id}/downtime`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startDate: downtimeDraft.startDate,
          ...(downtimeDraft.endDate ? { endDate: downtimeDraft.endDate } : {}),
          reason: downtimeDraft.reason,
          ...(downtimeDraft.notes.trim() ? { notes: downtimeDraft.notes.trim() } : {}),
        }),
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => null);
        throw new Error(errBody?.message ?? 'Failed to save downtime record');
      }
      setShowAddDowntime(false);
      setDowntimeDraft({
        startDate: new Date().toISOString().slice(0, 10),
        endDate: '',
        reason: 'breakdown',
        notes: '',
      });
      refreshDerivedData();
    } catch (err) {
      setDowntimeError((err as Error).message);
    } finally {
      setDowntimeSaving(false);
    }
  }

  const utilizationPercent = Math.min(100, Math.max(0, utilization?.utilizationPercentage ?? 0));

  return (
    <section className="bg-surface p-5 rounded-xl shadow-sm border border-border">
      <div className="flex flex-col gap-3 border-b border-border pb-4 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-foreground-muted">{current.category}</p>
          <h2 className="text-xl font-bold text-foreground">{current.name}</h2>
          <p className="text-sm text-foreground-muted">Serial {current.serialNumber}</p>
        </div>
        <div className="flex items-start gap-3 text-sm text-foreground-muted">
          <div>
            <div className="font-medium text-foreground">{formatCurrency(current.purchaseCostCents)}</div>
            <div>Acquired {formatDate(current.purchaseDate)}</div>
          </div>
          {!isEditing && (
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-surface-muted"
            >
              Edit
            </button>
          )}
        </div>
      </div>

      {error ? <div className="mt-4 rounded-lg border border-danger/20 bg-danger/5 p-3 text-sm text-danger">{error}</div> : null}

      {isEditing && (
        <EquipmentForm
          equipment={current}
          inline
          onClose={() => setIsEditing(false)}
          onSaved={(saved) => {
            if (saved) setCurrent(saved);
            setIsEditing(false);
            onUpdated?.(saved ?? current);
          }}
        />
      )}

      {isLoading ? (
        <div className="mt-5 space-y-5">
          <div className="grid gap-4 md:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-lg border border-border p-4">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="mt-2 h-6 w-10" />
              </div>
            ))}
          </div>
          <Skeleton className="h-3 w-full" />
          <div className="grid gap-5 lg:grid-cols-2">
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
          <Skeleton className="h-32 w-full" />
        </div>
      ) : null}

      {!isEditing && (
        <>
          <div className="mt-5 grid gap-4 md:grid-cols-4">
            <div className="rounded-lg border border-border p-4">
              <div className="text-xs font-medium uppercase text-foreground-muted">Utilization</div>
              <div className="mt-2 text-2xl font-bold text-foreground">{utilizationPercent.toFixed(1)}%</div>
            </div>
            <div className="rounded-lg border border-border p-4">
              <div className="text-xs font-medium uppercase text-foreground-muted">Hours Used</div>
              <div className="mt-2 text-2xl font-bold text-foreground">{utilization?.utilizationHours ?? 0}</div>
            </div>
            <div className="rounded-lg border border-border p-4">
              <div className="text-xs font-medium uppercase text-foreground-muted">Available Hours</div>
              <div className="mt-2 text-2xl font-bold text-foreground">{utilization?.totalHours ?? 0}</div>
            </div>
            <div className="rounded-lg border border-border p-4">
              <div className="text-xs font-medium uppercase text-foreground-muted">Downtime</div>
              <div className="mt-2 text-2xl font-bold text-foreground">{utilization?.downTimeHours ?? 0}</div>
            </div>
          </div>

          <div className="mt-5">
            <div className="h-3 overflow-hidden rounded bg-surface-muted">
              <div
                className="h-full rounded bg-success"
                style={{ width: `${utilizationPercent}%` }}
                aria-label={`Utilization ${utilizationPercent.toFixed(1)} percent`}
              />
            </div>
            <div className="mt-2 flex justify-between text-xs text-foreground-muted">
              <span>{dateRange.from}</span>
              <span>{dateRange.to}</span>
            </div>
          </div>

          <div className="mt-6 grid gap-5 lg:grid-cols-2">
            <section>
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-bold text-foreground">Maintenance Timeline</h3>
                {!showAddMaintenance && (
                  <button
                    type="button"
                    onClick={() => {
                      setMaintenanceError(null);
                      setShowAddMaintenance(true);
                    }}
                    className="rounded-lg border border-border px-3 py-1 text-xs font-medium text-foreground transition-colors hover:bg-surface-muted"
                  >
                    + Log maintenance
                  </button>
                )}
              </div>
              {maintenanceError && (
                <div className="mt-3 rounded-lg border border-danger/20 text-danger p-2.5 text-sm">{maintenanceError}</div>
              )}
              {showAddMaintenance && (
                <div className="mt-3 space-y-2 rounded-lg border border-border bg-surface-muted/40 p-3">
                  <div className="grid grid-cols-2 gap-2">
                    <label className="block text-xs font-medium text-foreground-muted">
                      Date
                      <div className="mt-1">
                        <DatePicker
                          value={maintenanceDraft.date}
                          onChange={(v) => setMaintenanceDraft((d) => ({ ...d, date: v }))}
                          placeholder="Select date"
                        />
                      </div>
                    </label>
                    <label className="block text-xs font-medium text-foreground-muted">
                      Type
                      <select
                        value={maintenanceDraft.type}
                        onChange={(e) => setMaintenanceDraft((d) => ({ ...d, type: e.target.value }))}
                        className="mt-1 h-9 w-full rounded-lg border border-border bg-surface px-2 text-sm font-normal text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                      >
                        <option value="scheduled">Scheduled</option>
                        <option value="repair">Repair</option>
                      </select>
                    </label>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <label className="block text-xs font-medium text-foreground-muted">
                      Status
                      <select
                        value={maintenanceDraft.status}
                        onChange={(e) => setMaintenanceDraft((d) => ({ ...d, status: e.target.value }))}
                        className="mt-1 h-9 w-full rounded-lg border border-border bg-surface px-2 text-sm font-normal text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                      >
                        <option value="pending">Pending</option>
                        <option value="completed">Completed</option>
                      </select>
                    </label>
                    <label className="block text-xs font-medium text-foreground-muted">
                      Cost (USD)
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        value={maintenanceDraft.cost}
                        onChange={(e) => setMaintenanceDraft((d) => ({ ...d, cost: e.target.value }))}
                        placeholder="e.g. 250.00"
                        className="mt-1 h-9 w-full rounded-lg border border-border bg-surface px-2 text-sm font-normal text-foreground placeholder:text-foreground-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </label>
                  </div>
                  <label className="block text-xs font-medium text-foreground-muted">
                    Notes
                    <input
                      type="text"
                      value={maintenanceDraft.notes}
                      onChange={(e) => setMaintenanceDraft((d) => ({ ...d, notes: e.target.value }))}
                      placeholder="e.g. Oil change, filter replacement"
                      className="mt-1 h-9 w-full rounded-lg border border-border bg-surface px-2 text-sm font-normal text-foreground placeholder:text-foreground-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </label>
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => { setShowAddMaintenance(false); setMaintenanceError(null); }}
                      className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-surface-muted"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={maintenanceSaving}
                      onClick={() => void submitNewMaintenance()}
                      className="rounded-lg bg-action px-3 py-1.5 text-xs font-medium text-action-foreground transition-colors hover:bg-action/90 disabled:opacity-50"
                    >
                      {maintenanceSaving ? 'Saving...' : 'Save entry'}
                    </button>
                  </div>
                </div>
              )}
              <div className="mt-3 divide-y divide-border rounded-lg border border-border">
                {[...maintenanceAlerts, ...maintenanceHistory].length === 0 ? (
                  <div className="p-3 text-sm text-foreground-muted">No maintenance records for this equipment.</div>
                ) : (
                  <>
                    {maintenanceAlerts.map((alert) => (
                      <div key={`alert-${alert.id}`} className="p-3 text-sm">
                        <div className="flex items-center justify-between gap-3">
                          <span className="font-medium text-foreground">{alert.type}</span>
                          <span className={alert.isOverdue ? 'text-danger' : 'text-warning'}>
                            {alert.isOverdue ? 'Overdue' : `${alert.daysUntilDue} days`}
                          </span>
                        </div>
                        <div className="text-foreground-muted">Due {formatDate(alert.nextDueAt)}</div>
                      </div>
                    ))}
                    {maintenanceHistory.map((record) => (
                      <div key={`history-${record.id}`} className="p-3 text-sm">
                        <div className="flex items-center justify-between gap-3">
                          <span className="font-medium text-foreground">{record.type}</span>
                          <span className="text-foreground-muted">{record.status}</span>
                        </div>
                        <div className="text-foreground-muted">{formatDate(record.date ?? record.nextDueAt)}</div>
                      </div>
                    ))}
                  </>
                )}
              </div>
            </section>

            <section>
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-bold text-foreground">Usage Timeline</h3>
                {!showAddUsage && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingUsageId(null);
                      setUsageError(null);
                      setShowAddUsage(true);
                    }}
                    className="rounded-lg border border-border px-3 py-1 text-xs font-medium text-foreground transition-colors hover:bg-surface-muted"
                  >
                    + Log usage
                  </button>
                )}
              </div>
              {usageError && (
                <div className="mt-3 rounded-lg border border-danger/20 bg-danger/5 p-2.5 text-sm text-danger">{usageError}</div>
              )}
              {showAddUsage && (
                <div className="mt-3 space-y-2 rounded-lg border border-border bg-surface-muted/40 p-3">
                  <div className="grid grid-cols-2 gap-2">
                      <label className="block text-xs font-medium text-foreground-muted">
                        Date
                        <div className="mt-1">
                          <DatePicker
                            value={addDraft.date}
                            onChange={(v) => setAddDraft((d) => ({ ...d, date: v }))}
                            placeholder="Select date"
                          />
                        </div>
                      </label>
                    <label className="block text-xs font-medium text-foreground-muted">
                      Hours used
                      <input
                        type="number"
                        min={0}
                        step="0.5"
                        value={addDraft.hoursUsed}
                        onChange={(e) => setAddDraft((d) => ({ ...d, hoursUsed: e.target.value }))}
                        placeholder="e.g. 7.5"
                        className="mt-1 h-9 w-full rounded-lg border border-border bg-surface px-2 text-sm font-normal text-foreground placeholder:text-foreground-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </label>
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => { setShowAddUsage(false); setUsageError(null); }}
                      className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-surface-muted"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={usageSaving}
                      onClick={() => submitNewUsage()}
                      className="rounded-lg bg-action px-3 py-1.5 text-xs font-medium text-action-foreground transition-colors hover:bg-action/90 disabled:opacity-50"
                    >
                      {usageSaving ? 'Saving...' : 'Save entry'}
                    </button>
                  </div>
                </div>
              )}
              <div className="mt-3 divide-y divide-border rounded-lg border border-border">
                {usageTimeline.length === 0 && !showAddUsage ? (
                  <div className="p-3 text-sm text-foreground-muted">No usage logged in this range.</div>
                ) : (
                  usageTimeline.map((log) =>
                    editingUsageId === log.id ? (
                      <div key={log.id} className="space-y-2 p-3">
                        <div className="grid grid-cols-2 gap-2">
                          <label className="block text-xs font-medium text-foreground-muted">
                            Date
                            <div className="mt-1">
                              <DatePicker
                                value={editingDraft.date}
                                onChange={(v) => setEditingDraft((d) => ({ ...d, date: v }))}
                                placeholder="Select date"
                              />
                            </div>
                          </label>
                          <label className="block text-xs font-medium text-foreground-muted">
                            Hours used
                            <input
                              type="number"
                              min={0}
                              step="0.5"
                              value={editingDraft.hoursUsed}
                              onChange={(e) => setEditingDraft((d) => ({ ...d, hoursUsed: e.target.value }))}
                              className="mt-1 h-9 w-full rounded-lg border border-border bg-surface px-2 text-sm font-normal text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                            />
                          </label>
                        </div>
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => { setEditingUsageId(null); setUsageError(null); }}
                            className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-surface-muted"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            disabled={usageSaving}
                            onClick={() => submitEditedUsage(log.id)}
                            className="rounded-lg bg-action px-3 py-1.5 text-xs font-medium text-action-foreground transition-colors hover:bg-action/90 disabled:opacity-50"
                          >
                            {usageSaving ? 'Saving...' : 'Save'}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div key={log.id} className="flex items-center justify-between gap-3 p-3 text-sm">
                        <div>
                          <div className="font-medium text-foreground">{formatDate(log.date)}</div>
                          <div className="text-foreground-muted">{log.notes ?? 'Usage log'}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="font-semibold text-foreground">{log.hoursUsed}h</div>
                          <button
                            type="button"
                            onClick={() => startEditingUsage(log)}
                            className="rounded-lg border border-border px-2 py-1 text-xs font-medium text-foreground-muted transition-colors hover:bg-surface-muted hover:text-foreground"
                          >
                            Edit
                          </button>
                        </div>
                      </div>
                    ),
                  )
                )}
              </div>
            </section>
          </div>

          <section className="mt-5">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-bold text-foreground">Downtime</h3>
              {!showAddDowntime && (
                <button
                  type="button"
                  onClick={() => {
                    setDowntimeError(null);
                    setShowAddDowntime(true);
                  }}
                  className="rounded-lg border border-border px-3 py-1 text-xs font-medium text-foreground transition-colors hover:bg-surface-muted"
                >
                  + Log downtime
                </button>
              )}
            </div>
            {downtimeError && (
              <div className="mt-3 rounded-lg border border-danger/20 bg-danger/5 p-2.5 text-sm text-danger">{downtimeError}</div>
            )}
            {showAddDowntime && (
              <div className="mt-3 space-y-2 rounded-lg border border-border bg-surface-muted/40 p-3">
                <div className="grid grid-cols-2 gap-2">
                  <label className="block text-xs font-medium text-foreground-muted">
                    Start date
                    <div className="mt-1">
                      <DatePicker
                        value={downtimeDraft.startDate}
                        onChange={(v) => setDowntimeDraft((d) => ({ ...d, startDate: v }))}
                        placeholder="Select start date"
                      />
                    </div>
                  </label>
                  <label className="block text-xs font-medium text-foreground-muted">
                    End date
                    <div className="mt-1">
                      <DatePicker
                        value={downtimeDraft.endDate}
                        onChange={(v) => setDowntimeDraft((d) => ({ ...d, endDate: v }))}
                        placeholder="Select end date"
                      />
                    </div>
                  </label>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <label className="block text-xs font-medium text-foreground-muted">
                    Reason
                    <select
                      value={downtimeDraft.reason}
                      onChange={(e) => setDowntimeDraft((d) => ({ ...d, reason: e.target.value }))}
                      className="mt-1 h-9 w-full rounded-lg border border-border bg-surface px-2 text-sm font-normal text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      <option value="breakdown">Breakdown</option>
                      <option value="weather">Weather</option>
                      <option value="other">Other</option>
                    </select>
                  </label>
                  <label className="block text-xs font-medium text-foreground-muted">
                    Notes
                    <input
                      type="text"
                      value={downtimeDraft.notes}
                      onChange={(e) => setDowntimeDraft((d) => ({ ...d, notes: e.target.value }))}
                      placeholder="e.g. Motor failure"
                      className="mt-1 h-9 w-full rounded-lg border border-border bg-surface px-2 text-sm font-normal text-foreground placeholder:text-foreground-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </label>
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => { setShowAddDowntime(false); setDowntimeError(null); }}
                    className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-surface-muted"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={downtimeSaving}
                    onClick={() => void submitNewDowntime()}
                    className="rounded-lg bg-action px-3 py-1.5 text-xs font-medium text-action-foreground transition-colors hover:bg-action/90 disabled:opacity-50"
                  >
                    {downtimeSaving ? 'Saving...' : 'Save entry'}
                  </button>
                </div>
              </div>
            )}
            <div className="mt-3 divide-y divide-border rounded-lg border border-border">
              {downtimeHistory.length === 0 ? (
                <div className="p-3 text-sm text-foreground-muted">No downtime recorded.</div>
              ) : (
                downtimeHistory.map((log) => (
                  <div key={log.id} className="flex flex-col gap-1 p-3 text-sm md:flex-row md:items-center md:justify-between">
                    <div className="font-medium text-foreground">{log.reason}</div>
                    <div className="text-foreground-muted">
                      {formatDate(log.startDate)} to {formatDate(log.endDate)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </>
      )}
    </section>
  );
}
