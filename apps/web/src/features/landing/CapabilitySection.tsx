import {
  FolderKanban,
  Users,
  Package,
  CheckSquare,
  Wrench,
  FileText,
  ClipboardList,
} from '../../shared/components/icons';
import { SectionHeading, Reveal } from './shared';

const CAPABILITIES = [
  { icon: FolderKanban, title: 'Projects', text: 'Budgets, timelines and phases in one place.' },
  { icon: Users, title: 'Teams', text: 'Roles, access and responsibilities per project.' },
  { icon: Package, title: 'Budgets', text: 'Planned vs actual spend, always visible.' },
  { icon: CheckSquare, title: 'Tasks', text: 'Assignments, progress and dependencies.' },
  { icon: ClipboardList, title: 'Materials', text: 'Stock levels, deliveries and usage.' },
  { icon: Wrench, title: 'Equipment', text: 'Assignments, status and maintenance.' },
  { icon: FileText, title: 'Documents', text: 'Plans, reports and contracts, filed.' },
] as const;

export function CapabilitySection() {
  return (
    <section id="product" aria-labelledby="capability-heading" className="scroll-mt-20 border-t border-border bg-surface-muted/40">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:py-20">
        <Reveal>
          <div id="capability-heading">
            <SectionHeading
              eyebrow="01 — Product"
              title="Everything your construction team needs, connected."
              sub="Seven capabilities, one workspace. No more jumping between tools to answer simple questions."
            />
          </div>
        </Reveal>
        <ul className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {CAPABILITIES.map(({ icon: Icon, title, text }, i) => (
            <li key={title} className={i === 0 ? 'sm:col-span-2 lg:col-span-1' : ''}>
              <Reveal delayMs={Math.min(i * 60, 300)}>
                <div className="flex h-full items-start gap-3 rounded-xl border border-border bg-surface p-4 shadow-sm transition-colors hover:border-[#2563EB]/40">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#2563EB]/10 text-[#2563EB]">
                    <Icon className="h-4.5 w-4.5" aria-hidden />
                  </span>
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">{title}</h3>
                    <p className="mt-1 text-xs leading-5 text-foreground-muted">{text}</p>
                  </div>
                </div>
              </Reveal>
            </li>
          ))}
          <li>
            <Reveal delayMs={300}>
              <div className="flex h-full flex-col justify-between rounded-xl bg-[#0B1020] p-4 text-white shadow-sm">
                <p className="font-mono text-[10px] uppercase tracking-widest text-white/60">Connected</p>
                <p className="mt-2 text-sm font-semibold leading-6">
                  One workspace.
                  <br />
                  Zero scattered tools.
                </p>
              </div>
            </Reveal>
          </li>
        </ul>
      </div>
    </section>
  );
}
