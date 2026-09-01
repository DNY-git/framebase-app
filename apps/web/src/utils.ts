/**
 * Shared frontend utilities — eliminates duplication across feature components.
 */

export interface PaginatedEnvelope<T> {
  data?: T[] | { items?: T[] };
  meta?: { page: number; perPage: number; totalItems: number; totalPages: number };
}

/**
 * Unwraps the various API response envelope shapes into a flat array.
 */
export function unwrapList<T>(json: PaginatedEnvelope<T>): T[] {
  if (Array.isArray(json.data)) return json.data;
  if (json.data && typeof json.data === 'object' && 'items' in json.data && Array.isArray(json.data.items)) {
    return json.data.items;
  }
  return [];
}

export interface DetailEnvelope<T> {
  data?: T | { data?: T };
}

/** Unwraps the `{ data: item }` / `{ data: { data: item } }` envelope shapes. */
export function unwrapItem<T>(json: DetailEnvelope<T>): T {
  if (json.data && typeof json.data === 'object' && 'data' in json.data) {
    return json.data.data as T;
  }
  return json.data as T;
}

export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatCurrency(cents: number): string {
  return formatCompactCurrency(cents);
}

export function formatCompactCurrency(cents: number | null | undefined): string {
  if (cents == null) return '—';
  const dollars = cents / 100;
  const sign = dollars < 0 ? '-' : '';
  const abs = Math.abs(dollars);
  if (abs < 1_000) return `${sign}$${abs.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
  if (abs < 1_000_000) return `${sign}$${(abs / 1_000).toFixed(1)}K`;
  if (abs < 1_000_000_000) return `${sign}$${(abs / 1_000_000).toFixed(1)}M`;
  return `${sign}$${(abs / 1_000_000_000).toFixed(1)}Bn`;
}

export function formatCentsCompact(cents: number): string {
  return formatCompactCurrency(cents);
}

/**
 * Typed fetch helper that returns parsed JSON.
 * Throws on non-ok responses with the server error message.
 */
export async function fetchJson<T>(url: string, token: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...init?.headers,
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.message ?? `Request failed (${res.status})`);
  }
  return res.json() as Promise<T>;
}
