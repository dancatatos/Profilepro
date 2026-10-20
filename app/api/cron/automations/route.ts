/**
 * GET /api/cron/automations — resume paused automation enrollments.
 *
 * Runs every 15 minutes (vercel.json). Claims active enrollments whose
 * dueAt has passed — wait nodes that elapsed, and emails that were held
 * for the send window — and continues each until its next stop.
 *
 * Auth via CRON_SECRET bearer token, same as the other crons.
 */

import { NextResponse } from "next/server";
import { isAdminConfigured } from "@/lib/firebase/admin";
import { isEmailConfigured } from "@/lib/email/client";
import { processDue } from "@/lib/automation/engine";

interface CronResult {
  ok: boolean;
  processed: number;
  sent: number;
  reason?: string;
}

const empty = (patch: Partial<CronResult>): CronResult => ({
  ok: false,
  processed: 0,
  sent: 0,
  ...patch,
});

export async function GET(req: Request): Promise<NextResponse<CronResult>> {
  const expectedSecret = process.env.CRON_SECRET;
  if (!expectedSecret) {
    return NextResponse.json(empty({ reason: "cron_secret_not_set" }), {
      status: 503,
    });
  }
  if (req.headers.get("authorization") !== `Bearer ${expectedSecret}`) {
    return NextResponse.json(empty({ reason: "unauthorized" }), {
      status: 401,
    });
  }
  if (!isAdminConfigured()) {
    return NextResponse.json(
      empty({ reason: "firebase_admin_not_configured" }),
      { status: 503 },
    );
  }
  if (!isEmailConfigured()) {
    return NextResponse.json(empty({ reason: "email_not_configured" }), {
      status: 503,
    });
  }

  try {
    const { processed, sent } = await processDue();
    return NextResponse.json({ ok: true, processed, sent });
  } catch (err) {
    console.error("[Credibly] automation cron failed:", err);
    return NextResponse.json(empty({ reason: "cron_failed" }), {
      status: 500,
    });
  }
}
