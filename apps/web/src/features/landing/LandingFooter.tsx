import { Fragment, useEffect, useRef } from 'react';
import logoMark from '../../assets/landing/logo-landing.png';
import { FOOTER_COLUMNS, MARQUEE_ITEMS } from './data';

const WORD = ['F', 'r', 'a', 'm', 'e', 'B', 'a', 's', 'e', '.'];

/** Main footer (reference: MainFooter) — fb-* scroll reveal, marquee band, wordmark rise-in, back-to-top. */
export function LandingFooter() {
  const footerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const foot = footerRef.current;
    if (!foot) return;
    foot.classList.add('fb-armed');
    if (!('IntersectionObserver' in window)) {
      foot.classList.add('is-inview');
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (let i = 0; i < entries.length; i++) {
          if (entries[i].isIntersecting) {
            foot.classList.add('is-inview');
            io.disconnect();
            break;
          }
        }
      },
      { threshold: 0.12 },
    );
    io.observe(foot);
    return () => io.disconnect();
  }, []);

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

  return (
    <footer data-purpose="main-footer" ref={footerRef} className="relative bg-white pt-16 pb-10 overflow-hidden">
      <div className="fb-topline" aria-hidden="true" />
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 pb-12">
          {/* Brand column */}
          <div className="col-span-2 fb-reveal" style={{ '--d': '0s' } as React.CSSProperties}>
            <div className="flex items-center gap-2.5">
              <img src={logoMark} alt="FrameBase Logo" className="w-7 h-7 object-contain" />
              <span className="text-xl font-bold tracking-tight font-sans text-stone-900">FrameBase</span>
            </div>
            <p className="mt-4 text-xs text-stone-500 max-w-xs leading-relaxed font-sans">
              The operating system for modern jobsites, commercial developers, and general contractors. Eliminating cost
              variance through continuous visibility.
            </p>
            <div className="mt-6 flex items-center gap-2 text-xs font-mono text-emerald-700">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              All Core Systems Operational
            </div>
          </div>
          {/* Link columns */}
          {FOOTER_COLUMNS.map((col, i) => (
            <div key={col.title} className="fb-reveal" style={{ '--d': `${[0.1, 0.18, 0.26][i]}s` } as React.CSSProperties}>
              <h4 className="text-xs uppercase font-mono tracking-wider text-stone-400 mb-4">{col.title}</h4>
              <ul className="space-y-2.5 text-xs text-stone-600">
                {col.links.map((link) => (
                  <li key={link}>
                    <a className="fb-link hover:text-stone-900 transition" href="#">
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
      {/* Giant value marquee band */}
      <div className="fb-big-band border-y border-stone-200 bg-stone-50 py-6 md:py-8 overflow-hidden" aria-hidden="true">
        <div className="fb-big-track">
          {[0, 1].map((g) => (
            <div className="fb-big-group" key={g}>
              {MARQUEE_ITEMS.map((item) => (
                <Fragment key={item.text}>
                  <span className={`fb-big-tick ${item.variant}`}>{item.text}</span>
                  <span className="fb-sep-lg" />
                </Fragment>
              ))}
            </div>
          ))}
        </div>
      </div>
      {/* Giant brand wordmark: letters rise in on first view, terracotta on hover */}
      <div className="py-12 md:py-16 px-6 overflow-hidden">
        <div className="max-w-7xl mx-auto text-center">
          <h2 className="fb-word text-stone-900 select-none">
            <span className="sr-only">FrameBase.</span>
            {WORD.map((ch, i) => (
              <span className="fb-lm" aria-hidden="true" key={`${ch}-${i}`}>
                <span
                  className={`fb-lt${ch === '.' ? ' fb-dot' : ''}`}
                  style={{ '--i': i } as React.CSSProperties}
                >
                  {ch}
                </span>
              </span>
            ))}
          </h2>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-6">
        <div className="pt-8 border-t border-stone-100 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-stone-400 font-mono">
          <p>&copy; {new Date().getFullYear()} FrameBase Inc. All rights reserved.</p>
          <p>Engineered for reliability on the world's most demanding jobsites.</p>
          <button id="fb-to-top" className="fb-top-btn" type="button" aria-label="Back to top" onClick={scrollToTop}>
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M12 19V5" />
              <path d="m5 12 7-7 7 7" />
            </svg>
          </button>
        </div>
      </div>
    </footer>
  );
}
