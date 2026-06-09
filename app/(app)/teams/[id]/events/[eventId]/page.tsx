"use client";

/**
 * Event detail — placeholder for Session 2.
 *
 * Session 1 ships the navigable shell so the create flow has
 * somewhere to land. The full edit form, RSVP list, check-in
 * scanner, and notification controls land in Session 2.
 */

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft, Calendar, MapPin } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { FullScreenLoader } from "@/components/ui/Spinner";
import { getTeamEvent } from "@/lib/firebase/firestore";
import type { TeamEvent } from "@/types";

export default function EventDetailPage() {
  const params = useParams<{ id: string; eventId: string }>();
  const [event, setEvent] = useState<TeamEvent | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!params.eventId) return;
    (async () => {
      setLoading(true);
      const e = await getTeamEvent(params.eventId);
      setEvent(e);
      setLoading(false);
    })();
  }, [params.eventId]);

  if (loading) return <FullScreenLoader label="Loading event…" />;
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

  const start = new Date(event.startAt);
  const end = new Date(event.endAt);
  const whenLine = `${start.toLocaleString()} → ${end.toLocaleString()} (${event.timezone})`;

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

      <PageHeader title={event.title} subtitle={whenLine} />

      {event.bannerUrl && (
        <img
          src={event.bannerUrl}
          alt={event.title}
          className="aspect-[16/8] w-full rounded-2xl object-cover"
        />
      )}

      <Card className="space-y-2 p-4">
        <div className="flex items-center gap-2 text-sm text-white/80">
          <Calendar className="h-4 w-4 text-electric-300" />
          {whenLine}
        </div>
        {event.locationLabel && (
          <div className="flex items-center gap-2 text-sm text-white/80">
            <MapPin className="h-4 w-4 text-electric-300" />
            {event.locationLabel}
            {event.locationUrl && event.locationUrl !== event.locationLabel && (
              <span className="text-xs text-white/55">· {event.locationUrl}</span>
            )}
          </div>
        )}
        {event.description && (
          <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-white/70">
            {event.description}
          </p>
        )}
        {event.status === "canceled" && <Badge tone="neutral">Canceled</Badge>}
      </Card>

      <Card className="p-4">
        <p className="text-[10px] font-medium uppercase tracking-wider text-white/45">
          Coming next (Session 2)
        </p>
        <ul className="mt-2 space-y-1 text-xs text-white/55">
          <li>· Edit event details</li>
          <li>· QR code generator (for crowd registration at venue)</li>
          <li>· Share link modal</li>
          <li>· RSVP list (going / maybe / declined)</li>
          <li>· Check-in scanner</li>
          <li>· Cancel + delete</li>
        </ul>
      </Card>
    </div>
  );
}
