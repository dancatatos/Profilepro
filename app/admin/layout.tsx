"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  CreditCard,
  LayoutTemplate,
  BarChart3,
  LogOut,
  Mail,
  ShieldCheck,
  Handshake,
  Wallet,
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

  /* Login page renders without shell */
  if (isLoginPage) return <>{children}</>;

  if (loading || !account) return <FullScreenLoader />;
  if (account.role !== "admin") return <FullScreenLoader />;

  const handleLogout = async () => {
    await logout();
    router.push("/admin/login");
  };

  return (
    <div className="flex h-dvh bg-ink-950">
      {/* Sidebar */}
      <aside className="flex w-56 shrink-0 flex-col border-r border-white/[0.06] bg-ink-900">
        {/* Logo */}
        <div className="flex h-16 items-center gap-2 border-b border-white/[0.06] px-4">
          <Logo />
          <span className="ml-auto flex items-center gap-1 rounded-full bg-gold-400/12 px-2 py-0.5 text-[10px] font-medium text-gold-300">
            <ShieldCheck className="h-3 w-3" />
            Admin
          </span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-0.5 p-3">
          {NAV.map(({ href, label, icon: Icon, exact }) => {
            const active = exact ? pathname === href : pathname.startsWith(href) && href !== "/admin";
            const isAdminRoot = href === "/admin" && pathname === "/admin";
            const finalActive = exact ? isAdminRoot || active : active;
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                  finalActive
                    ? "bg-electric-500/15 text-electric-300"
                    : "text-white/50 hover:bg-white/5 hover:text-white",
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="border-t border-white/[0.06] p-3">
          <div className="mb-2 rounded-xl px-3 py-2 bg-white/[0.03]">
            <p className="text-xs font-medium text-white truncate">
              {account.displayName}
            </p>
            <p className="text-[11px] text-white/40 truncate">{account.email}</p>
          </div>
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-white/50 hover:bg-red-500/10 hover:text-red-400 transition-colors"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
