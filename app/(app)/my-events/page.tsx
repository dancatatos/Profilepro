"use client";

/**
 * /my-events — every upcoming event across teams the user belongs to.
 *
 * Cheap implementation: pull user's memberships → for each, pull the
 * team's events → flatten + filter to upcoming + sort by start time.
 * For the realistic case (1-10 teams, 5-20 events each) this is fine.
 * Larger scale would want a denormalised "user_event_feed" doc updated
 * on event create — defer until we see it.
 */

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Calendar,
  CheckCircle2,
  Clock,
  MapPin,
  Users,
  XCircle,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { PageHeader } from "@/components/common/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/common/EmptyState";
import { FullScreenLoader } from "@/components/ui/Spinner";
import {
  getEventRsvp,
  getTeamSpace,
  listEventsForTeamSpace,
  listTeamMembershipsForUser,
  setEventRsvp,
} from "@/lib/firebase/firestore";
import { cn } from "@/lib/utils";
import { toast } from "@/store/uiStore";
import type { EventRsvp, TeamEvent, TeamSpace } from "@/types";

interface FeedRow {
  event: TeamEvent;
  team: TeamSpace;
  rsvp: EventRsvp | null;
}

export default function MyEventsPage() {
  const { account, loading: authLoading } = useAuth();
  const [rows, setRows] = useState<FeedRow[]>([]);
  const [pastRows, setPastRows] = useState<FeedRow[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!account || account.uid === "demo") return;
    setLoading(true);
    try {
      const memberships = await listTeamMembershipsForUser(account.uid);
      if (memberships.length === 0) {
        setRows([]);
        setPastRows([]);
        return;
      }
      /* Fetch each team + its events in parallel. */
      const teamPairs = await Promise.all(
        memberships.map(async (m) => {
          const [team, events] = await Promise.all([
            getTeamSpace(m.teamSpaceId).catch(() => null),
            listEventsForTeamSpace(m.teamSpaceId).catch(() => []),
          ]);
          return { team, events };
        }),
      );
      const flat: FeedRow[] = [];
      for (const { team, events } of teamPairs) {
        if (!team) continue;
        for (const ev of events) {
          if (ev.status === "canceled") continue;
          flat.push({ event: ev, team, rsvp: null });
        }
      }
      /* Fetch RSVP state for each. Could be batched later; for now
         a simple parallel fetch is acceptable. */
      await Promise.all(
        flat.map(async (r) => {
          r.rsvp = await getEventRsvp(account.uid, r.event.id).catch(() => null);
        }),
      );
      const now = Date.now();
      setRows(
        flat
          .filter((r) => r.event.endAt >= now)
          .sort((a, b) => a.event.startAt - b.event.startAt),
      );
      setPastRows(
        flat
          .filter((r) => r.event.endAt < now)
          .sort((a, b) => b.event.startAt - a.event.startAt)
          .slice(0, 10),
      );
    } catch (err) {
      console.error("[Credibly] my-events load failed:", err);
      toast.error("Couldn't load events.");
    } finally {
      setLoading(false);
    }
  }, [account]);

  useEffect(() => {
    load();
  }, [load]);

  const updateLocalRsvp = (eventId: string, status: EventRsvp["status"] | null) => {
    setRows((prev) =>
      prev.map((r) =>
        r.event.id === eventId
          ? {
              ...r,
              rsvp:
                status === null
                  ? null
                  : ({
                      id: `${account?.uid}__${eventId}`,
                      userId: account?.uid ?? "",
                      eventId,
                      teamSpaceId: r.team.id,
                      status,
                      createdAt: Date.now(),
                      updatedAt: Date.now(),
                    } as EventRsvp),
            }
          : r,
      ),
    );
  };

  if (authLoading || !account) {
    return <FullScreenLoader label="Loading…" />;
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="My Events"
        subtitle="Every upcoming event from teams you've joined."
      />

      {loading && rows.length === 0 ? (
        <Card className="p-8 text-center text-sm text-white/40">
          Loading events…
        </Card>
      ) : rows.length === 0 && pastRows.length === 0 ? (
        <EmptyState
          icon="Calendar"
          title="No events yet"
          description="Once you join a team, their events appear here with RSVP buttons + reminders. Got a join link or QR from your team leader? Open it to get started."
          action={
            <Button href="/dashboard" leftIcon={<Users className="h-3.5 w-3.5" />}>
              Back to dashboard
            </Button>
          }
        />
      ) : (
        <>
          {rows.length > 0 && (
            <div className="space-y-2.5">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-white/45">
                Upcoming
              </p>
              {rows.map((row) => (
                <EventCard
                  key={row.event.id}
                  row={row}
                  onRsvpChange={(status) => updateLocalRsvp(row.event.id, status)}
                />
              ))}
            </div>
          )}
          {pastRows.length > 0 && (
            <div className="space-y-2.5">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-white/45">
                Past
              </p>
              {pastRows.map((row) => (
                <EventCard key={row.event.id} row={row} dimmed />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function EventCard({
  row,
  dimmed,
  onRsvpChange,
}: {
  row: FeedRow;
  dimmed?: boolean;
  onRsvpChange?: (status: EventRsvp["status"]) => void;
}) {
  const { account } = useAuth();
  const [busy, setBusy] = useState(false);

  const handleRsvp = async (status: EventRsvp["status"]) => {
    if (!account) return;
    setBusy(true);
    try {
      await setEventRsvp({
        userId: account.uid,
        eventId: row.event.id,
        teamSpaceId: row.team.id,
        status,
      });
      onRsvpChange?.(status);
      toast.success(
        status === "going"
          ? "RSVP'd — see you there!"
          : status === "maybe"
            ? "Marked as maybe."
            : "Marked as declined.",
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "RSVP failed.");
    } finally {
      setBusy(false);
    }
  };

  const start = new Date(row.event.startAt);
  const dateLine = start.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  const timeLine = start.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <Card className={cn("p-3.5 transition-colors", dimmed && "opacity-60")}>
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-electric-500/15 text-electric-300">
          <Calendar className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] text-white/45">{row.team.name}</p>
          <p className="text-sm font-medium text-white">{row.event.title}</p>
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-white/55">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" /> {dateLine} · {timeLine}
            </span>
            {row.event.locationLabel && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" /> {row.event.locationLabel}
              </span>
            )}
          </div>
        </div>
      </div>

      {!dimmed && (
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <RsvpButton
            current={row.rsvp?.status}
            target="going"
            onClick={() => handleRsvp("going")}
            disabled={busy}
            icon={<CheckCircle2 className="h-3.5 w-3.5" />}
            label="Going"
          />
          <RsvpButton
            current={row.rsvp?.status}
            target="maybe"
            onClick={() => handleRsvp("maybe")}
            disabled={busy}
            icon={<Clock className="h-3.5 w-3.5" />}
            label="Maybe"
          />
          <RsvpButton
            current={row.rsvp?.status}
            target="declined"
            onClick={() => handleRsvp("declined")}
            disabled={busy}
            icon={<XCircle className="h-3.5 w-3.5" />}
            label="Can't make it"
          />
          {row.event.locationUrl &&
            (row.event.locationType === "zoom" ||
              row.event.locationType === "meet") && (
              <Link
                href={row.event.locationUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-auto rounded-lg bg-electric-500/15 px-3 py-1.5 text-[11px] font-medium text-electric-200 hover:bg-electric-500/25"
              >
                Join call →
              </Link>
            )}
        </div>
      )}

      {row.rsvp?.checkedInAt && (
        <Badge tone="blue" className="mt-2">
          ✓ Checked in
        </Badge>
      )}
    </Card>
  );
}

function RsvpButton({
  current,
  target,
  onClick,
  disabled,
  icon,
  label,
}: {
  current: EventRsvp["status"] | undefined;
  target: EventRsvp["status"];
  onClick: () => void;
  disabled?: boolean;
  icon: React.ReactNode;
  label: string;
}) {
  const active = current === target;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-medium transition-colors disabled:opacity-50",
        active
          ? "border-electric-500/60 bg-electric-500/[0.10] text-electric-200"
          : "border-white/10 text-white/65 hover:bg-white/[0.05]",
      )}
    >
      {icon}
      {label}
    </button>
  );
}
