import { cn } from "@/lib/utils";

const STROKE: Record<string, string> = {
  blue: "#2e6bff",
  jade: "#10b981",
  gold: "#cda45e",
  white: "#ffffff",
};

/** Circular progress ring used for completeness + AI audit scores. */
export function ScoreRing({
  value,
  size = 84,
  stroke = 8,
  accent = "blue",
  label,
}: {
  value: number;
  size?: number;
  stroke?: number;
  accent?: "blue" | "jade" | "gold" | "white";
  label?: string;
}) {
  const clamped = Math.max(0, Math.min(100, value));
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <div
      className="relative shrink-0"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={STROKE[accent]}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.8s ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className={cn(
            "font-display font-bold leading-none text-white",
            size > 70 ? "text-xl" : "text-base",
          )}
        >
          {Math.round(clamped)}
        </span>
        {label && (
          <span className="mt-0.5 text-[9px] uppercase tracking-wide text-white/40">
            {label}
          </span>
        )}
      </div>
    </div>
  );
}
