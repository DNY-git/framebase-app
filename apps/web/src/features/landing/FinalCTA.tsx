import { Link } from 'react-router-dom';
import { ArrowRight } from '../../shared/components/icons';
import { Reveal, BlueprintBackdrop } from './shared';

export function FinalCTA() {
  return (
    <section aria-labelledby="final-cta-heading" className="relative overflow-hidden bg-[#0B1020]">
      <BlueprintBackdrop tone="dark" />
      <div aria-hidden className="absolute -right-24 -top-24 h-72 w-72 rounded-full border border-[#F97316]/30" />
      <div aria-hidden className="absolute -bottom-32 -left-24 h-80 w-80 rounded-full border border-[#2563EB]/40" />
      <div className="relative mx-auto max-w-4xl px-4 py-16 text-center sm:px-6 lg:py-24">
        <Reveal>
          <p className="font-mono text-xs font-semibold uppercase tracking-[0.25em] text-[#F97316]">15 — Get started</p>
          <h2 id="final-cta-heading" className="mt-4 text-3xl font-bold leading-tight tracking-tight text-white sm:text-4xl lg:text-5xl">
            Build better projects.
            <span className="block">Start with better control.</span>
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-white/70 sm:text-base">
            One workspace for your projects, people, resources and finances.
          </p>
          <div className="mt-8">
            <Link
              to="/register"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#2563EB] px-8 py-3.5 text-sm font-semibold text-white shadow-lg transition-colors hover:bg-[#1d4ed8]"
            >
              Get started <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>
          <p className="mt-5 font-mono text-[11px] uppercase tracking-[0.2em] text-white/50">
            No spreadsheets. No scattered information. Just one connected workspace.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
