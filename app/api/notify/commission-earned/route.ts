/**
 * Commission-earned notification endpoint.
 *
 * Called by the admin client immediately after a paid-plan upgrade
 * that successfully created a commission. The client passes the
 * commission's display-relevant fields inline — the admin is already
 * trusted (verified by Firebase ID token + role check), and using
 * inline payload saves an extra Firestore read.
 */

import { NextResponse } from "next/server";
import { verifyAdminRequest } from "@/lib/auth/verifyAdmin";
import { isEmailConfigured } from "@/lib/email/client";
import { sendEmail } from "@/lib/email/send";
import { renderCommissionEarnedEmail } from "@/lib/email/templates/commissionEarned";
import { isValidEmail } from "@/lib/utils";

interface Payload {
  affiliateEmail?: unknown;
  affiliateName?: unknown;
  customerName?: unknown;
  planName?: unknown;
  amount?: unknown;
  type?: unknown;
}

function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}

export async function POST(req: Request) {
  const verification = await verifyAdminRequest(req);
  if (!verification.ok) {
    return NextResponse.json(
      { ok: false, reason: verification.reason },
      { status: verification.status },
    );
  }
  if (!isEmailConfigured()) {
    return NextResponse.json(
      { ok: false, reason: "email_not_configured" },
      { status: 503 },
    );
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

  const affiliateEmail = str(body.affiliateEmail).trim();
  const affiliateName = str(body.affiliateName).trim() || "there";
  const customerName = str(body.customerName).trim() || "Customer";
  const planName = str(body.planName).trim() || "Plan";
  const amount = typeof body.amount === "number" ? body.amount : 0;
  const rawType = str(body.type);
  const type: "signup" | "renewal" | "adjustment" =
    rawType === "renewal" || rawType === "adjustment" ? rawType : "signup";

  if (!isValidEmail(affiliateEmail)) {
    return NextResponse.json(
      { ok: false, reason: "invalid_email" },
      { status: 400 },
    );
  }
  if (amount <= 0) {
    return NextResponse.json(
      { ok: false, reason: "no_amount" },
      { status: 400 },
    );
  }

  const { subject, html } = renderCommissionEarnedEmail({
    affiliateFirstName: affiliateName.split(" ")[0] || "there",
    customerName,
    planName,
    amount,
    type,
  });
  const result = await sendEmail({
    to: affiliateEmail,
    subject,
    html,
    category: `commission_${type}`,
  });
  if (!result.ok) {
    return NextResponse.json(result, { status: 500 });
  }
  return NextResponse.json({ ok: true, id: result.id });
}
