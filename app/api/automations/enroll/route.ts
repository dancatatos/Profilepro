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
import {
  autoEnrollPipeline,
  enrollBooking,
  enrollLead,
} from "@/lib/automation/engine";

interface Payload {
  leadId?: unknown;
  bookingId?: unknown;
  ownerId?: unknown;
  /** Funnel/profile pipeline override — validated server-side. */
  pipelineId?: unknown;
}

export async function POST(req: Request): Promise<NextResponse> {
  if (!isAdminConfigured()) {
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
  const pipelineId =
    typeof body.pipelineId === "string" ? body.pipelineId : undefined;
  if ((!leadId && !bookingId) || !ownerId) {
    return NextResponse.json(
      { ok: false, reason: "missing_fields" },
      { status: 400 },
    );
  }

  try {
    /* 1. Pipeline routing — lands the lead on the owner's Kanban in
       the right pipeline's first stage. Runs BEFORE the automation
       enroll so pipeline-filtered automations see the real
       pipelineId. Works even when email isn't configured. */
    let pipelined = false;
    if (leadId) {
      pipelined = await autoEnrollPipeline(leadId, ownerId, pipelineId);
    }

    /* 2. Email automations — needs Resend. */
    if (!isEmailConfigured()) {
      return NextResponse.json({ ok: true, pipelined, enrolled: 0, sent: 0 });
    }
    const result = leadId
      ? await enrollLead(leadId, ownerId)
      : await enrollBooking(bookingId, ownerId);
    return NextResponse.json({ ok: true, pipelined, ...result });
  } catch (err) {
    console.error("[Credibly] automation enroll failed:", err);
    return NextResponse.json(
      { ok: false, reason: "enroll_failed" },
      { status: 500 },
    );
  }
}
