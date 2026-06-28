"use client";

/**
 * New event page — minimal form matching the design mockup.
 *
 * Session 1 ships create-only. Edit + delete live on the event
 * detail page (Session 2). Notifications are flagged here but the
 * actual send happens in Session 3 (email infra + push trigger).
 */

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Calendar, MapPin, Sparkles } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { PageHeader } from "@/components/common/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { ImageUploadField } from "@/components/profile/ImageUploadField";
import { FullScreenLoader } from "@/components/ui/Spinner";
import {
  countOwnerEventsLast30Days,
  createTeamEvent,
  getTeamSpace,
} from "@/lib/firebase/firestore";
import { resolveAddOnLimit } from "@/lib/constants";
import { toast } from "@/store/uiStore";
import { auth as firebaseAuth } from "@/lib/firebase/client";
import type { EventLocationType, TeamSpace } from "@/types";

/* Common IANA zones bundled — same set used in your existing
   appointment flow. Defaults to the user's browser zone. */
const TIMEZONES = [
  "Asia/Manila",
  "Asia/Singapore",
  "Asia/Kuala_Lumpur",
  "Asia/Hong_Kong",
  "Asia/Tokyo",
  "Australia/Sydney",
  "America/Los_Angeles",
  "America/New_York",
  "Europe/London",
  "UTC",
];

const LOCATION_OPTIONS: { value: EventLocationType; label: string }[] = [
  { value: "in-person", label: "In-person" },
  { value: "zoom", label: "Zoom" },
  { value: "meet", label: "Google Meet" },
  { value: "other", label: "Other" },
];

/** Browser local datetime → epoch ms in the given IANA timezone. */
function localToEpoch(localValue: string, _timezone: string): number {
  /* `localValue` from <input type="datetime-local"> is naive (no zone).
     We treat it as the leader's selected timezone wall clock. For
     simplicity in v1 we use the browser's interpretation — Tier 1.5
     will swap to a proper IANA→UTC conversion using Intl.DateTimeFormat
     or a zone library. Acceptable trade-off for the first ship. */
  void _timezone;
  return new Date(localValue).getTime();
}

