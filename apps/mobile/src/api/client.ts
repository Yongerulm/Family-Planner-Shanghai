import axios, { AxiosError, AxiosRequestConfig } from 'axios';
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';

const API_URL = Constants.expoConfig?.extra?.apiUrl
  ?? process.env.API_URL
  ?? 'https://api.yourdomain.tld';

export const apiClient = axios.create({
  baseURL: `${API_URL}/api/v1`,
  timeout: 15_000,
  headers: {
    'Content-Type': 'application/json',
    'X-Platform': 'mobile',
  },
});

// ─── Token Attachment ─────────────────────────────────────────────────────────

apiClient.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('fp_access_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ─── Token Refresh ────────────────────────────────────────────────────────────

let refreshPromise: Promise<string> | null = null;

apiClient.interceptors.response.use(
  (r) => r,
  async (error: AxiosError) => {
    const original = error.config as AxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;

      if (!refreshPromise) {
        refreshPromise = refreshAccessToken().finally(() => {
          refreshPromise = null;
        });
      }

      try {
        const newToken = await refreshPromise;
        original.headers = { ...original.headers, Authorization: `Bearer ${newToken}` };
        return apiClient(original);
      } catch {
        // Refresh gescheitert → Logout
        await SecureStore.deleteItemAsync('fp_access_token');
        await SecureStore.deleteItemAsync('fp_refresh_token');
        // AuthStore wird durch useAuthStore.getState().logout() informiert
        const { useAuthStore } = await import('../stores/auth.store');
        useAuthStore.getState().logout();
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  },
);

async function refreshAccessToken(): Promise<string> {
  const refreshToken = await SecureStore.getItemAsync('fp_refresh_token');
  if (!refreshToken) throw new Error('No refresh token');

  const { data } = await axios.post(`${API_URL}/api/v1/auth/refresh`, {
    refreshToken,
  });

  const newAccessToken: string = data.data.accessToken;
  const newRefreshToken: string = data.data.refreshToken;

  await SecureStore.setItemAsync('fp_access_token', newAccessToken);
  await SecureStore.setItemAsync('fp_refresh_token', newRefreshToken);

  return newAccessToken;
}

// ─── API Functions ────────────────────────────────────────────────────────────

export const authApi = {
  login: (email: string, password: string) =>
    apiClient.post<{
      data: { accessToken: string; refreshToken: string; user: { id: string; email: string; role: string; familyId?: string } };
    }>('/auth/login', { email, password }),

  logout: () => apiClient.post('/auth/logout'),

  me: () => apiClient.get('/auth/me'),
};

export const shoppingApi = {
  getLists: (familyId: string) => apiClient.get(`/families/${familyId}/shopping`),
  getList: (familyId: string, listId: string) => apiClient.get(`/families/${familyId}/shopping/${listId}`),
  checkItem: (familyId: string, listId: string, itemId: string, checked: boolean) =>
    apiClient.patch(`/families/${familyId}/shopping/${listId}/items/${itemId}`, { isChecked: checked }),
};

export const tasksApi = {
  getLists: (familyId: string) => apiClient.get(`/families/${familyId}/tasks`),
  getItems: (familyId: string, listId: string) => apiClient.get(`/families/${familyId}/tasks/${listId}/items`),
  completeItem: (familyId: string, listId: string, itemId: string) =>
    apiClient.patch(`/families/${familyId}/tasks/${listId}/items/${itemId}`, { isCompleted: true }),
};

export const calendarApi = {
  getEvents: (familyId: string, from: string, to: string) =>
    apiClient.get(`/families/${familyId}/calendar`, { params: { from, to } }),
};

export const notificationsApi = {
  getAll: () => apiClient.get('/notifications'),
  markRead: (id: string) => apiClient.patch(`/notifications/${id}/read`),
  markAllRead: () => apiClient.post('/notifications/read-all'),
};
