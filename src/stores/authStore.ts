import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { login as fusionAuthLogin, isTokenExpired } from '../services/auth';
import { useSettingsStore } from './settingsStore';

interface AuthUser {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
}

interface AuthStore {
  token: string | null;
  refreshToken: string | null;
  user: AuthUser | null;
  isLoading: boolean;
  error: string | null;

  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  clearError: () => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      token: null,
      refreshToken: null,
      user: null,
      isLoading: false,
      error: null,

      login: async (email, password) => {
        set({ isLoading: true, error: null });
        try {
          const result = await fusionAuthLogin(email, password);
          set({
            token: result.token,
            refreshToken: result.refreshToken || null,
            user: {
              id: result.user.id,
              email: result.user.email,
              firstName: result.user.firstName,
              lastName: result.user.lastName,
            },
            isLoading: false,
            error: null,
          });

          // Auto-set tenant ID from JWT if available
          if (result.tenantId) {
            useSettingsStore
              .getState()
              .updateSettings({ wsapiTenantId: result.tenantId });
          }
        } catch (err: any) {
          set({ isLoading: false, error: err.message || 'Login failed' });
          throw err;
        }
      },

      logout: () => {
        set({
          token: null,
          refreshToken: null,
          user: null,
          error: null,
        });
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'auth-store',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        token: state.token,
        refreshToken: state.refreshToken,
        user: state.user,
      }),
    },
  ),
);

/** Check if user has a valid (non-expired) token. */
export function isAuthenticated(): boolean {
  const { token } = useAuthStore.getState();
  if (!token) return false;
  return !isTokenExpired(token);
}

/** Get the current valid token, or null if expired/missing. */
export function getAuthToken(): string | null {
  const { token } = useAuthStore.getState();
  if (!token) return null;
  if (isTokenExpired(token)) return null;
  return token;
}
