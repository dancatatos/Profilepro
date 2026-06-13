/**
 * LightFeatures — 6 feature cards in a 3×2 grid with mixed pastel
 * + white backgrounds per the spec rhythm:
 *   Row 1: white-border / lavender / white-border
 *   Row 2: cream / white-border / mint
 *
 * Each card has an icon inside a pastel circle (same hue as parent),
 * bold display headline, body description. Hover lifts the card
 * slightly. No CTA — these are informational.
 */

import type { ComponentType, SVGProps } from "react";

interface Feature {
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  title: string;
  desc: string;
}

const CARD_VARIANTS = [
  {
    bg: "bg-white",
    border: "border-stone-100",
    icon: "bg-stone-100 text-stone-700",
  },
  {
    bg: "bg-lavender-100",
    border: "border-lavender-200",
    icon: "bg-lavender-200 text-lavender-700",
  },
  {
    bg: "bg-white",
    border: "border-stone-100",
    icon: "bg-stone-100 text-stone-700",
  },
  {
    bg: "bg-cream-100",
    border: "border-cream-200",
    icon: "bg-cream-200 text-cream-700",
  },
  {
    bg: "bg-white",
    border: "border-stone-100",
    icon: "bg-stone-100 text-stone-700",
  },
  {
    bg: "bg-mint-100",
    border: "border-mint-200",
    icon: "bg-mint-200 text-mint-700",
  },
] as const;

export function LightFeatures({ features }: { features: Feature[] }) {
  return (
    <section id="features" className="relative bg-white py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4">
        <div className="mx-auto max-w-2xl text-center">
          <span className="inline-block rounded-full bg-mint-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-mint-700">
            What you get
          </span>
          <h2 className="mt-4 font-display text-3xl font-bold tracking-tight text-stone-900 sm:text-4xl lg:text-[2.75rem]">
            Everything you need to look credible
          </h2>
          <p className="mx-auto mt-4 max-w-md text-base text-stone-500">
            Not just a link in bio — a complete credibility operating system
            built for PH recruiters and coaches.
          </p>
        </div>

        <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.slice(0, 6).map((f, i) => {
            const v = CARD_VARIANTS[i % CARD_VARIANTS.length];
            return (
              <div
                key={f.title}
                className={`group rounded-3xl border p-6 transition-all duration-200 hover:-translate-y-1 hover:shadow-[var(--shadow-card-soft)] ${v.bg} ${v.border}`}
              >
                <span
                  className={`flex h-12 w-12 items-center justify-center rounded-full ${v.icon}`}
                >
                  <f.icon className="h-5 w-5" />
                </span>
                <h3 className="mt-5 font-display text-lg font-bold text-stone-900">
                  {f.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-stone-500">
                  {f.desc}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
