"use client";

import { QR_TEMPLATES } from "@/lib/qrTemplates";
import { cn } from "@/lib/utils";

/**
 * Horizontal swatch picker for QR style. Each swatch is a mini panel
 * preview rendered straight from the template's own colours.
 */
export function QRTemplatePicker({
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
      <p className="mb-2 text-xs font-medium text-white/55">QR style</p>
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {QR_TEMPLATES.map((t) => {
          const isActive = t.id === active;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => onPick(t.id)}
              aria-label={`${t.name} QR style`}
              aria-pressed={isActive}
              className={cn(
                "shrink-0 rounded-xl p-1 transition",
                isActive
                  ? "ring-2 ring-electric-400"
                  : "ring-1 ring-white/10 hover:ring-white/25",
              )}
            >
              <div
                className="relative h-14 w-14 overflow-hidden rounded-lg"
                style={{
                  background: t.panelBg,
                  border: `1px solid ${t.panelBorder}`,
                }}
              >
                <div
                  className="absolute inset-1.5 rounded-md bg-white"
                  style={{ border: `1px solid ${t.qrCardBorder}` }}
                />
                {t.label && (
                  <span
                    className="absolute bottom-0.5 left-1/2 h-0.5 w-6 -translate-x-1/2 rounded-full"
                    style={{ background: t.labelColor }}
                  />
                )}
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
