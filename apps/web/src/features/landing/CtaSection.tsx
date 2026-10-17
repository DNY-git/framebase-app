import { Link } from 'react-router-dom';

/** Call to action (reference: CallToActionSection) — blueprint lines backdrop. */
export function CtaSection() {
  return (
    <section
      data-purpose="cta-section"
      className="py-24 border-t border-stone-200 bg-white text-stone-900 relative overflow-hidden"
    >
      <div className="max-w-5xl mx-auto px-6 text-center relative z-10">
        <span className="text-xs font-mono tracking-widest uppercase text-terracotta-500 font-semibold">
          Immediate Deployment
        </span>
        <h2 className="serif-display text-4xl sm:text-5xl md:text-6xl text-stone-900 font-normal mt-3">
          Take control of your construction projects today.
        </h2>
        <p className="mt-6 text-stone-500 max-w-xl mx-auto text-base">
          Join forward-thinking developers, general contractors, and civil engineers building with precision and
          absolute budget visibility.
        </p>
        <div className="mt-10 flex flex-wrap justify-center gap-4">
          <Link
            className="px-8 py-3.5 bg-stone-900 text-white font-medium rounded-lg hover:bg-stone-800 transition shadow"
            to="/register"
          >
            Start Free 14-Day Trial
          </Link>
          <Link
            className="px-8 py-3.5 bg-white text-stone-700 border border-stone-300 font-medium rounded-lg hover:bg-stone-50 transition"
            to="/register"
          >
            Book Engineering Demo
          </Link>
        </div>
      </div>
      {/* Architectural subtle line aesthetic behind CTA */}
      <div className="absolute inset-0 pointer-events-none opacity-10 blueprint-lines" />
    </section>
  );
}
