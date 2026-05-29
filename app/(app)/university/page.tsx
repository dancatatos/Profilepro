"use client";

/**
 * Credibly University — user-facing learning hub.
 *
 * Cards stay as a grid. Tap a card → it expands to span the full row
 * and reveals the in-app player (video + lesson list + notes + downloads).
 * Other cards fade back to 30% opacity so the active one is the focal
 * point. Re-tap (or hit ✕) to collapse.
 *
 * Plan gating works on two levels:
 *   1. Topic-level `allowedPlans` — admin restricts the topic to certain
 *      plans (e.g. Pro-only courses).
 *   2. Per-lesson `freePreview` — a single lesson can be unlocked for
 *      everyone even inside a gated topic. The typical pattern is
 *      "lesson 1 free, rest gated" to drive conversion.
 *
 * Backwards-compat: topics without any lessons fall back to the legacy
 * external `buttonUrl` so the rollout is non-breaking.
 */

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  Crown,
  Download,
  ExternalLink,
  Film,
  GraduationCap,
  Loader2,
  Lock,
  PlayCircle,
  X,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { PageHeader } from "@/components/common/PageHeader";
import {
  listUniversityTopics,
  listUserLessonProgress,
  markLessonComplete,
  unmarkLessonComplete,
} from "@/lib/firebase/firestore";
import { normalizeVideoUrl } from "@/lib/video";
import { cn } from "@/lib/utils";
import { toast } from "@/store/uiStore";
import type {
  UniversityLesson,
  UniversityProgress,
  UniversityTopic,
} from "@/types";

export default function UniversityPage() {
  const { account } = useAuth();
  const [topics, setTopics] = useState<UniversityTopic[]>([]);
  const [progress, setProgress] = useState<UniversityProgress[]>([]);
  const [loading, setLoading] = useState(true);
  /** The topic currently expanded into player mode (or null = grid only). */
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        /* Run both reads in parallel — they're independent. */
        const [allTopics, userProgress] = await Promise.all([
          listUniversityTopics(),
          account ? listUserLessonProgress(account.uid) : Promise.resolve([]),
        ]);
        if (!cancelled) {
          setTopics(allTopics);
          setProgress(userProgress);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [account]);

  /* O(1) "is this lesson done?" lookup — rebuilt only when progress
     changes, never per render of a lesson row. */
  const completedLessonIds = useMemo(() => {
    const s = new Set<string>();
    for (const p of progress) s.add(p.lessonId);
    return s;
  }, [progress]);

  /* Filter to topics visible to this user. Admins see everything so
     they can spot-check from the user view. */
  const visible = useMemo(() => {
    const userPlan = account?.plan ?? "free";
    const isAdmin = account?.role === "admin";
    return topics.filter((t) => {
      if (!t.active && !isAdmin) return false;
      if (isAdmin) return true;
      if (!t.allowedPlans || t.allowedPlans.length === 0) return true;
      return t.allowedPlans.includes(userPlan);
    });
  }, [topics, account]);

  /* Group by category — preserves Map insertion order which already
     matches the sortOrder query result, so we don't need to re-sort. */
  const grouped = useMemo(() => {
    const map = new Map<string, UniversityTopic[]>();
    for (const t of visible) {
      const key = t.category?.trim() || "General";
      const list = map.get(key) ?? [];
      list.push(t);
      map.set(key, list);
    }
    return Array.from(map.entries());
  }, [visible]);

  const toggleLessonComplete = async (
    topicId: string,
    lessonId: string,
    nextDone: boolean,
  ) => {
    if (!account) return;
    /* Optimistic — the user shouldn't wait for the round trip to see
       their checkmark land. Reverts on Firestore error. */
    const optimistic: UniversityProgress[] = nextDone
      ? [
          ...progress.filter((p) => p.lessonId !== lessonId),
          {
            id: `${account.uid}__${lessonId}`,
            userId: account.uid,
            topicId,
            lessonId,
            completedAt: Date.now(),
          },
        ]
      : progress.filter((p) => p.lessonId !== lessonId);
    const prev = progress;
    setProgress(optimistic);
    try {
      if (nextDone) {
        await markLessonComplete(account.uid, topicId, lessonId);
      } else {
        await unmarkLessonComplete(account.uid, lessonId);
      }
    } catch {
      setProgress(prev);
      toast.error("Couldn't update progress.");
    }
  };

  if (loading) {
    return (
      <div className="flex h-[40vh] items-center justify-center">
        <div className="flex items-center gap-2 text-sm text-white/55">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading lessons…
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Credibly University"
        subtitle="Master the tools, frameworks and growth playbooks built into Credibly."
      />

      {visible.length === 0 ? (
        <Card className="flex flex-col items-center justify-center gap-3 p-10 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/[0.04]">
            <GraduationCap className="h-6 w-6 text-white/30" />
          </span>
          <p className="text-sm font-medium text-white">Lessons coming soon</p>
          <p className="max-w-sm text-xs text-white/45">
            Your admin is curating the training library. Check back here once
            new lessons are published.
          </p>
        </Card>
      ) : (
        grouped.map(([category, items]) => (
          <section key={category} className="space-y-3">
            <div className="flex items-center gap-2">
              <h2 className="font-display text-base font-semibold text-white">
                {category}
              </h2>
              <span className="text-xs text-white/35">
                {items.length} {items.length === 1 ? "course" : "courses"}
              </span>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((t) => {
                const isExpanded = expandedId === t.id;
                /* Other cards in the grid fade to 30% opacity so the
                   active card is the visual focus. We deliberately
                   keep them in the layout (rather than hiding) so the
                   grid doesn't reflow on tap. */
                const isFaded = expandedId !== null && !isExpanded;
                return (
                  <TopicCard
                    key={t.id}
                    topic={t}
                    expanded={isExpanded}
                    faded={isFaded}
                    completedLessonIds={completedLessonIds}
                    userPlan={account?.plan ?? "free"}
                    onTap={() =>
                      setExpandedId(isExpanded ? null : t.id)
                    }
                    onCollapse={() => setExpandedId(null)}
                    onToggleLesson={toggleLessonComplete}
                  />
                );
              })}
            </div>
          </section>
        ))
      )}
    </div>
  );
}

