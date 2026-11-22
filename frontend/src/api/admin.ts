export const API_BASE_URL =(import.meta.env.VITE_API_URL || 'http://localhost:3000/api').replace(/\/$/, '');
const TOKEN_STORAGE_KEY = 'servigest_token';

export type ApiList<T> = {
  data: T[];
  meta: { page: number; limit: number; total: number };
};

export class ApiRequestError extends Error {
  constructor(message: string, readonly code?: string) {
    super(message);
    this.name = 'ApiRequestError';
  }
}

export function readApiToken() {
  return sessionStorage.getItem(TOKEN_STORAGE_KEY) ?? '';
}

export function saveApiToken(token: string) {
  const normalizedToken = token.trim();
  if (normalizedToken) sessionStorage.setItem(TOKEN_STORAGE_KEY, normalizedToken);
  else sessionStorage.removeItem(TOKEN_STORAGE_KEY);
}

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  const token = readApiToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');

  const response = await fetch(`${API_BASE_URL}${path}`, { ...init, headers });
  if (response.status === 204) return undefined as T;

  const payload = (await response.json()) as {
    data?: T;
    error?: { code?: string; message?: string };
  };
  if (!response.ok) {
    throw new ApiRequestError(
      payload.error?.message || 'No se pudo completar la solicitud.',
      payload.error?.code,
    );
  }
  return payload as T;
}
