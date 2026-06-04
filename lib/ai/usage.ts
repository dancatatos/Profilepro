/**
 * Per-user AI usage tracking + daily quota enforcement.
 *
 * Every AI generation call writes a counter into `ai_usage/{uid}__{YYYY-MM-DD}`
 * so we can: (a) see what each user is spending, (b) protect against
 * abuse / runaway costs, (c) eventually surface a "you've used X of Y
 * calls today" panel in the dashboard.
 *
 * Why per-day docs (not a running total)?
 *   - The quota resets daily — a per-day counter is what enforcement
 *     reads, so storing it that way removes the "subtract yesterday's
 *     count" math at request time.
 *   - Old days are great audit data — a 365-doc trail per user is
 *     cheap and queryable for "show me my AI activity this month".
 *
 * Uses the Admin SDK so it works server-side from API routes and the
 * Firestore rules can stay strict (the `ai_usage` collection isn't
 * even readable from the client — only the route handlers touch it).
 */

import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb, isAdminConfigured } from "@/lib/firebase/admin";
import type { AIActionType, PlanId } from "@/types";

/** Daily AI-call quotas per built-in plan. Admin-set caps come later. */
const DAILY_QUOTA: Record<string, number> = {
  free: 5,
  pro: 100,
  team: 500,
};
const DEFAULT_QUOTA = DAILY_QUOTA.pro;

function quotaFor(planId: PlanId | undefined): number {
  if (!planId) return DAILY_QUOTA.free;
  return DAILY_QUOTA[planId] ?? DEFAULT_QUOTA;
}

/** "YYYY-MM-DD" in UTC — keeps a single global day boundary. */
function todayKey(): string {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

function docId(uid: string, day: string): string {
  return `${uid}__${day}`;
}

export interface UsageStatus {
  /** Calls already made today (before this one). */
  used: number;
  /** Daily cap for this user's plan. */
  limit: number;
  /** True when the user is at or above the cap. */
  exceeded: boolean;
}

/**
 * Read today's usage for a user without mutating it. Use this when
 * you want to decide whether to allow a call BEFORE running it (the
 * generate-* routes call this first, return 429 if exceeded, otherwise
 * run the flow and call `recordUsage` after).
 */
export async function getDailyUsage(
  uid: string,
  planId: PlanId | undefined,
): Promise<UsageStatus> {
  const limit = quotaFor(planId);
  if (!isAdminConfigured()) {
    /* No admin SDK = no enforcement. Returning "unused" lets the call
       through; the route just won't be able to write the counter. */
    return { used: 0, limit, exceeded: false };
  }
  const snap = await getAdminDb()
    .collection("ai_usage")
    .doc(docId(uid, todayKey()))
    .get();
  const used = (snap.data() as { count?: number } | undefined)?.count ?? 0;
  return { used, limit, exceeded: used >= limit };
}

/**
 * Record a successful AI call. Increments today's counter and adds
 * the token usage so we can see cost per user over time. Idempotent
 * across concurrent calls because we use Firestore's atomic increment.
 *
 * Errors are swallowed — losing one usage record is preferable to
 * surfacing a Firestore blip as an AI failure. Cost tracking is
 * advisory; quota enforcement happens in getDailyUsage which runs
 * before the AI call and will see the next call's correct count.
 */
export async function recordUsage(
  uid: string,
  action: AIActionType | string,
  tokens: number | undefined,
): Promise<void> {
  if (!isAdminConfigured()) return;
  try {
    const ref = getAdminDb().collection("ai_usage").doc(docId(uid, todayKey()));
    await ref.set(
      {
        uid,
        day: todayKey(),
        count: FieldValue.increment(1),
        tokens: FieldValue.increment(tokens ?? 0),
        [`actions.${action}`]: FieldValue.increment(1),
        updatedAt: Date.now(),
      },
      { merge: true },
    );
  } catch (err) {
    console.warn("[AI usage] recordUsage failed:", err);
  }
}

/**
 * Friendly message shown to the user when they hit their daily cap.
 * Tailored to the plan so the upgrade nudge makes sense.
 */
export function quotaExceededMessage(planId: PlanId | undefined): string {
  if (!planId || planId === "free") {
    return "You've used your 5 free AI generations for today. Upgrade to Pro for 100/day, or come back tomorrow.";
  }
  return "You've hit your daily AI generation cap. Come back tomorrow or contact support if you need a higher limit.";
}
