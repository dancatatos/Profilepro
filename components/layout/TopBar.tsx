"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ExternalLink, LogOut, Menu } from "lucide-react";
import {
  DASHBOARD_NAV,
  resolveDashboardNav,
  trainingsLabel,
  userHasEventsAddOn,
} from "@/lib/constants";
import { Icon } from "@/components/ui/Icon";
import { Avatar } from "@/components/ui/Avatar";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { useAuth } from "@/hooks/useAuth";
import { useFeatureFlags } from "@/hooks/useFeatureFlags";
import { useMarketingStore } from "@/store/marketingStore";
import { useTaskCountStore } from "@/store/taskCountStore";
import { logout } from "@/lib/firebase/auth";
import { toast } from "@/store/uiStore";
import { cn } from "@/lib/utils";

function pageTitle(pathname: string): string {
  if (pathname.startsWith("/admin")) return "Admin Panel";
  const match = DASHBOARD_NAV.find(
    (n) =>
      n.href === pathname ||
      (n.href !== "/dashboard" && pathname.startsWith(`${n.href}/`)),
  );
  return match?.label ?? "Dashboard";
}

export function TopBar() {
  const pathname = usePathname();
  const router = useRouter();
  const { account } = useAuth();
  const { flags } = useFeatureFlags();
  const urgentTasks = useTaskCountStore((s) => s.urgent);
  const [menuOpen, setMenuOpen] = useState(false);

  /* Same nav-resolution pipeline as Sidebar — admin-configured order,
     template-marketplace gate, Events add-on gate, Trainings label
     rebrand. Keeping it identical here means the mobile hamburger
     menu never leaks entries (like Teams) that the desktop sidebar
     correctly hides. */
  const marketingContent = useMarketingStore((s) => s.content);
  const trainingsName = trainingsLabel(marketingContent, "plural");
  const hasEventsAddOn = userHasEventsAddOn(account);
  const navItems = resolveDashboardNav(marketingContent?.dashboardNav)
    .filter(
      (item) => item.key !== "templates" || flags.templateMarketplace,
    )
    .filter((item) => item.key !== "teams" || hasEventsAddOn)
    .map((item) =>
      item.key === "trainings" ? { ...item, label: trainingsName } : item,
    );

  const publicUrl = `/${account?.username || "demo"}`;

  const signOut = async () => {
    await logout();
    toast.info("Signed out.");
    router.replace("/login");
  };

  return (
    <>
      <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-white/[0.06] bg-ink-900/70 px-4 backdrop-blur-xl lg:px-8">
        <button
          onClick={() => setMenuOpen(true)}
          aria-label={
            urgentTasks > 0
              ? `Open menu — ${urgentTasks} follow-ups due`
              : "Open menu"
          }
          className="relative rounded-lg p-2 text-white/70 no-tap-highlight hover:bg-white/5 lg:hidden"
        >
          <Menu className="h-5 w-5" />
          {/* Tiny red pulse dot mirrors the sidebar badge so mobile
              users get the same signal — BottomNav doesn't include
              Follow-Up, so the hamburger is the right surface. */}
          {urgentTasks > 0 && (
            <span className="absolute right-1.5 top-1.5 flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500/70" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
            </span>
          )}
        </button>

        <h1 className="flex-1 truncate font-display text-base font-semibold text-white lg:text-lg">
          {pageTitle(pathname)}
        </h1>

        <Link
          href={publicUrl}
          target="_blank"
          className="hidden items-center gap-1.5 rounded-lg border border-white/10 px-3 py-2 text-xs font-medium text-white/70 hover:bg-white/5 sm:flex"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          View live profile
        </Link>

        <Link href="/settings" aria-label="Account settings">
          <Avatar
            name={account?.displayName || "User"}
            src={account?.photoURL}
            size={36}
          />
        </Link>
      </header>

      <Modal
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        title="Menu"
      >
        <div className="space-y-1 pb-2">
          {navItems.map((item) => {
            const active =
              item.href === "/dashboard"
                ? pathname === "/dashboard"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.key}
                href={item.href}
                onClick={() => setMenuOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-3 text-sm",
                  active
                    ? "bg-white/[0.06] font-medium text-white"
                    : "text-white/65",
                )}
              >
                <Icon
                  name={item.icon}
                  className={cn(
                    "h-5 w-5",
                    active ? "text-electric-400" : "text-white/40",
                  )}
                />
                {item.label}
                {/* Same urgent-task badge as the desktop sidebar, so
                    the mobile drawer surfaces the same signal. */}
                {item.key === "pipelines" && urgentTasks > 0 && (
                  <span className="ml-auto flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-red-500/90 px-1.5 text-[10px] font-bold text-white">
                    {urgentTasks > 99 ? "99+" : urgentTasks}
                  </span>
                )}
              </Link>
            );
          })}
          {account?.role === "admin" && (
            <Link
              href="/admin"
              onClick={() => setMenuOpen(false)}
              className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-white/65"
            >
              <Icon name="Shield" className="h-5 w-5 text-white/40" />
              Admin Panel
              <Badge tone="gold" className="ml-auto">
                Admin
              </Badge>
            </Link>
          )}
          <button
            onClick={signOut}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm text-red-300"
          >
            <LogOut className="h-5 w-5" />
            Sign out
          </button>
        </div>
      </Modal>
    </>
  );
}
