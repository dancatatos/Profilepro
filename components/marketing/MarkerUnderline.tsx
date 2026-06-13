/**
 * MarkerUnderline — the signature move on the hero headline.
 *
 * Wraps a word (or phrase) in inline electric-blue text with a
 * hand-drawn SVG marker stroke behind it. The stroke is positioned
 * absolutely UNDER the word, slightly skewed, ending past the right
 * edge — looks like someone marked it up with a real highlighter.
 *
 * Why SVG (not Tailwind's underline): a CSS underline reads as a
 * link or as decoration. The marker shape reads as INTENTION —
 * "the brand specifically points at this word." Different feeling.
 */

import type { ReactNode } from "react";

export function MarkerUnderline({ children }: { children: ReactNode }) {
  return (
    <span className="relative inline-block whitespace-nowrap text-electric-500">
      {children}
      <svg
        aria-hidden
        viewBox="0 0 200 16"
        preserveAspectRatio="none"
        className="absolute -bottom-1 left-0 w-full h-3 sm:-bottom-2 sm:h-4"
      >
        {/* The first path is a thin under-line, the second is a
            wider "highlighter" sweep that sits behind — together
            they read as a deliberate hand-drawn marker, not a
            machine-perfect line. */}
        <path
          d="M 4 9 Q 50 4, 100 8 T 196 7"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          fill="none"
          opacity="0.9"
        />
      </svg>
    </span>
  );
}
