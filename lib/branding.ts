/**
 * Server-side resolver for the `remove_branding` plan feature.
 *
 * Used by every public surface that needs to know whether to hide
 * the "Made with Credibly" footer for the page owner — profile
 * page, funnel page, and (future) training page.
 *
 * Critical: this MUST use the Firebase Admin SDK to read the user
 * doc. The client Firebase SDK fails server-side because public
 * pages have no auth context, and the /users/{uid} Firestore rule
 * only allows reads by self or admin. A silent permission-denied
 * here would make every paid user see the branding footer they're
 * supposed to be free of — which is exactly the bug we shipped this
 * resolver to fix.
 *
 * Fail-open: any error (admin SDK not configured, lookup failed,
 * plan misconfigured) returns false, meaning branding STAYS visible.
 * That's the safe direction — we never want to silently strip
 * branding from a free-plan user by accident.
 */

import {
  getAdminApp,
  getAdminDb,
  isAdminConfigured,
} from "@/lib/firebase/admin";
import { getPlansConfig } from "@/lib/firebase/firestore";
import { PLANS as DEFAULT_PLANS } from "@/lib/constants";
import { defaultFeatureKeysForPlan, planHasFeature } from "@/lib/features";
import type { AccountUser, Plan } from "@/types";

export async function resolveCanRemoveBranding(
  ownerId: string,
): Promise<boolean> {
  if (!isAdminConfigured()) {
    /* No admin SDK configured (local dev without env vars) — we can't
       look up the user doc, so default to showing branding. */
    return false;
  }
  try {
    /* Admin SDK read bypasses Firestore rules. The /users/{uid} rule
       is owner-only, which would otherwise block this server-side
       lookup since public-page requests are unauthenticated. */
    getAdminApp();
    const db = getAdminDb();
    const snap = await db.collection("users").doc(ownerId).get();
    if (!snap.exists) return false;
    const user = snap.data() as AccountUser;

    /* Plans config can still come from the client SDK — settings/marketing
       is public-readable per the Firestore rules, so no auth needed. */
    const savedPlans = await getPlansConfig().catch(() => null);
    const plans: Plan[] =
      savedPlans && savedPlans.length > 0 ? savedPlans : DEFAULT_PLANS;
    const plan = plans.find((p) => p.id === user.plan);
    if (!plan) return false;

    /* Backfill featureKeys for plans saved before the catalogue
       shipped (or for legacy data missing the field). */
    const planWithKeys =
      plan.featureKeys && plan.featureKeys.length > 0
        ? plan
        : { ...plan, featureKeys: defaultFeatureKeysForPlan(plan.id) };
    return planHasFeature(planWithKeys, "remove_branding");
  } catch {
    return false;
  }
}
