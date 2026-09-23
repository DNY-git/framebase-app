import { Lock } from 'lucide-react';
import { Reveal } from './shared';

const ROLES = [
  { name: 'Company Admin', access: 'Full Control', desc: 'Provisioning, global budgets, and cross-project permissions.' },
  { name: 'Project Manager', access: 'Project Scope', desc: 'Schedules, task assignment, phase approvals, and RFIs.' },
  { name: 'Site Engineer', access: 'Field Ops', desc: 'Daily logs, photo QA, inspections, and punchlist execution.' },
  { name: 'Subcontractor', access: 'Scope-Limited', desc: 'Only their tasks, uploads, and payment claims. Zero budget visibility.' },
  { name: 'Accountant', access: 'Financials', desc: 'Invoices, expense reconciliation, and valuation certificates.' },
  { name: 'Client / Owner', access: 'Read-Only', desc: 'Live progress dashboards, milestones, and spend summaries.' },
] as const;

const PERMISSIONS = [
  { role: 'Admin', budget: true, edit: true, approve: true },
  { role: 'Project Manager', budget: true, edit: true, approve: true },
  { role: 'Site Engineer', budget: false, edit: true, approve: false },
  { role: 'Subcontractor', budget: false, edit: true, approve: false },
  { role: 'Client', budget: 'summary', edit: false, approve: false },
] as const;

function Perm({ state }: { state: boolean | string }) {
  if (state === 'summary') return <span className="font-mono text-[11px] text-cad-blue">Summary</span>;
  return state ? (
    <span className="font-mono text-[11px] text-emerald-600">Yes</span>
  ) : (
    <span className="font-mono text-[11px] text-stone-300">—</span>
  );
}

export function RolesSection() {
  return (
    <section id="roles" className="bg-white py-24">
      <div className="mx-auto max-w-7xl px-6">
        <Reveal className="mx-auto max-w-2xl text-center">
          <span className="font-mono text-xs uppercase tracking-widest text-stone-400">Role-Based Access</span>
          <h2 className="font-display mt-2 text-4xl font-normal text-stone-900 sm:text-5xl">
            Everyone sees exactly what they should. Nothing more.
          </h2>
          <p className="mt-4 text-base text-stone-600">
            FrameBase enforces granular RBAC at the database layer — subcontractors never glimpse your margins.
          </p>
        </Reveal>

        {/* RBAC permission matrix */}
        <Reveal delayMs={120} className="mx-auto mt-14 max-w-3xl overflow-hidden rounded-xl border border-stone-200 bg-white shadow-card-subtle">
          <div className="flex items-center gap-2 border-b border-stone-200 bg-stone-50 px-5 py-3">
            <Lock className="h-4 w-4 text-stone-500" aria-hidden />
            <span className="font-mono text-xs uppercase tracking-wider text-stone-500">Permission Matrix</span>
          </div>
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-stone-200 font-mono text-[11px] uppercase tracking-wider text-stone-400">
                <th className="px-5 py-3 font-medium">Role</th>
                <th className="px-5 py-3 font-medium">View Budget</th>
                <th className="px-5 py-3 font-medium">Edit Records</th>
                <th className="px-5 py-3 font-medium">Approve Spend</th>
              </tr>
            </thead>
            <tbody>
              {PERMISSIONS.map((p) => (
                <tr key={p.role} className="border-b border-stone-100 last:border-0">
                  <td className="px-5 py-3 font-medium text-stone-900">{p.role}</td>
                  <td className="px-5 py-3"><Perm state={p.budget} /></td>
                  <td className="px-5 py-3"><Perm state={p.edit} /></td>
                  <td className="px-5 py-3"><Perm state={p.approve} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Reveal>

        <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {ROLES.map((r, i) => (
            <Reveal key={r.name} delayMs={i * 60}>
              <div className="h-full rounded-xl border border-stone-200 bg-white p-6 shadow-card-subtle transition hover:-translate-y-0.5 hover:shadow-md">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-stone-900">{r.name}</h3>
                  <span className="rounded border border-stone-200 bg-stone-50 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-stone-500">
                    {r.access}
                  </span>
                </div>
                <p className="mt-2 text-[13px] leading-relaxed text-stone-500">{r.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
