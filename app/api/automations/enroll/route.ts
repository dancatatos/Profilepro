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
  enrollStageEntered,
} from "@/lib/automation/engine";

interface Payload {
  leadId?: unknown;
  /** Bulk stage pings (event "stage") — capped server-side. */
  leadIds?: unknown;
  bookingId?: unknown;
  ownerId?: unknown;
  /** Funnel/profile pipeline override — validated server-side. */
  pipelineId?: unknown;
  /**
   * "stage" = the lead's stage changed (Kanban drag, bulk add) — run
   * ONLY stage_entered automations, never lead_captured: an old lead
   * being dragged around the board must not get a welcome email.
   * Absent = a new lead/booking — the full treatment.
   */
  event?: unknown;
}

const MAX_BULK = 100;

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
  const isStageEvent = body.event === "stage";
  const leadIds = Array.isArray(body.leadIds)
    ? (body.leadIds.filter((x) => typeof x === "string") as string[]).slice(
        0,
        MAX_BULK,
      )
    : [];

  try {
    /* ── Stage-change pings — stage_entered automations only ── */
    if (isStageEvent) {
      const ids = leadId ? [leadId] : leadIds;
      if (ids.length === 0) {
        return NextResponse.json(
          { ok: false, reason: "missing_fields" },
          { status: 400 },
        );
      }
      if (!isEmailConfigured()) {
        return NextResponse.json({ ok: true, enrolled: 0, sent: 0 });
      }
      let enrolled = 0;
      let sent = 0;
      for (const id of ids) {
        const r = await enrollStageEntered(id, ownerId || undefined);
        enrolled += r.enrolled;
        sent += r.sent;
      }
      return NextResponse.json({ ok: true, enrolled, sent });
    }

    /* ── New lead / booking — the full treatment ── */
    if ((!leadId && !bookingId) || !ownerId) {
      return NextResponse.json(
        { ok: false, reason: "missing_fields" },
        { status: 400 },
      );
    }

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
    if (leadId) {
      /* lead_captured automations + stage_entered for whatever stage
         the routing just landed them in. Both dedup internally. */
      const captured = await enrollLead(leadId, ownerId);
      const staged = await enrollStageEntered(leadId, ownerId);
      return NextResponse.json({
        ok: true,
        pipelined,
        enrolled: captured.enrolled + staged.enrolled,
        sent: captured.sent + staged.sent,
      });
    }
    const result = await enrollBooking(bookingId, ownerId);
    return NextResponse.json({ ok: true, pipelined, ...result });
  } catch (err) {
    console.error("[Credibly] automation enroll failed:", err);
    return NextResponse.json(
      { ok: false, reason: "enroll_failed" },
      { status: 500 },
    );
  }
}
