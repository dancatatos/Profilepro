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
import {
  PLANS,
  getFunnelLimit,
  getTemplateLockerSlots,
  getTrainingsActivateLimit,
  getTrainingsCreateLimit,
} from "@/lib/constants";
import {
  defaultFeatureKeysForPlan,
  groupCatalogByCategory,
  type CatalogFeature,
} from "@/lib/features";
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
  "h-9 w-full rounded-lg border border-slate-200 bg-slate-100 px-3 text-sm text-slate-900 outline-none transition-colors focus:border-electric-500/50";

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

/**
 * Deep-clone plans so editing never mutates the bundled defaults.
 * Carefully omits `undefined` keys (Firestore rejects them when the client
 * isn't configured with ignoreUndefinedProperties).
 *
 * Plans saved before the canonical featureKeys catalogue was introduced
 * get a default set seeded by their plan id (free / pro / team) — that
 * way an admin opening the editor for the first time sees a sensible
 * pre-populated set instead of every toggle off.
 */
function clonePlans(src: Plan[]): Plan[] {
  return src.map((p) => {
    const cloned: Plan = {
      id: p.id,
      name: p.name,
      price: p.price,
      billingPeriod: p.billingPeriod,
      tagline: p.tagline,
      features: p.features.map((f) => ({ ...f })),
      featureKeys:
        p.featureKeys && p.featureKeys.length > 0
          ? [...p.featureKeys]
          : defaultFeatureKeysForPlan(p.id),
      highlighted: p.highlighted ?? false,
      visibility: p.visibility ?? "public",
      checkoutUrl: p.checkoutUrl ?? "",
      commission: p.commission ?? 0,
      limits: p.limits ? { ...p.limits } : undefined,
    };
    if (p.duration) {
      cloned.duration = { ...p.duration };
    }
    return cloned;
  });
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
    /* Custom plans start with an empty feature set — admin opts in
       per-feature so they don't accidentally include everything. */
    featureKeys: [],
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

  /**
   * Flip a canonical feature key on/off for a given plan. The admin
   * UI maps every catalog entry to one of these toggles; this is the
   * source of truth for both pricing-page display and code-level
   * feature gating (see lib/features.ts → planHasFeature).
   */
  const toggleFeatureKey = (pIdx: number, key: string) => {
    setPlans((ps) =>
      ps.map((p, i) => {
        if (i !== pIdx) return p;
        const current = p.featureKeys ?? [];
        const next = current.includes(key)
          ? current.filter((k) => k !== key)
          : [...current, key];
        return { ...p, featureKeys: next };
      }),
    );
    setDirty(true);
  };

  /**
   * Patch a plan's numeric limits (funnel count, shared-build slots).
   * Values are floored to non-negative integers — a limit of 0 means
   * "users on this plan cannot use this feature even if the feature
   * flag is on", which is a useful escape hatch.
   */
  /**
   * Update plan limits. Supports three input shapes per field:
   *   - number ≥ 0  → store as the explicit cap (0 = block, 999 = ∞)
   *   - null        → CLEAR the field so the resolver falls back to
   *                   the hardcoded default for this plan id
   *   - undefined   → no change to this field
   *
   * The "clear to default" path is what makes a blank admin input
   * mean "use the sensible default" instead of "block at 0" — fixes
   * the foot-gun where saving a plan without explicitly typing a
   * number would zero out all the limits.
   */
  const updateLimits = (
    pIdx: number,
    patch: Partial<Record<keyof NonNullable<Plan["limits"]>, number | null>>,
  ) => {
    setPlans((ps) =>
      ps.map((p, i) => {
        if (i !== pIdx) return p;
        const current = p.limits ?? {};
        const next: NonNullable<Plan["limits"]> = { ...current };
        const apply = (key: keyof NonNullable<Plan["limits"]>) => {
          const v = patch[key];
          if (v === undefined) return;
          if (v === null) {
            delete next[key];
            return;
          }
          next[key] = Math.max(0, Math.floor(v));
        };
        apply("funnels");
        apply("sharedBuilds");
        apply("trainingsCreate");
        apply("trainingsActivate");
        apply("pipelines");
        return { ...p, limits: next };
      }),
    );
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
      color: "text-slate-500",
    },
    {
      label: "Pro",
      value: fetching ? "…" : String(counts.pro),
      sub: `₱${priceOf("pro").toLocaleString()}${periodSuffix("pro")} each`,
      color: "text-electric-600",
    },
    {
      label: "Team",
      value: fetching ? "…" : String(counts.team),
      sub: `₱${priceOf("team").toLocaleString()}${periodSuffix("team")} each`,
      color: "text-amber-700",
    },
    {
      label: "Est. MRR",
      value: fetching ? "…" : `₱${mrr.toLocaleString()}`,
      sub: `${paid} paid ${paid === 1 ? "user" : "users"} · annual ÷ 12`,
      color: "text-jade-600",
    },
  ];

  return (
    <div className="space-y-4 p-4 sm:space-y-6 sm:p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900">
            Subscriptions
          </h1>
          <p className="text-sm text-slate-500">
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
            <p className="font-display text-3xl font-bold text-slate-900">
              {s.value}
            </p>
            <p className="mt-1 text-xs text-slate-400">{s.sub}</p>
          </Card>
        ))}
      </div>

      {/* Plan editor */}
      <div>
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-sm font-semibold text-slate-900">
              Plan Definitions
            </h2>
            <p className="text-xs text-slate-400">
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
                        ? "bg-electric-500/15 text-electric-700"
                        : "bg-slate-100 text-slate-500",
                    )}
                  >
                    {plan.id}
                  </span>
                  {isAffiliate && (
                    <span
                      className="inline-flex items-center gap-1 rounded-md bg-electric-500/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-electric-700"
                      title="Hidden from the public website"
                    >
                      <Lock className="h-2.5 w-2.5" />
                      Affiliate
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500">
                  <Star
                    className={cn(
                      "h-3.5 w-3.5",
                      plan.highlighted
                        ? "fill-gold-400 text-amber-700"
                        : "text-slate-300",
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
                      className="ml-1 rounded-md p-1 text-slate-300 transition-colors hover:bg-red-500/10 hover:text-red-600"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Plan id slug — editable only for non-protected plans */}
              <div>
                <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-slate-400">
                  Plan ID (slug)
                </label>
                <input
                  className={cn(inputCls, isProtected && "opacity-50")}
                  value={plan.id}
                  disabled={isProtected}
                  onChange={(e) => renamePlanId(pIdx, e.target.value)}
                />
                {isProtected ? (
                  <p className="mt-1 text-[10px] text-slate-300">
                    Built-in plan — id is locked
                  </p>
                ) : (
                  <p className="mt-1 text-[10px] text-slate-300">
                    URL-safe slug, e.g. <code>annual-special</code>
                  </p>
                )}
              </div>

              {/* Visibility — public vs affiliate-only */}
              <div>
                <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-slate-400">
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
                            ? "border-electric-500/50 bg-electric-500/15 text-electric-700"
                            : "border-slate-200 bg-slate-100 text-slate-500 hover:bg-slate-200",
                        )}
                      >
                        <Icon className="h-3.5 w-3.5" />
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
                <p className="mt-1 text-[10px] text-slate-300">
                  {isAffiliate
                    ? "Hidden from the website. Granted manually after the affiliate forwards payment."
                    : "Shown on the public website and billing page."}
                </p>
              </div>

              {/* Name */}
              <div>
                <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-slate-400">
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
                <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-slate-400">
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
                          ? "border-electric-500/50 bg-electric-500/15 text-electric-700"
                          : "border-slate-200 bg-slate-100 text-slate-500 hover:bg-slate-200",
                      )}
                    >
                      {bp}
                    </button>
                  ))}
                </div>
              </div>

              {/* Price */}
              <div>
                <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-slate-400">
                  Price / {plan.billingPeriod === "annual" ? "year" : "month"}
                </label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">
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
                <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-slate-400">
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
                <label className="mb-1 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-slate-400">
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
                <p className="mt-1 text-[10px] text-slate-300">
                  The &ldquo;Buy&rdquo; button on the billing page sends users here.
                </p>
              </div>

              {/* Affiliate commission */}
              <div>
                <label className="mb-1 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-slate-400">
                  <Coins className="h-3 w-3" />
                  Affiliate commission
                </label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">
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
                <p className="mt-1 text-[10px] text-slate-300">
                  Paid to the affiliate on signup AND on every renewal. 0 = no
                  commission.
                </p>
              </div>

              {/* Activation duration */}
              <div>
                <label className="mb-1 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-slate-400">
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
                <p className="mt-1 text-[10px] text-slate-300">
                  How long an activation lasts before renewal is due.
                </p>
              </div>

              {/* Numeric limits — funnel count + shared-build slots. The
                  feature flags above control IF the user can access these
                  modules; these inputs control HOW MUCH capacity they get.
                  A user can also be granted per-user overrides in
                  /admin/users that beat these values. */}
              <div>
                <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-slate-400">
                  Plan limits
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <LimitInput
                    label="Funnel cap"
                    value={plan.limits?.funnels}
                    defaultValue={getFunnelLimit(plan.id)}
                    onChange={(v) => updateLimits(pIdx, { funnels: v })}
                  />
                  <LimitInput
                    label="Shared-build slots"
                    value={plan.limits?.sharedBuilds}
                    defaultValue={getTemplateLockerSlots(plan.id)}
                    onChange={(v) => updateLimits(pIdx, { sharedBuilds: v })}
                  />
                  <LimitInput
                    label="Trainings — create / clone"
                    value={plan.limits?.trainingsCreate}
                    defaultValue={getTrainingsCreateLimit(plan.id)}
                    onChange={(v) => updateLimits(pIdx, { trainingsCreate: v })}
                  />
                  <LimitInput
                    label="Trainings — library cap"
                    value={plan.limits?.trainingsActivate}
                    defaultValue={getTrainingsActivateLimit(plan.id)}
                    onChange={(v) => updateLimits(pIdx, { trainingsActivate: v })}
                  />
                </div>
                <p className="mt-1 text-[10px] text-slate-400">
                  Blank = use the default for this plan id (shown as
                  placeholder). 0 = block. 999 = effectively unlimited.
                  Per-user overrides in <code>/admin/users</code> can grant
                  individuals more.
                </p>
              </div>

              {/* Canonical features — driven by the FEATURE_CATALOG in
                  lib/features.ts. Toggle a row on to grant that feature
                  to users on this plan. New features added to the
                  catalogue automatically appear here. */}
              <PlanFeatureToggles
                planFeatureKeys={plan.featureKeys ?? []}
                onToggle={(key) => toggleFeatureKey(pIdx, key)}
              />

              {/* Optional custom display rows — free-text labels shown
                  on the pricing card alongside the canonical features.
                  Useful for marketing copy ("Everything in Free", etc).
                  These do NOT gate functionality — they're display only. */}
              <details className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <summary className="cursor-pointer text-[11px] font-medium uppercase tracking-wider text-slate-400 hover:text-slate-600">
                  Custom display lines{" "}
                  {plan.features.length > 0 && `(${plan.features.length})`}
                </summary>
                <p className="mt-2 text-[10px] text-slate-400">
                  Display-only — shown on the pricing card, doesn&apos;t
                  affect feature gating. Use for marketing lines like
                  &ldquo;Everything in Free&rdquo;.
                </p>
                <div className="mt-2 space-y-1.5">
                  {plan.features.map((f, fIdx) => (
                    <div key={fIdx} className="flex items-center gap-2">
                      <Switch
                        on={f.included}
                        onClick={() =>
                          updateFeature(pIdx, fIdx, {
                            included: !f.included,
                          })
                        }
                        label="Toggle whether this row is shown as included"
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
                        className="shrink-0 rounded-md p-1.5 text-slate-300 transition-colors hover:bg-red-500/10 hover:text-red-600"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => addFeature(pIdx)}
                  className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-white/[0.12] py-1.5 text-[11px] font-medium text-slate-500 transition-colors hover:border-white/25 hover:text-slate-600"
                >
                  <Plus className="h-3.5 w-3.5" /> Add custom line
                </button>
              </details>
            </Card>
            );
          })}

          {/* Add new plan tile */}
          <button
            type="button"
            onClick={addPlan}
            className="flex min-h-[18rem] flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-white/[0.12] p-5 text-sm font-medium text-slate-500 transition-colors hover:border-electric-500/40 hover:bg-electric-500/[0.04] hover:text-electric-700"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100">
              <Plus className="h-5 w-5" />
            </span>
            Add new plan
            <span className="text-[11px] font-normal text-slate-300">
              Create a custom plan (affiliate or public)
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Canonical feature toggle grid ──
 *
 * Renders every entry from FEATURE_CATALOG grouped by category, each
 * as a toggleable row. When the catalogue grows (e.g. a new feature
 * key is added in lib/features.ts), this list updates automatically —
 * existing plans see the new row defaulting to off until the admin
 * decides which tier(s) to grant it to.
 */
