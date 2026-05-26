"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { Search, Check, ChevronDown, RefreshCw, Lock, Coins } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { toast } from "@/store/uiStore";
import {
  listAllUsers,
  adminSetUserPlan,
  getPlansConfig,
} from "@/lib/firebase/firestore";
import { PLANS as DEFAULT_PLANS } from "@/lib/constants";
import { cn, daysUntil, timeUntil } from "@/lib/utils";
import type { AccountUser, Plan, PlanId } from "@/types";

type BadgeTone = "jade" | "blue" | "gold";

/** Map plan id → a badge tone. Built-ins keep their existing colours,
 *  custom plans inherit "blue" as the catch-all. */
function planTone(planId: PlanId): BadgeTone {
  if (planId === "free") return "jade";
  if (planId === "team") return "gold";
  return "blue";
}

/** Human-readable display label for a plan id, falling back to the raw id. */
function planLabel(planId: PlanId, plans: Plan[]): string {
  return plans.find((p) => p.id === planId)?.name ?? planId.toUpperCase();
}

/** Format a plan's price as e.g. "₱499/mo" or "₱1,499/yr". Free returns "Free". */
function priceLabel(plan: Plan): string {
  if (plan.price === 0) return "Free";
  const suffix = plan.billingPeriod === "annual" ? "/yr" : "/mo";
  return `₱${plan.price.toLocaleString()}${suffix}`;
}

