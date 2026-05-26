/**
 * Shared admin request verification for API routes.
 *
 * Every admin-triggered notification (commission earned, commission
 * paid, invite sent) and the manual cron run go through this helper.
 * Centralising it ensures one consistent trust boundary: a request is
 * only allowed if it carries a valid Firebase ID token AND the
 * corresponding user doc has `role: "admin"`.
 *
 * Returns a discriminated union the caller can pattern-match on:
 *   { ok: true, uid }                — verified, proceed
 *   { ok: false, status, reason }    — return as NextResponse.json
 *                                       with the given HTTP status
 */

import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getAdminApp, isAdminConfigured } from "@/lib/firebase/admin";

export type AdminVerification =
  | { ok: true; uid: string }
  | { ok: false; status: number; reason: string };

export async function verifyAdminRequest(
  req: Request,
): Promise<AdminVerification> {
  if (!isAdminConfigured()) {
    return {
      ok: false,
      status: 503,
      reason: "firebase_admin_not_configured",
    };
  }
  const authHeader = req.headers.get("authorization") ?? "";
  const idToken = authHeader.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length)
    : "";
  if (!idToken) {
    return { ok: false, status: 401, reason: "missing_id_token" };
  }

  const app = getAdminApp();
  let uid: string;
  try {
    const decoded = await getAuth(app).verifyIdToken(idToken);
    uid = decoded.uid;
  } catch {
    return { ok: false, status: 401, reason: "invalid_id_token" };
  }

  const db = getFirestore(app);
  const userDoc = await db.collection("users").doc(uid).get();
  const role = (userDoc.data() as { role?: string } | undefined)?.role;
  if (role !== "admin") {
    return { ok: false, status: 403, reason: "not_admin" };
  }
  return { ok: true, uid };
}
