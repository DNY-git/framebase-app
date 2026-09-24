import { Link } from 'react-router-dom';
import logoMark from '../../assets/logo-mark-dark.svg';

/* Six-row ANSI-shadow glyphs for the FRAMEBASE footer wordmark (replaces the old ParticleText). */
const GLYPHS: Record<string, string[]> = {
  F: ['███████╗', '██╔════╝', '█████╗  ', '██╔══╝  ', '██║     ', '╚═╝     '],
  R: ['██████╗ ', '██╔══██╗', '██████╔╝', '██╔══██╗', '██║  ██║', '╚═╝  ╚═╝'],
  A: [' █████╗ ', '██╔══██╗', '███████║', '██╔══██║', '██║  ██║', '╚═╝  ╚═╝'],
  M: ['███╗   ███╗', '████╗ ████║', '██╔████╔██║', '██║╚██╔╝██║', '██║ ╚═╝ ██║', '╚═╝     ╚═╝'],
  E: ['███████╗', '██╔════╝', '█████╗  ', '██╔══╝  ', '███████╗', '╚══════╝'],
  B: ['██████╗ ', '██╔══██╗', '██████╔╝', '██╔══██╗', '██████╔╝', '╚═════╝ '],
  S: ['███████╗', '██╔════╝', '███████╗', '╚════██║', '███████║', '╚══════╝'],
};

const WORDMARK = Array.from({ length: 6 }, (_, row) =>
  'FRAMEBASE'
    .split('')
    .map((ch) => GLYPHS[ch]?.[row] ?? '')
    .join(' '),
).join('\n');

const COLUMNS = [
  {
    title: 'Product',
    links: [
      { label: 'Builder Global Team', href: '#product' },
      { label: 'Site Chat Streams', href: '#product' },
      { label: 'Simple Change Orders', href: '#stages' },
      { label: 'Estimator & Quantity', href: '#stages' },
    ],
  },
  {
    title: 'Solutions',
    links: [
      { label: 'Speed & Cost Control', href: '#inventory' },
      { label: 'Delay Prevention', href: '#roles' },
      { label: 'Quality Standards', href: '#stages' },
      { label: 'Subcontractor Management', href: '#roles' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'About FrameBase', href: '#product' },
      { label: 'Field Engineer Roles', href: '#roles' },
      { label: 'Security', href: '#faq' },
      { label: 'Terms & Privacy', href: '#faq' },
    ],
  },
] as const;

export function LandingFooter() {
  return (
    <footer className="border-t border-stone-800 bg-stone-900 pb-10 pt-16 text-stone-400">
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1.35fr_repeat(3,0.75fr)]">
          {/* Brand + status */}
          <div>
            <Link to="/" aria-label="FrameBase home" className="flex items-center gap-2.5">
              <img src={logoMark} alt="" draggable={false} className="h-9 w-9 object-contain" />
              <span className="text-lg font-bold tracking-tight text-white">FrameBase</span>
            </Link>
            <p className="mt-5 max-w-xs text-[13px] leading-relaxed text-stone-400">
              The operating system for modern construction. Run projects, teams, drawings and financials on one
              connected platform.
            </p>
            <div className="mt-6 inline-flex items-center gap-2.5 rounded-md border border-stone-800 bg-stone-950/60 px-3 py-1.5">
              <span className="relative flex h-2 w-2" aria-hidden>
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-stone-300">
                All systems: nominal
              </span>
            </div>
          </div>

          {COLUMNS.map((col) => (
            <nav key={col.title} aria-label={col.title}>
              <h3 className="font-mono text-[10px] uppercase tracking-[0.18em] text-stone-500">{col.title}</h3>
              <ul className="mt-5 space-y-3 text-[13px]">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <a href={l.href} className="transition-colors hover:text-white">
                      {l.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <pre
          aria-hidden
          className="mt-14 select-none overflow-x-auto whitespace-pre font-mono text-[10px] leading-[1.05] text-stone-700 sm:text-[15px] lg:text-[20px]"
        >
          {WORDMARK}
        </pre>

        <div className="mt-10 flex flex-wrap items-end justify-between gap-4 border-t border-stone-800 pt-6 text-[12px] text-stone-500">
          <p>&copy; {new Date().getFullYear()} Framebase Inc. All rights reserved.</p>
          <p className="text-right font-mono text-[11px] leading-relaxed">
            Engineered for excellence at the tech speed
            <span className="block">built by practical engineers.</span>
          </p>
        </div>
      </div>
    </footer>
  );
}

