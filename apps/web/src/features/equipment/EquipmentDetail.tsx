import { useEffect, useMemo, useState } from 'react';
import type {
  DowntimeLogDomain,
  EquipmentDomain,
  EquipmentUsageLogDomain,
  MaintenanceRecordDomain,
} from '@constructtrack/types';
import { authFetch } from '../../auth-fetch';
import { Skeleton } from '../../shared/components/Skeleton';
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
  }, [dateRange.from, dateRange.to, current.id, token]);

  const utilizationPercent = Math.min(100, Math.max(0, utilization?.utilizationPercentage ?? 0));

  return (
    <section className="bg-white p-5 rounded shadow border border-gray-200">
      <div className="flex flex-col gap-3 border-b border-gray-200 pb-4 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{current.category}</p>
          <h2 className="text-xl font-bold text-gray-900">{current.name}</h2>
          <p className="text-sm text-gray-500">Serial {current.serialNumber}</p>
        </div>
        <div className="flex items-start gap-3 text-sm text-gray-600">
          <div>
            <div className="font-medium text-gray-900">{formatCurrency(current.purchaseCostCents)}</div>
            <div>Acquired {formatDate(current.purchaseDate)}</div>
          </div>
          {!isEditing && (
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100"
            >
              Edit
            </button>
          )}
        </div>
      </div>

      {error ? <div className="mt-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}

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
              <div key={i} className="rounded border border-gray-200 p-4">
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
            <div className="rounded border border-gray-200 p-4">
              <div className="text-xs font-medium uppercase text-gray-500">Utilization</div>
              <div className="mt-2 text-2xl font-bold text-gray-900">{utilizationPercent.toFixed(1)}%</div>
            </div>
            <div className="rounded border border-gray-200 p-4">
              <div className="text-xs font-medium uppercase text-gray-500">Hours Used</div>
              <div className="mt-2 text-2xl font-bold text-gray-900">{utilization?.utilizationHours ?? 0}</div>
            </div>
            <div className="rounded border border-gray-200 p-4">
              <div className="text-xs font-medium uppercase text-gray-500">Available Hours</div>
              <div className="mt-2 text-2xl font-bold text-gray-900">{utilization?.totalHours ?? 0}</div>
            </div>
            <div className="rounded border border-gray-200 p-4">
              <div className="text-xs font-medium uppercase text-gray-500">Downtime</div>
              <div className="mt-2 text-2xl font-bold text-gray-900">{utilization?.downTimeHours ?? 0}</div>
            </div>
          </div>

          <div className="mt-5">
            <div className="h-3 overflow-hidden rounded bg-gray-100">
              <div
                className="h-full rounded bg-emerald-600"
                style={{ width: `${utilizationPercent}%` }}
                aria-label={`Utilization ${utilizationPercent.toFixed(1)} percent`}
              />
            </div>
            <div className="mt-2 flex justify-between text-xs text-gray-500">
              <span>{dateRange.from}</span>
              <span>{dateRange.to}</span>
            </div>
          </div>

          <div className="mt-6 grid gap-5 lg:grid-cols-2">
            <section>
              <h3 className="text-sm font-bold text-gray-900">Maintenance Timeline</h3>
              <div className="mt-3 divide-y divide-gray-200 rounded border border-gray-200">
                {[...maintenanceAlerts, ...maintenanceHistory].length === 0 ? (
                  <div className="p-3 text-sm text-gray-500">No maintenance records for this equipment.</div>
                ) : (
                  <>
                    {maintenanceAlerts.map((alert) => (
                      <div key={`alert-${alert.id}`} className="p-3 text-sm">
                        <div className="flex items-center justify-between gap-3">
                          <span className="font-medium text-gray-900">{alert.type}</span>
                          <span className={alert.isOverdue ? 'text-red-700' : 'text-amber-700'}>
                            {alert.isOverdue ? 'Overdue' : `${alert.daysUntilDue} days`}
                          </span>
                        </div>
                        <div className="text-gray-500">Due {formatDate(alert.nextDueAt)}</div>
                      </div>
                    ))}
                    {maintenanceHistory.map((record) => (
                      <div key={`history-${record.id}`} className="p-3 text-sm">
                        <div className="flex items-center justify-between gap-3">
                          <span className="font-medium text-gray-900">{record.type}</span>
                          <span className="text-gray-500">{record.status}</span>
                        </div>
                        <div className="text-gray-500">{formatDate(record.date ?? record.nextDueAt)}</div>
                      </div>
                    ))}
                  </>
                )}
              </div>
            </section>

            <section>
              <h3 className="text-sm font-bold text-gray-900">Usage Timeline</h3>
              <div className="mt-3 divide-y divide-gray-200 rounded border border-gray-200">
                {usageTimeline.length === 0 ? (
                  <div className="p-3 text-sm text-gray-500">No usage logged in this range.</div>
                ) : (
                  usageTimeline.map((log) => (
                    <div key={log.id} className="flex items-center justify-between gap-3 p-3 text-sm">
                      <div>
                        <div className="font-medium text-gray-900">{formatDate(log.date)}</div>
                        <div className="text-gray-500">{log.notes ?? 'Usage log'}</div>
                      </div>
                      <div className="font-semibold text-gray-900">{log.hoursUsed}h</div>
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>

          <section className="mt-5">
            <h3 className="text-sm font-bold text-gray-900">Downtime</h3>
            <div className="mt-3 divide-y divide-gray-200 rounded border border-gray-200">
              {downtimeHistory.length === 0 ? (
                <div className="p-3 text-sm text-gray-500">No downtime recorded.</div>
              ) : (
                downtimeHistory.map((log) => (
                  <div key={log.id} className="flex flex-col gap-1 p-3 text-sm md:flex-row md:items-center md:justify-between">
                    <div className="font-medium text-gray-900">{log.reason}</div>
                    <div className="text-gray-500">
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
