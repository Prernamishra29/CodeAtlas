import { apiRequest, setAccessToken, setRefreshToken, getRefreshToken } from "./client";

export interface Credentials {
  email: string;
  password: string;
}

export interface RegisterPayload extends Credentials {
  name: string;
}

export interface AuthUserDto {
  id: string;
  email: string;
  name: string;
  role: string;
  notifyAnalysis: boolean;
  notifyInsights: boolean;
  compactDensity: boolean;
  githubConnected: boolean;
}

export interface ProfileUpdate {
  name?: string;
  role?: string;
  email?: string;
  notifyAnalysis?: boolean;
  notifyInsights?: boolean;
  compactDensity?: boolean;
}

export interface AccountStats {
  repositories: number;
  analyses: number;
  questions: number;
}

async function storeSession(result: {
  user: AuthUserDto;
  accessToken: string;
  refreshToken?: string;
}) {
  setAccessToken(result.accessToken);
  if (result.refreshToken) setRefreshToken(result.refreshToken);
  return result.user;
}

export const authApi = {
  async login(payload: Credentials) {
    const result = await apiRequest<{
      user: AuthUserDto;
      accessToken: string;
      refreshToken?: string;
    }>("/auth/login", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return storeSession(result);
  },

  async register(payload: RegisterPayload) {
    const result = await apiRequest<{
      user: AuthUserDto;
      accessToken: string;
      refreshToken?: string;
    }>("/auth/register", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return storeSession(result);
  },

  async forgotPassword(email: string) {
    return apiRequest<{ ok: true; resetUrl?: string }>("/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
  },

  async resetPassword(token: string, newPassword: string) {
    return apiRequest<{ ok: true }>("/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({ token, newPassword }),
    });
  },

  async me() {
    return apiRequest<AuthUserDto>("/auth/me");
  },

  async updateMe(payload: ProfileUpdate) {
    return apiRequest<AuthUserDto>("/auth/me", {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },

  async changePassword(currentPassword: string, newPassword: string) {
    return apiRequest<{ ok: true }>("/auth/password", {
      method: "POST",
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  },

  async stats() {
    return apiRequest<AccountStats>("/auth/stats");
  },

  async saveGithubToken(token: string) {
    return apiRequest<AuthUserDto>("/auth/github-token", {
      method: "POST",
      body: JSON.stringify({ token }),
    });
  },

  async clearGithubToken() {
    return apiRequest<AuthUserDto>("/auth/github-token", { method: "DELETE" });
  },

  async deleteAccount() {
    return apiRequest<{ id: string }>("/auth/me", { method: "DELETE" });
  },

  async logout() {
    const refreshToken = getRefreshToken();
    try {
      if (refreshToken) {
        await apiRequest("/auth/logout", {
          method: "POST",
          body: JSON.stringify({ refreshToken }),
        });
      }
    } catch {
      /* session is ending regardless */
    }
    setAccessToken(null);
    setRefreshToken(null);
  },
};
