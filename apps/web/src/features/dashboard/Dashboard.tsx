import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { ApiResponse, DashboardOverview } from '@constructtrack/types';
import { authFetch } from '../../auth-fetch';
import {
  FolderKanban,
  CheckSquare,
  Wrench,
  Package,
  AlertTriangle,
  Clock,
  ArrowRight,
  Bot,
  FileText,
} from '../../shared/components/icons';

function useDashboard(_token: string) {
  const [data, setData] = useState<DashboardOverview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await authFetch('/api/v1/dashboard/overview');
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.message ?? `Failed to load dashboard (${res.status})`);
      }
      const json = (await res.json()) as ApiResponse<DashboardOverview>;
      setData(json.data);
    } catch (err: unknown) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  return { data, error, isLoading, refetch: fetchData };
}

function KpiCard({
  icon: Icon,
  label,
  value,
  subtext,
  color,
  href,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  subtext?: string;
  color: string;
  href?: string;
}) {
  const inner = (
    <div className="group rounded-xl border border-border bg-surface p-5 shadow-sm transition-all hover:shadow-md">
      <div className="flex items-start justify-between">
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${color}`}>
          <Icon className="h-5 w-5 text-white" />
        </div>
        {href && (
          <ArrowRight className="h-4 w-4 text-foreground-muted opacity-0 transition-opacity group-hover:opacity-100" />
        )}
      </div>
      <div className="mt-4">
        <p className="text-2xl font-bold text-foreground">{value}</p>
        <p className="mt-0.5 text-sm text-foreground-muted">{label}</p>
      </div>
      {subtext && (
        <p className="mt-1 text-xs text-foreground-muted">{subtext}</p>
      )}
    </div>
  );

  return href ? <Link to={href} className="block">{inner}</Link> : inner;
}

function ProgressBar({ value, max, color = 'bg-primary' }: { value: number; max: number; color?: string }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-surface-muted">
      <div
        className={`h-full rounded-full transition-all duration-500 ${color}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-sm text-foreground-muted">{label}</span>
      <span className={`text-sm font-semibold ${color ?? 'text-foreground'}`}>{value}</span>
    </div>
  );
}

function SectionCard({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {action}
      </div>
      {children}
    </div>
  );
}

