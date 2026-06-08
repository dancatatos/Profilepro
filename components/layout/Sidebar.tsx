"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sparkles } from "lucide-react";
import { resolveDashboardNav, trainingsLabel } from "@/lib/constants";
import { Logo } from "@/components/ui/Logo";
import { Icon } from "@/components/ui/Icon";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { useAuth } from "@/hooks/useAuth";
import { useFeatureFlags } from "@/hooks/useFeatureFlags";
import { useTaskCountStore } from "@/store/taskCountStore";
import { useMarketingStore } from "@/store/marketingStore";
import { cn } from "@/lib/utils";

function isActive(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Sidebar() {
  const pathname = usePathname();
  const { account } = useAuth();
  const { flags } = useFeatureFlags();
  /* Follow-up task count — surfaces as a red dot + count on the
     Follow-Up nav item so the user knows there's work waiting
     without having to click into the section. */
  const urgentTasks = useTaskCountStore((s) => s.urgent);

  /* Configurable feature label — pulls the admin's preferred name
     for "Trainings" so a rebrand from /admin/marketing doesn't need
     a code deploy. Hydrates lazily on first mount, then served from
     the in-memory store on subsequent renders. */
  const marketingContent = useMarketingStore((s) => s.content);
  const loadMarketing = useMarketingStore((s) => s.load);
  useEffect(() => {
    loadMarketing();
  }, [loadMarketing]);
  const trainingsName = trainingsLabel(marketingContent, "plural");

  /* Sidebar layout pipeline:
       1. Admin-configured order + visibility (resolveDashboardNav)
       2. Feature-flag filter for the Template Marketplace tab
       3. Per-item label overrides (Trainings rebrand)
     The resolver guarantees essentials ("home", "settings") stay
     visible even if the admin accidentally hides them. */
  const navItems = resolveDashboardNav(marketingContent?.dashboardNav)
    .filter(
      (item) => item.key !== "templates" || flags.templateMarketplace,
    )
    .map((item) =>
      item.key === "trainings" ? { ...item, label: trainingsName } : item,
    );

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-white/[0.06] bg-ink-950/85 backdrop-blur-xl lg:flex">
      <div className="flex h-16 items-center px-5">
        <Link href="/dashboard">
          <Logo />
        </Link>
      </div>

      <nav className="no-scrollbar flex-1 space-y-1 overflow-y-auto px-3 py-2">
        {navItems.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.key}
              href={item.href}
              className={cn(
                /* Active state now uses an electric tint + a left accent
                   bar (the `before:` pseudo) so the current page reads
                   clearly against the dark rail — a premium touch vs the
                   old flat grey highlight. */
                "relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors",
                "before:absolute before:left-0 before:top-1/2 before:h-5 before:w-[3px] before:-translate-y-1/2 before:rounded-r-full before:transition-all",
                active
                  ? "bg-electric-500/[0.10] font-medium text-white before:bg-electric-400"
                  : "text-white/55 before:bg-transparent hover:bg-white/[0.03] hover:text-white/85",
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
              {item.key === "ai" && (
                <span className="ml-auto h-1.5 w-1.5 rounded-full bg-jade-400" />
              )}
              {/* Follow-Up urgent-task badge. Red because overdue +
                  due-today are time-sensitive — different from the
                  passive electric tint elsewhere. Cap display at 99+
                  to avoid the pill stretching the nav row. */}
              {item.key === "pipelines" && urgentTasks > 0 && (
                <span
                  className="ml-auto flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-red-500/90 px-1.5 text-[10px] font-bold text-white"
                  title={`${urgentTasks} follow-up${urgentTasks === 1 ? "" : "s"} due`}
                >
                  {urgentTasks > 99 ? "99+" : urgentTasks}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {account?.plan === "free" && (
        <div className="mx-3 mb-3 rounded-2xl border border-electric-500/20 bg-electric-500/[0.06] p-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-electric-400" />
            <p className="text-sm font-semibold text-white">Upgrade to Pro</p>
          </div>
          <p className="mt-1 text-xs text-white/50">
            Unlock the full AI suite, analytics & branded QR codes.
          </p>
          <Link
            href="/billing"
            className="mt-3 block rounded-lg bg-brand-gradient py-2 text-center text-xs font-semibold text-white"
          >
            See plans
          </Link>
        </div>
      )}

      <Link
        href="/settings"
        className="flex items-center gap-3 border-t border-white/[0.06] px-4 py-3.5 hover:bg-white/[0.03]"
      >
        <Avatar
          name={account?.displayName || "User"}
          src={account?.photoURL}
          size={36}
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-white">
            {account?.displayName || "User"}
          </p>
          <p className="truncate text-xs text-white/40">{account?.email}</p>
        </div>
        <Badge tone={account?.plan === "free" ? "neutral" : "blue"}>
          {(account?.plan || "free").toUpperCase()}
        </Badge>
      </Link>

      {/* Legal footer — keeps Privacy + Terms accessible to signed-in
          users at all times (required for ongoing DPA compliance and
          GDPR right-to-be-informed). Tiny so it doesn't compete with
          the main nav. */}
      <div className="border-t border-white/[0.06] px-4 py-2.5 text-[10px] text-white/30">
        <Link href="/privacy" target="_blank" className="hover:text-white/70">
          Privacy
        </Link>
        <span className="mx-1.5">·</span>
        <Link href="/terms" target="_blank" className="hover:text-white/70">
          Terms
        </Link>
      </div>
    </aside>
  );
}
