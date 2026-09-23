import { Link } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { Reveal } from './shared';

/** High-fidelity SVG line chart: budget (blue) vs actual spend (terracotta). Demo values. */
function HeroChart() {
  return (
    <svg
      viewBox="0 0 800 180"
      preserveAspectRatio="none"
      role="img"
      aria-label="Demo chart showing cumulative budget versus actual spending across project phases"
      className="h-full w-full"
      fill="none"
    >
      {/* Subtle grid lines */}
      <line stroke="#F0EFEA" strokeDasharray="3 3" x1="0" x2="800" y1="30" y2="30" />
      <line stroke="#F0EFEA" strokeDasharray="3 3" x1="0" x2="800" y1="75" y2="75" />
      <line stroke="#F0EFEA" strokeDasharray="3 3" x1="0" x2="800" y1="120" y2="120" />
      <line stroke="#E8E5DC" x1="0" x2="800" y1="165" y2="165" />
      {/* Budget area & line (blue) */}
      <path d="M0,60 C140,55 280,68 420,58 C560,48 700,50 800,42 L800,165 L0,165 Z" fill="rgba(59, 130, 246, 0.07)" />
      <path d="M0,60 C140,55 280,68 420,58 C560,48 700,50 800,42" stroke="#3B82F6" strokeLinecap="round" strokeWidth="2.5" />
      {/* Spend area & line (terracotta) */}
      <path d="M0,145 C150,140 260,132 400,122 C520,110 650,90 800,82 L800,165 L0,165 Z" fill="rgba(226, 92, 56, 0.1)" />
      <path d="M0,145 C150,140 260,132 400,122 C520,110 650,90 800,82" stroke="#E25C38" strokeLinecap="round" strokeWidth="2.5" />
      {/* Data markers */}
      <circle cx="400" cy="122" fill="#E25C38" r="4" stroke="#FFFFFF" strokeWidth="2" />
      <circle cx="800" cy="82" fill="#E25C38" r="4" stroke="#FFFFFF" strokeWidth="2" />
      <circle cx="420" cy="58" fill="#3B82F6" r="4" stroke="#FFFFFF" strokeWidth="2" />
      <circle cx="800" cy="42" fill="#3B82F6" r="4" stroke="#FFFFFF" strokeWidth="2" />
    </svg>
  );
}

const HERO_KPIS = [
  { label: 'Total Budget', value: '$4.2M', sub: '6 projects with budgets', tone: 'text-emerald-600' },
  { label: 'Total Spend', value: '$1.8M', sub: 'Material purchases to date', tone: 'text-stone-500' },
  { label: 'Remaining', value: '$2.4M', sub: '57% of budget unallocated', tone: 'text-cad-blue' },
  { label: 'Active Projects', value: '6', sub: '2 on hold · 1 completing soon', tone: 'text-stone-500' },
] as const;

const SITE_PROGRESS = [
  { name: 'Lekki Residential Block B', meta: '$1.2M · 72%', pct: 'w-[72%]' },
  { name: 'Abuja Commercial Complex', meta: '$2.1M · 44%', pct: 'w-[44%]' },
  { name: 'Road Rehabilitation Ph-2', meta: '$900K · 89%', pct: 'w-[89%]' },
] as const;

const ACTIVITY = [
  { dot: 'bg-emerald-500', title: 'Expense recorded', detail: ' — Cement delivery 250 bags', meta: '12m ago by Segun A. (Site PM)' },
  { dot: 'bg-cad-accent', title: 'Task completed', detail: ' — Foundation blinding layer cure test', meta: '1h ago by Structural QA' },
  { dot: 'bg-amber-500', title: 'Equipment reassigned', detail: ' — CAT 320 Excavator moved to Sector 4', meta: '3h ago by Logistics Lead' },
] as const;

