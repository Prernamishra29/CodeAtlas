import { Outlet } from "@tanstack/react-router";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { AppTopbar } from "@/components/layout/app-topbar";
import { CommandPalette } from "@/components/layout/command-palette";
import { ImportRepositoryModal } from "@/features/repositories/import-repository-modal";
import { TooltipProvider } from "@/components/ui/tooltip";

export function AppShell() {
  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex min-h-dvh gap-3 p-0 md:p-3">
        <AppSidebar />
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden border-border md:rounded-[1.85rem] md:border md:bg-surface/40 md:shadow-[var(--shadow-soft)]">
          <AppTopbar />
          <main className="mx-auto w-full max-w-[1440px] flex-1 px-4 py-6 sm:px-6 lg:px-8">
            <Outlet />
          </main>
        </div>
      </div>
      <CommandPalette />
      <ImportRepositoryModal />
    </TooltipProvider>
  );
}
