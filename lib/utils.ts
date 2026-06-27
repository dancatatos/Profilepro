import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge Tailwind class names safely. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/** Short unique id, safe on server + browser. */
export function uid(prefix = "id"): string {
  const rand =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10);
  return `${prefix}_${rand}`;
}

/** Turn any string into a url-safe username slug. */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 30);
}

/** Compact number formatting: 1234 -> "1.2k". */
export function formatCompact(n: number): string {
  if (n < 1000) return String(n);
  if (n < 1_000_000) return `${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}k`;
  return `${(n / 1_000_000).toFixed(1)}m`;
}

export function formatPercent(n: number): string {
  return `${(n * 100).toFixed(n < 0.1 ? 1 : 0)}%`;
}

/** Initials for avatar fallbacks. */
export function getInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

export function isValidUrl(value: string): boolean {
  try {
    const u = new URL(value);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

/**
 * Returns the URL origin to use when building share/profile links.
 *
 * On the client this is always `window.location.origin` — i.e. whichever
 * domain the user is currently visiting. That way share URLs, QR codes
 * and printable cards always match the current domain, even if the app
 * is served from multiple domains or the canonical domain changes.
 *
 * On the server (SSR) it falls back to the configured NEXT_PUBLIC_APP_URL
 * or a sensible default.
 */
export function getAppOrigin(): string {
  if (typeof window !== "undefined") return window.location.origin;
  return process.env.NEXT_PUBLIC_APP_URL || "https://www.crediblyai.com";
}

/**
 * Normalize a user-typed URL for use as a link `href`.
 *
 * Users almost always type `youtube.com` (no protocol) rather than
 * `https://youtube.com`. Browsers treat protocol-less hrefs as
 * RELATIVE to the current page, so `<a href="youtube.com">` on
 * crediblyai.com/dan navigates to /dan/youtube.com — silently
 * confusing. We prepend `https://` for any bare domain.
 *
 * Preserved as-is:
 *   - empty / falsy → "#"          (no nav, no broken link)
 *   - http:// https:// already absolute
 *   - mailto: tel: sms:            (legit non-web schemes)
 *   - / path                       (legit internal links)
 *
 * Blocked for safety:
 *   - javascript: data: vbscript:  → returns "#" to prevent XSS via
 *                                    user-typed URLs being rendered
 *                                    on public profiles
 */
export function normalizeExternalUrl(raw: string | undefined | null): string {
  const url = (raw ?? "").trim();
  if (!url) return "#";
  /* Block dangerous schemes — same boundary the public profile sandbox
     iframe enforces for embed HTML, applied here for plain anchor hrefs. */
  if (/^(javascript|data|vbscript):/i.test(url)) return "#";
  /* Absolute or scheme-prefixed → leave alone. */
  if (/^(https?:|mailto:|tel:|sms:)/i.test(url)) return url;
  /* Internal app links — let Next.js / the browser resolve relative
     to the site root, not the current page. */
  if (url.startsWith("/")) return url;
  /* Hash-only links (in-page jumps). */
  if (url.startsWith("#")) return url;
  /* Anything else is treated as an external bare URL — prepend https. */
  return `https://${url}`;
}

/** Copy text to the clipboard, returns success. */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/**
 * Force-download a remote file via our same-origin proxy. The plain
 * `<a href download>` attribute is ignored on cross-origin links (true
 * for every Firebase Storage URL), AND a direct cross-origin fetch
 * gets blocked by CORS because Firebase Storage doesn't return the
 * Access-Control-Allow-Origin header for our app domain. So we route
 * through /api/download — server-side fetch is CORS-immune, the
 * response is same-origin, and the anchor download attribute then
 * works as the spec intended.
 *
 * Caller picks the saved filename. Throws on network / proxy failure
 * so the caller can show a toast.
 */
export async function downloadFromUrl(
  url: string,
  filename: string,
): Promise<void> {
  const proxyUrl = `/api/download?url=${encodeURIComponent(url)}`;
  const res = await fetch(proxyUrl);
  if (!res.ok) {
    throw new Error(`Download failed (${res.status})`);
  }
  const blob = await res.blob();
  const blobUrl = URL.createObjectURL(blob);
  try {
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = filename;
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
  } finally {
    URL.revokeObjectURL(blobUrl);
  }
}

/**
 * Pull the file extension off a remote URL (ignoring query string).
 * Returns `fallback` when the URL has no recognisable extension —
 * common for Firebase Storage download URLs with token-only paths.
 */
export function extFromUrl(url: string, fallback = "jpg"): string {
  try {
    const path = new URL(url).pathname;
    const m = path.match(/\.([a-zA-Z0-9]{2,5})$/);
    return m ? m[1].toLowerCase() : fallback;
  } catch {
    return fallback;
  }
}

/** Human readable relative time. */
export function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(ts).toLocaleDateString();
}

/**
 * Human-readable "time until" for a future timestamp. Returns "expired"
 * for past timestamps, "today" / "tomorrow" / "in N days" otherwise, and
 * falls back to a date for things further out than 90 days.
 */
export function timeUntil(ts: number): string {
  const diff = ts - Date.now();
  if (diff <= 0) return "expired";
  const days = Math.ceil(diff / (24 * 60 * 60 * 1000));
  if (days === 1) return "tomorrow";
  if (days <= 1) return "today";
  if (days <= 90) return `in ${days} days`;
  return new Date(ts).toLocaleDateString();
}

/** Days remaining until a future timestamp, clamped to 0 if past. */
export function daysUntil(ts: number): number {
  const diff = ts - Date.now();
  if (diff <= 0) return 0;
  return Math.ceil(diff / (24 * 60 * 60 * 1000));
}

/** Build a YouTube/TikTok/Facebook embeddable URL. */
export function toEmbedUrl(
  provider: "youtube" | "tiktok" | "facebook",
  url: string,
): string {
  if (provider === "youtube") {
    const id =
      url.match(/(?:youtu\.be\/|v=|shorts\/|embed\/)([\w-]{11})/)?.[1] ?? "";
    return id ? `https://www.youtube.com/embed/${id}` : url;
  }
  if (provider === "facebook") {
    return `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(
      url,
    )}&show_text=false`;
  }
  // TikTok embeds are handled by their own blockquote script; return raw url.
  return url;
}

/** Clamp a number between min and max. */
export function clamp(n: number, min: number, max: number): number {
  return Math.min(Math.max(n, min), max);
}

/** Reorder an array item from one index to another (immutably). */
export function reorder<T>(list: T[], from: number, to: number): T[] {
  const next = [...list];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}
