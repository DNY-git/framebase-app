import { useState } from 'react';
import { Button } from '../components/ui/button';
import {
  PageHeader,
  DataCard,
  StatCard,
  ContentCard,
  EmptyState,
  LoadingState,
  ErrorState,
  SearchInput,
  FilterBar,
  TableToolbar,
} from '../components/ui';
import { Wrench, FolderKanban, Plus, AlertTriangle } from '../shared/components/icons';

const VARIANTS = [
  { name: 'Default', variant: 'default' as const },
  { name: 'Secondary', variant: 'secondary' as const },
  { name: 'Outline', variant: 'outline' as const },
  { name: 'Ghost', variant: 'ghost' as const },
  { name: 'Link', variant: 'link' as const },
  { name: 'Destructive', variant: 'destructive' as const },
];

const SIZES = [
  { name: 'xs', size: 'xs' as const },
  { name: 'sm', size: 'sm' as const },
  { name: 'default', size: 'default' as const },
  { name: 'lg', size: 'lg' as const },
  { name: 'icon', size: 'icon' as const },
];

export function UiLab(): React.JSX.Element {
  const [query, setQuery] = useState('');

  return (
    <main className="mx-auto max-w-3xl space-y-10 p-8">
      <header>
        <h1 className="text-2xl font-semibold text-foreground">UI Lab — shadcn/ui</h1>
        <p className="text-sm text-foreground-muted">
          Temporary smoke page for the shadcn/ui infrastructure. Renders every Button variant and size.
        </p>
      </header>

      <section className="space-y-4">
        <h2 className="text-lg font-medium text-foreground">Variants</h2>
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-surface p-4">
          {VARIANTS.map(({ name, variant }) => (
            <Button key={variant} variant={variant}>
              {name}
            </Button>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-medium text-foreground">Sizes</h2>
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-surface p-4">
          {SIZES.map(({ name, size }) => (
            <Button key={size} size={size}>
              {name}
            </Button>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-medium text-foreground">States</h2>
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-surface p-4">
          <Button disabled>Disabled</Button>
          <Button variant="outline" disabled>
            Disabled Outline
          </Button>
          <Button variant="destructive" disabled>
            Disabled Destructive
          </Button>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-medium text-foreground">Design Foundation</h2>
        <div className="space-y-4 rounded-lg border border-border bg-surface p-4">
          <PageHeader
            title="Sample Page"
            subtitle="Reusable primitives composed together."
            actions={
              <>
                <Button variant="outline">Cancel</Button>
                <Button>
                  <Plus className="size-4" />
                  New
                </Button>
              </>
            }
          />

          <FilterBar>
            <SearchInput value={query} onChange={setQuery} placeholder="Search sample..." />
            <Button variant="outline">Filter</Button>
          </FilterBar>

          <TableToolbar title="Table title" description="Table description">
            <Button variant="outline" size="sm">
              Export
            </Button>
          </TableToolbar>

          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard icon={FolderKanban} label="Active projects" value={12} subtext="3 on hold" accentClassName="bg-primary" />
            <StatCard icon={Wrench} label="Equipment" value="86%" subtext="21/24 assigned" accentClassName="bg-info" />
            <StatCard icon={AlertTriangle} label="At risk" value={3} accentClassName="bg-danger" />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <DataCard title="Data card" description="ContentCard + SectionHeader.">
              <p className="text-sm text-foreground-muted">Body content goes here.</p>
            </DataCard>
            <ContentCard>
              <p className="text-sm text-foreground-muted">Plain content card.</p>
            </ContentCard>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <EmptyState
              icon={Wrench}
              title="No equipment found"
              description="Add equipment to start tracking your fleet."
              action={<Button variant="outline" size="sm">Add equipment</Button>}
            />
            <div className="space-y-4">
              <LoadingState label="Loading equipment..." />
              <ErrorState title="Failed to load" message="The request could not be completed." onRetry={() => undefined} />
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
