import { Link } from 'react-router-dom';
import { ArrowRight, Check } from '../../shared/components/icons';
import { Reveal } from './shared';

/**
 * Pricing slot. No real pricing exists yet, so this is an honest CTA
 * section shaped for a future pricing grid (anchor id preserved).
 */
export function PricingCTA() {
  return (
    <section id="pricing" aria-labelledby="pricing-heading" className="scroll-mt-20 border-t border-border bg-surface-muted/40">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:py-20">
        <Reveal>
          <div className="relative overflow-hidden rounded-2xl border border-border bg-surface p-8 text-center shadow-sm sm:p-12">
            <div aria-hidden className="absolute inset-0 opacity-60">
              <svg preserveAspectRatio="xMidYMid slice" className="h-full w-full text-foreground">
                <defs>
                  <pattern id="pricing-grid" width="40" height="40" patternUnits="userSpaceOnUse">
                    <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.08" />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#pricing-grid)" />
              </svg>
            </div>
            <div className="relative">
              <p className="font-mono text-xs font-semibold uppercase tracking-[0.25em] text-[#2563EB]">13 — Pricing</p>
              <h2 id="pricing-heading" className="mx-auto mt-3 max-w-xl text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                Ready to take control of your projects?
              </h2>
              <p className="mx-auto mt-2 max-w-md text-sm text-foreground-muted">Start using FrameBase.</p>
              <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Link
                  to="/register"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#2563EB] px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#1d4ed8] sm:w-auto"
                >
                  Get started <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
                <Link
                  to="/login"
                  className="inline-flex w-full items-center justify-center rounded-lg border border-border bg-surface px-6 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-surface-muted sm:w-auto"
                >
                  Log in
                </Link>
              </div>
              <ul className="mx-auto mt-6 flex max-w-lg flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[11px] text-foreground-muted">
                {['Projects & tasks included', 'Team roles included', 'Cancel anytime'].map((t) => (
                  <li key={t} className="flex items-center gap-1.5">
                    <Check className="h-3.5 w-3.5 text-emerald-600" aria-hidden /> {t}
                  </li>
                ))}
              </ul>
              <p className="mt-4 font-mono text-[10px] uppercase tracking-widest text-foreground-muted">
                Simple plans coming soon — this section is ready for real pricing
              </p>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
