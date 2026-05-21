"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ExternalLink, LogOut, Menu } from "lucide-react";
import { DASHBOARD_NAV } from "@/lib/constants";
import { Icon } from "@/components/ui/Icon";
import { Avatar } from "@/components/ui/Avatar";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { useAuth } from "@/hooks/useAuth";
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
  const [menuOpen, setMenuOpen] = useState(false);

  const publicUrl = `/${account?.username || "demo"}`;

  const signOut = async () => {
    await logout();
    toast.info("Signed out.");
    router.replace("/login");
  };

  return (
    <>
      <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-white/[0.06] bg-ink-950/80 px-4 backdrop-blur-xl lg:px-8">
        <button
          onClick={() => setMenuOpen(true)}
          aria-label="Open menu"
          className="rounded-lg p-2 text-white/70 no-tap-highlight hover:bg-white/5 lg:hidden"
        >
          <Menu className="h-5 w-5" />
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
          {DASHBOARD_NAV.map((item) => {
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
