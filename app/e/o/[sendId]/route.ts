/**
 * GET /e/o/{sendId} — email open pixel.
 *
 * Embedded as a 1×1 image in every automated email. First load stamps
 * openedAt on the send record; later loads are no-ops. Always returns
 * the pixel (even for unknown ids) so mail clients never show a broken
 * image.
 */

import { NextResponse } from "next/server";
import { getAdminDb, isAdminConfigured } from "@/lib/firebase/admin";

export const dynamic = "force-dynamic";

/* Transparent 1×1 GIF. */
const PIXEL = Buffer.from(
  "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
  "base64",
);

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ sendId: string }> },
): Promise<NextResponse> {
  const { sendId } = await params;
  if (isAdminConfigured() && sendId) {
    try {
      const db = getAdminDb();
      const ref = db.collection("automation_sends").doc(sendId);
      const snap = await ref.get();
      if (snap.exists && !snap.data()?.openedAt) {
        await ref.update({ openedAt: Date.now() });
      }
    } catch {
      /* Tracking must never break the pixel response. */
    }
  }
  return new NextResponse(PIXEL, {
    status: 200,
    headers: {
      "Content-Type": "image/gif",
      "Cache-Control": "no-store, max-age=0",
    },
  });
}
