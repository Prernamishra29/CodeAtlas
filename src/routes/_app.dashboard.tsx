import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { PageTransition } from "@/components/common/page-transition";
import { RepoWindow } from "@/components/common/repo-window";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { repositoriesApi } from "@/lib/api/repositories";
import { useAuthStore } from "@/store/auth-store";
import { useUiStore } from "@/store/ui-store";

export const Route = createFileRoute("/_app/dashboard")({
  head: () => ({
    meta: [{ title: "Overview — CodeAtlas workspace" }],
  }),
  component: DashboardPage,
});

function firstName(name: string | undefined) {
  return name?.trim().split(/\s+/)[0] ?? "";
}

function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const setImportModalOpen = useUiStore((s) => s.setImportModalOpen);
  const repositories = useQuery({
    queryKey: ["repositories"],
    queryFn: repositoriesApi.list,
    refetchInterval: (q) =>
      (q.state.data ?? []).some((r) => r.status === "queued" || r.status === "analyzing") ? 3000 : false,
  });

  const repos = repositories.data ?? [];
  const name = firstName(user?.name);

  return (
    <PageTransition>
      <div className="mx-auto max-w-5xl">
        <h1 className="font-display text-2xl font-semibold tracking-tight">
          {name ? `Hi ${name}` : "Overview"}
        </h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/70">
          These are the GitHub repos you imported. Each window is one repository. Health is out of 100.
          Click a window to open its architecture map, health report, and AI chat.
        </p>

        {repositories.isLoading ? (
          <Skeleton className="mt-8 h-64 rounded-3xl" />
        ) : repos.length === 0 ? (
          <div className="mt-10">
            <p className="text-sm leading-relaxed text-white/50">
              Paste a GitHub URL with Import. CodeAtlas will map the code and give it a health score.
            </p>
            <Button className="mt-4" size="sm" onClick={() => setImportModalOpen(true)}>
              Import a repository
            </Button>
          </div>
        ) : (
          <ul className="mt-10 grid gap-x-8 gap-y-12 sm:grid-cols-2">
            {repos.map((repo, index) => (
              <li key={repo.id}>
                <RepoWindow repo={repo} index={index} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </PageTransition>
  );
}