export function Dashboard({ token }: { token: string }): React.JSX.Element {
  const { data, error, isLoading, refetch } = useDashboard(token);

  if (error) {
    return (
      <div className="rounded-xl border border-border bg-surface p-6 shadow-sm">
        <p className="mb-3 text-sm text-danger">{error}</p>
        <button onClick={refetch} className="text-sm font-medium text-primary hover:underline">
          Retry
        </button>
      </div>
    );
  }

  if (isLoading || !data) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-36 animate-pulse rounded-xl border border-border bg-surface" />
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-48 animate-pulse rounded-xl border border-border bg-surface" />
          ))}
        </div>
      </div>
    );
  }

  const p = data.projects;
  const t = data.tasks;
  const e = data.equipment;
  const inv = data.inventory;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="mt-1 text-sm text-foreground-muted">Overview of your construction projects</p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          icon={FolderKanban}
          label="Active Projects"
          value={p.active}
          subtext={`${p.onHold} on hold · ${p.completingSoon} completing soon`}
          color="bg-primary"
          href="/projects"
        />
        <KpiCard
          icon={AlertTriangle}
          label="Tasks at Risk"
          value={t.atRisk}
          subtext={`${t.mineToday} assigned to you today`}
          color={t.atRisk > 0 ? 'bg-danger' : 'bg-success'}
          href="/tasks"
        />
        <KpiCard
          icon={Wrench}
          label="Equipment Utilization"
          value={`${e.utilizationRate}%`}
          subtext={`${e.assigned}/${e.total} assigned`}
          color="bg-info"
          href="/equipment"
        />
        <KpiCard
          icon={Package}
          label="Low Stock Items"
          value={inv.lowStockItems}
          subtext={`${inv.totalMaterials} materials · ${inv.totalStockQuantity.toLocaleString()} units`}
          color={inv.lowStockItems > 0 ? 'bg-warning' : 'bg-success'}
          href="/inventory"
        />
      </div>

      {/* Charts Row */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Equipment Fleet Status */}
        <SectionCard title="Equipment Fleet">
          <div className="space-y-1">
            <Stat label="Total fleet" value={e.total} />
            <Stat label="Available" value={e.available} color="text-success" />
            <Stat label="Assigned" value={e.assigned} color="text-primary" />
            <Stat label="In maintenance" value={e.inMaintenance} color="text-warning" />
          </div>
          <div className="mt-4">
            <div className="mb-1 flex items-center justify-between text-xs text-foreground-muted">
              <span>Utilization</span>
              <span className="font-medium text-foreground">{e.utilizationRate}%</span>
            </div>
            <ProgressBar value={e.utilizationRate} max={100} color="bg-primary" />
          </div>
          {e.upcomingMaintenance > 0 && (
            <div className="mt-3 flex items-center gap-2 rounded-lg bg-warning/10 px-3 py-2 text-xs text-warning">
              <Clock className="h-3.5 w-3.5" />
              {e.upcomingMaintenance} maintenance{e.upcomingMaintenance !== 1 ? 's' : ''} due in 30 days
            </div>
          )}
        </SectionCard>

        {/* Project Status */}
        <SectionCard title="Project Status">
          <div className="space-y-3">
            <div>
              <div className="mb-1 flex items-center justify-between text-sm">
                <span className="text-foreground-muted">Active</span>
                <span className="font-semibold text-foreground">{p.active}</span>
              </div>
              <ProgressBar value={p.active} max={Math.max(p.active + p.onHold + p.completingSoon, 1)} color="bg-primary" />
            </div>
            <div>
              <div className="mb-1 flex items-center justify-between text-sm">
                <span className="text-foreground-muted">On Hold</span>
                <span className="font-semibold text-foreground">{p.onHold}</span>
              </div>
              <ProgressBar value={p.onHold} max={Math.max(p.active + p.onHold + p.completingSoon, 1)} color="bg-warning" />
            </div>
            <div>
              <div className="mb-1 flex items-center justify-between text-sm">
                <span className="text-foreground-muted">Completing Soon</span>
                <span className="font-semibold text-foreground">{p.completingSoon}</span>
              </div>
              <ProgressBar value={p.completingSoon} max={Math.max(p.active + p.onHold + p.completingSoon, 1)} color="bg-success" />
            </div>
          </div>
          <div className="mt-4 text-center">
            <span className="text-3xl font-bold text-foreground">{p.active + p.onHold + p.completingSoon}</span>
            <p className="text-xs text-foreground-muted">Total projects</p>
          </div>
        </SectionCard>

        {/* Task Overview */}
        <SectionCard title="Task Overview">
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <div className="mb-2 text-center">
                  <span className="text-3xl font-bold text-foreground">{t.mineToday}</span>
                  <p className="text-xs text-foreground-muted">My tasks today</p>
                </div>
              </div>
              <div className="h-16 w-px bg-border" />
              <div className="flex-1">
                <div className="mb-2 text-center">
                  <span className={`text-3xl font-bold ${t.atRisk > 0 ? 'text-danger' : 'text-foreground'}`}>{t.atRisk}</span>
                  <p className="text-xs text-foreground-muted">At risk</p>
                </div>
              </div>
            </div>
            {t.atRisk > 0 && (
              <div className="flex items-center gap-2 rounded-lg bg-danger/10 px-3 py-2 text-xs text-danger">
                <AlertTriangle className="h-3.5 w-3.5" />
                {t.atRisk} task{t.atRisk !== 1 ? 's' : ''} need attention
              </div>
            )}
          </div>
        </SectionCard>
      </div>

      {/* Bottom Row: Inventory Health + Quick Actions */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Inventory Health */}
        <SectionCard title="Inventory Health" action={<Link to="/inventory" className="text-xs font-medium text-primary hover:underline">View all</Link>}>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-foreground">{inv.totalMaterials}</p>
              <p className="text-xs text-foreground-muted">Materials</p>
            </div>
            <div className="text-center">
              <p className={`text-2xl font-bold ${inv.lowStockItems > 0 ? 'text-danger' : 'text-foreground'}`}>{inv.lowStockItems}</p>
              <p className="text-xs text-foreground-muted">Low Stock</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-foreground">{inv.totalStockQuantity.toLocaleString()}</p>
              <p className="text-xs text-foreground-muted">Total Units</p>
            </div>
          </div>
          {inv.lowStockItems > 0 && (
            <div className="mt-4 flex items-center gap-2 rounded-lg bg-danger/10 px-3 py-2 text-xs text-danger">
              <Package className="h-3.5 w-3.5" />
              {inv.lowStockItems} item{inv.lowStockItems !== 1 ? 's' : ''} below reorder point
            </div>
          )}
          <div className="mt-4">
            <div className="mb-1 flex items-center justify-between text-xs text-foreground-muted">
              <span>Stock health</span>
              <span className="font-medium text-foreground">
                {inv.totalMaterials > 0 ? Math.round(((inv.totalMaterials - inv.lowStockItems) / inv.totalMaterials) * 100) : 100}%
              </span>
            </div>
            <ProgressBar
              value={inv.totalMaterials - inv.lowStockItems}
              max={Math.max(inv.totalMaterials, 1)}
              color={inv.lowStockItems > 0 ? 'bg-warning' : 'bg-success'}
            />
          </div>
        </SectionCard>

        {/* Quick Actions */}
        <SectionCard title="Quick Actions">
          <div className="grid grid-cols-2 gap-3">
            <Link
              to="/projects"
              className="flex items-center gap-3 rounded-lg border border-border p-3 text-sm font-medium text-foreground transition-colors hover:bg-surface-muted"
            >
              <FolderKanban className="h-5 w-5 text-primary" />
              New Project
            </Link>
            <Link
              to="/tasks"
              className="flex items-center gap-3 rounded-lg border border-border p-3 text-sm font-medium text-foreground transition-colors hover:bg-surface-muted"
            >
              <CheckSquare className="h-5 w-5 text-success" />
              View Tasks
            </Link>
            <Link
              to="/equipment"
              className="flex items-center gap-3 rounded-lg border border-border p-3 text-sm font-medium text-foreground transition-colors hover:bg-surface-muted"
            >
              <Wrench className="h-5 w-5 text-info" />
              Equipment
            </Link>
            <Link
              to="/inventory"
              className="flex items-center gap-3 rounded-lg border border-border p-3 text-sm font-medium text-foreground transition-colors hover:bg-surface-muted"
            >
              <Package className="h-5 w-5 text-warning" />
              Inventory
            </Link>
            <Link
              to="/reports"
              className="flex items-center gap-3 rounded-lg border border-border p-3 text-sm font-medium text-foreground transition-colors hover:bg-surface-muted"
            >
              <FileText className="h-5 w-5 text-info" />
              Reports
            </Link>
            <Link
              to="/ai"
              className="flex items-center gap-3 rounded-lg border border-border p-3 text-sm font-medium text-foreground transition-colors hover:bg-surface-muted"
            >
              <Bot className="h-5 w-5 text-primary" />
              AI Assistant
            </Link>
          </div>
        </SectionCard>
      </div>

      {/* Upcoming Maintenance Banner */}
      {e.upcomingMaintenance > 0 && (
        <div className="flex items-center gap-4 rounded-xl border border-warning/30 bg-warning/5 p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-warning/20">
            <Clock className="h-5 w-5 text-warning" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">Upcoming Maintenance</p>
            <p className="text-xs text-foreground-muted">
              {e.upcomingMaintenance} piece{e.upcomingMaintenance !== 1 ? 's' : ''} of equipment have maintenance scheduled within 30 days.
            </p>
          </div>
          <Link
            to="/equipment"
            className="shrink-0 rounded-lg bg-warning px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-warning/90"
          >
            View
          </Link>
        </div>
      )}
    </div>
  );
}
