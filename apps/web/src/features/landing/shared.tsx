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
