/**
 * AI route guard — single helper that fronts every generation route.
 *
 * Centralises three concerns the routes used to ignore:
 *   1. Quota enforcement — reject early with a friendly 429 when the
 *      user has burned their daily AI allowance.
 *   2. Plan lookup — server-side read of the user's current plan so
 *      the quota check can't be spoofed by a client-supplied value.
 *   3. Usage recording — increments the per-day counter + token
 *      total after a successful run, so the next call's quota check
 *      reflects reality.
 *
 * Routes pass `{ uid, action }` and the helper handles everything
 * else; the route just runs its flow between the two calls.
 *
 * Soft-fails when the Admin SDK isn't configured (local dev without
 * the FIREBASE_ADMIN_* env vars) — quota becomes unlimited and
 * usage isn't recorded, but the AI still works so the product is
 * developable on a laptop.
 */

import { getAdminDb, isAdminConfigured } from "@/lib/firebase/admin";
import {
  getDailyUsage,
  quotaExceededMessage,
  recordUsage,
} from "./usage";
import type { AIActionType, AccountUser, PlanId } from "@/types";

export interface GuardDecision {
  /** Whether the route should proceed with the AI call. */
  ok: boolean;
  /** When ok=false, the HTTP status to return. */
  status?: number;
  /** When ok=false, the error message to send back to the client. */
  error?: string;
  /** Resolved plan id — present whenever the uid existed. */
  planId?: PlanId;
}

async function lookupPlan(uid: string): Promise<PlanId | undefined> {
  if (!isAdminConfigured()) return undefined;
  try {
    const doc = await getAdminDb().collection("users").doc(uid).get();
    return (doc.data() as AccountUser | undefined)?.plan;
  } catch {
    return undefined;
  }
}

/**
 * Check whether `uid` may make an AI call right now. Call this first
 * in every AI route handler; if `ok` is false, return the suggested
 * status + error verbatim. Anonymous (uid-less) calls are allowed
 * through without enforcement — for now they're rate-limited only by
 * the lack of any caller, since the routes have no auth check.
 */
export async function checkAIQuota(uid: string | undefined): Promise<GuardDecision> {
  if (!uid) return { ok: true };
  const planId = await lookupPlan(uid);
  const status = await getDailyUsage(uid, planId);
  if (status.exceeded) {
    return {
      ok: false,
      status: 429,
      error: quotaExceededMessage(planId),
      planId,
    };
  }
  return { ok: true, planId };
}

/**
 * Record a successful AI call. Token count is optional — passing 0
 * is fine when the upstream model didn't surface a usageMetadata
 * block. The action label flows into the per-action breakdown on the
 * per-day usage doc.
 */
export async function logAICall(
  uid: string | undefined,
  action: AIActionType | string,
  tokens: number | undefined,
): Promise<void> {
  if (!uid) return;
  await recordUsage(uid, action, tokens);
}
