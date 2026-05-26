"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import {
  Search,
  Check,
  ChevronDown,
  RefreshCw,
  Lock,
  Coins,
  Sliders,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { toast } from "@/store/uiStore";
import {
  listAllUsers,
  adminSetUserPlan,
  adminSetUserLimitOverrides,
  getPlansConfig,
  type AdminSetUserPlanResult,
} from "@/lib/firebase/firestore";
import { auth as firebaseAuth } from "@/lib/firebase/client";
import {
  PLANS as DEFAULT_PLANS,
  resolveUserFunnelLimit,
  resolveUserSharedBuildSlots,
} from "@/lib/constants";
import { cn, daysUntil, timeUntil } from "@/lib/utils";
import type { AccountUser, Plan, PlanId } from "@/types";

/**
 * Fire-and-forget the commission-earned notification email to the
 * affiliate. Never blocks the plan-change toast — if the email send
 * fails for any reason (Resend down, env var missing, etc.) we silently
 * skip it. The commission record itself is already written, which is
 * the part that matters for accounting.
 */
async function notifyCommissionEarned(result: AdminSetUserPlanResult): Promise<void> {
  if (
    !result.commissionCreated ||
    !result.affiliateEmail ||
    !result.amount
  ) {
    return;
  }
  try {
    const user = firebaseAuth.currentUser;
    if (!user) return;
    const idToken = await user.getIdToken();
    await fetch("/api/notify/commission-earned", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({
        affiliateEmail: result.affiliateEmail,
        affiliateName: result.affiliateName,
        customerName: result.customerName,
        planName: result.planName,
        amount: result.amount,
        type: result.type,
      }),
    });
  } catch {
    /* swallow — email is best-effort */
  }
}

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
        /* Fire the commission-earned email — non-blocking. */
        notifyCommissionEarned(result);
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
  /* Per-user limit-overrides modal — null when closed, holds the user
     being edited when open. */
  const [editingLimits, setEditingLimits] = useState<AccountUser | null>(null);

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

  /* Apply a limit-override change locally + persist to Firestore. */
  const handleLimitsChanged = (
    uid: string,
    overrides: { funnels?: number | null; sharedBuilds?: number | null },
  ) => {
    setUsers((prev) =>
      prev.map((u) => {
        if (u.uid !== uid) return u;
        const nextOverrides = { ...(u.limitOverrides ?? {}) };
        if (overrides.funnels === null) delete nextOverrides.funnels;
        else if (typeof overrides.funnels === "number")
          nextOverrides.funnels = overrides.funnels;
        if (overrides.sharedBuilds === null) delete nextOverrides.sharedBuilds;
        else if (typeof overrides.sharedBuilds === "number")
          nextOverrides.sharedBuilds = overrides.sharedBuilds;
        return {
          ...u,
          limitOverrides:
            Object.keys(nextOverrides).length > 0 ? nextOverrides : undefined,
        };
      }),
    );
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
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Per-user limit overrides — small icon button.
                              Chip indicator below the row when overrides
                              are active is handled in the limits cell. */}
                          <button
                            type="button"
                            onClick={() => setEditingLimits(u)}
                            aria-label="Edit per-user limits"
                            title="Edit per-user limits"
                            className={cn(
                              "rounded-lg p-1.5 transition-colors",
                              u.limitOverrides
                                ? "bg-electric-500/15 text-electric-300"
                                : "text-white/30 hover:bg-white/[0.06] hover:text-white",
                            )}
                          >
                            <Sliders className="h-3.5 w-3.5" />
                          </button>
                          <PlanDropdown
                            user={u}
                            plans={plans}
                            onChanged={handlePlanChanged}
                          />
                        </div>
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

      {/* Per-user limit overrides modal */}
      <LimitOverridesModal
        user={editingLimits}
        plans={plans}
        onClose={() => setEditingLimits(null)}
        onSaved={handleLimitsChanged}
      />
    </div>
  );
}

