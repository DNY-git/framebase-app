import { CheckCircle, Clock, AlertTriangle } from '../../shared/components/icons';
import { SectionHeading, Reveal, BrowserFrame, Annotation } from './shared';

const PROJECTS = [
  { name: 'Lekki Residential Block B', code: 'LKG-B2', status: 'In progress', tone: 'bg-[#2563EB]/10 text-[#2563EB]', pct: 68, spent: '68% of budget used' },
  { name: 'Abuja Commercial Complex', code: 'ABJ-C1', status: 'On track', tone: 'bg-emerald-500/10 text-emerald-600', pct: 41, spent: '39% of budget used' },
  { name: 'Road Rehabilitation PH-2', code: 'PHR-02', status: 'At risk', tone: 'bg-[#F97316]/10 text-[#F97316]', pct: 82, spent: '91% of budget used' },
] as const;

const ACTIVITY = [
  { icon: CheckCircle, text: 'Task completed · Slab formwork level 2', time: '18m ago' },
  { icon: Clock, text: 'Expense recorded · Steel delivery ₦4.1M', time: '1h ago' },
  { icon: AlertTriangle, text: 'Low stock alert · Cement below reorder point', time: '4h ago' },
] as const;

export function DashboardShowcase() {
  return (
    <section id="showcase" aria-labelledby="showcase-heading" className="scroll-mt-20 border-t border-border">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:py-20">
        <Reveal>
          <div id="showcase-heading">
            <SectionHeading
              eyebrow="04 — Dashboard showcase"
              title="See the whole project at a glance."
              sub="The same dashboard your team opens every morning — budget, progress, tasks and activity in one view. Representative demo data."
            />
          </div>
        </Reveal>

        <Reveal delayMs={100} className="relative mx-auto mt-10 max-w-5xl">
          <Annotation className="absolute -left-2 top-10 z-10 -translate-x-full">Project health</Annotation>
          <Annotation className="absolute -right-2 top-1/3 z-10 translate-x-full">Spending</Annotation>
          <Annotation className="absolute -left-2 bottom-16 z-10 -translate-x-full">Progress</Annotation>
          <Annotation className="absolute -right-2 bottom-8 z-10 translate-x-full">Team activity</Annotation>

          <BrowserFrame url="app.framebase.io/dashboard">
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                {[
                  { l: 'Total Budget', v: '$4.2M' },
                  { l: 'Total Spent', v: '$1.8M' },
                  { l: 'Remaining', v: '$2.4M' },
                  { l: 'Active', v: '6 projects' },
                ].map((k) => (
                  <div key={k.l} className="rounded-xl border border-border bg-surface p-3">
                    <p className="font-mono text-[10px] uppercase tracking-wider text-foreground-muted">{k.l}</p>
                    <p className="money mt-1 text-lg font-bold text-foreground sm:text-xl">{k.v}</p>
                  </div>
                ))}
              </div>

              <div className="grid gap-3 md:grid-cols-5">
                <div className="rounded-xl border border-border bg-surface p-3 sm:p-4 md:col-span-3">
                  <p className="text-xs font-semibold text-foreground">Project health</p>
                  <ul className="mt-3 space-y-3">
                    {PROJECTS.map((p) => (
                      <li key={p.code} className="rounded-lg border border-border bg-background p-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate text-xs font-semibold text-foreground">{p.name}</p>
                            <p className="font-mono text-[10px] text-foreground-muted">{p.code}</p>
                          </div>
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${p.tone}`}>{p.status}</span>
                        </div>
                        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-muted">
                          <div className="h-full rounded-full bg-[#2563EB]" style={{ width: `${p.pct}%` }} />
                        </div>
                        <p className="mt-1 text-[10px] text-foreground-muted">{p.spent}</p>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-xl border border-border bg-surface p-3 sm:p-4 md:col-span-2">
                  <p className="text-xs font-semibold text-foreground">Team activity</p>
                  <ul className="mt-3 space-y-3">
                    {ACTIVITY.map(({ icon: Icon, text, time }) => (
                      <li key={text} className="flex items-start gap-2">
                        <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-foreground-muted" aria-hidden />
                        <div className="min-w-0">
                          <p className="text-[11px] leading-4 text-foreground">{text}</p>
                          <p className="text-[10px] text-foreground-muted">{time}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-4 rounded-lg bg-[#0B1020] p-3 text-white">
                    <p className="font-mono text-[10px] uppercase tracking-widest text-white/60">Today</p>
                    <p className="mt-1 text-xs font-semibold">14 tasks due · 3 at risk</p>
                  </div>
                </div>
              </div>
            </div>
          </BrowserFrame>
        </Reveal>
      </div>
    </section>
  );
}
