import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { analysisApi } from "@/lib/api/analysis";
import { repositoriesApi } from "@/lib/api/repositories";

import { useUiStore } from "@/store/ui-store";
import { useAuthStore } from "@/store/auth-store";

const schema = z.object({
  url: z
    .string()
    .trim()
    .min(1, "A repository URL is required.")
    .regex(
      /^https:\/\/github\.com\/[\w.-]+\/[\w.-]+\/?$/,
      "Use the form https://github.com/user/project",
    ),
  branch: z.string().trim().max(80, "Branch name is too long.").optional(),
});

type FormValues = z.infer<typeof schema>;

/** Creates a real repository record, then queues an Analysis record for it. */
export function ImportRepositoryModal() {
  const { importModalOpen, setImportModalOpen } = useUiStore();
  const githubConnected = useAuthStore((state) => state.user?.githubConnected);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { url: "", branch: "" },
    mode: "onBlur",
  });

  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const repository = await repositoriesApi.create({
        url: values.url,
        branch: values.branch?.trim() || "main",
      });
      await analysisApi.start(repository.id);
      return repository;
    },
    onSuccess: async (repository) => {
      await queryClient.invalidateQueries({ queryKey: ["repositories"] });
      toast.success(`${repository.owner}/${repository.name} imported`, {
        description: "An analysis record was queued for this repository.",
      });
      form.reset();
      setImportModalOpen(false);
      void navigate({ to: "/repositories/$id", params: { id: repository.id } });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <Dialog open={importModalOpen} onOpenChange={setImportModalOpen}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Import repository</DialogTitle>
          <DialogDescription>
            Public repositories work immediately. Private repositories need a GitHub token saved in
            Settings.
          </DialogDescription>
        </DialogHeader>

        <form
          className="space-y-4"
          onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
          noValidate
        >
          <div className="space-y-1.5">
            <Label htmlFor="repo-url">GitHub repository URL</Label>
            <Input
              id="repo-url"
              placeholder="https://github.com/user/project"
              autoComplete="off"
              aria-invalid={Boolean(form.formState.errors.url)}
              {...form.register("url")}
            />
            {form.formState.errors.url ? (
              <p className="text-xs text-destructive">{form.formState.errors.url.message}</p>
            ) : githubConnected ? (
              <p className="text-xs text-muted-foreground">
                Example: https://github.com/user/project — a GitHub token is saved on this account.
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                Public example: https://github.com/user/project. For private repos, save a token in{" "}
                <Link
                  to="/settings"
                  className="text-primary underline-offset-4 hover:underline"
                  onClick={() => setImportModalOpen(false)}
                >
                  Settings → GitHub
                </Link>
                .
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="repo-branch">Branch</Label>
            <Input id="repo-branch" placeholder="Default branch" {...form.register("branch")} />
            {form.formState.errors.branch ? (
              <p className="text-xs text-destructive">{form.formState.errors.branch.message}</p>
            ) : (
              <p className="text-xs text-muted-foreground">
                Leave empty to use the default branch.
              </p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setImportModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending} className="gap-2">
              {mutation.isPending ? <Loader2 className="size-3.5 animate-spin" /> : null}
              Analyze repository
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
