/** Problem statement (reference: ProblemStatementSection, id="features"). */
export function ProblemSection() {
  return (
    <section data-purpose="problem-section" id="features" className="py-24 border-stone-200 bg-white">
      <div className="max-w-7xl mx-auto px-6">
        {/* Top Editorial Split Heading */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start pb-16 border-stone-200">
          <div className="lg:col-span-7">
            <h2 className="serif-display text-4xl sm:text-5xl md:text-6xl text-stone-900 font-normal leading-[1.08]">
              Everything your construction
              <br />
              team needs, connected.
            </h2>
            <p className="mt-6 text-stone-600 text-lg max-w-lg leading-relaxed">
              Seven capabilities, one workspace. No more jumping between tools to answer simple questions.
            </p>
          </div>
          <div className="hidden lg:block lg:col-span-5 border-stone-200 pl-8 h-full">
            <div className="text-xs font-mono uppercase tracking-widest text-stone-400 mb-2">
              Architectural Standard 01
            </div>
            <p className="text-sm text-stone-500 leading-relaxed">
              When field data, material stock, subcontractor labor, and finance live in separate silos, cost overruns are
              discovered too late to mitigate. FrameBase bonds these workflows into a single immutable ledger.
            </p>
          </div>
        </div>
        {/* Scattered Tools Narrative Section */}
        <div className="mt-20 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left: Visual Diagram of Scattered Tools */}
          <div className="lg:col-span-6 relative">
            <div className="rounded-2xl p-8 sm:p-12 relative overflow-hidden min-h-[420px] flex items-center justify-center">
              {/* Subtle curved background trajectory lines */}
              <svg
                className="absolute inset-0 w-full h-full pointer-events-none stroke-stone-300"
                fill="none"
                viewBox="0 0 500 400"
                aria-hidden="true"
              >
                <path d="M120,90 Q 250,50 340,150" strokeDasharray="4 4" strokeWidth="1.5" />
                <path d="M340,150 Q 320,280 150,230" strokeDasharray="4 4" strokeWidth="1.5" />
                <path d="M150,230 Q 80,320 280,330" strokeDasharray="4 4" strokeWidth="1.5" />
                <circle cx="250" cy="190" opacity="0.4" r="130" stroke="#E25C38" strokeDasharray="3 3" strokeWidth="0.7" />
              </svg>
              {/* Central Warning Marker */}
              <div className="absolute z-10 px-3 py-1.5 bg-red-50 border border-red-200 text-terracotta-600 text-[11px] font-mono rounded-full uppercase tracking-wider">
                Fragmented Data Flow
              </div>
              {/* Tool Node 1: WhatsApp */}
              <div className="absolute top-10 left-16 bg-white p-3.5 rounded-xl shadow-card-subtle border border-stone-200 flex items-center gap-3 transform -rotate-3 hover:rotate-0 transition">
                <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center text-white">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                  </svg>
                </div>
                <div>
                  <div className="text-xs font-bold text-stone-800">Site Chat Groups</div>
                  <div className="text-[10px] font-mono text-stone-400">Lost change orders</div>
                </div>
              </div>
              {/* Tool Node 2: Messy Excel */}
              <div className="absolute top-12 right-12 bg-white p-3.5 rounded-xl shadow-card-subtle border border-stone-200 flex items-center gap-3 transform rotate-6 hover:rotate-0 transition">
                <div className="w-10 h-10 rounded-lg bg-[#107C41] flex items-center justify-center text-white">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M23 1.5q.41 0 .7.3.3.29.3.7v19q0 .41-.3.7-.29.3-.7.3H7q-.41 0-.7-.3-.3-.29-.3-.7V18H1q-.41 0-.7-.3-.3-.29-.3-.7V7q0-.41.3-.7Q.58 6 1 6h5V2.5q0-.41.3-.7.29-.3.7-.3zM6 13.28l1.42 2.66h2.14l-2.38-3.87 2.34-3.8H7.46l-1.3 2.4-.05.08-.04.09-.64-1.28-.66-1.29H2.59l2.27 3.82-2.48 3.85h2.16zM14.25 21v-3H7.5v3zm0-4.5v-3.75H12v3.75zm0-5.25V7.5H12v3.75zm0-5.25V3H7.5v3zm8.25 15v-3h-6.75v3zm0-4.5v-3.75h-6.75v3.75zm0-5.25V7.5h-6.75v3.75zm0-5.25V3h-6.75v3Z" />
                  </svg>
                </div>
                <div>
                  <div className="text-xs font-bold text-stone-800">Budget_v14_final.xlsx</div>
                  <div className="text-[10px] font-mono text-terracotta-500">Broken formulas</div>
                </div>
              </div>
              {/* Tool Node 3: Paper Invoices */}
              <div className="absolute bottom-12 left-10 bg-white p-3.5 rounded-xl shadow-card-subtle border border-stone-200 flex items-center gap-3 transform -rotate-6 hover:rotate-0 transition">
                <div className="w-10 h-10 rounded-lg bg-stone-200 flex items-center justify-center text-stone-700">
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    aria-hidden="true"
                  >
                    <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z" />
                    <path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8" />
                    <path d="M12 17.5v-11" />
                  </svg>
                </div>
                <div>
                  <div className="text-xs font-bold text-stone-800">Physical Site Receipts</div>
                  <div className="text-[10px] font-mono text-stone-400">Delayed billing entries</div>
                </div>
              </div>
              {/* Tool Node 4: Printed Plans */}
              <div className="absolute bottom-8 right-14 bg-white p-3.5 rounded-xl shadow-card-subtle border border-stone-200 flex items-center gap-3 transform rotate-2 hover:rotate-0 transition">
                <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    aria-hidden="true"
                  >
                    <circle cx="12" cy="5" r="2" />
                    <path d="m3 21 8.02-14.26" />
                    <path d="m12.99 6.74 1.93 3.44" />
                    <path d="M19.136 12a10 10 0 0 1-14.271 0" />
                    <path d="m21 21-2.16-3.84" />
                  </svg>
                </div>
                <div>
                  <div className="text-xs font-bold text-stone-800">Outdated Blueprints</div>
                  <div className="text-[10px] font-mono text-stone-400">Rework on site floor 3</div>
                </div>
              </div>
            </div>
          </div>
          {/* Right: Problem Description */}
          <div className="lg:col-span-6 lg:pl-6 text-left">
            <h3 className="serif-display text-3xl sm:text-4xl md:text-5xl text-stone-900 leading-tight">
              Construction shouldn't
              <br />
              feel this scattered.
            </h3>
            <p className="mt-4 text-stone-500 font-mono text-xs uppercase tracking-wider">
              The traditional workflow is a chain of disconnected tools and every link leaks information.
            </p>
            <p className="mt-6 text-stone-600 leading-relaxed text-base">
              Construction teams struggle with poor site visibility, uncertain budgets, lost information, communication
              gaps, and too many disconnected tools, making it difficult to maintain a clear and accurate view of project
              progress.
            </p>
            <div className="mt-8 space-y-4 font-mono text-xs text-stone-700">
              <div className="flex items-center gap-3">
                <span className="w-5 h-5 rounded-full bg-red-100 text-terracotta-600 flex items-center justify-center text-[10px]">
                  ✕
                </span>
                <span>Subcontractor disputes caused by conflicting chat versions</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="w-5 h-5 rounded-full bg-red-100 text-terracotta-600 flex items-center justify-center text-[10px]">
                  ✕
                </span>
                <span>Equipment idle on site while billing daily rental fees</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="w-5 h-5 rounded-full bg-red-100 text-terracotta-600 flex items-center justify-center text-[10px]">
                  ✕
                </span>
                <span>Material shortages reported days after procurement cutoff</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
