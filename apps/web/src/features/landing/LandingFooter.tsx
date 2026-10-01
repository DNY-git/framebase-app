import { Link } from 'react-router-dom';
import logoMark from '../../assets/logo-mark-light.svg';

const COLUMNS = [
  {
    title: 'Product',
    links: [
      { label: 'Budget & Cost Variance', href: '#inventory' },
      { label: 'Equipment Tracking', href: '#inventory' },
      { label: 'Tender Comparison', href: '#stages' },
      { label: 'Site Daily Logs', href: '#stages' },
      { label: 'Drawing Vault', href: '#product' },
    ],
  },
  {
    title: 'Solutions',
    links: [
      { label: 'General Contractors', href: '#roles' },
      { label: 'Civil Infrastructure', href: '#roles' },
      { label: 'Real Estate Developers', href: '#roles' },
      { label: 'Quantity Surveyors', href: '#roles' },
      { label: 'Subcontractor Networks', href: '#roles' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'About FrameBase', href: '#product' },
      { label: 'Construction Benchmark Report', href: '#inventory' },
      { label: 'Privacy Policy', href: '#faq' },
      { label: 'Terms of Service', href: '#faq' },
      { label: 'Contact Engineering', href: '#demo' },
    ],
  },
] as const;

export function LandingFooter() {
  return (
    <footer className="bg-white pb-12 pt-16 text-stone-600">
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1.1fr_repeat(3,0.75fr)]">
          {/* Brand + status */}
          <div>
            <Link to="/" aria-label="FrameBase home" className="flex items-center gap-2.5">
              <img src={logoMark} alt="" draggable={false} className="h-8 w-8 object-contain" />
              <span className="text-lg font-bold tracking-tight text-stone-900">FrameBase</span>
            </Link>
            <p className="mt-5 max-w-sm text-[13.5px] leading-relaxed text-stone-500">
              The operating system for modern jobsites, commercial developers, and general contractors. Eliminating
              cost variance through continuous visibility.
            </p>
            <p className="mt-6 flex items-center gap-2">
              <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-500" aria-hidden />
              <span className="font-mono text-[11px] tracking-[0.05em] text-emerald-600">
                All Core Systems Operational
              </span>
            </p>
          </div>

          {COLUMNS.map((col) => (
            <nav key={col.title} aria-label={col.title}>
              <h3 className="font-mono text-[10px] uppercase tracking-[0.18em] text-stone-400">{col.title}</h3>
              <ul className="mt-5 space-y-1.5 text-[13.5px]">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <a href={l.href} className="text-stone-600 transition-colors hover:text-stone-900">
                      {l.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        {/* Particle wordmark — pure SVG dash pattern, no canvas per frame */}
        <svg
          role="img"
          aria-label="FrameBase"
          viewBox="0 0 660 78"
          className="mx-auto mt-24 h-auto w-full max-w-[660px]"
        >
          <defs>
            <pattern id="fb-particle" width="8.6" height="16.5" patternUnits="userSpaceOnUse">
              <rect width="6" height="4" y="6" rx="0.5" fill="#D1CEC6" />
            </pattern>
          </defs>
          <text
            x="335"
            y="73"
            textAnchor="middle"
            fill="url(#fb-particle)"
            fontFamily="Poppins, ui-sans-serif, system-ui, sans-serif"
            fontSize="100"
            fontWeight="700"
            letterSpacing="10"
          >
            FRAMEBASE
          </text>
        </svg>

        <div className="mt-16 flex flex-wrap items-center justify-between gap-4 border-t border-stone-200 pt-6 text-[12.5px] text-stone-500">
          <p>&copy; {new Date().getFullYear()} FrameBase Inc. All rights reserved.</p>
          <p className="font-mono text-[11.5px] tracking-[0.05em] text-stone-400">
            Engineered for reliability on the world&rsquo;s most demanding jobsites.
          </p>
        </div>
      </div>
    </footer>
  );
}

