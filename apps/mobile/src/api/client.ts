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

// ─── Retry-Interceptor (transiente Netzwerkfehler + 5xx) ────────────────────
// Retries: 3 Versuche, exponential backoff 1s / 2s / 4s
// Wird NICHT bei 4xx ausgeführt (Client-Fehler → kein Retry sinnvoll)

const MAX_RETRIES = 3;

apiClient.interceptors.response.use(
  (r) => r,
  async (error: AxiosError) => {
    const config = error.config as AxiosRequestConfig & {
      _retry?: boolean;
      _retryCount?: number;
    };

    if (!config) return Promise.reject(error);

    const status = error.response?.status;
    const isNetworkError = !error.response; // Timeout, no connection
    const isServerError = status !== undefined && status >= 500;
    const isRetryable = isNetworkError || isServerError;

    // 401 wird vom Token-Refresh-Interceptor darunter behandelt
    if (!isRetryable || status === 401) {
      return Promise.reject(error);
    }

    config._retryCount = (config._retryCount ?? 0) + 1;

    if (config._retryCount > MAX_RETRIES) {
      return Promise.reject(error);
    }

    // Exponential backoff: 1s, 2s, 4s
    const delay = 1000 * Math.pow(2, config._retryCount - 1);
    await new Promise((resolve) => setTimeout(resolve, delay));

    return apiClient(config);
  },
);

// ─── Token Refresh (401) ──────────────────────────────────────────────────────

let refreshPromise: Promise<string> | null = null;

apiClient.interceptors.response.use(
  (r) => r,
  async (error: AxiosError) => {
    const original = error.config as AxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status === 401 && original && !original._retry) {
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
  registerDeviceToken: (payload: {
    deviceId: string;
    platform: 'apns' | 'fcm';
    pushToken: string;
    appVersion?: string;
  }) => apiClient.patch('/notifications/device-token', payload),
  removeDeviceToken: (deviceId: string) =>
    apiClient.delete(`/notifications/device-token/${deviceId}`),
};
