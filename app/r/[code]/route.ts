/**
 * Affiliate referral redirect — `crediblyai.com/r/<code>`.
 *
 * When an affiliate shares their link, the visitor hits this route. We:
 *   1. Normalise the code (uppercase, alphanumeric + dash/underscore only)
 *   2. Drop a `cred_ref` cookie with a 30-day expiry
 *   3. Optionally drop a `cred_ref_plan` cookie if `?plan=foo` is provided
 *      (lets affiliates link straight to a specific plan)
 *   4. 302 redirect to the homepage (or `?to=/billing` if they specified)
 *
 * Implemented as a Route Handler (not a page) so the cookie + redirect
 * happen entirely server-side — no flash, no client JS required, no
 * Firebase imports loaded for what is effectively a redirect.
 *
 * Click logging deliberately lives elsewhere — Step 3 wires that into the
 * affiliate dashboard via a client-side ping after the redirect lands.
 * The cookie + future signup attribution are what actually drive
 * commission, so click tracking is best-effort, not critical-path.
 */

import { NextResponse, type NextRequest } from "next/server";
import {
  REF_COOKIE_MAX_AGE_SECONDS,
  REF_COOKIE_NAME,
  REF_PLAN_COOKIE_NAME,
  normalizeRefCode,
} from "@/lib/referral";

/** Whitelist of internal destinations we'll honour for the `?to=` param. */
const SAFE_REDIRECT_PREFIXES = ["/", "/signup", "/login", "/billing"];

function safeDestination(raw: string | null): string {
  if (!raw) return "/";
  // Only allow same-origin paths (no absolute URLs, no schemes).
  if (!raw.startsWith("/") || raw.startsWith("//")) return "/";
  // Restrict to a small allowlist of expected entry points.
  if (!SAFE_REDIRECT_PREFIXES.some((p) => raw === p || raw.startsWith(`${p}?`)))
    return "/";
  return raw;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code: rawCode } = await params;
  const code = normalizeRefCode(rawCode);
  const url = new URL(req.url);
  const planHint = url.searchParams.get("plan");
  const dest = safeDestination(url.searchParams.get("to"));

  /* Always redirect, even if the code is malformed — that way an invalid
     link still lands the visitor somewhere useful instead of a 404. */
  const target = new URL(dest, url.origin);
  const res = NextResponse.redirect(target, 302);

  if (code) {
    res.cookies.set(REF_COOKIE_NAME, code, {
      path: "/",
      maxAge: REF_COOKIE_MAX_AGE_SECONDS,
      sameSite: "lax",
      // `secure` is automatically true in production via Next's defaults.
    });
    if (planHint) {
      res.cookies.set(
        REF_PLAN_COOKIE_NAME,
        normalizeRefCode(planHint),
        {
          path: "/",
          maxAge: REF_COOKIE_MAX_AGE_SECONDS,
          sameSite: "lax",
        },
      );
    }
  }

  return res;
}
