/**
 * Admin Panel API Client
 *
 * Auth-Strategie (XSS-Schutz):
 * - Access Token:  In-Memory-Variable (kein localStorage/sessionStorage)
 *                 Läuft nach 15 min ab; XSS-Schaden begrenzt auf 15 min
 * - Refresh Token: httpOnly SameSite=Strict Cookie, gesetzt von /api/auth/login (Next.js Route Handler)
 *                 Nicht von JavaScript lesbar; wird nur serverseitig von /api/auth/refresh verwendet
 *
 * Bei Seiten-Reload: restoreSession() tauscht den Cookie server-seitig gegen neuen Access Token
 * Bei 401: Interceptor ruft /api/auth/refresh automatisch auf
 */

import axios, { AxiosError } from 'axios';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? '';

// ─── In-memory access token (nie in localStorage) ────────────────────────────
let inMemoryAccessToken: string | null = null;
let refreshInFlight: Promise<string> | null = null;

export function setAccessToken(token: string | null) {
  inMemoryAccessToken = token;
}

// ─── Axios client → NestJS Backend ───────────────────────────────────────────
export const api = axios.create({
  baseURL: `${API_BASE}/api/v1`,
  timeout: 15_000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  if (inMemoryAccessToken) {
    config.headers.Authorization = `Bearer ${inMemoryAccessToken}`;
  }
  return config;
});

api.interceptors.response.use(
  (r) => r,
  async (error: AxiosError) => {
    const original = error.config as typeof error.config & { _retry?: boolean };
    if (error.response?.status === 401 && original && !original._retry) {
      original._retry = true;
      try {
        const newToken = await getOrRefreshToken();
        original.headers = { ...original.headers, Authorization: `Bearer ${newToken}` };
        return api(original);
      } catch {
        inMemoryAccessToken = null;
        if (typeof window !== 'undefined') window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  },
);

function getOrRefreshToken(): Promise<string> {
  if (!refreshInFlight) {
    refreshInFlight = doRefresh().finally(() => { refreshInFlight = null; });
  }
  return refreshInFlight;
}

async function doRefresh(): Promise<string> {
  // Next.js Route Handler liest httpOnly Cookie serverseitig
  const res = await fetch('/api/auth/refresh', { method: 'POST', credentials: 'same-origin' });
  if (!res.ok) throw new Error('Session abgelaufen');
  const data = await res.json() as { accessToken: string };
  inMemoryAccessToken = data.accessToken;
  return data.accessToken;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

/**
 * Login via Next.js Route Handler.
 * Setzt httpOnly Refresh-Token-Cookie server-seitig.
 * Gibt Access Token zurück (wird in-memory gespeichert).
 */
export async function login(email: string, password: string) {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { message?: string };
    throw new Error(err.message ?? 'Login fehlgeschlagen');
  }
  const data = await res.json() as {
    accessToken: string;
    user: { id: string; email: string; role: string };
  };
  inMemoryAccessToken = data.accessToken;
  return data;
}

/** Logout: löscht In-Memory-Token und httpOnly Cookie */
export async function logout() {
  inMemoryAccessToken = null;
  await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' }).catch(() => {});
}

/**
 * Beim Seiten-Reload: tauscht httpOnly Refresh-Token-Cookie gegen neuen Access Token.
 * Gibt User zurück wenn Session aktiv ist, sonst null.
 */
export async function restoreSession(): Promise<{ id: string; email: string; role: string } | null> {
  try {
    const res = await fetch('/api/auth/refresh', { method: 'POST', credentials: 'same-origin' });
    if (!res.ok) return null;
    const data = await res.json() as { accessToken: string; user: { id: string; email: string; role: string } };
    inMemoryAccessToken = data.accessToken;
    return data.user;
  } catch {
    return null;
  }
}

// ─── Admin API ────────────────────────────────────────────────────────────────

export async function getStats() {
  const { data } = await api.get<{ data: { totalUsers: number; totalFamilies: number; serverTime: string } }>('/admin/stats');
  return data.data;
}

export async function listUsers(page = 1, limit = 20, search?: string) {
  const params: Record<string, unknown> = { page, limit };
  if (search) params.search = search;
  const { data } = await api.get('/admin/users', { params });
  return data;
}

export async function getUser(id: string) {
  const { data } = await api.get(`/admin/users/${id}`);
  return data.data;
}

export async function updateUser(id: string, payload: { displayName?: string; isActive?: boolean }) {
  const { data } = await api.patch(`/admin/users/${id}`, payload);
  return data.data;
}

export async function deleteUser(id: string) {
  await api.delete(`/admin/users/${id}`);
}

export async function listFamilies(page = 1, limit = 20) {
  const { data } = await api.get('/admin/families', { params: { page, limit } });
  return data;
}

export async function getFamily(id: string) {
  const { data } = await api.get(`/admin/families/${id}`);
  return data.data;
}

export async function deleteFamily(id: string) {
  await api.delete(`/admin/families/${id}`);
}
