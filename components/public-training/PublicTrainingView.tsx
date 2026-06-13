"use client";

/**
 * Public training view + player.
 *
 * Resolves the viewer's access state in the browser:
 *   - Owner of the training → full unlock (so previewing works)
 *   - Has a TrainingAccess record → full unlock
 *   - Free preview lessons → always playable, even anonymous
 *   - Everything else → locked, "Unlock with code" CTA
 *
 * The active lesson lives in state and uses an iframe player for
 * YouTube/Vimeo/Adilo embeds or a native <video> for direct MP4.
 * Each lesson the user finishes upserts a progress record so the
 * "X of Y completed" strip stays accurate across visits.
 */

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Download,
  GraduationCap,
  KeyRound,
  Lock,
  PlayCircle,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/Button";
import {
  getTrainingAccess,
  listTrainingProgress,
  markTrainingLessonComplete,
} from "@/lib/firebase/firestore";
import { normalizeVideoUrl } from "@/lib/video";
import { cn } from "@/lib/utils";
import { TrainingPurchaseForm } from "./TrainingPurchaseForm";
import type { Profile, Training, TrainingLesson } from "@/types";

export function PublicTrainingView({
  profile,
  training,
}: {
  profile: Profile;
  training: Training;
}) {
  const { account } = useAuth();
  const isOwner = !!account && account.uid === training.ownerId;

  /* Has the viewer activated this training? Resolved lazily after
     mount because Firestore reads need auth context. */
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!account || account.uid === "demo") {
        if (!cancelled) setHasAccess(false);
        return;
      }
      const access = await getTrainingAccess(account.uid, training.id);
      if (cancelled) return;
      const got = !!access || account.uid === training.ownerId;
      setHasAccess(got);
      if (got) {
        const prog = await listTrainingProgress(account.uid, training.id);
        if (cancelled) return;
        setCompletedIds(new Set(prog.map((p) => p.lessonId)));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [account, training.id, training.ownerId]);

  const unlocked = isOwner || hasAccess === true || training.distribution === "public";

  /* Ordered lessons by sortOrder (falls back to array index). */
  const lessons = useMemo(
    () =>
      [...(training.lessons ?? [])].sort(
        (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0),
      ),
    [training.lessons],
  );

  /* Active lesson — defaults to the first playable one. "Playable"
     means either we have full access, the lesson is a free preview,
     or distribution is public. */
  const firstPlayableId = useMemo(() => {
    const playable = lessons.find((l) => unlocked || l.freePreview);
    return playable?.id ?? lessons[0]?.id ?? null;
  }, [lessons, unlocked]);
  const [activeId, setActiveId] = useState<string | null>(null);
  useEffect(() => {
    setActiveId(firstPlayableId);
  }, [firstPlayableId]);

  const active = lessons.find((l) => l.id === activeId) ?? null;
  const canPlayActive =
    !!active && (unlocked || active.freePreview);
  const doneCount = lessons.filter((l) => completedIds.has(l.id)).length;

  const markComplete = async () => {
    if (!active || !account || account.uid === "demo") return;
    if (completedIds.has(active.id)) return;
    setCompletedIds((s) => new Set([...s, active.id]));
    try {
      await markTrainingLessonComplete(account.uid, training.id, active.id);
    } catch {
      // optimistic — silently keep
    }
  };

  const goNext = () => {
    if (!active) return;
    const idx = lessons.findIndex((l) => l.id === active.id);
    const next = lessons[idx + 1];
    if (next) setActiveId(next.id);
  };

  /* Decide which "back" link makes sense — owners go back to their
     editor, signed-in learners go to their library, anonymous
     visitors get nothing (this is a public page). */
  const backHref = isOwner
    ? `/trainings/${training.id}`
    : account && account.uid !== "demo"
      ? "/trainings"
      : null;
  const backLabel = isOwner ? "Back to editor" : "Back to my library";

  return (
    <main className="min-h-dvh bg-ink-950 text-white">
      {/* Thin top bar — only when there's somewhere to go back to.
          Sticky so it stays in reach during a long lesson scroll. */}
      {backHref && (
        <div className="sticky top-0 z-20 border-b border-white/[0.06] bg-ink-950/85 backdrop-blur">
          <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-2.5">
            <Link
              href={backHref}
              className="flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1.5 text-xs font-medium text-white/75 transition-colors hover:bg-white/[0.05] hover:text-white"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              {backLabel}
            </Link>
            <Link
              href="/dashboard"
              className="text-xs font-medium text-white/55 hover:text-white"
            >
              Dashboard
            </Link>
          </div>
        </div>
      )}

      <div className="mx-auto max-w-3xl px-4 py-8">
        {/* Header */}
        <header className="mb-6">
          {training.bannerUrl && (
            <img
              src={training.bannerUrl}
              alt={training.title}
              className="mb-5 aspect-[16/8] w-full rounded-2xl object-cover"
              loading="eager"
              fetchPriority="high"
              decoding="async"
            />
          )}
          <div className="flex flex-wrap items-center gap-2 text-xs text-white/55">
            <Link href={`/${profile.username}`} className="hover:text-white">
              @{profile.username}
            </Link>
            <span className="text-white/25">·</span>
            <span>
              {lessons.length} lesson{lessons.length === 1 ? "" : "s"}
            </span>
            {training.distribution === "paid" && training.price && (
              <>
                <span className="text-white/25">·</span>
                <span className="font-medium text-white">
                  ₱{training.price.toLocaleString()}
                </span>
              </>
            )}
          </div>
          <h1 className="mt-2 font-display text-2xl font-bold text-white sm:text-3xl">
            {training.title}
          </h1>
          {training.description && (
            <p className="mt-2 text-sm leading-relaxed text-white/65">
              {training.description}
            </p>
          )}
          {training.status === "draft" && isOwner && (
            <div className="mt-3 rounded-xl border border-amber-500/30 bg-amber-500/[0.06] px-3 py-2 text-xs text-amber-200">
              Draft preview — visitors can&apos;t see this yet.
            </div>
          )}
        </header>

        {/* Access prompt — only shown when user can't unlock everything */}
        {!unlocked && (
          <UnlockBlock training={training} profile={profile} />
        )}

        {/* Progress strip */}
        {unlocked && lessons.length > 0 && (
          <div className="mb-5 flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-electric-500/15 text-electric-300">
              <GraduationCap className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-white">
                Your progress
              </p>
              <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
                <div
                  className="h-full bg-jade-400 transition-all"
                  style={{
                    width: `${lessons.length ? (doneCount / lessons.length) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>
            <p className="shrink-0 text-xs font-medium text-white/65">
              {doneCount} / {lessons.length}
            </p>
          </div>
        )}

        {/* Player */}
        {active && (
          <section className="mb-5 space-y-3">
            <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-white/[0.06] bg-black">
              {!canPlayActive ? (
                <LockedPlaceholder />
              ) : (
                <Player lesson={active} />
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-semibold text-white">
                {active.title || "Untitled lesson"}
              </h2>
              {active.freePreview && (
                <span className="rounded-full bg-jade-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-jade-300">
                  Free preview
                </span>
              )}
            </div>
            {active.description && (
              <p className="text-xs text-white/55">{active.description}</p>
            )}

            {canPlayActive && active.body && (
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-white/40">
                  Notes
                </p>
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-white/80">
                  {active.body}
                </p>
              </div>
            )}

            {canPlayActive && (active.resources?.length ?? 0) > 0 && (
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                <p className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-white/40">
                  <Download className="h-3 w-3" />
                  Downloads
                </p>
                <div className="space-y-1.5">
                  {(active.resources ?? []).map((r) => (
                    <a
                      key={r.id}
                      href={r.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 rounded-lg border border-white/[0.07] bg-white/[0.02] px-3 py-2 text-xs text-white/75 transition-colors hover:border-electric-500/30 hover:text-white"
                    >
                      <Download className="h-3.5 w-3.5 text-electric-300" />
                      {r.label || r.url}
                    </a>
                  ))}
                </div>
              </div>
            )}

            {canPlayActive && account && account.uid !== "demo" && (
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={completedIds.has(active.id) ? "outline" : "primary"}
                  onClick={markComplete}
                  leftIcon={<CheckCircle2 className="h-3.5 w-3.5" />}
                >
                  {completedIds.has(active.id)
                    ? "Completed"
                    : "Mark complete"}
                </Button>
                {lessons.findIndex((l) => l.id === active.id) <
                  lessons.length - 1 && (
                  <Button
                    variant="outline"
                    onClick={goNext}
                    rightIcon={<ArrowRight className="h-3.5 w-3.5" />}
                  >
                    Next lesson
                  </Button>
                )}
              </div>
            )}
          </section>
        )}

        {/* Lesson list */}
        <section>
          <h3 className="mb-2.5 font-display text-sm font-semibold text-white">
            All lessons
          </h3>
          <div className="space-y-1.5">
            {lessons.map((lesson, idx) => {
              const playable = unlocked || lesson.freePreview;
              const isActive = active?.id === lesson.id;
              const done = completedIds.has(lesson.id);
              return (
                <button
                  key={lesson.id}
                  type="button"
                  onClick={() => setActiveId(lesson.id)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-colors",
                    isActive
                      ? "border-electric-500/50 bg-electric-500/[0.06]"
                      : "border-white/[0.06] bg-white/[0.02] hover:border-white/15",
                  )}
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/[0.05]">
                    {done ? (
                      <CheckCircle2 className="h-4 w-4 text-jade-400" />
                    ) : playable ? (
                      <PlayCircle className="h-4 w-4 text-electric-300" />
                    ) : (
                      <Lock className="h-4 w-4 text-white/30" />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-white">
                      {idx + 1}. {lesson.title || "Untitled lesson"}
                    </p>
                    {lesson.description && (
                      <p className="mt-0.5 truncate text-xs text-white/45">
                        {lesson.description}
                      </p>
                    )}
                  </div>
                  <span className="shrink-0 text-[10px] text-white/35">
                    {lesson.freePreview && !playable
                      ? "FREE"
                      : lesson.durationMinutes
                        ? `${lesson.durationMinutes} min`
                        : ""}
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}

function Player({ lesson }: { lesson: TrainingLesson }) {
  const normalized = lesson.videoUrl ? normalizeVideoUrl(lesson.videoUrl) : null;
  if (!normalized) {
    return (
      <div className="flex h-full items-center justify-center text-xs text-white/40">
        No video for this lesson yet.
      </div>
    );
  }
  if (normalized.provider === "mp4") {
    return (
      <video
        key={normalized.embedUrl}
        src={normalized.embedUrl}
        controls
        className="h-full w-full"
      />
    );
  }
  return (
    <iframe
      key={normalized.embedUrl}
      src={normalized.embedUrl}
      title={lesson.title}
      className="h-full w-full"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
      allowFullScreen
    />
  );
}

function LockedPlaceholder() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 text-white/55">
      <Lock className="h-7 w-7" />
      <p className="text-xs">Unlock this training to watch</p>
    </div>
  );
}

function UnlockBlock({
  training,
  profile,
}: {
  training: Training;
  profile: Profile;
}) {
  /* Distribution-aware CTA. Paid mode renders the receipt-upload
     form inline so visitors can buy without bouncing through a
     separate funnel. Team mode points to /training for code entry. */
  if (training.distribution === "paid") {
    return (
      <div className="mb-5 rounded-2xl border border-electric-500/30 bg-electric-500/[0.08] p-4">
        <p className="text-sm font-semibold text-white">
          Buy this training{" "}
          {training.price ? `— ₱${training.price.toLocaleString()}` : ""}
        </p>
        <p className="mt-1 mb-4 text-xs text-white/65">
          Send payment via the seller&apos;s GCash / Maya / bank, upload
          your receipt, and you&apos;ll be unlocked once the seller approves.
        </p>
        <TrainingPurchaseForm training={training} profile={profile} />
      </div>
    );
  }
  return (
    <div className="mb-5 rounded-2xl border border-electric-500/30 bg-electric-500/[0.08] p-4">
      <p className="flex items-center gap-2 text-sm font-semibold text-white">
        <KeyRound className="h-4 w-4 text-electric-300" />
        Got an activation code?
      </p>
      <p className="mt-1 text-xs text-white/65">
        Enter the code your team leader gave you to unlock every lesson.
      </p>
      <Link
        href={`/training`}
        className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-brand-gradient px-3 py-2 text-xs font-semibold text-white"
      >
        Enter activation code
      </Link>
    </div>
  );
}
