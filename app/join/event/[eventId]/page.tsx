"use client";

/**
 * /join/event/[eventId] — crowd-registration QR target.
 *
 * The killer use case: leader prints this page's QR on event posters.
 * Attendee scans with phone → lands here → signs up (if needed) →
 * gets auto-joined to the team + RSVP'd "going" + checked-in. Two-tap
 * flow for the in-person case where speed matters.
 */

import { useEffect, useState, Suspense } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Calendar,
  CheckCircle2,
  MapPin,
  Sparkles,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { FullScreenLoader } from "@/components/ui/Spinner";
import {
  getTeamEvent,
  getTeamSpace,
  joinTeamSpace,
  setEventRsvp,
} from "@/lib/firebase/firestore";
import { toast } from "@/store/uiStore";
import type { TeamEvent, TeamSpace } from "@/types";

const PENDING_EVENT_KEY = "credibly:pendingEventJoin";

export default function JoinEventPage() {
  return (
    <Suspense fallback={<FullScreenLoader label="Loading…" />}>
      <Flow />
    </Suspense>
  );
}

function Flow() {
  const router = useRouter();
  const params = useParams<{ eventId: string }>();
  const { account, loading: authLoading } = useAuth();

  const eventId = params.eventId ?? "";
  const [event, setEvent] = useState<TeamEvent | null>(null);
  const [space, setSpace] = useState<TeamSpace | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    if (!eventId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      const e = await getTeamEvent(eventId).catch(() => null);
      let s: TeamSpace | null = null;
      if (e) s = await getTeamSpace(e.teamSpaceId).catch(() => null);
      if (!cancelled) {
        setEvent(e);
        setSpace(s);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [eventId]);

  /* Auto-register if signed in. Same idempotency story as /join/team. */
  useEffect(() => {
    if (!event || !space || authLoading) return;
    if (!account || account.uid === "demo") return;
    if (joining) return;
    void runRegister(event, space);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event, space, authLoading, account]);

  const runRegister = async (e: TeamEvent, s: TeamSpace) => {
    if (!account) return;
    setJoining(true);
    try {
      /* Two writes in sequence — first the team membership (so the
         RSVP doc's denormalised teamSpaceId/ownerId are valid in
         every dashboard), then the RSVP with checked-in stamp. */
      await joinTeamSpace({
        userId: account.uid,
        teamSpaceId: s.id,
        ownerId: s.ownerId,
        joinedVia: "event-qr",
        userDisplayName: account.displayName,
        userEmail: account.email,
        userPhotoURL: account.photoURL,
      });
      await setEventRsvp({
        userId: account.uid,
        eventId: e.id,
        teamSpaceId: s.id,
        status: "going",
        checkedIn: true,
      });
      window.localStorage.removeItem(PENDING_EVENT_KEY);
      toast.success(`You're registered for ${e.title}.`);
      router.replace("/my-events");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Registration failed.");
      setJoining(false);
    }
  };

  const handleSignup = () => {
    window.localStorage.setItem(PENDING_EVENT_KEY, eventId);
    router.push("/signup");
  };

  if (loading || authLoading) {
    return <FullScreenLoader label="Loading event…" />;
  }

  if (!event || !space) {
    return (
      <main className="min-h-dvh bg-ink-950">
        <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4 py-12">
          <Card className="space-y-2 p-6 text-center">
            <p className="font-display text-base font-semibold text-white">
              Event not found
            </p>
            <p className="text-sm text-white/55">
              The event link may have expired or been removed by the leader.
            </p>
          </Card>
        </div>
      </main>
    );
  }

  if (joining) {
    return <FullScreenLoader label="Registering you…" />;
  }

  const signedIn = !!account && account.uid !== "demo";
  const start = new Date(event.startAt);
  const whenLine = `${start.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  })} · ${start.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  })} ${event.timezone}`;

  return (
    <main className="min-h-dvh bg-ink-950">
      <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4 py-12">
        <Card className="overflow-hidden p-0">
          {event.bannerUrl && (
            <img
              src={event.bannerUrl}
              alt={event.title}
              className="aspect-[16/8] w-full object-cover"
            />
          )}
          <div className="p-5">
            <p className="text-xs text-white/55">{space.name}</p>
            <h1 className="mt-1 font-display text-xl font-bold text-white">
              {event.title}
            </h1>
            <div className="mt-3 space-y-1.5 text-sm text-white/75">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-electric-300" />
                {whenLine}
              </div>
              {event.locationLabel && (
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-electric-300" />
                  {event.locationLabel}
                </div>
              )}
            </div>

            {event.description && (
              <p className="mt-3 text-sm leading-relaxed text-white/65">
                {event.description}
              </p>
            )}

            <div className="mt-4">
              {signedIn ? (
                <Button
                  fullWidth
                  onClick={() => runRegister(event, space)}
                  leftIcon={<CheckCircle2 className="h-4 w-4" />}
                >
                  Register &amp; save my spot
                </Button>
              ) : (
                <>
                  <p className="mb-2 rounded-lg bg-electric-500/[0.06] p-3 text-xs text-electric-200">
                    Sign up free in 30 seconds to register. We&apos;ll save
                    your spot + email you a reminder before the event.
                  </p>
                  <Button
                    fullWidth
                    onClick={handleSignup}
                    leftIcon={<Sparkles className="h-4 w-4" />}
                  >
                    Sign up &amp; register
                  </Button>
                  <Link
                    href="/login"
                    onClick={() => {
                      window.localStorage.setItem(PENDING_EVENT_KEY, eventId);
                    }}
                    className="mt-2 block py-1 text-center text-xs text-white/55 hover:text-white"
                  >
                    Already have an account? Log in
                  </Link>
                </>
              )}
            </div>
          </div>
        </Card>
      </div>
    </main>
  );
}

/* PENDING_EVENT_KEY is intentionally a module-local constant — Next.js
   page files can only re-export `default` plus a handful of reserved
   names (config, generateStaticParams, etc.), so exporting arbitrary
   identifiers fails the build. The layout's pending-key handoff just
   uses the same literal string directly. */
