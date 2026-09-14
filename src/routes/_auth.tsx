import { Link, Outlet, createFileRoute, useRouterState } from "@tanstack/react-router";
import { AuthSwap } from "@/features/auth/auth-swap";

export const Route = createFileRoute("/_auth")({
  component: AuthLayout,
});

function AuthLayout() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const mode = pathname.includes("register") ? "register" : "login";

  return (
    <>
      <AuthSwap mode={mode} />
      <Outlet />
    </>
  );
}
