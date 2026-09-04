import { useState } from 'react';
import { ChevronDown } from '../../shared/components/icons';
import { SectionHeading, Reveal } from './shared';

const FAQS = [
  {
    q: 'What is FrameBase?',
    a: 'FrameBase is a construction project management platform that connects projects, tasks, teams, budgets, materials, equipment, documents and reports in one workspace.',
  },
  {
    q: 'Who is FrameBase for?',
    a: 'Construction companies of any size — project managers, site engineers, crew, procurement and fleet teams, as well as business owners who need visibility across projects.',
  },
  {
    q: 'Can I manage multiple projects?',
    a: 'Yes. Create and organize as many projects as you need, each with its own budget, timeline, team, tasks and documents — and monitor all of them from the dashboard.',
  },
  {
    q: 'Can I track project expenses?',
    a: 'Yes. Record expenses against projects, track budgets versus actual spending, and review financial summaries and reports as work progresses.',
  },
  {
    q: 'Can I manage my construction team?',
    a: 'Yes. Invite members, assign roles such as Admin, Project Manager, Site Engineer, Crew, Procurement, Fleet Manager or Viewer, and control what each role can access.',
  },
  {
    q: 'Can I manage materials and equipment?',
    a: 'Yes. Track material stock levels, deliveries and usage, and manage equipment assignments, availability and maintenance from the same workspace.',
  },
  {
    q: 'Can I manage project documents?',
    a: 'Yes. Upload and organize building plans, site reports, schedules, invoices and contracts so nothing important gets lost.',
  },
] as const;

export function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section aria-labelledby="faq-heading" className="border-t border-border">
      <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6 lg:py-20">
        <Reveal>
          <div id="faq-heading">
            <SectionHeading
              eyebrow="14 — FAQ"
              title="Questions, answered."
              sub="The essentials about what FrameBase does and who it serves."
            />
          </div>
        </Reveal>
        <div className="mt-8 space-y-2.5">
          {FAQS.map((f, i) => {
            const open = openIndex === i;
            return (
              <Reveal key={f.q} delayMs={Math.min(i * 40, 200)}>
                <div className={`overflow-hidden rounded-xl border bg-surface shadow-sm transition-colors ${open ? 'border-[#2563EB]/40' : 'border-border'}`}>
                  <h3>
                    <button
                      type="button"
                      onClick={() => setOpenIndex(open ? null : i)}
                      aria-expanded={open}
                      aria-controls={`faq-panel-${i}`}
                      id={`faq-button-${i}`}
                      className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left text-sm font-semibold text-foreground transition-colors hover:bg-surface-muted/50 sm:px-5"
                    >
                      {f.q}
                      <ChevronDown
                        aria-hidden
                        className={`h-4 w-4 shrink-0 text-foreground-muted transition-transform duration-300 ${open ? 'rotate-180' : ''}`}
                      />
                    </button>
                  </h3>
                  <div
                    id={`faq-panel-${i}`}
                    role="region"
                    aria-labelledby={`faq-button-${i}`}
                    className={`grid transition-all duration-300 ease-out ${open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}
                  >
                    <div className="overflow-hidden">
                      <p className="px-4 pb-4 text-sm leading-6 text-foreground-muted sm:px-5">{f.a}</p>
                    </div>
                  </div>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
