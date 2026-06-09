"use client";

/**
 * Event detail — full edit + RSVP list + share-via-QR + cancel/delete.
 *
 * Sticks to the same tabbed-card pattern used in the team editor for
 * consistency. RSVP list reads the event_rsvps collection scoped to
 * this event. Share modal renders the join URL + a downloadable QR
 * for crowd registration.
 */

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Calendar as CalendarIcon,
  CheckCircle2,
  Copy,
  MapPin,
  QrCode,
  Trash2,
  XCircle,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { PageHeader } from "@/components/common/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { FullScreenLoader } from "@/components/ui/Spinner";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { QRBlock } from "@/components/qr/QRBlock";
import {
  deleteTeamEvent,
  getTeamEvent,
  listRsvpsForEvent,
  updateTeamEvent,
} from "@/lib/firebase/firestore";
import { cn, getAppOrigin, timeAgo } from "@/lib/utils";
import { toast } from "@/store/uiStore";
import type { EventRsvp, TeamEvent } from "@/types";

export default function EventDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string; eventId: string }>();
  const { account, loading: authLoading } = useAuth();

  const [event, setEvent] = useState<TeamEvent | null>(null);
  const [rsvps, setRsvps] = useState<EventRsvp[]>([]);
  const [loading, setLoading] = useState(true);

  const [shareOpen, setShareOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [working, setWorking] = useState(false);

  const load = useCallback(async () => {
    if (!params.eventId) return;
    setLoading(true);
    const [e, r] = await Promise.all([
      getTeamEvent(params.eventId),
      listRsvpsForEvent(params.eventId).catch(() => []),
    ]);
    setEvent(e);
    setRsvps(r);
    setLoading(false);
  }, [params.eventId]);

  useEffect(() => {
    load();
  }, [load]);

  if (authLoading || loading) return <FullScreenLoader label="Loading event…" />;
  if (!event) {
    return (
      <div className="space-y-5">
        <PageHeader title="Event not found" />
        <Button href={`/teams/${params.id}`} variant="outline">
          ← Back
        </Button>
      </div>
    );
  }

  /* Soft owner guard — Firestore rules already block writes for
     non-owners, but a friendly screen reads better than perms errors. */
  if (account && event.ownerId !== account.uid && account.role !== "admin") {
    return (
      <div className="space-y-5">
        <PageHeader title="Not your event" />
        <Button href="/my-events" variant="outline">
          ← Back
        </Button>
      </div>
    );
  }

  const start = new Date(event.startAt);
  const end = new Date(event.endAt);
  const whenLine = `${start.toLocaleString()} → ${end.toLocaleString()} (${event.timezone})`;
  const joinUrl = `${getAppOrigin()}/join/event/${event.id}`;

  /* Bucket RSVPs for the leader summary. */
  const going = rsvps.filter((r) => r.status === "going");
  const maybe = rsvps.filter((r) => r.status === "maybe");
  const declined = rsvps.filter((r) => r.status === "declined");
  const checkedIn = rsvps.filter((r) => !!r.checkedInAt);

  const handleCancel = async () => {
    setWorking(true);
    try {
      await updateTeamEvent(event.id, { status: "canceled" });
      setEvent((prev) =>
        prev ? { ...prev, status: "canceled" as const } : prev,
      );
      toast.success("Event canceled. Members will be notified once the send pipeline ships.");
      setConfirmCancel(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Cancel failed.");
    } finally {
      setWorking(false);
    }
  };

  const handleDelete = async () => {
    setWorking(true);
    try {
      await deleteTeamEvent(event.id);
      toast.success("Event deleted.");
      router.push(`/teams/${params.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed.");
      setWorking(false);
    }
  };

  const copy = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(
      () => toast.success(`${label} copied.`),
      () => toast.error("Couldn't copy — copy manually."),
    );
  };

  return (
    <div className="space-y-5">
      <Button
        href={`/teams/${params.id}`}
        variant="outline"
        size="sm"
        leftIcon={<ArrowLeft className="h-3.5 w-3.5" />}
      >
        Back to team
      </Button>

      <div className="flex items-start justify-between gap-3">
        <PageHeader title={event.title} subtitle={whenLine} />
        <div className="flex flex-shrink-0 gap-2">
          <Button
            size="sm"
            onClick={() => setShareOpen(true)}
            leftIcon={<QrCode className="h-3.5 w-3.5" />}
          >
            Share
          </Button>
        </div>
      </div>

      {event.bannerUrl && (
        <img
          src={event.bannerUrl}
          alt={event.title}
          className="aspect-[16/8] w-full rounded-2xl object-cover"
        />
      )}

      {/* Details + RSVP summary */}
      <Card className="space-y-2 p-4">
        <div className="flex items-center gap-2 text-sm text-white/80">
          <CalendarIcon className="h-4 w-4 text-electric-300" />
          {whenLine}
        </div>
        {event.locationLabel && (
          <div className="flex items-center gap-2 text-sm text-white/80">
            <MapPin className="h-4 w-4 text-electric-300" />
            {event.locationLabel}
          </div>
        )}
        {event.description && (
          <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-white/70">
            {event.description}
          </p>
        )}
        {event.status === "canceled" && (
          <Badge tone="neutral" className="mt-2">
            Canceled
          </Badge>
        )}
      </Card>

      {/* RSVP summary stat row */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <SummaryStat label="Going" value={going.length} accent="jade" />
        <SummaryStat label="Maybe" value={maybe.length} accent="gold" />
        <SummaryStat label="Declined" value={declined.length} accent="white" />
        <SummaryStat label="Checked in" value={checkedIn.length} accent="blue" />
      </div>

      {/* RSVP list */}
      <Card className="p-0">
        <div className="border-b border-white/[0.06] p-3.5">
          <p className="text-xs font-medium text-white">
            RSVPs ({rsvps.length})
          </p>
        </div>
        {rsvps.length === 0 ? (
          <p className="p-6 text-center text-xs text-white/45">
            No RSVPs yet. Share the event link or QR with your team.
          </p>
        ) : (
          <div className="divide-y divide-white/[0.06]">
            {rsvps.map((r) => (
              <div key={r.id} className="flex items-center gap-3 p-3.5">
                <span
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                    r.status === "going"
                      ? "bg-jade-500/15 text-jade-300"
                      : r.status === "maybe"
                        ? "bg-gold-400/15 text-gold-300"
                        : "bg-white/[0.05] text-white/50",
                  )}
                >
                  {r.status === "going" ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : r.status === "maybe" ? (
                    <CalendarIcon className="h-4 w-4" />
                  ) : (
                    <XCircle className="h-4 w-4" />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-white">
                    {r.userId}
                  </p>
                  <p className="mt-0.5 text-xs text-white/45">
                    {r.status} · {timeAgo(r.updatedAt)}
                  </p>
                </div>
                {r.checkedInAt && <Badge tone="blue">Checked in</Badge>}
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Danger zone */}
      <Card className="space-y-2 border-red-500/15 bg-red-500/[0.02] p-4">
        <p className="text-[10px] font-medium uppercase tracking-wider text-red-300/80">
          Danger zone
        </p>
        <div className="flex flex-wrap gap-2">
          {event.status !== "canceled" && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setConfirmCancel(true)}
              leftIcon={<XCircle className="h-3.5 w-3.5" />}
            >
              Cancel event
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={() => setConfirmDelete(true)}
            leftIcon={<Trash2 className="h-3.5 w-3.5" />}
            className="!border-red-500/30 !text-red-300 hover:!bg-red-500/10"
          >
            Delete event
          </Button>
        </div>
        <p className="text-[11px] text-white/45">
          Canceling keeps the event visible with a Canceled badge.
          Deleting removes everything including RSVPs — can&apos;t be undone.
        </p>
      </Card>

      {/* ── Share modal — join URL + QR ── */}
      <Modal
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        title="Share this event"
        description="Direct link or QR — anyone who opens it can register in 2 taps."
      >
        <div className="space-y-4 pb-2">
          <div>
            <p className="mb-1.5 text-xs font-medium text-white/55">
              Direct link
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 truncate rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 font-mono text-xs text-electric-300">
                {joinUrl}
              </code>
              <Button
                size="sm"
                variant="outline"
                onClick={() => copy(joinUrl, "Link")}
                leftIcon={<Copy className="h-3.5 w-3.5" />}
              >
                Copy
              </Button>
            </div>
          </div>
          <div>
            <p className="mb-1.5 text-xs font-medium text-white/55">
              QR code (for venue posters)
            </p>
            <QRBlock
              value={joinUrl}
              display={240}
              fileName={`event-${event.id}`}
            />
            <p className="mt-2 text-center text-[11px] text-white/45">
              Print this on signs — attendees scan, sign up, get registered
              + checked in in one flow. No leader effort needed.
            </p>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={confirmCancel}
        loading={working}
        onCancel={() => !working && setConfirmCancel(false)}
        onConfirm={handleCancel}
        title="Cancel this event?"
        confirmLabel="Yes, cancel"
        tone="danger"
        body={
          <p>
            The event will stay visible to RSVP&apos;d members with a
            &quot;Canceled&quot; badge. The notification email goes out
            once the send pipeline ships.
          </p>
        }
      />

      <ConfirmDialog
        open={confirmDelete}
        loading={working}
        onCancel={() => !working && setConfirmDelete(false)}
        onConfirm={handleDelete}
        title="Delete this event?"
        confirmLabel="Delete event"
        body={
          <p>
            <strong>{event.title}</strong> and all {rsvps.length} RSVP
            {rsvps.length === 1 ? "" : "s"} will be permanently removed.
            This can&apos;t be undone.
          </p>
        }
      />
    </div>
  );
}

function SummaryStat({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent: "jade" | "gold" | "white" | "blue";
}) {
  const accentClass =
    accent === "jade"
      ? "text-jade-300"
      : accent === "gold"
        ? "text-gold-300"
        : accent === "blue"
          ? "text-electric-300"
          : "text-white";
  return (
    <Card className="p-3 text-center">
      <p className={cn("font-display text-xl font-bold", accentClass)}>
        {value}
      </p>
      <p className="text-[10px] uppercase tracking-wider text-white/45">
        {label}
      </p>
    </Card>
  );
}
