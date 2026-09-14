import { createFileRoute, redirect } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/app-shell";
import { useAuthStore } from "@/store/auth-store";

export const Route = createFileRoute("/_app")({
  ssr: false,
  beforeLoad: async () => {
    if (!useAuthStore.getState().isReady) await useAuthStore.getState().hydrate();
    if (!useAuthStore.getState().isAuthenticated) throw redirect({ to: "/login" });
  },
  component: AppShell,
});
