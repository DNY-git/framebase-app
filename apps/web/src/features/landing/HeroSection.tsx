import { Link } from 'react-router-dom';
import { ArrowRight, Clock } from '../../shared/components/icons';
import { useThemeStore } from '../../stores/theme-store';
import Dither from '../../components/Dither';
import { BrowserFrame, Reveal } from './shared';

/** Static SVG spending visual echoing the real dashboard chart (demo values). */
function HeroChart() {
  return (
    <svg viewBox="0 0 640 220" role="img" aria-label="Demo chart showing budget and spending trends" className="h-auto w-full">
      {[40, 90, 140, 190].map((y) => (
        <line key={y} x1="0" y1={y} x2="640" y2={y} stroke="currentColor" opacity="0.12" strokeWidth="1" />
      ))}
      <path
        d="M0,60 C80,55 140,70 200,62 C280,52 340,40 420,46 C500,52 570,38 640,30 L640,220 L0,220 Z"
        fill="#2563EB"
        opacity="0.15"
      />
      <path
        d="M0,60 C80,55 140,70 200,62 C280,52 340,40 420,46 C500,52 570,38 640,30"
        fill="none"
        stroke="#2563EB"
        strokeWidth="2.5"
      />
      <path
        d="M0,150 C90,145 160,160 240,150 C320,140 400,120 480,110 C550,102 600,95 640,90"
        fill="none"
        stroke="#F97316"
        strokeWidth="2.5"
      />
      <circle cx="480" cy="110" r="4" fill="#F97316" stroke="var(--surface)" strokeWidth="2" />
    </svg>
  );
}

const HERO_KPIS = [
  { label: 'Total Budget', value: '$4.2M', sub: '6 projects with budgets' },
  { label: 'Total Spent', value: '$1.8M', sub: 'Material purchases to date' },
  { label: 'Remaining', value: '$2.4M', sub: '57% of budget used' },
  { label: 'Active Projects', value: '6', sub: '2 on hold · 1 completing soon' },
] as const;

/** Dashboard preview modeled on the real FrameBase dashboard layout (demo values). */
function DashboardPreview() {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {HERO_KPIS.map((k) => (
          <div key={k.label} className="rounded-xl border border-border bg-surface p-3 sm:p-4">
            <p className="font-mono text-[10px] font-medium uppercase tracking-wider text-foreground-muted">{k.label}</p>
            <p className="money mt-1.5 text-lg font-bold tracking-tight text-foreground sm:text-2xl">{k.value}</p>
            <p className="mt-1 hidden text-[11px] text-foreground-muted sm:block">{k.sub}</p>
          </div>
        ))}
      </div>
      <div className="rounded-xl border border-border bg-surface p-3 sm:p-4">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-xs font-semibold text-foreground">Spending vs Budget</p>
          <div className="flex items-center gap-3 text-[10px] text-foreground-muted">
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-[#2563EB]" /> Budget
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-[#F97316]" /> Spent
            </span>
          </div>
        </div>
        <HeroChart />
      </div>
      <div className="grid gap-3 md:grid-cols-5">
        <div className="rounded-xl border border-border bg-surface p-3 sm:p-4 md:col-span-3">
          <p className="text-xs font-semibold text-foreground">Project progress</p>
          {[
            { name: 'Lekki Residential Block B', pct: 68, budget: '$1.2M' },
            { name: 'Abuja Commercial Complex', pct: 41, budget: '$2.1M' },
            { name: 'Road Rehabilitation PH-2', pct: 82, budget: '$900K' },
          ].map((p) => (
            <div key={p.name} className="mt-3">
              <div className="flex items-center justify-between text-[11px]">
                <span className="truncate font-medium text-foreground">{p.name}</span>
                <span className="money ml-2 shrink-0 text-foreground-muted">{p.budget}</span>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-muted">
                <div className="h-full rounded-full bg-[#2563EB]" style={{ width: `${p.pct}%` }} />
              </div>
            </div>
          ))}
        </div>
        <div className="rounded-xl border border-border bg-surface p-3 sm:p-4 md:col-span-2">
          <p className="text-xs font-semibold text-foreground">Recent activity</p>
          {[
            { text: 'Expense recorded · Cement delivery', time: '12m ago' },
            { text: 'Task completed · Foundation blinding', time: '1h ago' },
            { text: 'Equipment assigned · Concrete mixer', time: '3h ago' },
          ].map((a) => (
            <div key={a.text} className="mt-3 flex items-start gap-2">
              <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-foreground-muted" />
              <div className="min-w-0">
                <p className="truncate text-[11px] text-foreground">{a.text}</p>
                <p className="text-[10px] text-foreground-muted">{a.time}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function HeroSection() {
  const resolved = useThemeStore((s) => s.resolved);

  return (
    <section className="relative overflow-hidden">
      <div aria-hidden="true" className="absolute inset-0">
        <Dither
          waveColor={[0.5, 0.5, 0.5]}
          disableAnimation={false}
          enableMouseInteraction={true}
          mouseRadius={0.3}
          colorNum={4}
          waveAmplitude={0.3}
          waveFrequency={3}
          waveSpeed={0.05}
          backgroundColor={resolved === 'dark' ? [0, 0, 0] : [0.98, 0.98, 0.98]}
        />
      </div>
      <div className="relative z-10 mx-auto max-w-7xl px-4 pb-14 pt-12 sm:px-6 sm:pt-16 lg:pb-20 lg:pt-24">
        <div className="mx-auto max-w-3xl text-center">
          <Reveal>
            <p className="font-mono text-xs font-semibold uppercase tracking-[0.25em] text-[#2563EB]">
              FrameBase — Construction Project Management
            </p>
          </Reveal>
          <Reveal delayMs={80}>
            <h1 className="mt-4 text-4xl font-bold leading-[1.05] tracking-tight text-foreground sm:text-5xl lg:text-6xl">
              Your entire construction project.
              <span className="block">One powerful workspace.</span>
            </h1>
          </Reveal>
          <Reveal delayMs={160}>
            <p className="mx-auto mt-5 max-w-2xl text-sm leading-6 text-foreground-muted sm:text-base">
              FrameBase gives construction teams one place to plan projects, track tasks, control spending, manage
              materials and equipment, collaborate with teams, and keep every important document organized.
            </p>
          </Reveal>
          <Reveal delayMs={240}>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                to="/register"
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#2563EB] px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#1d4ed8] sm:w-auto"
              >
                Start building <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
              <a
                href="#showcase"
                className="inline-flex w-full items-center justify-center rounded-lg border border-border bg-surface px-6 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-surface-muted sm:w-auto"
              >
                Explore FrameBase
              </a>
            </div>
          </Reveal>
        </div>

        <Reveal delayMs={120} className="relative mx-auto mt-12 max-w-5xl lg:mt-16">
          <div aria-hidden className="absolute -left-4 top-8 hidden flex-col gap-2 xl:flex">
            <span className="font-mono text-[10px] uppercase tracking-widest text-foreground-muted [writing-mode:vertical-rl]">
              SEC-A · SITE OVERVIEW
            </span>
            <span className="h-16 w-px bg-[#F97316]/60" />
          </div>
          <BrowserFrame url="app.framebase.io/dashboard">
            <DashboardPreview />
          </BrowserFrame>
        </Reveal>
      </div>
    </section>
  );
}
