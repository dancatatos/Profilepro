/**
 * GET /e/c/{sendId}?u={url} — email click redirect.
 *
 * Every link in an automated email routes through here: stamp
 * clickedAt on the send record (first click only), then 302 to the
 * real destination.
 *
 * Open-redirect guard: the redirect only follows `u` when the send
 * record actually exists — a fabricated sendId gets bounced to the
 * homepage instead of wherever the crafted URL pointed.
 */

import { NextResponse } from "next/server";
import { getAdminDb, isAdminConfigured } from "@/lib/firebase/admin";

export const dynamic = "force-dynamic";

const HOME = () =>
  (process.env.NEXT_PUBLIC_APP_URL || "https://www.crediblyai.com").replace(
    /\/$/,
    "",
  );

export async function GET(
  req: Request,
  { params }: { params: Promise<{ sendId: string }> },
): Promise<NextResponse> {
  const { sendId } = await params;
  const raw = new URL(req.url).searchParams.get("u") ?? "";

  let target: URL | null = null;
  try {
    const parsed = new URL(raw);
    if (parsed.protocol === "http:" || parsed.protocol === "https:") {
      target = parsed;
    }
  } catch {
    /* invalid URL — fall through to homepage */
  }

  let known = false;
  if (isAdminConfigured() && sendId) {
    try {
      const db = getAdminDb();
      const ref = db.collection("automation_sends").doc(sendId);
      const snap = await ref.get();
      if (snap.exists) {
        known = true;
        if (!snap.data()?.clickedAt) {
          await ref.update({ clickedAt: Date.now() });
        }
      }
    } catch {
      /* tracking failure should not strand the visitor */
    }
  }

  return NextResponse.redirect(
    known && target ? target.toString() : HOME(),
    302,
  );
}
