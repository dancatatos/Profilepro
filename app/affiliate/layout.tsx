"use client";

import type { ReactNode } from "react";

/**
 * Minimal layout for affiliate-facing routes. The accept page and
 * (later) login page render outside of any dashboard shell — once the
 * affiliate dashboard is built in Step 4 it will live under a richer
 * layout (its own sidebar, sign-out, etc.).
 *
 * Kept deliberately plain right now so the accept flow is uncluttered.
 */
export default function AffiliateLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-ink-950 text-white">{children}</div>
  );
}
