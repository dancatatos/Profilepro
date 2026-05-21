"use client";

import { useEffect, useState, useCallback } from "react";
import {
  RefreshCw,
  Plus,
  Trash2,
  Save,
  Star,
  RotateCcw,
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
import { cn } from "@/lib/utils";
import type { AccountUser, Plan, PlanFeature } from "@/types";

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
  }));
}

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
  const priceOf = (id: string) =>
    plans.find((p) => p.id === id)?.priceMonthly ?? 0;
  const counts = {
    free: users.filter((u) => u.plan === "free").length,
    pro: users.filter((u) => u.plan === "pro").length,
    team: users.filter((u) => u.plan === "team").length,
  };
  const mrr = users.reduce((sum, u) => sum + priceOf(u.plan), 0);
  const paid = counts.pro + counts.team;

  const overview = [
    {
      label: "Free",
      value: fetching ? "…" : String(counts.free),
      sub: `$${priceOf("free")}/mo`,
      color: "text-white/60",
    },
    {
      label: "Pro",
      value: fetching ? "…" : String(counts.pro),
      sub: `$${priceOf("pro")}/mo each`,
      color: "text-electric-400",
    },
    {
      label: "Team",
      value: fetching ? "…" : String(counts.team),
      sub: `$${priceOf("team")}/mo each`,
      color: "text-gold-400",
    },
    {
      label: "Est. MRR",
      value: fetching ? "…" : `$${mrr.toLocaleString()}`,
      sub: `${paid} paid ${paid === 1 ? "user" : "users"}`,
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
          {plans.map((plan, pIdx) => (
            <Card key={plan.id} className="space-y-4 p-5">
              {/* id chip + popular toggle */}
              <div className="flex items-center justify-between gap-2">
                <span className="rounded-md bg-white/[0.06] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white/45">
                  {plan.id}
                </span>
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
                </div>
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

              {/* Price */}
              <div>
                <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-white/40">
                  Price / month
                </label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-white/40">
                    $
                  </span>
                  <input
                    type="number"
                    min={0}
                    className={cn(inputCls, "pl-7")}
                    value={plan.priceMonthly}
                    onChange={(e) =>
                      updatePlan(pIdx, {
                        priceMonthly: Math.max(
                          0,
                          Number(e.target.value) || 0,
                        ),
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
          ))}
        </div>
      </div>
    </div>
  );
}
