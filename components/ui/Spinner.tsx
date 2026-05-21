import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn("h-4 w-4 animate-spin", className)} />;
}

export function FullScreenLoader({ label }: { label?: string }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-ink-950">
      <Loader2 className="h-7 w-7 animate-spin text-electric-400" />
      {label && <p className="text-sm text-white/45">{label}</p>}
    </div>
  );
}
