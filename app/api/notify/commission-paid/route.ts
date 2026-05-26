/**
 * Commission-paid notification endpoint.
 *
 * Called by the admin client after marking one OR many commissions as
 * paid. Accepts a list of commission IDs, looks them up via Firebase
 * Admin SDK to confirm they're really paid (defence against client
 * spoofing a "paid" claim that didn't actually happen), groups by
 * affiliate, and sends ONE summary email per affiliate.
 *
 * Each affiliate gets the table of commissions that were just paid out
 * plus the grand total — no spammy per-row emails.
 */

import { NextResponse } from "next/server";
import { getAdminApp } from "@/lib/firebase/admin";
import { getFirestore } from "firebase-admin/firestore";
import { verifyAdminRequest } from "@/lib/auth/verifyAdmin";
import { isEmailConfigured } from "@/lib/email/client";
import { sendEmail } from "@/lib/email/send";
import { renderCommissionPaidEmail } from "@/lib/email/templates/commissionPaid";
import type { Affiliate, Commission } from "@/types";

interface Payload {
  commissionIds?: unknown;
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

  const ids = Array.isArray(body.commissionIds)
    ? body.commissionIds.filter((v): v is string => typeof v === "string")
    : [];
  if (ids.length === 0) {
    return NextResponse.json(
      { ok: false, reason: "no_ids" },
      { status: 400 },
    );
  }

  /* Load all commissions in parallel — Firebase Admin SDK lets us
     batch-read by doc ref without the 10-id `in` query limitation. */
  const db = getFirestore(getAdminApp());
  const commissionDocs = await Promise.all(
    ids.map((id) => db.collection("commissions").doc(id).get()),
  );
  const commissions: Commission[] = commissionDocs
    .map((d) => (d.exists ? (d.data() as Commission) : null))
    .filter((c): c is Commission => !!c && c.status === "paid");

  if (commissions.length === 0) {
    return NextResponse.json(
      { ok: true, emailsSent: 0, reason: "no_paid_commissions_found" },
    );
  }

  /* Group commissions by affiliate. */
  const grouped = new Map<string, Commission[]>();
  for (const c of commissions) {
    const list = grouped.get(c.affiliateId) ?? [];
    list.push(c);
    grouped.set(c.affiliateId, list);
  }

  /* For each affiliate, fetch their profile + send one summary email. */
  let emailsSent = 0;
  let emailsFailed = 0;
  for (const [affiliateUid, items] of grouped.entries()) {
    const affDoc = await db.collection("affiliates").doc(affiliateUid).get();
    if (!affDoc.exists) {
      emailsFailed += 1;
      continue;
    }
    const affiliate = affDoc.data() as Affiliate;
    if (!affiliate.email) {
      emailsFailed += 1;
      continue;
    }

    const totalAmount = items.reduce((sum, c) => sum + c.amount, 0);
    const { subject, html } = renderCommissionPaidEmail({
      affiliateFirstName: affiliate.displayName.split(" ")[0] || "there",
      lines: items.map((c) => ({
        customerName: c.userDisplayName,
        planName: c.planName,
        amount: c.amount,
      })),
      totalAmount,
      payoutMethod: affiliate.payout?.type,
    });
    const result = await sendEmail({
      to: affiliate.email,
      subject,
      html,
      category: "commission_paid",
    });
    if (result.ok) {
      emailsSent += 1;
    } else {
      emailsFailed += 1;
    }
  }

  return NextResponse.json({ ok: true, emailsSent, emailsFailed });
}
