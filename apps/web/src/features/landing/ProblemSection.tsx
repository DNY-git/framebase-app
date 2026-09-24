import { ClipboardCheck, Lock, Zap } from 'lucide-react';
import { Reveal } from './shared';

const SIGNALS = [
  {
    icon: Lock,
    tint: 'border-emerald-100 bg-emerald-50 text-emerald-600',
    head: 'Subcontractor blindness tracked',
    body: 'Scope-limited access hides client budgets and margins from the field.',
  },
  {
    icon: ClipboardCheck,
    tint: 'border-amber-100 bg-amber-50 text-amber-600',
    head: 'Audit trail on every state change',
    body: 'Each edit, approval and upload lands in a timestamped, immutable log.',
  },
  {
    icon: Zap,
    tint: 'border-blue-100 bg-blue-50 text-cad-blue',
    head: 'Real-time sync across sites',
    body: 'Field captures reconcile with the cloud the moment signal returns.',
  },
] as const;


/** Five-node diagram: the scattered capture points feeding one dark source of truth. */
function SourceOfTruthDiagram() {
  return (
    <div className="relative mx-auto aspect-[600/390] w-full max-w-[640px]">
      <svg
        aria-hidden
        fill="none"
        viewBox="0 0 600 390"
        preserveAspectRatio="none"
        className="absolute inset-0 h-full w-full"
      >
        <path d="M210,78 C210,112 196,124 200,152" stroke="#D6D3D1" strokeDasharray="5 5" strokeWidth="1.5" />
        <path d="M390,78 C390,112 404,124 400,152" stroke="#D6D3D1" strokeDasharray="5 5" strokeWidth="1.5" />
        <path d="M200,296 C200,272 214,242 200,224" stroke="#D6D3D1" strokeDasharray="5 5" strokeWidth="1.5" />
        <path d="M400,296 C400,272 386,242 400,224" stroke="#D6D3D1" strokeDasharray="5 5" strokeWidth="1.5" />
      </svg>

      {/* Top capture streams */}
      <div className="absolute left-0 top-[7%] flex w-[44%] items-center gap-2 rounded-lg border border-emerald-200 bg-white px-3 py-2 shadow-sm">
        <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-500" aria-hidden />
        <span className="text-[11px] font-semibold text-stone-800 sm:text-[13px]">Site Chat Streams</span>
      </div>
      <div className="absolute right-0 top-[7%] flex w-[44%] items-center justify-end gap-2 rounded-lg border border-emerald-200 bg-white px-3 py-2 shadow-sm">
        <span className="text-[11px] font-semibold text-stone-800 sm:text-[13px]">Budget Live Feed</span>
        <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-500" aria-hidden />
      </div>

      {/* The single source of truth */}
      <div className="absolute left-1/2 top-[39%] w-[74%] -translate-x-1/2 rounded-lg bg-stone-900 px-4 py-3 text-center shadow-dashboard sm:py-4">
        <p className="font-mono text-[8px] uppercase tracking-[0.22em] text-terracotta-500 sm:text-[10px]">
          FrameBase
        </p>
        <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-white sm:text-[13px]">
          Single Source of Truth
        </p>
      </div>

      {/* Bottom capture surfaces */}
      <div className="absolute bottom-[6%] left-0 w-[46%] rounded-lg border border-stone-200 bg-white px-3 py-2.5 shadow-card-subtle">
        <p className="text-[11px] font-semibold text-stone-900 sm:text-[13px]">Project Site Team Hub</p>
        <p className="mt-0.5 font-mono text-[9px] text-stone-500 sm:text-[10px]">Daily logs · crew roster</p>
      </div>
      <div className="absolute bottom-[6%] right-0 w-[46%] rounded-lg border border-stone-200 bg-white px-3 py-2.5 shadow-card-subtle">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-[11px] font-semibold text-stone-900 sm:text-[13px]">Drawings / Plans</p>
            <p className="mt-0.5 font-mono text-[9px] text-stone-500 sm:text-[10px]">Rev 3.2 · as-built</p>
          </div>
          <span className="shrink-0 rounded border border-terracotta-500/30 bg-terracotta-500/10 px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-wider text-terracotta-600 sm:text-[9px]">
            Not built yet
          </span>
        </div>
      </div>
    </div>
  );
}

/** "Everything your construction team needs, connected." — capabilities bridge + scattered-tools consequence copy. */
export function ProblemSection() {
  return (
    <section id="product" className="border-b border-stone-200/60 bg-white py-24">
      <div className="mx-auto max-w-7xl px-6">
        <Reveal>
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-2 lg:items-start">
            <div>
              <h2 className="font-display text-4xl font-normal leading-[1.06] text-stone-900 sm:text-5xl lg:text-[56px]">
                Everything your construction team needs, <span className="italic">connected</span>.
              </h2>
              <p className="mt-6 max-w-md text-[15px] leading-relaxed text-stone-500">
                Seven capabilities, one workspace. No more jumping between tools to answer simple questions.
              </p>
            </div>
            <div className="lg:pt-3">
              <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-stone-400">
                Selection · Standard 02
              </p>
              <p className="mt-4 max-w-md text-[15px] leading-relaxed text-stone-600">
                In-house site chat, document and site streams. Then FrameBase knits those workflows into a single
                bridge.
              </p>
            </div>
          </div>
        </Reveal>

        <div className="mt-16 grid grid-cols-1 gap-14 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <Reveal>
            <SourceOfTruthDiagram />
          </Reveal>

          <Reveal delayMs={120}>
            <h3 className="font-display text-3xl font-normal leading-tight text-stone-900 sm:text-4xl">
              Construction shouldn&rsquo;t feel this scattered.
            </h3>
            <p className="mt-5 text-[15px] leading-relaxed text-stone-600">
              Small teams wrestle a dozen disconnected tools and static files. Site photos vanish, versions drift, and
              critical sheets stay locked in someone&rsquo;s message history. FrameBase collapses the whole chain into
              one workspace.
            </p>
            <ul className="mt-8 space-y-5">
              {SIGNALS.map((s) => (
                <li key={s.head} className="flex gap-3.5">
                  <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md border ${s.tint}`}>
                    <s.icon className="h-4 w-4" strokeWidth={1.6} aria-hidden />
                  </span>
                  <div>
                    <p className="text-[14px] font-semibold text-stone-900">{s.head}</p>
                    <p className="mt-0.5 text-[13px] leading-relaxed text-stone-500">{s.body}</p>
                  </div>
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

