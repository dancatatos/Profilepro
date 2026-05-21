"use client";

import { useEffect, useMemo, useState } from "react";
import { Calendar, Check, ChevronLeft, ChevronRight, Clock } from "lucide-react";
import { listBookedSlots } from "@/lib/firebase/firestore";
import { cn } from "@/lib/utils";
import type { AppointmentSection } from "@/types";

export type BookingSubmitFn = (input: {
  date: string;
  time: string;
  durationMin: number;
  name: string;
  phone: string;
  email: string;
  answers: { question: string; answer: string }[];
}) => Promise<void>;

/* ── theme-aware inline styles ── */
const cardStyle: React.CSSProperties = {
  background: "var(--tp-card)",
  border: "1px solid var(--tp-border)",
  borderRadius: "var(--tp-card-radius)",
  boxShadow: "var(--tp-shadow)",
};
const inputStyle: React.CSSProperties = {
  background: "var(--tp-input-bg)",
  border: "1px solid var(--tp-input-border)",
  color: "var(--tp-text)",
};
const btnStyle: React.CSSProperties = {
  background: "var(--tp-btn)",
  color: "var(--tp-btn-text)",
  borderRadius: "var(--tp-btn-radius)",
  border: "1px solid var(--tp-btn-border)",
};

const WEEKDAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

