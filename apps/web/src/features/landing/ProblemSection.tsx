import { Database, MessageCircle, FileText, Copy } from 'lucide-react';
import { Reveal } from './shared';

const SCATTERED_TOOLS = [
  {
    icon: MessageCircle,
    label: 'WhatsApp Threads',
    detail: 'Critical approvals & site photos lost in noisy group chats.',
  },
  {
    icon: Copy,
    label: 'Excel Spreadsheets',
    detail: 'Outdated versions, formula errors, and zero single source of truth.',
  },
  {
    icon: FileText,
    label: 'Paper Receipts',
    detail: 'Materials spend untracked until it breaks the monthly budget.',
  },
  {
    icon: Database,
    label: 'Cloud Drives',
    detail: 'Old architectural drawings accidentally built on-site.',
  },
] as const;

/** "The problem" — fragmented tools diagram with dashed convergence paths. */
export function ProblemSection() {
  return (
    <section className="relative overflow-hidden bg-white py-24">
      <div className="mx-auto max-w-7xl px-6">
        <Reveal className="mx-auto max-w-2xl text-center">
          <span className="font-mono text-xs uppercase tracking-widest text-stone-400">The Problem</span>
          <h2 className="font-display mt-2 text-4xl font-normal text-stone-900 sm:text-5xl">
            Stop stitching your project together across 6 different tools.
          </h2>
          <p className="mt-4 text-base text-stone-600">
            Every disconnected app creates a gap where budgets leak, versions collide, and accountability disappears.
          </p>
        </Reveal>

        <Reveal delayMs={120} className="relative mx-auto mt-16 max-w-5xl">
          {/* Dashed SVG paths: scattered tools bleeding into chaos */}
          <svg
            aria-hidden
            viewBox="0 0 1000 220"
            preserveAspectRatio="none"
            className="pointer-events-none absolute inset-x-0 top-1/2 hidden h-56 -translate-y-1/2 md:block"
            fill="none"
          >
            <path d="M80,40 C300,40 400,110 500,110" stroke="#D6D3D1" strokeDasharray="6 6" strokeWidth="1.5" />
            <path d="M80,180 C300,180 400,110 500,110" stroke="#D6D3D1" strokeDasharray="6 6" strokeWidth="1.5" />
            <path d="M920,40 C700,40 600,110 500,110" stroke="#D6D3D1" strokeDasharray="6 6" strokeWidth="1.5" />
            <path d="M920,180 C700,180 600,110 500,110" stroke="#D6D3D1" strokeDasharray="6 6" strokeWidth="1.5" />
          </svg>

          <div className="relative grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {SCATTERED_TOOLS.map((t, i) => (
              <div
                key={t.label}
                className="rounded-xl border border-stone-200 bg-white p-6 shadow-card-subtle"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-lg border border-stone-200 bg-stone-50 text-stone-600">
                  <t.icon className="h-5 w-5" strokeWidth={1.5} aria-hidden />
                </div>
                <h3 className="mt-4 text-sm font-semibold text-stone-900">{t.label}</h3>
                <p className="mt-1.5 text-[13px] leading-relaxed text-stone-500">{t.detail}</p>
                <span className="mt-3 inline-block rounded border border-terracotta-500/30 bg-terracotta-500/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-terracotta-600">
                  Leak {String(i + 1).padStart(2, '0')}
                </span>
              </div>
            ))}
          </div>

          <div className="relative mx-auto mt-10 max-w-md rounded-xl border border-stone-900 bg-stone-900 px-8 py-5 text-center shadow-dashboard">
            <p className="font-mono text-xs uppercase tracking-widest text-terracotta-500">The FrameBase Fix</p>
            <p className="mt-1 text-sm font-medium text-stone-200">
              One workspace ingests all of it — every chat, receipt, drawing, and expense reconciles into a single
              auditable ledger.
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
