import { Reveal } from './shared';

const STOCK_CARDS = [
  { name: 'Cement (50kg bags)', stock: '1,240', unit: 'bags', trend: '−8% this week', tone: 'text-terracotta-600', pct: 'w-[62%]' },
  { name: 'Rebar Y16 (12m)', stock: '860', unit: 'lengths', trend: '+14% restocked', tone: 'text-emerald-600', pct: 'w-[86%]' },
  { name: 'Sharp Sand (30t loads)', stock: '12', unit: 'loads', trend: 'Reorder in 3 days', tone: 'text-amber-600', pct: 'w-[24%]' },
] as const;

const EQUIPMENT = [
  { asset: 'CAT 320 Excavator', site: 'Road Rehab Ph-2', operator: 'M. Okonkwo', status: 'Deployed', tone: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
  { asset: 'Tower Crane TC-6013', site: 'Lekki Block B', operator: 'Auto-logged', status: 'Deployed', tone: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
  { asset: 'Concrete Mixer 400L', site: 'Central Yard', operator: '—', status: 'Maintenance', tone: 'text-amber-700 bg-amber-50 border-amber-200' },
  { asset: 'Dumper Truck DT-08', site: 'Abuja Complex', operator: 'S. Adeyemi', status: 'In Transit', tone: 'text-cad-blue bg-blue-50 border-blue-200' },
] as const;

/** Materials stock levels + equipment allocation table. Demo values. */
export function InventorySection() {
  return (
    <section id="inventory" className="border-t border-stone-200 bg-cream py-24">
      <div className="mx-auto max-w-7xl px-6">
        <Reveal className="mx-auto max-w-2xl text-center">
          <span className="font-mono text-xs uppercase tracking-widest text-stone-400">Materials &amp; Equipment</span>
          <h2 className="font-display mt-2 text-4xl font-normal text-stone-900 sm:text-5xl">
            Know what you have, where it is, and when it runs out.
          </h2>
          <p className="mt-4 text-base text-stone-600">
            Live stock depletion tracking and equipment allocation across every active site.
          </p>
        </Reveal>

        <div className="mt-14 grid grid-cols-1 gap-5 md:grid-cols-3">
          {STOCK_CARDS.map((s, i) => (
            <Reveal key={s.name} delayMs={i * 60}>
              <div className="rounded-xl border border-stone-200 bg-white p-6 shadow-card-subtle">
                <p className="font-mono text-xs uppercase tracking-wider text-stone-400">{s.name}</p>
                <p className="mt-2 text-3xl font-bold text-stone-900">
                  {s.stock}
                  <span className="ml-1.5 text-sm font-normal text-stone-400">{s.unit}</span>
                </p>
                <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-stone-100">
                  <div className={`h-full rounded-full bg-stone-800 ${s.pct}`} />
                </div>
                <p className={`mt-2.5 font-mono text-[11px] ${s.tone}`}>{s.trend}</p>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal delayMs={120} className="mt-8 overflow-hidden rounded-xl border border-stone-200 bg-white shadow-card-subtle">
          <div className="flex items-center justify-between border-b border-stone-200 bg-stone-50 px-5 py-3">
            <span className="font-mono text-xs uppercase tracking-wider text-stone-500">Equipment Allocation</span>
            <span className="font-mono text-[11px] text-stone-400">4 assets tracked</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-stone-200 font-mono text-[11px] uppercase tracking-wider text-stone-400">
                  <th className="px-5 py-3 font-medium">Asset</th>
                  <th className="px-5 py-3 font-medium">Site</th>
                  <th className="hidden px-5 py-3 font-medium sm:table-cell">Operator</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {EQUIPMENT.map((e) => (
                  <tr key={e.asset} className="border-b border-stone-100 last:border-0">
                    <td className="px-5 py-3 font-medium text-stone-900">{e.asset}</td>
                    <td className="px-5 py-3 text-stone-600">{e.site}</td>
                    <td className="hidden px-5 py-3 text-stone-600 sm:table-cell">{e.operator}</td>
                    <td className="px-5 py-3">
                      <span className={`rounded border px-2 py-0.5 font-mono text-[11px] uppercase ${e.tone}`}>{e.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