function PlanFeatureToggles({
  planFeatureKeys,
  onToggle,
}: {
  planFeatureKeys: string[];
  onToggle: (key: string) => void;
}) {
  const grouped = groupCatalogByCategory();
  const enabledCount = planFeatureKeys.length;

  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between">
        <label className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
          Features
        </label>
        <span className="text-[10px] text-slate-300">
          {enabledCount} of {grouped.reduce((s, g) => s + g.features.length, 0)}{" "}
          enabled
        </span>
      </div>
      <div className="space-y-3">
        {grouped.map(({ category, features }) => (
          <div key={category}>
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              {category}
            </p>
            <div className="space-y-1">
              {features.map((f) => (
                <FeatureToggleRow
                  key={f.key}
                  feature={f}
                  enabled={planFeatureKeys.includes(f.key)}
                  onToggle={() => onToggle(f.key)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function FeatureToggleRow({
  feature,
  enabled,
  onToggle,
}: {
  feature: CatalogFeature;
  enabled: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      title={feature.hint}
      className={cn(
        "flex w-full items-start gap-2.5 rounded-lg border px-2.5 py-1.5 text-left transition-colors",
        enabled
          ? "border-jade-500/30 bg-jade-500/[0.06]"
          : "border-slate-200 bg-slate-50 hover:bg-slate-100",
      )}
    >
      <span
        className={cn(
          "mt-0.5 flex h-4 w-7 shrink-0 items-center rounded-full transition-colors",
          enabled ? "bg-jade-500" : "bg-white/15",
        )}
      >
        <span
          className={cn(
            "h-3 w-3 rounded-full bg-white transition-transform",
            enabled ? "ml-3.5" : "ml-0.5",
          )}
        />
      </span>
      <span className="min-w-0 flex-1">
        <span
          className={cn(
            "block text-xs font-medium",
            enabled ? "text-slate-900" : "text-slate-600",
          )}
        >
          {feature.label}
        </span>
        {feature.hint && (
          <span className="mt-0.5 block text-[10px] text-slate-400">
            {feature.hint}
          </span>
        )}
      </span>
    </button>
  );
}

/**
 * Plan-limit numeric input that supports three states:
 *   - typed number  → explicit cap (0 = block, 999 = ∞)
 *   - blank         → clears the field; the resolver falls back to
 *                     the hardcoded default for this plan id
 *   - never touched → shows blank with the default as a placeholder
 *                     ("Default: 5") so admin can see what they'd
 *                     get without typing anything
 *
 * The previous version auto-populated 0 when the saved value was
 * undefined and treated blank as 0 on save — which silently wiped
 * the defaults the moment an admin clicked Save on a plan without
 * touching the fields.
 */
function LimitInput({
  label,
  value,
  defaultValue,
  onChange,
}: {
  label: string;
  value: number | undefined;
  defaultValue: number;
  onChange: (v: number | null) => void;
}) {
  return (
    <div>
      <p className="mb-1 text-[10px] text-slate-500">{label}</p>
      <input
        type="number"
        min={0}
        className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 text-sm text-slate-900 outline-none focus:border-electric-500/50"
        value={value ?? ""}
        placeholder={`Default: ${defaultValue >= 999 ? "∞" : defaultValue}`}
        onChange={(e) => {
          const raw = e.target.value;
          if (raw === "") {
            onChange(null);
            return;
          }
          const n = Number(raw);
          if (!Number.isFinite(n) || n < 0) return;
          onChange(n);
        }}
      />
    </div>
  );
}
