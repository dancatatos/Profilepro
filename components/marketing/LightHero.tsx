"use client";

/**
 * Light Hero — first section of the new homepage design.
 *
 * Includes its own floating pill nav. Self-contained light island
 * over a `bg-white` parent; the rest of the page (below the fold)
 * stays on its current dark theme until Session 2 redesigns those.
 *
 * Composition mirrors the spec:
 *   - Floating pill nav with backdrop-blur, max-w-5xl, mt-6
 *   - Two-column grid: text left (60%) + phone right (40%)
 *   - Two soft gradient blobs in corners (peach + sky)
 *   - Headline with ONE word wrapped in <MarkerUnderline> for the
 *     hand-drawn marker effect
 *   - Phone tilted -4° on a lavender blob, with a hand-marker
 *     annotation ("real customer ✏") that builds trust
 */

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { Profile } from "@/types";
import { PublicProfileView } from "@/components/public-profile/PublicProfileView";
import { LogoMark } from "@/components/ui/Logo";
import { MarkerUnderline } from "./MarkerUnderline";

interface Hero {
  badge: string;
  headlineLine1: string;
  headlineGradient: string;
  headlineLine2: string;
  subheadline: string;
  primaryCta: string;
  secondaryCta: string;
  audiences: string[];
}

interface NavLink {
  href: string;
  label: string;
}

