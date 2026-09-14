import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { PageTransition } from "@/components/common/page-transition";
import { Button } from "@/components/ui/button";
import { notificationsApi } from "@/lib/api/notifications";

export const Route = createFileRoute("/_app/activity")({
  head: () => ({
    meta: [{ title: "Activity — CodeAtlas" }],
  }),
  component: ActivityPage,
});

function ActivityPage() {
  const queryClient = useQueryClient();
  const items = useQuery({
    queryKey: ["notifications"],
    queryFn: notificationsApi.list,
    refetchInterval: 20_000,
  });
  const markAll = useMutation({
    mutationFn: notificationsApi.markAllRead,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["notifications"] });
      await queryClient.invalidateQueries({ queryKey: ["notifications-unread"] });
    },
  });
  const markOne = useMutation({
    mutationFn: notificationsApi.markRead,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["notifications"] });
      await queryClient.invalidateQueries({ queryKey: ["notifications-unread"] });
    },
  });

  const list = items.data ?? [];

  return (
    <PageTransition>
      <div className="mx-auto max-w-3xl">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-display text-3xl font-semibold tracking-tight text-white">Activity</h1>
            <p className="mt-2 max-w-lg text-sm leading-relaxed text-white/60">
              Analysis finished, failed, or docs generated. Email is sent only when SMTP or Resend is configured.
            </p>
          </div>
          {list.some((item) => !item.readAt) ? (
            <Button variant="outline" disabled={markAll.isPending} onClick={() => markAll.mutate()}>
              Mark all read
            </Button>
          ) : null}
        </div>

        {list.length === 0 ? (
          <div className="mt-6 rounded-[1.6rem] bg-[#F3EDE4] p-5 text-sm text-zinc-700">
            Nothing yet. Import a repo and keep the worker running — completions show up here.
          </div>
        ) : (
          <ul className="mt-6 space-y-3">
            {list.map((item) => (
              <li
                key={item.id}
                className="rounded-[1.45rem] bg-white/[0.07] p-5 ring-1 ring-white/10"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-display text-lg font-semibold text-white">{item.title}</p>
                    <p className="mt-1 text-sm leading-relaxed text-white/60">{item.body}</p>
                    <p className="mt-2 text-[11px] uppercase tracking-[0.12em] text-white/35">
                      {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {item.repositoryId ? (
                      <Button asChild size="sm">
                        <Link to="/repositories/$id" params={{ id: item.repositoryId }}>
                          Open repo
                        </Link>
                      </Button>
                    ) : null}
                    {!item.readAt ? (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={markOne.isPending}
                        onClick={() => markOne.mutate(item.id)}
                      >
                        Mark read
                      </Button>
                    ) : null}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </PageTransition>
  );
}
