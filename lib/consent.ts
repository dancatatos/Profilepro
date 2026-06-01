/**
 * Consent bridge — moves the signup-form checkbox state into the
 * account-creation flow.
 *
 * Why this exists: the consent checkbox lives on the signup PAGE,
 * but the user doc is written by `ensureAccount()` in AuthProvider
 * after Firebase Auth completes. Those two run in different render
 * trees and call sites (e.g. Google sign-in goes via a popup that
 * may re-enter the app on a different page), so we can't pass the
 * consent state directly through props.
 *
 * sessionStorage solves it cleanly:
 *   1. Signup page writes consent intent BEFORE triggering signup.
 *   2. AuthProvider runs `ensureAccount()` on the new user.
 *   3. ensureAccount reads + clears the pending consent and stamps
 *      it on the user doc.
 *   4. If sessionStorage has nothing (e.g. signed in via /login),
 *      no consent stamping happens — that's fine, only the first-
 *      time user-doc write needs it.
 *
 * Bumped CURRENT_CONSENT_VERSION whenever the privacy policy or
 * terms change materially. Existing users with an older version
 * get re-prompted in a future banner (not implemented yet).
 */

import type { ConsentRecord } from "@/types";

/** Bump this when Privacy Policy / Terms change materially. */
export const CURRENT_CONSENT_VERSION = "2026-06-01";

const STORAGE_KEY = "credibly:pendingConsent";

/** Save consent intent before signup. Called from the signup page. */
export function recordPendingConsent(marketingOptIn: boolean): void {
  if (typeof window === "undefined") return;
  const payload: ConsentRecord = {
    agreedAt: Date.now(),
    version: CURRENT_CONSENT_VERSION,
    marketingOptIn,
  };
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    /* sessionStorage can throw in restricted contexts (incognito with
       cookies disabled, etc.) — we degrade silently; consent will
       just not be stamped, which is no worse than the pre-feature
       state. */
  }
}

/**
 * Read + delete the pending consent, in one call so it can't be
 * accidentally reused on a second signup. Returns null when no
 * intent is pending (e.g. normal /login flow).
 */
export function consumePendingConsent(): ConsentRecord | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    window.sessionStorage.removeItem(STORAGE_KEY);
    const parsed = JSON.parse(raw) as ConsentRecord;
    /* Light validation — corrupt JSON shouldn't crash signup. */
    if (
      typeof parsed.agreedAt === "number" &&
      typeof parsed.version === "string"
    ) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}