/* ── Per-user limit overrides modal ──
 *
 * Lets the admin grant individual users extra funnel slots / shared-build
 * slots beyond what their plan includes. Blank input = "use plan default";
 * a number overrides the plan value. Common use cases:
 *   - A hired funnel-builder needs 50 funnels on the Pro plan (default 5).
 *   - A beta tester gets unlimited shared builds.
 *   - A specific customer gets only 1 funnel even on Pro (rare edge case).
 *
 * Pressing Save persists to /users/{uid}.limitOverrides; pressing the
 * Clear button next to a field clears just that override (returning to
 * the plan default).
 */
function LimitOverridesModal({
  user,
  plans,
  onClose,
  onSaved,
}: {
  user: AccountUser | null;
  plans: Plan[];
  onClose: () => void;
  onSaved: (
    uid: string,
    patch: { funnels?: number | null; sharedBuilds?: number | null },
  ) => void;
}) {
  /* Track edit state as strings so an empty input means "use default". */
  const [funnels, setFunnels] = useState<string>("");
  const [sharedBuilds, setSharedBuilds] = useState<string>("");
  const [saving, setSaving] = useState(false);

  /* Re-seed local state every time a different user is opened. */
  useEffect(() => {
    if (!user) return;
    setFunnels(
      user.limitOverrides?.funnels !== undefined
        ? String(user.limitOverrides.funnels)
        : "",
    );
    setSharedBuilds(
      user.limitOverrides?.sharedBuilds !== undefined
        ? String(user.limitOverrides.sharedBuilds)
        : "",
    );
    setSaving(false);
  }, [user]);

  if (!user) return null;

  /* The effective limits the user has right now — used as placeholders
     on the inputs to show what they'll get without an override. */
  const planFunnelLimit = resolveUserFunnelLimit(
    { plan: user.plan, limitOverrides: {} },
    plans,
  );
  const planSharedLimit = resolveUserSharedBuildSlots(
    { plan: user.plan, limitOverrides: {} },
    plans,
  );

  const save = async () => {
    setSaving(true);
    try {
      const parsed = (s: string): number | null | undefined => {
        if (s.trim() === "") return null; // clear override
        const n = Number(s);
        if (!Number.isFinite(n) || n < 0) return undefined; // skip invalid
        return Math.floor(n);
      };
      const fn = parsed(funnels);
      const sb = parsed(sharedBuilds);
      await adminSetUserLimitOverrides(user.uid, {
        funnels: fn,
        sharedBuilds: sb,
      });
      onSaved(user.uid, { funnels: fn, sharedBuilds: sb });
      toast.success(`Limits updated for ${user.displayName || user.email}.`);
      onClose();
    } catch {
      toast.error("Couldn't save the overrides.");
    } finally {
      setSaving(false);
    }
  };

  const clearAll = async () => {
    setFunnels("");
    setSharedBuilds("");
  };

  return (
    <Modal
      open={!!user}
      onClose={() => !saving && onClose()}
      title={`Limit overrides — ${user.displayName || user.email}`}
      description="Leave a field blank to use the plan default."
    >
      <div className="space-y-4 pb-3">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-white/55">
            Funnel limit
          </label>
          <Input
            type="number"
            min={0}
            value={funnels}
            onChange={(e) => setFunnels(e.target.value)}
            placeholder={`Plan default: ${planFunnelLimit}`}
            hint={
              funnels.trim() === ""
                ? `Will use the plan's default (${planFunnelLimit}).`
                : `Override active — this user gets ${Math.max(
                    0,
                    Math.floor(Number(funnels) || 0),
                  )} funnels regardless of plan.`
            }
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-white/55">
            Shared-build slots
          </label>
          <Input
            type="number"
            min={0}
            value={sharedBuilds}
            onChange={(e) => setSharedBuilds(e.target.value)}
            placeholder={`Plan default: ${planSharedLimit}`}
            hint={
              sharedBuilds.trim() === ""
                ? `Will use the plan's default (${planSharedLimit}).`
                : `Override active — this user gets ${Math.max(
                    0,
                    Math.floor(Number(sharedBuilds) || 0),
                  )} slots regardless of plan.`
            }
          />
        </div>
      </div>
      <div className="flex gap-2 border-t border-white/[0.06] p-4 pb-safe">
        <Button variant="outline" onClick={clearAll} disabled={saving}>
          Clear both
        </Button>
        <Button fullWidth onClick={save} loading={saving} disabled={saving}>
          Save overrides
        </Button>
      </div>
    </Modal>
  );
}
