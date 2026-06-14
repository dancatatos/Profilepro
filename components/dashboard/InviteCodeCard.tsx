"use client";

/**
 * Universal invite/activation code entry card on the dashboard.
 *
 * Why this exists: with the Team Events add-on hidden from the
 * sidebar for users who don't have it granted yet, a brand-new
 * recruit had no visible surface to redeem a team code their
 * leader shared. The dashboard is the only tab always-visible to
 * every user regardless of plan or add-ons, so it's the right
 * spot for a single universal "got a code?" affordance.
 *
 * Detects the code prefix (TEAM- / TRAIN- / PIPE- / FUNNEL-) and
 * routes to the appropriate redemption flow. Pasting any other
 * shape shows a friendly "we don't recognise that" hint instead
 * of failing silently.
 */

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Ticket } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { toast } from "@/store/uiStore";

type CodeKind = "team" | "training" | "pipeline" | "funnel" | "unknown";

function detectKind(code: string): CodeKind {
  const c = code.trim().toUpperCase();
  if (c.startsWith("TEAM-")) return "team";
  if (c.startsWith("TRAIN-")) return "training";
  if (c.startsWith("PIPE-")) return "pipeline";
  if (c.startsWith("FUNNEL-")) return "funnel";
  return "unknown";
}

function routeFor(code: string): string | null {
  const c = code.trim().toUpperCase();
  const kind = detectKind(c);
  switch (kind) {
    case "team":
      return `/join/team/${c}`;
    case "training":
      return `/training?code=${encodeURIComponent(c)}`;
    case "pipeline":
      return `/pipelines?clone=${encodeURIComponent(c)}`;
    case "funnel":
      return `/funnels?use=${encodeURIComponent(c)}`;
    default:
      return null;
  }
}

export function InviteCodeCard() {
  const router = useRouter();
  const [value, setValue] = useState("");
  const kind = useMemo(() => (value ? detectKind(value) : null), [value]);

  const submit = (e?: React.FormEvent) => {
    e?.preventDefault();
    const c = value.trim().toUpperCase();
    if (!c) return;
    const target = routeFor(c);
    if (!target) {
      toast.error(
        "That code doesn't look right. Team codes start with TEAM-, trainings with TRAIN-.",
      );
      return;
    }
    router.push(target);
  };

  return (
    <Card className="p-4 sm:p-5">
      <form onSubmit={submit} className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="min-w-0 flex-1">
          <div className="mb-1.5 flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-electric-500/15 text-electric-300">
              <Ticket className="h-3.5 w-3.5" />
            </span>
            <p className="text-sm font-semibold text-white">
              Have an invite code?
            </p>
          </div>
          <p className="mb-2 text-xs text-white/55">
            Paste a team, training, funnel or pipeline code your leader shared.
          </p>
          <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="TEAM-ABC123"
            spellCheck={false}
            autoCapitalize="characters"
            className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm uppercase tracking-wide text-white outline-none placeholder:text-white/30 focus:border-electric-500/40"
          />
          {kind === "unknown" && value.trim() && (
            <p className="mt-1.5 text-[10px] text-white/45">
              Unknown code prefix. Expected TEAM- / TRAIN- / PIPE- / FUNNEL-.
            </p>
          )}
          {kind && kind !== "unknown" && (
            <p className="mt-1.5 text-[10px] text-electric-200">
              Detected: {kind} code.
            </p>
          )}
        </div>
        <Button
          type="submit"
          disabled={!value.trim() || kind === "unknown"}
          rightIcon={<ArrowRight className="h-3.5 w-3.5" />}
        >
          Activate
        </Button>
      </form>
    </Card>
  );
}
