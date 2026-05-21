import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** Hosts we will proxy images from — kept tight to avoid SSRF abuse. */
function isAllowedHost(hostname: string): boolean {
  return (
    hostname === "firebasestorage.googleapis.com" ||
    hostname === "storage.googleapis.com" ||
    hostname.endsWith(".googleusercontent.com")
  );
}

/**
 * Same-origin image proxy.
 *
 * The printable business card is drawn on a <canvas>, and the user's
 * avatar lives on Firebase Storage — which doesn't send CORS headers.
 * A direct cross-origin image load therefore "taints" the canvas and
 * breaks PNG/PDF export. Routing the avatar through this same-origin
 * endpoint sidesteps that entirely.
 */
export async function GET(req: NextRequest) {
  const target = req.nextUrl.searchParams.get("url");
  if (!target) {
    return NextResponse.json({ error: "Missing url" }, { status: 400 });
  }

  let parsed: URL;
  try {
    parsed = new URL(target);
  } catch {
    return NextResponse.json({ error: "Invalid url" }, { status: 400 });
  }

  if (parsed.protocol !== "https:" || !isAllowedHost(parsed.hostname)) {
    return NextResponse.json({ error: "Host not allowed" }, { status: 403 });
  }

  try {
    const upstream = await fetch(parsed.toString());
    const contentType = upstream.headers.get("content-type") ?? "";
    if (!upstream.ok || !contentType.startsWith("image/")) {
      return NextResponse.json({ error: "Not an image" }, { status: 502 });
    }
    const body = await upstream.arrayBuffer();
    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=3600",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch {
    return NextResponse.json({ error: "Proxy failed" }, { status: 502 });
  }
}
