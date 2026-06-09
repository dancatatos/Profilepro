/**
 * Shared user request verification for API routes.
 *
 * Parallel to verifyAdminRequest but for any signed-in user — the
 * caller proves identity by attaching a Firebase ID token; the route
 * gets back the verified uid + role and can do its own per-resource
 * ownership check.
 *
 * Returns a discriminated union the caller can pattern-match on:
 *   { ok: true, uid, role }       — verified, proceed
 *   { ok: false, status, reason } — return as NextResponse.json with
 *                                    the given HTTP status
 */

import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getAdminApp, isAdminConfigured } from "@/lib/firebase/admin";

export type UserVerification =
  | { ok: true; uid: string; role: string }
  | { ok: false; status: number; reason: string };

export async function verifyUserRequest(
  req: Request,
): Promise<UserVerification> {
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
  /* Read role from the user doc — Firestore rules already use this
     same field, so it's the canonical source of truth. */
  const db = getFirestore(app);
  let role = "user";
  try {
    const snap = await db.collection("users").doc(uid).get();
    const data = snap.data() as { role?: string } | undefined;
    if (data?.role) role = data.role;
  } catch {
    // ignore — fall back to "user"
  }
  return { ok: true, uid, role };
}
