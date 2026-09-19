import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Area,
  AreaChart,
  ChartTooltip,
  Grid,
  XAxis,
} from '@bklitui/ui/charts';
import type { ApiResponse, DashboardOverview } from '@constructtrack/types';
import { authFetch } from '../../auth-fetch';
import { formatCompactCurrency } from '../../utils';
import { PageLayout } from '../../shared/components/PageLayout';
import { Skeleton } from '../../shared/components/Skeleton';
import { ActivityHeatmap } from './ActivityHeatmap';
import {
  Package,
  Clock,
  ArrowRight,
  HardHat,
  Check,
  ChevronDown,
} from '../../shared/components/icons';

/**
 * Time spans offered by the chart header — the single source of truth shared by
 * the quick-segment pills and the existing "Edit range" popover, so both drive
 * the same `rangeDays` state (and therefore the same dashboard fetch).
 */
const RANGE_OPTIONS = [
  { label: '1 day', days: 1 },
  { label: '7 days', days: 7 },
  { label: '30 days', days: 30 },
  { label: '90 days', days: 90 },
  { label: '6 months', days: 180 },
  { label: '1 year', days: 365 },
] as const;

/** Subset surfaced as one-tap segments in the dashboard header. */
const QUICK_RANGE_DAYS = [30, 180, 365] as const;

function rangeOptionLabel(days: number): string {
  return RANGE_OPTIONS.find((option) => option.days === days)?.label ?? `${days} days`;
}

/**
 * Display-currency selector. Every amount in the API is stored and formatted in
 * USD (`formatCompactCurrency`), so this is a visual stub with a single
 * supported option — no multi-currency data support is implied.
 */
const SUPPORTED_CURRENCY = { code: 'USD', symbol: '$', name: 'US Dollar' } as const;

function CurrencySelect() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Display currency"
        className="flex h-9 items-center gap-1 rounded-full border border-border bg-surface px-3 text-sm font-semibold text-foreground transition-colors hover:bg-surface-muted"
      >
        {SUPPORTED_CURRENCY.symbol}
        <ChevronDown
          className={`h-3.5 w-3.5 text-foreground-muted transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <ul
          role="listbox"
          aria-label="Display currency"
          className="absolute right-0 top-full z-20 mt-2 w-56 rounded-xl border border-border bg-surface p-2 shadow-xl"
        >
          <li
            role="option"
            aria-selected="true"
            className="flex items-center justify-between rounded-lg px-3 py-2 text-xs font-medium text-foreground"
          >
            {SUPPORTED_CURRENCY.name} ({SUPPORTED_CURRENCY.symbol})
            <Check className="h-4 w-4 text-primary" />
          </li>
          <li className="px-3 py-1 text-[11px] leading-snug text-foreground-muted">
            Base currency — {SUPPORTED_CURRENCY.code} is the only supported currency.
          </li>
        </ul>
      )}
    </div>
  );
}

/** Quick-access severity pills; each one calls the same range setter as the popover. */
function RangeSegments({ value, onChange }: { value: number; onChange: (days: number) => void }) {
  return (
    <div
      role="group"
      aria-label="Chart range"
      className="inline-flex items-center gap-1 rounded-full border border-border bg-surface-muted/60 p-1"
    >
      {QUICK_RANGE_DAYS.map((days) => {
        const isActive = value === days;
        return (
          <button
            key={days}
            type="button"
            onClick={() => onChange(days)}
            aria-pressed={isActive}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              isActive
                ? 'bg-surface text-foreground shadow-sm'
                : 'text-foreground-muted hover:text-foreground'
            }`}
          >
            {rangeOptionLabel(days)}
          </button>
        );
      })}
    </div>
  );
}

function useDashboard(days: number) {
  const [data, setData] = useState<DashboardOverview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await authFetch(`/api/v1/dashboard/overview?days=${days}`);
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
  }, [days]);

  useEffect(() => { fetchData(); }, [fetchData]);
  return { data, error, isLoading, refetch: fetchData };
}

function formatCents(cents: number): string {
  return formatCompactCurrency(cents);
}

function formatCompact(cents: number): string {
  return formatCompactCurrency(cents);
}

