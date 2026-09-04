import { SectionHeading, Reveal } from './shared';

const CASES = [
  {
    role: 'Project Managers',
    text: 'Stay on top of schedules, budgets and teams.',
    points: ['Portfolio dashboard', 'Budget vs actuals', 'Cross-project reports'],
  },
  {
    role: 'Site Engineers',
    text: 'Keep site activities and tasks organized.',
    points: ['Daily task boards', 'Progress updates', 'Site documentation'],
  },
  {
    role: 'Procurement Teams',
    text: 'Track materials and purchasing.',
    points: ['Stock & reorder points', 'Supplier invoices', 'Delivery records'],
  },
  {
    role: 'Business Owners',
    text: 'Get visibility across projects.',
    points: ['Portfolio health', 'Spend oversight', 'Audit transparency'],
  },
] as const;

export function UseCasesSection() {
  return (
    <section id="solutions" aria-labelledby="usecases-heading" className="scroll-mt-20 border-t border-border bg-surface-muted/40">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:py-20">
        <Reveal>
          <div id="usecases-heading">
            <SectionHeading
              eyebrow="11 — Use cases"
              title="Built around the construction workflow."
              sub="Different seats, same workspace — each role sees what matters to them."
            />
          </div>
        </Reveal>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {CASES.map((c, i) => (
            <article
              key={c.role}
              className={`rounded-xl border bg-surface p-5 shadow-sm transition-colors hover:border-[#2563EB]/40 ${
                i === 0 ? 'border-[#2563EB]/40' : 'border-border'
              }`}
            >
              <Reveal delayMs={Math.min(i * 60, 240)}>
                <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[#F97316]">0{i + 1}</p>
                <h3 className="mt-2 text-sm font-bold uppercase tracking-wide text-foreground">{c.role}</h3>
                <p className="mt-1 text-xs leading-5 text-foreground-muted">{c.text}</p>
                <ul className="mt-4 space-y-1.5 border-t border-dashed border-border pt-3">
                  {c.points.map((p) => (
                    <li key={p} className="flex items-center gap-2 text-[11px] text-foreground">
                      <span aria-hidden className="h-1 w-1 rounded-full bg-[#2563EB]" />
                      {p}
                    </li>
                  ))}
                </ul>
              </Reveal>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
