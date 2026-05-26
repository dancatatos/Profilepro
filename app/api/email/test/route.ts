/**
 * Admin "Send test email" endpoint.
 *
 * Lets the admin verify Resend + DNS + From address are wired
 * correctly without waiting for a real renewal trigger. POST with
 * { to: string, name?: string } — returns { ok: true } on success or
 * { ok: false, reason } on failure.
 *
 * NOTE: this endpoint trusts the caller. The /admin/email admin UI
 * that POSTs to it lives behind the admin layout's role guard, so
 * only admins can reach it via the dashboard. If you ever expose this
 * publicly (e.g. from a webhook), add a server-side admin verification
 * step using Firebase Admin SDK + an ID token.
 */

import { NextResponse } from "next/server";
import { sendEmail } from "@/lib/email/send";
import { isEmailConfigured } from "@/lib/email/client";
import { renderTestEmail } from "@/lib/email/templates/test";
import { isValidEmail } from "@/lib/utils";

export async function POST(req: Request) {
  if (!isEmailConfigured()) {
    return NextResponse.json(
      {
        ok: false,
        reason: "not_configured",
        message:
          "RESEND_API_KEY is not set in the environment. Add it in Vercel → Settings → Environment Variables, then redeploy.",
      },
      { status: 503 },
    );
  }

  let body: { to?: unknown; name?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, reason: "invalid_json" },
      { status: 400 },
    );
  }

  const to = typeof body.to === "string" ? body.to.trim() : "";
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!isValidEmail(to)) {
    return NextResponse.json(
      { ok: false, reason: "invalid_email" },
      { status: 400 },
    );
  }

  const { subject, html } = renderTestEmail(name || "there");
  const result = await sendEmail({
    to,
    subject,
    html,
    category: "test",
  });

  if (!result.ok) {
    return NextResponse.json(result, { status: 500 });
  }
  return NextResponse.json({ ok: true, id: result.id });
}
