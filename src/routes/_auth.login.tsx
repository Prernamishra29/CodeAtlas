import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth/login")({
  validateSearch: (search: Record<string, unknown>) => {
    const oauthError = typeof search.oauthError === "string" ? search.oauthError : undefined;
    return oauthError ? { oauthError } : {};
  },
  head: () => ({
    meta: [
      { title: "Sign in — CodeAtlas" },
      { name: "description", content: "Sign in to your CodeAtlas workspace." },
    ],
  }),
  component: () => null,
});
