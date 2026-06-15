"use client";

/**
 * Sticky marketing nav pill. Lives at the PAGE root (above the hero)
 * so it can sticky-stick across every section — putting it inside
 * the hero broke sticky positioning because the hero root has
 * overflow-hidden to clip its decorative gradient blobs.
 *
 * Renders the floating white pill with Credibly logo + section
 * anchor links + Log in + Start free CTA.
 */

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { LogoMark } from "@/components/ui/Logo";

interface NavLink {
  href: string;
  label: string;
}

export function MarketingNav({ navLinks }: { navLinks: NavLink[] }) {
  return (
    <div className="sticky top-3 z-50 mx-auto mt-3 max-w-5xl px-4 sm:top-4 sm:mt-6">
      <nav
        className="flex items-center justify-between gap-3 rounded-full border border-stone-100 bg-white/85 py-2 pl-4 pr-2 shadow-[var(--shadow-card-soft)] backdrop-blur-xl sm:pl-6"
        aria-label="Primary"
      >
        <Link href="/" className="flex shrink-0 items-center gap-2">
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
            className="rounded-full px-3 py-2 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-100 sm:px-4"
          >
            Log in
          </Link>
          <Link
            href="/signup"
            className="inline-flex items-center gap-1.5 rounded-full bg-electric-500 px-4 py-2.5 text-sm font-semibold text-white shadow-[var(--shadow-pill-cta)] transition-transform hover:scale-[1.02] active:scale-[0.98] sm:px-5"
          >
            Start free
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </nav>
    </div>
  );
}
