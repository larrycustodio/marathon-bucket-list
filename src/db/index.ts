/**
 * REST API client — replaces the IndexedDB layer.
 *
 * All calls go to the Vercel Go serverless functions under /api/events.
 * The hooks layer (src/hooks/useEvents.ts) is unchanged; only this file swaps out.
 *
 * Auth: the Supabase session access_token is injected as a Bearer token on every
 * request. The Go backend validates it via PostgREST + Supabase JWT verification
 * and enforces row-level security (RLS) automatically.
 *
 * Environment: VITE_API_BASE_URL can override the base URL (useful for local dev
 * with `vercel dev` on a different port). Defaults to the same origin (/api).
 */

import type { MarathonEvent, MarathonEventInput } from '../types';
import { supabase } from '../lib/supabase';

const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? '') + '/api';

// ─── helpers ─────────────────────────────────────────────────────────────────

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  // Attach the current session's access token so the Go handler can identify
  // the user and PostgREST can enforce RLS.
  const { data: { session } } = await supabase.auth.getSession();

  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(session && { Authorization: `Bearer ${session.access_token}` }),
      ...init?.headers,
    },
  });

  if (res.status === 204) {
    // No body (DELETE success)
    return undefined as unknown as T;
  }

  const body = await res.json().catch(() => ({ error: res.statusText }));

  if (!res.ok) {
    throw new Error(body?.error ?? `API error ${res.status}`);
  }

  return body as T;
}

// ─── public API (matches the IndexedDB interface exactly) ────────────────────

/**
 * Returns all events. The server applies no pagination by default (limit=1000)
 * so the full list is returned for client-side filtering and pagination.
 */
export async function getEvents(): Promise<MarathonEvent[]> {
  const { data } = await apiFetch<{ data: MarathonEvent[] }>('/events?limit=1000');
  return data ?? [];
}

/** Returns a single event by ID, or undefined if not found. */
export async function getEvent(id: string): Promise<MarathonEvent | undefined> {
  try {
    return await apiFetch<MarathonEvent>(`/events/${encodeURIComponent(id)}`);
  } catch (err) {
    if (err instanceof Error && err.message === 'event not found') return undefined;
    throw err;
  }
}

/** Creates a new event. The server assigns id, status, createdAt, updatedAt. */
export async function createEvent(input: MarathonEventInput): Promise<MarathonEvent> {
  return apiFetch<MarathonEvent>('/events', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

/** Updates an existing event by ID. Re-derives status from finishedDate. */
export async function updateEvent(
  id: string,
  updates: Partial<MarathonEventInput>,
): Promise<MarathonEvent> {
  return apiFetch<MarathonEvent>(`/events/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  });
}

/** Hard-deletes an event. */
export async function deleteEvent(id: string): Promise<void> {
  await apiFetch<void>(`/events/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}
