import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/utils";

type Accent = "blue" | "jade" | "gold" | "white";

/* Light-theme KPI accents — soft tinted pill behind a saturated
   glyph, Linear/Stripe style. The "white" tone is now a neutral
   slate so a "general" KPI still reads. */
const ACCENTS: Record<Accent, string> = {
  blue: "text-electric-600 bg-electric-500/10",
  jade: "text-jade-600 bg-jade-500/10",
  gold: "text-amber-700 bg-gold-400/15",
  white: "text-slate-700 bg-slate-100",
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
      <p className="mt-3 font-display text-2xl font-bold text-slate-900">
        {value}
      </p>
      <p className="text-xs text-slate-500">{label}</p>
      {hint && <p className="mt-1 text-[11px] text-jade-600">{hint}</p>}
    </Card>
  );
}
