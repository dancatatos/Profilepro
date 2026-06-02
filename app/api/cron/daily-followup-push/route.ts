/**
 * Daily follow-up push cron.
 *
 * Runs once a day at 9 AM PHT (01:00 UTC). For every user who has
 * at least one active push subscription AND at least one overdue
 * or due-today lead, sends a single bundled notification:
 *
 *   "You have N follow-ups due today. Tap to open."
 *
 * Tapping the notification opens /pipelines/today (handled by the
 * notificationclick listener in public/sw.js).
 *
 * Security: protected by CRON_SECRET, same pattern as the existing
 * renewal-reminders cron. Vercel automatically attaches
 * `Authorization: Bearer ${CRON_SECRET}` when calling its own cron
 * endpoints.
 *
 * Required env vars:
 *   - CRON_SECRET                  (Vercel auth)
 *   - VAPID_PUBLIC_KEY             (web-push)
 *   - VAPID_PRIVATE_KEY            (web-push)
 *   - VAPID_SUBJECT                ("mailto:support@crediblyai.com")
 *   - FIREBASE_ADMIN_*             (already configured for the renewal cron)
 *
 * Dead-subscription cleanup: web-push returns 404 / 410 when the push
 * service has expired the subscription (user uninstalled, cleared site
 * data, etc.). We delete those rows so the next run doesn't waste a
 * request on them.
 */

import { NextResponse } from "next/server";
import webPush from "web-push";
import { getAdminDb, isAdminConfigured } from "@/lib/firebase/admin";
import type { Lead } from "@/types";

interface PushSubscriptionDoc {
  id: string;
  userId: string;
  endpoint: string;
  keys: { p256dh: string; auth: string };
  userAgent: string;
  createdAt: number;
  lastUsedAt: number;
}

interface RunResult {
  ok: boolean;
  scanned: number;
  usersNotified: number;
  pushesSent: number;
  pushesFailed: number;
  deadSubscriptionsCleaned: number;
  reason?: string;
}

