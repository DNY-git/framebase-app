import { FileText, Download } from '../../shared/components/icons';
import { SectionHeading, Reveal } from './shared';

const DOCS = [
  { name: 'Building Plan — Block B', meta: 'PDF · 4.2 MB · v3', tag: 'Drawings' },
  { name: 'Site Report — Week 12', meta: 'PDF · 1.1 MB', tag: 'Reports' },
  { name: 'Material Schedule Q3', meta: 'XLSX · 860 KB', tag: 'Procurement' },
  { name: 'Safety Report — July', meta: 'PDF · 640 KB', tag: 'Safety' },
  { name: 'Invoice — Steel Supplier', meta: 'PDF · 320 KB · Linked to expense', tag: 'Finance' },
  { name: 'Project Contract', meta: 'PDF · 2.8 MB · Signed', tag: 'Legal' },
] as const;

export function DocumentsSection() {
  return (
    <section aria-labelledby="docs-heading" className="border-t border-border bg-surface-muted/40">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:py-20">
        <div className="grid items-start gap-8 lg:grid-cols-5">
          <Reveal className="lg:col-span-2">
            <div id="docs-heading" className="lg:sticky lg:top-24">
              <SectionHeading
                align="left"
                eyebrow="09 — Documents"
                title="Nothing important gets lost."
                sub="Keep project information organized, accessible and connected to the project — plans, reports, schedules and contracts in one register."
              />
            </div>
          </Reveal>
          <ul className="space-y-2.5 lg:col-span-3">
            {DOCS.map((d, i) => (
              <li key={d.name}>
                <Reveal delayMs={Math.min(i * 50, 250)}>
                  <div className="group flex items-center gap-3 rounded-xl border border-border bg-surface p-3.5 shadow-sm transition-colors hover:border-[#2563EB]/40">
                    <span className="flex h-10 w-9 shrink-0 flex-col items-center justify-center rounded-md border border-[#2563EB]/30 bg-[#2563EB]/5">
                      <FileText className="h-4 w-4 text-[#2563EB]" aria-hidden />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-foreground">{d.name}</p>
                      <p className="mt-0.5 font-mono text-[10px] uppercase tracking-wider text-foreground-muted">
                        {d.tag} · {d.meta}
                      </p>
                    </div>
                    <Download className="h-4 w-4 shrink-0 text-foreground-muted opacity-0 transition-opacity group-hover:opacity-100" aria-hidden />
                  </div>
                </Reveal>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
