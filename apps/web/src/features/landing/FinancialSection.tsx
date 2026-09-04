import { SectionHeading, Reveal } from './shared';

const STATS = [
  { label: 'Budget', value: '$4.2M', note: 'Planned across 6 projects', accent: false },
  { label: 'Spent', value: '$1.8M', note: 'Verified material & expense records', accent: true },
  { label: 'Remaining', value: '$2.4M', note: 'Available to complete works', accent: false },
  { label: 'Utilization', value: '43%', note: 'Spend against total budget', accent: false },
] as const;

/** Dual-series spending visual (blue = budget/system, orange = spending). Demo values. */
function FinanceChart() {
  return (
    <svg viewBox="0 0 640 240" role="img" aria-label="Demo chart comparing monthly budget against spending" className="h-auto w-full">
      {[30, 80, 130, 180, 225].map((y) => (
        <line key={y} x1="0" y1={y} x2="640" y2={y} stroke="currentColor" opacity="0.12" strokeWidth="1" />
      ))}
      {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'].map((m, i) => (
        <text key={m} x={60 + i * 105} y={238} fontSize="11" fill="currentColor" opacity="0.55" textAnchor="middle">
          {m}
        </text>
      ))}
      <path
        d="M0,50 C100,48 180,60 260,52 C340,44 420,36 500,40 C560,42 600,36 640,32 L640,225 L0,225 Z"
        fill="#2563EB"
        opacity="0.14"
      />
      <path
        d="M0,50 C100,48 180,60 260,52 C340,44 420,36 500,40 C560,42 600,36 640,32"
        fill="none"
        stroke="#2563EB"
        strokeWidth="2.5"
      />
      <path
        d="M0,170 C100,165 170,175 250,160 C330,145 410,120 490,105 C550,95 600,88 640,84"
        fill="none"
        stroke="#F97316"
        strokeWidth="2.5"
        strokeDasharray="1 0"
      />
      <circle cx="490" cy="105" r="4.5" fill="#F97316" stroke="var(--surface)" strokeWidth="2" />
    </svg>
  );
}

export function FinancialSection() {
  return (
    <section aria-labelledby="finance-heading" className="border-t border-border bg-surface-muted/40">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:py-20">
        <Reveal>
          <div id="finance-heading">
            <SectionHeading
              eyebrow="07 — Financial control"
              title="Know where every naira goes."
              sub="Budget, spent, remaining and utilization — computed from real project records, not guesses. Figures below are representative demo data."
            />
          </div>
        </Reveal>

        <div className="mt-10 grid gap-4 lg:grid-cols-5">
          <Reveal className="lg:col-span-2">
            <ul className="grid h-full grid-cols-2 gap-3">
              {STATS.map((s) => (
                <li
                  key={s.label}
                  className={`rounded-xl border bg-surface p-4 shadow-sm ${s.accent ? 'border-[#F97316]/40' : 'border-border'}`}
                >
                  <p className="font-mono text-[10px] uppercase tracking-widest text-foreground-muted">{s.label}</p>
                  <p className={`money mt-2 text-2xl font-bold tracking-tight sm:text-3xl ${s.accent ? 'text-[#F97316]' : 'text-foreground'}`}>
                    {s.value}
                  </p>
                  <p className="mt-1 text-[11px] leading-4 text-foreground-muted">{s.note}</p>
                </li>
              ))}
            </ul>
          </Reveal>
          <Reveal delayMs={100} className="lg:col-span-3">
            <div className="h-full rounded-xl border border-border bg-surface p-4 shadow-sm sm:p-5">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-semibold text-foreground">Monthly budget vs spending</p>
                <div className="flex items-center gap-3 text-[10px] text-foreground-muted">
                  <span className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-[#2563EB]" /> Budget
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-[#F97316]" /> Spent
                  </span>
                  <span className="rounded-full border border-dashed border-border px-2 py-0.5 font-mono uppercase">Demo data</span>
                </div>
              </div>
              <FinanceChart />
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
