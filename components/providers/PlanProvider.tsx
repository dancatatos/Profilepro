"use client";

/**
 * Plan + feature-access context.
 *
 * Loads the admin-edited plan config from Firestore once at app start
 * (falls back to the bundled PLANS defaults if the network is
 * unavailable or rules block read), then exposes a `hasFeature()`
 * checker keyed off the current user's plan id.
 *
 * Why a context: every gated page/component would otherwise need to
 * call getPlansConfig() itself, multiplying the Firestore reads by
 * page count. With one provider at the root, the plans config is
 * loaded exactly once per app session.
 *
 * Fail-open vs fail-closed: when the plans config can't load and the
 * user's account also fails to load, hasFeature() returns false (closed).
 * When plans load but the user's specific plan id isn't found (e.g.
 * an admin deleted the plan after a user signed up), the hook treats
 * them as on the "free" plan as a graceful degrade.
 */

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "@/hooks/useAuth";
import { getPlansConfig } from "@/lib/firebase/firestore";
import { PLANS as DEFAULT_PLANS } from "@/lib/constants";
import {
  defaultFeatureKeysForPlan,
  planHasAnyFeature,
  planHasFeature,
} from "@/lib/features";
import type { Plan } from "@/types";

interface PlanContextValue {
  /** All plans known to the app (admin-edited + defaults). */
  plans: Plan[];
  /** The current user's plan, or null while loading / signed-out. */
  currentPlan: Plan | null;
  /** True when feature-checks can rely on real data (vs falling back to free). */
  ready: boolean;
}

const PlanContext = createContext<PlanContextValue>({
  plans: DEFAULT_PLANS,
  currentPlan: null,
  ready: false,
});

export function PlanProvider({ children }: { children: ReactNode }) {
  const { account } = useAuth();
  const [plans, setPlans] = useState<Plan[]>(DEFAULT_PLANS);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const saved = await getPlansConfig();
        if (!cancelled && saved && saved.length > 0) setPlans(saved);
      } catch {
        /* Stay with DEFAULT_PLANS — every feature still gates via the
           legacy planHasFeature label-match fallback. */
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const currentPlan = useMemo<Plan | null>(() => {
    if (!account) return null;
    /* Look up by exact id. Backfill featureKeys from the canonical
       defaults if the saved plan doc predates the catalogue, so
       hasFeature() never returns false for a paid user on a stale
       schema. */
    const found = plans.find((p) => p.id === account.plan);
    if (found) {
      if (found.featureKeys && found.featureKeys.length > 0) return found;
      return {
        ...found,
        featureKeys: defaultFeatureKeysForPlan(found.id),
      };
    }
    /* Plan not found — graceful fallback to the bundled free plan. */
    return plans.find((p) => p.id === "free") ?? null;
  }, [account, plans]);

  const value = useMemo<PlanContextValue>(
    () => ({ plans, currentPlan, ready }),
    [plans, currentPlan, ready],
  );

  return <PlanContext.Provider value={value}>{children}</PlanContext.Provider>;
}

/**
 * Hook for any component that needs to gate access by feature key.
 *
 *   const { hasFeature, hasAnyFeature, currentPlan } = usePlanAccess();
 *   if (!hasFeature("ai_generation")) return <UpgradePrompt />;
 */
export function usePlanAccess() {
  const ctx = useContext(PlanContext);
  return {
    plans: ctx.plans,
    currentPlan: ctx.currentPlan,
    ready: ctx.ready,
    hasFeature: (key: string) => planHasFeature(ctx.currentPlan, key),
    hasAnyFeature: (keys: string[]) => planHasAnyFeature(ctx.currentPlan, keys),
  };
}
