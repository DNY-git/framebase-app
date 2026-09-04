import { Package, Wrench, ClipboardList } from '../../shared/components/icons';
import { SectionHeading, Reveal } from './shared';

const MATERIALS = [
  { name: 'Cement', detail: '240 bags · Dangote 50kg', pct: 62 },
  { name: 'Steel', detail: '12 t · 12mm rebar', pct: 45 },
  { name: 'Blocks', detail: '800 units · 9-inch', pct: 28 },
  { name: 'Sand', detail: 'Low stock · reorder', pct: 12, low: true },
] as const;

const EQUIPMENT = [
  { name: 'Excavator CAT-320', status: 'Assigned', tone: 'bg-[#2563EB]/10 text-[#2563EB]' },
  { name: 'Concrete Mixer', status: 'Available', tone: 'bg-emerald-500/10 text-emerald-600' },
  { name: 'Generator 45kVA', status: 'Maintenance', tone: 'bg-[#F97316]/10 text-[#F97316]' },
  { name: 'Tipper Truck', status: 'Assigned', tone: 'bg-[#2563EB]/10 text-[#2563EB]' },
] as const;

const INVENTORY = [
  { label: 'Available', value: '18', tone: 'text-emerald-600' },
  { label: 'Assigned', value: '9', tone: 'text-[#2563EB]' },
  { label: 'Low stock', value: '4', tone: 'text-[#F97316]' },
  { label: 'Maintenance', value: '2', tone: 'text-foreground-muted' },
] as const;

export function ResourcesSection() {
  return (
    <section aria-labelledby="resources-heading" className="border-t border-border">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:py-20">
        <Reveal>
          <div id="resources-heading">
            <SectionHeading
              eyebrow="08 — Resources"
              title="Know what you have before you need it."
              sub="Materials, equipment and inventory connect directly to projects — no separate spreadsheets."
            />
          </div>
        </Reveal>

        <div className="mt-10 grid gap-4 lg:grid-cols-3">
          <Reveal>
            <article className="h-full rounded-xl border border-border bg-surface p-5 shadow-sm">
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#2563EB]/10 text-[#2563EB]">
                  <Package className="h-4 w-4" aria-hidden />
                </span>
                <h3 className="font-mono text-xs font-bold uppercase tracking-widest text-foreground">Materials</h3>
              </div>
              <ul className="mt-4 space-y-3">
                {MATERIALS.map((m) => (
                  <li key={m.name}>
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-foreground">{m.name}</span>
                      <span className={m.low ? 'font-semibold text-[#F97316]' : 'text-foreground-muted'}>{m.detail}</span>
                    </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-muted">
                      <div className={`h-full rounded-full ${m.low ? 'bg-[#F97316]' : 'bg-[#2563EB]'}`} style={{ width: `${m.pct}%` }} />
                    </div>
                  </li>
                ))}
              </ul>
            </article>
          </Reveal>

          <Reveal delayMs={80}>
            <article className="h-full rounded-xl border border-border bg-surface p-5 shadow-sm">
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#F97316]/10 text-[#F97316]">
                  <Wrench className="h-4 w-4" aria-hidden />
                </span>
                <h3 className="font-mono text-xs font-bold uppercase tracking-widest text-foreground">Equipment</h3>
              </div>
              <ul className="mt-4 space-y-2">
                {EQUIPMENT.map((e) => (
                  <li key={e.name} className="flex items-center justify-between gap-2 rounded-lg border border-border bg-background px-3 py-2">
                    <span className="truncate text-xs font-medium text-foreground">{e.name}</span>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${e.tone}`}>{e.status}</span>
                  </li>
                ))}
              </ul>
            </article>
          </Reveal>

          <Reveal delayMs={160}>
            <article className="h-full rounded-xl bg-[#0B1020] p-5 text-white shadow-sm">
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 text-white">
                  <ClipboardList className="h-4 w-4" aria-hidden />
                </span>
                <h3 className="font-mono text-xs font-bold uppercase tracking-widest">Inventory</h3>
              </div>
              <ul className="mt-4 grid grid-cols-2 gap-2">
                {INVENTORY.map((s) => (
                  <li key={s.label} className="rounded-lg border border-white/15 bg-white/5 p-3">
                    <p className={`text-2xl font-bold ${s.tone === 'text-foreground-muted' ? 'text-white/70' : s.tone}`}>{s.value}</p>
                    <p className="mt-0.5 font-mono text-[10px] uppercase tracking-wider text-white/60">{s.label}</p>
                  </li>
                ))}
              </ul>
              <p className="mt-4 text-[11px] leading-5 text-white/60">Representative demo figures illustrating live stock states.</p>
            </article>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
