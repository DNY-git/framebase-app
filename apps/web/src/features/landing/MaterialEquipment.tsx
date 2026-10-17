const STOCK_ITEMS = [
  {
    name: 'Dangote 42.5R Cement',
    status: 'Healthy',
    statusClass: 'text-emerald-600 bg-emerald-50',
    value: '1,420',
    valueClass: 'text-stone-900',
    unit: 'bags left',
    barClass: 'bg-emerald-500',
    barWidth: 82,
    trackClass: 'bg-stone-100',
    note: 'Buffer: ~14 days remaining',
    noteClass: 'text-stone-400',
    cardClass: 'bg-white p-4 rounded-lg border border-stone-200',
    pulse: false,
  },
  {
    name: 'TMT 16mm Rebar Steel',
    status: 'Optimal',
    statusClass: 'text-emerald-600 bg-emerald-50',
    value: '38.4',
    valueClass: 'text-stone-900',
    unit: 'tonnes',
    barClass: 'bg-cad-accent',
    barWidth: 64,
    trackClass: 'bg-stone-100',
    note: 'Allocated to Deck 4 & 5',
    noteClass: 'text-stone-400',
    cardClass: 'bg-white p-4 rounded-lg border border-stone-200',
    pulse: false,
  },
  {
    name: 'Sharp Sand Aggregate',
    status: 'Low Buffer',
    statusClass: 'text-amber-700 bg-amber-100',
    value: '18',
    valueClass: 'text-terracotta-600',
    unit: 'tippers (22%)',
    barClass: 'bg-terracotta-500',
    barWidth: 22,
    trackClass: 'bg-stone-200',
    note: 'Reorder required by 4 PM',
    noteClass: 'text-terracotta-600',
    cardClass: 'bg-white p-4 rounded-lg border border-amber-200 bg-amber-50/20',
    pulse: true,
  },
];

const FLEET = [
  {
    id: '#EQ-320',
    equipment: 'CAT 320 Track Excavator',
    location: 'Sector B (Excavation)',
    status: 'Active on Site',
    statusClass: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    dotClass: 'bg-emerald-500',
    runtime: '6.4 hrs',
  },
  {
    id: '#MX-014',
    equipment: 'Schwing Concrete Batch Mixer',
    location: 'Central Yard',
    status: 'Standby / Ready',
    statusClass: 'bg-blue-50 text-blue-700 border border-blue-200',
    dotClass: 'bg-blue-500',
    runtime: '1.2 hrs',
  },
  {
    id: '#GEN-88',
    equipment: 'Perkins 150kVA Generator',
    location: 'Main Power Grid',
    status: 'Service Due in 12h',
    statusClass: 'bg-stone-100 text-stone-600',
    dotClass: null,
    runtime: '11.8 hrs',
  },
];

/** Material & equipment foresight (reference: MaterialEquipmentForesightSection — id="workflow" for the nav anchor). */
export function MaterialEquipment() {
  return (
    <section data-purpose="material-equipment-section" id="workflow" className="py-24 border-stone-200 bg-white">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          {/* Left Text Content */}
          <div className="lg:col-span-4">
            <h2 className="serif-display text-4xl sm:text-5xl text-stone-900 font-normal leading-[1.08]">
              Know what you have before you need it.
            </h2>
            <p className="mt-6 text-stone-600 text-base leading-relaxed">
              Seven capabilities, one workspace. No more jumping between tools to answer simple questions. Prevent
              costly work stoppages with predictive site inventory management.
            </p>
            <div className="mt-8 space-y-4">
              <div className="p-4 rounded-lg border border-stone-200 bg-white">
                <div className="font-bold text-sm text-stone-900">Automated Re-order Alerts</div>
                <p className="text-xs text-stone-500 mt-1">
                  Receive automated SMS &amp; email alerts whenever critical material stockpiles dip below safe buffer
                  thresholds.
                </p>
              </div>
              <div className="p-4 rounded-lg border border-stone-200 bg-white">
                <div className="font-bold text-sm text-stone-900">Equipment GPS &amp; Utilization</div>
                <p className="text-xs text-stone-500 mt-1">
                  Track actual engine run-hours vs idling time across excavators, cranes, and diesel generators.
                </p>
              </div>
            </div>
          </div>
          {/* Right: Interactive Material & Equipment Foresight Hub UI */}
          <div className="lg:col-span-8 border border-stone-200 rounded-2xl p-6 md:p-8 shadow-card-subtle bg-white">
            <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-stone-200">
              <div>
                <span className="text-xs font-mono uppercase tracking-wider text-stone-500">
                  Live Inventory &amp; Heavy Machinery
                </span>
                <h3 className="text-xl font-bold text-stone-900 mt-0.5">Central Yard &amp; Lekki Site Terminal</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="px-3 py-1.5 bg-stone-900 text-white rounded text-xs font-medium hover:bg-stone-800 transition"
                >
                  + Dispatch Reorder
                </button>
              </div>
            </div>
            {/* Material Stock Levels */}
            <div className="mt-6">
              <h4 className="text-xs uppercase font-mono tracking-wider text-stone-400 mb-4">Critical Raw Materials</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {STOCK_ITEMS.map((item) => (
                  <div key={item.name} className={item.cardClass}>
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-medium text-stone-800">{item.name}</span>
                      <span
                        className={`font-mono px-1.5 py-0.5 rounded text-[10px] ${item.statusClass}${
                          item.pulse ? ' animate-pulse' : ''
                        }`}
                      >
                        {item.status}
                      </span>
                    </div>
                    <div className="mt-3 flex items-baseline gap-2">
                      <span className={`text-2xl font-bold font-mono ${item.valueClass}`}>{item.value}</span>
                      <span className="text-xs text-stone-500">{item.unit}</span>
                    </div>
                    <div className={`w-full h-1.5 rounded-full mt-3 overflow-hidden ${item.trackClass}`}>
                      <div className={`h-full rounded-full ${item.barClass}`} style={{ width: `${item.barWidth}%` }} />
                    </div>
                    <div className={`text-[10px] font-mono mt-2 ${item.noteClass}`}>{item.note}</div>
                  </div>
                ))}
              </div>
            </div>
            {/* Heavy Equipment Roster Table */}
            <div className="mt-8">
              <h4 className="text-xs uppercase font-mono tracking-wider text-stone-400 mb-4">
                Plant &amp; Equipment Fleet
              </h4>
              <div className="bg-white rounded-lg border border-stone-200 overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-stone-200 font-mono text-[11px] text-stone-500 bg-white">
                    <tr className="bg-stone-100">
                      <th className="p-3">ASSET ID</th>
                      <th className="p-3">EQUIPMENT</th>
                      <th className="p-3">LOCATION</th>
                      <th className="p-3">OPERATING STATUS</th>
                      <th className="p-3 text-right">RUN-TIME TODAY</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 font-sans">
                    {FLEET.map((row) => (
                      <tr key={row.id}>
                        <td className="p-3 font-mono text-stone-500">{row.id}</td>
                        <td className="p-3 font-medium text-stone-900">{row.equipment}</td>
                        <td className="p-3 text-stone-600">{row.location}</td>
                        <td className="p-3">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono ${row.statusClass}`}
                          >
                            {row.dotClass && <span className={`w-1.5 h-1.5 rounded-full ${row.dotClass}`} />}{' '}
                            {row.status}
                          </span>
                        </td>
                        <td className="p-3 text-right font-mono text-stone-800">{row.runtime}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
