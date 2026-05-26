/**
 * Admin "Run cron now" endpoint.
 *
 * Lets an authenticated admin trigger the renewal-reminder cron job
 * manually from /admin/email — useful for testing before the daily
 * schedule fires (and for "I want to send reminders today, not
 * tomorrow morning" cases).
 *
 * Auth: verifies the caller has a valid Firebase ID token AND that
 * the corresponding user doc has `role: "admin"`. Without that, the
 * endpoint returns 401/403. Uses Firebase Admin SDK for verification
 * so the same trust boundary as Firestore rules applies.
 *
 * Implementation: re-uses the cron route's GET handler by forwarding
 * the call internally with the right Authorization header — keeps
 * the email-sending logic single-sourced.
 */

import { NextResponse } from "next/server";
import { getAdminApp, isAdminConfigured } from "@/lib/firebase/admin";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

export async function POST(req: Request) {
  if (!isAdminConfigured()) {
    return NextResponse.json(
      { ok: false, reason: "firebase_admin_not_configured" },
      { status: 503 },
    );
  }

  /* Step 1 — verify ID token from the Authorization header. */
  const authHeader = req.headers.get("authorization") ?? "";
  const idToken = authHeader.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length)
    : "";
  if (!idToken) {
    return NextResponse.json(
      { ok: false, reason: "missing_id_token" },
      { status: 401 },
    );
  }

  const app = getAdminApp();
  let uid: string;
  try {
    const decoded = await getAuth(app).verifyIdToken(idToken);
    uid = decoded.uid;
  } catch {
    return NextResponse.json(
      { ok: false, reason: "invalid_id_token" },
      { status: 401 },
    );
  }

  /* Step 2 — confirm the caller is actually an admin in Firestore. */
  const db = getFirestore(app);
  const userDoc = await db.collection("users").doc(uid).get();
  const role = (userDoc.data() as { role?: string } | undefined)?.role;
  if (role !== "admin") {
    return NextResponse.json(
      { ok: false, reason: "not_admin" },
      { status: 403 },
    );
  }

  /* Step 3 — invoke the cron route internally so we don't duplicate
     the logic. Use the public URL + the cron secret it expects. */
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json(
      { ok: false, reason: "cron_secret_not_set" },
      { status: 503 },
    );
  }

  /* Determine the base URL — Vercel sets VERCEL_URL automatically,
     but it lacks the protocol and references the preview URL, not the
     production domain. Prefer NEXT_PUBLIC_APP_URL when present, fall
     back to the request's own origin. */
  const origin =
    process.env.NEXT_PUBLIC_APP_URL ||
    `https://${process.env.VERCEL_URL || new URL(req.url).host}`;

  const cronUrl = `${origin}/api/cron/renewal-reminders`;
  const cronRes = await fetch(cronUrl, {
    method: "GET",
    headers: { Authorization: `Bearer ${cronSecret}` },
    cache: "no-store",
  });

  const data = await cronRes.json().catch(() => ({}));
  return NextResponse.json({ ok: cronRes.ok, result: data }, {
    status: cronRes.status,
  });
}
