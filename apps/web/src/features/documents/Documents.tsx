import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { DocumentDomain, ProjectDomain } from '@constructtrack/types';

import { PageHeader } from '@/components/ui/page-header';
import { FilterBar } from '@/components/ui/filter-bar';
import { ContentCard } from '@/components/ui/content-card';
import { EmptyState } from '@/components/ui/empty-state';
import { SearchInput } from '@/components/ui/search-input';
import { FolderOpen, Plus, Loader2, Trash, Download } from '@/shared/components/icons';
import { FilterDropdown } from '@/shared/components/FilterDropdown';
import { unwrapList, formatDate } from '../../utils';
import { authFetch } from '../../auth-fetch';
import { useAuthStore } from '../../stores/auth-store';

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const TABLE_HEADERS = ['Name', 'Type', 'Project', 'Uploaded by', 'Date', 'Size'];

export function Documents() {
  const { user } = useAuthStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [documents, setDocuments] = useState<DocumentDomain[]>([]);
  const [projects, setProjects] = useState<ProjectDomain[]>([]);
  const [search, setSearch] = useState('');
  const [filterProjectId, setFilterProjectId] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<DocumentDomain | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filterProjectId) params.set('projectId', filterProjectId);
      if (search.trim()) params.set('search', search.trim());
      const query = params.toString();

      const [docRes, projectRes] = await Promise.all([
        authFetch(`/api/v1/documents${query ? `?${query}` : ''}`),
        authFetch('/api/v1/projects'),
      ]);
      if (!docRes.ok) throw new Error('Failed to fetch documents');
      if (!projectRes.ok) throw new Error('Failed to fetch projects');
      const docJson = await docRes.json();
      const projectJson = await projectRes.json();
      setDocuments(unwrapList<DocumentDomain>(docJson));
      setProjects(unwrapList<ProjectDomain>(projectJson));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  }, [filterProjectId, search]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setIsUploading(true);
    setError(null);
    setSuccess(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      if (filterProjectId) formData.append('projectId', filterProjectId);

      const res = await authFetch('/api/v1/documents', {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => null);
        throw new Error(errBody?.message ?? 'Failed to upload document');
      }
      setSuccess(`Uploaded ${file.name}`);
      await fetchData();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsUploading(false);
    }
  }

  async function handleDownload(doc: DocumentDomain) {
    setError(null);
    try {
      const res = await authFetch(`/api/v1/documents/${doc.id}/download`);
      if (!res.ok) throw new Error('Failed to download document');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = doc.name;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function handleDelete() {
    if (!pendingDelete) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      const res = await authFetch(`/api/v1/documents/${pendingDelete.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const errBody = await res.json().catch(() => null);
        throw new Error(errBody?.message ?? 'Failed to delete document');
      }
      setPendingDelete(null);
      setSuccess(`Deleted ${pendingDelete.name}`);
      await fetchData();
    } catch (err) {
      setDeleteError((err as Error).message);
    } finally {
      setIsDeleting(false);
    }
  }

  const projectMap = useMemo(() => new Map(projects.map((p) => [p.id, p])), [projects]);
  const canDelete = useCallback(
    (doc: DocumentDomain) => (user?.role === 'admin' || user?.id === doc.uploadedBy) ?? false,
    [user],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Documents"
        subtitle="Store and manage project documents and files"
        actions={
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="inline-flex items-center gap-2 rounded-lg bg-success px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-success/90 disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            {isUploading ? 'Uploading...' : 'Upload'}
          </button>
        }
      />

      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        aria-hidden="true"
        onChange={(e) => { void handleFileSelected(e); }}
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
          value={filterProjectId}
          onChange={setFilterProjectId}
          options={[
            { value: '', label: 'All projects' },
            ...projects.map((p) => ({ value: p.id, label: p.name })),
          ]}
        />
      </FilterBar>

      {error && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-danger/20 bg-danger/5 p-3 text-sm text-danger">
          <span>{error}</span>
          <button onClick={() => fetchData()} className="shrink-0 font-medium underline">Retry</button>
        </div>
      )}
      {success && (
        <div className="rounded-lg border border-success/20 bg-success/5 p-3 text-sm text-success">
          {success}
        </div>
      )}

      <ContentCard className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
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
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={TABLE_HEADERS.length + 1} className="px-4 py-8">
                    <div className="flex items-center justify-center gap-2 text-sm text-foreground-muted">
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                      Loading documents...
                    </div>
                  </td>
                </tr>
              ) : documents.length === 0 ? (
                <tr>
                  <td colSpan={TABLE_HEADERS.length + 1} className="px-4 py-6">
                    <EmptyState
                      title="No documents yet"
                      description="Upload a document to attach contracts, drawings, and reports to your projects."
                      icon={FolderOpen}
                    />
                  </td>
                </tr>
              ) : (
                documents.map((doc) => {
                  const project = projectMap.get(doc.projectId ?? '');
                  return (
                    <tr key={doc.id} className="border-b border-border last:border-0">
                      <td className="px-4 py-3 font-medium text-foreground">{doc.name}</td>
                      <td className="px-4 py-3 text-sm text-foreground-muted">
                        {doc.mimeType || 'Unknown type'}
                      </td>
                      <td className="px-4 py-3 text-sm text-foreground-muted">
                        {project?.name ?? (doc.projectId ? 'Related project' : '—')}
                      </td>
                      <td className="px-4 py-3 text-sm text-foreground-muted">
                        {doc.uploadedBy ? doc.uploadedBy.slice(0, 8) : '—'}
                      </td>
                      <td className="px-4 py-3 text-sm text-foreground-muted">{formatDate(doc.createdAt)}</td>
                      <td className="px-4 py-3 text-sm text-foreground-muted">{formatFileSize(doc.sizeBytes)}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => { void handleDownload(doc); }}
                            title="Download"
                            aria-label={`Download ${doc.name}`}
                            className="rounded-md p-2 text-foreground-muted transition-colors hover:bg-surface-muted hover:text-foreground"
                          >
                            <Download className="h-4 w-4" />
                          </button>
                          {user && canDelete(doc) && (
                            <button
                              type="button"
                              onClick={() => setPendingDelete(doc)}
                              title="Delete"
                              aria-label={`Delete ${doc.name}`}
                              className="rounded-md p-2 text-foreground-muted transition-colors hover:bg-surface-muted hover:text-danger"
                            >
                              <Trash className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </ContentCard>

      {/* Delete Confirmation Modal */}
      {pendingDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl border border-border bg-surface p-6 shadow-lg">
            <h3 className="mb-2 text-lg font-semibold text-foreground">Delete document?</h3>
            <p className="text-sm text-foreground-muted">
              <span className="font-medium text-foreground">{pendingDelete.name}</span> will be permanently
              removed. This cannot be undone.
            </p>
            {deleteError && (
              <div className="mt-4 rounded-lg border border-danger/20 bg-danger/5 p-3 text-sm text-danger">
                {deleteError}
              </div>
            )}
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => { setPendingDelete(null); setDeleteError(null); }}
                className="h-10 rounded-lg border border-border bg-surface px-4 text-sm font-medium text-foreground transition-colors hover:bg-surface-muted"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => { void handleDelete(); }}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-danger px-4 text-sm font-medium text-white transition-colors hover:bg-danger/90 disabled:opacity-50"
              >
                {isDeleting && <Loader2 className="h-4 w-4 animate-spin" />}
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}