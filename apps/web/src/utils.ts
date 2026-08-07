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

export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
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
