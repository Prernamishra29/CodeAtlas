import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { repositoriesApi } from "@/lib/api/repositories";
import { useUiStore } from "@/store/ui-store";

export function CommandPalette() {
  const { commandPaletteOpen, setCommandPaletteOpen, setImportModalOpen } = useUiStore();
  const navigate = useNavigate();
  const repositories = useQuery({
    queryKey: ["repositories"],
    queryFn: repositoriesApi.list,
    enabled: commandPaletteOpen,
  });

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setCommandPaletteOpen(!commandPaletteOpen);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [commandPaletteOpen, setCommandPaletteOpen]);

  const close = () => setCommandPaletteOpen(false);

  return (
    <CommandDialog open={commandPaletteOpen} onOpenChange={setCommandPaletteOpen}>
      <CommandInput placeholder="Search pages, repositories and actions…" />
      <CommandList>
        <CommandEmpty>No matches found.</CommandEmpty>
        <CommandGroup heading="Navigate">
          <CommandItem
            onSelect={() => {
              close();
              void navigate({ to: "/dashboard" });
            }}
          >
            Overview
          </CommandItem>
          <CommandItem
            onSelect={() => {
              close();
              void navigate({ to: "/repositories" });
            }}
          >
            Repositories
          </CommandItem>
          <CommandItem
            onSelect={() => {
              close();
              void navigate({ to: "/settings" });
            }}
          >
            Settings
          </CommandItem>
          <CommandItem
            onSelect={() => {
              close();
              void navigate({ to: "/profile" });
            }}
          >
            Profile
          </CommandItem>
        </CommandGroup>
        {(repositories.data ?? []).length > 0 ? (
          <CommandGroup heading="Your repositories">
            {repositories.data?.map((repo) => (
              <CommandItem
                key={repo.id}
                value={`${repo.owner}/${repo.name}`}
                onSelect={() => {
                  close();
                  void navigate({ to: "/repositories/$id", params: { id: repo.id } });
                }}
              >
                {repo.owner}/{repo.name}
              </CommandItem>
            ))}
          </CommandGroup>
        ) : null}
        <CommandGroup heading="Actions">
          <CommandItem
            onSelect={() => {
              close();
              setImportModalOpen(true);
            }}
          >
            Import repository
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
