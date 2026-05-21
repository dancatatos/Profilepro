"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ShieldCheck,
  Search,
  Users,
  UserRound,
  Inbox,
  CreditCard,
  ChevronDown,
  Check,
  RefreshCw,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { FullScreenLoader } from "@/components/ui/Spinner";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Logo } from "@/components/ui/Logo";
import { toast } from "@/store/uiStore";
import {
  listAllUsers,
  adminSetUserPlan,
  countAllProfiles,
  countAllLeads,
} from "@/lib/firebase/firestore";
import type { AccountUser, PlanId } from "@/types";

const PLANS: PlanId[] = ["free", "pro", "team"];

const planBadgeTone: Record<PlanId, "jade" | "blue" | "gold"> = {
  free: "jade",
  pro: "blue",
  team: "gold",
};

function PlanSelector({
  user,
  onChanged,
}: {
  user: AccountUser;
  onChanged: (uid: string, plan: PlanId) => void;
}) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const select = async (plan: PlanId) => {
    if (plan === user.plan) { setOpen(false); return; }
    setSaving(true);
    setOpen(false);
    try {
      await adminSetUserPlan(user.uid, plan);
      onChanged(user.uid, plan);
      toast.success(`Plan updated to ${plan.toUpperCase()} for ${user.email}`);
    } catch {
      toast.error("Failed to update plan. Check Firestore rules.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        disabled={saving}
        className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-white/10 disabled:opacity-50"
      >
        {saving ? (
          <RefreshCw className="h-3 w-3 animate-spin" />
        ) : (
          <Badge tone={planBadgeTone[user.plan] ?? "jade"}>
            {user.plan.toUpperCase()}
          </Badge>
        )}
        <ChevronDown className="h-3 w-3 text-white/40" />
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 z-20 mt-1 w-32 overflow-hidden rounded-xl border border-white/10 bg-ink-900 shadow-xl">
            {PLANS.map((p) => (
              <button
                key={p}
                onClick={() => select(p)}
                className="flex w-full items-center justify-between px-3 py-2 text-xs font-medium text-white hover:bg-white/10"
              >
                {p.toUpperCase()}
                {p === user.plan && (
                  <Check className="h-3.5 w-3.5 text-jade-400" />
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default function AdminPage() {
  const { account, loading } = useAuth();
  const router = useRouter();

  const [users, setUsers] = useState<AccountUser[]>([]);
  const [filtered, setFiltered] = useState<AccountUser[]>([]);
  const [search, setSearch] = useState("");
  const [fetching, setFetching] = useState(false);
  const [profileCount, setProfileCount] = useState<number | null>(null);
  const [leadCount, setLeadCount] = useState<number | null>(null);

  /* Redirect non-admins */
  useEffect(() => {
    if (!loading && account && account.role !== "admin") {
      router.replace("/dashboard");
    }
  }, [loading, account, router]);

  const loadData = useCallback(async () => {
    setFetching(true);
    try {
      const [allUsers, profiles, leads] = await Promise.all([
        listAllUsers(),
        countAllProfiles(),
        countAllLeads(),
      ]);
      setUsers(allUsers);
      setFiltered(allUsers);
      setProfileCount(profiles);
      setLeadCount(leads);
    } catch (err) {
      console.error(err);
      toast.error("Could not load users. Check Firestore admin rules.");
    } finally {
      setFetching(false);
    }
  }, []);

  useEffect(() => {
    if (account?.role === "admin") loadData();
  }, [account, loadData]);

  /* Live search */
  useEffect(() => {
    const q = search.toLowerCase().trim();
    setFiltered(
      q
        ? users.filter(
            (u) =>
              u.email.toLowerCase().includes(q) ||
              u.displayName.toLowerCase().includes(q) ||
              (u.username ?? "").toLowerCase().includes(q),
          )
        : users,
    );
  }, [search, users]);

  const handlePlanChanged = (uid: string, plan: PlanId) => {
    setUsers((prev) =>
      prev.map((u) => (u.uid === uid ? { ...u, plan } : u)),
    );
  };

  if (loading || !account) return <FullScreenLoader />;
  if (account.role !== "admin") return <FullScreenLoader />;

  const proCount = users.filter((u) => u.plan !== "free").length;

  return (
    <div className="min-h-dvh bg-ink-950">
      {/* Header */}
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold text-white">
              Admin Panel
            </h1>
            <p className="text-sm text-white/45">
              User management &amp; platform overview.
            </p>
          </div>
          <Button
            variant="outline"
            onClick={loadData}
            loading={fetching}
            leftIcon={<RefreshCw className="h-3.5 w-3.5" />}
          >
            Refresh
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            { icon: <Users className="h-5 w-5" />, label: "Total users", value: fetching ? "…" : String(users.length), color: "text-electric-400" },
            { icon: <UserRound className="h-5 w-5" />, label: "Profiles", value: fetching ? "…" : profileCount !== null ? String(profileCount) : "—", color: "text-jade-400" },
            { icon: <Inbox className="h-5 w-5" />, label: "Leads", value: fetching ? "…" : leadCount !== null ? String(leadCount) : "—", color: "text-gold-400" },
            { icon: <CreditCard className="h-5 w-5" />, label: "Paid users", value: fetching ? "…" : String(proCount), color: "text-blue-400" },
          ].map((s) => (
            <Card key={s.label} className="p-4">
              <div className={`mb-2 ${s.color}`}>{s.icon}</div>
              <p className="font-display text-2xl font-bold text-white">{s.value}</p>
              <p className="text-xs text-white/45">{s.label}</p>
            </Card>
          ))}
        </div>

        {/* User management */}
        <Card className="p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="font-display text-base font-semibold text-white">
              Users
            </h2>
            <div className="relative w-64">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/30" />
              <Input
                placeholder="Search email or name…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 text-sm"
              />
            </div>
          </div>

          {fetching ? (
            <div className="flex h-32 items-center justify-center text-sm text-white/40">
              Loading users…
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex h-32 items-center justify-center text-sm text-white/40">
              {search ? "No users match that search." : "No users found."}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/[0.06] text-xs text-white/40">
                    <th className="pb-2 text-left font-medium">User</th>
                    <th className="pb-2 text-left font-medium">Username</th>
                    <th className="pb-2 text-left font-medium">Joined</th>
                    <th className="pb-2 text-right font-medium">Plan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {filtered.map((u) => (
                    <tr key={u.uid} className="group">
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-2.5">
                          {/* Avatar placeholder */}
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-bold text-white uppercase">
                            {(u.displayName || u.email)[0]}
                          </div>
                          <div>
                            <p className="font-medium text-white">
                              {u.displayName || "—"}
                            </p>
                            <p className="text-xs text-white/40">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 pr-4 text-white/50">
                        {u.username ? `@${u.username}` : "—"}
                      </td>
                      <td className="py-3 pr-4 text-white/50">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 text-right">
                        <PlanSelector user={u} onChanged={handlePlanChanged} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {filtered.length > 0 && (
            <p className="mt-3 text-right text-xs text-white/30">
              Showing {filtered.length} of {users.length} users
            </p>
          )}
        </Card>

        <Card className="p-4">
          <p className="text-xs text-white/35">
            Plans are stored in Firestore. Changes take effect immediately — the
            user will see their new plan on next page load or sign-in. Make sure
            your Firestore security rules allow admin writes to the{" "}
            <span className="font-mono text-white/60">users</span> collection.
          </p>
        </Card>
      </main>
    </div>
  );
}
