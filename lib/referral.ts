/**
 * Affiliate referral cookie helpers — client-side only.
 *
 * When someone visits `crediblyai.com/r/<code>`, the route handler at
 * `app/r/[code]/route.ts` drops this cookie before redirecting them to
 * the homepage. The cookie sticks for 30 days. When they later sign up,
 * `ensureAccount` reads it and stamps the affiliate code onto the new
 * user's Firestore doc so every commission this user ever generates is
 * attributed back to the right affiliate.
 *
 * The cookie is NOT HttpOnly because we need to read it from the
 * Firebase auth flow which runs client-side. SameSite=Lax means it
 * survives top-level navigation but not third-party iframes, which is
 * exactly what we want.
 */

/** Cookie name — namespaced to avoid colliding with other apps' refs. */
export const REF_COOKIE_NAME = "cred_ref";
/** Hint cookie storing an optional plan id the affiliate prefers to sell. */
export const REF_PLAN_COOKIE_NAME = "cred_ref_plan";

/** Attribution window — 30 days from first click. */
export const REF_COOKIE_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

/**
 * Read a cookie by name from `document.cookie`. Returns null if missing
 * or if we're not in a browser (SSR).
 */
function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${name}=`));
  if (!match) return null;
  const value = match.slice(name.length + 1);
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

/**
 * Delete a cookie by name client-side. Setting max-age=0 with the same
 * path the cookie was created on is the standard way to clear it.
 */
function clearCookie(name: string) {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=; path=/; max-age=0; SameSite=Lax`;
}

/** Get the currently attributed affiliate code, if any. */
export function getRefCookie(): string | null {
  return readCookie(REF_COOKIE_NAME);
}

/** Get the optional plan-hint cookie set alongside the ref code. */
export function getRefPlanCookie(): string | null {
  return readCookie(REF_PLAN_COOKIE_NAME);
}

/**
 * Clear the ref + plan-hint cookies. Called once after we've successfully
 * attributed an affiliate to a new user doc, so a second signup from the
 * same browser doesn't double-attribute.
 */
export function clearRefCookies() {
  clearCookie(REF_COOKIE_NAME);
  clearCookie(REF_PLAN_COOKIE_NAME);
}

/**
 * Normalise a referral code to a canonical form — uppercase, alphanumeric
 * + dash/underscore only, max 32 chars. Used both when setting the cookie
 * and when reading it back, so junk codes never leak into Firestore.
 */
export function normalizeRefCode(raw: string): string {
  return raw.toUpperCase().replace(/[^A-Z0-9_-]/g, "").slice(0, 32);
}
