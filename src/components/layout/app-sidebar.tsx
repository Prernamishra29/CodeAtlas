import { Link, useRouterState } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  Boxes,
  CircleHelp,
  Inbox,
  LayoutDashboard,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { BrandMark } from "@/components/common/brand-mark";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuthStore } from "@/store/auth-store";
import { useUiStore } from "@/store/ui-store";
import { notificationsApi } from "@/lib/api/notifications";
import { cn } from "@/lib/utils";

interface NavItem {
  label: string;
  icon: typeof LayoutDashboard;
  link: { to: string; params?: Record<string, string> };
  match: string;
}

const primaryNav: NavItem[] = [
  { label: "Overview", icon: LayoutDashboard, link: { to: "/dashboard" }, match: "/dashboard" },
  { label: "Repositories", icon: Boxes, link: { to: "/repositories" }, match: "/repositories" },
  { label: "Activity", icon: Inbox, link: { to: "/activity" }, match: "/activity" },
];

const secondaryNav: NavItem[] = [
  { label: "Settings", icon: Settings, link: { to: "/settings" }, match: "/settings" },
  { label: "Help", icon: CircleHelp, link: { to: "/help" }, match: "/help" },
];

function NavLink({
  item,
  collapsed,
  active,
  badge,
}: {
  item: NavItem;
  collapsed: boolean;
  active: boolean;
  badge?: number;
}) {
  const content = (
    <Link
      to={item.link.to as never}
      params={item.link.params as never}
      aria-label={item.label}
      className={cn(
        "group relative flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm transition-all duration-200",
        collapsed && "justify-center px-0",
        active
          ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-[inset_0_0_0_1px_oklch(0.78_0.16_305_/_35%)]"
          : "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-foreground",
      )}
    >
      {active ? (
        <span
          className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-violet"
          aria-hidden
        />
      ) : null}
      <item.icon
        className={cn("size-4 shrink-0 transition-colors", active && "text-violet")}
        aria-hidden
      />
      {!collapsed ? <span className="truncate">{item.label}</span> : null}
      {badge && !collapsed ? (
        <span className="ml-auto rounded-full bg-[#C9A6FF] px-1.5 py-0.5 text-[10px] font-semibold text-zinc-950">
          {badge > 9 ? "9+" : badge}
        </span>
      ) : null}
      {badge && collapsed ? (
        <span className="absolute right-1 top-1 size-1.5 rounded-full bg-[#C9A6FF]" aria-hidden />
      ) : null}
    </Link>
  );

  if (!collapsed) return content;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{content}</TooltipTrigger>
      <TooltipContent side="right">{item.label}</TooltipContent>
    </Tooltip>
  );
}

export function AppSidebar() {
  const { sidebarCollapsed, toggleSidebar } = useUiStore();
  const user = useAuthStore((state) => state.user);
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const unread = useQuery({
    queryKey: ["notifications-unread"],
    queryFn: notificationsApi.unreadCount,
    refetchInterval: 20_000,
    enabled: Boolean(user),
    retry: false,
  });

  const isActive = (item: NavItem) =>
    item.match === "/repositories"
      ? pathname === "/repositories"
      : pathname.endsWith(item.match) || pathname === item.match;

  return (
    <motion.aside
      animate={{ width: sidebarCollapsed ? 68 : 244 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
      className="glass-panel sticky top-3 z-20 hidden h-[calc(100dvh-1.5rem)] shrink-0 flex-col rounded-[1.85rem] md:flex"
    >
      <div
        className={cn(
          "flex items-center gap-2 px-3 py-3",
          sidebarCollapsed ? "flex-col" : "h-[4.5rem] justify-between",
        )}
      >
        <Link to="/" aria-label="CodeAtlas home" className="flex min-w-0 items-center">
          <BrandMark size={sidebarCollapsed ? "sm" : "lg"} />
        </Link>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={toggleSidebar}
              aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#F3EDE4] text-zinc-950 transition hover:scale-105"
            >
              {sidebarCollapsed ? <PanelLeftOpen className="size-3.5" /> : <PanelLeftClose className="size-3.5" />}
            </button>
          </TooltipTrigger>
          <TooltipContent side="right">{sidebarCollapsed ? "Expand" : "Collapse"}</TooltipContent>
        </Tooltip>
      </div>

      <nav aria-label="Primary" className="flex-1 space-y-1 px-2 py-2">
        {primaryNav.map((item) => (
          <NavLink
            key={item.label}
            item={item}
            collapsed={sidebarCollapsed}
            active={isActive(item)}
            {...(item.match === "/activity" && unread.data?.count
              ? { badge: unread.data.count }
              : {})}
          />
        ))}
      </nav>

      <div className="space-y-1 border-t border-sidebar-border px-2 py-2">
        {secondaryNav.map((item) => (
          <NavLink key={item.label} item={item} collapsed={sidebarCollapsed} active={isActive(item)} />
        ))}
        <Link
          to="/profile"
          className={cn(
            "mt-1 flex items-center gap-2.5 rounded-2xl px-2 py-2 text-sm text-muted-foreground transition-colors hover:bg-sidebar-accent/60 hover:text-foreground",
            sidebarCollapsed && "justify-center px-0",
          )}
        >
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#F3EDE4] font-display text-[11px] font-semibold text-zinc-950">
            {user?.initials ?? "?"}
          </span>
          {!sidebarCollapsed ? (
            <span className="min-w-0">
              <span className="block truncate text-xs text-foreground">{user?.name ?? "Guest"}</span>
              <span className="block truncate text-[11px] text-muted-foreground">{user?.role}</span>
            </span>
          ) : null}
        </Link>
      </div>
    </motion.aside>
  );
}
