"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sparkles } from "lucide-react";
import { DASHBOARD_NAV } from "@/lib/constants";
import { Logo } from "@/components/ui/Logo";
import { Icon } from "@/components/ui/Icon";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

function isActive(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Sidebar() {
  const pathname = usePathname();
  const { account } = useAuth();

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-white/[0.06] bg-ink-900/80 backdrop-blur-xl lg:flex">
      <div className="flex h-16 items-center px-5">
        <Link href="/dashboard">
          <Logo />
        </Link>
      </div>

      <nav className="no-scrollbar flex-1 space-y-1 overflow-y-auto px-3 py-2">
        {DASHBOARD_NAV.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.key}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors",
                active
                  ? "bg-white/[0.06] font-medium text-white"
                  : "text-white/55 hover:bg-white/[0.03] hover:text-white/85",
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
    </aside>
  );
}
