/**
 * API Client
 * Wrapper around fetch that automatically attaches Firebase auth tokens
 */

import { auth } from './firebase';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

async function getAuthToken(): Promise<string | null> {
  const user = auth.currentUser;
  if (!user) return null;
  return user.getIdToken();
}

interface FetchOptions extends RequestInit {
  data?: Record<string, unknown> | FormData;
}

async function apiFetch<T>(path: string, options: FetchOptions = {}): Promise<T> {
  const token = await getAuthToken();
  const { data, ...fetchOptions } = options;

  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  let body: BodyInit | undefined;

  if (data instanceof FormData) {
    body = data;
    // Don't set Content-Type — browser sets it with boundary
  } else if (data) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(data);
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...fetchOptions,
    headers: { ...headers, ...(fetchOptions.headers as Record<string, string> || {}) },
    body,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || `HTTP ${res.status}`);
  }

  return res.json();
}

// Convenience methods
export const api = {
  get:    <T>(path: string, opts?: FetchOptions) => apiFetch<T>(path, { method: 'GET', ...opts }),
  post:   <T>(path: string, data?: FetchOptions['data'], opts?: FetchOptions) =>
            apiFetch<T>(path, { method: 'POST', data, ...opts }),
  put:    <T>(path: string, data?: FetchOptions['data'], opts?: FetchOptions) =>
            apiFetch<T>(path, { method: 'PUT', data, ...opts }),
  delete: <T>(path: string, opts?: FetchOptions) => apiFetch<T>(path, { method: 'DELETE', ...opts }),
};

export default apiFetch;
