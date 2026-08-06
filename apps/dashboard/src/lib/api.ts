// Cliente da API CyberHub via proxy do Next.js (rewrite /api/* → localhost:3001).
// Mesmo-origem (localhost:3000) → cookies httpOnly fluem no browser corretamente.
const BASE = '/api';

export interface ApiUser {
  id: string;
  email: string;
  name: string | null;
  role: string;
}

export async function api<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...opts,
    headers: { 'content-type': 'application/json', ...(opts.headers ?? {}) },
    credentials: 'include',
    cache: 'no-store',
  });
  if (!res.ok) {
    let message = `HTTP ${res.status}`;
    try {
      const body = (await res.json()) as { message?: string; error?: { message?: string } };
      message = body.error?.message ?? body.message ?? message;
    } catch {
      // corpo não-JSON
    }
    throw new Error(message);
  }
  return (await res.json()) as T;
}