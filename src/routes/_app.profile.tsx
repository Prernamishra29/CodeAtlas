import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { PageTransition } from "@/components/common/page-transition";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { authApi } from "@/lib/api/auth";
import { useAuthStore } from "@/store/auth-store";

export const Route = createFileRoute("/_app/profile")({
  head: () => ({
    meta: [
      { title: "Your profile — CodeAtlas" },
      { name: "description", content: "Your CodeAtlas profile and workspace activity." },
      { property: "og:title", content: "Your profile — CodeAtlas" },
      { property: "og:description", content: "Profile details and recent workspace activity." },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const user = useAuthStore((state) => state.user);
  const stats = useQuery({ queryKey: ["account-stats"], queryFn: authApi.stats });

  const cards = [
    { label: "Imported", value: stats.data?.repositories },
    { label: "Analyses", value: stats.data?.analyses },
    { label: "Questions", value: stats.data?.questions },
  ];

  return (
    <PageTransition>
      <div className="mx-auto max-w-3xl space-y-5">
        <div className="flex flex-wrap items-center gap-4 rounded-[1.7rem] bg-[#F3EDE4] p-5 text-zinc-950 sm:p-6">
          <span className="flex size-16 items-center justify-center rounded-full bg-zinc-950 font-display text-lg text-[#F3EDE4]">
            {user?.initials ?? "?"}
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-2xl font-semibold tracking-tight">{user?.name ?? "Guest"}</h1>
            <p className="mt-1 text-sm text-zinc-600">
              {user?.role || "Member"} · {user?.email}
            </p>
            <p className="mt-1 text-sm text-zinc-500">
              {user?.githubConnected ? "GitHub token saved" : "No GitHub token yet"}
            </p>
          </div>
          <Button asChild size="sm">
            <Link to="/settings">Edit profile</Link>
          </Button>
        </div>

        <ul className="grid gap-3 sm:grid-cols-3">
          {cards.map((card) => (
            <li key={card.label} className="rounded-[1.45rem] bg-white/[0.07] px-4 py-5 ring-1 ring-white/10">
              <p className="text-xs text-white/50">{card.label}</p>
              {stats.isLoading ? (
                <Skeleton className="mt-2 h-8 w-14" />
              ) : (
                <p className="mt-1 font-display text-3xl font-semibold tabular-nums text-white">{card.value ?? 0}</p>
              )}
            </li>
          ))}
        </ul>

        <div className="rounded-[1.45rem] bg-white/[0.07] p-5 ring-1 ring-white/10">
          <p className="text-sm text-white/60">
            This is your workspace count — repos you imported, analyses that finished, and questions you asked in chat.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button asChild size="sm" variant="outline">
              <Link to="/repositories">Open repositories</Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link to="/settings">GitHub token</Link>
            </Button>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
