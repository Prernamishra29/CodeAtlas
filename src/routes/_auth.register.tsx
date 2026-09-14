import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth/register")({
  head: () => ({
    meta: [
      { title: "Create an account — CodeAtlas" },
      {
        name: "description",
        content: "Create a CodeAtlas account and import a GitHub repository.",
      },
    ],
  }),
  component: () => null,
});
