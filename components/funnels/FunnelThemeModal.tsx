"use client";

import { Check } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { ThemeMiniPreview } from "@/components/profile/ThemeMiniPreview";
import { THEME_CONFIGS } from "@/lib/themes";
import { cn } from "@/lib/utils";
import type { ThemeId } from "@/types";

/**
 * Picker for the funnel theme. Funnels are Pro+ only so no premium gating
 * — every theme is available to anyone who can see the funnel builder.
 */
export function FunnelThemeModal({
  open,
  onClose,
  themeId,
  onChange,
}: {
  open: boolean;
  onClose: () => void;
  themeId: ThemeId;
  onChange: (id: ThemeId) => void;
}) {
  const pick = (id: ThemeId) => {
    onChange(id);
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Pick a theme"
      description="Sets the look of your funnel pages."
      size="lg"
    >
      <div className="grid grid-cols-3 gap-2 pb-2 sm:grid-cols-4">
        {THEME_CONFIGS.map((tc) => {
          const active = tc.id === themeId;
          return (
            <button
              key={tc.id}
              onClick={() => pick(tc.id)}
              className={cn(
                "relative flex flex-col overflow-hidden rounded-xl border p-1.5 text-left transition-all",
                active
                  ? "border-electric-500 ring-2 ring-electric-500/40"
                  : "border-white/10 hover:border-white/25",
              )}
            >
              <div className="relative aspect-[3/4] w-full overflow-hidden rounded-lg">
                <ThemeMiniPreview theme={tc} />
                {active && (
                  <span className="absolute left-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-electric-500 ring-2 ring-white/25">
                    <Check className="h-3 w-3 text-white" />
                  </span>
                )}
              </div>
              <p
                className={cn(
                  "mt-1.5 truncate px-0.5 text-[11px] font-medium",
                  active ? "text-electric-300" : "text-white/75",
                )}
              >
                {tc.name}
              </p>
            </button>
          );
        })}
      </div>
    </Modal>
  );
}
