"use client";

/**
 * PhoneEmbed — renders an external Credibly URL inside a phone frame
 * via a sandboxed, scaled iframe. Used by the homepage deep-dive
 * sections as a "live screenshot" of a real funnel or training so
 * visitors see actual product output instead of a hand-drawn mockup.
 *
 * Behaviour notes:
 *   - Lazy-mounts via IntersectionObserver. The iframe doesn't render
 *     until the user scrolls within 200px of it, so we don't tank the
 *     homepage LCP / network on first paint.
 *   - Scaled to 60% so a full mobile width (~390px) fits comfortably
 *     inside the 280px phone bezel without horizontal scroll inside
 *     the embed.
 *   - sandbox="allow-scripts allow-popups" (no allow-same-origin) —
 *     the embed can't touch the parent page's cookies, localStorage,
 *     or DOM. Safe to embed anything the admin pastes.
 *   - Pointer events disabled — this is a marketing showcase, not an
 *     interactive demo. Prevents the visitor accidentally interacting
 *     with the embedded funnel.
 *   - When `url` is empty, renders a soft placeholder card so the
 *     section never breaks during admin setup.
 */

import { useEffect, useRef, useState } from "react";

export function PhoneEmbed({
  url,
  label,
}: {
  url?: string;
  /** Used as the iframe title for a11y + the placeholder copy. */
  label: string;
}) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!url) return;
    const node = wrapRef.current;
    if (!node) return;
    if (
      typeof IntersectionObserver === "undefined" ||
      typeof window === "undefined"
    ) {
      setVisible(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setVisible(true);
            io.disconnect();
            break;
          }
        }
      },
      { rootMargin: "200px" },
    );
    io.observe(node);
    return () => io.disconnect();
  }, [url]);

  if (!url) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-2 px-4 text-center">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-white/40">
          {label}
        </span>
        <p className="text-xs text-white/35">
          Paste a Credibly URL from /admin/marketing to preview it here.
        </p>
      </div>
    );
  }

  /* The inner box is 167% (= 1 / 0.6) of its container so when we
     scale to 60% the rendered embed visually fills 100% of the phone
     screen. Without the inverse-scale wrapper a scaled iframe leaves
     blank gutters on the right + bottom. */
  return (
    <div ref={wrapRef} className="relative h-full w-full overflow-hidden">
      {visible && (
        <iframe
          src={url}
          title={label}
          loading="lazy"
          sandbox="allow-scripts allow-popups allow-forms"
          referrerPolicy="no-referrer"
          className="pointer-events-none absolute left-0 top-0 origin-top-left border-0"
          style={{
            width: "167%",
            height: "167%",
            transform: "scale(0.6)",
            background: "var(--color-ink-950, #0b0d12)",
          }}
        />
      )}
    </div>
  );
}
