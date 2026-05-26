"use client";

/**
 * Layout for all `/affiliate/*` routes.
 *
 * Two flavours:
 *   - "minimal" — login + accept pages render with no shell (just the
 *     centered card), so we just pass children through.
 *   - "shell"   — dashboard pages get a sticky top header with logo,
 *     nav links, profile chip and sign-out.
 *
 * Role guard:
 *   - Unauthenticated visitors on dashboard routes get bounced to
 *     `/affiliate/login`.
 *   - Signed-in non-affiliates (regular users, admins) are sent back to
 *     their natural home (`/dashboard` or `/admin`) so they don't see
 *     the empty affiliate dashboard.
 *
 * The accept + login routes deliberately don't trigger the role guard
 * because the user might not even be signed in yet.
 */

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Handshake,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { logout } from "@/lib/firebase/auth";
import { Logo } from "@/components/ui/Logo";
import { FullScreenLoader } from "@/components/ui/Spinner";
import { cn } from "@/lib/utils";

/* Routes that render without the dashboard shell. */
const SHELL_LESS_PREFIXES = ["/affiliate/login", "/affiliate/accept"];

const NAV = [
  { href: "/affiliate", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/affiliate/referrals", label: "Referrals", icon: Users, exact: false },
  { href: "/affiliate/earnings", label: "Earnings", icon: Wallet, exact: false },
  { href: "/affiliate/settings", label: "Settings", icon: Settings, exact: false },
];

export default function AffiliateLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { account, loading } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isShellLess = useMemo(
    () => SHELL_LESS_PREFIXES.some((p) => pathname?.startsWith(p)),
    [pathname],
  );

  /* Role-guard the dashboard pages (everything except login + accept). */
  useEffect(() => {
    if (isShellLess || loading) return;
    if (!account) {
      router.replace("/affiliate/login");
      return;
    }
    if (account.role !== "affiliate") {
      /* Admin → /admin, anything else → /dashboard. Prevents non-affiliates
         from accidentally browsing an empty affiliate dashboard. */
      router.replace(account.role === "admin" ? "/admin" : "/dashboard");
    }
  }, [isShellLess, loading, account, router]);

  /* Close mobile nav whenever the route changes. */
  useEffect(() => setMobileOpen(false), [pathname]);

  /* No-shell variant: just render the page (login, accept). */
  if (isShellLess) {
    return <div className="min-h-dvh bg-ink-950 text-white">{children}</div>;
  }

  if (loading || !account) {
    return <FullScreenLoader label="Loading your dashboard…" />;
  }

  if (account.role !== "affiliate") {
    return <FullScreenLoader label="Redirecting…" />;
  }

  const handleLogout = async () => {
    await logout();
    router.replace("/affiliate/login");
  };

  const initials = (account.displayName || account.email || "A")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <div className="min-h-dvh bg-ink-950 text-white">
      {/* Top header */}
      <header className="sticky top-0 z-30 border-b border-white/[0.06] bg-ink-950/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 lg:px-8">
          <Link href="/affiliate" className="flex items-center gap-2">
            <Logo />
            <span className="hidden items-center gap-1 rounded-full bg-electric-500/12 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-electric-300 sm:flex">
              <Handshake className="h-3 w-3" />
              Affiliate
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="ml-6 hidden flex-1 items-center gap-0.5 lg:flex">
            {NAV.map(({ href, label, icon: Icon, exact }) => {
              const active = exact
                ? pathname === href
                : pathname?.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-colors",
                    active
                      ? "bg-electric-500/15 text-electric-300"
                      : "text-white/55 hover:bg-white/[0.04] hover:text-white",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </Link>
              );
            })}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            {/* Profile chip */}
            <div className="hidden items-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-1.5 lg:flex">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-electric-500/15 text-[11px] font-bold uppercase text-electric-300">
                {initials || "A"}
              </div>
              <div className="min-w-0">
                <p className="truncate text-xs font-medium text-white">
                  {account.displayName}
                </p>
                <p className="truncate text-[10px] text-white/40">
                  {account.email}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="hidden items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs font-medium text-white/65 transition-colors hover:bg-red-500/10 hover:text-red-300 lg:flex"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sign out
            </button>

            {/* Mobile nav trigger */}
            <button
              type="button"
              onClick={() => setMobileOpen((o) => !o)}
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
              className="rounded-lg p-2 text-white/70 hover:bg-white/[0.06] lg:hidden"
            >
              {mobileOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile nav sheet */}
        {mobileOpen && (
          <div className="border-t border-white/[0.06] bg-ink-950 px-4 py-3 lg:hidden">
            <div className="mb-3 rounded-xl border border-white/[0.07] bg-white/[0.03] p-3">
              <p className="text-xs font-medium text-white">
                {account.displayName}
              </p>
              <p className="text-[11px] text-white/40">{account.email}</p>
            </div>
            <nav className="space-y-0.5">
              {NAV.map(({ href, label, icon: Icon, exact }) => {
                const active = exact
                  ? pathname === href
                  : pathname?.startsWith(href);
                return (
                  <Link
                    key={href}
                    href={href}
                    className={cn(
                      "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                      active
                        ? "bg-electric-500/15 text-electric-300"
                        : "text-white/65 hover:bg-white/[0.04] hover:text-white",
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                  </Link>
                );
              })}
              <button
                type="button"
                onClick={handleLogout}
                className="mt-2 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-white/55 transition-colors hover:bg-red-500/10 hover:text-red-300"
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </button>
            </nav>
          </div>
        )}
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-16 pt-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}
