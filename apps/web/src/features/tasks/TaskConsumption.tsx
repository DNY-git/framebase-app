import { useEffect, useState, useCallback } from 'react';
import type { TaskDomain, EquipmentUsageLogDomain, InventoryTransactionDomain, ProjectDomain } from '@constructtrack/types';
import { FilterDropdown } from '../../shared/components/FilterDropdown';
import { DatePicker } from '../../components/ui';
import { Loader2, Wrench, Package } from '../../shared/components/icons';

interface PaginatedEnvelope<T> {
  data: T[] | { data: T[] };
}

function unwrapList<T>(json: PaginatedEnvelope<T>): T[] {
  if (Array.isArray(json.data)) return json.data;
  if (json.data && typeof json.data === 'object' && Array.isArray(json.data.data)) return json.data.data;
  return [];
}

function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(date));
}

const headers = (token: string) => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${token}`,
});

export function TaskConsumption({ token }: { token: string }) {
  const [projects, setProjects] = useState<ProjectDomain[]>([]);
  const [tasks, setTasks] = useState<TaskDomain[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [selectedTaskId, setSelectedTaskId] = useState('');
  const [equipmentUsage, setEquipmentUsage] = useState<EquipmentUsageLogDomain[]>([]);
  const [materialConsumption, setMaterialConsumption] = useState<InventoryTransactionDomain[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [eqEquipmentId, setEqEquipmentId] = useState('');
  const [eqDate, setEqDate] = useState('');
  const [eqHours, setEqHours] = useState('');
  const [matMaterialId, setMatMaterialId] = useState('');
  const [matQuantity, setMatQuantity] = useState('');
  const [isSubmittingEq, setIsSubmittingEq] = useState(false);
  const [isSubmittingMat, setIsSubmittingMat] = useState(false);

  const fetchProjects = useCallback(async () => {
    try {
      const res = await fetch('/api/v1/projects?perPage=100', { headers: headers(token) });
      if (!res.ok) throw new Error('Failed to fetch projects');
      const json = await res.json() as PaginatedEnvelope<ProjectDomain>;
      setProjects(unwrapList(json));
    } catch (err) {
      setError((err as Error).message);
    }
  }, [token]);

  useEffect(() => { fetchProjects(); }, [fetchProjects]);

  useEffect(() => {
    if (!selectedProjectId) {
      setTasks([]);
      setSelectedTaskId('');
      return;
    }
    fetch(`/api/v1/projects/${selectedProjectId}/tasks?perPage=100`, { headers: headers(token) })
      .then(async (res) => {
        if (!res.ok) throw new Error('Failed to fetch tasks');
        const json = await res.json() as PaginatedEnvelope<TaskDomain>;
        const items = unwrapList(json);
        setTasks(items);
        if (items.length > 0) {
          setSelectedTaskId((prev) => prev || items[0].id);
        }
      })
      .catch((err) => setError((err as Error).message));
  }, [selectedProjectId, token]);

  useEffect(() => {
    if (!selectedProjectId || !selectedTaskId) {
      setEquipmentUsage([]);
      setMaterialConsumption([]);
      return;
    }
    async function load() {
      try {
        const base = `/api/v1/projects/${selectedProjectId}/tasks/${selectedTaskId}`;
        const [eqRes, matRes] = await Promise.all([
          fetch(`${base}/equipment-usage`, { headers: headers(token) }),
          fetch(`${base}/material-consumption`, { headers: headers(token) }),
        ]);
        if (eqRes.ok) {
          const eqJson = await eqRes.json() as PaginatedEnvelope<EquipmentUsageLogDomain>;
          setEquipmentUsage(unwrapList(eqJson));
        }
        if (matRes.ok) {
          const matJson = await matRes.json() as PaginatedEnvelope<InventoryTransactionDomain>;
          setMaterialConsumption(unwrapList(matJson));
        }
      } catch (err) {
        setError((err as Error).message);
      }
    }
    void load();
  }, [selectedProjectId, selectedTaskId, token]);

  async function handleRecordEquipmentUsage(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedProjectId || !selectedTaskId) return;
    setIsSubmittingEq(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/v1/projects/${selectedProjectId}/tasks/${selectedTaskId}/equipment-usage`,
        {
          method: 'POST',
          headers: headers(token),
          body: JSON.stringify({ equipmentId: eqEquipmentId, date: eqDate, hoursUsed: parseFloat(eqHours) }),
        },
      );
      if (!res.ok) {
        const errBody = await res.text();
        throw new Error(errBody || 'Failed to record equipment usage');
      }
      const json = await res.json() as { data: EquipmentUsageLogDomain };
      setEquipmentUsage((prev) => [json.data, ...prev]);
      setEqEquipmentId('');
      setEqDate('');
      setEqHours('');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsSubmittingEq(false);
    }
  }

  async function handleRecordMaterialConsumption(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedProjectId || !selectedTaskId) return;
    setIsSubmittingMat(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/v1/projects/${selectedProjectId}/tasks/${selectedTaskId}/material-consumption`,
        {
          method: 'POST',
          headers: headers(token),
          body: JSON.stringify({ materialId: matMaterialId, quantity: parseInt(matQuantity, 10) }),
        },
      );
      if (!res.ok) {
        const errBody = await res.text();
        throw new Error(errBody || 'Failed to record material consumption');
      }
      const json = await res.json() as { data: InventoryTransactionDomain };
      setMaterialConsumption((prev) => [json.data, ...prev]);
      setMatMaterialId('');
      setMatQuantity('');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsSubmittingMat(false);
    }
  }

  const selectedTask = tasks.find((t) => t.id === selectedTaskId);
  const totalEqHours = equipmentUsage.reduce((sum, u) => sum + u.hoursUsed, 0);
  const totalMatQty = materialConsumption.reduce((sum, m) => sum + Math.abs(m.quantity), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Task Resources</h1>
        <p className="mt-1 text-sm text-foreground-muted">Track equipment usage and material consumption per task</p>
      </div>

      <section className="rounded-xl border border-border bg-surface p-5 shadow-sm">
        <div className="flex flex-wrap items-center gap-4">
          <FilterDropdown
            value={selectedProjectId}
            onChange={(v) => { setSelectedProjectId(v); setSelectedTaskId(''); }}
            placeholder="Select project"
            className="w-full sm:w-56"
            options={[
              { value: '', label: 'Select project' },
              ...projects.map((p) => ({ value: p.id, label: `${p.name} (${p.code})` })),
            ]}
          />
          <FilterDropdown
            value={selectedTaskId}
            onChange={setSelectedTaskId}
            placeholder="Select task"
            disabled={!selectedProjectId}
            className="w-full sm:w-56"
            options={[
              { value: '', label: 'Select task' },
              ...tasks.map((t) => ({ value: t.id, label: t.title })),
            ]}
          />
        </div>
      </section>

      {error && (
        <div className="rounded-lg border border-danger/20 bg-danger/5 p-3 text-sm text-danger">{error}</div>
      )}

      {selectedTask && (
        <>
          <section className="rounded-xl border border-border bg-surface p-5 shadow-sm">
            <h3 className="text-base font-semibold text-foreground">{selectedTask.title}</h3>
            <p className="text-sm text-foreground-muted">Status: {selectedTask.status}</p>
          </section>

          <div className="grid gap-5 lg:grid-cols-2">
            <section className="rounded-xl border border-border bg-surface p-5 shadow-sm">
              <div className="mb-4 flex items-center gap-2">
                <Wrench className="h-4 w-4 text-info" />
                <h3 className="text-sm font-semibold text-foreground">Equipment Usage</h3>
              </div>
              <p className="mb-4 text-sm text-foreground-muted">{totalEqHours.toFixed(1)} total hours</p>

              <form onSubmit={(e) => { void handleRecordEquipmentUsage(e); }} className="mb-4 space-y-2 rounded-lg border border-border p-3">
                <input type="text" value={eqEquipmentId} onChange={(e) => setEqEquipmentId(e.target.value)} placeholder="Equipment ID" className="h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm text-foreground placeholder:text-foreground-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" required />
                <DatePicker value={eqDate} onChange={setEqDate} placeholder="Select date" />
                <input type="number" step="0.5" min={0} value={eqHours} onChange={(e) => setEqHours(e.target.value)} placeholder="Hours" className="h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm text-foreground placeholder:text-foreground-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" required />
                <button type="submit" disabled={isSubmittingEq} className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50">
                  {isSubmittingEq && <Loader2 className="h-4 w-4 animate-spin" />}
                  {isSubmittingEq ? 'Recording...' : 'Log Equipment Usage'}
                </button>
              </form>

              <div className="divide-y divide-border rounded-lg border border-border">
                {equipmentUsage.length === 0 ? (
                  <div className="p-3 text-center text-sm text-foreground-muted">No equipment usage logged</div>
                ) : (
                  equipmentUsage.map((log) => (
                    <div key={log.id} className="flex items-center justify-between gap-3 p-3 text-sm">
                      <div>
                        <div className="font-medium text-foreground">{log.equipmentId}</div>
                        <div className="text-foreground-muted">{formatDate(log.date)}</div>
                      </div>
                      <div className="font-bold text-foreground">{log.hoursUsed}h</div>
                    </div>
                  ))
                )}
              </div>
            </section>

            <section className="rounded-xl border border-border bg-surface p-5 shadow-sm">
              <div className="mb-4 flex items-center gap-2">
                <Package className="h-4 w-4 text-warning" />
                <h3 className="text-sm font-semibold text-foreground">Material Consumption</h3>
              </div>
              <p className="mb-4 text-sm text-foreground-muted">{totalMatQty} total units consumed</p>

              <form onSubmit={(e) => { void handleRecordMaterialConsumption(e); }} className="mb-4 space-y-2 rounded-lg border border-border p-3">
                <input type="text" value={matMaterialId} onChange={(e) => setMatMaterialId(e.target.value)} placeholder="Material ID" className="h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm text-foreground placeholder:text-foreground-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" required />
                <input type="number" min={1} value={matQuantity} onChange={(e) => setMatQuantity(e.target.value)} placeholder="Quantity" className="h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm text-foreground placeholder:text-foreground-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" required />
                <button type="submit" disabled={isSubmittingMat} className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50">
                  {isSubmittingMat && <Loader2 className="h-4 w-4 animate-spin" />}
                  {isSubmittingMat ? 'Recording...' : 'Consume Material'}
                </button>
              </form>

              <div className="divide-y divide-border rounded-lg border border-border">
                {materialConsumption.length === 0 ? (
                  <div className="p-3 text-center text-sm text-foreground-muted">No material consumption recorded</div>
                ) : (
                  materialConsumption.map((tx) => (
                    <div key={tx.id} className="flex items-center justify-between gap-3 p-3 text-sm">
                      <div>
                        <div className="font-medium text-foreground">{tx.materialId}</div>
                        <div className="text-foreground-muted">{tx.note ?? 'Consumption'}</div>
                      </div>
                      <div className="font-bold text-danger">-{Math.abs(tx.quantity)}</div>
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>
        </>
      )}

      {selectedProjectId && !selectedTask && (
        <section className="rounded-xl border border-border bg-surface p-8 text-center shadow-sm">
          <p className="text-sm text-foreground-muted">No tasks found for this project</p>
        </section>
      )}
    </div>
  );
}
