/**
 * Lazy Resend client.
 *
 * Resend is the transactional email service we use to send renewal
 * reminders, commission notifications, invites, etc. The SDK is
 * configured via the `RESEND_API_KEY` env var, which must be set in
 * Vercel (Settings → Environment Variables).
 *
 * We init lazily (on first call) instead of at module load so that:
 *   1. Build-time prerendering doesn't fail when the key isn't present
 *      (e.g. in CI / local dev without a .env.local entry).
 *   2. Pages that never trigger email don't pull the Resend SDK into
 *      their bundle until they actually need it.
 *
 * `isEmailConfigured()` reports whether the API key is set so callers
 * can short-circuit gracefully (e.g. show "Email not configured" on
 * the admin test page).
 */

import { Resend } from "resend";

let cached: Resend | null = null;

/** True when RESEND_API_KEY is present in the environment. */
export function isEmailConfigured(): boolean {
  return !!process.env.RESEND_API_KEY;
}

/**
 * Return the shared Resend instance, or null when the API key is missing.
 * Callers should check the return value and fall back to a no-op rather
 * than crashing — email is a non-critical side effect, the system should
 * keep working even if email is offline.
 */
export function getResendClient(): Resend | null {
  if (cached) return cached;
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  cached = new Resend(apiKey);
  return cached;
}

/**
 * Resolve the From address used for outgoing emails.
 *
 * Reads `EMAIL_FROM` env var (e.g. `Credibly <noreply@crediblyai.com>`).
 * Falls back to Resend's test sender `onboarding@resend.dev` so emails
 * still send before the custom domain is verified — useful during the
 * initial Resend setup window before DNS propagates.
 */
export function getEmailFrom(): string {
  return process.env.EMAIL_FROM || "Credibly <onboarding@resend.dev>";
}
