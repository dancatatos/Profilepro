"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  CalendarDays,
  Crown,
  Mail,
  Phone,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { PageHeader } from "@/components/common/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { FullScreenLoader } from "@/components/ui/Spinner";
import { listBookings, cancelBooking } from "@/lib/firebase/firestore";
import { toast } from "@/store/uiStore";
import type { Booking } from "@/types";

function fmtDate(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}
function fmtTime(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${period}`;
}
function localTodayISO(): string {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}-${String(
    n.getDate(),
  ).padStart(2, "0")}`;
}

function BookingCard({
  booking,
  cancelling,
  onCancel,
  past,
}: {
  booking: Booking;
  cancelling: boolean;
  onCancel: () => void;
  past?: boolean;
}) {
  return (
    <Card className={past ? "p-4 opacity-60" : "p-4"}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-electric-400" />
            <p className="text-sm font-semibold text-white">
              {fmtDate(booking.date)} · {fmtTime(booking.time)}
            </p>
            <span className="text-[11px] text-white/35">
              {booking.durationMin} min
            </span>
          </div>
          <p className="mt-1.5 text-sm font-medium text-white">
            {booking.name}
          </p>
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5">
            {booking.phone && (
              <a
                href={`tel:${booking.phone}`}
                className="flex items-center gap-1.5 text-xs text-white/55 hover:text-white"
              >
                <Phone className="h-3.5 w-3.5" />
                {booking.phone}
              </a>
            )}
            {booking.email && (
              <a
                href={`mailto:${booking.email}`}
                className="flex items-center gap-1.5 text-xs text-white/55 hover:text-white"
              >
                <Mail className="h-3.5 w-3.5" />
                {booking.email}
              </a>
            )}
          </div>
        </div>
        <button
          onClick={onCancel}
          disabled={cancelling}
          aria-label="Cancel appointment"
          className="shrink-0 rounded-lg p-2 text-white/30 transition-colors hover:bg-red-500/10 hover:text-red-400 disabled:opacity-40"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {booking.answers.length > 0 && (
        <div className="mt-3 space-y-2 border-t border-white/[0.06] pt-3">
          {booking.answers.map((a, i) => (
            <div key={i}>
              <p className="text-[11px] font-medium text-white/40">
                {a.question}
              </p>
              <p className="text-xs text-white/70">{a.answer}</p>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

export default function AppointmentsPage() {
  const { account, loading: authLoading } = useAuth();
  const isPro = account?.plan === "pro" || account?.plan === "team";

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(false);
  const [cancelling, setCancelling] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!account) return;
    setLoading(true);
    try {
      setBookings(await listBookings(account.uid));
    } catch {
      toast.error("Couldn't load appointments — check Firestore rules.");
    } finally {
      setLoading(false);
    }
  }, [account]);

  useEffect(() => {
    if (account && isPro) load();
  }, [account, isPro, load]);

  const remove = async (b: Booking) => {
    setCancelling(b.id);
    try {
      await cancelBooking(b);
      setBookings((prev) => prev.filter((x) => x.id !== b.id));
      toast.success("Appointment cancelled — the slot is open again.");
    } catch {
      toast.error("Couldn't cancel. Please try again.");
    } finally {
      setCancelling(null);
    }
  };

  if (authLoading || !account) {
    return <FullScreenLoader label="Loading appointments…" />;
  }

  /* ── Free users: upgrade prompt ── */
  if (!isPro) {
    return (
      <div className="space-y-5">
        <PageHeader
          title="Appointments"
          subtitle="Let visitors book calls and meetings with you."
        />
        <Card className="border border-gold-400/20 bg-gradient-to-b from-gold-400/[0.06] to-transparent p-6 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-gold-300 to-gold-500">
            <Crown className="h-6 w-6 text-ink-950" />
          </div>
          <h3 className="mt-3 font-display text-base font-bold text-gold-200">
            Appointment Scheduler is a Pro feature
          </h3>
          <p className="mx-auto mt-1 max-w-sm text-sm text-white/50">
            Upgrade to add a booking calendar to your profile — visitors pick
            a time, you get the appointment here automatically.
          </p>
          <Link
            href="/billing"
            className="mt-4 inline-flex rounded-xl bg-gradient-to-r from-gold-300 to-gold-500 px-5 py-2.5 text-sm font-bold text-ink-950"
          >
            Upgrade to Pro
          </Link>
        </Card>
      </div>
    );
  }

  /* ── Pro users: the bookings list ── */
  const today = localTodayISO();
  const upcoming = bookings.filter((b) => b.date >= today);
  const past = bookings.filter((b) => b.date < today).reverse();

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <PageHeader
          title="Appointments"
          subtitle="Bookings from your profile's scheduler."
        />
        <Button
          variant="outline"
          size="sm"
          onClick={load}
          loading={loading}
          leftIcon={<RefreshCw className="h-3.5 w-3.5" />}
        >
          Refresh
        </Button>
      </div>

      {loading && bookings.length === 0 ? (
        <Card className="p-8 text-center text-sm text-white/40">
          Loading appointments…
        </Card>
      ) : bookings.length === 0 ? (
        <Card className="p-8 text-center">
          <CalendarDays className="mx-auto h-8 w-8 text-white/20" />
          <p className="mt-3 text-sm font-medium text-white">
            No appointments yet
          </p>
          <p className="mx-auto mt-1 max-w-sm text-xs text-white/45">
            Add the <span className="text-white/70">Appointment Scheduler</span>{" "}
            section to your profile, then share your link so people can book.
          </p>
          <Link
            href="/profile"
            className="mt-4 inline-flex rounded-xl border border-white/12 px-4 py-2 text-xs font-medium text-white/70 hover:bg-white/5"
          >
            Open Profile Builder
          </Link>
        </Card>
      ) : (
        <div className="space-y-5">
          {upcoming.length > 0 && (
            <div className="space-y-2.5">
              <p className="text-xs font-semibold uppercase tracking-wider text-white/35">
                Upcoming ({upcoming.length})
              </p>
              {upcoming.map((b) => (
                <BookingCard
                  key={b.id}
                  booking={b}
                  cancelling={cancelling === b.id}
                  onCancel={() => remove(b)}
                />
              ))}
            </div>
          )}
          {past.length > 0 && (
            <div className="space-y-2.5">
              <p className="text-xs font-semibold uppercase tracking-wider text-white/35">
                Past ({past.length})
              </p>
              {past.map((b) => (
                <BookingCard
                  key={b.id}
                  booking={b}
                  cancelling={cancelling === b.id}
                  onCancel={() => remove(b)}
                  past
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
