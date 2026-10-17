import { Link } from 'react-router-dom';

const KPIS = [
  { label: 'Total Budget', value: '$4.2M' },
  { label: 'Total Spend', value: '$1.8M' },
  { label: 'Remaining', value: '$2.4M' },
  { label: 'Active Projects', value: '6' },
];

const PROGRESS = [
  { name: 'Lekki Residential Block B', pct: 72 },
  { name: 'Abuja Commercial Complex', pct: 44 },
  { name: 'Road Rehabilitation Ph-2', pct: 89 },
];

const ACTIVITY = [
  {
    dot: 'bg-emerald-500',
    title: 'Expense recorded',
    body: '— Cement delivery, 250 bags',
    meta: '12m ago · Segun A. (Site PM)',
  },
  {
    dot: 'bg-stone-300',
    title: 'Task completed',
    body: '— Foundation blinding cure test',
    meta: '1h ago · Structural QA',
  },
  {
    dot: 'bg-amber-400',
    title: 'Equipment reassigned',
    body: '— CAT 320 Excavator to Sector 4',
    meta: '3h ago · Logistics Lead',
  },
];

/** Hero (reference: HeroSection) — blueprint grid, editorial headline, CTAs, product preview mock. */
export function Hero() {
  return (
    <section
      data-purpose="hero-section"
      className="relative pt-24 pb-20 md:pt-32 md:pb-28 overflow-hidden blueprint-grid border-stone-200/60"
    >
      <div className="max-w-5xl mx-auto px-6 text-center">
        {/* Main Editorial Headline */}
        <h1 className="serif-display text-5xl sm:text-6xl md:text-7xl lg:text-[84px] leading-[1.04] text-stone-900 font-normal tracking-tight max-w-4xl mx-auto">
          Your entire construction project.
          <br />
          <span className="italic font-serif">One powerful workspace.</span>
        </h1>
        {/* Subtitle */}
        <p className="mt-8 text-lg md:text-[19px] text-stone-600 max-w-2xl mx-auto leading-relaxed font-normal">
          FrameBase gives construction teams one place to plan projects, track tasks, control spending, manage materials
          and equipment, collaborate with teams, and keep every important document organized.
        </p>
        {/* CTAs */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Link
            className="inline-flex items-center justify-center px-7 py-3.5 text-sm font-medium text-white bg-stone-900 rounded-lg hover:bg-stone-800 transition-all shadow-md hover:shadow-lg"
            to="/register"
          >
            Get started free
          </Link>
          <a
            className="inline-flex items-center justify-center px-7 py-3.5 text-sm font-medium text-stone-800 bg-white border border-stone-300 rounded-lg hover:bg-stone-50 transition-all"
            href="#preview"
          >
            Schedule live walkthrough
          </a>
        </div>
      </div>
      {/* Hero App Preview: Minimal Product Frame */}
      <div className="mt-16 max-w-5xl mx-auto px-4 sm:px-6" id="preview">
        <div className="bg-white rounded-2xl border border-stone-200 shadow-dashboard overflow-hidden transition duration-500 hover:-translate-y-0.5">
          {/* Slim App Toolbar */}
          <div className="px-5 sm:px-7 py-3.5 flex items-center justify-between border-b border-stone-100">
            <div className="flex items-center gap-2.5">
              <span className="w-2 h-2 rounded-full bg-terracotta-500" />
              <span className="text-xs font-mono text-stone-500">app.framebase.io</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="hidden sm:flex items-center gap-1.5 text-[11px] font-mono text-stone-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live sync
              </span>
              <span className="text-xs font-medium text-stone-700">Lekki High-Rise</span>
            </div>
          </div>
          {/* KPI Strip */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-stone-100 border-b border-stone-100">
            {KPIS.map((k) => (
              <div key={k.label} className="bg-white px-5 sm:px-7 py-5">
                <p className="text-[10px] uppercase font-mono tracking-widest text-stone-400">{k.label}</p>
                <p className="text-xl md:text-2xl font-semibold text-stone-900 mt-1.5 tabular-nums">{k.value}</p>
              </div>
            ))}
          </div>
          {/* Spending vs Budget */}
          <div className="px-5 sm:px-7 py-6 border-b border-stone-100">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-sm font-medium text-stone-900">Spending vs Budget</h3>
              <div className="flex items-center gap-4 text-[11px] font-mono text-stone-500">
                <span className="flex items-center gap-1.5">
                  <span className="inline-block w-4 border-t border-dashed border-stone-400" />
                  Budget
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="inline-block w-4 border-t-2 border-terracotta-500" />
                  Actual
                </span>
              </div>
            </div>
            <div className="w-full h-40 md:h-44">
              <svg className="w-full h-full" fill="none" preserveAspectRatio="none" viewBox="0 0 800 160">
                <line stroke="#F4F2EB" strokeDasharray="3 4" x1="0" x2="800" y1="20" y2="20" />
                <line stroke="#F4F2EB" strokeDasharray="3 4" x1="0" x2="800" y1="60" y2="60" />
                <line stroke="#F4F2EB" strokeDasharray="3 4" x1="0" x2="800" y1="100" y2="100" />
                <line stroke="#E8E5DC" x1="0" x2="800" y1="140" y2="140" />
                <path
                  d="M0,52 C140,50 280,60 420,54 C560,46 700,46 800,40"
                  stroke="#A8A293"
                  strokeDasharray="4 5"
                  strokeLinecap="round"
                  strokeWidth="1.5"
                />
                <path
                  d="M0,126 C150,122 260,112 400,102 C520,90 650,70 800,62"
                  stroke="#E25C38"
                  strokeLinecap="round"
                  strokeWidth="2"
                />
                <circle cx="800" cy="62" fill="#E25C38" r="3.5" stroke="#FFFFFF" strokeWidth="2" />
              </svg>
            </div>
            <div className="flex flex-wrap justify-between gap-x-4 gap-y-1 text-[10px] font-mono text-stone-400 mt-3">
              <span>Phase 0: Groundwork</span>
              <span>Phase 1: Framing &amp; Slab</span>
              <span className="hidden sm:inline">Phase 2: MEP Rough-in</span>
              <span className="hidden sm:inline">Phase 3: Finishes</span>
              <span>Phase 4: Commissioning</span>
            </div>
          </div>
          {/* Lower Split: Progress + Activity */}
          <div className="grid grid-cols-1 md:grid-cols-2 md:divide-x divide-stone-100">
            <div className="px-5 sm:px-7 py-6 border-b md:border-b-0 border-stone-100">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-[10px] uppercase font-mono tracking-widest text-stone-400">
                  Active Site Progress
                </h4>
                <span className="text-[10px] font-mono text-stone-300">Phase completion</span>
              </div>
              <div className="space-y-4">
                {PROGRESS.map((p) => (
                  <div key={p.name}>
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="font-medium text-stone-800">{p.name}</span>
                      <span className="font-mono text-stone-400 tabular-nums">{p.pct}%</span>
                    </div>
                    <div className="h-1 rounded-full bg-stone-100 overflow-hidden">
                      <div className="h-full rounded-full bg-stone-900" style={{ width: `${p.pct}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="px-5 sm:px-7 py-6">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-[10px] uppercase font-mono tracking-widest text-stone-400">Live Activity</h4>
                <span className="text-[10px] font-mono text-stone-300">Real-time</span>
              </div>
              <ul className="space-y-3.5 text-xs">
                {ACTIVITY.map((a) => (
                  <li key={a.title} className="flex items-start gap-2.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${a.dot} mt-1 shrink-0`} />
                    <div>
                      <p className="leading-relaxed text-stone-500">
                        <span className="font-medium text-stone-900">{a.title}</span> {a.body}
                      </p>
                      <div className="text-[10px] font-mono text-stone-400 mt-0.5">{a.meta}</div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
