/** Four stages (reference: ProjectStagesSection, id="stages") — four cards with inline SVG/UI mock art. */
export function FourStages() {
  return (
    <section data-purpose="four-stages-section" id="stages" className="py-24 border-stone-200 bg-white">
      <div className="max-w-7xl mx-auto px-6">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="serif-display text-4xl sm:text-5xl md:text-6xl text-stone-900 font-normal">
            From project idea to completed build.
          </h2>
          <p className="mt-4 text-stone-500 text-base md:text-lg">
            Four stages, one continuous flow. Every stage feeds the next; nothing gets re-entered.
          </p>
        </div>
        {/* 4 Stage Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Stage 01: Planning & Feasibility */}
          <div className="border border-stone-200 rounded-xl p-6 flex flex-col justify-between hover:border-stone-400 transition-all shadow-card-subtle group bg-white">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="font-mono text-xs uppercase px-2 py-0.5 bg-stone-200/80 rounded text-stone-700">
                  Stage 01
                </span>
                <span className="text-xs font-mono text-stone-400">BOQ &amp; Arch</span>
              </div>
              <h3 className="text-lg font-bold text-stone-900 mb-2">Planning &amp; Feasibility</h3>
              <p className="text-xs text-stone-600 leading-relaxed mb-6">
                Turn preliminary sketches and BOQs into locked work packages with structured line-item cost estimates.
              </p>
            </div>
            {/* Architectural Blueprint SVG Illustration */}
            <div className="w-full h-44 bg-white rounded-lg border border-stone-200/90 p-3 flex flex-col justify-between relative overflow-hidden group-hover:bg-blue-50/20 transition-colors">
              <svg className="w-full h-full text-stone-400" fill="none" viewBox="0 0 200 120" aria-hidden="true">
                {/* Drafting Grid */}
                <line stroke="#EAE7DE" strokeWidth="0.75" x1="10" x2="190" y1="20" y2="20" />
                <line stroke="#EAE7DE" strokeWidth="0.75" x1="10" x2="190" y1="50" y2="50" />
                <line stroke="#EAE7DE" strokeWidth="0.75" x1="10" x2="190" y1="80" y2="80" />
                <line stroke="#EAE7DE" strokeWidth="0.75" x1="10" x2="190" y1="110" y2="110" />
                {/* Architectural walls layout */}
                <rect fill="none" height="70" stroke="#141412" strokeWidth="1.5" width="150" x="25" y="30" />
                <line stroke="#141412" strokeWidth="1.2" x1="85" x2="85" y1="30" y2="100" />
                <line stroke="#141412" strokeWidth="1.2" x1="85" x2="175" y1="65" y2="65" />
                {/* Dimension arc & ruler tick */}
                <path d="M25,24 L175,24" stroke="#2B59C3" strokeWidth="1" />
                <path d="M25,20 L25,28 M175,20 L175,28" stroke="#2B59C3" strokeWidth="1" />
                <text fill="#2B59C3" fontFamily="monospace" fontSize="8" x="85" y="19">
                  14,250 mm
                </text>
                {/* Door swing */}
                <path d="M85,80 A18,18 0 0,1 103,98" fill="none" stroke="#E25C38" strokeDasharray="2 2" strokeWidth="1.2" />
              </svg>
              <div className="flex items-center justify-between text-[10px] font-mono text-stone-500 border-t border-stone-100 pt-2">
                <span>Status: Approved</span>
                <span className="text-cad-blue">Rev 3.2</span>
              </div>
            </div>
          </div>
          {/* Stage 02: Procurement & Tenders */}
          <div className="border border-stone-200 rounded-xl p-6 flex flex-col justify-between hover:border-stone-400 transition-all shadow-card-subtle group bg-white">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="font-mono text-xs uppercase px-2 py-0.5 bg-stone-200/80 rounded text-stone-700">
                  Stage 02
                </span>
                <span className="text-xs font-mono text-stone-400">PO &amp; Vendors</span>
              </div>
              <h3 className="text-lg font-bold text-stone-900 mb-2">Procurement &amp; Tenders</h3>
              <p className="text-xs text-stone-600 leading-relaxed mb-6">
                Direct vendor bid comparisons, multi-level approvals, and automated purchase orders linked to site
                stages.
              </p>
            </div>
            {/* Procurement Quotation Table SVG Graphic */}
            <div className="w-full h-44 bg-white rounded-lg border border-stone-200/90 p-3 flex flex-col justify-between group-hover:bg-amber-50/20 transition-colors">
              <div className="space-y-2">
                <div className="flex justify-between items-center pb-1.5 border-b border-stone-200 text-[10px] font-mono">
                  <span className="text-stone-500">SUPPLIER</span>
                  <span className="text-stone-500">QUOTE</span>
                  <span className="text-stone-500">VARIANCE</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="font-medium text-stone-800">Apex Steel Ltd</span>
                  <span className="font-mono text-stone-900">$48,200</span>
                  <span className="font-mono text-emerald-600 text-[11px]">-4.2%</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="font-medium text-stone-800">Holcim Supply</span>
                  <span className="font-mono text-stone-900">$51,400</span>
                  <span className="font-mono text-terracotta-500 text-[11px]">+2.1%</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="font-medium text-stone-800">Prestige Aggregate</span>
                  <span className="font-mono text-stone-900">$49,150</span>
                  <span className="font-mono text-stone-400 text-[11px]">0.0%</span>
                </div>
              </div>
              <div className="bg-emerald-50 rounded p-1.5 border border-emerald-200 flex items-center justify-between text-[10px] font-mono">
                <span className="text-emerald-700">Lowest Tender Selected</span>
                <span className="font-bold text-emerald-800">PO #8921-A</span>
              </div>
            </div>
          </div>
          {/* Stage 03: Active Site Execution */}
          <div className="border border-stone-200 rounded-xl p-6 flex flex-col justify-between hover:border-stone-400 transition-all shadow-card-subtle group bg-white">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="font-mono text-xs uppercase px-2 py-0.5 bg-stone-200/80 rounded text-stone-700">
                  Stage 03
                </span>
                <span className="text-xs font-mono text-stone-400">Site Logs</span>
              </div>
              <h3 className="text-lg font-bold text-stone-900 mb-2">Active Site Execution</h3>
              <p className="text-xs text-stone-600 leading-relaxed mb-6">
                Daily crew rosters, crane schedule, concrete pouring records, and instant weather delay logs.
              </p>
            </div>
            {/* Site Execution Crane / Concrete Pour UI Card */}
            <div className="w-full h-44 bg-white rounded-lg border border-stone-200/90 p-3 flex flex-col justify-between group-hover:bg-emerald-50/20 transition-colors">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-medium text-stone-800 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" /> Pour in Progress
                </span>
                <span className="font-mono text-stone-500">Deck 4 / 65m³</span>
              </div>
              <div className="py-1">
                <div className="flex justify-between text-[10px] font-mono text-stone-400 mb-1">
                  <span>Slump Test: 120mm Passed</span>
                  <span>Batch #32</span>
                </div>
                <div className="w-full bg-stone-100 h-2.5 rounded-full overflow-hidden">
                  <div className="bg-stone-800 h-full rounded-full" style={{ width: '78%' }} />
                </div>
              </div>
              <div className="border-t border-stone-100 pt-2 flex items-center justify-between text-[10px] font-mono text-stone-500">
                <span>Crew: 18 Site Workers</span>
                <span className="text-stone-700 font-bold">Safety Log: Clear</span>
              </div>
            </div>
          </div>
          {/* Stage 04: Punchlist & Handover */}
          <div className="border border-stone-200 rounded-xl p-6 flex flex-col justify-between hover:border-stone-400 transition-all shadow-card-subtle group bg-white">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="font-mono text-xs uppercase px-2 py-0.5 bg-stone-200/80 rounded text-stone-700">
                  Stage 04
                </span>
                <span className="text-xs font-mono text-stone-400">Handover</span>
              </div>
              <h3 className="text-lg font-bold text-stone-900 mb-2">Punchlist &amp; Handover</h3>
              <p className="text-xs text-stone-600 leading-relaxed mb-6">
                As-built drawing archives, final snagging photo approvals, warranties, and building occupancy compliance.
              </p>
            </div>
            {/* Snagging Checklist & Certificate Stamp */}
            <div className="w-full h-44 bg-white rounded-lg border border-stone-200/90 p-3 flex flex-col justify-between group-hover:bg-purple-50/20 transition-colors relative">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px] text-stone-700">
                  <span className="flex items-center gap-1.5">
                    <svg
                      className="w-3.5 h-3.5 text-emerald-600"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                      aria-hidden="true"
                    >
                      <path
                        clipRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        fillRule="evenodd"
                      />
                    </svg>
                    HVAC Pressure Validation
                  </span>
                  <span className="font-mono text-[9px] text-stone-400">PASS</span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-stone-700">
                  <span className="flex items-center gap-1.5">
                    <svg
                      className="w-3.5 h-3.5 text-emerald-600"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                      aria-hidden="true"
                    >
                      <path
                        clipRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        fillRule="evenodd"
                      />
                    </svg>
                    Fire Suppression Signoff
                  </span>
                  <span className="font-mono text-[9px] text-stone-400">PASS</span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-stone-700">
                  <span className="flex items-center gap-1.5">
                    <svg
                      className="w-3.5 h-3.5 text-emerald-600"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                      aria-hidden="true"
                    >
                      <path
                        clipRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        fillRule="evenodd"
                      />
                    </svg>
                    Electrical Load Balance
                  </span>
                  <span className="font-mono text-[9px] text-stone-400">PASS</span>
                </div>
              </div>
              {/* Digital Certificate Stamp */}
              <div className="mt-2 bg-stone-50 border border-dashed border-stone-300 rounded p-1.5 text-center">
                <span className="text-[10px] font-mono tracking-widest text-stone-700 font-bold uppercase">
                  Ready for Client Handover
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
