/**
 * LightTestimonials — asymmetric grid per the spec.
 *
 * One BIG bold-color hero testimonial (butter-100, the warm yellow)
 * that takes up 2 columns + 2 rows, with the customer photo bleeding
 * past the card on the left edge. Surrounding it: a tighter grid
 * of smaller white testimonial cards with 5-star ratings.
 *
 * The 1-big + 6-small asymmetry is the move. Don't make all cards
 * uniform — visual hierarchy comes from the size + color contrast.
 */

import { Star } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { cn } from "@/lib/utils";
import type { MarketingTestimonial } from "@/types";

export function LightTestimonials({
  title,
  subtitle,
  items,
}: {
  title: string;
  subtitle?: string;
  items: MarketingTestimonial[];
}) {
  if (!items || items.length === 0) return null;
  const [hero, ...rest] = items;
  return (
    <section
      className="relative py-20 sm:py-28"
      style={{ background: "linear-gradient(180deg, #fff 0%, #fffdf7 100%)" }}
    >
      <div className="mx-auto max-w-6xl px-4">
        <div className="mx-auto max-w-2xl text-center">
          <span className="inline-block rounded-full bg-butter-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-butter-700">
            Real stories
          </span>
          <h2 className="mt-4 font-display text-3xl font-bold tracking-tight text-stone-900 sm:text-4xl lg:text-[2.75rem]">
            {title}
          </h2>
          {subtitle && (
            <p className="mx-auto mt-4 max-w-md text-base text-stone-500">
              {subtitle}
            </p>
          )}
        </div>

        <div className="mt-14 grid gap-4 lg:grid-cols-3">
          {/* Hero card — spans 2 cols, photo + quote layout */}
          <div className="rounded-3xl border border-butter-200 bg-butter-100 p-6 sm:p-8 lg:col-span-2 lg:row-span-2">
            <div className="flex flex-col items-start gap-6 sm:flex-row">
              {hero.avatarUrl && (
                <img
                  src={hero.avatarUrl}
                  alt={hero.name}
                  className="h-24 w-24 shrink-0 rounded-2xl object-cover sm:h-28 sm:w-28"
                  loading="lazy"
                  decoding="async"
                />
              )}
              <div className="min-w-0 flex-1">
                {hero.rating ? (
                  <div className="mb-3 flex gap-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={cn(
                          "h-4 w-4",
                          i < (hero.rating ?? 0)
                            ? "fill-butter-700 text-butter-700"
                            : "fill-transparent text-stone-300",
                        )}
                      />
                    ))}
                  </div>
                ) : null}
                <p className="font-display text-xl font-medium leading-relaxed text-stone-900 sm:text-2xl">
                  &ldquo;{hero.quote}&rdquo;
                </p>
                <div className="mt-5 border-t border-butter-200 pt-4">
                  <p className="font-display text-base font-bold text-stone-900">
                    {hero.name}
                  </p>
                  {hero.role && (
                    <p className="mt-0.5 text-sm text-stone-700">
                      {hero.role}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Smaller white cards — fill the rest */}
          {rest.slice(0, 6).map((t) => (
            <SmallTestimonialCard key={t.id} t={t} />
          ))}
        </div>
      </div>
    </section>
  );
}

function SmallTestimonialCard({ t }: { t: MarketingTestimonial }) {
  return (
    <div className="flex flex-col rounded-3xl border border-stone-100 bg-white p-5 transition-all hover:shadow-[var(--shadow-card-soft)]">
      {t.rating ? (
        <div className="mb-3 flex gap-0.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star
              key={i}
              className={cn(
                "h-3.5 w-3.5",
                i < (t.rating ?? 0)
                  ? "fill-butter-200 text-butter-700"
                  : "fill-transparent text-stone-300",
              )}
            />
          ))}
        </div>
      ) : null}
      <p className="flex-1 text-sm leading-relaxed text-stone-700">
        &ldquo;{t.quote}&rdquo;
      </p>
      <div className="mt-4 flex items-center gap-3 border-t border-stone-100 pt-4">
        <Avatar name={t.name} src={t.avatarUrl} size={32} />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-stone-900">
            {t.name}
          </p>
          {t.role && (
            <p className="truncate text-xs text-stone-500">{t.role}</p>
          )}
        </div>
      </div>
    </div>
  );
}
