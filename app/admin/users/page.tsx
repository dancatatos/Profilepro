"use client";

import { useEffect, useState, useCallback } from "react";
import { Search, Check, ChevronDown, RefreshCw } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { toast } from "@/store/uiStore";
import { listAllUsers, adminSetUserPlan } from "@/lib/firebase/firestore";
import type { AccountUser, PlanId } from "@/types";

const PLANS: PlanId[] = ["free", "pro", "team"];

const planTone: Record<PlanId, "jade" | "blue" | "gold"> = {
  free: "jade",
  pro: "blue",
  team: "gold",
};

function PlanDropdown({
  user,
  onChanged,
}: {
  user: AccountUser;
  onChanged: (uid: string, plan: PlanId) => void;
}) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const select = async (plan: PlanId) => {
    if (plan === user.plan) {
      setOpen(false);
      return;
    }
    setSaving(true);
    setOpen(false);
    try {
      await adminSetUserPlan(user.uid, plan);
      onChanged(user.uid, plan);
      toast.success(`Plan set to ${plan.toUpperCase()} for ${user.email}`);
    } catch {
      toast.error("Failed to update plan.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        disabled={saving}
        className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-white/10 disabled:opacity-50 transition-colors"
      >
        {saving ? (
          <RefreshCw className="h-3 w-3 animate-spin text-white/50" />
        ) : (
          <Badge tone={planTone[user.plan] ?? "jade"}>
            {user.plan.toUpperCase()}
          </Badge>
        )}
        <ChevronDown className="h-3 w-3 text-white/40" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-20 mt-1 w-32 overflow-hidden rounded-xl border border-white/10 bg-ink-900 shadow-xl">
            {PLANS.map((p) => (
              <button
                key={p}
                onClick={() => select(p)}
                className="flex w-full items-center justify-between px-3 py-2.5 text-xs font-medium text-white hover:bg-white/10 transition-colors"
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

export default function AdminUsersPage() {
  const { account } = useAuth();
  const [users, setUsers] = useState<AccountUser[]>([]);
  const [filtered, setFiltered] = useState<AccountUser[]>([]);
  const [search, setSearch] = useState("");
  const [fetching, setFetching] = useState(false);

  const loadUsers = useCallback(async () => {
    setFetching(true);
    try {
      const all = await listAllUsers();
      setUsers(all);
      setFiltered(all);
    } catch {
      toast.error("Could not load users. Check Firestore admin rules.");
    } finally {
      setFetching(false);
    }
  }, []);

  useEffect(() => {
    if (account?.role === "admin") loadUsers();
  }, [account, loadUsers]);

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
    setUsers((prev) => prev.map((u) => (u.uid === uid ? { ...u, plan } : u)));
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">Users</h1>
          <p className="text-sm text-white/45">
            Manage plans and account access.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={loadUsers}
          loading={fetching}
          leftIcon={<RefreshCw className="h-3.5 w-3.5" />}
        >
          Refresh
        </Button>
      </div>

      {/* Quick stats row */}
      <div className="flex gap-3 flex-wrap">
        {[
          { label: "Total", value: users.length },
          { label: "Free", value: users.filter((u) => u.plan === "free").length },
          { label: "Pro", value: users.filter((u) => u.plan === "pro").length },
          { label: "Team", value: users.filter((u) => u.plan === "team").length },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-xl border border-white/[0.06] bg-white/[0.03] px-4 py-2 text-sm"
          >
            <span className="text-white/40">{s.label}: </span>
            <span className="font-semibold text-white">{fetching ? "…" : s.value}</span>
          </div>
        ))}
      </div>

      {/* User table */}
      <Card className="p-5">
        <div className="mb-5 flex items-center justify-between gap-4">
          <h2 className="font-display text-base font-semibold text-white">
            All Users
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
          <div className="flex h-40 items-center justify-center text-sm text-white/40">
            Loading users…
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex h-40 items-center justify-center text-sm text-white/40">
            {search ? "No users match that search." : "No users found."}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.06] text-xs text-white/40">
                  <th className="pb-3 text-left font-medium">User</th>
                  <th className="pb-3 text-left font-medium">Username</th>
                  <th className="pb-3 text-left font-medium">Joined</th>
                  <th className="pb-3 text-left font-medium">Onboarded</th>
                  <th className="pb-3 text-right font-medium">Plan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {filtered.map((u) => (
                  <tr key={u.uid} className="group">
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-2.5">
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
                    <td className="py-3 pr-4">
                      <span
                        className={
                          u.onboardingComplete
                            ? "text-jade-400 text-xs"
                            : "text-white/30 text-xs"
                        }
                      >
                        {u.onboardingComplete ? "Yes" : "No"}
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      <PlanDropdown user={u} onChanged={handlePlanChanged} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {filtered.length > 0 && (
          <p className="mt-4 text-right text-xs text-white/30">
            Showing {filtered.length} of {users.length} users
          </p>
        )}
      </Card>

      <Card className="p-4">
        <p className="text-xs text-white/35">
          Plan changes take effect immediately. The user will see their updated
          plan on their next page load or sign-in.
        </p>
      </Card>
    </div>
  );
}
