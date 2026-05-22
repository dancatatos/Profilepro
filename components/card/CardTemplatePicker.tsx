"use client";

import { CARD_TEMPLATES } from "@/lib/cardTemplates";
import { cn } from "@/lib/utils";

/**
 * Horizontal swatch picker for the card style. Each swatch is a mini-card
 * preview rendered straight from the template's own colors.
 */
export function CardTemplatePicker({
  active,
  onPick,
  className,
}: {
  active: string;
  onPick: (id: string) => void;
  className?: string;
}) {
  return (
    <div className={className}>
      <p className="mb-2 text-xs font-medium text-white/55">Card style</p>
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {CARD_TEMPLATES.map((t) => {
          const isActive = t.id === active;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => onPick(t.id)}
              aria-label={`${t.name} card style`}
              aria-pressed={isActive}
              className={cn(
                "shrink-0 rounded-xl p-1 transition",
                isActive
                  ? "ring-2 ring-electric-400"
                  : "ring-1 ring-white/10 hover:ring-white/25",
              )}
            >
              <div
                className="relative h-12 w-[72px] overflow-hidden rounded-lg"
                style={{
                  background: `linear-gradient(140deg, ${t.bg[0]}, ${t.bg[1]})`,
                }}
              >
                <span
                  className="absolute left-1.5 top-1.5 h-3 w-3 rounded-full"
                  style={{ background: t.accent }}
                />
                <span
                  className="absolute left-[22px] top-2 h-1.5 w-7 rounded-full"
                  style={{ background: t.nameColor, opacity: 0.92 }}
                />
                <span
                  className="absolute left-[22px] top-[19px] h-1.5 w-5 rounded-full"
                  style={{ background: t.headlineColor }}
                />
                <span
                  className="absolute bottom-1.5 left-1.5 h-1 w-12 rounded-full"
                  style={{ background: t.contactColor, opacity: 0.5 }}
                />
              </div>
              <p
                className={cn(
                  "mt-1 text-center text-[10px]",
                  isActive ? "text-white" : "text-white/45",
                )}
              >
                {t.name}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
