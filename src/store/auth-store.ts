import { create } from "zustand";
import type { AuthUser } from "@/types";
import {
  authApi,
  type AuthUserDto,
  type Credentials,
  type ProfileUpdate,
  type RegisterPayload,
} from "@/lib/api/auth";
import { getAccessToken, setAccessToken, setRefreshToken } from "@/lib/api/client";

interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isReady: boolean;
  isSubmitting: boolean;
  error: string | null;
  login: (credentials: Credentials) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  finishOAuth: (accessToken: string, refreshToken: string) => Promise<void>;
  updateProfile: (payload: ProfileUpdate) => Promise<void>;
  saveGithubToken: (token: string) => Promise<void>;
  clearGithubToken: () => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
  hydrate: () => Promise<void>;
}

function initials(name: string, email: string) {
  const source = name.trim() || email.split("@")[0] || "U";
  return source
    .split(/[\s._-]+/)
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function applyDensity(compact: boolean) {
  if (typeof document === "undefined") return;
  document.documentElement.dataset.density = compact ? "compact" : "comfortable";
}

function toAuthUser(user: AuthUserDto): AuthUser {
  return {
    id: user.id,
    name: user.name || user.email.split("@")[0] || "Engineer",
    email: user.email,
    role: user.role || "Member",
    initials: initials(user.name, user.email),
    notifyAnalysis: user.notifyAnalysis ?? true,
    notifyInsights: user.notifyInsights ?? false,
    compactDensity: user.compactDensity ?? false,
    githubConnected: user.githubConnected ?? false,
  };
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isReady: false,
  isSubmitting: false,
  error: null,
  clearError: () => set({ error: null }),

  hydrate: async () => {
    if (!getAccessToken()) {
      set({ user: null, isAuthenticated: false, isReady: true });
      applyDensity(false);
      return;
    }
    try {
      const me = await authApi.me();
      const user = toAuthUser(me);
      applyDensity(user.compactDensity);
      set({
        user,
        isAuthenticated: true,
        isReady: true,
      });
    } catch {
      authApi.logout();
      applyDensity(false);
      set({ user: null, isAuthenticated: false, isReady: true });
    }
  },

  login: async (credentials) => {
    set({ isSubmitting: true, error: null });
    try {
      const dto = await authApi.login(credentials);
      const user = toAuthUser(dto);
      applyDensity(user.compactDensity);
      set({
        user,
        isAuthenticated: true,
        isReady: true,
        isSubmitting: false,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Sign in failed.";
      set({ isSubmitting: false, error: message });
      throw error;
    }
  },

  register: async (payload) => {
    set({ isSubmitting: true, error: null });
    try {
      const dto = await authApi.register(payload);
      const user = toAuthUser(dto);
      applyDensity(user.compactDensity);
      set({
        user,
        isAuthenticated: true,
        isReady: true,
        isSubmitting: false,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Registration failed.";
      set({ isSubmitting: false, error: message });
      throw error;
    }
  },

  finishOAuth: async (accessToken, refreshToken) => {
    setAccessToken(accessToken);
    setRefreshToken(refreshToken);
    const dto = await authApi.me();
    const user = toAuthUser(dto);
    applyDensity(user.compactDensity);
    set({
      user,
      isAuthenticated: true,
      isReady: true,
      isSubmitting: false,
      error: null,
    });
  },

  updateProfile: async (payload) => {
    const dto = await authApi.updateMe(payload);
    const user = toAuthUser(dto);
    applyDensity(user.compactDensity);
    set({ user });
  },

  saveGithubToken: async (token) => {
    const dto = await authApi.saveGithubToken(token);
    set({ user: toAuthUser(dto) });
  },

  clearGithubToken: async () => {
    const dto = await authApi.clearGithubToken();
    set({ user: toAuthUser(dto) });
  },

  logout: async () => {
    await authApi.logout();
    applyDensity(false);
    set({ user: null, isAuthenticated: false, isReady: true });
  },
}));
