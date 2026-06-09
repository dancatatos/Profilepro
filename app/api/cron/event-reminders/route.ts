/**
 * Event reminders cron — runs daily, sends 24h-before reminders for
 * upcoming team events. Two channels per event:
 *   - Email   → all "going" RSVPs with the event email template
 *   - Push    → all "going" RSVPs who have an active push subscription
 *
 * Vercel triggers this via vercel.json cron config. Auth via CRON_SECRET.
 *
 * Window: events whose startAt is between (now + 24h - cron-window/2)
 * and (now + 24h + cron-window/2). Cron runs daily at 9 AM PHT (the
 * same window the follow-up push uses), so "24h before" = "this time
 * tomorrow ± 12h". We pick all events starting within the next
 * 24h window — that way each event gets exactly one reminder send,
 * dedup'd via the email_sends collection on first send.
 *
 * Dedup: writes a doc per (event, channel) into /event_notifications
 * with the date. Re-running the cron same-day is safe.
 */

import { NextResponse } from "next/server";
import webPush from "web-push";
import { getAdminDb, isAdminConfigured } from "@/lib/firebase/admin";
import { isEmailConfigured } from "@/lib/email/client";
import { sendEmail } from "@/lib/email/send";
import { renderEventReminderEmail } from "@/lib/email/templates/teamEvent";
import type {
  AccountUser,
  EventRsvp,
  TeamEvent,
  TeamSpace,
} from "@/types";