function PlanDropdown({
  user,
  plans,
  onChanged,
}: {
  user: AccountUser;
  plans: Plan[];
  onChanged: (uid: string, plan: PlanId) => void;
}) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const select = async (planId: PlanId) => {
    if (planId === user.plan) {
      setOpen(false);
      return;
    }
    setSaving(true);
    setOpen(false);
    try {
      const result = await adminSetUserPlan(user.uid, planId);
      onChanged(user.uid, planId);
      if (result.commissionCreated) {
        toast.success(
          `Plan set to ${planLabel(planId, plans)} for ${user.email} — ₱${(result.amount ?? 0).toLocaleString()} credited to ${result.affiliateCode}.`,
        );
      } else {
        toast.success(
          `Plan set to ${planLabel(planId, plans)} for ${user.email}`,
        );
      }
    } catch {
      toast.error("Failed to update plan.");
    } finally {
      setSaving(false);
    }
  };

  /* Group plans into Public + Affiliate sections so the admin can scan
     them quickly and never accidentally pick the wrong tier. */
  const publicPlans = plans.filter((p) => p.visibility !== "affiliate");
  const affiliatePlans = plans.filter((p) => p.visibility === "affiliate");

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
          <Badge tone={planTone(user.plan)}>
            {planLabel(user.plan, plans)}
          </Badge>
        )}
        <ChevronDown className="h-3 w-3 text-white/40" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-20 mt-1 w-72 overflow-hidden rounded-xl border border-white/10 bg-ink-900 shadow-xl">
            {/* Public plans */}
            {publicPlans.length > 0 && (
              <div>
                <div className="border-b border-white/[0.06] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-white/35">
                  Public plans
                </div>
                {publicPlans.map((p) => (
                  <PlanOption
                    key={p.id}
                    plan={p}
                    current={p.id === user.plan}
                    onSelect={() => select(p.id)}
                  />
                ))}
              </div>
            )}

            {/* Affiliate plans */}
            {affiliatePlans.length > 0 && (
              <div>
                <div className="flex items-center gap-1 border-y border-electric-500/20 bg-electric-500/[0.04] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-electric-300">
                  <Lock className="h-2.5 w-2.5" />
                  Affiliate plans
                </div>
                {affiliatePlans.map((p) => (
                  <PlanOption
                    key={p.id}
                    plan={p}
                    current={p.id === user.plan}
                    onSelect={() => select(p.id)}
                    affiliate
                  />
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

/** One row in the plan picker dropdown. */
function PlanOption({
  plan,
  current,
  onSelect,
  affiliate,
}: {
  plan: Plan;
  current: boolean;
  onSelect: () => void;
  affiliate?: boolean;
}) {
  return (
    <button
      onClick={onSelect}
      className={cn(
        "flex w-full flex-col items-stretch gap-0.5 px-3 py-2.5 text-left transition-colors hover:bg-white/[0.06]",
        affiliate && "hover:bg-electric-500/10",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-white">{plan.name}</span>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-white/45">{priceLabel(plan)}</span>
          {current && <Check className="h-3.5 w-3.5 text-jade-400" />}
        </div>
      </div>
      {affiliate && plan.commission && plan.commission > 0 ? (
        <div className="flex items-center gap-1 text-[10px] text-electric-300/80">
          <Coins className="h-2.5 w-2.5" />
          ₱{plan.commission.toLocaleString()} commission per signup &amp; renewal
        </div>
      ) : null}
    </button>
  );
}

export default function AdminUsersPage() {
  const { account } = useAuth();
  const [users, setUsers] = useState<AccountUser[]>([]);
  const [plans, setPlans] = useState<Plan[]>(DEFAULT_PLANS);
  const [filtered, setFiltered] = useState<AccountUser[]>([]);
  const [search, setSearch] = useState("");
  const [fetching, setFetching] = useState(false);

  const loadAll = useCallback(async () => {
    setFetching(true);
    try {
      const [all, savedPlans] = await Promise.all([
        listAllUsers(),
        getPlansConfig(),
      ]);
      setUsers(all);
      setFiltered(all);
      if (savedPlans && savedPlans.length > 0) setPlans(savedPlans);
    } catch {
      toast.error("Could not load users. Check Firestore admin rules.");
    } finally {
      setFetching(false);
    }
  }, []);

  useEffect(() => {
    if (account?.role === "admin") loadAll();
  }, [account, loadAll]);

  /**
   * One stats tile per plan, plus a "Total" tile at the front. Computes
   * counts live so newly created custom plans show up automatically.
   */
  const planStats = useMemo(() => {
    const tiles = plans.map((p) => ({
      label: p.name,
      value: users.filter((u) => u.plan === p.id).length,
      affiliate: p.visibility === "affiliate",
    }));
    return [
      { label: "Total", value: users.length, affiliate: false },
      ...tiles,
    ];
  }, [users, plans]);

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
          onClick={loadAll}
          loading={fetching}
          leftIcon={<RefreshCw className="h-3.5 w-3.5" />}
        >
          Refresh
        </Button>
      </div>

      {/* Quick stats row — one tile per plan, affiliate plans tinted */}
      <div className="flex gap-3 flex-wrap">
        {planStats.map((s) => (
          <div
            key={s.label}
            className={cn(
              "rounded-xl border px-4 py-2 text-sm",
              s.affiliate
                ? "border-electric-500/30 bg-electric-500/[0.05]"
                : "border-white/[0.06] bg-white/[0.03]",
            )}
          >
            <span
              className={s.affiliate ? "text-electric-300/80" : "text-white/40"}
            >
              {s.label}:{" "}
            </span>
            <span className="font-semibold text-white">
              {fetching ? "…" : s.value}
            </span>
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
                  <th className="pb-3 text-left font-medium">Plan expires</th>
                  <th className="pb-3 text-right font-medium">Plan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {filtered.map((u) => {
                  const expiresAt = u.subscription?.expiresAt;
                  /* Highlight rows that need attention:
                       - red    when expired (days = 0 + has subscription)
                       - amber  when 14 days or less remaining
                       - muted  when comfortably in the future */
                  const expiryTone = (() => {
                    if (expiresAt == null) return "text-white/30";
                    const days = daysUntil(expiresAt);
                    if (days === 0) return "text-red-300";
                    if (days <= 14) return "text-gold-300";
                    return "text-white/55";
                  })();
                  return (
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
                      <td className={cn("py-3 pr-4 text-xs", expiryTone)}>
                        {expiresAt == null ? (
                          "—"
                        ) : (
                          <div>
                            <p className="font-medium">
                              {new Date(expiresAt).toLocaleDateString()}
                            </p>
                            <p className="text-[10px] opacity-70">
                              {timeUntil(expiresAt)}
                              {u.subscription?.renewalCount
                                ? ` · renewed ${u.subscription.renewalCount}×`
                                : ""}
                            </p>
                          </div>
                        )}
                      </td>
                      <td className="py-3 text-right">
                        <PlanDropdown
                          user={u}
                          plans={plans}
                          onChanged={handlePlanChanged}
                        />
                      </td>
                    </tr>
                  );
                })}
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
