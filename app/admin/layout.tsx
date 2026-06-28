"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  CreditCard,
  LayoutTemplate,
  BarChart3,
  GraduationCap,
  LogOut,
  Mail,
  Megaphone,
  Menu,
  ShieldCheck,
  Handshake,
  Wallet,
  X,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { logout } from "@/lib/firebase/auth";
import { FullScreenLoader } from "@/components/ui/Spinner";
import { Logo } from "@/components/ui/Logo";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/users", label: "Users", icon: Users, exact: false },
  { href: "/admin/affiliates", label: "Affiliates", icon: Handshake, exact: false },
  { href: "/admin/commissions", label: "Commissions", icon: Wallet, exact: false },
  { href: "/admin/subscriptions", label: "Subscriptions", icon: CreditCard, exact: false },
  { href: "/admin/university", label: "University", icon: GraduationCap, exact: false },
  { href: "/admin/marketing", label: "Marketing", icon: Megaphone, exact: false },
  { href: "/admin/email", label: "Email", icon: Mail, exact: false },
  { href: "/admin/templates", label: "Templates", icon: LayoutTemplate, exact: false },
  { href: "/admin/analytics", label: "Analytics", icon: BarChart3, exact: false },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { account, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  /* Mobile nav drawer state. Auto-closes on route change so the user
     doesn't see the previous page peeking under the drawer. */
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const isLoginPage = pathname === "/admin/login";

  useEffect(() => {
    if (loading || isLoginPage) return;
    if (!account) {
      router.replace("/admin/login");
      return;
    }
    if (account.role === "affiliate") {
      /* Affiliates have a dashboard of their own — send them there
         rather than the admin login (which they'd never pass anyway). */
      router.replace("/affiliate");
      return;
    }
    if (account.role !== "admin") {
      router.replace("/admin/login");
    }
  }, [loading, account, isLoginPage, router]);

  /* Close the mobile drawer whenever the path changes (i.e. the user
     tapped a nav link). Without this the drawer stays open on top of
     the new page. */
  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

  /* Lock body scroll while the drawer is open so the page underneath
     doesn't wobble when the user swipes. */
  useEffect(() => {
    if (typeof document === "undefined") return;
    document.body.style.overflow = mobileNavOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileNavOpen]);

  /* Login page renders without shell */
  if (isLoginPage) return <>{children}</>;

  if (loading || !account) return <FullScreenLoader />;
  if (account.role !== "admin") return <FullScreenLoader />;

  const handleLogout = async () => {
    await logout();
    router.push("/admin/login");
  };

  /* The sidebar nav is identical between desktop and mobile drawer —
     extracted so we don't duplicate the JSX. */
  const sidebarBody = (
    <>
      {/* Logo + admin badge */}
      <div className="flex h-16 items-center gap-2 border-b border-slate-200 px-4">
        <Logo />
        <span className="ml-auto flex items-center gap-1 rounded-full bg-gold-400/12 px-2 py-0.5 text-[10px] font-medium text-amber-700">
          <ShieldCheck className="h-3 w-3" />
          Admin
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-0.5 overflow-y-auto p-3">
        {NAV.map(({ href, label, icon: Icon, exact }) => {
          const active = exact
            ? pathname === href
            : pathname.startsWith(href) && href !== "/admin";
          const isAdminRoot = href === "/admin" && pathname === "/admin";
          const finalActive = exact ? isAdminRoot || active : active;
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                finalActive
                  ? "bg-electric-500/15 text-electric-700"
                  : "text-slate-500 hover:bg-slate-100 hover:text-slate-900",
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-slate-200 p-3">
        <div className="mb-2 rounded-xl bg-slate-50 px-3 py-2">
          <p className="truncate text-xs font-medium text-slate-900">
            {account.displayName}
          </p>
          <p className="truncate text-[11px] text-slate-400">
            {account.email}
          </p>
        </div>
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-500 transition-colors hover:bg-red-500/10 hover:text-red-600"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          Sign out
        </button>
      </div>
    </>
  );

  return (
    <div className="flex h-dvh bg-slate-50">
      {/* ── Desktop sidebar — sticky on the left at lg+ ── */}
      <aside className="hidden w-56 shrink-0 flex-col border-r border-slate-200 bg-white lg:flex">
        {sidebarBody}
      </aside>

      {/* ── Mobile drawer — hidden until tapped ── */}
      {mobileNavOpen && (
        <>
          {/* Backdrop — tap to dismiss */}
          <button
            type="button"
            onClick={() => setMobileNavOpen(false)}
            aria-label="Close menu"
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          />
          {/* Drawer panel — slides in from the left, full height */}
          <aside className="fixed inset-y-0 left-0 z-50 flex w-64 max-w-[85vw] flex-col border-r border-slate-200 bg-white shadow-2xl lg:hidden">
            {sidebarBody}
            {/* Close button overlaid in the top-right of the drawer
                for users who want an explicit X (backdrop tap also works). */}
            <button
              type="button"
              onClick={() => setMobileNavOpen(false)}
              aria-label="Close menu"
              className="absolute right-2 top-2 rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-900"
            >
              <X className="h-4 w-4" />
            </button>
          </aside>
        </>
      )}

      {/* ── Main content area ── */}
      <main className="flex flex-1 flex-col overflow-y-auto">
        {/* Mobile top bar — hamburger + logo, only at sub-lg widths. */}
        <div className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-slate-200 bg-white/95 px-4 backdrop-blur lg:hidden">
          <button
            type="button"
            onClick={() => setMobileNavOpen(true)}
            aria-label="Open menu"
            className="rounded-md p-1.5 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          >
            <Menu className="h-5 w-5" />
          </button>
          <Logo />
          <span className="ml-auto flex items-center gap-1 rounded-full bg-gold-400/12 px-2 py-0.5 text-[10px] font-medium text-amber-700">
            <ShieldCheck className="h-3 w-3" />
            Admin
          </span>
        </div>
        {children}
      </main>
    </div>
  );
}