export function LightHero({
  hero,
  navLinks,
  featuredProfile,
}: {
  hero: Hero;
  navLinks: NavLink[];
  featuredProfile: Profile;
}) {
  return (
    <div className="relative isolate overflow-hidden bg-white">
      {/* ── Decorative gradient blobs ──
          Soft warm + cool corner accents. blur-3xl + low opacity
          keeps them as atmosphere, not content. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -left-32 -top-20 h-[520px] w-[520px] rounded-full opacity-60 blur-[100px]"
        style={{
          background:
            "radial-gradient(circle at center, #FED7AA 0%, #FED7AA00 70%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-32 -top-10 h-[560px] w-[560px] rounded-full opacity-50 blur-[100px]"
        style={{
          background:
            "radial-gradient(circle at center, #BAE6FD 0%, #BAE6FD00 70%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-32 right-1/3 h-[400px] w-[400px] rounded-full opacity-40 blur-[100px]"
        style={{
          background:
            "radial-gradient(circle at center, #BBF7D0 0%, #BBF7D000 70%)",
        }}
      />

      {/* ── Floating pill nav ── */}
      <div className="relative mx-auto mt-6 max-w-5xl px-4">
        <nav
          className="flex items-center justify-between gap-3 rounded-full border border-stone-100 bg-white/85 py-2 pl-6 pr-2 shadow-[var(--shadow-card-soft)] backdrop-blur-xl"
          aria-label="Primary"
        >
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <LogoMark className="h-7 w-7 text-electric-500" />
            <span className="font-display text-base font-bold text-stone-900">
              Credibly
            </span>
          </Link>

          <ul className="hidden items-center gap-7 md:flex">
            {navLinks.map((l) => (
              <li key={l.href}>
                <a
                  href={l.href}
                  className="text-sm font-medium text-stone-700 transition-colors hover:text-stone-900"
                >
                  {l.label}
                </a>
              </li>
            ))}
          </ul>

          <div className="flex items-center gap-1.5">
            <Link
              href="/login"
              className="hidden rounded-full px-4 py-2 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-100 sm:inline-block"
            >
              Log in
            </Link>
            <Link
              href="/signup"
              className="inline-flex items-center gap-1.5 rounded-full bg-electric-500 px-5 py-2.5 text-sm font-semibold text-white shadow-[var(--shadow-pill-cta)] transition-transform hover:scale-[1.02] active:scale-[0.98]"
            >
              Start free
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </nav>
      </div>

      {/* ── Hero content ── */}
      <section className="relative mx-auto max-w-6xl px-4 pb-20 pt-14 lg:pb-32 lg:pt-24">
        <div className="grid items-center gap-12 lg:grid-cols-[1.15fr_0.85fr] lg:gap-8">
          {/* Left column — copy */}
          <div className="relative">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-lavender-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-lavender-700">
              <span aria-hidden>🇵🇭</span>
              {hero.badge}
            </span>

            <h1 className="mt-5 font-display text-[2.5rem] font-bold leading-[1.05] tracking-[-0.025em] text-stone-900 sm:text-[3.2rem] lg:text-[4.25rem]">
              {hero.headlineLine1}{" "}
              <MarkerUnderline>{hero.headlineGradient}</MarkerUnderline>{" "}
              {hero.headlineLine2}
            </h1>

            <p className="mt-6 max-w-lg text-base leading-relaxed text-stone-500 sm:text-lg">
              {hero.subheadline}
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/signup"
                className="group inline-flex items-center gap-2 rounded-full bg-electric-500 px-6 py-3.5 text-sm font-semibold text-white shadow-[var(--shadow-pill-cta)] transition-transform hover:scale-[1.02] active:scale-[0.98] sm:text-base"
              >
                {hero.primaryCta}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <Link
                href="/demo"
                className="inline-flex items-center gap-2 rounded-full border border-stone-300 bg-white px-6 py-3.5 text-sm font-semibold text-stone-900 transition-colors hover:bg-stone-100 sm:text-base"
              >
                {hero.secondaryCta}
              </Link>
            </div>

            <div className="mt-7 flex flex-wrap gap-1.5">
              {hero.audiences.map((a) => (
                <span
                  key={a}
                  className="rounded-full border border-stone-100 bg-white/60 px-3 py-1 text-xs font-medium text-stone-700 backdrop-blur"
                >
                  {a}
                </span>
              ))}
            </div>
          </div>

          {/* Right column — phone mockup */}
          <div className="relative flex items-center justify-center">
            {/* Soft pastel blob behind the phone */}
            <div
              aria-hidden
              className="pointer-events-none absolute h-[480px] w-[480px] rounded-full opacity-70 blur-[80px]"
              style={{
                background:
                  "radial-gradient(circle at 40% 40%, #DDD6FE 0%, #DDD6FE00 70%)",
              }}
            />

            {/* The tilted phone */}
            <div
              className="relative"
              style={{ transform: "rotate(-4deg)" }}
            >
              <div className="relative w-[280px] rounded-[2.6rem] border-[10px] border-stone-900 bg-stone-900 shadow-[var(--shadow-phone)] sm:w-[300px]">
                {/* Tiny notch detail — sells "real phone" */}
                <div
                  aria-hidden
                  className="absolute inset-x-0 top-0 z-10 mx-auto h-5 w-24 rounded-b-2xl bg-stone-900"
                />
                <div className="no-scrollbar h-[600px] overflow-y-auto rounded-[1.9rem] bg-white">
                  <PublicProfileView profile={featuredProfile} />
                </div>
              </div>

              {/* Hand-marker annotation — "real customer ✏" — sits
                  slightly above + to the right of the phone, drawn at
                  an angle. The marker font (Caveat) gives it the
                  feel of someone scribbling a note. */}
              <div
                className="pointer-events-none absolute -top-4 -right-6 z-20 flex items-center gap-1.5 text-stone-700 sm:-top-6 sm:-right-10"
                style={{ transform: "rotate(8deg)" }}
              >
                <span
                  className="font-marker text-2xl text-stone-900 sm:text-3xl"
                  style={{ fontFamily: "var(--font-marker)" }}
                >
                  real customer
                </span>
                {/* Hand-drawn arrow */}
                <svg
                  width="60"
                  height="40"
                  viewBox="0 0 60 40"
                  fill="none"
                  className="-mb-2"
                >
                  <path
                    d="M 5 8 Q 25 0, 45 22 L 35 18 M 45 22 L 39 28"
                    stroke="#1A1A1F"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                  />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
