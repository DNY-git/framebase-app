import { AlertTriangle } from '../../shared/components/icons';
import { SectionHeading, Reveal, BlueprintBackdrop } from './shared';

const FRAGMENTS = ['WhatsApp', 'Excel', 'Paper', 'Invoices', 'Spreadsheets', 'Site notes', 'Equipment records'] as const;

const CONSEQUENCES = [
  { title: 'Poor visibility', text: 'Nobody knows the true state of the site right now.' },
  { title: 'Budget uncertainty', text: 'Spending surfaces weeks after the money is gone.' },
  { title: 'Lost information', text: 'Critical details live in chats, pockets and piles.' },
  { title: 'Communication gaps', text: 'Office, site and suppliers work from different facts.' },
  { title: 'Too many tools', text: 'Five apps, three sheets, zero single source of truth.' },
] as const;

export function ProblemSection() {
  return (
    <section aria-labelledby="problem-heading" className="relative overflow-hidden">
      <BlueprintBackdrop tone="light" />
      <div className="relative mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:py-20">
        <Reveal>
          <div id="problem-heading">
            <SectionHeading
              eyebrow="02 — The problem"
              title="Construction shouldn't feel this scattered."
              sub="The traditional workflow is a chain of disconnected tools — and every link leaks information."
            />
          </div>
        </Reveal>

        <div className="mt-10 grid items-start gap-8 lg:grid-cols-2">
          <Reveal>
            <div className="relative rounded-xl border border-border bg-surface p-5 shadow-sm sm:p-6">
              <p className="font-mono text-[10px] uppercase tracking-widest text-foreground-muted">FIG. 01 — FRAGMENTED WORKFLOW</p>
              <ol className="mt-4 space-y-0">
                {FRAGMENTS.map((f, i) => (
                  <li key={f} className="relative flex items-stretch gap-3" style={{ marginLeft: `${(i % 3) * 14}px` }}>
                    <span aria-hidden className="flex flex-col items-center">
                      <span className="h-2 w-2 rounded-full border-2 border-[#F97316] bg-background" />
                      {i < FRAGMENTS.length - 1 && <span className="w-px flex-1 bg-border" />}
                    </span>
                    <span
                      className={`mb-2.5 rounded-lg border px-3 py-2 font-mono text-xs ${
                        i % 2 === 0
                          ? 'border-border bg-surface-muted/60 text-foreground'
                          : 'border-dashed border-foreground-muted/40 bg-background text-foreground-muted'
                      }`}
                      style={{ transform: `rotate(${i % 2 === 0 ? '-0.6deg' : '0.7deg'})` }}
                    >
                      {f}
                    </span>
                  </li>
                ))}
              </ol>
              <p className="mt-2 border-t border-dashed border-border pt-3 font-mono text-[11px] uppercase tracking-widest text-[#F97316]">
                ↓ Scattered information
              </p>
            </div>
          </Reveal>

          <ul className="space-y-3">
            {CONSEQUENCES.map((c, i) => (
              <li key={c.title}>
                <Reveal delayMs={i * 70}>
                  <div className="flex items-start gap-3 rounded-xl border border-border bg-surface p-4 shadow-sm">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#F97316]/10 text-[#F97316]">
                      <AlertTriangle className="h-4 w-4" aria-hidden />
                    </span>
                    <div>
                      <h3 className="text-sm font-semibold text-foreground">{c.title}</h3>
                      <p className="mt-0.5 text-xs leading-5 text-foreground-muted">{c.text}</p>
                    </div>
                  </div>
                </Reveal>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
