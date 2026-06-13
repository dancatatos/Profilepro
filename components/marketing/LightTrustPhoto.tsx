/**
 * LightTrustPhoto — "Made in PH for PH" trust section.
 *
 * Real photo fills 65% of the section width on the left, glass-
 * morphism card floats on the right edge with overlap. Photo +
 * alt are admin-editable from /admin/marketing → trust photo field.
 *
 * The humanity moment of the page: every other section is
 * illustrated mockups, and visitors need to be reminded there's
 * actual humans behind this product. A real face does that better
 * than any feature card can.
 */

import Link from "next/link";
import { ArrowRight, Lock, MessageCircle, Wallet } from "lucide-react";

const POINTS = [
  {
    icon: Wallet,
    label: "Native GCash, Maya, BPI & bank receipt acceptance",
  },
  {
    icon: Lock,
    label: "DPA-compliant, hosted on Google Firebase",
  },
  {
    icon: MessageCircle,
    label: "Native Taglish AI built for the Filipino market",
  },
];

const FALLBACK_PHOTO =
  "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=1200&q=80";

export function LightTrustPhoto({
  photoUrl,
  photoAlt,
}: {
  photoUrl?: string;
  photoAlt?: string;
}) {
  const src = photoUrl?.trim() || FALLBACK_PHOTO;
  const alt =
    photoAlt?.trim() || "Filipino founder using Credibly on their phone";

  return (
    <section className="relative bg-white py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4">
        <div className="relative overflow-hidden rounded-[2rem] border border-stone-100">
          <div className="grid items-stretch md:grid-cols-[1.3fr_1fr]">
            {/* Photo — full bleed on the left */}
            <div className="relative aspect-[4/3] md:aspect-auto md:min-h-[480px]">
              <img
                src={src}
                alt={alt}
                className="absolute inset-0 h-full w-full object-cover"
                loading="lazy"
                decoding="async"
              />
              {/* Soft gradient over the right edge of the photo so
                  the floating card has higher contrast against it
                  without darkening the whole image. */}
              <div
                aria-hidden
                className="absolute inset-0 hidden md:block"
                style={{
                  background:
                    "linear-gradient(90deg, transparent 0%, transparent 50%, rgba(255,255,255,0.6) 100%)",
                }}
              />
            </div>

            {/* Floating glassmorphism card on the right */}
            <div className="relative flex items-center bg-cream-50 p-8 md:p-10">
              <div className="relative w-full">
                <span className="inline-block rounded-full bg-cream-200 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-cream-700">
                  Built in Manila 🇵🇭
                </span>
                <h2 className="mt-4 font-display text-3xl font-bold leading-[1.1] tracking-tight text-stone-900 sm:text-4xl">
                  For Filipino recruiters, by people who live here.
                </h2>
                <p className="mt-4 max-w-md text-base leading-relaxed text-stone-500">
                  Not a US tool bolted on. Built ground-up for how PH
                  network marketing actually works.
                </p>
                <ul className="mt-7 space-y-3.5">
                  {POINTS.map((p) => (
                    <li
                      key={p.label}
                      className="flex items-start gap-3 text-sm text-stone-700"
                    >
                      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white shadow-[var(--shadow-card-soft)]">
                        <p.icon className="h-3.5 w-3.5 text-electric-500" />
                      </span>
                      <span className="leading-relaxed pt-1">{p.label}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href="/signup"
                  className="mt-7 inline-flex items-center gap-1.5 rounded-full bg-electric-500 px-5 py-3 text-sm font-semibold text-white shadow-[var(--shadow-pill-cta)] transition-transform hover:scale-[1.02] active:scale-[0.98]"
                >
                  Talk to the founder
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
