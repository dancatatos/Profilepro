/**
 * POST /api/automations/enroll — fire-and-forget trigger called by the
 * public profile / funnel pages right after a lead is captured.
 *
 * Unauthenticated BY DESIGN: anonymous visitors submit lead forms, so
 * there is no auth context to verify. Safety comes from the engine's
 * server-side checks instead:
 *   - the lead doc must actually exist
 *   - its ownerId must match the posted ownerId
 *   - enrollment is idempotent per (automation, lead)
 * The worst a malicious caller can do is enroll an existing lead into
 * the owner's own published automations — which is exactly what the
 * legitimate flow does anyway.
 */

import { NextResponse } from "next/server";
import { isAdminConfigured } from "@/lib/firebase/admin";
import { isEmailConfigured } from "@/lib/email/client";
import { enrollBooking, enrollLead } from "@/lib/automation/engine";

interface Payload {
  leadId?: unknown;
  bookingId?: unknown;
  ownerId?: unknown;
}

export async function POST(req: Request): Promise<NextResponse> {
  if (!isAdminConfigured() || !isEmailConfigured()) {
    return NextResponse.json({ ok: false, reason: "not_configured" });
  }

  let body: Payload;
  try {
    body = (await req.json()) as Payload;
  } catch {
    return NextResponse.json(
      { ok: false, reason: "invalid_json" },
      { status: 400 },
    );
  }
  const leadId = typeof body.leadId === "string" ? body.leadId : "";
  const bookingId = typeof body.bookingId === "string" ? body.bookingId : "";
  const ownerId = typeof body.ownerId === "string" ? body.ownerId : "";
  if ((!leadId && !bookingId) || !ownerId) {
    return NextResponse.json(
      { ok: false, reason: "missing_fields" },
      { status: 400 },
    );
  }

  try {
    const result = leadId
      ? await enrollLead(leadId, ownerId)
      : await enrollBooking(bookingId, ownerId);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("[Credibly] automation enroll failed:", err);
    return NextResponse.json(
      { ok: false, reason: "enroll_failed" },
      { status: 500 },
    );
  }
}
