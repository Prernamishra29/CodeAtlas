import { useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";

import { Menu, Plus, Search } from "lucide-react";
import { BrandMark } from "@/components/common/brand-mark";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { useAuthStore } from "@/store/auth-store";
import { useUiStore } from "@/store/ui-store";

const crumbNames: Record<string, string> = {
  dashboard: "Dashboard",
  repositories: "Repositories",
  architecture: "Architecture",
  dependencies: "Dependencies",
  files: "Files",
  search: "Search",
  chat: "AI Chat",
  health: "Health",
  documentation: "Documentation",
  settings: "Settings",
  profile: "Profile",
  help: "Help",
};

function looksLikeId(segment: string) {
  return /^[0-9a-f]{8}-[0-9a-f-]{4,}$/i.test(segment) || /^[0-9a-f]{16,}$/i.test(segment);
}

function useCrumbs() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const matches = useRouterState({ select: (state) => state.matches });
  const repoName = matches
    .map((match) => (match.loaderData as { repository?: { name: string } } | undefined)?.repository?.name)
    .find(Boolean);
  const segments = pathname.split("/").filter(Boolean);
  return segments.map((segment, index) => ({
    label: looksLikeId(segment) && repoName ? repoName : (crumbNames[segment] ?? segment.replace(/-/g, " ")),
    href: `/${segments.slice(0, index + 1).join("/")}`,
    isLast: index === segments.length - 1,
  }));
}

export function AppTopbar() {
  const crumbs = useCrumbs();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { setCommandPaletteOpen, setImportModalOpen, toggleSidebar } = useUiStore();
  const { user, logout } = useAuthStore();

  const handleSignOut = async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await logout();
    await navigate({ to: "/login", replace: true });
  };



  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border/70 bg-background/20 px-4 backdrop-blur-xl">
      <Button
        variant="ghost"
        size="icon"
        aria-label="Toggle sidebar"
        className="md:hidden"
        onClick={toggleSidebar}
      >
        <Menu className="size-4" />
      </Button>

      <Link to="/" aria-label="CodeAtlas home" className="shrink-0 md:hidden">
        <BrandMark size="sm" />
      </Link>

      <Breadcrumb className="min-w-0">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to="/dashboard">CodeAtlas</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          {crumbs.map((crumb) => (
            <span key={crumb.href} className="flex items-center gap-1.5">
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                {crumb.isLast ? (
                  <BreadcrumbPage className="truncate">{crumb.label}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild>
                    <Link to={crumb.href} className="truncate text-white/55 hover:text-white">
                      {crumb.label}
                    </Link>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </span>
          ))}
        </BreadcrumbList>
      </Breadcrumb>

      <div className="ml-auto flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setCommandPaletteOpen(true)}
          className="hidden gap-2 border-border/80 bg-elevated/40 text-muted-foreground sm:flex"
        >
          <Search className="size-3.5" />
          <span className="text-xs">Search everything</span>
          <kbd className="ml-2 rounded border border-border bg-elevated px-1.5 py-0.5 font-mono text-[10px]">
            ⌘K
          </kbd>
        </Button>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Open search"
          className="sm:hidden"
          onClick={() => setCommandPaletteOpen(true)}
        >
          <Search className="size-4" />
        </Button>

        <Button size="sm" className="gap-1.5" onClick={() => setImportModalOpen(true)}>
          <Plus className="size-3.5" />
          <span className="hidden sm:inline">Import</span>
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="User menu">
              <span className="flex size-7 items-center justify-center rounded-full bg-violet/20 font-mono text-[11px] text-violet ring-1 ring-violet/35">
                {user?.initials ?? "?"}
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="font-normal">
              <p className="text-sm">{user?.name ?? "Guest"}</p>
              <p className="text-xs text-muted-foreground">{user?.email}</p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link to="/profile">Profile</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/settings">Settings</Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => void handleSignOut()}>Sign out</DropdownMenuItem>

          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
