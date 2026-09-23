import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X } from '../../shared/components/icons';
import logoMark from '../../assets/logo-mark-light.svg';

const NAV_LINKS = [
  { label: 'Product', href: '#features' },
  { label: 'Features', href: '#inventory' },
  { label: 'How it works', href: '#stages' },
  { label: 'Solution', href: '#roles' },
] as const;

export function LandingNavbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 border-b backdrop-blur-md transition-all duration-300 ${
        scrolled ? 'border-stone-200/70 bg-white/90 shadow-sm' : 'border-transparent bg-white/70'
      }`}
    >
      <nav aria-label="Primary" className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6">
        <Link to="/" aria-label="FrameBase home" className="group flex items-center gap-2.5">
          <img
            src={logoMark}
            alt=""
            draggable={false}
            className="h-10 w-10 object-contain transition-transform duration-300 group-hover:scale-105"
          />
          <span className="text-xl font-bold tracking-tight text-stone-900">FrameBase</span>
        </Link>

        <ul className="hidden items-center gap-8 text-[14.5px] font-medium text-stone-600 md:flex">
          {NAV_LINKS.map((l) => (
            <li key={l.href}>
              <a href={l.href} className="transition-colors hover:text-stone-900">
                {l.label}
              </a>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-5">
          <Link to="/login" className="hidden px-2 py-1 text-[14.5px] font-medium text-stone-700 transition-colors hover:text-stone-900 sm:inline-flex">
            Log in
          </Link>
          <Link
            to="/register"
            className="hidden items-center justify-center rounded-md bg-stone-900 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-all hover:bg-stone-800 hover:shadow sm:inline-flex"
          >
            Sign up
          </Link>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-label={open ? 'Close menu' : 'Open menu'}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-stone-900 transition-colors hover:bg-stone-100 md:hidden"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </nav>

      {open && (
        <div className="border-t border-stone-200 bg-white/95 backdrop-blur-md md:hidden">
          <ul className="space-y-1 px-6 py-4">
            {NAV_LINKS.map((l) => (
              <li key={l.href}>
                <a
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="block rounded-lg px-3 py-2.5 text-sm font-medium text-stone-800 transition-colors hover:bg-stone-100"
                >
                  {l.label}
                </a>
              </li>
            ))}
            <li className="flex gap-2 pt-2">
              <Link
                to="/login"
                onClick={() => setOpen(false)}
                className="flex flex-1 items-center justify-center rounded-lg border border-stone-300 px-4 py-2.5 text-sm font-medium text-stone-800"
              >
                Log in
              </Link>
              <Link
                to="/register"
                onClick={() => setOpen(false)}
                className="flex flex-1 items-center justify-center rounded-lg bg-stone-900 px-4 py-2.5 text-sm font-medium text-white"
              >
                Sign up
              </Link>
            </li>
          </ul>
        </div>
      )}
    </header>
  );
}
