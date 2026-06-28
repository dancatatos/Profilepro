import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Tone = "blue" | "jade" | "gold" | "neutral" | "danger";

/* Light-theme badges: soft tinted backgrounds with the saturated
   text color from the same hue. Reads premium on a white card —
   Stripe / Linear style. The text color tier is one step darker
   than the dark-mode version to maintain contrast on a tinted bg
   rather than a pure dark surface. */
const TONES: Record<Tone, string> = {
  blue: "bg-electric-500/10 text-electric-700 border-electric-500/20",
  jade: "bg-jade-500/10 text-jade-600 border-jade-500/25",
  gold: "bg-gold-400/15 text-amber-700 border-gold-400/30",
  neutral: "bg-slate-100 text-slate-600 border-slate-200",
  danger: "bg-red-500/10 text-red-700 border-red-500/20",
};

export function Badge({
  children,
  tone = "neutral",
  className,
  icon,
}: {
  children: ReactNode;
  tone?: Tone;
  className?: string;
  icon?: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium",
        TONES[tone],
        className,
      )}
    >
      {icon}
      {children}
    </span>
  );
}