/* ── date / time helpers (all local time) ── */
function toISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}
function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
function addDays(d: Date, n: number): Date {
  const x = startOfDay(d);
  x.setDate(x.getDate() + n);
  return x;
}
function minutesOf(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}
function fmtTime(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${period}`;
}
function buildSlots(section: AppointmentSection): string[] {
  const start = minutesOf(section.startTime);
  const end = minutesOf(section.endTime);
  const step = section.slotMinutes > 0 ? section.slotMinutes : 30;
  const out: string[] = [];
  for (let t = start; t + step <= end; t += step) {
    out.push(
      `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(
        2,
        "0",
      )}`,
    );
  }
  return out;
}
function prettyDate(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

export function AppointmentBooking({
  section,
  profileId,
  onBook,
  onTrack,
}: {
  section: AppointmentSection;
  profileId: string;
  onBook: BookingSubmitFn;
  onTrack: () => void;
}) {
  const today = startOfDay(new Date());
  const lastDate = addDays(today, Math.max(1, section.bookingWindowDays));
  const slots = useMemo(() => buildSlots(section), [section]);
  const questions = section.questions.filter(
    (q) => q.enabled && q.question.trim().length > 0,
  );

  const [taken, setTaken] = useState<Set<string>>(new Set());
  const [viewMonth, setViewMonth] = useState(
    () => new Date(today.getFullYear(), today.getMonth(), 1),
  );
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    listBookedSlots(profileId).then((rows) => {
      if (!cancelled) {
        setTaken(new Set(rows.map((r) => `${r.date}|${r.time}`)));
      }
    });
    return () => {
      cancelled = true;
    };
  }, [profileId]);

  /* calendar grid for the viewed month */
  const year = viewMonth.getFullYear();
  const month = viewMonth.getMonth();
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const canPrev =
    new Date(year, month, 1) > new Date(today.getFullYear(), today.getMonth(), 1);
  const canNext = new Date(year, month + 1, 1) <= lastDate;

  const isSelectable = (d: Date) =>
    d >= today &&
    d <= lastDate &&
    section.availableDays.includes(d.getDay());

  const nowMinutes = new Date().getHours() * 60 + new Date().getMinutes();
  const todayISO = toISO(today);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!selectedDate || !selectedTime) return;
    if (name.trim().length < 2) return setError("Please enter your name.");
    if (phone.trim().length < 6)
      return setError("Please enter your mobile number.");

    setBusy(true);
    try {
      const payload = questions
        .map((q) => ({
          question: q.question,
          answer: (answers[q.id] || "").trim(),
        }))
        .filter((a) => a.answer.length > 0);
      await onBook({
        date: selectedDate,
        time: selectedTime,
        durationMin: section.slotMinutes,
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim(),
        answers: payload,
      });
      onTrack();
      setDone(true);
    } catch (err) {
      if (err instanceof Error && err.message === "SLOT_TAKEN") {
        setError("Sorry — that time was just booked. Please pick another.");
        const rows = await listBookedSlots(profileId);
        setTaken(new Set(rows.map((r) => `${r.date}|${r.time}`)));
        setSelectedTime(null);
      } else {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <div className="p-4" style={cardStyle}>
        <div
          className="flex flex-col items-center rounded-xl p-5 text-center"
          style={{
            background: "var(--tp-success-bg)",
            color: "var(--tp-success-text)",
          }}
        >
          <Check className="h-7 w-7" />
          <p className="mt-2 text-sm font-semibold">Appointment booked!</p>
          {selectedDate && selectedTime && (
            <p className="mt-0.5 text-xs">
              {prettyDate(selectedDate)} · {fmtTime(selectedTime)}
            </p>
          )}
          <p className="mt-1 text-xs opacity-80">
            See you then — you&apos;ll be contacted to confirm.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4" style={cardStyle}>
      <p className="font-display text-base font-semibold" style={{ color: "var(--tp-text)" }}>
        {section.headline}
      </p>
      {section.subtext && (
        <p className="mt-1 text-xs" style={{ color: "var(--tp-text3)" }}>
          {section.subtext}
        </p>
      )}

      {/* Calendar */}
      <div className="mt-3 rounded-xl p-3" style={{ background: "var(--tp-input-bg)" }}>
        <div className="mb-2 flex items-center justify-between">
          <button
            type="button"
            onClick={() =>
              canPrev && setViewMonth(new Date(year, month - 1, 1))
            }
            disabled={!canPrev}
            className="rounded-md p-1 disabled:opacity-25"
            style={{ color: "var(--tp-text2)" }}
            aria-label="Previous month"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span
            className="text-xs font-semibold"
            style={{ color: "var(--tp-text)" }}
          >
            {viewMonth.toLocaleDateString(undefined, {
              month: "long",
              year: "numeric",
            })}
          </span>
          <button
            type="button"
            onClick={() =>
              canNext && setViewMonth(new Date(year, month + 1, 1))
            }
            disabled={!canNext}
            className="rounded-md p-1 disabled:opacity-25"
            style={{ color: "var(--tp-text2)" }}
            aria-label="Next month"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1">
          {WEEKDAY_LABELS.map((d, i) => (
            <div
              key={i}
              className="py-1 text-center text-[10px] font-medium"
              style={{ color: "var(--tp-text3)" }}
            >
              {d}
            </div>
          ))}
          {Array.from({ length: firstWeekday }).map((_, i) => (
            <div key={`pad-${i}`} />
          ))}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const cellDate = new Date(year, month, i + 1);
            const iso = toISO(cellDate);
            const selectable = isSelectable(cellDate);
            const selected = iso === selectedDate;
            return (
              <button
                key={iso}
                type="button"
                disabled={!selectable}
                onClick={() => {
                  setSelectedDate(iso);
                  setSelectedTime(null);
                  setError("");
                }}
                className={cn(
                  "aspect-square rounded-lg text-xs font-medium transition-colors",
                  !selectable && "opacity-25",
                )}
                style={
                  selected
                    ? { ...btnStyle, border: "none" }
                    : selectable
                      ? {
                          background: "var(--tp-card)",
                          color: "var(--tp-text)",
                        }
                      : { color: "var(--tp-text3)" }
                }
              >
                {i + 1}
              </button>
            );
          })}
        </div>
      </div>

      {/* Time slots */}
      {selectedDate && (
        <div className="mt-3">
          <p
            className="mb-1.5 flex items-center gap-1.5 text-xs font-medium"
            style={{ color: "var(--tp-text2)" }}
          >
            <Clock className="h-3.5 w-3.5" />
            {prettyDate(selectedDate)}
          </p>
          {slots.length === 0 ? (
            <p className="text-xs" style={{ color: "var(--tp-text3)" }}>
              No times available.
            </p>
          ) : (
            <div className="grid grid-cols-3 gap-1.5">
              {slots.map((slot) => {
                const isTaken = taken.has(`${selectedDate}|${slot}`);
                const isPast =
                  selectedDate === todayISO && minutesOf(slot) <= nowMinutes;
                const disabled = isTaken || isPast;
                const selected = slot === selectedTime;
                return (
                  <button
                    key={slot}
                    type="button"
                    disabled={disabled}
                    onClick={() => {
                      setSelectedTime(slot);
                      setError("");
                    }}
                    className={cn(
                      "rounded-lg py-2 text-xs font-medium transition-colors",
                      disabled && "line-through opacity-30",
                    )}
                    style={
                      selected
                        ? { ...btnStyle, border: "none" }
                        : {
                            background: "var(--tp-card)",
                            border: "1px solid var(--tp-border)",
                            color: "var(--tp-text)",
                          }
                    }
                  >
                    {fmtTime(slot)}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Booking form */}
      {selectedDate && selectedTime && (
        <form onSubmit={submit} className="mt-3 space-y-2.5">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            className="h-11 w-full rounded-xl px-3.5 text-sm outline-none placeholder:opacity-40"
            style={inputStyle}
          />
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Your mobile number"
            inputMode="tel"
            className="h-11 w-full rounded-xl px-3.5 text-sm outline-none placeholder:opacity-40"
            style={inputStyle}
          />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Your email (optional)"
            className="h-11 w-full rounded-xl px-3.5 text-sm outline-none placeholder:opacity-40"
            style={inputStyle}
          />
          {questions.map((q) => (
            <textarea
              key={q.id}
              value={answers[q.id] || ""}
              onChange={(e) =>
                setAnswers((a) => ({ ...a, [q.id]: e.target.value }))
              }
              placeholder={`${q.question} (optional)`}
              rows={2}
              className="w-full resize-none rounded-xl px-3.5 py-2.5 text-sm outline-none placeholder:opacity-40"
              style={inputStyle}
            />
          ))}
          {error && <p className="text-xs text-red-400">{error}</p>}
          <button
            type="submit"
            disabled={busy}
            className="tp-btn-el h-11 w-full text-sm font-semibold transition-opacity disabled:opacity-60"
            style={btnStyle}
          >
            {busy
              ? "Booking…"
              : `Book ${fmtTime(selectedTime)} on ${prettyDate(selectedDate)}`}
          </button>
        </form>
      )}

      {!selectedDate && (
        <p
          className="mt-3 flex items-center justify-center gap-1.5 text-xs"
          style={{ color: "var(--tp-text3)" }}
        >
          <Calendar className="h-3.5 w-3.5" />
          Pick an available day to see open times.
        </p>
      )}
    </div>
  );
}