interface PushSubscriptionDoc {
  id: string;
  userId: string;
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

interface CronResult {
  ok: boolean;
  eventsScanned: number;
  emailsSent: number;
  emailsFailed: number;
  pushesSent: number;
  pushesFailed: number;
  deadSubscriptionsCleaned: number;
  reason?: string;
}

export async function GET(req: Request): Promise<NextResponse<CronResult>> {
  /* ── Auth ── */
  const expectedSecret = process.env.CRON_SECRET;
  if (!expectedSecret) {
    return NextResponse.json(
      empty({ reason: "cron_secret_not_set" }),
      { status: 503 },
    );
  }
  if (req.headers.get("authorization") !== `Bearer ${expectedSecret}`) {
    return NextResponse.json(empty({ reason: "unauthorized" }), { status: 401 });
  }
  if (!isAdminConfigured()) {
    return NextResponse.json(
      empty({ reason: "firebase_admin_not_configured" }),
      { status: 503 },
    );
  }

  /* ── VAPID for push (warn-only — events with no push subs still
        send email). ── */
  const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
  const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
  const vapidSubject =
    process.env.VAPID_SUBJECT || "mailto:support@crediblyai.com";
  const pushEnabled = !!(vapidPublicKey && vapidPrivateKey);
  if (pushEnabled) {
    webPush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
  }

  const db = getAdminDb();
  const result: CronResult = {
    ok: true,
    eventsScanned: 0,
    emailsSent: 0,
    emailsFailed: 0,
    pushesSent: 0,
    pushesFailed: 0,
    deadSubscriptionsCleaned: 0,
  };

  /* ── Find events starting in the next 24 hours ── */
  const now = Date.now();
  const horizon = now + 24 * 60 * 60 * 1000;
  const eventsSnap = await db
    .collection("team_events")
    .where("startAt", ">=", now)
    .where("startAt", "<=", horizon)
    .get();
  result.eventsScanned = eventsSnap.size;

  /* Cache common reads — many events likely share a team space. */
  const teamCache = new Map<string, TeamSpace | null>();
  const userCache = new Map<string, AccountUser | null>();

  for (const eDoc of eventsSnap.docs) {
    const event = { ...(eDoc.data() as TeamEvent), id: eDoc.id };
    if (event.status === "canceled") continue;
    /* Respect the leader's notification preferences. */
    const wantEmail = event.notifyDayBefore !== false;
    const wantPush = event.pushDayBefore !== false;
    if (!wantEmail && !wantPush) continue;

    /* Dedup: skip if we already sent the reminder today. */
    const dedupId = `${event.id}__reminder`;
    const dedupRef = db.collection("event_notifications").doc(dedupId);
    const dedupSnap = await dedupRef.get();
    if (dedupSnap.exists) continue;

    /* Resolve the team for the email subject line. */
    let team = teamCache.get(event.teamSpaceId);
    if (team === undefined) {
      const ts = await db.collection("team_spaces").doc(event.teamSpaceId).get();
      team = ts.exists ? (ts.data() as TeamSpace) : null;
      teamCache.set(event.teamSpaceId, team);
    }
    if (!team) continue;

    /* Collect "going" RSVPs. */
    const rsvpSnap = await db
      .collection("event_rsvps")
      .where("eventId", "==", event.id)
      .where("status", "==", "going")
      .get();
    const goingUids = rsvpSnap.docs.map((d) => (d.data() as EventRsvp).userId);
    if (goingUids.length === 0) {
      /* Stamp dedup so we don't keep scanning this event tomorrow. */
      await dedupRef.set({
        eventId: event.id,
        sentAt: Date.now(),
        recipients: 0,
      });
      continue;
    }

    /* Build display copy once per event. */
    const start = new Date(event.startAt);
    const whenLine = `${start.toLocaleString("en-PH", {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZone: event.timezone,
    })} (${event.timezone})`;
    /* Origin for the join URL — read from APP_URL env, fall back to prod. */
    const origin =
      process.env.NEXT_PUBLIC_APP_URL || "https://www.crediblyai.com";
    const joinUrl = `${origin.replace(/\/$/, "")}/join/event/${event.id}`;
    const pushTitle = `Tomorrow: ${event.title}`;
    const pushBody = `${event.title} in ${team.name} starts in 24 hours — tap to see details.`;

    for (const uid of goingUids) {
      /* Resolve user for email + name. */
      let user = userCache.get(uid);
      if (user === undefined) {
        const us = await db.collection("users").doc(uid).get();
        user = us.exists ? (us.data() as AccountUser) : null;
        userCache.set(uid, user);
      }

      /* Email — only if user has an email + notifyDayBefore is on. */
      if (wantEmail && isEmailConfigured() && user?.email) {
        const { subject, html } = renderEventReminderEmail({
          teamName: team.name,
          eventTitle: event.title,
          eventDescription: event.description,
          whenLine,
          locationLabel: event.locationLabel,
          joinUrl,
          recipientName: user.displayName?.split(/\s+/)[0],
        });
        const res = await sendEmail({
          to: user.email,
          subject,
          html,
          category: "event_reminder",
        });
        if (res.ok) result.emailsSent += 1;
        else result.emailsFailed += 1;
      }

      /* Push — for each of this user's active subscriptions. */
      if (wantPush && pushEnabled) {
        const pushSnap = await db
          .collection("push_subscriptions")
          .where("userId", "==", uid)
          .get();
        for (const ps of pushSnap.docs) {
          const sub = ps.data() as PushSubscriptionDoc;
          try {
            await webPush.sendNotification(
              {
                endpoint: sub.endpoint,
                keys: sub.keys,
              },
              JSON.stringify({
                title: pushTitle,
                body: pushBody,
                url: "/my-events",
                tag: `event-${event.id}`,
              }),
            );
            result.pushesSent += 1;
          } catch (err) {
            const status = (err as { statusCode?: number })?.statusCode;
            if (status === 404 || status === 410) {
              /* Expired subscription — clean it up. */
              try {
                await ps.ref.delete();
                result.deadSubscriptionsCleaned += 1;
              } catch {
                // ignore
              }
            } else {
              result.pushesFailed += 1;
            }
          }
        }
      }
    }

    /* Mark this event's reminder as sent for the day. */
    await dedupRef.set({
      eventId: event.id,
      sentAt: Date.now(),
      recipients: goingUids.length,
    });
  }

  return NextResponse.json(result);
}

function empty(over: Partial<CronResult>): CronResult {
  return {
    ok: false,
    eventsScanned: 0,
    emailsSent: 0,
    emailsFailed: 0,
    pushesSent: 0,
    pushesFailed: 0,
    deadSubscriptionsCleaned: 0,
    ...over,
  };
}
