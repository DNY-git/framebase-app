import { SectionHeading, Reveal } from './shared';

const EVENTS = [
  { who: 'A. Bello · PM', what: 'Expense added — Cement delivery ₦4.1M', when: '12m ago' },
  { who: 'S. Okafor · Engineer', what: 'Task completed — Foundation blinding', when: '1h ago' },
  { who: 'System', what: 'Material updated — Cement stock 240 → 196 bags', when: '2h ago' },
  { who: 'M. Adeyemi · Procurement', what: 'Document uploaded — Steel invoice', when: '5h ago' },
] as const;

export function AuditSection() {
  return (
    <section aria-labelledby="audit-heading" className="border-t border-border">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:py-20">
        <div className="grid items-start gap-8 lg:grid-cols-5">
          <ul className="space-y-0 lg:col-span-3">
            {EVENTS.map((e, i) => (
              <li key={e.what} className="relative flex gap-4 pb-6 last:pb-0">
                <span aria-hidden className="flex flex-col items-center">
                  <span className={`mt-1 h-2.5 w-2.5 rounded-full ${i === 0 ? 'bg-[#F97316]' : 'bg-[#2563EB]'}`} />
                  {i < EVENTS.length - 1 && <span className="mt-1 w-px flex-1 bg-border" />}
                </span>
                <Reveal delayMs={i * 60} className="flex-1">
                  <div className="rounded-xl border border-border bg-surface p-4 shadow-sm">
                    <div className="grid gap-1 sm:grid-cols-[1fr_auto] sm:items-baseline">
                      <p className="text-sm font-medium text-foreground">{e.what}</p>
                      <p className="font-mono text-[10px] uppercase tracking-wider text-foreground-muted">{e.when}</p>
                    </div>
                    <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-[#2563EB]">{e.who}</p>
                  </div>
                </Reveal>
              </li>
            ))}
          </ul>
          <Reveal className="lg:col-span-2">
            <div id="audit-heading" className="lg:sticky lg:top-24">
              <SectionHeading
                align="left"
                eyebrow="10 — Audit trail"
                title="Every action leaves a trail."
                sub="Who did what, and when — expenses, tasks, materials and documents, all recorded automatically. Representative demo events shown."
              />
              <div className="mt-5 grid grid-cols-3 gap-2">
                {[
                  { k: 'WHO', v: 'Named actor' },
                  { k: 'WHAT', v: 'Exact change' },
                  { k: 'WHEN', v: 'Timestamped' },
                ].map((s) => (
                  <div key={s.k} className="rounded-lg border border-border bg-surface p-3 text-center shadow-sm">
                    <p className="font-mono text-[10px] font-bold tracking-widest text-[#F97316]">{s.k}</p>
                    <p className="mt-1 text-[11px] font-medium text-foreground">{s.v}</p>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
