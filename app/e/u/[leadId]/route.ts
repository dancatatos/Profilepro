/**
 * GET /e/u/{leadId} — one-click unsubscribe.
 *
 * Marks the lead unsubscribed and cancels every active automation
 * enrollment they have. Responds with a tiny confirmation page — no
 * login, no confirm step, because CAN-SPAM-style opt-out must be a
 * single click.
 */

import { NextResponse } from "next/server";
import { getAdminDb, isAdminConfigured } from "@/lib/firebase/admin";

export const dynamic = "force-dynamic";

function page(title: string, body: string): NextResponse {
  return new NextResponse(
    `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title></head>
<body style="margin:0;display:flex;min-height:100vh;align-items:center;justify-content:center;background:#F6F7FB;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#0A0A10;">
<div style="max-width:420px;padding:40px 32px;background:#fff;border:1px solid #E4E7EE;border-radius:16px;text-align:center;">
<p style="font-size:34px;margin:0 0 12px 0;">✉️</p>
<h1 style="font-size:19px;margin:0 0 8px 0;">${title}</h1>
<p style="font-size:14px;line-height:22px;color:#555866;margin:0;">${body}</p>
</div></body></html>`,
    { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } },
  );
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ leadId: string }> },
): Promise<NextResponse> {
  const { leadId: recordId } = await params;
  /* ?t=b marks a BOOKING recipient (appointment-reminder emails);
     default is a lead. Same one-click outcome either way. */
  const isBooking = new URL(req.url).searchParams.get("t") === "b";
  if (!isAdminConfigured() || !recordId) {
    return page(
      "Something went wrong",
      "We couldn't process the unsubscribe. Reply to the email instead and the sender will remove you manually.",
    );
  }
  try {
    const db = getAdminDb();
    const ref = db
      .collection(isBooking ? "bookings" : "leads")
      .doc(recordId);
    const snap = await ref.get();
    if (snap.exists) {
      await ref.update({ unsubscribed: true });
    }
    /* Record already deleted → nothing left to email; the outcome the
       visitor wanted is already true. Fall through to cancel + page. */

    /* Cancel every active enrollment for this recipient. */
    const active = await db
      .collection("automation_enrollments")
      .where(isBooking ? "bookingId" : "leadId", "==", recordId)
      .where("status", "==", "active")
      .get();
    const now = Date.now();
    await Promise.all(
      active.docs.map((d) =>
        d.ref.update({ status: "canceled", updatedAt: now }),
      ),
    );

    return page(
      "You're unsubscribed",
      "You won't receive any more automated emails from this sender. If this was a mistake, reply to the original email and ask to be re-added.",
    );
  } catch {
    return page(
      "Something went wrong",
      "We couldn't process the unsubscribe. Reply to the email instead and the sender will remove you manually.",
    );
  }
}
