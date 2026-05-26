/**
 * Renewal reminders cron — runs daily, sends email reminders to
 * customers AND their affiliates when a subscription is about to expire.
 *
 * Vercel triggers this via `vercel.json` cron config on a daily schedule.
 * The route is secured with `CRON_SECRET` — Vercel automatically attaches
 * `Authorization: Bearer ${CRON_SECRET}` when calling cron routes, so
 * any request without it (e.g. a curious visitor) is rejected.
 *
 * Three reminder windows fire each day:
 *   T-14 days: heads-up email to customer + opportunity email to affiliate
 *   T-3 days:  last-chance email to customer + urgent ping to affiliate
 *   T-1 day after expiry: expired email to customer + recovery prompt to affiliate
 *
 * Dedup: every send is logged to /email_sends/{uid_category_date}. The
 * cron checks this doc's existence before sending — if it already
 * exists for today, we skip. This means re-running the cron during the
 * same day is safe (the daily schedule should fire once, but Vercel
 * occasionally double-fires on retries).
 *
 * Read access: uses Firebase Admin SDK so we can scan all users +
 * write to /email_sends without going through user auth. Make sure
 * FIREBASE_ADMIN_* env vars are set in Vercel.
 */

import { NextResponse } from "next/server";
import { getAdminDb, isAdminConfigured } from "@/lib/firebase/admin";
import { isEmailConfigured } from "@/lib/email/client";
import { sendEmail } from "@/lib/email/send";
import {
  renderCustomerRenewalEmail,
  renderAffiliateRenewalEmail,
} from "@/lib/email/templates/renewalReminder";
import type {
  AccountUser,
  Affiliate,
  Plan,
} from "@/types";

/** Categories used both as email tags and as dedup keys in /email_sends. */
type ReminderCategory =
  | "renewal_14d_customer"
  | "renewal_14d_affiliate"
  | "renewal_3d_customer"
  | "renewal_3d_affiliate"
  | "renewal_expired_customer"
  | "renewal_expired_affiliate";

/** Reminder windows: (days until expiry range, customer cat, affiliate cat). */
const WINDOWS: {
  label: string;
  minDays: number;
  maxDays: number;
  customer: ReminderCategory;
  affiliate: ReminderCategory;
}[] = [
  /* "About to expire in 2 weeks" — the gentle heads-up. */
  {
    label: "T-14d",
    minDays: 13,
    maxDays: 14,
    customer: "renewal_14d_customer",
    affiliate: "renewal_14d_affiliate",
  },
  /* "Last chance" — the urgent nudge. */
  {
    label: "T-3d",
    minDays: 2,
    maxDays: 3,
    customer: "renewal_3d_customer",
    affiliate: "renewal_3d_affiliate",
  },
  /* "Already expired yesterday" — recovery prompt to affiliate primarily. */
  {
    label: "Expired+1",
    minDays: -1,
    maxDays: 0,
    customer: "renewal_expired_customer",
    affiliate: "renewal_expired_affiliate",
  },
];

interface RunResult {
  ok: boolean;
  scanned: number;
  windowsMatched: number;
  emailsSent: number;
  emailsSkipped: number;
  emailsFailed: number;
  windows: { label: string; sent: number; skipped: number; failed: number }[];
  reason?: string;
}

/** Today's YYYY-MM-DD key — used in dedup doc IDs to prevent double-sends. */
function dateBucket(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}

/** Days between now and a future timestamp, rounded to whole days. */
function daysUntil(ts: number): number {
  const diff = ts - Date.now();
  return Math.round(diff / (24 * 60 * 60 * 1000));
}

/** Privacy-preserving display version of an email. */
function maskEmail(email: string): string {
  if (!email) return "";
  const [local, domain] = email.split("@");
  if (!domain) return email;
  if (local.length <= 2) return `${local[0] ?? ""}*@${domain}`;
  return `${local[0]}${"*".repeat(Math.max(local.length - 2, 1))}${local.slice(-1)}@${domain}`;
}

