"use client";

import { useEffect, useState, useCallback } from "react";
import {
  RefreshCw,
  Plus,
  Trash2,
  Save,
  Star,
  RotateCcw,
  Globe,
  Lock,
  Link2,
  Coins,
  Clock,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { toast } from "@/store/uiStore";
import {
  listAllUsers,
  getPlansConfig,
  setPlansConfig,
} from "@/lib/firebase/firestore";
import { PLANS } from "@/lib/constants";
import { cn, slugify } from "@/lib/utils";
import type {
  AccountUser,
  Plan,
  PlanDuration,
  PlanDurationUnit,
  PlanFeature,
  PlanVisibility,
} from "@/types";

const inputCls =
  "h-9 w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 text-sm text-white outline-none transition-colors focus:border-electric-500/50";

/* ── Pill switch ── */
function Switch({
  on,
  onClick,
  label,
}: {
  on: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={onClick}
      className={cn(
        "relative h-5 w-9 shrink-0 rounded-full transition-colors",
        on ? "bg-jade-500" : "bg-white/15",
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform",
          on ? "translate-x-[1.125rem]" : "translate-x-0.5",
        )}
      />
    </button>
  );
}

/** Deep-clone plans so editing never mutates the bundled defaults. */
function clonePlans(src: Plan[]): Plan[] {
  return src.map((p) => ({
    ...p,
    features: p.features.map((f) => ({ ...f })),
    duration: p.duration ? { ...p.duration } : undefined,
  }));
}

/**
 * Create a fresh blank plan with a unique id slug. Used by the
 * "Add new plan" button — admins flesh it out from there.
 */
function blankPlan(existingIds: string[]): Plan {
  const base = "new-plan";
  let id = base;
  let n = 2;
  while (existingIds.includes(id)) {
    id = `${base}-${n++}`;
  }
  return {
    id,
    name: "New Plan",
    price: 0,
    billingPeriod: "monthly",
    tagline: "",
    features: [],
    highlighted: false,
    visibility: "affiliate",
    checkoutUrl: "",
    commission: 0,
    duration: { value: 1, unit: "months" },
  };
}

/** Built-in plan IDs that we never let admins delete (the app falls back to "free"). */
const PROTECTED_PLAN_IDS = ["free"];

export default function AdminSubscriptionsPage() {
  const { account } = useAuth();
  const [users, setUsers] = useState<AccountUser[]>([]);
  const [plans, setPlans] = useState<Plan[]>(() => clonePlans(PLANS));
  const [fetching, setFetching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  const load = useCallback(async () => {
    setFetching(true);
    try {
      const [allUsers, savedPlans] = await Promise.all([
        listAllUsers(),
        getPlansConfig(),
      ]);
      setUsers(allUsers);
      if (savedPlans) setPlans(clonePlans(savedPlans));
      setDirty(false);
    } catch {
      toast.error("Couldn't load subscription data.");
    } finally {
      setFetching(false);
    }
  }, []);

  useEffect(() => {
    if (account?.role === "admin") load();
  }, [account, load]);

  /* ── Plan editing ── */
  const updatePlan = (idx: number, patch: Partial<Plan>) => {
    setPlans((ps) => ps.map((p, i) => (i === idx ? { ...p, ...patch } : p)));
    setDirty(true);
  };

  const updateFeature = (
    pIdx: number,
    fIdx: number,
    patch: Partial<PlanFeature>,
  ) => {
    setPlans((ps) =>
      ps.map((p, i) =>
        i === pIdx
          ? {
              ...p,
              features: p.features.map((f, j) =>
                j === fIdx ? { ...f, ...patch } : f,
              ),
            }
          : p,
      ),
    );
    setDirty(true);
  };

  const addFeature = (pIdx: number) => {
    setPlans((ps) =>
      ps.map((p, i) =>
        i === pIdx
          ? { ...p, features: [...p.features, { label: "", included: true }] }
          : p,
      ),
    );
    setDirty(true);
  };

  const removeFeature = (pIdx: number, fIdx: number) => {
    setPlans((ps) =>
      ps.map((p, i) =>
        i === pIdx
          ? { ...p, features: p.features.filter((_, j) => j !== fIdx) }
          : p,
      ),
    );
    setDirty(true);
  };

  const addPlan = () => {
    setPlans((ps) => [...ps, blankPlan(ps.map((p) => p.id))]);
    setDirty(true);
  };

  const removePlan = (pIdx: number) => {
    const plan = plans[pIdx];
    if (!plan) return;
    if (PROTECTED_PLAN_IDS.includes(plan.id)) {
      toast.error(`"${plan.name}" is a built-in plan and cannot be removed.`);
      return;
    }
    if (!confirm(`Delete "${plan.name}"? Users on this plan will fall back to Free.`)) return;
    setPlans((ps) => ps.filter((_, i) => i !== pIdx));
    setDirty(true);
  };

  /**
   * Update a plan's id slug. Re-runs slugify to keep it URL-safe, dedups
   * against other plans, and refuses changes that would clash with a
   * protected built-in.
   */
  const renamePlanId = (pIdx: number, raw: string) => {
    const next = slugify(raw) || "plan";
    setPlans((ps) => {
      // If another plan already uses this id, leave the input unchanged
      // (the user will see no visual change — they need to pick a unique slug).
      const clash = ps.some((p, i) => i !== pIdx && p.id === next);
      if (clash) return ps;
      return ps.map((p, i) => (i === pIdx ? { ...p, id: next } : p));
    });
    setDirty(true);
  };

  const updateDuration = (pIdx: number, patch: Partial<PlanDuration>) => {
    setPlans((ps) =>
      ps.map((p, i) => {
        if (i !== pIdx) return p;
        const current = p.duration ?? { value: 1, unit: "months" as const };
        const next: PlanDuration = { ...current, ...patch };
        return { ...p, duration: next };
      }),
    );
    setDirty(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      await setPlansConfig(plans);
      setDirty(false);
      toast.success("Plans saved — the billing page now reflects your edits.");
    } catch {
      toast.error("Couldn't save — check Firestore rules are published.");
    } finally {
      setSaving(false);
    }
  };

  const resetDefaults = () => {
    setPlans(clonePlans(PLANS));
    setDirty(true);
  };

  /* ── Overview ── */
  const planOf = (id: string) => plans.find((p) => p.id === id);
  const priceOf = (id: string) => planOf(id)?.price ?? 0;
  const periodSuffix = (id: string) =>
    planOf(id)?.billingPeriod === "annual" ? "/yr" : "/mo";
  /** A plan's price normalised to a monthly figure (annual ÷ 12). */
  const monthlyValueOf = (id: string) => {
    const p = planOf(id);
    if (!p) return 0;
    return p.billingPeriod === "annual" ? p.price / 12 : p.price;
  };

  const counts = {
    free: users.filter((u) => u.plan === "free").length,
    pro: users.filter((u) => u.plan === "pro").length,
    team: users.filter((u) => u.plan === "team").length,
  };
  const mrr = Math.round(
    users.reduce((sum, u) => sum + monthlyValueOf(u.plan), 0),
  );
  const paid = counts.pro + counts.team;

  const overview = [
    {
      label: "Free",
      value: fetching ? "…" : String(counts.free),
      sub: `₱${priceOf("free").toLocaleString()}${periodSuffix("free")}`,
      color: "text-white/60",
    },
    {
      label: "Pro",
      value: fetching ? "…" : String(counts.pro),
      sub: `₱${priceOf("pro").toLocaleString()}${periodSuffix("pro")} each`,
      color: "text-electric-400",
    },
    {
      label: "Team",
      value: fetching ? "…" : String(counts.team),
      sub: `₱${priceOf("team").toLocaleString()}${periodSuffix("team")} each`,
      color: "text-gold-400",
    },
    {
      label: "Est. MRR",
      value: fetching ? "…" : `₱${mrr.toLocaleString()}`,
      sub: `${paid} paid ${paid === 1 ? "user" : "users"} · annual ÷ 12`,
      color: "text-jade-400",
    },
  ];

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">
            Subscriptions
          </h1>
          <p className="text-sm text-white/45">
            Plan distribution and editable pricing.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={load}
          loading={fetching}
          leftIcon={<RefreshCw className="h-3.5 w-3.5" />}
        >
          Refresh
        </Button>
      </div>

      {/* Overview */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {overview.map((s) => (
          <Card key={s.label} className="p-5">
            <p
              className={cn(
                "mb-2 text-xs font-medium uppercase tracking-wider",
                s.color,
              )}
            >
              {s.label}
            </p>
            <p className="font-display text-3xl font-bold text-white">
              {s.value}
            </p>
            <p className="mt-1 text-xs text-white/40">{s.sub}</p>
          </Card>
        ))}
      </div>

      {/* Plan editor */}
      <div>
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-sm font-semibold text-white">
              Plan Definitions
            </h2>
            <p className="text-xs text-white/40">
              Edits go live on the public billing page once saved.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Button
              variant="outline"
              onClick={resetDefaults}
              leftIcon={<RotateCcw className="h-3.5 w-3.5" />}
            >
              Reset
            </Button>
            <Button
              onClick={save}
              loading={saving}
              disabled={!dirty}
              leftIcon={<Save className="h-3.5 w-3.5" />}
            >
              {dirty ? "Save changes" : "Saved"}
            </Button>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          {plans.map((plan, pIdx) => {
            const isProtected = PROTECTED_PLAN_IDS.includes(plan.id);
            const visibility: PlanVisibility = plan.visibility ?? "public";
            const isAffiliate = visibility === "affiliate";
            return (
            <Card
              key={plan.id}
              className={cn(
                "space-y-4 p-5",
                isAffiliate &&
                  "border-electric-500/30 bg-electric-500/[0.03]",
              )}
            >
              {/* id chip + popular toggle + delete */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <span
                    className={cn(
                      "rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
                      isAffiliate
                        ? "bg-electric-500/15 text-electric-300"
                        : "bg-white/[0.06] text-white/45",
                    )}
                  >
                    {plan.id}
                  </span>
                  {isAffiliate && (
                    <span
                      className="inline-flex items-center gap-1 rounded-md bg-electric-500/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-electric-300"
                      title="Hidden from the public website"
                    >
                      <Lock className="h-2.5 w-2.5" />
                      Affiliate
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 text-[11px] font-medium text-white/50">
                  <Star
                    className={cn(
                      "h-3.5 w-3.5",
                      plan.highlighted
                        ? "fill-gold-400 text-gold-400"
                        : "text-white/30",
                    )}
                  />
                  Popular
                  <Switch
                    on={!!plan.highlighted}
                    onClick={() =>
                      updatePlan(pIdx, { highlighted: !plan.highlighted })
                    }
                    label={`Mark ${plan.name} as popular`}
                  />
                  {!isProtected && (
                    <button
                      type="button"
                      onClick={() => removePlan(pIdx)}
                      aria-label={`Delete ${plan.name}`}
                      className="ml-1 rounded-md p-1 text-white/30 transition-colors hover:bg-red-500/10 hover:text-red-400"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Plan id slug — editable only for non-protected plans */}
              <div>
                <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-white/40">
                  Plan ID (slug)
                </label>
                <input
                  className={cn(inputCls, isProtected && "opacity-50")}
                  value={plan.id}
                  disabled={isProtected}
                  onChange={(e) => renamePlanId(pIdx, e.target.value)}
                />
                {isProtected ? (
                  <p className="mt-1 text-[10px] text-white/30">
                    Built-in plan — id is locked
                  </p>
                ) : (
                  <p className="mt-1 text-[10px] text-white/30">
                    URL-safe slug, e.g. <code>annual-special</code>
                  </p>
                )}
              </div>

              {/* Visibility — public vs affiliate-only */}
              <div>
                <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-white/40">
                  Visibility
                </label>
                <div className="flex gap-1.5">
                  {(
                    [
                      { id: "public", label: "Public", icon: Globe },
                      { id: "affiliate", label: "Affiliate only", icon: Lock },
                    ] as const
                  ).map((opt) => {
                    const Icon = opt.icon;
                    const active = visibility === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() =>
                          updatePlan(pIdx, { visibility: opt.id })
                        }
                        className={cn(
                          "flex flex-1 items-center justify-center gap-1.5 rounded-lg border py-1.5 text-xs font-medium capitalize transition-colors",
                          active
                            ? "border-electric-500/50 bg-electric-500/15 text-electric-300"
                            : "border-white/10 bg-white/[0.04] text-white/50 hover:bg-white/[0.08]",
                        )}
                      >
                        <Icon className="h-3.5 w-3.5" />
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
                <p className="mt-1 text-[10px] text-white/30">
                  {isAffiliate
                    ? "Hidden from the website. Granted manually after the affiliate forwards payment."
                    : "Shown on the public website and billing page."}
                </p>
              </div>

              {/* Name */}
              <div>
                <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-white/40">
                  Plan name
                </label>
                <input
                  className={inputCls}
                  value={plan.name}
                  onChange={(e) => updatePlan(pIdx, { name: e.target.value })}
                />
              </div>

              {/* Billing period */}
              <div>
                <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-white/40">
                  Billing period
                </label>
                <div className="flex gap-1.5">
                  {(["monthly", "annual"] as const).map((bp) => (
                    <button
                      key={bp}
                      type="button"
                      onClick={() => updatePlan(pIdx, { billingPeriod: bp })}
                      className={cn(
                        "flex-1 rounded-lg border py-1.5 text-xs font-medium capitalize transition-colors",
                        plan.billingPeriod === bp
                          ? "border-electric-500/50 bg-electric-500/15 text-electric-300"
                          : "border-white/10 bg-white/[0.04] text-white/50 hover:bg-white/[0.08]",
                      )}
                    >
                      {bp}
                    </button>
                  ))}
                </div>
              </div>

              {/* Price */}
              <div>
                <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-white/40">
                  Price / {plan.billingPeriod === "annual" ? "year" : "month"}
                </label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-white/40">
                    ₱
                  </span>
                  <input
                    type="number"
                    min={0}
                    className={cn(inputCls, "pl-7")}
                    value={plan.price}
                    onChange={(e) =>
                      updatePlan(pIdx, {
                        price: Math.max(0, Number(e.target.value) || 0),
                      })
                    }
                  />
                </div>
              </div>

              {/* Tagline */}
              <div>
                <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-white/40">
                  Tagline
                </label>
                <input
                  className={inputCls}
                  value={plan.tagline}
                  onChange={(e) =>
                    updatePlan(pIdx, { tagline: e.target.value })
                  }
                />
              </div>

              {/* Checkout URL — per-plan Gumroad link */}
              <div>
                <label className="mb-1 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-white/40">
                  <Link2 className="h-3 w-3" />
                  Checkout URL
                </label>
                <input
                  className={inputCls}
                  placeholder={
                    isAffiliate
                      ? "(usually empty for affiliate plans)"
                      : "https://your.gumroad.com/l/..."
                  }
                  value={plan.checkoutUrl ?? ""}
                  onChange={(e) =>
                    updatePlan(pIdx, { checkoutUrl: e.target.value })
                  }
                />
                <p className="mt-1 text-[10px] text-white/30">
                  The &ldquo;Buy&rdquo; button on the billing page sends users here.
                </p>
              </div>

              {/* Affiliate commission */}
              <div>
                <label className="mb-1 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-white/40">
                  <Coins className="h-3 w-3" />
                  Affiliate commission
                </label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-white/40">
                    ₱
                  </span>
                  <input
                    type="number"
                    min={0}
                    className={cn(inputCls, "pl-7")}
                    value={plan.commission ?? 0}
                    onChange={(e) =>
                      updatePlan(pIdx, {
                        commission: Math.max(0, Number(e.target.value) || 0),
                      })
                    }
                  />
                </div>
                <p className="mt-1 text-[10px] text-white/30">
                  Paid to the affiliate on signup AND on every renewal. 0 = no
                  commission.
                </p>
              </div>

              {/* Activation duration */}
              <div>
                <label className="mb-1 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-white/40">
                  <Clock className="h-3 w-3" />
                  Activation duration
                </label>
                <div className="flex gap-1.5">
                  <input
                    type="number"
                    min={1}
                    className={cn(inputCls, "w-20")}
                    value={plan.duration?.value ?? 1}
                    onChange={(e) =>
                      updateDuration(pIdx, {
                        value: Math.max(1, Number(e.target.value) || 1),
                      })
                    }
                  />
                  <select
                    className={cn(inputCls, "flex-1 capitalize")}
                    value={plan.duration?.unit ?? "months"}
                    onChange={(e) =>
                      updateDuration(pIdx, {
                        unit: e.target.value as PlanDurationUnit,
                      })
                    }
                  >
                    <option value="days">days</option>
                    <option value="months">months</option>
                    <option value="years">years</option>
                  </select>
                </div>
                <p className="mt-1 text-[10px] text-white/30">
                  How long an activation lasts before renewal is due.
                </p>
              </div>

              {/* Features */}
              <div>
                <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-white/40">
                  Features
                </label>
                <div className="space-y-1.5">
                  {plan.features.map((f, fIdx) => (
                    <div key={fIdx} className="flex items-center gap-2">
                      <Switch
                        on={f.included}
                        onClick={() =>
                          updateFeature(pIdx, fIdx, {
                            included: !f.included,
                          })
                        }
                        label="Toggle whether this feature is included"
                      />
                      <input
                        className={cn(inputCls, "h-8 flex-1 text-xs")}
                        value={f.label}
                        placeholder="Feature description"
                        onChange={(e) =>
                          updateFeature(pIdx, fIdx, {
                            label: e.target.value,
                          })
                        }
                      />
                      <button
                        type="button"
                        onClick={() => removeFeature(pIdx, fIdx)}
                        aria-label="Remove feature"
                        className="shrink-0 rounded-md p-1.5 text-white/30 transition-colors hover:bg-red-500/10 hover:text-red-400"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => addFeature(pIdx)}
                  className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-white/[0.12] py-1.5 text-[11px] font-medium text-white/45 transition-colors hover:border-white/25 hover:text-white/70"
                >
                  <Plus className="h-3.5 w-3.5" /> Add feature
                </button>
              </div>
            </Card>
            );
          })}

          {/* Add new plan tile */}
          <button
            type="button"
            onClick={addPlan}
            className="flex min-h-[18rem] flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-white/[0.12] p-5 text-sm font-medium text-white/45 transition-colors hover:border-electric-500/40 hover:bg-electric-500/[0.04] hover:text-electric-300"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/[0.06]">
              <Plus className="h-5 w-5" />
            </span>
            Add new plan
            <span className="text-[11px] font-normal text-white/30">
              Create a custom plan (affiliate or public)
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
