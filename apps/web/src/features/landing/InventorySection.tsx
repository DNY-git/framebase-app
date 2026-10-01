import { Reveal } from './shared';

const STOCK = [
  {
    name: 'Dangote 42.5R Cement',
    badge: 'Healthy',
    badgeTint: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    value: '1,420',
    unit: 'bags',
    valueTint: 'text-stone-900',
    note: 'Buffer: ~14 days remaining',
    bar: 'w-[62%] bg-emerald-500',
    tone: 'border-stone-200 bg-white',
  },
  {
    name: 'TMT 16mm Rebar Steel',
    badge: 'Optimal',
    badgeTint: 'border-blue-200 bg-blue-50 text-cad-blue',
    value: '38.4',
    unit: 'tonnes',
    valueTint: 'text-stone-900',
    note: 'Allocated to Deck 4 & 5',
    bar: 'w-[48%] bg-cad-blue',
    tone: 'border-stone-200 bg-white',
  },
  {
    name: 'Sharp Sand Aggregate',
    badge: 'Low Buffer',
    badgeTint: 'border-amber-200 bg-amber-100 text-amber-700',
    value: '18',
    unit: 'tippers (22%)',
    valueTint: 'text-terracotta-600',
    note: 'Reorder required by 4 PM',
    bar: 'w-[28%] bg-terracotta-500',
    tone: 'border-amber-300 bg-amber-50/40',
  },
] as const;

const FLEET = [
  {
    id: '#EQ-320',
    machine: 'CAT 320 Track Excavator',
    location: 'Sector B (Excavation)',
    status: 'Active on Site',
    pill: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    dot: 'bg-emerald-500',
    runtime: '6.4 hrs',
  },
  {
    id: '#MX-014',
    machine: 'Schwing Concrete Batch Mixer',
    location: 'Central Yard',
    status: 'Standby / Ready',
    pill: 'border-blue-200 bg-blue-50 text-cad-blue',
    dot: 'bg-cad-blue',
    runtime: '1.2 hrs',
  },
  {
    id: '#GEN-88',
    machine: 'Perkins 150kVA Generator',
    location: 'Main Power Grid',
    status: 'Service Due in 12h',
    pill: '',
    dot: '',
    runtime: '11.8 hrs',
  },
] as const;

const SIDE_NOTES = [
  {
    title: 'Automated Re-order Alerts',
    body: 'Receive automated SMS & email alerts whenever critical material stockpiles dip below safe buffer thresholds.',
  },
  {
    title: 'Equipment GPS & Utilization',
    body: 'Track actual engine run-hours vs idling time across excavators, cranes, and diesel generators.',
  },
] as const;

/** "Know what you have before you need it." — stock registry + fleet/plant status. Demo values. */
export function InventorySection() {
  return (
    <section id="inventory" className="border-t border-stone-200 bg-cream py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-[0.47fr_1fr] lg:items-start">
          {/* Copy + capability notes */}
          <Reveal>
            <h2 className="font-display text-4xl font-normal leading-[1.08] text-stone-900 sm:text-5xl">
              Know what you have before you need it.
            </h2>
            <p className="mt-6 text-[15px] leading-relaxed text-stone-600">
              Seven capabilities, one workspace. No more jumping between tools to answer simple questions. Prevent
              costly work stoppages with predictive site inventory management.
            </p>
            <div className="mt-9 space-y-4">
              {SIDE_NOTES.map((n) => (
                <div key={n.title} className="rounded-xl border border-stone-200 bg-white p-5 shadow-card-subtle">
                  <h3 className="text-[14px] font-semibold text-stone-900">{n.title}</h3>
                  <p className="mt-2 text-[13px] leading-relaxed text-stone-500">{n.body}</p>
                </div>
              ))}
            </div>
          </Reveal>

          {/* Live registry panel */}
          <Reveal delayMs={120}>
            <div className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-dashboard">
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-stone-200 bg-stone-50 px-8 py-4">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-stone-500">
                    Live Inventory &amp; Heavy Machinery
                  </p>
                  <h3 className="mt-1.5 text-lg font-semibold text-stone-900">Central Yard &amp; Lekki Site Terminal</h3>
                </div>
                <span className="rounded-md bg-stone-900 px-3.5 py-2 font-mono text-[10px] uppercase tracking-wider text-white">
                  + Dispatch Reorder
                </span>
              </div>

              <p className="px-8 pt-8 font-mono text-[10px] uppercase tracking-[0.18em] text-stone-400">
                Critical Raw Materials
              </p>

              <div className="grid grid-cols-1 gap-4 p-8 sm:grid-cols-3">
                {STOCK.map((s) => (
                  <div key={s.name} className={`rounded-lg border p-4 ${s.tone}`}>
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-[13px] font-semibold text-stone-900">{s.name}</p>
                      <span className={`shrink-0 rounded border px-2 py-0.5 font-mono text-[9.5px] ${s.badgeTint}`}>
                        {s.badge}
                      </span>
                    </div>
                    <p className={`mt-3 text-2xl font-bold ${s.valueTint}`}>
                      {s.value}
                      <span className="ml-1.5 text-xs font-normal text-stone-400">{s.unit}</span>
                    </p>
                    <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-stone-200/70">
                      <div className={`h-full rounded-full ${s.bar}`} />
                    </div>
                    <p className="mt-3 font-mono text-[10px] text-stone-400">{s.note}</p>
                  </div>
                ))}
              </div>


              {/* Plant & equipment fleet */}
              <div className="border-t border-stone-200 p-8">
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-stone-400">
                  Plant &amp; Equipment Fleet
                </p>
                <div className="mt-3 overflow-hidden rounded-lg border border-stone-200">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="bg-stone-50 font-mono text-[10px] uppercase tracking-wider text-stone-400">
                          <th className="whitespace-nowrap px-4 py-2.5 font-medium">Asset ID</th>
                          <th className="px-4 py-2.5 font-medium">Equipment</th>
                          <th className="hidden px-4 py-2.5 font-medium sm:table-cell">Location</th>
                          <th className="whitespace-nowrap px-4 py-2.5 font-medium">Operating Status</th>
                          <th className="whitespace-nowrap px-4 py-2.5 text-right font-medium">Run-time today</th>
                        </tr>
                      </thead>
                      <tbody>
                        {FLEET.map((f) => (
                          <tr key={f.id} className="border-t border-stone-100 bg-white">
                            <td className="whitespace-nowrap px-4 py-3 font-mono text-[11px] text-stone-500">
                              {f.id}
                            </td>
                            <td className="px-4 py-3 font-medium text-stone-900">{f.machine}</td>
                            <td className="hidden px-4 py-3 text-stone-600 sm:table-cell">{f.location}</td>
                            <td className="px-4 py-3">
                              {f.pill ? (
                                <span
                                  className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded border px-2 py-0.5 font-mono text-[9.5px] ${f.pill}`}
                                >
                                  <span className={`h-1.5 w-1.5 rounded-full ${f.dot}`} aria-hidden />
                                  {f.status}
                                </span>
                              ) : (
                                <span className="whitespace-nowrap font-mono text-[10px] text-emerald-700">
                                  {f.status}
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-right font-mono text-[11px] text-stone-700">{f.runtime}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

