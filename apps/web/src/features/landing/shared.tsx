import { useEffect, useRef, useState, type ReactNode } from 'react';

/** Subtle scroll reveal — fades/slides content in once. Instantly visible with reduced motion. */
export function Reveal({ children, className, delayMs }: { children: ReactNode; className?: string; delayMs?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setVisible(true);
      return;
    }
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { threshold: 0.1, rootMargin: '0px 0px -40px 0px' },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      style={visible ? undefined : { opacity: 0, transform: 'translateY(24px)', transitionDelay: delayMs ? `${delayMs}ms` : undefined }}
      className={`transition-all duration-700 ease-out ${className ?? ''}`}
    >
      {children}
    </div>
  );
}

/** Editorial section heading: technical eyebrow + bold title + supporting line. */
export function SectionHeading({
  eyebrow,
  title,
  sub,
  align = 'center',
  dark = false,
}: {
  eyebrow: string;
  title: string;
  sub?: string;
  align?: 'center' | 'left';
  dark?: boolean;
}) {
  const alignCls = align === 'center' ? 'text-center mx-auto items-center' : 'text-left items-start';
  return (
    <div className={`flex max-w-2xl flex-col ${alignCls}`}>
      <p className="flex items-center gap-2 font-mono text-xs font-semibold uppercase tracking-[0.2em] text-[#F97316]">
        <span aria-hidden className="inline-block h-px w-6 bg-[#F97316]" />
        {eyebrow}
        {align === 'center' && <span aria-hidden className="inline-block h-px w-6 bg-[#F97316]" />}
      </p>
      <h2 className={`mt-3 text-2xl font-bold tracking-tight sm:text-3xl lg:text-4xl ${dark ? 'text-white' : 'text-foreground'}`}>
        {title}
      </h2>
      {sub && <p className={`mt-3 text-sm leading-6 sm:text-base ${dark ? 'text-white/70' : 'text-foreground-muted'}`}>{sub}</p>}
    </div>
  );
}

/**
 * Decorative architectural backdrop: blueprint grid + arcs + construction
 * geometry. Purely visual (aria-hidden), sits behind content.
 */
export function BlueprintBackdrop({ tone = 'light', className }: { tone?: 'light' | 'dark'; className?: string }) {
  const line = tone === 'dark' ? 'rgba(255,255,255,0.07)' : 'currentColor';
  return (
    <svg
      aria-hidden
      preserveAspectRatio="xMidYMid slice"
      className={`pointer-events-none absolute inset-0 h-full w-full ${className ?? ''}`}
    >
      <defs>
        <pattern id={`bp-grid-${tone}`} width="48" height="48" patternUnits="userSpaceOnUse">
          <path d="M 48 0 L 0 0 0 48" fill="none" stroke={line} strokeWidth="1" opacity="0.5" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#bp-grid-${tone})`} opacity={tone === 'dark' ? 1 : 0.12} />
      <circle cx="88%" cy="12%" r="140" fill="none" stroke="#2563EB" strokeWidth="1.5" opacity="0.35" />
      <circle cx="88%" cy="12%" r="90" fill="none" stroke="#2563EB" strokeWidth="1" opacity="0.25" strokeDasharray="6 6" />
      <circle cx="6%" cy="88%" r="110" fill="none" stroke="#F97316" strokeWidth="1.5" opacity="0.3" />
      <line x1="0" y1="22%" x2="100%" y2="22%" stroke="#2563EB" strokeWidth="1" opacity="0.18" strokeDasharray="12 8" />
      <rect x="72%" y="68%" width="120" height="120" fill="none" stroke="#F97316" strokeWidth="1" opacity="0.25" />
    </svg>
  );
}

/** Browser chrome frame for product previews, with an honest demo badge. */
export function BrowserFrame({ url, children }: { url: string; children: ReactNode }) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-2xl">
      <div className="flex items-center gap-3 border-b border-border bg-surface-muted/60 px-4 py-2.5">
        <span className="flex gap-1.5" aria-hidden>
          <span className="h-2.5 w-2.5 rounded-full bg-[#F97316]/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-foreground-muted/40" />
          <span className="h-2.5 w-2.5 rounded-full bg-foreground-muted/40" />
        </span>
        <span className="hidden flex-1 truncate rounded-md bg-background px-3 py-1 font-mono text-[11px] text-foreground-muted sm:block">
          {url}
        </span>
        <span className="rounded-full border border-dashed border-border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-foreground-muted">
          Demo preview
        </span>
      </div>
      <div className="bg-background p-3 sm:p-5">{children}</div>
    </div>
  );
}

/** Small annotation label used around showcase visuals. */
export function Annotation({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={`hidden items-center gap-1.5 rounded-full border border-border bg-surface px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-foreground-muted shadow-sm lg:inline-flex ${className ?? ''}`}
    >
      <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-[#2563EB]" />
      {children}
    </span>
  );
}
