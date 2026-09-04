import { SectionHeading, Reveal } from './shared';

/**
 * Placeholder-ready testimonial area. No fabricated quotes, companies,
 * ratings or counts — structured so real testimonials slot in later.
 */
export function TestimonialPlaceholder() {
  return (
    <section aria-labelledby="stories-heading" className="border-t border-border">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:py-20">
        <Reveal>
          <div id="stories-heading">
            <SectionHeading
              eyebrow="12 — Customer stories"
              title="Designed around the way construction teams actually work."
              sub="Real project voices will live here. The layout is ready — quotes, roles and company names slot straight in."
            />
          </div>
        </Reveal>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {['Project Manager', 'Site Engineer', 'Business Owner'].map((role, i) => (
            <Reveal key={role} delayMs={i * 70}>
              <figure className="flex h-full min-h-44 flex-col justify-between rounded-xl border border-dashed border-border bg-surface-muted/40 p-5">
                <blockquote className="text-sm italic leading-6 text-foreground-muted">
                  “Customer story slot — reserved for a real {role.toLowerCase()} testimonial.”
                </blockquote>
                <figcaption className="mt-4 border-t border-dashed border-border pt-3">
                  <p className="text-xs font-semibold text-foreground">[ Name ]</p>
                  <p className="font-mono text-[10px] uppercase tracking-wider text-foreground-muted">{role} · [ Company ]</p>
                </figcaption>
              </figure>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
