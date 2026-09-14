import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { analysisApi } from "@/lib/api/analysis";

/** Cancels a stuck/in-flight run if needed, then queues a fresh analysis. */
export function useRetryAnalysis() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (repositoryId: string) => analysisApi.retry(repositoryId),
    onSuccess: async (result, repositoryId) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["analysis", repositoryId] }),
        queryClient.invalidateQueries({ queryKey: ["repositories"] }),
        queryClient.invalidateQueries({ queryKey: ["activity"] }),
        queryClient.invalidateQueries({ queryKey: ["insights"] }),
      ]);
      toast.success("Analysis queued", {
        description: `Job ${result.analysisId.slice(0, 8)} — watch progress on the repository page.`,
      });
    },
    onError: (error: Error) => toast.error(error.message),
  });
}
