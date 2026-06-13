/**
 * LightStats — pastel-chip social-proof band.
 *
 * Each stat sits in its own pill-shaped pastel container per the
 * spec (cream / mint / lavender / butter, cycling). Numbers use
 * JetBrains Mono for designed weight. No icons — the numbers
 * carry the message.
 */

import type { MarketingStat } from "@/types";

const PALETTES = [
  { bg: "bg-cream-100", text: "text-cream-700", border: "border-cream-200" },
  { bg: "bg-mint-100", text: "text-mint-700", border: "border-mint-200" },
  { bg: "bg-lavender-100", text: "text-lavender-700", border: "border-lavender-200" },
  { bg: "bg-butter-100", text: "text-butter-700", border: "border-butter-200" },
] as const;

export function LightStats({ stats }: { stats: MarketingStat[] }) {
  if (!stats || stats.length === 0) return null;
  return (
    <section className="relative bg-white py-12 sm:py-16">
      <div className="mx-auto max-w-5xl px-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {stats.slice(0, 4).map((s, i) => {
            const p = PALETTES[i % PALETTES.length];
            return (
              <div
                key={s.id}
                className={`flex flex-col items-center rounded-2xl border px-4 py-6 text-center ${p.bg} ${p.border}`}
              >
                <p
                  className={`font-mono text-2xl font-bold tracking-tight sm:text-3xl ${p.text}`}
                  style={{ fontFamily: "var(--font-mono)" }}
                >
                  {s.value}
                </p>
                <p className="mt-1 text-[11px] font-medium text-stone-500 sm:text-xs">
                  {s.label}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
