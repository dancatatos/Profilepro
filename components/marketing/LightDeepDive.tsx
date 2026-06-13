/**
 * LightDeepDive — alternating left/right feature spotlight.
 *
 * Text column has: eyebrow chip (pastel) + headline + body + bullet
 * list with mint checkmarks. Phone column has: a soft pastel blob
 * behind a phone-frame containing the passed-in mockup. The dark
 * mockup inside reads as a screenshot of the app — which is honest:
 * the app IS dark.
 *
 * `reverse` flips the columns for the alternating pattern.
 * `blob` picks which pastel sits behind the phone for variety.
 */

import { Check } from "lucide-react";
import type { ReactNode } from "react";

type BlobColor = "lavender" | "mint" | "cream" | "butter";

const BLOB_BG: Record<BlobColor, string> = {
  lavender:
    "radial-gradient(circle at 40% 40%, #DDD6FE 0%, #DDD6FE00 70%)",
  mint: "radial-gradient(circle at 40% 40%, #BBF7D0 0%, #BBF7D000 70%)",
  cream: "radial-gradient(circle at 40% 40%, #FCEFC7 0%, #FCEFC700 70%)",
  butter:
    "radial-gradient(circle at 40% 40%, #FDE68A 0%, #FDE68A00 70%)",
};

const CHIP_BG: Record<BlobColor, string> = {
  lavender: "bg-lavender-100 text-lavender-700",
  mint: "bg-mint-100 text-mint-700",
  cream: "bg-cream-100 text-cream-700",
  butter: "bg-butter-100 text-butter-700",
};

export function LightDeepDive({
  eyebrow,
  title,
  body,
  bullets,
  mockup,
  reverse = false,
  blob = "lavender",
}: {
  eyebrow: string;
  title: string;
  body: string;
  bullets: string[];
  mockup: ReactNode;
  reverse?: boolean;
  blob?: BlobColor;
}) {
  return (
    <section className="relative bg-white py-16 sm:py-24">
      <div className="mx-auto max-w-6xl px-4">
        <div
          className={`grid items-center gap-12 lg:gap-16 ${
            reverse ? "lg:grid-cols-[0.85fr_1.15fr]" : "lg:grid-cols-[1.15fr_0.85fr]"
          }`}
        >
          {/* Text column */}
          <div className={reverse ? "lg:order-2" : ""}>
            <span
              className={`inline-block rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] ${CHIP_BG[blob]}`}
            >
              {eyebrow}
            </span>
            <h2 className="mt-4 font-display text-3xl font-bold leading-[1.1] tracking-tight text-stone-900 sm:text-4xl lg:text-[2.5rem]">
              {title}
            </h2>
            <p className="mt-5 text-base leading-relaxed text-stone-500 sm:text-lg">
              {body}
            </p>
            <ul className="mt-7 space-y-3">
              {bullets.map((b) => (
                <li
                  key={b}
                  className="flex items-start gap-3 text-sm text-stone-700 sm:text-base"
                >
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-mint-100">
                    <Check className="h-3 w-3 text-mint-700" strokeWidth={3} />
                  </span>
                  <span className="leading-relaxed">{b}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Phone / mockup column */}
          <div
            className={`relative flex items-center justify-center ${
              reverse ? "lg:order-1" : ""
            }`}
          >
            {/* Pastel blob behind the phone */}
            <div
              aria-hidden
              className="pointer-events-none absolute h-[400px] w-[400px] rounded-full opacity-70 blur-[80px]"
              style={{ background: BLOB_BG[blob] }}
            />
            {/* Phone frame — same vocabulary as the hero phone so
                the language stays consistent. Dark inside because
                the actual app IS dark; visitors read this as a
                screenshot, not a styling mistake. */}
            <div className="relative w-[260px] rounded-[2.4rem] border-[8px] border-stone-900 bg-stone-900 shadow-[var(--shadow-phone)] sm:w-[280px]">
              <div
                aria-hidden
                className="absolute inset-x-0 top-0 z-10 mx-auto h-4 w-20 rounded-b-2xl bg-stone-900"
              />
              <div className="no-scrollbar h-[540px] overflow-hidden rounded-[1.8rem] bg-ink-950 p-3">
                {mockup}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
