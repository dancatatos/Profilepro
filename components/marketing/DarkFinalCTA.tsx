/**
 * DarkFinalCTA — the bookend.
 *
 * Deliberately dark to:
 *   1. Create dramatic contrast after 8+ light sections
 *   2. Signal "this is the moment to convert"
 *   3. Smooth-transition into the dark footer below
 *
 * Subtle radial gradient (navy → ink-950) gives depth without
 * needing animation. A constellation of stars in the top hints
 * at the "credibility" theme without spelling it out.
 */

import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";

export function DarkFinalCTA({
  title,
  subtitle,
  primaryCta,
  secondaryCta,
}: {
  title: string;
  subtitle: string;
  primaryCta: string;
  secondaryCta: string;
}) {
  return (
    <section
      className="relative overflow-hidden py-24 sm:py-32"
      style={{
        background:
          "radial-gradient(ellipse at center top, #1a1a3a 0%, #0a0a0f 60%)",
      }}
    >
      {/* Constellation — subtle dots above the headline. Echoes
          the "credibility" theme without literal-mindedness. */}
      <div
        aria-hidden
        className="absolute inset-x-0 top-12 mx-auto flex max-w-md justify-center gap-3 opacity-50"
      >
        {[2, 3, 1, 4, 2, 3, 1].map((s, i) => (
          <span
            key={i}
            className="rounded-full bg-electric-400"
            style={{ width: `${s}px`, height: `${s}px` }}
          />
        ))}
      </div>

      <div className="relative mx-auto max-w-3xl px-4 text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-electric-500/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-electric-400">
          <Sparkles className="h-3 w-3" />
          Free to start
        </span>
        <h2 className="mt-5 font-display text-4xl font-bold leading-[1.05] tracking-tight text-white sm:text-5xl lg:text-6xl">
          {title}
        </h2>
        <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-stone-300 sm:text-lg">
          {subtitle}
        </p>

        <div className="mt-9 flex flex-wrap justify-center gap-3">
          <Link
            href="/signup"
            className="group inline-flex items-center gap-2 rounded-full bg-electric-500 px-8 py-4 text-base font-semibold text-white shadow-[var(--shadow-pill-cta)] transition-transform hover:scale-[1.03] active:scale-[0.98] sm:text-lg"
          >
            {primaryCta}
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
          <Link
            href="/demo"
            className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-8 py-4 text-base font-semibold text-white backdrop-blur transition-colors hover:bg-white/10 sm:text-lg"
          >
            {secondaryCta}
          </Link>
        </div>

        <p className="mt-6 text-xs text-stone-500">
          No credit card required · Setup in 3 minutes
        </p>
      </div>
    </section>
  );
}
