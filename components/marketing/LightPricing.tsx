/**
 * LightPricing — three plans, each in its own pastel background.
 *
 * Per the spec:
 *   Plan 1 (Free) → white card with thin stone border
 *   Plan 2 (Pro)  → cream-100 background, "Most Popular" butter chip
 *   Plan 3 (Team) → lavender-100 background
 *
 * Big monospace price, mint checkmarks on features, filled electric
 * pill CTAs. The pastel differentiation IS the design — it draws
 * the eye to Pro without garish "POPULAR" stickers.
 */

import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { planDisplayFeatures } from "@/lib/features";
import type { Plan } from "@/types";

const PLAN_THEMES = [
  {
    /* Free */
    card: "bg-white border-stone-100",
    title: "text-stone-900",
    price: "text-stone-900",
    cta: "bg-white border border-stone-300 text-stone-900 hover:bg-stone-100",
    badge: null as null | { label: string; cls: string },
  },
  {
    /* Pro — the featured one */
    card: "bg-cream-100 border-cream-200",
    title: "text-stone-900",
    price: "text-stone-900",
    cta:
      "bg-electric-500 text-white shadow-[var(--shadow-pill-cta)] hover:scale-[1.02]",
    badge: {
      label: "MOST POPULAR",
      cls: "bg-butter-100 text-butter-700",
    },
  },
  {
    /* Team */
    card: "bg-lavender-100 border-lavender-200",
    title: "text-stone-900",
    price: "text-stone-900",
    cta:
      "bg-electric-500 text-white shadow-[var(--shadow-pill-cta)] hover:scale-[1.02]",
    badge: null as null | { label: string; cls: string },
  },
] as const;

export function LightPricing({ plans }: { plans: Plan[] }) {
  const visible = plans.filter((p) => p.visibility !== "affiliate").slice(0, 3);
  return (
    <section
      id="pricing"
      className="relative bg-stone-100/40 py-20 sm:py-28"
    >
      <div className="mx-auto max-w-6xl px-4">
        <div className="mx-auto max-w-2xl text-center">
          <span className="inline-block rounded-full bg-electric-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-electric-500">
            Pricing
          </span>
          <h2 className="mt-4 font-display text-3xl font-bold tracking-tight text-stone-900 sm:text-4xl lg:text-[2.75rem]">
            Simple, honest pricing
          </h2>
          <p className="mx-auto mt-4 max-w-md text-base text-stone-500">
            Start free. Upgrade when you&apos;re ready to scale.
          </p>
        </div>

        <div className="mt-14 grid gap-5 lg:grid-cols-3">
          {visible.map((plan, i) => {
            const t = PLAN_THEMES[i] ?? PLAN_THEMES[0];
            return (
              <div
                key={plan.id}
                className={`relative flex flex-col rounded-3xl border p-7 sm:p-8 ${t.card}`}
              >
                {t.badge && (
                  <span
                    className={`absolute -top-3 left-1/2 -translate-x-1/2 rounded-full px-3 py-1 text-[10px] font-bold tracking-wider ${t.badge.cls}`}
                  >
                    {t.badge.label}
                  </span>
                )}
                <h3 className={`font-display text-xl font-bold ${t.title}`}>
                  {plan.name}
                </h3>
                <p className="mt-1 text-sm text-stone-500">{plan.tagline}</p>

                <div className="mt-6 flex items-baseline gap-1">
                  <span
                    className={`font-mono text-5xl font-bold tracking-tight ${t.price}`}
                    style={{ fontFamily: "var(--font-mono)" }}
                  >
                    ₱{plan.price.toLocaleString()}
                  </span>
                  <span className="text-sm font-medium text-stone-500">
                    {plan.billingPeriod === "annual" ? "/yr" : "/mo"}
                  </span>
                </div>

                <Link
                  href="/signup"
                  className={`mt-6 inline-flex items-center justify-center gap-1.5 rounded-full px-5 py-3 text-sm font-semibold transition-all ${t.cta}`}
                >
                  Get {plan.name}
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>

                <ul className="mt-7 space-y-2.5">
                  {planDisplayFeatures(plan).map((f) => (
                    <li
                      key={f.label}
                      className={`flex items-start gap-2.5 text-sm ${
                        f.included ? "text-stone-700" : "text-stone-300"
                      }`}
                    >
                      <span
                        className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full ${
                          f.included ? "bg-mint-100" : "bg-stone-100"
                        }`}
                      >
                        <Check
                          className={`h-2.5 w-2.5 ${
                            f.included ? "text-mint-700" : "text-stone-300"
                          }`}
                          strokeWidth={3}
                        />
                      </span>
                      <span className="leading-snug">{f.label}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
