import { Shield } from '../../shared/components/icons';
import { SectionHeading, Reveal } from './shared';

const ROLES = [
  { title: 'Admin', text: 'Full control over workspace and settings.' },
  { title: 'Project Manager', text: 'Schedules, budgets and teams.' },
  { title: 'Site Engineer', text: 'Site activities and task execution.' },
  { title: 'Crew', text: 'Assigned work, progress updates.' },
  { title: 'Procurement', text: 'Materials, suppliers and purchasing.' },
  { title: 'Fleet Manager', text: 'Equipment and maintenance.' },
  { title: 'Viewer', text: 'Read-only visibility for stakeholders.' },
] as const;

export function RolesSection() {
  return (
    <section aria-labelledby="roles-heading" className="border-t border-border">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:py-20">
        <Reveal>
          <div id="roles-heading">
            <SectionHeading
              eyebrow="06 — Collaboration"
              title="Everyone has a role. Everyone stays aligned."
              sub="Each user gets appropriate access and responsibilities — from the site crew to the business owner."
            />
          </div>
        </Reveal>

        <div className="mt-10 grid items-start gap-6 lg:grid-cols-5">
          <Reveal className="lg:col-span-2">
            <div className="relative overflow-hidden rounded-xl bg-[#0B1020] p-6 text-white shadow-sm sm:p-8">
              <div aria-hidden className="absolute inset-0 opacity-20">
                <svg preserveAspectRatio="xMidYMid slice" className="h-full w-full">
                  <defs>
                    <pattern id="roles-grid" width="36" height="36" patternUnits="userSpaceOnUse">
                      <path d="M 36 0 L 0 0 0 36" fill="none" stroke="white" strokeWidth="1" />
                    </pattern>
                  </defs>
                  <rect width="100%" height="100%" fill="url(#roles-grid)" />
                  <circle cx="50%" cy="42%" r="90" fill="none" stroke="#F97316" strokeWidth="1.5" opacity="0.7" />
                  <circle cx="50%" cy="42%" r="130" fill="none" stroke="white" strokeWidth="1" opacity="0.4" strokeDasharray="6 6" />
                </svg>
              </div>
              <div className="relative text-center">
                <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-white/60">Central</p>
                <div className="mx-auto mt-3 flex h-24 w-24 items-center justify-center rounded-2xl bg-[#2563EB] shadow-lg">
                  <span className="text-sm font-bold tracking-wide">PROJECT</span>
                </div>
                <div aria-hidden className="mx-auto mt-2 h-10 w-px bg-gradient-to-b from-[#F97316] to-transparent" />
                <div className="mx-auto grid max-w-xs grid-cols-2 gap-2">
                  {['PM', 'Engineer', 'Procure', 'Crew'].map((r) => (
                    <span key={r} className="rounded-lg border border-white/20 bg-white/5 px-2 py-1.5 font-mono text-[10px] uppercase tracking-wider text-white/90">
                      {r}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </Reveal>

          <ul className="grid gap-3 sm:grid-cols-2 lg:col-span-3">
            {ROLES.map((r, i) => (
              <li key={r.title}>
                <Reveal delayMs={Math.min(i * 50, 250)}>
                  <div className="flex h-full items-start gap-3 rounded-xl border border-border bg-surface p-4 shadow-sm">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#2563EB]/10 text-[#2563EB]">
                      <Shield className="h-4 w-4" aria-hidden />
                    </span>
                    <div>
                      <h3 className="text-sm font-semibold text-foreground">{r.title}</h3>
                      <p className="mt-0.5 text-xs leading-5 text-foreground-muted">{r.text}</p>
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
