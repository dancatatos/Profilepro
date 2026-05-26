/**
 * Affiliate invite email — auto-send endpoint.
 *
 * Called by /admin/affiliates after createAffiliateInvite succeeds.
 * Fetches the invite by token via Firebase Admin SDK and emails the
 * invited person their accept link. The admin still sees the
 * copyable link in the success modal as a backup (in case the
 * affiliate's inbox filters the email).
 */

import { NextResponse } from "next/server";
import { getAdminApp } from "@/lib/firebase/admin";
import { getFirestore } from "firebase-admin/firestore";
import { verifyAdminRequest } from "@/lib/auth/verifyAdmin";
import { isEmailConfigured } from "@/lib/email/client";
import { sendEmail } from "@/lib/email/send";
import { renderInviteEmail } from "@/lib/email/templates/invite";
import type { AffiliateInvite } from "@/types";

interface Payload {
  token?: unknown;
  acceptUrl?: unknown;
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

  const token = typeof body.token === "string" ? body.token : "";
  /* Caller supplies acceptUrl built from window.location.origin to avoid
     relying on NEXT_PUBLIC_APP_URL on the server (which may be stale). */
  const acceptUrl = typeof body.acceptUrl === "string" ? body.acceptUrl : "";

  if (!token) {
    return NextResponse.json(
      { ok: false, reason: "missing_token" },
      { status: 400 },
    );
  }

  const db = getFirestore(getAdminApp());
  const inviteDoc = await db.collection("affiliate_invites").doc(token).get();
  if (!inviteDoc.exists) {
    return NextResponse.json(
      { ok: false, reason: "invite_not_found" },
      { status: 404 },
    );
  }
  const invite = inviteDoc.data() as AffiliateInvite;
  if (invite.status !== "pending") {
    return NextResponse.json(
      { ok: false, reason: "invite_already_used" },
      { status: 409 },
    );
  }

  /* Days remaining until expiry — clamped at 1 minimum for the email copy. */
  const expiresAt = invite.expiresAt ?? Date.now() + 14 * 24 * 60 * 60 * 1000;
  const daysLeft = Math.max(
    1,
    Math.ceil((expiresAt - Date.now()) / (24 * 60 * 60 * 1000)),
  );

  const finalAcceptUrl =
    acceptUrl ||
    `https://www.crediblyai.com/affiliate/accept?token=${encodeURIComponent(token)}`;

  const { subject, html } = renderInviteEmail({
    inviteeName: invite.displayName,
    affiliateCode: invite.code,
    acceptUrl: finalAcceptUrl,
    expiresInDays: daysLeft,
  });
  const result = await sendEmail({
    to: invite.email,
    subject,
    html,
    category: "affiliate_invite",
  });
  if (!result.ok) {
    return NextResponse.json(result, { status: 500 });
  }
  return NextResponse.json({ ok: true, id: result.id });
}
