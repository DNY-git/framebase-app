import logoMark from '../../assets/logo-mark-dark.svg';
import { Reveal } from './shared';

const ROLES = [
  {
    tag: 'Executive',
    dot: 'bg-terracotta-500',
    title: 'Project Owner / CEO',
    body: 'Full portfolio ROI, budget release signoff, macro burn rates.',
    access: 'Full read & write access',
  },
  {
    tag: 'Management',
    dot: 'bg-emerald-500',
    title: 'Project Manager',
    body: 'Gantt scheduling, contractor milestone approvals, risk logs.',
    access: 'Milestone & task authority',
  },
  {
    tag: 'Jobsite',
    dot: 'bg-cad-blue',
    title: 'Site Engineer / Foreman',
    body: 'Mobile daily logs, material intake, worker headcount check-in.',
    access: 'Site operations only',
  },
  {
    tag: 'Finance',
    dot: 'bg-amber-500',
    title: 'Quantity Surveyor',
    body: 'BOQ tracking, valuation claims, material variance reports.',
    access: 'Cost & billing audit',
  },
  {
    tag: 'Logistics',
    dot: 'bg-violet-500',
    title: 'Procurement Lead',
    body: 'Vendor tenders, delivery manifests, warehouse inventory dispatch.',
    access: 'Supplier & PO hub',
  },
  {
    tag: 'Partner',
    dot: 'bg-stone-400',
    title: 'Subcontractors',
    body: 'Assigned work orders, snagging resolution photos, submission only.',
    access: 'Restricted scope view',
  },
] as const;

/** "Everyone has a role. Everyone stays aligned." — single-truth engine card + six role cards. */
export function RolesSection() {
  return (
    <section id="roles" className="bg-cream py-24">
      <div className="mx-auto max-w-7xl px-6">
        <Reveal className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-4xl font-normal leading-[1.08] text-stone-900 sm:text-5xl lg:text-[56px] lg:leading-[1.07]">
            Everyone has a role.
            <span className="block">Everyone stays aligned.</span>
          </h2>
          <p className="mt-5 text-base text-stone-600">
            Each user gets appropriate access and responsibilities &mdash; from the site crew to the business owner.
          </p>
        </Reveal>

        <div className="mt-16 grid grid-cols-1 gap-6 rounded-2xl border border-stone-200 bg-white p-8 shadow-card-subtle lg:grid-cols-[0.48fr_1fr] lg:gap-8 lg:p-12">
          {/* Single truth engine */}
          <Reveal>
            <div className="flex h-full items-center justify-center rounded-xl border border-stone-200 bg-white p-8">
              <div className="text-center">
                <span className="relative mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-stone-900 shadow-dashboard">
                  <img src={logoMark} alt="" draggable={false} className="h-9 w-9 object-contain" />
                  <span
                    aria-hidden
                    className="absolute -right-1.5 -top-1.5 h-4 w-4 rounded-full border-2 border-white bg-terracotta-500"
                  />
                </span>
                <h3 className="mt-6 text-lg font-bold text-stone-900">FrameBase Single Truth Engine</h3>
                <p className="mt-1.5 text-[13.5px] text-stone-500">Granular Role-Based Access Control</p>
                <span className="mt-6 inline-flex items-center gap-2 rounded-full border border-stone-200 bg-white px-3.5 py-1.5 font-mono text-[10.5px] uppercase tracking-wider text-stone-600">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden />
                  256-bit Row Level Security
                </span>
              </div>
            </div>
          </Reveal>

          {/* Role cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {ROLES.map((r, i) => (
              <Reveal key={r.title} delayMs={i * 50}>
                <div className="flex h-full flex-col rounded-lg border border-stone-200 bg-white p-4 shadow-card-subtle transition hover:border-stone-300">
                  <div className="flex items-center justify-between gap-3">
                    <span className="rounded border border-stone-200 bg-stone-50 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.14em] text-stone-500">
                      {r.tag}
                    </span>
                    <span className={`h-2 w-2 shrink-0 rounded-full ${r.dot}`} aria-hidden />
                  </div>
                  <h4 className="mt-2 text-[15px] font-bold text-stone-900">{r.title}</h4>
                  <p className="mt-1 flex-1 text-[12px] leading-[16px] text-stone-500">{r.body}</p>
                  <p className="mt-2 border-t border-stone-100 pt-3 font-mono text-[9.5px] uppercase tracking-[0.12em] text-terracotta-600">
                    {r.access}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
