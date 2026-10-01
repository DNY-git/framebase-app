import { FileStack, MessagesSquare, ReceiptText, X } from 'lucide-react';
import { Reveal } from './shared';

/** Every link in the scattered-tools chain leaks information — the cost of no shared record. */
const LEAKS = [
  'Subcontractor disputes caused by conflicting chat versions',
  'Equipment idle on site while billing daily rental fees',
  'Material shortages reported days after procurement cutoff',
] as const;


interface ToolNode {
  icon: typeof MessagesSquare;
  tint: string;
  title: string;
  sub: string;
  subTint?: string;
  place: string;
}

/** Four disconnected capture surfaces looping round one fragmented record. */
const TOOLS: ToolNode[] = [
  {
    icon: MessagesSquare,
    tint: 'bg-emerald-500 text-white',
    title: 'Site Chat Groups',
    sub: 'Lost change orders',
    place: 'absolute left-0 top-[2%] w-[46%]',
  },
  {
    icon: X,
    tint: 'bg-emerald-600 text-white',
    title: 'Budget_v14_final.xlsx',
    sub: 'Broken formulas',
    subTint: 'text-terracotta-600',
    place: 'absolute right-0 top-[2%] w-[46%]',
  },
  {
    icon: ReceiptText,
    tint: 'bg-stone-200 text-stone-600',
    title: 'Physical Site Receipts',
    sub: 'Delayed billing entries',
    place: 'absolute bottom-[2%] left-0 w-[46%]',
  },
  {
    icon: FileStack,
    tint: 'bg-blue-100 text-cad-blue',
    title: 'Outdated Blueprints',
    sub: 'Rework on site floor 3',
    place: 'absolute bottom-[2%] right-0 w-[46%]',
  },
];

function ScatteredToolsDiagram() {
  return (
    <div className="relative mx-auto aspect-[484/357] w-full max-w-[484px]">
      {/* Dashed circulation loops — nothing reconciles back to a shared record */}
      <svg
        aria-hidden
        fill="none"
        viewBox="0 0 620 440"
        preserveAspectRatio="none"
        className="absolute inset-0 h-full w-full"
      >
        <ellipse cx="310" cy="218" rx="152" ry="128" stroke="#E4C7BB" strokeDasharray="4 5" strokeWidth="1.4" />
        <ellipse cx="310" cy="218" rx="252" ry="186" stroke="#E7E2DA" strokeDasharray="4 5" strokeWidth="1.4" />
      </svg>

      {TOOLS.map((t) => (
        <div
          key={t.title}
          className={`${t.place} flex items-center gap-2.5 rounded-lg border border-stone-200 bg-white px-3 py-2.5 shadow-card-subtle`}
        >
          <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${t.tint}`}>
            <t.icon className="h-4 w-4" strokeWidth={2} aria-hidden />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-[12px] font-semibold text-stone-900 sm:text-[13px]">{t.title}</span>
            <span className={`block truncate font-mono text-[9px] sm:text-[10px] ${t.subTint ?? 'text-stone-500'}`}>
              {t.sub}
            </span>
          </span>
        </div>
      ))}

      {/* The shared record that never exists */}
      <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-terracotta-500/40 bg-terracotta-500/10 px-3 py-1 font-mono text-[9px] uppercase tracking-[0.16em] text-terracotta-600 sm:text-[10px]">
        Fragmented data flow
      </span>
    </div>
  );
}

/** "Everything your construction team needs, connected." — capabilities bridge + scattered-tools consequence copy. */
export function ProblemSection() {
  return (
    <section id="product" className="border-b border-stone-200/60 bg-cream py-24">
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
            <div className="lg:ml-auto lg:max-w-[460px]">
              <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-stone-400">
                Architectural Standard 01
              </p>
              <p className="mt-4 text-[14px] leading-relaxed text-stone-600">
                When field data, material stock, subcontractor labor, and finance live in separate silos, cost
                overruns are discovered too late to mitigate. FrameBase bonds these workflows into a single immutable
                ledger.
              </p>
            </div>
          </div>
        </Reveal>

        <div className="mt-40 grid grid-cols-1 gap-14 lg:grid-cols-[1.07fr_1fr] lg:items-center">
          <Reveal>
            <ScatteredToolsDiagram />
          </Reveal>

          <Reveal delayMs={120}>
            <h3 className="font-display text-[48px] font-normal leading-none text-stone-900">
              Construction shouldn&rsquo;t feel this scattered.
            </h3>
            <p className="mt-5 font-mono text-[11px] uppercase leading-relaxed tracking-[0.14em] text-stone-400">
              The traditional workflow is a chain of disconnected tools and every link leaks information.
            </p>
            <p className="mt-5 text-[16px] leading-relaxed text-stone-600">
              Construction teams struggle with poor site visibility, uncertain budgets, lost information,
              communication gaps, and too many disconnected tools, making it difficult to maintain a clear and
              accurate view of project progress.
            </p>
            <ul className="mt-8 space-y-4">
              {LEAKS.map((leak) => (
                <li key={leak} className="flex items-start gap-3">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-terracotta-500/15 text-terracotta-600">
                    <X className="h-3 w-3" strokeWidth={3} aria-hidden />
                  </span>
                  <span className="text-[13.5px] leading-relaxed text-stone-600">{leak}</span>
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