export async function GET(req: Request) {
  /* Step 1 — auth gate (matches renewal-reminders pattern). */
  const expectedSecret = process.env.CRON_SECRET;
  if (!expectedSecret) {
    return NextResponse.json(
      { ok: false, reason: "cron_secret_not_set" },
      { status: 503 },
    );
  }
  if (req.headers.get("authorization") !== `Bearer ${expectedSecret}`) {
    return NextResponse.json(
      { ok: false, reason: "unauthorized" },
      { status: 401 },
    );
  }

  /* Step 2 — dependency guardrails. Fail soft so a misconfigured env
     just no-ops instead of crashing the daily cron. */
  if (!isAdminConfigured()) {
    return NextResponse.json(
      { ok: false, reason: "firebase_admin_not_configured" },
      { status: 503 },
    );
  }
  const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
  const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
  const vapidSubject = process.env.VAPID_SUBJECT || "mailto:support@crediblyai.com";
  if (!vapidPublicKey || !vapidPrivateKey) {
    return NextResponse.json(
      { ok: false, reason: "vapid_keys_not_set" },
      { status: 503 },
    );
  }
  webPush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

  const db = getAdminDb();
  const result: RunResult = {
    ok: true,
    scanned: 0,
    usersNotified: 0,
    pushesSent: 0,
    pushesFailed: 0,
    deadSubscriptionsCleaned: 0,
  };

  /* Step 3 — gather all active subscriptions and group by user. */
  const subsSnap = await db.collection("push_subscriptions").get();
  const subsByUser = new Map<string, PushSubscriptionDoc[]>();
  for (const docSnap of subsSnap.docs) {
    const sub = { ...(docSnap.data() as PushSubscriptionDoc), id: docSnap.id };
    const list = subsByUser.get(sub.userId) ?? [];
    list.push(sub);
    subsByUser.set(sub.userId, list);
  }
  result.scanned = subsByUser.size;

  /* Step 4 — for each subscribed user, count their due tasks. The
     query is the same shape as listLeadsWithUpcomingTasks (relies on
     the composite index on ownerId + nextTaskAt). End-of-day uses
     PHT (UTC+8) since that's the audience timezone — slightly biased
     for international users but the right call until per-user TZ
     preferences exist. */
  const now = Date.now();
  const endOfTodayPht = endOfTodayInPht();

  for (const [userId, subs] of subsByUser.entries()) {
    try {
      const leadsSnap = await db
        .collection("leads")
        .where("ownerId", "==", userId)
        .where("nextTaskAt", "<=", endOfTodayPht)
        .get();

      let overdue = 0;
      let today = 0;
      for (const leadDoc of leadsSnap.docs) {
        const lead = leadDoc.data() as Lead;
        if (!lead.pipelineId || !lead.nextTaskAt) continue;
        if (lead.nextTaskAt < now) overdue += 1;
        else today += 1;
      }
      const urgent = overdue + today;
      if (urgent === 0) continue; // nothing to remind them about

      const headline =
        overdue > 0 && today > 0
          ? `${overdue} overdue · ${today} due today`
          : overdue > 0
            ? `${overdue} overdue follow-up${overdue === 1 ? "" : "s"}`
            : `${today} follow-up${today === 1 ? "" : "s"} due today`;

      const payload = JSON.stringify({
        title: "Follow-ups waiting",
        body: `${headline} — tap to open your daily task list.`,
        url: "/pipelines/today",
        /* tag: collapses multiple pushes into one notification on the
           device, so a user who didn't tap yesterday doesn't get two
           stacked notifications today. */
        tag: "credibly-daily-followup",
      });

      let userGotNotified = false;
      await Promise.all(
        subs.map(async (sub) => {
          try {
            await webPush.sendNotification(
              {
                endpoint: sub.endpoint,
                keys: sub.keys,
              },
              payload,
              { TTL: 24 * 60 * 60 },
            );
            result.pushesSent += 1;
            userGotNotified = true;
            /* Refresh lastUsedAt for future GC. */
            await db
              .collection("push_subscriptions")
              .doc(sub.id)
              .update({ lastUsedAt: Date.now() });
          } catch (err: unknown) {
            const status = (err as { statusCode?: number })?.statusCode;
            /* 404 / 410 = subscription is permanently dead. Purge so
               we stop wasting requests on it. Other errors (network
               blips, 5xx) we leave alone — they may recover next run. */
            if (status === 404 || status === 410) {
              await db
                .collection("push_subscriptions")
                .doc(sub.id)
                .delete();
              result.deadSubscriptionsCleaned += 1;
            } else {
              result.pushesFailed += 1;
              console.warn(
                `[daily-followup-push] send to ${sub.endpoint.slice(-12)} failed (status ${status ?? "unknown"})`,
              );
            }
          }
        }),
      );
      if (userGotNotified) result.usersNotified += 1;
    } catch (err) {
      console.error(
        `[daily-followup-push] user ${userId} errored:`,
        err,
      );
    }
  }

  return NextResponse.json(result);
}

/**
 * Returns epoch ms at 23:59:59.999 in the Philippines (UTC+8).
 * Using a fixed offset is fine — PH doesn't observe daylight saving.
 */
function endOfTodayInPht(): number {
  const PHT_OFFSET_MS = 8 * 60 * 60 * 1000;
  const nowPht = new Date(Date.now() + PHT_OFFSET_MS);
  /* Strip to start-of-day PHT, then add a full day minus 1 ms. */
  nowPht.setUTCHours(0, 0, 0, 0);
  const endOfDayPht = nowPht.getTime() + 24 * 60 * 60 * 1000 - 1;
  /* Convert back from "PHT-as-if-it-were-UTC" → actual UTC ms. */
  return endOfDayPht - PHT_OFFSET_MS;
}
