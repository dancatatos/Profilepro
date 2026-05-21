import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/utils";

type Accent = "blue" | "jade" | "gold" | "white";

const ACCENTS: Record<Accent, string> = {
  blue: "text-electric-400 bg-electric-500/10",
  jade: "text-jade-400 bg-jade-500/10",
  gold: "text-gold-300 bg-gold-400/10",
  white: "text-white bg-white/10",
};

export function StatCard({
  icon,
  label,
  value,
  hint,
  accent = "blue",
}: {
  icon: string;
  label: string;
  value: string | number;
  hint?: string;
  accent?: Accent;
}) {
  return (
    <Card className="p-4">
      <div
        className={cn(
          "flex h-9 w-9 items-center justify-center rounded-xl",
          ACCENTS[accent],
        )}
      >
        <Icon name={icon} className="h-5 w-5" />
      </div>
      <p className="mt-3 font-display text-2xl font-bold text-white">
        {value}
      </p>
      <p className="text-xs text-white/45">{label}</p>
      {hint && <p className="mt-1 text-[11px] text-jade-400">{hint}</p>}
    </Card>
  );
}
