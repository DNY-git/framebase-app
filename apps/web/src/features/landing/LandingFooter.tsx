import { Link } from 'react-router-dom';

const COLUMNS = [
  {
    title: 'Product',
    links: [
      { label: 'Features', href: '#inventory' },
      { label: 'How it works', href: '#stages' },
      { label: 'Roles & access', href: '#roles' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'FAQ', href: '#faq' },
      { label: 'Book a demo', href: '#demo' },
      { label: 'Sign in', href: '/login', route: true },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Privacy', href: '#' },
      { label: 'Terms', href: '#' },
      { label: 'Security', href: '#' },
    ],
  },
] as const;

const ASCII_WORDMARK = [
  '███████╗██████╗  █████╗ ███╗   ███╗███████╗',
  '██╔════╝██╔══██╗██╔══██╗████╗ ████║██╔════╝',
  '█████╗  ██████╔╝███████║██╔████╔██║█████╗  ',
  '██╔══╝  ██╔══██╗██╔══██║██║╚██╔╝██║██╔══╝  ',
  '██║     ██║  ██║██║  ██║██║ ╚═╝ ██║███████╗',
  '╚═╝     ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝     ╚═╝╚══════╝',
].join('\n');

export function LandingFooter() {
  return (
    <footer className="border-t border-stone-800 bg-stone-900 py-16 text-stone-400">
      <div className="mx-auto max-w-7xl px-6">
        <pre
          aria-hidden
          className="select-none overflow-x-auto font-mono text-[7px] leading-[1.15] text-stone-700 sm:text-[9px]"
        >
          {ASCII_WORDMARK}
        </pre>

        <div className="mt-10 flex flex-wrap items-center gap-3 font-mono text-xs">
          <span className="relative flex h-2.5 w-2.5" aria-hidden>
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-60" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
          </span>
          <span className="text-stone-300">All systems operational</span>
          <span className="text-stone-600">· Uptime 99.98% (90d)</span>
        </div>

        <div className="mt-10 grid grid-cols-2 gap-8 border-t border-stone-800 pt-10 sm:grid-cols-3">
          {COLUMNS.map((col) => (
            <nav key={col.title} aria-label={col.title}>
              <h3 className="font-mono text-xs uppercase tracking-widest text-stone-500">{col.title}</h3>
              <ul className="mt-4 space-y-2.5 text-sm">
                {col.links.map((l) => (
                  <li key={l.label}>
                    {'route' in l && l.route ? (
                      <Link to={l.href} className="transition-colors hover:text-white">
                        {l.label}
                      </Link>
                    ) : (
                      <a href={l.href} className="transition-colors hover:text-white">
                        {l.label}
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-12 flex flex-wrap items-center justify-between gap-4 border-t border-stone-800 pt-8 text-xs text-stone-500">
          <p>© {new Date().getFullYear()} FrameBase. All rights reserved.</p>
          <p className="font-mono">Built for construction teams who refuse budget surprises.</p>
        </div>
      </div>
    </footer>
  );
}
