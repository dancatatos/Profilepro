/**
 * Affiliate code + invite token generators.
 *
 * Affiliate codes are short, memorable, uppercase strings shared via
 * `/r/<code>` URLs. They MUST stay unique across all affiliates — the
 * admin UI calls `isAffiliateCodeAvailable` before committing.
 *
 * Invite tokens are throwaway secrets used once in the magic-link URL
 * (`/affiliate/accept?token=…`) — high entropy, never displayed in any
 * UI after creation.
 */

import { normalizeRefCode } from "./referral";

/**
 * Suggest a memorable referral code from a display name + 3-digit suffix.
 * Examples:
 *   "Dan Catatos"    → "DAN123"
 *   "Maria Santos"   → "MARI456"
 *   "Jose"           → "JOSE789"
 *
 * The caller is expected to verify uniqueness against Firestore and
 * re-roll the suffix if a clash occurs.
 */
export function suggestAffiliateCode(displayName: string): string {
  /* Strip non-letters, take the first word, cap at 4 chars for a name root. */
  const root = (displayName || "")
    .toUpperCase()
    .replace(/[^A-Z]/g, "")
    .slice(0, 4);
  const base = root.length >= 3 ? root : "REF";
  const suffix = Math.floor(100 + Math.random() * 900); // 100-999
  return normalizeRefCode(`${base}${suffix}`);
}

/**
 * Quick code-format validity check. Used by the admin invite form to
 * give immediate feedback before the Firestore round-trip.
 */
export function isValidAffiliateCodeFormat(raw: string): boolean {
  const normalised = normalizeRefCode(raw);
  return normalised.length >= 3 && normalised.length <= 32;
}

/**
 * Cryptographically-secure random token suitable for magic-link URLs.
 * Uses Web Crypto when available (browser + Node 19+), falls back to
 * Math.random for ancient runtimes (never used in production).
 * Returns 32 hex chars = 128 bits of entropy.
 */
export function generateInviteToken(): string {
  const bytes = new Uint8Array(16);
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.getRandomValues === "function"
  ) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i += 1) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Standard invite lifetime (14 days). */
export const INVITE_EXPIRY_MS = 14 * 24 * 60 * 60 * 1000;

/**
 * Build the full accept URL for an invite token. Uses the current
 * browser origin client-side so it always matches the domain the
 * admin is on (no env-var dependency, same trick as the share modal).
 */
export function inviteAcceptUrl(token: string): string {
  const origin =
    typeof window !== "undefined"
      ? window.location.origin
      : (process.env.NEXT_PUBLIC_APP_URL || "https://www.crediblyai.com");
  return `${origin}/affiliate/accept?token=${encodeURIComponent(token)}`;
}

/**
 * Build the full referral share URL for an affiliate code.
 * Used in the admin dashboard "copy referral link" button so admins
 * can grab it without needing to navigate to the affiliate's dashboard.
 */
export function referralShareUrl(code: string): string {
  const origin =
    typeof window !== "undefined"
      ? window.location.origin
      : (process.env.NEXT_PUBLIC_APP_URL || "https://www.crediblyai.com");
  return `${origin}/r/${code}`;
}

/**
 * Privacy-preserving display version of an email — used everywhere an
 * affiliate sees their referred customer's contact info. The first and
 * last characters of the local part are kept, the rest is masked.
 *   "maria.santos@gmail.com" → "m**********s@gmail.com"
 *   "jp@gmail.com"           → "j*@gmail.com"
 *   "a@gmail.com"            → "a*@gmail.com"
 */
export function maskEmail(email: string): string {
  if (!email) return "";
  const [local, domain] = email.split("@");
  if (!domain) return email;
  if (local.length <= 2) return `${local[0] ?? ""}*@${domain}`;
  return `${local[0]}${"*".repeat(Math.max(local.length - 2, 1))}${local.slice(-1)}@${domain}`;
}
