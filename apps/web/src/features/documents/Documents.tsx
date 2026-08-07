import { useState } from 'react';

import { PageHeader } from '@/components/ui/page-header';
import { FilterBar } from '@/components/ui/filter-bar';
import { ContentCard } from '@/components/ui/content-card';
import { EmptyState } from '@/components/ui/empty-state';
import { SearchInput } from '@/components/ui/search-input';
import { FolderOpen, Plus } from '@/shared/components/icons';
import { FilterDropdown } from '@/shared/components/FilterDropdown';

const TABLE_HEADERS = ['Name', 'Type', 'Project', 'Uploaded by', 'Date', 'Size'];

export function Documents() {
  const [search, setSearch] = useState('');

  return (
    <div className="space-y-6">
      <PageHeader
        title="Documents"
        subtitle="Store and manage project documents and files"
        actions={
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-lg bg-success px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-success/90"
          >
            <Plus className="h-4 w-4" /> Upload
          </button>
        }
      />

      <FilterBar>
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search documents..."
          ariaLabel="Search documents"
          className="w-full max-w-xs"
        />
        <FilterDropdown
          placeholder="All projects"
          className="w-full sm:w-44"
          value=""
          onChange={() => {}}
          options={[{ value: '', label: 'All projects' }]}
        />
        <FilterDropdown
          placeholder="All types"
          className="w-full sm:w-44"
          value=""
          onChange={() => {}}
          options={[{ value: '', label: 'All types' }]}
        />
      </FilterBar>

      <ContentCard className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-muted/60 text-left">
                {TABLE_HEADERS.map((header) => (
                  <th
                    key={header}
                    className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-foreground-muted"
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={TABLE_HEADERS.length} className="px-4 py-6">
                  <EmptyState
                    title="No documents yet"
                    description="Upload a document to attach contracts, drawings, and reports to your projects."
                    icon={FolderOpen}
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </ContentCard>
    </div>
  );
}
