const TOKEN_KEY = "codeatlas_token";
const REFRESH_KEY = "codeatlas_refresh";

export const API_BASE_URL = (import.meta.env.VITE_API_URL as string | undefined) || "http://localhost:3333";

export const IS_MOCK_API = false;

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status = 400,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function getAccessToken() {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setAccessToken(token: string | null) {
  if (typeof window === "undefined") return;
  if (token) window.localStorage.setItem(TOKEN_KEY, token);
  else window.localStorage.removeItem(TOKEN_KEY);
}

export function getRefreshToken() {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(REFRESH_KEY);
}

export function setRefreshToken(token: string | null) {
  if (typeof window === "undefined") return;
  if (token) window.localStorage.setItem(REFRESH_KEY, token);
  else window.localStorage.removeItem(REFRESH_KEY);
}

let refreshInFlight: Promise<boolean> | null = null;

async function refreshSession() {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;
  const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
  });
  if (!response.ok) {
    setAccessToken(null);
    setRefreshToken(null);
    return false;
  }
  const payload = (await response.json()) as { accessToken?: string; refreshToken?: string };
  if (!payload.accessToken || !payload.refreshToken) return false;
  setAccessToken(payload.accessToken);
  setRefreshToken(payload.refreshToken);
  return true;
}

function shouldAttemptRefresh(path: string, status: number) {
  if (status !== 401) return false;
  return !path.startsWith("/auth/login") && !path.startsWith("/auth/register") && !path.startsWith("/auth/refresh");
}

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  const token = getAccessToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);

  let response = await fetch(`${API_BASE_URL}${path}`, { ...init, headers });

  if (shouldAttemptRefresh(path, response.status)) {
    refreshInFlight ??= refreshSession().finally(() => {
      refreshInFlight = null;
    });
    const ok = await refreshInFlight;
    if (ok) {
      const retryHeaders = new Headers(init.headers);
      if (init.body && !retryHeaders.has("Content-Type")) retryHeaders.set("Content-Type", "application/json");
      const next = getAccessToken();
      if (next) retryHeaders.set("Authorization", `Bearer ${next}`);
      response = await fetch(`${API_BASE_URL}${path}`, { ...init, headers: retryHeaders });
    }
  }

  if (response.status === 204) return undefined as T;

  const text = await response.text();
  let payload: unknown = null;
  if (text) {
    try {
      payload = JSON.parse(text) as unknown;
    } catch {
      payload = text;
    }
  }

  if (!response.ok) {
    const message =
      payload && typeof payload === "object" && "message" in payload
        ? Array.isArray((payload as { message: unknown }).message)
          ? ((payload as { message: string[] }).message[0] ?? "Request failed")
          : String((payload as { message: string }).message)
        : `Request failed (${response.status})`;
    throw new ApiError(message, response.status);
  }

  return payload as T;
}
