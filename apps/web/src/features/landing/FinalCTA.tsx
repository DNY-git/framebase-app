import { Link } from 'react-router-dom';
import { Reveal } from './shared';

/** Dark closing call-to-action band with a faint architectural line grid. */
export function FinalCTA() {
  return (
    <section id="demo" className="relative overflow-hidden bg-stone-900 py-24 text-white">
      <Reveal className="relative z-10 mx-auto max-w-5xl px-6 text-center">
        <span className="font-mono text-xs font-semibold uppercase tracking-widest text-terracotta-500">
          Immediate Deployment
        </span>
        <h2 className="font-display mt-3 text-4xl font-normal text-white sm:text-5xl md:text-6xl">
          Take control of your construction projects today.
        </h2>
        <p className="mx-auto mt-6 max-w-xl text-base text-stone-400">
          Join forward-thinking developers, general contractors, and civil engineers building with precision and
          absolute budget visibility.
        </p>
        <div className="mt-10 flex flex-wrap justify-center gap-4">
          <Link
            to="/register"
            className="rounded-lg bg-white px-8 py-3.5 font-medium text-stone-900 shadow transition-colors hover:bg-stone-100"
          >
            Start Free 14-Day Trial
          </Link>
          <a
            href="#faq"
            className="rounded-lg border border-stone-700 bg-stone-800 px-8 py-3.5 font-medium text-stone-300 transition-colors hover:bg-stone-700"
          >
            Book Engineering Demo
          </a>
        </div>
      </Reveal>
      {/* Architectural subtle line aesthetic behind CTA */}
      <div aria-hidden className="blueprint-lines pointer-events-none absolute inset-0 opacity-10" />
    </section>
  );
}
