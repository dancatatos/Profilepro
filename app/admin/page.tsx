"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { FullScreenLoader } from "@/components/ui/Spinner";
import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { StatCard } from "@/components/common/StatCard";
import { Logo } from "@/components/ui/Logo";

const SECTIONS = [
  { icon: "Users", title: "Manage Users", desc: "View, search & moderate user accounts" },
  { icon: "LayoutTemplate", title: "Manage Templates", desc: "Create & curate the template library" },
  { icon: "Star", title: "Featured Profiles", desc: "Spotlight top profiles on discovery" },
  { icon: "ShieldAlert", title: "Content Moderation", desc: "Review reported profiles & content" },
  { icon: "CreditCard", title: "Subscriptions", desc: "Track plans, revenue & billing" },
  { icon: "BarChart3", title: "Platform Analytics", desc: "Usage, growth & engagement metrics" },
];

export default function AdminPage() {
  const { account, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && account && account.role !== "admin") {
      router.replace("/dashboard");
    }
  }, [loading, account, router]);

  if (loading || !account) return <FullScreenLoader />;
  if (account.role !== "admin") return <FullScreenLoader />;

  return (
    <div className="min-h-dvh bg-ink-950">
      <header className="flex h-16 items-center gap-3 border-b border-white/[0.06] px-5">
        <Link href="/dashboard" className="rounded-lg p-2 hover:bg-white/5">
          <ArrowLeft className="h-5 w-5 text-white/60" />
        </Link>
        <Logo />
        <span className="ml-auto flex items-center gap-1.5 rounded-full bg-gold-400/12 px-3 py-1 text-xs font-medium text-gold-300">
          <ShieldCheck className="h-3.5 w-3.5" />
          Admin
        </span>
      </header>

      <main className="mx-auto max-w-5xl space-y-5 px-5 py-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">
            Admin Panel
          </h1>
          <p className="text-sm text-white/45">
            Platform management & moderation.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard icon="Users" label="Total users" value="—" accent="blue" />
          <StatCard icon="UserRound" label="Profiles" value="—" accent="jade" />
          <StatCard icon="Inbox" label="Leads" value="—" accent="gold" />
          <StatCard icon="CreditCard" label="Pro users" value="—" accent="white" />
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {SECTIONS.map((s) => (
            <Card key={s.title} className="p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.05]">
                <Icon name={s.icon} className="h-5 w-5 text-electric-400" />
              </div>
              <h3 className="mt-3 text-sm font-semibold text-white">
                {s.title}
              </h3>
              <p className="mt-0.5 text-xs text-white/45">{s.desc}</p>
            </Card>
          ))}
        </div>

        <Card className="p-4">
          <p className="text-xs text-white/45">
            Admin scaffold — wire these panels to Firestore queries &amp; Cloud
            Functions with role-based security rules (see README).
          </p>
        </Card>
      </main>
    </div>
  );
}
