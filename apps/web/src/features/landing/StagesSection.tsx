import type { ReactNode } from 'react';
import { Reveal } from './shared';

interface Stage {
  stage: string;
  tag: string;
  title: string;
  body: string;
  hover: string;
  visual: ReactNode;
}

const STAGES: Stage[] = [
  {
    stage: 'Stage 01',
    tag: 'BOQ & Arch',
    title: 'Planning & Feasibility',
    body: 'Turn preliminary sketches and BOQs into locked work packages with structured line-item cost estimates.',
    hover: 'group-hover:bg-blue-50/20',
    visual: (
      <>
        <svg className="h-full w-full text-stone-400" fill="none" viewBox="0 0 200 120" aria-hidden>
          {/* Drafting grid */}
          <line stroke="#EAE7DE" strokeWidth="0.75" x1="10" x2="190" y1="20" y2="20" />
          <line stroke="#EAE7DE" strokeWidth="0.75" x1="10" x2="190" y1="50" y2="50" />
          <line stroke="#EAE7DE" strokeWidth="0.75" x1="10" x2="190" y1="80" y2="80" />
          <line stroke="#EAE7DE" strokeWidth="0.75" x1="10" x2="190" y1="110" y2="110" />
          {/* Architectural walls layout */}
          <rect fill="none" height="70" stroke="#141412" strokeWidth="1.5" width="150" x="25" y="30" />
          <line stroke="#141412" strokeWidth="1.2" x1="85" x2="85" y1="30" y2="100" />
          <line stroke="#141412" strokeWidth="1.2" x1="85" x2="175" y1="65" y2="65" />
          {/* Dimension line & ruler ticks */}
          <path d="M25,24 L175,24" stroke="#2B59C3" strokeWidth="1" />
          <path d="M25,20 L25,28 M175,20 L175,28" stroke="#2B59C3" strokeWidth="1" />
          <text fill="#2B59C3" fontFamily="monospace" fontSize="8" x="85" y="19">
            14,250 mm
          </text>
          {/* Door swing */}
          <path d="M85,80 A18,18 0 0,1 103,98" fill="none" stroke="#E25C38" strokeDasharray="2 2" strokeWidth="1.2" />
        </svg>
        <div className="flex items-center justify-between border-t border-stone-100 pt-2 font-mono text-[10px] text-stone-500">
          <span>Status: Approved</span>
          <span className="text-cad-blue">Rev 3.2</span>
        </div>
      </>
    ),
  },
  {
    stage: 'Stage 02',
    tag: 'PO & Vendors',
    title: 'Procurement & Tenders',
    body: 'Direct vendor bid comparisons, multi-level approvals, and automated purchase orders linked to site stages.',
    hover: 'group-hover:bg-amber-50/20',
    visual: (
      <>
        <div className="space-y-2">
          <div className="flex items-center justify-between border-b border-stone-200 pb-1.5 font-mono text-[10px]">
            <span className="text-stone-500">SUPPLIER</span>
            <span className="text-stone-500">QUOTE</span>
            <span className="text-stone-500">VARIANCE</span>
          </div>
          {[
            { name: 'Apex Steel Ltd', quote: '$48,200', variance: '-4.2%', tone: 'text-emerald-600' },
            { name: 'Holcim Supply', quote: '$51,400', variance: '+2.1%', tone: 'text-terracotta-500' },
            { name: 'Prestige Aggregate', quote: '$49,150', variance: '0.0%', tone: 'text-stone-400' },
          ].map((r) => (
            <div key={r.name} className="flex items-center justify-between text-xs">
              <span className="font-medium text-stone-800">{r.name}</span>
              <span className="font-mono text-stone-900">{r.quote}</span>
              <span className={`font-mono text-[11px] ${r.tone}`}>{r.variance}</span>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between rounded border border-emerald-200 bg-emerald-50 p-1.5 font-mono text-[10px]">
          <span className="text-emerald-700">Lowest Tender Selected</span>
          <span className="font-bold text-emerald-800">PO #8921-A</span>
        </div>
      </>
    ),
  },
  {
    stage: 'Stage 03',
    tag: 'Site Logs',
    title: 'Active Site Execution',
    body: 'Daily crew rosters, crane schedule, concrete pouring records, and instant weather delay logs.',
    hover: 'group-hover:bg-emerald-50/20',
    visual: (
      <>
        <div className="flex items-center justify-between text-[11px]">
          <span className="flex items-center gap-1.5 font-medium text-stone-800">
            <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden /> Pour in Progress
          </span>
          <span className="font-mono text-stone-500">Deck 4 / 65m³</span>
        </div>
        <div className="py-1">
          <div className="mb-1 flex justify-between font-mono text-[10px] text-stone-400">
            <span>Slump Test: 120mm Passed</span>
            <span>Batch #32</span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-stone-100">
            <div className="h-full w-[78%] rounded-full bg-stone-800" />
          </div>
        </div>
        <div className="flex items-center justify-between border-t border-stone-100 pt-2 font-mono text-[10px] text-stone-500">
          <span>Crew: 18 Site Workers</span>
          <span className="font-bold text-stone-700">Safety Log: Clear</span>
        </div>
      </>
    ),
  },
  {
    stage: 'Stage 04',
    tag: 'Handover',
    title: 'Punchlist & Handover',
    body: 'As-built drawing archives, final snagging photo approvals, warranties, and building occupancy compliance.',
    hover: 'group-hover:bg-purple-50/20',
    visual: (
      <>
        <div className="space-y-1.5">
          {['HVAC Pressure Validation', 'Fire Suppression Signoff', 'Electrical Load Balance'].map((item) => (
            <div key={item} className="flex items-center justify-between text-[11px] text-stone-700">
              <span className="flex items-center gap-1.5">
                <svg className="h-3.5 w-3.5 text-emerald-600" fill="currentColor" viewBox="0 0 20 20" aria-hidden>
                  <path
                    clipRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    fillRule="evenodd"
                  />
                </svg>
                {item}
              </span>
              <span className="font-mono text-[9px] text-stone-400">PASS</span>
            </div>
          ))}
        </div>
        <div className="mt-2 rounded border border-dashed border-stone-300 bg-stone-50 p-1.5 text-center">
          <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-stone-700">
            Ready for Client Handover
          </span>
        </div>
      </>
    ),
  },
];

/** The four-stage project lifecycle: plan, procure, execute, hand over. */
export function StagesSection() {
  return (
    <section id="stages" className="border-t border-stone-200 bg-white py-24">
      <div className="mx-auto max-w-7xl px-6">
        <Reveal className="mx-auto mb-16 max-w-3xl text-center">
          <h2 className="font-display text-4xl font-normal text-stone-900 sm:text-5xl md:text-6xl">
            From project idea to completed build.
          </h2>
          <p className="mt-4 text-base text-stone-500 md:text-lg">
            Four stages, one continuous flow. Every stage feeds the next; nothing gets re-entered.
          </p>
        </Reveal>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          {STAGES.map((s, i) => (
            <Reveal key={s.stage} delayMs={i * 90}>
              <article className="group flex h-full flex-col justify-between rounded-xl border border-stone-200 bg-white p-6 shadow-card-subtle transition-all hover:border-stone-400">
                <div>
                  <div className="mb-4 flex items-center justify-between">
                    <span className="rounded bg-stone-200/80 px-2 py-0.5 font-mono text-xs uppercase text-stone-700">
                      {s.stage}
                    </span>
                    <span className="font-mono text-xs text-stone-400">{s.tag}</span>
                  </div>
                  <h3 className="mb-2 text-lg font-bold text-stone-900">{s.title}</h3>
                  <p className="mb-6 text-xs leading-relaxed text-stone-600">{s.body}</p>
                </div>
                <div
                  className={`relative flex h-44 w-full flex-col justify-between overflow-hidden rounded-lg border border-stone-200/90 bg-white p-3 transition-colors ${s.hover}`}
                >
                  {s.visual}
                </div>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
