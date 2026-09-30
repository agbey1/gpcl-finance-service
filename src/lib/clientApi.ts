/**
 * Browser-side helpers shared by the dashboard pages.
 */

/** Calls a JSON API; throws with the server's message on failure and sends the user to /login on 401. */
export async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.status === 'ERROR') {
    if (res.status === 401 && typeof window !== 'undefined') window.location.href = '/login';
    throw new Error(data.message || `Request failed (${res.status})`);
  }
  return data as T;
}

export function postJson<T>(url: string, body: unknown, idempotencyKey?: string): Promise<T> {
  return api<T>(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}),
    },
    body: JSON.stringify(body),
  });
}

/** Unique request key. crypto.randomUUID is unavailable on plain-http origins, so fall back. */
export const newKey = (): string =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

export const fmt = (n: number | string | null | undefined): string =>
  Number(n ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** YYYY-MM-DD part of an ISO date string. */
export const day = (d: string | null | undefined): string => (d ? String(d).slice(0, 10) : '');

export const todayIso = (): string => new Date().toISOString().slice(0, 10);

export const errMsg = (e: unknown, fallback: string): string => (e instanceof Error ? e.message : fallback);
