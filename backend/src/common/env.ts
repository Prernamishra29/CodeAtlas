const WEAK_SECRETS = new Set([
  "change-me-in-production",
  "replace-with-a-long-random-string",
  "codeatlas-local-dev-secret",
  "codeatlas-local-dev-secret-change-later",
]);

export function isProduction() {
  return process.env.NODE_ENV === "production";
}

export function requireEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is not set`);
  }
  return value;
}

export function jwtSecret() {
  const value = requireEnv("JWT_SECRET");
  if (isProduction() && (WEAK_SECRETS.has(value) || value.length < 32)) {
    throw new Error("JWT_SECRET is too weak for production");
  }
  return value;
}

export function corsOrigins() {
  const raw = process.env.CORS_ORIGIN?.trim();
  if (!raw || raw === "*") {
    if (isProduction()) throw new Error("CORS_ORIGIN must be an explicit origin in production");
    return ["http://localhost:8080", "http://localhost:8081"];
  }
  return raw.split(",").map((item) => item.trim()).filter(Boolean);
}

export function accessTokenExpiresIn() {
  return process.env.JWT_ACCESS_EXPIRES_IN?.trim() || "15m";
}

export function refreshTokenDays() {
  const days = Number(process.env.JWT_REFRESH_DAYS ?? 7);
  return Number.isFinite(days) && days > 0 ? days : 7;
}

export function frontendUrl() {
  return process.env.FRONTEND_URL?.trim() || corsOrigins()[0] || "http://localhost:8080";
}

export function apiPublicUrl() {
  return process.env.API_PUBLIC_URL?.trim() || `http://localhost:${process.env.PORT ?? 3333}`;
}

export function googleOAuthConfig() {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) return null;
  return {
    clientId,
    clientSecret,
    redirectUri: `${apiPublicUrl()}/auth/google/callback`,
  };
}

export function githubOAuthConfig() {
  const clientId = process.env.GITHUB_CLIENT_ID?.trim();
  const clientSecret = process.env.GITHUB_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) return null;
  return {
    clientId,
    clientSecret,
    redirectUri: `${apiPublicUrl()}/auth/github/callback`,
  };
}

export function assertRuntimeSecrets() {
  jwtSecret();
  requireEnv("DATABASE_URL");
  corsOrigins();
}