/** Browser-chrome dashboard preview: KPI cards, budget/spend chart, progress + live activity. Demo values. */
function DashboardPreview() {
  return (
    <div className="space-y-6 bg-white p-6 md:p-8">
      {/* Metric KPI stat cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {HERO_KPIS.map((k) => (
          <div key={k.label} className="rounded-lg border border-stone-200/80 bg-white p-4 shadow-card-subtle">
            <p className="font-mono text-xs uppercase tracking-wider text-stone-400">{k.label}</p>
            <p className="mt-1.5 text-2xl font-bold text-stone-900 md:text-3xl">{k.value}</p>
            <p className={`mt-2 font-mono text-[11px] ${k.tone}`}>{k.sub}</p>
          </div>
        ))}
      </div>

      {/* Spending vs Budget chart */}
      <div className="rounded-lg border border-stone-200/90 bg-white p-5 shadow-card-subtle">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-stone-900">Spending vs Budget Trend</h3>
            <p className="text-xs text-stone-500">Cumulative variance across all active sites</p>
          </div>
          <div className="flex items-center gap-4 font-mono text-xs">
            <span className="flex items-center gap-1.5">
              <span className="h-0.5 w-3 bg-cad-accent" aria-hidden />
              <span className="text-stone-600">Budget ($4.2M)</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-0.5 w-3 bg-terracotta-500" aria-hidden />
              <span className="text-stone-600">Actual Spend ($1.8M)</span>
            </span>
          </div>
        </div>
        <div className="relative h-44 w-full">
          <HeroChart />
        </div>
        <div className="mt-2 flex justify-between font-mono text-[11px] text-stone-400">
          <span>Phase 0: Groundwork</span>
          <span className="hidden sm:inline">Phase 1: Framing &amp; Slab</span>
          <span className="hidden md:inline">Phase 2: MEP Rough-in</span>
          <span className="hidden sm:inline">Phase 3: Finishes</span>
          <span>Phase 4: Commissioning</span>
        </div>
      </div>

      {/* Lower split: projects progress & activity log */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-lg border border-stone-200/90 bg-white p-5 shadow-card-subtle">
          <div className="mb-3 flex items-center justify-between">
            <h4 className="font-mono text-xs uppercase tracking-wider text-stone-500">Active Site Progress</h4>
            <span className="font-mono text-xs text-stone-400">Phase completion</span>
          </div>
          <div className="space-y-4">
            {SITE_PROGRESS.map((p) => (
              <div key={p.name}>
                <div className="mb-1 flex justify-between text-xs font-medium text-stone-800">
                  <span>{p.name}</span>
                  <span className="font-mono text-stone-500">{p.meta}</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-stone-100">
                  <div className={`h-full rounded-full bg-stone-800 ${p.pct}`} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-stone-200/90 bg-white p-5 shadow-card-subtle">
          <div className="mb-3 flex items-center justify-between">
            <h4 className="font-mono text-xs uppercase tracking-wider text-stone-500">Live Activity Feed</h4>
            <span className="font-mono text-xs text-stone-400">Real-time logs</span>
          </div>
          <ul className="space-y-3 text-xs">
            {ACTIVITY.map((a) => (
              <li key={a.title} className="flex items-start gap-2.5">
                <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${a.dot}`} aria-hidden />
                <div>
                  <span className="font-medium text-stone-900">{a.title}</span>
                  <span className="text-stone-500">{a.detail}</span>
                  <div className="font-mono text-[10px] text-stone-400">{a.meta}</div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

export function HeroSection() {
  return (
    <section className="blueprint-grid relative overflow-hidden border-b border-stone-200/60 pb-20 pt-24 md:pb-28 md:pt-32">
      <div className="mx-auto max-w-5xl px-6 text-center">
        <Reveal>
          <h1 className="font-display mx-auto max-w-4xl text-5xl font-normal leading-[1.04] tracking-tight text-stone-900 sm:text-6xl md:text-7xl lg:text-[84px]">
            Your entire construction project.
            <span className="block italic">One powerful workspace.</span>
          </h1>
        </Reveal>
        <Reveal delayMs={120}>
          <p className="mx-auto mt-8 max-w-2xl text-lg font-normal leading-relaxed text-stone-600 md:text-[19px]">
            FrameBase gives construction teams one place to plan projects, track tasks, control spending, manage
            materials and equipment, collaborate with teams, and keep every important document organized.
          </p>
        </Reveal>
        <Reveal delayMs={240}>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link
              to="/register"
              className="inline-flex items-center justify-center rounded-lg bg-stone-900 px-7 py-3.5 text-sm font-medium text-white shadow-md transition-all hover:bg-stone-800 hover:shadow-lg"
            >
              Get started free
            </Link>
            <a
              href="#demo"
              className="inline-flex items-center justify-center rounded-lg border border-stone-300 bg-white px-7 py-3.5 text-sm font-medium text-stone-800 transition-all hover:bg-stone-50"
            >
              Schedule live walkthrough
            </a>
          </div>
        </Reveal>
      </div>

      <Reveal delayMs={160} className="mx-auto mt-16 max-w-5xl px-4 sm:px-6">
        <div className="transform overflow-hidden rounded-xl border border-stone-300/90 bg-white shadow-dashboard transition duration-500 hover:-translate-y-0.5">
          {/* Browser chrome bar */}
          <div className="flex items-center justify-between border-b border-stone-200 bg-white px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-stone-300" aria-hidden />
              <span className="h-3 w-3 rounded-full bg-stone-300" aria-hidden />
              <span className="h-3 w-3 rounded-full bg-stone-300" aria-hidden />
              <div className="ml-4 flex items-center gap-2 rounded border border-stone-200 bg-white px-3 py-1 font-mono text-xs text-stone-500">
                <Lock className="h-3 w-3 text-stone-400" aria-hidden />
                <span>app.framebase.io/dashboard</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="rounded border border-emerald-200 bg-emerald-50 px-2 py-0.5 font-mono text-[11px] uppercase text-emerald-700">
                Live Sync
              </span>
              <span className="hidden text-xs text-stone-500 sm:inline">Project: Lekki High-Rise</span>
            </div>
          </div>
          <DashboardPreview />
        </div>
      </Reveal>
    </section>
  );
}
