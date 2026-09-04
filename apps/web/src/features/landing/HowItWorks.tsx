import { ChevronRight } from '../../shared/components/icons';
import { SectionHeading, Reveal } from './shared';

const STEPS = [
  { n: '01', title: 'CREATE', text: 'Create your project and define its basic information, budget and timeline.' },
  { n: '02', title: 'ORGANIZE', text: 'Add your team, tasks, materials, equipment and documents.' },
  { n: '03', title: 'TRACK', text: 'Monitor progress, expenses, resources and project activity.' },
  { n: '04', title: 'DELIVER', text: 'Use reports and project insights to keep the project moving toward completion.' },
] as const;

export function HowItWorks() {
  return (
    <section id="how-it-works" aria-labelledby="how-heading" className="scroll-mt-20 border-t border-border bg-surface-muted/40">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:py-20">
        <Reveal>
          <div id="how-heading">
            <SectionHeading
              eyebrow="05 — How it works"
              title="From project idea to completed build."
              sub="Four stages, one continuous flow. Every stage feeds the next — nothing gets re-entered."
            />
          </div>
        </Reveal>
        <ol className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s, i) => (
            <li key={s.n} className="relative">
              <Reveal delayMs={i * 80}>
                <div className="h-full rounded-xl border border-border bg-surface p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-3xl font-bold text-[#2563EB]/25">{s.n}</span>
                    {i < STEPS.length - 1 && (
                      <ChevronRight aria-hidden className="hidden h-5 w-5 text-[#F97316] lg:block" />
                    )}
                  </div>
                  <h3 className="mt-3 text-sm font-bold tracking-widest text-foreground">{s.title}</h3>
                  <p className="mt-2 text-xs leading-5 text-foreground-muted">{s.text}</p>
                  <div aria-hidden className="mt-4 h-1 overflow-hidden rounded-full bg-surface-muted">
                    <div className="h-full rounded-full bg-gradient-to-r from-[#2563EB] to-[#F97316]" style={{ width: `${(i + 1) * 25}%` }} />
                  </div>
                </div>
              </Reveal>
            </li>
          ))}
        </ol>
        <Reveal delayMs={120}>
          <p className="mt-6 text-center font-mono text-xs uppercase tracking-[0.25em] text-foreground-muted">
            Create <span className="text-[#F97316]">→</span> Organize <span className="text-[#F97316]">→</span> Track{' '}
            <span className="text-[#F97316]">→</span> Deliver
          </p>
        </Reveal>
      </div>
    </section>
  );
}
