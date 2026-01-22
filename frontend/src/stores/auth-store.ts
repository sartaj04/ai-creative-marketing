import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authApi } from '@/lib/api';

interface User {
    id: string;
    email: string;
    full_name?: string;
    tier: 'free' | 'starter' | 'pro';
    segment?: 'ecommerce' | 'saas' | 'personal';
    usage_count: number;
    usage_limit: number;
    can_generate: boolean;
    is_admin: boolean;
}

interface AuthState {
    user: User | null;
    token: string | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    isInitialized: boolean;

    // Actions
    login: (email: string, password: string) => Promise<void>;
    register: (email: string, password: string, fullName?: string, segment?: string) => Promise<void>;
    logout: () => void;
    setUser: (user: User) => void;
    fetchUser: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set, get) => ({
            user: null,
            token: null,
            isLoading: false,
            isAuthenticated: false,
            isInitialized: false,

            login: async (email: string, password: string) => {
                set({ isLoading: true });
                try {
                    const response = await authApi.login({ email, password });
                    const { access_token, user } = response.data;

                    localStorage.setItem('token', access_token);
                    set({
                        token: access_token,
                        user,
                        isAuthenticated: true,
                        isInitialized: true,
                        isLoading: false,
                    });
                } catch (error) {
                    set({ isLoading: false });
                    throw error;
                }
            },

            register: async (email: string, password: string, fullName?: string, segment?: string) => {
                set({ isLoading: true });
                try {
                    const response = await authApi.register({
                        email,
                        password,
                        full_name: fullName,
                        segment,
                    });
                    const { access_token, user } = response.data;

                    localStorage.setItem('token', access_token);
                    set({
                        token: access_token,
                        user,
                        isAuthenticated: true,
                        isInitialized: true,
                        isLoading: false,
                    });
                } catch (error) {
                    set({ isLoading: false });
                    throw error;
                }
            },

            logout: () => {
                localStorage.removeItem('token');
                set({
                    user: null,
                    token: null,
                    isAuthenticated: false,
                    isInitialized: true,
                    isLoading: false,
                });
            },

            setUser: (user: User) => {
                set({ user, isAuthenticated: !!user });
            },

            fetchUser: async () => {
                const token = get().token || localStorage.getItem('token');

                if (!token) {
                    set({
                        user: null,
                        isAuthenticated: false,
                        isInitialized: true,
                        isLoading: false
                    });
                    return;
                }

                set({ isLoading: true });
                try {
                    const response = await authApi.me();
                    set({
                        user: response.data,
                        isAuthenticated: true,
                        isInitialized: true,
                        isLoading: false,
                    });
                } catch (error) {
                    // Only clear token if it's actually an auth error
                    const status = (error as any)?.response?.status;
                    if (status === 401 || status === 403) {
                        localStorage.removeItem('token');
                        set({
                            user: null,
                            token: null,
                            isAuthenticated: false,
                            isInitialized: true,
                            isLoading: false,
                        });
                    } else {
                        // For network errors, etc., keep the token but stop loading
                        set({
                            isLoading: false,
                            isInitialized: true
                        });
                    }
                }
            },
        }),
        {
            name: 'auth-storage',
            partialize: (state) => ({ token: state.token }),
        }
    )
);