export async function GET(req: Request) {
  /* Step 1 — auth. Vercel attaches this header to all cron requests. */
  const expectedSecret = process.env.CRON_SECRET;
  if (!expectedSecret) {
    return NextResponse.json(
      { ok: false, reason: "cron_secret_not_set" },
      { status: 503 },
    );
  }
  const authHeader = req.headers.get("authorization") ?? "";
  if (authHeader !== `Bearer ${expectedSecret}`) {
    return NextResponse.json(
      { ok: false, reason: "unauthorized" },
      { status: 401 },
    );
  }

  /* Step 2 — guardrails on dependencies. */
  if (!isAdminConfigured()) {
    return NextResponse.json(
      { ok: false, reason: "firebase_admin_not_configured" },
      { status: 503 },
    );
  }
  if (!isEmailConfigured()) {
    return NextResponse.json(
      { ok: false, reason: "email_not_configured" },
      { status: 503 },
    );
  }

  const db = getAdminDb();

  /* Step 3 — pull all users + plans + affiliates up-front. At the
     user's scale (target 500 affiliates → ~thousands of customers)
     this is well within memory + sub-second to scan. We can paginate
     and add per-user indexes later if it ever matters. */
  const [usersSnap, plansDoc, affiliatesSnap] = await Promise.all([
    db.collection("users").get(),
    db.doc("settings/plans").get(),
    db.collection("affiliates").get(),
  ]);

  const plansArray = (plansDoc.data()?.plans ?? []) as Plan[];
  const planMap = new Map<string, Plan>(plansArray.map((p) => [p.id, p]));
  const affiliateMap = new Map<string, Affiliate>(
    affiliatesSnap.docs.map((d) => [(d.data() as Affiliate).code, d.data() as Affiliate]),
  );

  const today = dateBucket();
  const result: RunResult = {
    ok: true,
    scanned: 0,
    windowsMatched: 0,
    emailsSent: 0,
    emailsSkipped: 0,
    emailsFailed: 0,
    windows: WINDOWS.map((w) => ({
      label: w.label,
      sent: 0,
      skipped: 0,
      failed: 0,
    })),
  };

  /* Step 4 — per user, work out which window (if any) they fall in
     today and fire the appropriate emails. */
  for (const docSnap of usersSnap.docs) {
    result.scanned += 1;
    const user = docSnap.data() as AccountUser;
    const expiresAt = user.subscription?.expiresAt;
    if (!expiresAt) continue;

    const days = daysUntil(expiresAt);
    const window = WINDOWS.find(
      (w) => days >= w.minDays && days <= w.maxDays,
    );
    if (!window) continue;

    const plan = planMap.get(user.plan);
    if (!plan) continue; // plan was deleted or never existed — skip

    const affiliate = user.affiliateId
      ? affiliateMap.get(user.affiliateId)
      : null;
    const windowResult = result.windows.find((w) => w.label === window.label);
    if (!windowResult) continue;
    result.windowsMatched += 1;

    /* ── Customer reminder ────────────────────────────────────────── */
    {
      const dedupId = `${user.uid}_${window.customer}_${today}`;
      const dedupRef = db.collection("email_sends").doc(dedupId);
      const existing = await dedupRef.get();
      if (existing.exists) {
        result.emailsSkipped += 1;
        windowResult.skipped += 1;
      } else if (user.email) {
        const { subject, html } = renderCustomerRenewalEmail({
          customerName: user.displayName || "there",
          planName: plan.name,
          daysUntilExpiry: Math.max(0, days),
        });
        const sendResult = await sendEmail({
          to: user.email,
          subject,
          html,
          category: window.customer,
        });
        await dedupRef.set({
          userId: user.uid,
          email: user.email,
          category: window.customer,
          subject,
          sentAt: Date.now(),
          status: sendResult.ok ? "sent" : "failed",
          error: sendResult.ok ? null : sendResult.error ?? null,
          providerId: sendResult.ok ? sendResult.id : null,
        });
        if (sendResult.ok) {
          result.emailsSent += 1;
          windowResult.sent += 1;
        } else {
          result.emailsFailed += 1;
          windowResult.failed += 1;
        }
      }
    }

    /* ── Affiliate opportunity ping (only if user has one) ────────── */
    if (affiliate && (plan.commission ?? 0) > 0) {
      const dedupId = `${affiliate.uid}_${user.uid}_${window.affiliate}_${today}`;
      const dedupRef = db.collection("email_sends").doc(dedupId);
      const existing = await dedupRef.get();
      if (existing.exists) {
        result.emailsSkipped += 1;
        windowResult.skipped += 1;
      } else if (affiliate.email) {
        const { subject, html } = renderAffiliateRenewalEmail({
          affiliateFirstName:
            affiliate.displayName.split(" ")[0] || "there",
          customerEmailMasked: maskEmail(user.email || ""),
          customerName: user.displayName || "Customer",
          planName: plan.name,
          daysUntilExpiry: Math.max(0, days),
          commissionAmount: plan.commission ?? 0,
        });
        const sendResult = await sendEmail({
          to: affiliate.email,
          subject,
          html,
          category: window.affiliate,
        });
        await dedupRef.set({
          affiliateUid: affiliate.uid,
          forUserId: user.uid,
          email: affiliate.email,
          category: window.affiliate,
          subject,
          sentAt: Date.now(),
          status: sendResult.ok ? "sent" : "failed",
          error: sendResult.ok ? null : sendResult.error ?? null,
          providerId: sendResult.ok ? sendResult.id : null,
        });
        if (sendResult.ok) {
          result.emailsSent += 1;
          windowResult.sent += 1;
        } else {
          result.emailsFailed += 1;
          windowResult.failed += 1;
        }
      }
    }
  }

  return NextResponse.json(result);
}
