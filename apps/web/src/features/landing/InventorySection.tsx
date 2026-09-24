import { BellRing, MapPin } from 'lucide-react';
import { Reveal } from './shared';

const STOCK = [
  {
    name: 'Cement (42.5R)',
    kind: 'Cement',
    value: '1,420',
    unit: 'bags',
    note: '12% below threshold',
    chip: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    bar: 'w-[62%] bg-emerald-500',
  },
  {
    name: 'Y16 Steel Bars',
    kind: 'Rebar',
    value: '38.4',
    unit: 'tonnes',
    note: '17% stock left',
    chip: 'border-amber-200 bg-amber-50 text-amber-700',
    bar: 'w-[45%] bg-amber-500',
  },
  {
    name: 'Sharp Sand',
    kind: 'Aggregate',
    value: '18',
    unit: 'loads',
    note: '22% running low',
    chip: 'border-terracotta-500/30 bg-terracotta-500/10 text-terracotta-600',
    bar: 'w-[28%] bg-terracotta-500',
  },
] as const;

const FLEET = [
  {
    id: 'EXC-001',
    machine: 'CAT 320 Excavator',
    location: 'Lekki Site B',
    status: 'Routine active',
    dot: 'bg-emerald-500',
    tone: 'text-emerald-700',
    rate: '$85.0 / hr',
  },
  {
    id: 'EXC-014',
    machine: 'Sonny Excavator Plant',
    location: 'Central Yard',
    status: 'Limited usage',
    dot: 'bg-amber-500',
    tone: 'text-amber-700',
    rate: '$72.0 / hr',
  },
  {
    id: 'TRK-092',
    machine: 'Tipper Truck',
    location: 'Abuja Power Grid',
    status: 'Operational',
    dot: 'bg-cad-blue',
    tone: 'text-cad-blue',
    rate: '$35.0 / hr',
  },
] as const;

const SIDE_NOTES = [
  {
    icon: BellRing,
    title: 'Automated Re-order Alerts',
    body: 'Threshold rules raise a purchase order before stock hits zero.',
  },
  {
    icon: MapPin,
    title: 'Equipment GPS & Utilization',
    body: 'Track usage hours, idle time and rental burn per active site.',
  },
] as const;

/** "Know what you have before you need it." — stock registry + fleet/plant status. Demo values. */
export function InventorySection() {
  return (
    <section id="inventory" className="border-t border-stone-200 bg-cream py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-[0.86fr_1.14fr] lg:items-start">
          {/* Copy + capability notes */}
          <Reveal>
            <h2 className="font-display text-4xl font-normal leading-[1.08] text-stone-900 sm:text-5xl">
              Know what you have before you need it.
            </h2>
            <p className="mt-6 text-[15px] leading-relaxed text-stone-600">
              Seven capabilities, one workspace. No more jumping between tools to answer simple questions. Prevent
              costly work stoppages with proactive site inventory management.
            </p>
            <div className="mt-9 space-y-4">
              {SIDE_NOTES.map((n) => (
                <div key={n.title} className="rounded-xl border border-stone-200 bg-white p-5 shadow-card-subtle">
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-md border border-stone-200 bg-stone-50 text-stone-600">
                      <n.icon className="h-4 w-4" strokeWidth={1.6} aria-hidden />
                    </span>
                    <h3 className="text-[14px] font-semibold text-stone-900">{n.title}</h3>
                  </div>
                  <p className="mt-2.5 text-[13px] leading-relaxed text-stone-500">{n.body}</p>
                </div>
              ))}
            </div>
          </Reveal>

          {/* Live registry panel */}
          <Reveal delayMs={120}>
            <div className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-dashboard">
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-stone-200 bg-stone-50 px-5 py-4">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-stone-500">
                    Live Inventory &amp; Gear Registry
                  </p>
                  <h3 className="mt-1.5 text-lg font-semibold text-stone-900">Central Yard &amp; Lekki Site Terminal</h3>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded-md bg-stone-900 px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-white">
                    Sync Registry
                  </span>
                  <span className="rounded-md border border-stone-300 bg-white px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-stone-600">
                    Bulk Import
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-3">
                {STOCK.map((s) => (
                  <div key={s.name} className="rounded-lg border border-stone-200 bg-white p-4">
                    <p className="text-[13px] font-semibold text-stone-900">{s.name}</p>
                    <p className="font-mono text-[10px] uppercase tracking-wider text-stone-400">{s.kind}</p>
                    <p className="mt-3 text-2xl font-bold text-stone-900">
                      {s.value}
                      <span className="ml-1.5 text-xs font-normal text-stone-400">{s.unit}</span>
                    </p>
                    <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-stone-100">
                      <div className={`h-full rounded-full ${s.bar}`} />
                    </div>
                    <span className={`mt-3 inline-block rounded border px-2 py-0.5 font-mono text-[10px] ${s.chip}`}>
                      {s.note}
                    </span>
                  </div>
                ))}
              </div>


              {/* Fleet & plant status */}
              <div className="border-t border-stone-200">
                <div className="flex items-center justify-between px-5 py-3">
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-stone-500">Fleet &amp; Plant Status</p>
                  <span className="font-mono text-[10px] text-stone-400">3 assets on rent</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-y border-stone-200 bg-white font-mono text-[10px] uppercase tracking-wider text-stone-400">
                        <th className="whitespace-nowrap px-5 py-2.5 font-medium">Asset ID</th>
                        <th className="px-5 py-2.5 font-medium">Equipment</th>
                        <th className="hidden px-5 py-2.5 font-medium sm:table-cell">Location</th>
                        <th className="whitespace-nowrap px-5 py-2.5 font-medium">Operator Status</th>
                        <th className="whitespace-nowrap px-5 py-2.5 text-right font-medium">Rate / Hour</th>
                      </tr>
                    </thead>
                    <tbody>
                      {FLEET.map((f) => (
                        <tr key={f.id} className="border-b border-stone-100 last:border-0">
                          <td className="px-5 py-3 font-mono text-[11px] text-stone-500">{f.id}</td>
                          <td className="px-5 py-3 font-medium text-stone-900">{f.machine}</td>
                          <td className="hidden px-5 py-3 text-stone-600 sm:table-cell">{f.location}</td>
                          <td className="px-5 py-3">
                            <span className={`inline-flex items-center gap-1.5 whitespace-nowrap font-mono text-[10px] uppercase tracking-wider ${f.tone}`}>
                              <span className={`h-1.5 w-1.5 rounded-full ${f.dot}`} aria-hidden />
                              {f.status}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-right font-mono text-[11px] text-stone-700">{f.rate}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

