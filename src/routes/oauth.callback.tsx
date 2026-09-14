import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/auth-store";

export const Route = createFileRoute("/oauth/callback")({
  ssr: false,
  validateSearch: (search: Record<string, unknown>) => ({
    accessToken: typeof search.accessToken === "string" ? search.accessToken : "",
    refreshToken: typeof search.refreshToken === "string" ? search.refreshToken : "",
  }),
  component: OauthCallbackPage,
});

function OauthCallbackPage() {
  const { accessToken, refreshToken } = Route.useSearch();
  const finishOAuth = useAuthStore((s) => s.finishOAuth);
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!accessToken || !refreshToken) {
        setError("Missing tokens from the provider.");
        return;
      }
      try {
        await finishOAuth(accessToken, refreshToken);
        if (!cancelled) await navigate({ to: "/dashboard" });
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Sign-in failed.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [accessToken, refreshToken, finishOAuth, navigate]);

  return (
    <div className="grid min-h-dvh place-items-center bg-[#1c1c22] px-6 text-center">
      <p className="text-sm text-white/60">{error ?? "Signing you in…"}</p>
    </div>
  );
}
