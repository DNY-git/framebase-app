import { KeyRound } from 'lucide-react';
import { Reveal } from './shared';

const ROLES = [
  {
    tag: 'Management',
    tint: 'border-blue-200 bg-blue-50 text-cad-blue',
    title: 'Project Owner / CEO',
    body: 'Final spend validation, profit margins and company-wide oversight.',
    access: 'Access: Full control',
  },
  {
    tag: 'Finance',
    tint: 'border-terracotta-500/30 bg-terracotta-500/10 text-terracotta-600',
    title: 'Project Manager',
    body: 'Budget distribution, phase approvals and schedule control.',
    access: 'Access: Project scope',
  },
  {
    tag: 'Site',
    tint: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    title: 'Site Engineer / Foreman',
    body: 'Daily recaps, photo supervision and checklist updates.',
    access: 'Access: Field ops',
  },
  {
    tag: 'Field',
    tint: 'border-amber-200 bg-amber-50 text-amber-700',
    title: 'Quantity Surveyor',
    body: 'Material entries, rebar measurements and valuation takes.',
    access: 'Access: Assigned tasks',
  },
  {
    tag: 'Field',
    tint: 'border-stone-300 bg-stone-100 text-stone-600',
    title: 'Procurement Lead',
    body: 'Supplier quotes, change orders and purchase approvals.',
    access: 'Access: Vendor views',
  },
  {
    tag: 'Office',
    tint: 'border-blue-200 bg-blue-50 text-cad-blue',
    title: 'Subcontractors',
    body: 'Assigned scope, upload proofs and raised tickets only.',
    access: 'Access: Limited views',
  },
] as const;

/** "Everyone has a role. Everyone stays aligned." — single-truth engine card + six role cards. */
export function RolesSection() {
  return (
    <section id="roles" className="bg-white py-24">
      <div className="mx-auto max-w-7xl px-6">
        <Reveal className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-4xl font-normal leading-[1.08] text-stone-900 sm:text-5xl">
            Everyone has a role.
            <span className="block">Everyone stays aligned.</span>
          </h2>
          <p className="mt-5 text-base text-stone-600">
            Each user gets appropriate access and responsibilities &mdash; from the site crew to the business owner.
          </p>
        </Reveal>

        <div className="mt-16 grid grid-cols-1 gap-6 lg:grid-cols-[0.82fr_1.18fr]">
          {/* Single truth engine */}
          <Reveal>
            <div className="flex h-full flex-col justify-between rounded-xl bg-stone-900 p-8 shadow-dashboard">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-terracotta-500">
                  FrameBase Single Source of Truth
                </p>
                <div className="mt-7 flex h-14 w-14 items-center justify-center rounded-lg border border-white/15 bg-white/5 text-white">
                  <KeyRound className="h-6 w-6" strokeWidth={1.5} aria-hidden />
                </div>
                <h3 className="mt-6 text-xl font-semibold text-white">FrameBase Single Truth Engine</h3>
                <p className="mt-2.5 text-[14px] leading-relaxed text-stone-400">
                  Every role sees the same live numbers. No exports, no re-keying, no second version of the truth.
                </p>
              </div>
              <div className="mt-8 flex flex-wrap gap-2 border-t border-white/10 pt-5">
                <span className="rounded border border-white/15 bg-white/5 px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-stone-300">
                  Scoped access
                </span>
                <span className="rounded border border-white/15 bg-white/5 px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-stone-300">
                  Live numbers
                </span>
              </div>
            </div>
          </Reveal>

          {/* Role cards */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            {ROLES.map((r, i) => (
              <Reveal key={r.title} delayMs={i * 50}>
                <div className="flex h-full flex-col rounded-xl border border-stone-200 bg-white p-5 shadow-card-subtle transition hover:-translate-y-0.5 hover:shadow-md">
                  <span
                    className={`self-start rounded border px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.14em] ${r.tint}`}
                  >
                    {r.tag}
                  </span>
                  <h3 className="mt-4 text-[15px] font-semibold text-stone-900">{r.title}</h3>
                  <p className="mt-1.5 flex-1 text-[13px] leading-relaxed text-stone-500">{r.body}</p>
                  <p className="mt-4 border-t border-stone-100 pt-3 font-mono text-[10px] uppercase tracking-wider text-stone-400">
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