function formatDate(d?: Date | string | null): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/** Minimal KPI card — typography and spacing carry the hierarchy. */
function KpiCard({
  label,
  value,
  subtext,
  href,
  valueClassName,
}: {
  label: string;
  value: string;
  subtext?: string;
  href?: string;
  valueClassName?: string;
}) {
  const body = (
    <div className="group rounded-xl border border-border bg-surface p-5 shadow-sm transition-colors hover:bg-surface-muted/30">
      <p className="text-xs font-medium uppercase tracking-wide text-foreground-muted">{label}</p>
      <p className={`mt-3 text-3xl font-bold tracking-tight text-foreground ${valueClassName ?? ''}`}>{value}</p>
      {subtext && <p className="mt-1.5 text-xs text-foreground-muted">{subtext}</p>}
      {href && (
        <ArrowRight className="mt-2 h-3.5 w-3.5 text-foreground-muted opacity-0 transition-opacity group-hover:opacity-100" />
      )}
    </div>
  );
  return href ? <Link to={href} className="block">{body}</Link> : body;
}

function SectionCard({
  title,
  description,
  action,
  children,
  className,
}: {
  title: React.ReactNode;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-xl border border-border bg-surface p-5 shadow-sm ${className ?? ''}`}>
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          {description && <p className="mt-0.5 text-xs text-foreground-muted">{description}</p>}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}



function DashboardLoading() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border bg-surface p-5">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="mt-4 h-8 w-24" />
            <Skeleton className="mt-3 h-3 w-32" />
          </div>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-border bg-surface p-5 lg:col-span-3">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="mt-5 h-64 w-full" />
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-border bg-surface p-5 lg:col-span-2">
          <Skeleton className="h-4 w-32" />
          <div className="mt-5 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        </div>
        <div className="rounded-xl border border-border bg-surface p-5">
          <Skeleton className="h-4 w-32" />
          <div className="mt-5 space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-6 w-full" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function Dashboard(): React.JSX.Element {
  const [rangeDays, setRangeDays] = useState<number>(180);
  const [showRangePopover, setShowRangePopover] = useState(false);
  const { data, error, isLoading, refetch } = useDashboard(rangeDays);

  const areaData = useMemo(
    () =>
      (data?.spendingTrend ?? []).map((m) => {
        const parts = m.monthKey.split('-').map(Number);
        if (parts.length === 3) {
          const [year, month, day] = parts;
          return { ...m, date: new Date(year, month - 1, day) };
        }
        const [year, month] = parts;
        return { ...m, date: new Date(year, month - 1, 1) };
      }),
    [data?.spendingTrend]
  );

  const rangeLabel = useMemo(() => {
    if (rangeDays === 1) return 'Last 1 day';
    if (rangeDays === 7) return 'Last 7 days';
    if (rangeDays === 30) return 'Last 30 days';
    if (rangeDays === 90) return 'Last 90 days';
    if (rangeDays === 180) return 'Last 6 months';
    if (rangeDays === 365) return 'Last 1 year';
    return `Last ${rangeDays} days`;
  }, [rangeDays]);

  if (error) {
    return (
      <div className="rounded-xl border border-border bg-surface p-6 shadow-sm">
        <p className="mb-3 text-sm text-danger">{error}</p>
        <button onClick={() => refetch()} className="text-sm font-medium text-primary hover:underline">
          Retry
        </button>
      </div>
    );
  }

  if (isLoading || !data) {
    return (
      <PageLayout
        title="Dashboard"
        subtitle="Overview of your construction projects"
        actions={
          <>
            <CurrencySelect />
            <RangeSegments value={rangeDays} onChange={setRangeDays} />
          </>
        }
      >
        <DashboardLoading />
      </PageLayout>
    );
  }

  const f = data.financial;
  const p = data.projects;
  const t = data.tasks;
  const e = data.equipment;
  const inv = data.inventory;
  const hasTrendData = data.spendingTrend.some((m) => m.budget > 0 || m.spent > 0);

  return (
    <PageLayout
      title="Dashboard"
      subtitle="Overview of your construction projects"
      actions={
        <>
          <CurrencySelect />
          <RangeSegments value={rangeDays} onChange={setRangeDays} />
        </>
      }
    >
      <div className="space-y-6">
        {/* KPI row */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            label="Total Budget"
            value={formatCompact(f.totalBudgetCents)}
            valueClassName="money"
            subtext={`${p.active + p.onHold} projects with budgets`}
            href="/projects"
          />
          <KpiCard
            label="Total Spent"
            value={formatCompact(f.totalSpentCents)}
            valueClassName="money"
            subtext="Material purchases to date"
            href="/inventory/transactions"
          />
          <KpiCard
            label="Remaining Budget"
            value={formatCompact(Math.max(f.remainingBudgetCents, 0))}
            valueClassName="money"
            subtext={
              f.totalBudgetCents > 0
                ? `${Math.round(Math.min((f.totalSpentCents / f.totalBudgetCents) * 100, 100))}% of budget used`
                : 'No budget set yet'
            }
          />
          <KpiCard
            label="Active Projects"
            value={String(p.active)}
            subtext={`${p.onHold} on hold · ${p.completingSoon} completing soon`}
            href="/projects"
          />
        </div>

        {/* Operations strip — preserves the existing equipment/inventory/task stats */}
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-border bg-surface px-4 py-3 shadow-sm">
            <p className="text-lg font-bold leading-tight text-foreground">{t.atRisk}</p>
            <p className="text-xs text-foreground-muted">
              Tasks at risk{t.mineToday > 0 ? ` · ${t.mineToday} due today` : ''}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-surface px-4 py-3 shadow-sm">
            <p className="text-lg font-bold leading-tight text-foreground">{e.utilizationRate}%</p>
            <p className="text-xs text-foreground-muted">
              Equipment utilization · {e.assigned}/{e.total} assigned
            </p>
          </div>
          <div className="rounded-xl border border-border bg-surface px-4 py-3 shadow-sm">
            <p className="text-lg font-bold leading-tight text-foreground">{inv.lowStockItems}</p>
            <p className="text-xs text-foreground-muted">
              Low stock items · {inv.totalMaterials} materials tracked
            </p>
          </div>
        </div>

        {/* Main analytics */}
        <div className="grid items-start gap-4 lg:grid-cols-3">
          {/* Spending / Budget chart */}
          <SectionCard
            className="lg:col-span-3 min-w-0"
            title={
              <span className="inline-flex items-center gap-2">
                Spending vs Budget
                <span className="relative">
                  <button
                    type="button"
                    onClick={() => setShowRangePopover((v) => !v)}
                    className="text-xs font-medium text-primary hover:underline"
                  >
                    Edit range
                  </button>
                  {showRangePopover && (
                    <div className="absolute left-0 top-full z-20 mt-2 w-48 rounded-xl border border-border bg-surface p-2 shadow-xl">
                      {RANGE_OPTIONS.map((opt) => (
                        <button
                          key={opt.days}
                          type="button"
                          onClick={() => {
                            setRangeDays(opt.days);
                            setShowRangePopover(false);
                          }}
                          className={`flex w-full rounded-lg px-3 py-2 text-left text-xs font-medium ${rangeDays === opt.days ? 'bg-primary text-primary-foreground' : 'text-foreground hover:bg-surface-muted'}`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  )}
                </span>
              </span>
            }
            description={`${rangeLabel} — budget is allocated across project timelines`}
            action={
              <div className="flex items-center gap-4 text-xs text-foreground-muted">
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: 'var(--chart-line-primary)' }} />
                  Budget
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: 'var(--chart-line-spent)' }} />
                  Spent
                </span>
              </div>
            }
          >
            {hasTrendData ? (
              <div className="h-72 w-full overflow-hidden">
                <AreaChart
                  data={areaData}
                  xDataKey="date"
                  margin={{ top: 8, right: 8, left: 8, bottom: 0 }}
                >
                  <Grid horizontal />
                  <Area
                    dataKey="spent"
                    fill="var(--chart-line-spent)"
                    stroke="var(--chart-line-spent)"
                    fillOpacity={0.2}
                    strokeWidth={2}
                  />
                  <Area
                    dataKey="budget"
                    fill="var(--chart-line-primary)"
                    stroke="var(--chart-line-primary)"
                    fillOpacity={0.3}
                    strokeWidth={2.5}
                  />
                  <XAxis />
                  <ChartTooltip
                    rows={(p) => [
                      {
                        color: 'var(--chart-line-primary)',
                        label: 'Budget',
                        value: formatCents((p.budget as number) ?? 0),
                      },
                      {
                        color: 'var(--chart-line-spent)',
                        label: 'Spent',
                        value: formatCents((p.spent as number) ?? 0),
                      },
                    ]}
                  />
                </AreaChart>
              </div>
            ) : (
              <div className="flex h-72 flex-col items-center justify-center rounded-lg border border-border bg-surface-muted/30 text-center">
                <HardHat className="mb-2 h-8 w-8 text-foreground-muted/30" />
                <p className="text-sm font-medium text-foreground">No spending data yet</p>
                <p className="mt-1 text-xs text-foreground-muted">
                  Record material deliveries or set project budgets to see the trend.
                </p>
              </div>
            )}
          </SectionCard>


        </div>

        {/* Project activity heatmap */}
        <SectionCard
          title="Project Activity"
          description="Daily project work activity — recorded changes over the last 16 weeks"
        >
          {data.activityHeatmap.length === 0 ||
          data.activityHeatmap.every((d) => d.count === 0) ? (
            <div className="flex h-40 flex-col items-center justify-center rounded-lg border border-border bg-surface-muted/30 text-center">
              <Clock className="mb-2 h-8 w-8 text-foreground-muted/30" />
              <p className="text-sm font-medium text-foreground">No activity recorded yet</p>
              <p className="mt-1 text-xs text-foreground-muted">
                Project work will appear here once the team starts making changes.
              </p>
            </div>
          ) : (
            <ActivityHeatmap data={data.activityHeatmap} />
          )}
        </SectionCard>

        {/* Recent expenses + activity */}
        <div className="grid items-start gap-4 lg:grid-cols-3">
          <SectionCard
            className="lg:col-span-2"
            title="Recent Expenses"
            description="Latest material purchases"
            action={
              <Link to="/inventory/transactions" className="text-xs font-medium text-primary hover:underline">
                View all
              </Link>
            }
          >
            {data.recentExpenses.length === 0 ? (
              <div className="flex h-40 flex-col items-center justify-center rounded-lg border border-border bg-surface-muted/30 text-center">
                <Package className="mb-2 h-8 w-8 text-foreground-muted/30" />
                <p className="text-sm font-medium text-foreground">No purchases recorded</p>
                <p className="mt-1 text-xs text-foreground-muted">Record a material delivery to see it here.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-foreground-muted">
                      <th className="pb-2 pr-4 font-medium">Description</th>
                      <th className="pb-2 pr-4 font-medium">Project</th>
                      <th className="pb-2 pr-4 font-medium">Date</th>
                      <th className="pb-2 text-right font-medium">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {data.recentExpenses.map((expense) => (
                      <tr key={expense.id}>
                        <td className="py-3 pr-4">
                          <p className="font-medium text-foreground">{expense.description}</p>
                          <p className="text-xs text-foreground-muted">{expense.materialName}</p>
                        </td>
                        <td className="py-3 pr-4">
                          {expense.projectId ? (
                            <Link
                              to={`/projects/${expense.projectId}`}
                              className="text-foreground-muted transition-colors hover:text-primary"
                            >
                              {expense.projectName ?? 'Project'}
                            </Link>
                          ) : (
                            <span className="text-foreground-muted">—</span>
                          )}
                        </td>
                        <td className="py-3 pr-4 whitespace-nowrap text-foreground-muted">
                          {formatDate(expense.createdAt)}
                        </td>
                        <td className="py-3 text-right font-semibold tabular-nums text-foreground">
                          {formatCents(expense.amountCents)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </SectionCard>

          {/* Recent activity */}
          <SectionCard
            title="Recent Activity"
            description="Latest changes across the organization"
            action={
              <Link to="/audit" className="text-xs font-medium text-primary hover:underline">
                Audit log
              </Link>
            }
          >
            {data.recentActivity.length === 0 ? (
              <div className="flex h-40 flex-col items-center justify-center rounded-lg border border-border bg-surface-muted/30 text-center">
                <Clock className="mb-2 h-8 w-8 text-foreground-muted/30" />
                <p className="text-sm font-medium text-foreground">No recent activity</p>
              </div>
            ) : (
              <div className="space-y-0">
                {data.recentActivity.map((activity) => (
                  <div key={activity.id} className="relative flex gap-3 pb-4 last:pb-0">
                    <div className="flex flex-col items-center">
                      <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary/40" />
                      <span className="mt-1 w-px flex-1 bg-border" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm text-foreground">
                        <span className="capitalize">{activity.action.replace(/_/g, ' ')}</span>{' '}
                        <span className="text-foreground-muted">
                          {activity.entityType.replace(/_/g, ' ')}
                        </span>
                      </p>
                      <p className="text-xs text-foreground-muted">{formatDate(activity.createdAt)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        </div>
      </div>
    </PageLayout>
  );
}