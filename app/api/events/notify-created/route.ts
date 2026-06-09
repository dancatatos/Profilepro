/**
 * POST /api/events/notify-created — fire the "new event" email blast.
 *
 * Called by the event creator UI after createTeamEvent succeeds, when
 * the leader checked the "Email all team members now" box. The route:
 *   1. Verifies the caller's Firebase ID token + ownership of the event
 *   2. Fetches the event, team space, and all team memberships
 *   3. Resolves each member's email via the users collection
 *   4. Sends the rendered email via Resend (one send per member;
 *      Resend handles batching internally)
 *
 * Best-effort: individual send failures are logged but don't fail
 * the whole batch — the event was already created, the email is a
 * non-critical side effect.
 */

import { NextResponse } from "next/server";
import { getAdminApp, isAdminConfigured } from "@/lib/firebase/admin";
import { getFirestore } from "firebase-admin/firestore";
import { verifyUserRequest } from "@/lib/auth/verifyUser";
import { isEmailConfigured } from "@/lib/email/client";
import { sendEmail } from "@/lib/email/send";
import { renderEventCreatedEmail } from "@/lib/email/templates/teamEvent";
import type {
  AccountUser,
  TeamEvent,
  TeamMembership,
  TeamSpace,
} from "@/types";

interface Payload {
  eventId?: unknown;
  /** Absolute origin for the join URL (caller passes window.location.origin). */
  origin?: unknown;
}

interface Result {
  ok: boolean;
  sent: number;
  failed: number;
  skipped: number;
  reason?: string;
}

export async function POST(req: Request): Promise<NextResponse<Result>> {
  /* ── Auth gate ── */
  const verification = await verifyUserRequest(req);
  if (!verification.ok) {
    return NextResponse.json(
      { ok: false, sent: 0, failed: 0, skipped: 0, reason: verification.reason },
      { status: verification.status },
    );
  }
  if (!isAdminConfigured()) {
    return NextResponse.json(
      { ok: false, sent: 0, failed: 0, skipped: 0, reason: "admin_not_configured" },
      { status: 503 },
    );
  }
  if (!isEmailConfigured()) {
    return NextResponse.json(
      { ok: false, sent: 0, failed: 0, skipped: 0, reason: "email_not_configured" },
      { status: 503 },
    );
  }

  /* ── Parse body ── */
  let body: Payload;
  try {
    body = (await req.json()) as Payload;
  } catch {
    return NextResponse.json(
      { ok: false, sent: 0, failed: 0, skipped: 0, reason: "invalid_json" },
      { status: 400 },
    );
  }
  const eventId = typeof body.eventId === "string" ? body.eventId : "";
  const origin = typeof body.origin === "string" ? body.origin : "";
  if (!eventId || !origin) {
    return NextResponse.json(
      { ok: false, sent: 0, failed: 0, skipped: 0, reason: "missing_fields" },
      { status: 400 },
    );
  }

  /* ── Fetch event + ownership check ── */
  const db = getFirestore(getAdminApp());
  const eventSnap = await db.collection("team_events").doc(eventId).get();
  if (!eventSnap.exists) {
    return NextResponse.json(
      { ok: false, sent: 0, failed: 0, skipped: 0, reason: "event_not_found" },
      { status: 404 },
    );
  }
  const event = { ...(eventSnap.data() as TeamEvent), id: eventSnap.id };
  if (event.ownerId !== verification.uid && verification.role !== "admin") {
    return NextResponse.json(
      { ok: false, sent: 0, failed: 0, skipped: 0, reason: "not_owner" },
      { status: 403 },
    );
  }

  /* ── Resolve team + members ── */
  const teamSnap = await db.collection("team_spaces").doc(event.teamSpaceId).get();
  if (!teamSnap.exists) {
    return NextResponse.json(
      { ok: false, sent: 0, failed: 0, skipped: 0, reason: "team_not_found" },
      { status: 404 },
    );
  }
  const team = teamSnap.data() as TeamSpace;

  const membershipsSnap = await db
    .collection("team_memberships")
    .where("teamSpaceId", "==", event.teamSpaceId)
    .get();
  const memberUids = membershipsSnap.docs.map(
    (d) => (d.data() as TeamMembership).userId,
  );
  /* Owner doesn't need an email about their own event. */
  const recipients = memberUids.filter((uid) => uid !== event.ownerId);
  if (recipients.length === 0) {
    return NextResponse.json({
      ok: true,
      sent: 0,
      failed: 0,
      skipped: 0,
      reason: "no_recipients",
    });
  }

  /* Resolve emails — fetch user docs in parallel. */
  const users = await Promise.all(
    recipients.map(async (uid) => {
      try {
        const us = await db.collection("users").doc(uid).get();
        if (!us.exists) return null;
        const data = us.data() as AccountUser;
        return data.email
          ? { uid, email: data.email, name: data.displayName }
          : null;
      } catch {
        return null;
      }
    }),
  );

  /* ── Render + send ── */
  const start = new Date(event.startAt);
  const whenLine = `${start.toLocaleString("en-PH", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: event.timezone,
  })} (${event.timezone})`;
  const joinUrl = `${origin.replace(/\/$/, "")}/join/event/${event.id}`;

  let sent = 0;
  let failed = 0;
  let skipped = 0;
  for (const u of users) {
    if (!u) {
      skipped += 1;
      continue;
    }
    const { subject, html } = renderEventCreatedEmail({
      teamName: team.name,
      eventTitle: event.title,
      eventDescription: event.description,
      whenLine,
      locationLabel: event.locationLabel,
      joinUrl,
      recipientName: u.name?.split(/\s+/)[0],
    });
    const res = await sendEmail({
      to: u.email,
      subject,
      html,
      category: "event_created",
    });
    if (res.ok) sent += 1;
    else failed += 1;
  }

  return NextResponse.json({ ok: true, sent, failed, skipped });
}
