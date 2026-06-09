/**
 * POST /api/events/notify-canceled — email RSVP'd "going" members
 * when the leader cancels an event.
 *
 * Same shape as notify-created but only targets RSVPs (not the full
 * member list — the cancellation is only news for people who had
 * planned to attend). Best-effort send; failures don't roll back
 * the cancel.
 */

import { NextResponse } from "next/server";
import { getAdminApp, isAdminConfigured } from "@/lib/firebase/admin";
import { getFirestore } from "firebase-admin/firestore";
import { verifyUserRequest } from "@/lib/auth/verifyUser";
import { isEmailConfigured } from "@/lib/email/client";
import { sendEmail } from "@/lib/email/send";
import { renderEventCanceledEmail } from "@/lib/email/templates/teamEvent";
import type {
  AccountUser,
  EventRsvp,
  TeamEvent,
  TeamSpace,
} from "@/types";

interface Payload {
  eventId?: unknown;
  origin?: unknown;
}

interface Result {
  ok: boolean;
  sent: number;
  failed: number;
  reason?: string;
}

export async function POST(req: Request): Promise<NextResponse<Result>> {
  const verification = await verifyUserRequest(req);
  if (!verification.ok) {
    return NextResponse.json(
      { ok: false, sent: 0, failed: 0, reason: verification.reason },
      { status: verification.status },
    );
  }
  if (!isAdminConfigured() || !isEmailConfigured()) {
    return NextResponse.json(
      { ok: false, sent: 0, failed: 0, reason: "not_configured" },
      { status: 503 },
    );
  }

  let body: Payload;
  try {
    body = (await req.json()) as Payload;
  } catch {
    return NextResponse.json(
      { ok: false, sent: 0, failed: 0, reason: "invalid_json" },
      { status: 400 },
    );
  }
  const eventId = typeof body.eventId === "string" ? body.eventId : "";
  const origin = typeof body.origin === "string" ? body.origin : "";
  if (!eventId || !origin) {
    return NextResponse.json(
      { ok: false, sent: 0, failed: 0, reason: "missing_fields" },
      { status: 400 },
    );
  }

  const db = getFirestore(getAdminApp());
  const eventSnap = await db.collection("team_events").doc(eventId).get();
  if (!eventSnap.exists) {
    return NextResponse.json(
      { ok: false, sent: 0, failed: 0, reason: "event_not_found" },
      { status: 404 },
    );
  }
  const event = { ...(eventSnap.data() as TeamEvent), id: eventSnap.id };
  if (event.ownerId !== verification.uid && verification.role !== "admin") {
    return NextResponse.json(
      { ok: false, sent: 0, failed: 0, reason: "not_owner" },
      { status: 403 },
    );
  }

  const teamSnap = await db.collection("team_spaces").doc(event.teamSpaceId).get();
  const team = teamSnap.exists ? (teamSnap.data() as TeamSpace) : null;
  if (!team) {
    return NextResponse.json(
      { ok: false, sent: 0, failed: 0, reason: "team_not_found" },
      { status: 404 },
    );
  }

  /* RSVPs that were planning to attend get the heads-up. */
  const rsvpSnap = await db
    .collection("event_rsvps")
    .where("eventId", "==", event.id)
    .where("status", "==", "going")
    .get();

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
  for (const r of rsvpSnap.docs) {
    const data = r.data() as EventRsvp;
    const us = await db.collection("users").doc(data.userId).get();
    if (!us.exists) continue;
    const user = us.data() as AccountUser;
    if (!user.email) continue;
    const { subject, html } = renderEventCanceledEmail({
      teamName: team.name,
      eventTitle: event.title,
      whenLine,
      locationLabel: event.locationLabel,
      joinUrl,
      recipientName: user.displayName?.split(/\s+/)[0],
    });
    const res = await sendEmail({
      to: user.email,
      subject,
      html,
      category: "event_canceled",
    });
    if (res.ok) sent += 1;
    else failed += 1;
  }
  return NextResponse.json({ ok: true, sent, failed });
}
