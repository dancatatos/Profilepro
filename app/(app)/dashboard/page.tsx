"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  AlertCircle,
  ArrowRight,
  Calendar as CalendarIcon,
  CalendarClock,
  CheckCircle2,
  Circle,
  MapPin,
  Sparkles,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useProfileStore } from "@/store/profileStore";
import { useTaskCountStore } from "@/store/taskCountStore";
import { usePlanAccess } from "@/components/providers/PlanProvider";
import {
  getAnalyticsSummary,
  getTeamSpace,
  listEventsForTeamSpace,
  listTeamMembershipsForUser,
} from "@/lib/firebase/firestore";
import { profileCompleteness } from "@/lib/profileMetrics";
import { cn, formatCompact, formatPercent } from "@/lib/utils";
import type { AnalyticsSummary, TeamEvent } from "@/types";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { ScoreRing } from "@/components/common/ScoreRing";
import { StatCard } from "@/components/common/StatCard";

const DEMO_SUMMARY: AnalyticsSummary = {
  views: 1240,
  ctaClicks: 312,
  socialClicks: 188,
  leads: 47,
  shares: 63,
  conversionRate: 47 / 1240,
};

const QUICK = [
  { label: "Edit Profile", icon: "UserRound", href: "/profile", accent: "blue" },
  { label: "Credibly U.", icon: "GraduationCap", href: "/university", accent: "jade" },
  { label: "QR Code", icon: "QrCode", href: "/qr", accent: "gold" },
  { label: "Analytics", icon: "BarChart3", href: "/analytics", accent: "white" },
] as const;

const MODULES = [
  { label: "Templates", icon: "LayoutTemplate", href: "/templates", desc: "Start from a proven layout" },
  { label: "Digital Card", icon: "CreditCard", href: "/card", desc: "Your modern business card" },
  { label: "Leads", icon: "Users", href: "/leads", desc: "Prospects who reached out" },
  { label: "Media Library", icon: "Images", href: "/media", desc: "Photos & video assets" },
  { label: "Billing", icon: "Sparkles", href: "/billing", desc: "Plan & subscription" },
  { label: "Settings", icon: "Settings", href: "/settings", desc: "Account & profile URL" },
];