export default function NewEventPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const { account, loading: authLoading } = useAuth();

  const [space, setSpace] = useState<TeamSpace | null>(null);
  const [loadingSpace, setLoadingSpace] = useState(true);

  /* Form state */
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [bannerUrl, setBannerUrl] = useState("");
  const [invitationCardUrl, setInvitationCardUrl] = useState("");
  const defaultStart = useMemo(() => {
    const d = new Date();
    d.setMinutes(0, 0, 0);
    d.setHours(d.getHours() + 24);
    return toLocalInput(d);
  }, []);
  const defaultEnd = useMemo(() => {
    const d = new Date();
    d.setMinutes(0, 0, 0);
    d.setHours(d.getHours() + 25);
    return toLocalInput(d);
  }, []);
  const [startAt, setStartAt] = useState(defaultStart);
  const [endAt, setEndAt] = useState(defaultEnd);
  const [timezone, setTimezone] = useState(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Manila";
    } catch {
      return "Asia/Manila";
    }
  });
  const [locationType, setLocationType] = useState<EventLocationType>("in-person");
  const [locationUrl, setLocationUrl] = useState("");
  const [notifyOnCreate, setNotifyOnCreate] = useState(true);
  const [notifyDayBefore, setNotifyDayBefore] = useState(true);
  const [pushDayBefore, setPushDayBefore] = useState(true);

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!params.id) return;
    (async () => {
      setLoadingSpace(true);
      const s = await getTeamSpace(params.id);
      setSpace(s);
      setLoadingSpace(false);
    })();
  }, [params.id]);

  if (authLoading || loadingSpace) {
    return <FullScreenLoader label="Loading…" />;
  }

  if (!space || (account && space.ownerId !== account.uid)) {
    return (
      <div className="space-y-5">
        <PageHeader title="Team not found" />
        <Button href="/teams" variant="outline">
          ← Back
        </Button>
      </div>
    );
  }

  const handleCreate = async () => {
    if (!account || !space) return;
    if (!title.trim()) return toast.error("Add a title.");
    const startMs = localToEpoch(startAt, timezone);
    const endMs = localToEpoch(endAt, timezone);
    if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) {
      return toast.error("Pick a valid start + end time.");
    }
    if (endMs <= startMs) {
      return toast.error("End time must be after the start time.");
    }
    if (locationType === "in-person" && !locationUrl.trim()) {
      return toast.error("Add an address or location label.");
    }
    if (
      (locationType === "zoom" || locationType === "meet") &&
      !locationUrl.trim()
    ) {
      return toast.error("Paste the meeting link.");
    }

    /* Enforce the rolling-30-day cap before writing. */
    const cap = resolveAddOnLimit(account, "eventsPerMonth");
    if (cap < 999) {
      const recent = await countOwnerEventsLast30Days(account.uid);
      if (recent >= cap) {
        return toast.error(
          `You've hit your monthly event cap (${cap}). Ask your admin to raise it.`,
        );
      }
    }

    setSaving(true);
    try {
      const id = await createTeamEvent({
        teamSpaceId: space.id,
        ownerId: account.uid,
        title: title.trim(),
        description: description.trim() || undefined,
        bannerUrl: bannerUrl || undefined,
        invitationCardUrl: invitationCardUrl || undefined,
        startAt: startMs,
        endAt: endMs,
        timezone,
        locationType,
        locationLabel:
          locationType === "in-person"
            ? locationUrl.trim()
            : LOCATION_OPTIONS.find((l) => l.value === locationType)?.label,
        locationUrl: locationUrl.trim() || undefined,
        notifyOnCreate,
        notifyDayBefore,
        pushDayBefore,
      });

      /* Fire the "new event" email blast if the leader opted in.
         Best-effort: success goes silently into the success toast,
         failures show as a warning but don't roll back the event. */
      if (notifyOnCreate) {
        try {
          const idToken = await firebaseAuth.currentUser?.getIdToken();
          const res = await fetch("/api/events/notify-created", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
            },
            body: JSON.stringify({
              eventId: id,
              origin: window.location.origin,
            }),
          });
          const j = await res.json();
          if (res.ok && j.sent > 0) {
            toast.success(
              `Event created — ${j.sent} member${j.sent === 1 ? "" : "s"} notified.`,
            );
          } else if (res.ok) {
            toast.success("Event created.");
          } else {
            toast.success("Event created. (Notification send had an issue — try resending later.)");
          }
        } catch {
          toast.success("Event created. (Couldn't send notifications — check email settings.)");
        }
      } else {
        toast.success("Event created.");
      }

      router.push(`/teams/${space.id}/events/${id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't create event.");
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <Button
        href={`/teams/${space.id}`}
        variant="outline"
        size="sm"
        leftIcon={<ArrowLeft className="h-3.5 w-3.5" />}
      >
        Back to team
      </Button>

      <PageHeader title="New event" subtitle={space.name} />

      <Card className="space-y-3 p-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">
            Title
          </label>
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Sizzle Night"
            className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 outline-none placeholder:text-slate-300 focus:border-electric-500/60"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="What's this event about?"
            className="w-full resize-none rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-900 outline-none placeholder:text-slate-300 focus:border-electric-500/60"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">
            Banner (optional)
          </label>
          <p className="mb-1.5 text-[11px] text-slate-400">
            Small thumbnail shown on event cards in /my-events and the
            dashboard.
          </p>
          <ImageUploadField
            value={bannerUrl}
            onChange={(url) => setBannerUrl(url ?? "")}
            folder="media"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">
            Invitation card (optional)
          </label>
          <p className="mb-1.5 text-[11px] text-slate-400">
            The full share-graphic your team forwards to prospects on
            Messenger / Facebook / Viber. Members get a one-tap
            &ldquo;Download invitation card&rdquo; button on the event.
          </p>
          <ImageUploadField
            value={invitationCardUrl}
            onChange={(url) => setInvitationCardUrl(url ?? "")}
            folder="media"
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 flex items-center gap-1.5 text-xs font-medium text-slate-500">
              <Calendar className="h-3.5 w-3.5" />
              Starts
            </label>
            <input
              type="datetime-local"
              value={startAt}
              onChange={(e) => setStartAt(e.target.value)}
              className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 outline-none focus:border-electric-500/60"
            />
          </div>
          <div>
            <label className="mb-1 flex items-center gap-1.5 text-xs font-medium text-slate-500">
              <Calendar className="h-3.5 w-3.5" />
              Ends
            </label>
            <input
              type="datetime-local"
              value={endAt}
              onChange={(e) => setEndAt(e.target.value)}
              className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 outline-none focus:border-electric-500/60"
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">
            Timezone
          </label>
          <Select
            value={timezone}
            onChange={(v) => setTimezone(v)}
            options={TIMEZONES.map((tz) => ({ value: tz, label: tz }))}
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-[180px_1fr]">
          <div>
            <label className="mb-1 flex items-center gap-1.5 text-xs font-medium text-slate-500">
              <MapPin className="h-3.5 w-3.5" />
              Location type
            </label>
            <Select
              value={locationType}
              onChange={(v) => setLocationType(v as EventLocationType)}
              options={LOCATION_OPTIONS}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">
              {locationType === "in-person" ? "Address" : "Meeting link"}
            </label>
            <input
              value={locationUrl}
              onChange={(e) => setLocationUrl(e.target.value)}
              placeholder={
                locationType === "in-person"
                  ? "e.g. Cebu Coliseum"
                  : "https://…"
              }
              className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 outline-none placeholder:text-slate-300 focus:border-electric-500/60"
            />
          </div>
        </div>
      </Card>

      {/* Notifications block — flags are persisted now; actual sends
          ship in Session 3 when the email infra is wired. */}
      <Card className="space-y-2 p-4">
        <p className="text-[10px] font-medium uppercase tracking-wider text-slate-500">
          Notifications
        </p>
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={notifyOnCreate}
            onChange={(e) => setNotifyOnCreate(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 bg-slate-100 accent-electric-500"
          />
          Email all team members now
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={notifyDayBefore}
            onChange={(e) => setNotifyDayBefore(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 bg-slate-100 accent-electric-500"
          />
          Email reminder 1 day before
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={pushDayBefore}
            onChange={(e) => setPushDayBefore(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 bg-slate-100 accent-electric-500"
          />
          Push notification 1 day before
        </label>
        <p className="text-[11px] text-slate-400">
          Send pipeline ships in the next update — your preferences are
          saved with the event so it goes out automatically when ready.
        </p>
      </Card>

      <div className="flex justify-end gap-2">
        <Button
          variant="outline"
          href={`/teams/${space.id}`}
          disabled={saving}
        >
          Cancel
        </Button>
        <Button
          onClick={handleCreate}
          loading={saving}
          disabled={saving}
          leftIcon={<Sparkles className="h-3.5 w-3.5" />}
        >
          Create event
        </Button>
      </div>
    </div>
  );
}

/** Convert a Date to a `datetime-local`-friendly string (local time, no zone). */
function toLocalInput(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