/* ── Topic card (collapsed + expanded states) ────────────────────── */

function TopicCard({
  topic,
  expanded,
  faded,
  completedLessonIds,
  userPlan,
  onTap,
  onCollapse,
  onToggleLesson,
}: {
  topic: UniversityTopic;
  expanded: boolean;
  faded: boolean;
  completedLessonIds: Set<string>;
  userPlan: string;
  onTap: () => void;
  onCollapse: () => void;
  onToggleLesson: (
    topicId: string,
    lessonId: string,
    nextDone: boolean,
  ) => void;
}) {
  /* Sort lessons by their explicit sortOrder so the admin's ordering
     always wins, even if the inline array was re-shuffled by Firestore. */
  const sortedLessons = useMemo(
    () =>
      [...(topic.lessons ?? [])].sort((a, b) => a.sortOrder - b.sortOrder),
    [topic.lessons],
  );
  const lessonCount = sortedLessons.length;
  const doneCount = sortedLessons.filter((l) =>
    completedLessonIds.has(l.id),
  ).length;
  /* Topics with no lessons fall back to the legacy external CTA. */
  const hasLessons = lessonCount > 0;

  /* The active lesson is local-only state — defaults to the first
     unfinished lesson, OR lesson 1 if everything is done. */
  const firstUnfinishedIdx = sortedLessons.findIndex(
    (l) => !completedLessonIds.has(l.id),
  );
  const [activeLessonIdx, setActiveLessonIdx] = useState<number>(
    firstUnfinishedIdx === -1 ? 0 : firstUnfinishedIdx,
  );

  /* Whenever the card EXPANDS, re-seed the active lesson — the "next
     up" might have shifted because the user completed something on
     another visit. */
  useEffect(() => {
    if (!expanded) return;
    const nextIdx = sortedLessons.findIndex(
      (l) => !completedLessonIds.has(l.id),
    );
    setActiveLessonIdx(nextIdx === -1 ? 0 : nextIdx);
  }, [expanded, sortedLessons, completedLessonIds]);

  return (
    <Card
      className={cn(
        "flex flex-col overflow-hidden p-0 transition-all duration-300",
        /* Expanded cards span the full row so the player has space to
           breathe — multi-column grid collapses to single column for
           the active card. */
        expanded && "sm:col-span-2 lg:col-span-3",
        /* Other cards fade back when one is open. Pointer-events stay
           on so the user can switch to a different card. */
        faded && "opacity-40 hover:opacity-100",
      )}
    >
      {/* Banner — clickable to expand. When expanded, banner shrinks
          to a slim header strip so the player takes the prominent slot. */}
      <div
        className={cn(
          "relative w-full overflow-hidden bg-white/[0.04]",
          expanded ? "aspect-[16/4]" : "aspect-video",
        )}
      >
        {topic.bannerUrl ? (
          <img
            src={topic.bannerUrl}
            alt={topic.title}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <GraduationCap className="h-10 w-10 text-white/15" />
          </div>
        )}
        {/* Gradient overlay so the title is legible over any image. */}
        <div className="absolute inset-0 bg-gradient-to-t from-ink-950/80 via-ink-950/10 to-transparent" />
        {/* Top-right close button only visible when expanded. */}
        {expanded && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onCollapse();
            }}
            aria-label="Close course"
            className="absolute right-3 top-3 rounded-full bg-black/40 p-1.5 text-white/80 backdrop-blur transition-colors hover:bg-black/60 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        )}
        {!topic.active && (
          <div className="absolute left-3 top-3">
            <Badge tone="gold">Draft</Badge>
          </div>
        )}
        {/* Title overlaid on the banner — bigger when expanded. */}
        <div className="absolute inset-x-0 bottom-0 p-4">
          <h3
            className={cn(
              "font-display font-bold text-white",
              expanded ? "text-xl" : "text-base",
            )}
          >
            {topic.title}
          </h3>
          {expanded && (
            <p className="mt-1 max-w-xl text-sm text-white/65">
              {topic.description}
            </p>
          )}
        </div>
      </div>

      {/* Compact view body — description + progress + CTA */}
      {!expanded && (
        <div className="flex flex-1 flex-col p-5">
          <p className="text-sm text-white/55">{topic.description}</p>
          {/* Progress strip — only shows when there are lessons */}
          {hasLessons && (
            <ProgressStrip
              done={doneCount}
              total={lessonCount}
              className="mt-3"
            />
          )}
          <div className="mt-4">
            {hasLessons ? (
              <Button
                fullWidth
                variant="primary"
                onClick={onTap}
                leftIcon={
                  doneCount === lessonCount && lessonCount > 0 ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : doneCount > 0 ? (
                    <ArrowRight className="h-4 w-4" />
                  ) : (
                    <PlayCircle className="h-4 w-4" />
                  )
                }
              >
                {doneCount === lessonCount && lessonCount > 0
                  ? "Review"
                  : doneCount > 0
                    ? `Continue · Lesson ${doneCount + 1}`
                    : "Start course"}
              </Button>
            ) : (
              /* Backwards-compat path — old topics with only buttonUrl */
              <Button
                href={topic.buttonUrl}
                fullWidth
                variant="primary"
                rightIcon={<ExternalLink className="h-3.5 w-3.5" />}
              >
                {topic.buttonText || "Start"}
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Expanded view — player + lesson list */}
      {expanded && hasLessons && (
        <ExpandedPlayer
          topic={topic}
          lessons={sortedLessons}
          activeIdx={activeLessonIdx}
          completedLessonIds={completedLessonIds}
          userPlan={userPlan}
          onSelectLesson={setActiveLessonIdx}
          onToggleComplete={(lessonId, nextDone) =>
            onToggleLesson(topic.id, lessonId, nextDone)
          }
        />
      )}
    </Card>
  );
}

/* ── Progress strip ─────────────────────────────────────────────── */

function ProgressStrip({
  done,
  total,
  className,
}: {
  done: number;
  total: number;
  className?: string;
}) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  return (
    <div className={className}>
      <div className="mb-1 flex items-center justify-between text-[10px] text-white/45">
        <span>
          {done} of {total} {total === 1 ? "lesson" : "lessons"}
        </span>
        <span>{pct}%</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
        <div
          className={cn(
            "h-full rounded-full transition-all",
            done === total && total > 0
              ? "bg-jade-400"
              : "bg-gradient-to-r from-electric-400 to-electric-600",
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

/* ── Expanded player view ───────────────────────────────────────── */

function ExpandedPlayer({
  topic,
  lessons,
  activeIdx,
  completedLessonIds,
  userPlan,
  onSelectLesson,
  onToggleComplete,
}: {
  topic: UniversityTopic;
  lessons: UniversityLesson[];
  activeIdx: number;
  completedLessonIds: Set<string>;
  userPlan: string;
  onSelectLesson: (idx: number) => void;
  onToggleComplete: (lessonId: string, nextDone: boolean) => void;
}) {
  const activeLesson = lessons[activeIdx];
  const hasNext = activeIdx < lessons.length - 1;
  const allowedByTopic =
    !topic.allowedPlans ||
    topic.allowedPlans.length === 0 ||
    topic.allowedPlans.includes(userPlan);
  /* A lesson is playable when EITHER:
     - it's a free preview (overrides topic gating), OR
     - the topic itself is unlocked for this user's plan */
  const canPlay = !!activeLesson && (activeLesson.freePreview || allowedByTopic);
  const normalized = activeLesson?.videoUrl
    ? normalizeVideoUrl(activeLesson.videoUrl)
    : null;
  const isComplete = activeLesson
    ? completedLessonIds.has(activeLesson.id)
    : false;
  const doneCount = lessons.filter((l) => completedLessonIds.has(l.id)).length;

  if (!activeLesson) return null;

  return (
    <div className="p-4">
      {/* Course-level progress strip — gives the "you're 3/6 in" feel
          right next to the player. */}
      <ProgressStrip
        done={doneCount}
        total={lessons.length}
        className="mb-4"
      />

      <div className="grid gap-4 md:grid-cols-[1fr_280px]">
        {/* Left column: video + notes */}
        <div className="space-y-3">
          {/* Video player area */}
          <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-white/[0.06] bg-black">
            {!canPlay ? (
              <LessonLocked />
            ) : !normalized ? (
              <NoVideoPlaceholder />
            ) : normalized.provider === "mp4" ? (
              <video
                key={normalized.embedUrl}
                src={normalized.embedUrl}
                controls
                className="h-full w-full"
              />
            ) : (
              <iframe
                key={normalized.embedUrl}
                src={normalized.embedUrl}
                title={activeLesson.title}
                className="h-full w-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            )}
          </div>

          {/* Lesson title + free-preview badge */}
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="text-sm font-semibold text-white">
              {activeIdx + 1}. {activeLesson.title}
            </h4>
            {activeLesson.freePreview && (
              <span className="rounded-full bg-jade-500/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-jade-300">
                Free preview
              </span>
            )}
          </div>
          {activeLesson.description && (
            <p className="text-xs text-white/55">{activeLesson.description}</p>
          )}

          {/* Notes */}
          {activeLesson.body && (
            <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-3">
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-white/40">
                Notes
              </p>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-white/80">
                {activeLesson.body}
              </p>
            </div>
          )}

          {/* Downloads */}
          {(activeLesson.resources?.length ?? 0) > 0 && (
            <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-3">
              <p className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-white/40">
                <Download className="h-3 w-3" />
                Downloads
              </p>
              <div className="space-y-1.5">
                {activeLesson.resources!.map((r) => (
                  <a
                    key={r.id}
                    href={r.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 rounded-lg border border-white/[0.07] bg-white/[0.02] p-2 text-xs text-electric-300 transition-colors hover:bg-electric-500/[0.05]"
                  >
                    <Download className="h-3.5 w-3.5 shrink-0" />
                    <span className="flex-1 truncate">{r.label || r.url}</span>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Action buttons — mark complete + next lesson */}
          <div className="flex flex-wrap gap-2">
            {canPlay && (
              <Button
                size="sm"
                variant={isComplete ? "outline" : "primary"}
                leftIcon={<CheckCircle2 className="h-3.5 w-3.5" />}
                onClick={() =>
                  onToggleComplete(activeLesson.id, !isComplete)
                }
              >
                {isComplete ? "Unmark" : "Mark complete"}
              </Button>
            )}
            {hasNext && (
              <Button
                size="sm"
                variant="outline"
                rightIcon={<ArrowRight className="h-3.5 w-3.5" />}
                onClick={() => onSelectLesson(activeIdx + 1)}
              >
                Next lesson
              </Button>
            )}
          </div>
        </div>

        {/* Right column: lesson list */}
        <div>
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-white/40">
            All lessons
          </p>
          <div className="space-y-1.5">
            {lessons.map((l, idx) => {
              const isActive = idx === activeIdx;
              const isDone = completedLessonIds.has(l.id);
              const isLocked = !l.freePreview && !allowedByTopic;
              return (
                <button
                  key={l.id}
                  type="button"
                  onClick={() => onSelectLesson(idx)}
                  className={cn(
                    "flex w-full items-start gap-2 rounded-lg border p-2.5 text-left transition-colors",
                    isActive
                      ? "border-electric-500/40 bg-electric-500/10"
                      : "border-white/[0.07] bg-white/[0.02] hover:bg-white/[0.05]",
                  )}
                >
                  {/* Status icon — done / playing / locked / queued */}
                  <span
                    className={cn(
                      "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold",
                      isDone
                        ? "bg-jade-500/20 text-jade-300"
                        : isActive
                          ? "bg-electric-500/25 text-electric-200"
                          : isLocked
                            ? "bg-white/[0.05] text-white/30"
                            : "bg-white/[0.05] text-white/45",
                    )}
                  >
                    {isDone ? (
                      <CheckCircle2 className="h-3 w-3" />
                    ) : isLocked ? (
                      <Lock className="h-3 w-3" />
                    ) : (
                      idx + 1
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p
                      className={cn(
                        "truncate text-xs font-medium",
                        isActive ? "text-white" : "text-white/75",
                      )}
                    >
                      {l.title}
                    </p>
                    <div className="mt-0.5 flex items-center gap-1.5 text-[10px] text-white/35">
                      {l.durationMinutes ? (
                        <span>{l.durationMinutes} min</span>
                      ) : null}
                      {l.freePreview && (
                        <span className="rounded-full bg-jade-500/15 px-1 text-jade-300">
                          Free
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Upgrade nudge — shown if any lessons are locked for this user */}
          {!allowedByTopic && (
            <Link
              href="/billing"
              className="mt-3 flex items-center gap-2 rounded-xl border border-gold-400/30 bg-gradient-to-r from-gold-400/[0.08] to-transparent p-3 text-xs text-gold-200 transition-colors hover:from-gold-400/[0.15]"
            >
              <Crown className="h-4 w-4 shrink-0 text-gold-300" />
              <span>
                Upgrade to unlock all lessons in this course.
              </span>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Helpers for the player area ──────────────────────────────── */

function LessonLocked() {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-gradient-to-br from-ink-900 to-ink-950 p-6 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gold-400/15">
        <Lock className="h-5 w-5 text-gold-300" />
      </span>
      <p className="text-sm font-semibold text-white">Lesson locked</p>
      <p className="max-w-xs text-xs text-white/55">
        This lesson is part of a paid course. Upgrade your plan to unlock
        all lessons.
      </p>
      <Link
        href="/billing"
        className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-gold-300 to-gold-500 px-3 py-1.5 text-xs font-bold text-ink-950 transition-transform hover:scale-[1.03]"
      >
        <Crown className="h-3.5 w-3.5" />
        Upgrade
      </Link>
    </div>
  );
}

function NoVideoPlaceholder() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-white/[0.02]">
      <div className="flex flex-col items-center gap-2 text-white/35">
        <Film className="h-8 w-8" />
        <p className="text-xs">No video for this lesson yet.</p>
      </div>
    </div>
  );
}
