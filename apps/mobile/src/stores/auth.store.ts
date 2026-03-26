import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';

export type UserRole = 'super_admin' | 'family_admin' | 'adult' | 'child';

interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  familyId?: string;
  displayName?: string;
}

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;

  // Actions
  login: (accessToken: string, refreshToken: string, user: AuthUser) => Promise<void>;
  logout: () => Promise<void>;
  hydrate: () => Promise<void>;
  setUser: (user: AuthUser) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  isLoading: true,
  isAuthenticated: false,

  login: async (accessToken, refreshToken, user) => {
    await SecureStore.setItemAsync('fp_access_token', accessToken);
    await SecureStore.setItemAsync('fp_refresh_token', refreshToken);
    await SecureStore.setItemAsync('fp_user', JSON.stringify(user));
    set({ user, accessToken, isAuthenticated: true, isLoading: false });
  },

  logout: async () => {
    await SecureStore.deleteItemAsync('fp_access_token');
    await SecureStore.deleteItemAsync('fp_refresh_token');
    await SecureStore.deleteItemAsync('fp_user');
    set({ user: null, accessToken: null, isAuthenticated: false, isLoading: false });
  },

  hydrate: async () => {
    try {
      const [token, userJson] = await Promise.all([
        SecureStore.getItemAsync('fp_access_token'),
        SecureStore.getItemAsync('fp_user'),
      ]);

      if (token && userJson) {
        const user = JSON.parse(userJson) as AuthUser;
        set({ user, accessToken: token, isAuthenticated: true, isLoading: false });
      } else {
        set({ isLoading: false });
      }
    } catch {
      set({ isLoading: false });
    }
  },

  setUser: (user) => set({ user }),
}));