export default function DashboardPage() {
  const { account } = useAuth();
  const profile = useProfileStore((s) => s.profile);
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);

  useEffect(() => {
    if (!account) return;
    if (account.uid === "demo") {
      setSummary(DEMO_SUMMARY);
      return;
    }
    getAnalyticsSummary(account.uid).then(setSummary).catch(() => null);
  }, [account]);

  const { score, checklist } = useMemo(
    () => profileCompleteness(profile),
    [profile],
  );
  const s = summary ?? {
    views: 0,
    ctaClicks: 0,
    socialClicks: 0,
    leads: 0,
    shares: 0,
    conversionRate: 0,
  };

  const firstName = account?.displayName?.split(" ")[0] || "there";

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm text-white/45">Welcome back,</p>
        <h1 className="font-display text-2xl font-bold text-white">
          {firstName} &#128075;
        </h1>
      </div>

      {/* Follow-up tasks — the FIRST thing the user sees if they have
          any due. Replaces "user forgot to check /pipelines/today" with
          "user opens the app and immediately knows what to do." */}
      <TodayTasksCard />

      {/* Upcoming events from teams the user belongs to. Same "you
          need to know this NOW" framing as TodayTasksCard. Renders
          nothing when the user has no upcoming events, so the card
          doesn't take up space for users who haven't joined any team. */}
      <UpcomingEventsCard />

      {/* Completeness + AI */}
      <Card className="overflow-hidden p-5">
        <div className="flex items-center gap-5">
          <ScoreRing value={score} accent={score >= 70 ? "jade" : "blue"} label="ready" />
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-base font-semibold text-white">
              Your profile is {score}% ready
            </h2>
            <p className="mt-0.5 text-xs text-white/45">
              {score >= 80
                ? "Looking sharp — share it with prospects!"
                : "Finish the steps below to build instant trust."}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button href="/profile" size="sm" rightIcon={<ArrowRight className="h-3.5 w-3.5" />}>
                Continue building
              </Button>
              <Button href="/university" size="sm" variant="outline" leftIcon={<Sparkles className="h-3.5 w-3.5" />}>
                Learn how
              </Button>
            </div>
          </div>
        </div>
        <div className="mt-4 grid gap-1.5 border-t border-white/[0.06] pt-4 sm:grid-cols-2">
          {checklist.slice(0, 6).map((c) => (
            <div key={c.label} className="flex items-center gap-2 text-xs">
              {c.done ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-jade-400" />
              ) : (
                <Circle className="h-4 w-4 shrink-0 text-white/20" />
              )}
              <span className={c.done ? "text-white/50 line-through" : "text-white/70"}>
                {c.label}
              </span>
            </div>
          ))}
        </div>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon="Eye" label="Profile views" value={formatCompact(s.views)} accent="blue" />
        <StatCard icon="MousePointerClick" label="CTA clicks" value={formatCompact(s.ctaClicks)} accent="jade" />
        <StatCard icon="Inbox" label="Leads captured" value={formatCompact(s.leads)} accent="gold" />
        <StatCard icon="TrendingUp" label="Conversion" value={formatPercent(s.conversionRate)} accent="white" />
      </div>

      {/* Quick actions */}
      <div>
        <h3 className="mb-2.5 font-display text-sm font-semibold text-white">
          Quick actions
        </h3>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {QUICK.map((q, i) => (
            <motion.div
              key={q.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Link href={q.href}>
                <Card className="flex items-center gap-3 p-4 transition-transform active:scale-[0.98]">
                  <StatIcon icon={q.icon} accent={q.accent} />
                  <span className="text-sm font-medium text-white">
                    {q.label}
                  </span>
                </Card>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Modules */}
      <div>
        <h3 className="mb-2.5 font-display text-sm font-semibold text-white">
          Explore Credibly
        </h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {MODULES.map((m) => (
            <Link key={m.label} href={m.href}>
              <Card className="flex items-center gap-3 p-4 transition-transform active:scale-[0.98]">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.05]">
                  <Icon name={m.icon} className="h-5 w-5 text-white/55" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-white">{m.label}</p>
                  <p className="truncate text-xs text-white/40">{m.desc}</p>
                </div>
                <ArrowRight className="ml-auto h-4 w-4 text-white/25" />
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatIcon({ icon, accent }: { icon: string; accent: string }) {
  const map: Record<string, string> = {
    blue: "text-electric-400 bg-electric-500/10",
    jade: "text-jade-400 bg-jade-500/10",
    gold: "text-gold-300 bg-gold-400/10",
    white: "text-white bg-white/10",
  };
  return (
    <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${map[accent]}`}>
      <Icon name={icon} className="h-5 w-5" />
    </div>
  );
}

/* ── Today's follow-up tasks card ──────────────────────────────── */

/**
 * Prominent dashboard card that surfaces pending follow-up tasks so
 * the user doesn't have to remember to click into /pipelines.
 *
 * Three states:
 *   - Pipeline feature locked (not Pro)        → don't render
 *   - Loaded, zero tasks                       → don't render
 *   - Has tasks → urgent red card OR soft card
 *
 * Reads from useTaskCountStore which the app layout populates once
 * on sign-in. Refreshes naturally on every dashboard mount because
 * the layout's effect re-runs.
 */
function TodayTasksCard() {
  const { hasFeature } = usePlanAccess();
  const hasPipelines = hasFeature("follow_up_pipeline");
  const { overdue, today, soon, urgent, initialised } = useTaskCountStore();

  /* Lock-aware empty states — paid feature, free users don't see
     this card at all (cleaner than showing a "Pro only" tease that
     creates pricing friction on the most important screen). */
  if (!hasPipelines) return null;
  if (!initialised) return null;
  if (overdue + today + soon === 0) return null;

  /* Visual urgency scales with what's actually waiting:
       - Overdue → red, animated pulse, "act now" energy
       - Due today only → amber, calmer, "today's job" energy
       - Only "coming up" → soft electric, FYI tone */
  const tone =
    overdue > 0 ? "urgent" : today > 0 ? "today" : "soft";

  const palette = {
    urgent: {
      ring: "border-red-500/30",
      bg: "bg-gradient-to-br from-red-500/[0.10] via-red-500/[0.04] to-transparent",
      icon: "bg-red-500/20 text-red-300",
      label: "Action needed",
    },
    today: {
      ring: "border-amber-500/30",
      bg: "bg-gradient-to-br from-amber-500/[0.10] via-amber-500/[0.04] to-transparent",
      icon: "bg-amber-500/20 text-amber-300",
      label: "Today's follow-ups",
    },
    soft: {
      ring: "border-electric-500/25",
      bg: "bg-gradient-to-br from-electric-500/[0.08] via-electric-500/[0.03] to-transparent",
      icon: "bg-electric-500/15 text-electric-300",
      label: "Coming up",
    },
  }[tone];

  /* Headline copy — bias toward the most-urgent bucket so a single
     scan tells the user the most important number. */
  const headline =
    overdue > 0
      ? `${overdue} overdue follow-up${overdue === 1 ? "" : "s"}${
          today > 0 ? ` · ${today} due today` : ""
        }`
      : today > 0
        ? `${today} follow-up${today === 1 ? "" : "s"} due today`
        : `${soon} follow-up${soon === 1 ? "" : "s"} coming up`;

  return (
    <Link href="/pipelines/today" className="block">
      <Card
        className={cn(
          "relative overflow-hidden border-2 p-5 transition-all hover:border-opacity-60",
          palette.ring,
          palette.bg,
        )}
      >
        <div className="flex items-center gap-4">
          <div
            className={cn(
              "relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl",
              palette.icon,
            )}
          >
            {tone === "urgent" ? (
              <AlertCircle className="h-6 w-6" />
            ) : (
              <CalendarClock className="h-6 w-6" />
            )}
            {/* Pulsing ring on the icon when there's something
                truly overdue — gives a subtle "look here" motion. */}
            {tone === "urgent" && (
              <span className="absolute inset-0 animate-ping rounded-2xl bg-red-500/40" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-white/55">
              {palette.label}
            </p>
            <h2 className="mt-0.5 font-display text-lg font-bold text-white sm:text-xl">
              {headline}
            </h2>
            <p className="mt-0.5 text-xs text-white/55">
              Open the daily task list to copy a message and mark done.
            </p>
          </div>
          <ArrowRight className="hidden h-5 w-5 shrink-0 text-white/40 sm:block" />
        </div>

        {/* Mini chip row for the secondary buckets — gives more
            granular info without forcing the user to navigate. */}
        {(overdue > 0 || today > 0 || soon > 0) && (
          <div className="mt-4 flex flex-wrap gap-1.5 border-t border-white/[0.06] pt-3">
            {overdue > 0 && (
              <span className="rounded-md bg-red-500/15 px-2 py-0.5 text-[11px] font-semibold text-red-300">
                {overdue} overdue
              </span>
            )}
            {today > 0 && (
              <span className="rounded-md bg-amber-500/15 px-2 py-0.5 text-[11px] font-semibold text-amber-300">
                {today} due today
              </span>
            )}
            {soon > 0 && (
              <span className="rounded-md bg-electric-500/15 px-2 py-0.5 text-[11px] font-semibold text-electric-300">
                {soon} coming up
              </span>
            )}
          </div>
        )}
      </Card>
    </Link>
  );
}

/* ============================================================
   Upcoming Events widget
   ============================================================ */

interface DashboardEventRow {
  event: TeamEvent;
  teamName: string;
}

function UpcomingEventsCard() {
  const { account } = useAuth();
  const [rows, setRows] = useState<DashboardEventRow[] | null>(null);

  useEffect(() => {
    if (!account || account.uid === "demo") return;
    let cancelled = false;
    (async () => {
      try {
        const memberships = await listTeamMembershipsForUser(account.uid);
        if (memberships.length === 0) {
          if (!cancelled) setRows([]);
          return;
        }
        const pairs = await Promise.all(
          memberships.map(async (m) => {
            const [team, events] = await Promise.all([
              getTeamSpace(m.teamSpaceId).catch(() => null),
              listEventsForTeamSpace(m.teamSpaceId).catch(() => []),
            ]);
            return { team, events };
          }),
        );
        const now = Date.now();
        const flat: DashboardEventRow[] = [];
        for (const { team, events } of pairs) {
          if (!team) continue;
          for (const ev of events) {
            if (ev.status === "canceled") continue;
            if (ev.endAt < now) continue;
            flat.push({ event: ev, teamName: team.name });
          }
        }
        flat.sort((a, b) => a.event.startAt - b.event.startAt);
        if (!cancelled) setRows(flat.slice(0, 3));
      } catch {
        if (!cancelled) setRows([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [account]);

  /* Hide entirely until we know there's at least one event to show —
     avoids a "loading skeleton" flash for users with no teams. */
  if (!rows || rows.length === 0) return null;

  return (
    <Link href="/my-events" className="block">
      <Card className="p-4 transition-colors hover:border-electric-500/30 sm:p-5">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-electric-500/15 text-electric-300">
            <CalendarIcon className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-display text-sm font-semibold text-white">
              Upcoming events
            </p>
            <p className="text-xs text-white/55">
              From teams you&apos;ve joined
            </p>
          </div>
          <ArrowRight className="hidden h-5 w-5 shrink-0 text-white/40 sm:block" />
        </div>
        <div className="mt-3 space-y-1.5 border-t border-white/[0.06] pt-3">
          {rows.map((row) => {
            const d = new Date(row.event.startAt);
            const when = d.toLocaleString(undefined, {
              month: "short",
              day: "numeric",
              hour: "numeric",
              minute: "2-digit",
            });
            return (
              <div
                key={row.event.id}
                className="flex items-center gap-2 text-xs"
              >
                <span className="shrink-0 rounded bg-white/[0.05] px-1.5 py-0.5 text-[10px] font-medium text-white/55">
                  {when}
                </span>
                <span className="min-w-0 flex-1 truncate text-white/80">
                  {row.event.title}
                </span>
                <span className="hidden shrink-0 truncate text-[10px] text-white/40 sm:block">
                  {row.teamName}
                </span>
                {row.event.locationLabel && (
                  <MapPin className="hidden h-3 w-3 shrink-0 text-white/30 sm:block" />
                )}
              </div>
            );
          })}
        </div>
      </Card>
    </Link>
  );
}
