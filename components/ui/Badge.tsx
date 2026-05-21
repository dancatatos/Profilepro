import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Tone = "blue" | "jade" | "gold" | "neutral" | "danger";

const TONES: Record<Tone, string> = {
  blue: "bg-electric-500/12 text-electric-300 border-electric-500/25",
  jade: "bg-jade-500/12 text-jade-300 border-jade-500/25",
  gold: "bg-gold-400/12 text-gold-300 border-gold-400/25",
  neutral: "bg-white/[0.06] text-white/60 border-white/10",
  danger: "bg-red-500/12 text-red-300 border-red-500/25",
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
