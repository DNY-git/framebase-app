import { useEffect, useState, type MouseEvent } from 'react';
import { Link } from 'react-router-dom';
import logoMark from '../../assets/landing/logo-landing.png';

const NAV_LINKS = [
  { label: 'Product', href: '#features' },
  { label: 'Features', href: '#workflow' },
  { label: 'How it works', href: '#stages' },
  { label: 'Solution', href: '#roles' },
] as const;

/**
 * Site navigation (reference: SiteNavigation).
 * On scroll (>24px) the bar morphs into the floating blurred pill (nav-pill);
 * the Log in / Sign up actions fade + collapse away while pilled.
 */
export function LandingNav() {
  const [pilled, setPilled] = useState(false);

  useEffect(() => {
    let ticking = false;
    const update = () => {
      ticking = false;
      const y = window.scrollY || document.documentElement.scrollTop || 0;
      setPilled(y > 24);
    };
    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        window.requestAnimationFrame(update);
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    update();
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  const scrollToTop = (e: MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <header
      data-purpose="site-navigation"
      className={`sticky top-0 z-50 backdrop-blur-md border-stone-200/70 bg-white${pilled ? ' nav-pill' : ''}`}
    >
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        {/* Logo Mark */}
        <a aria-label="FrameBase Home" className="flex items-center gap-2.5 group" href="#" onClick={scrollToTop}>
          <img
            src={logoMark}
            alt="FrameBase Logo"
            className="object-contain transition-transform duration-300 group-hover:scale-105 w-10 h-10"
          />
          <span className="text-xl font-bold tracking-tight font-sans text-stone-900">FrameBase</span>
        </a>
        {/* Primary Nav Links */}
        <nav className="hidden md:flex items-center gap-8 text-[14.5px] font-medium text-stone-600">
          {NAV_LINKS.map((l) => (
            <a key={l.href} className="hover:text-stone-900 transition-colors" href={l.href}>
              {l.label}
            </a>
          ))}
        </nav>
        {/* Nav Actions */}
        <div className="flex items-center gap-5">
          <Link className="text-[14.5px] font-medium text-stone-700 hover:text-stone-900 px-2 py-1" to="/login">
            Log in
          </Link>
          <Link
            className="inline-flex items-center justify-center text-[14px] font-medium text-white bg-stone-900 hover:bg-stone-800 transition-all rounded-md px-5 py-2.5 shadow-sm hover:shadow"
            to="/register"
          >
            Sign up
          </Link>
        </div>
      </div>
    </header>
  );
}
