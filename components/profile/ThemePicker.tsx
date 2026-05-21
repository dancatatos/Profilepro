"use client";

import { Check } from "lucide-react";
import { THEMES } from "@/lib/constants";
import { useProfileStore } from "@/store/profileStore";
import { cn } from "@/lib/utils";

export function ThemePicker() {
  const profile = useProfileStore((s) => s.profile);
  const setTheme = useProfileStore((s) => s.setTheme);
  if (!profile) return null;

  return (
    <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-5">
      {THEMES.map((theme) => {
        const active = profile.themeId === theme.id;
        return (
          <button
            key={theme.id}
            onClick={() => setTheme(theme.id)}
            className={cn(
              "group relative overflow-hidden rounded-xl border p-0 text-left transition-all",
              active
                ? "border-electric-500 ring-2 ring-electric-500/30"
                : "border-white/10",
            )}
          >
            <div
              className="h-16 w-full"
              style={{ background: theme.background }}
            >
              {active && (
                <span className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-electric-500">
                  <Check className="h-3 w-3 text-white" />
                </span>
              )}
            </div>
            <p className="truncate px-2 py-1.5 text-[11px] font-medium text-white/70">
              {theme.name}
            </p>
          </button>
        );
      })}
    </div>
  );
}
