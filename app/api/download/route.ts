import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** Hosts we will proxy media from — kept tight to avoid SSRF abuse. */
function isAllowedHost(hostname: string): boolean {
  return (
    hostname === "firebasestorage.googleapis.com" ||
    hostname === "storage.googleapis.com" ||
    hostname.endsWith(".googleusercontent.com")
  );
}

/**
 * Same-origin download proxy.
 *
 * Firebase Storage doesn't send CORS headers that allow our app origin
 * to fetch() its URLs from the browser, so the client-side
 * downloadFromUrl helper got "Failed to fetch" when the member tried
 * to grab the invitation card. The fix is to bounce the request
 * through our own server: server-side fetch isn't subject to CORS,
 * and we re-emit the bytes from a same-origin URL so the browser is
 * happy to read them.
 *
 * Distinct from /api/img — that one is image-only and short-cached
 * for canvas reuse. This one is media-agnostic (images + videos) so
 * it can serve event invitation cards today and downloadable assets
 * tomorrow, without forcing the caller to know what MIME they're
 * fetching.
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
    if (!upstream.ok) {
      return NextResponse.json(
        { error: "Upstream not ok" },
        { status: 502 },
      );
    }
    const contentType =
      upstream.headers.get("content-type") ?? "application/octet-stream";
    /* Allow images + videos through; reject anything else so we don't
       accidentally turn into an open proxy for arbitrary blobs that
       happen to be reachable via the allowed hosts. */
    if (
      !contentType.startsWith("image/") &&
      !contentType.startsWith("video/")
    ) {
      return NextResponse.json(
        { error: "Unsupported media" },
        { status: 415 },
      );
    }
    const body = await upstream.arrayBuffer();
    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        /* No cache — invitation cards may be replaced and we want
           members to get the latest version on next download. */
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return NextResponse.json({ error: "Proxy failed" }, { status: 502 });
  }
}
