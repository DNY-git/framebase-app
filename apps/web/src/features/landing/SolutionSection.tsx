import { SectionHeading, Reveal } from './shared';

const BLOCKS = [
  {
    n: '01',
    title: 'Project Management',
    text: 'Create, organize and monitor construction projects from one place.',
    visual: (
      <div className="space-y-2">
        {[
          { name: 'Lekki Residential Block B', pct: 68 },
          { name: 'Abuja Commercial Complex', pct: 41 },
        ].map((p) => (
          <div key={p.name}>
            <div className="flex justify-between text-[10px] text-foreground-muted">
              <span className="truncate">{p.name}</span>
              <span>{p.pct}%</span>
            </div>
            <div className="mt-1 h-1.5 rounded-full bg-surface-muted">
              <div className="h-full rounded-full bg-[#2563EB]" style={{ width: `${p.pct}%` }} />
            </div>
          </div>
        ))}
      </div>
    ),
  },
  {
    n: '02',
    title: 'Task Management',
    text: 'Assign tasks, track progress and manage dependencies.',
    visual: (
      <ul className="space-y-1.5 text-[11px]">
        {[
          { t: 'Foundation blinding', done: true },
          { t: 'Column reinforcement', done: true },
          { t: 'Slab formwork', done: false },
        ].map((t) => (
          <li key={t.t} className="flex items-center gap-2 text-foreground">
            <span
              aria-hidden
              className={`flex h-3.5 w-3.5 items-center justify-center rounded border text-[9px] ${
                t.done ? 'border-[#2563EB] bg-[#2563EB] text-white' : 'border-border bg-background'
              }`}
            >
              {t.done ? '✓' : ''}
            </span>
            <span className={t.done ? 'text-foreground-muted line-through' : ''}>{t.t}</span>
          </li>
        ))}
      </ul>
    ),
  },
  {
    n: '03',
    title: 'Financial Control',
    text: 'Track budgets, expenses and spending across projects.',
    visual: (
      <div className="space-y-2 text-[11px]">
        {[
          { l: 'Budget', v: '$4.2M', w: 100, c: 'bg-[#2563EB]' },
          { l: 'Spent', v: '$1.8M', w: 43, c: 'bg-[#F97316]' },
        ].map((r) => (
          <div key={r.l}>
            <div className="flex justify-between text-foreground-muted">
              <span>{r.l}</span>
              <span className="money font-semibold text-foreground">{r.v}</span>
            </div>
            <div className="mt-1 h-1.5 rounded-full bg-surface-muted">
              <div className={`h-full rounded-full ${r.c}`} style={{ width: `${r.w}%` }} />
            </div>
          </div>
        ))}
      </div>
    ),
  },
  {
    n: '04',
    title: 'Materials & Inventory',
    text: "Know what materials you have, what you need and what's being used.",
    visual: (
      <div className="flex flex-wrap gap-1.5 text-[10px]">
        {[
          { m: 'Cement · 240 bags', low: false },
          { m: 'Steel · 12 t', low: false },
          { m: 'Blocks · 800', low: true },
          { m: 'Sand · Low', low: true },
        ].map((s) => (
          <span
            key={s.m}
            className={`rounded-full px-2 py-1 font-medium ${
              s.low ? 'bg-[#F97316]/10 text-[#F97316]' : 'bg-surface-muted text-foreground'
            }`}
          >
            {s.m}
          </span>
        ))}
      </div>
    ),
  },
  {
    n: '05',
    title: 'Equipment',
    text: 'Manage equipment, assignments and operational resources.',
    visual: (
      <ul className="space-y-1.5 text-[11px]">
        {[
          { e: 'Excavator CAT-320', s: 'Assigned', c: 'bg-[#2563EB]/10 text-[#2563EB]' },
          { e: 'Concrete mixer', s: 'Available', c: 'bg-surface-muted text-foreground' },
          { e: 'Generator 45kVA', s: 'Maintenance', c: 'bg-[#F97316]/10 text-[#F97316]' },
        ].map((r) => (
          <li key={r.e} className="flex items-center justify-between gap-2">
            <span className="truncate text-foreground">{r.e}</span>
            <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${r.c}`}>{r.s}</span>
          </li>
        ))}
      </ul>
    ),
  },
  {
    n: '06',
    title: 'Documents & Reports',
    text: 'Keep project documents and reports organized and accessible.',
    visual: (
      <ul className="space-y-1.5 text-[11px] text-foreground">
        {['Building Plan.pdf', 'Site Report — Wk 12', 'Material Schedule.xlsx'].map((d) => (
          <li key={d} className="flex items-center gap-2 rounded-lg border border-border bg-background px-2.5 py-1.5">
            <span aria-hidden className="h-5 w-4 shrink-0 rounded-sm border border-[#2563EB]/40 bg-[#2563EB]/10" />
            <span className="truncate">{d}</span>
          </li>
        ))}
      </ul>
    ),
  },
] as const;

export function SolutionSection() {
  return (
    <section id="features" aria-labelledby="solution-heading" className="scroll-mt-20 border-t border-border bg-surface-muted/40">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:py-20">
        <Reveal>
          <div id="solution-heading">
            <SectionHeading
              eyebrow="03 — The solution"
              title="FrameBase brings it all together."
              sub="Six connected blocks replace the scattered chain — each one a window into the real product."
            />
          </div>
        </Reveal>
        <ol className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {BLOCKS.map((b, i) => (
            <li key={b.n}>
              <Reveal delayMs={Math.min(i * 60, 300)}>
                <article className="flex h-full flex-col rounded-xl border border-border bg-surface p-5 shadow-sm transition-colors hover:border-[#2563EB]/40">
                  <p className="font-mono text-xs font-bold tracking-widest text-[#F97316]">{b.n}</p>
                  <h3 className="mt-2 text-base font-bold text-foreground">{b.title}</h3>
                  <p className="mt-1 text-xs leading-5 text-foreground-muted">{b.text}</p>
                  <div className="mt-4 flex-1 rounded-lg border border-dashed border-border bg-background p-3">{b.visual}</div>
                </article>
              </Reveal>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
