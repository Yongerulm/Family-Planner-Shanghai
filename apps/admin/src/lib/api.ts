import axios, { AxiosError } from 'axios';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? '';

export const api = axios.create({
  baseURL: `${API_BASE}/api/v1`,
  timeout: 15_000,
  headers: { 'Content-Type': 'application/json' },
});

// Attach access token to every request
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('fp_access_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auto-redirect to login on 401
api.interceptors.response.use(
  (r) => r,
  (error: AxiosError) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('fp_access_token');
      localStorage.removeItem('fp_refresh_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  },
);

// ─── Auth ─────────────────────────────────────────────────────────────────────

export async function login(email: string, password: string) {
  const { data } = await api.post<{
    data: { accessToken: string; refreshToken: string; user: { role: string } };
  }>('/auth/login', { email, password });
  return data.data;
}

// ─── Admin ────────────────────────────────────────────────────────────────────

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
