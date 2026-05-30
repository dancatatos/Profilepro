"use client";

/**
 * Admin → Credibly University — curate the training library.
 *
 * Lists all topics with inline edit (title, description, category, sort
 * order, button text/url, plan visibility, active toggle) and an
 * in-page banner uploader. Topics are stored in /university_topics
 * (one doc per topic) and the user-facing /university page reads them
 * grouped by category.
 *
 * Plan multi-select: a topic with no plans selected is visible to all.
 * Adding plans restricts visibility to users on one of those plans —
 * useful for Pro-only deep dives, affiliate-only training, etc.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  ChevronUp,
  Eye,
  Film,
  GraduationCap,
  GripVertical,
  ImagePlus,
  Link2,
  Loader2,
  Lock,
  Paperclip,
  Plus,
  RefreshCw,
  Save,
  Trash2,
} from "lucide-react";
import {
  DndContext,
  PointerSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { toast } from "@/store/uiStore";
import {
  deleteUniversityTopic,
  getPlansConfig,
  listUniversityTopics,
  upsertUniversityTopic,
} from "@/lib/firebase/firestore";
import { uploadImage } from "@/lib/firebase/storage";
import { PLANS as DEFAULT_PLANS } from "@/lib/constants";
import { cn, uid as makeId } from "@/lib/utils";
import { normalizeVideoUrl } from "@/lib/video";
import type {
  Plan,
  PlanId,
  UniversityLesson,
  UniversityResource,
  UniversityTopic,
} from "@/types";

/** Build a brand-new blank topic with the next available sort order. */
function blankTopic(maxSortOrder: number): UniversityTopic {
  const now = Date.now();
  return {
    id: makeId("topic"),
    title: "",
    description: "",
    bannerUrl: "",
    category: "Getting Started",
    sortOrder: maxSortOrder + 10,
    buttonText: "Start Lessons",
    buttonUrl: "",
    allowedPlans: [],
    active: true,
    createdAt: now,
    updatedAt: now,
  };
}

export default function AdminUniversityPage() {
  const { account } = useAuth();
  const [topics, setTopics] = useState<UniversityTopic[]>([]);
  const [plans, setPlans] = useState<Plan[]>(DEFAULT_PLANS);
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  /* Map of topicId → unsaved-edits flag so the Save button only highlights
     for topics the admin has actually touched. */
  const [dirtyIds, setDirtyIds] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [allTopics, savedPlans] = await Promise.all([
        listUniversityTopics(),
        getPlansConfig(),
      ]);
      setTopics(allTopics);
      if (savedPlans && savedPlans.length > 0) setPlans(savedPlans);
      setDirtyIds(new Set());
    } catch {
      toast.error("Couldn't load university topics.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (account?.role === "admin") load();
  }, [account, load]);

  const markDirty = (id: string) =>
    setDirtyIds((s) => new Set(s).add(id));

  const patchTopic = (id: string, patch: Partial<UniversityTopic>) => {
    setTopics((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...patch } : t)),
    );
    markDirty(id);
  };

  const addTopic = () => {
    const maxSort = topics.reduce(
      (m, t) => (t.sortOrder > m ? t.sortOrder : m),
      0,
    );
    const blank = blankTopic(maxSort);
    setTopics((prev) => [...prev, blank]);
    markDirty(blank.id);
    toast.success("Draft topic added — fill it in and Save.");
  };

  const saveTopic = async (topic: UniversityTopic) => {
    /* Light validation so we don't write half-empty docs. */
    if (!topic.title.trim()) {
      toast.error("Title is required.");
      return;
    }
    if (!topic.description.trim()) {
      toast.error("Description is required.");
      return;
    }
    if (!topic.bannerUrl.trim()) {
      toast.error("Banner image is required.");
      return;
    }
    /* Either lessons OR a legacy button URL must be set — when both
       are blank there's nothing to show the user. Lessons take
       precedence at render time. */
    const hasLessons = (topic.lessons?.length ?? 0) > 0;
    if (!hasLessons && !topic.buttonUrl.trim()) {
      toast.error("Add at least one lesson, or set a fallback button URL.");
      return;
    }
    setSavingId(topic.id);
    try {
      await upsertUniversityTopic({
        ...topic,
        title: topic.title.trim(),
        description: topic.description.trim(),
        category: topic.category.trim() || "General",
        buttonText: topic.buttonText.trim() || "Start Lessons",
        buttonUrl: topic.buttonUrl.trim(),
        updatedAt: Date.now(),
      });
      setDirtyIds((s) => {
        const next = new Set(s);
        next.delete(topic.id);
        return next;
      });
      toast.success(`Saved "${topic.title}"`);
    } catch {
      toast.error("Couldn't save — check Firestore rules.");
    } finally {
      setSavingId(null);
    }
  };

  const removeTopic = async (topic: UniversityTopic) => {
    if (!confirm(`Delete "${topic.title || "Untitled"}"? This can't be undone.`))
      return;
    setSavingId(topic.id);
    try {
      await deleteUniversityTopic(topic.id);
      setTopics((prev) => prev.filter((t) => t.id !== topic.id));
      setDirtyIds((s) => {
        const next = new Set(s);
        next.delete(topic.id);
        return next;
      });
      toast.success("Topic deleted.");
    } catch {
      toast.error("Couldn't delete.");
    } finally {
      setSavingId(null);
    }
  };

  /* Sort topics by sortOrder (asc) for the editor list to match
     what users see on the front-end. */
  const sorted = [...topics].sort((a, b) => a.sortOrder - b.sortOrder);

  /* ── Drag-and-drop reorder ──
     Pointer = desktop mouse + trackpad; Touch = mobile/tablet; Keyboard
     = accessibility (Space to pick up, Arrow to move, Space to drop).
     A small activation distance prevents the drag from firing on
     accidental clicks (e.g. when the admin meant to click a field). */
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 8 },
    }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = sorted.findIndex((t) => t.id === active.id);
    const newIndex = sorted.findIndex((t) => t.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;

    /* Reorder the visual list, then re-assign sortOrder as 10, 20, 30…
       so there's always room to insert a topic between two existing
       ones later without re-rolling the whole list. */
    const next = arrayMove(sorted, oldIndex, newIndex).map((t, i) => ({
      ...t,
      sortOrder: (i + 1) * 10,
    }));

    /* Apply locally first for snappy UI. */
    setTopics(next);

    /* Persist every topic whose sortOrder changed. The set is bounded
       by the visible topic count (admin scale: dozens not thousands),
       so parallel single-doc writes are fine — no batch needed. */
    const changed = next.filter((t, i) => t.sortOrder !== sorted[i]?.sortOrder
      || t.id !== sorted[i]?.id);
    try {
      await Promise.all(
        changed.map((t) =>
          upsertUniversityTopic({ ...t, updatedAt: Date.now() }),
        ),
      );
      toast.success("Order saved.");
    } catch {
      toast.error("Couldn't save the new order — try again.");
      /* Roll back the local change on failure. */
      setTopics(sorted);
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">
            Credibly University
          </h1>
          <p className="text-sm text-white/45">
            Manage training topic cards shown to users on /university.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={load}
            loading={loading}
            leftIcon={<RefreshCw className="h-3.5 w-3.5" />}
          >
            Refresh
          </Button>
          <Button onClick={addTopic} leftIcon={<Plus className="h-4 w-4" />}>
            New topic
          </Button>
        </div>
      </div>

      {loading && topics.length === 0 ? (
        <Card className="flex h-40 items-center justify-center text-sm text-white/40">
          Loading topics…
        </Card>
      ) : sorted.length === 0 ? (
        <Card className="flex flex-col items-center justify-center gap-3 p-10 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/[0.04]">
            <GraduationCap className="h-6 w-6 text-white/30" />
          </span>
          <p className="text-sm font-medium text-white">No topics yet</p>
          <p className="max-w-sm text-xs text-white/45">
            Click <strong>New topic</strong> to create your first lesson card.
          </p>
        </Card>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={sorted.map((t) => t.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-4">
              {sorted.map((topic) => (
                <TopicEditor
                  key={topic.id}
                  topic={topic}
                  plans={plans}
                  dirty={dirtyIds.has(topic.id)}
                  saving={savingId === topic.id}
                  onChange={(patch) => patchTopic(topic.id, patch)}
                  onSave={() => saveTopic(topic)}
                  onDelete={() => removeTopic(topic)}
                  ownerUid={account?.uid ?? "admin"}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}

/* ── Per-topic editor card ── */

function TopicEditor({
  topic,
  plans,
  dirty,
  saving,
  onChange,
  onSave,
  onDelete,
  ownerUid,
}: {
  topic: UniversityTopic;
  plans: Plan[];
  dirty: boolean;
  saving: boolean;
  onChange: (patch: Partial<UniversityTopic>) => void;
  onSave: () => void;
  onDelete: () => void;
  ownerUid: string;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  /* Topic cards are COLLAPSED by default so the admin can see 6-8
     topics at a glance instead of scrolling through one huge editor
     per topic. Newly-created topics (no title yet) auto-expand so
     the admin can fill them in immediately — otherwise an empty
     card with just "Untitled" would be confusing. */
  const [expanded, setExpanded] = useState(() => !topic.title.trim());

  /* When a fresh blank topic gets typed into, keep it expanded — but
     don't force-collapse a card the admin manually opened either. */

  /* Drag listener target is now ONLY the grip icon, not the whole
     header strip — so the other buttons (expand, save, delete) in
     the compact header are clickable. */
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: topic.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
    zIndex: isDragging ? 10 : "auto",
  };

  const lessonCount = topic.lessons?.length ?? 0;

  const onBannerFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Banner must be under 5MB.");
      return;
    }
    setUploading(true);
    try {
      const url = await uploadImage(ownerUid, file, "university");
      onChange({ bannerUrl: url });
      toast.success("Banner uploaded.");
    } catch {
      toast.error("Upload failed — try again.");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const togglePlan = (planId: PlanId) => {
    const set = new Set(topic.allowedPlans);
    if (set.has(planId)) set.delete(planId);
    else set.add(planId);
    onChange({ allowedPlans: Array.from(set) });
  };

  return (
    <div ref={setNodeRef} style={style}>
      <Card
        className={cn(
          /* No vertical padding on the Card itself anymore — the
             compact header brings its own padding so the closed
             state stays as short as physically possible. */
          "overflow-hidden p-0",
          topic.active
            ? "border border-white/[0.06]"
            : "border border-gold-400/30 bg-gold-400/[0.02]",
          isDragging && "ring-2 ring-electric-500/50",
        )}
      >
        {/* ── Compact header row — ALWAYS visible ──
            One-line summary of the topic so the admin can scan a list
            of 6-8 topics without scrolling. Banner thumbnail + title +
            lesson count + status badges + Save + expand + delete all
            fit on a single row at desktop width. Tap anywhere in the
            non-control area (title + thumb) to expand/collapse. */}
        <div
          className={cn(
            "flex items-center gap-2 border-b border-white/[0.06] bg-white/[0.02] px-3 py-2",
            !expanded && "border-b-transparent",
          )}
        >
          {/* Drag handle — listener target is just this button, so the
              other controls stay clickable. */}
          <button
            type="button"
            {...attributes}
            {...listeners}
            aria-label="Drag to reorder"
            className="cursor-grab rounded-md p-1 text-white/30 hover:text-white/65 active:cursor-grabbing"
          >
            <GripVertical className="h-4 w-4" />
          </button>

          {/* Banner thumbnail — small enough to scan, big enough to
              recognize at a glance. Click to expand. */}
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="flex h-9 w-16 shrink-0 items-center justify-center overflow-hidden rounded border border-white/10 bg-white/[0.04]"
            aria-label={expanded ? "Collapse topic" : "Expand topic"}
          >
            {topic.bannerUrl ? (
              <img
                src={topic.bannerUrl}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : (
              <ImagePlus className="h-3.5 w-3.5 text-white/30" />
            )}
          </button>

          {/* Title + meta — clickable area to expand. Truncates so long
              titles don't push the controls off-row. */}
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="min-w-0 flex-1 text-left"
          >
            <p
              className={cn(
                "truncate text-sm font-semibold",
                topic.title ? "text-white" : "italic text-white/35",
              )}
            >
              {topic.title || "Untitled topic"}
            </p>
            <p className="truncate text-[10px] text-white/40">
              {topic.category || "Uncategorised"} · #{topic.sortOrder}
              {lessonCount > 0 && ` · ${lessonCount} lesson${lessonCount === 1 ? "" : "s"}`}
            </p>
          </button>

          {/* Status pills — hidden on narrow mobile to keep the row tidy. */}
          <div className="hidden items-center gap-1.5 sm:flex">
            <Badge tone={topic.active ? "jade" : "gold"}>
              {topic.active ? "Active" : "Draft"}
            </Badge>
            {dirty && (
              <span className="rounded-md bg-electric-500/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-electric-300">
                Unsaved
              </span>
            )}
          </div>

          {/* Save — available even when collapsed so the admin can
              tap-edit-tap-save without an extra expand step. Greys out
              when there's nothing to save. */}
          <Button
            size="sm"
            variant="outline"
            onClick={onSave}
            loading={saving}
            disabled={saving || !dirty}
            leftIcon={<Save className="h-3.5 w-3.5" />}
          >
            {dirty ? "Save" : "Saved"}
          </Button>

          {/* Expand toggle */}
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            aria-label={expanded ? "Collapse" : "Expand"}
            className="rounded-md p-1.5 text-white/40 transition-colors hover:bg-white/[0.05] hover:text-white"
          >
            {expanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>

          {/* Delete — always visible because it's destructive enough
              that we want it discoverable, not buried under a chevron. */}
          <button
            type="button"
            onClick={onDelete}
            disabled={saving}
            aria-label="Delete topic"
            className="rounded-md p-1.5 text-white/30 hover:bg-red-500/10 hover:text-red-400 disabled:opacity-40"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>

        {/* ── Expanded editor body — only rendered when open ── */}
        {expanded && (
          <div className="grid gap-5 p-5 lg:grid-cols-[280px,1fr]">
        {/* Banner uploader */}
        <div>
          <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-white/40">
            Banner
          </label>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="relative flex aspect-video w-full items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-white/[0.03] transition-colors hover:border-electric-500/40"
          >
            {topic.bannerUrl ? (
              <img
                src={topic.bannerUrl}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex flex-col items-center gap-2 text-white/40">
                <ImagePlus className="h-8 w-8" />
                <span className="text-xs">Click to upload (16:9)</span>
              </div>
            )}
            {uploading && (
              <span className="absolute inset-0 flex items-center justify-center bg-black/60">
                <Loader2 className="h-5 w-5 animate-spin text-white" />
              </span>
            )}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={onBannerFile}
            className="hidden"
          />
          {topic.bannerUrl && (
            <button
              type="button"
              onClick={() => onChange({ bannerUrl: "" })}
              className="mt-2 flex items-center gap-1 text-[11px] text-red-300/80 hover:text-red-300"
            >
              <Trash2 className="h-3 w-3" />
              Remove banner
            </button>
          )}
        </div>

        {/* Fields */}
        <div className="space-y-3">
          <Input
            label="Title"
            value={topic.title}
            onChange={(e) => onChange({ title: e.target.value })}
            placeholder="e.g. Build your first funnel in 5 minutes"
          />

          <div>
            <label className="mb-1.5 block text-xs font-medium text-white/55">
              Description / subtitle
            </label>
            <textarea
              value={topic.description}
              onChange={(e) => onChange({ description: e.target.value })}
              placeholder="One or two sentences — appears under the title on the card."
              rows={2}
              className="w-full rounded-xl border border-white/10 bg-white/[0.03] p-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-electric-500/40"
            />
          </div>

          <Input
            label="Category"
            value={topic.category}
            onChange={(e) => onChange({ category: e.target.value })}
            placeholder="Getting Started"
            hint="Topics are grouped by category on the user page."
          />

          {/* Fallback button — used only when the topic has NO lessons.
              For new topics, leave both blank and add lessons below. */}
          <details className="rounded-xl border border-white/[0.07] bg-white/[0.02]">
            <summary className="cursor-pointer px-3 py-2 text-[11px] font-medium uppercase tracking-wider text-white/40 hover:text-white/65">
              Legacy fallback button (used only if no lessons added)
            </summary>
            <div className="grid gap-3 px-3 pb-3 sm:grid-cols-2">
              <Input
                label="Button text"
                value={topic.buttonText}
                onChange={(e) => onChange({ buttonText: e.target.value })}
                placeholder="Start Lessons"
              />
              <Input
                label="Button URL"
                value={topic.buttonUrl}
                onChange={(e) => onChange({ buttonUrl: e.target.value })}
                placeholder="https://www.crediblyai.com/dan/welcome-funnel"
              />
            </div>
          </details>

          {/* Lessons editor — the heart of the in-app player UX. Each
              lesson holds a video URL, body notes, optional downloads,
              and a free-preview flag. Order is up/down buttons rather
              than drag-and-drop to keep this nested editor simple (the
              outer DnD is already drag-heavy). */}
          <LessonsEditor
            lessons={topic.lessons ?? []}
            onChange={(next) => onChange({ lessons: next })}
          />

          {/* Plan visibility */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-white/55">
              Visible to plans
            </label>
            <div className="flex flex-wrap gap-1.5">
              {plans.map((p) => {
                const on = topic.allowedPlans.includes(p.id);
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => togglePlan(p.id)}
                    className={
                      on
                        ? "rounded-lg border border-electric-500/50 bg-electric-500/15 px-2.5 py-1 text-xs font-medium text-electric-300"
                        : "rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs font-medium text-white/55 hover:bg-white/[0.08]"
                    }
                  >
                    {p.name}
                  </button>
                );
              })}
            </div>
            <p className="mt-1 text-[11px] text-white/35">
              {topic.allowedPlans.length === 0
                ? "Visible to ALL users (no plan filter)."
                : `Visible only to: ${topic.allowedPlans
                    .map((id) => plans.find((p) => p.id === id)?.name ?? id)
                    .join(", ")}.`}
            </p>
          </div>

          {/* Active toggle — the Save button now lives in the
              compact header so it stays reachable while collapsed. */}
          <div className="flex items-center gap-3 border-t border-white/[0.06] pt-3">
            <label className="flex items-center gap-2 text-xs text-white/65">
              <input
                type="checkbox"
                checked={topic.active}
                onChange={(e) => onChange({ active: e.target.checked })}
                className="h-4 w-4 cursor-pointer rounded border-white/20 bg-white/[0.04] accent-electric-500"
              />
              Show on /university (uncheck to hide without deleting)
            </label>
          </div>
        </div>
        </div>
        )}
      </Card>
    </div>
  );
}

/* ── Lessons editor (one per topic) ─────────────────────────────── */

/**
 * Lessons live INLINE on the topic doc (no subcollection) — at the
 * typical 5-10 lessons per topic this keeps the user-facing page to a
 * single Firestore read for the entire course.
 */
function LessonsEditor({
  lessons,
  onChange,
}: {
  lessons: UniversityLesson[];
  onChange: (next: UniversityLesson[]) => void;
}) {
  const addLesson = () => {
    const maxSort = lessons.reduce(
      (m, l) => (l.sortOrder > m ? l.sortOrder : m),
      0,
    );
    const blank: UniversityLesson = {
      id: makeId("lesson"),
      title: "",
      description: "",
      videoUrl: "",
      body: "",
      durationMinutes: undefined,
      resources: [],
      /* First lesson defaults to free preview — it's the
         conversion hook for everything else. Subsequent lessons
         default to gated. */
      freePreview: lessons.length === 0,
      sortOrder: maxSort + 10,
    };
    onChange([...lessons, blank]);
  };

  const updateLesson = (idx: number, patch: Partial<UniversityLesson>) => {
    onChange(lessons.map((l, i) => (i === idx ? { ...l, ...patch } : l)));
  };

  const removeLesson = (idx: number) => {
    if (!confirm("Remove this lesson? This can't be undone.")) return;
    onChange(lessons.filter((_, i) => i !== idx));
  };

  const moveLesson = (idx: number, direction: -1 | 1) => {
    const target = idx + direction;
    if (target < 0 || target >= lessons.length) return;
    const next = [...lessons];
    [next[idx], next[target]] = [next[target], next[idx]];
    /* Re-stamp sortOrders to keep the saved order in sync with the UI. */
    onChange(next.map((l, i) => ({ ...l, sortOrder: (i + 1) * 10 })));
  };

  return (
    <div className="rounded-xl border border-electric-500/15 bg-electric-500/[0.03] p-3">
      <div className="mb-3 flex items-center justify-between">
        <label className="flex items-center gap-1.5 text-xs font-semibold text-white">
          <Film className="h-3.5 w-3.5 text-electric-300" />
          Lessons
          {lessons.length > 0 && (
            <span className="rounded-full bg-electric-500/15 px-1.5 text-[10px] text-electric-300">
              {lessons.length}
            </span>
          )}
        </label>
        <Button
          size="sm"
          variant="outline"
          onClick={addLesson}
          leftIcon={<Plus className="h-3 w-3" />}
        >
          Add lesson
        </Button>
      </div>

      {lessons.length === 0 ? (
        <div className="rounded-lg border border-dashed border-white/10 py-5 text-center">
          <p className="text-xs text-white/45">
            No lessons yet. Add one to enable the in-app player.
          </p>
          <p className="mt-1 text-[10px] text-white/30">
            Or leave empty and rely on the legacy button URL above.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {lessons.map((lesson, idx) => (
            <LessonRow
              key={lesson.id}
              lesson={lesson}
              index={idx}
              total={lessons.length}
              onChange={(patch) => updateLesson(idx, patch)}
              onRemove={() => removeLesson(idx)}
              onMoveUp={() => moveLesson(idx, -1)}
              onMoveDown={() => moveLesson(idx, 1)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Single lesson row ──────────────────────────────────────────── */

function LessonRow({
  lesson,
  index,
  total,
  onChange,
  onRemove,
  onMoveUp,
  onMoveDown,
}: {
  lesson: UniversityLesson;
  index: number;
  total: number;
  onChange: (patch: Partial<UniversityLesson>) => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  /* Live preview of the video URL — if parse fails, hint to the admin
     so they can fix typos before the user sees a blank player. */
  const parsed = lesson.videoUrl ? normalizeVideoUrl(lesson.videoUrl) : null;
  const videoStatus = lesson.videoUrl
    ? parsed
      ? `${parsed.provider.toUpperCase()} embed ready`
      : "URL not recognised — paste a YouTube, Adilo, Vimeo or .mp4 link"
    : "No video yet";

  const addResource = () => {
    const next: UniversityResource = {
      id: makeId("res"),
      label: "",
      url: "",
    };
    onChange({ resources: [...(lesson.resources ?? []), next] });
  };

  const updateResource = (
    rIdx: number,
    patch: Partial<UniversityResource>,
  ) => {
    onChange({
      resources: (lesson.resources ?? []).map((r, i) =>
        i === rIdx ? { ...r, ...patch } : r,
      ),
    });
  };

  const removeResource = (rIdx: number) => {
    onChange({
      resources: (lesson.resources ?? []).filter((_, i) => i !== rIdx),
    });
  };

  return (
    <div className="rounded-lg border border-white/[0.07] bg-white/[0.02] p-3">
      {/* Header row — index, title, reorder + delete */}
      <div className="mb-2 flex items-center gap-2">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-white/[0.06] text-[11px] font-semibold text-white/55">
          {index + 1}
        </span>
        <input
          value={lesson.title}
          onChange={(e) => onChange({ title: e.target.value })}
          placeholder="Lesson title — e.g. Intro: Mindset reset"
          className="h-8 flex-1 rounded border border-white/[0.07] bg-white/[0.03] px-2 text-xs text-white outline-none focus:border-electric-500/40"
        />
        <button
          type="button"
          onClick={onMoveUp}
          disabled={index === 0}
          aria-label="Move up"
          className="rounded p-1 text-white/30 hover:text-white/65 disabled:opacity-25"
        >
          <ArrowUp className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={onMoveDown}
          disabled={index === total - 1}
          aria-label="Move down"
          className="rounded p-1 text-white/30 hover:text-white/65 disabled:opacity-25"
        >
          <ArrowDown className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={onRemove}
          aria-label="Remove lesson"
          className="rounded p-1 text-white/25 transition-colors hover:bg-red-500/10 hover:text-red-400"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Video URL */}
      <div className="mb-2">
        <label className="mb-1 flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-white/40">
          <Film className="h-3 w-3" />
          Video URL (YouTube, Adilo, Vimeo, or .mp4)
        </label>
        <input
          value={lesson.videoUrl ?? ""}
          onChange={(e) => onChange({ videoUrl: e.target.value })}
          placeholder="https://youtu.be/… or https://adilo.bigcommand.com/watch/…"
          className="h-8 w-full rounded border border-white/[0.07] bg-white/[0.03] px-2 text-xs text-white outline-none focus:border-electric-500/40"
        />
        <p
          className={cn(
            "mt-1 text-[10px]",
            parsed
              ? "text-jade-300"
              : lesson.videoUrl
                ? "text-amber-300"
                : "text-white/30",
          )}
        >
          {videoStatus}
        </p>
      </div>

      {/* Description (1-liner shown next to title in player) + duration */}
      <div className="mb-2 grid gap-2 sm:grid-cols-[1fr_120px]">
        <input
          value={lesson.description ?? ""}
          onChange={(e) => onChange({ description: e.target.value })}
          placeholder="One-line description (optional)"
          className="h-8 w-full rounded border border-white/[0.07] bg-white/[0.03] px-2 text-xs text-white outline-none focus:border-electric-500/40"
        />
        <input
          type="number"
          min={0}
          value={lesson.durationMinutes ?? ""}
          onChange={(e) =>
            onChange({
              durationMinutes: e.target.value
                ? Number(e.target.value)
                : undefined,
            })
          }
          placeholder="Duration (min)"
          className="h-8 w-full rounded border border-white/[0.07] bg-white/[0.03] px-2 text-xs text-white outline-none focus:border-electric-500/40"
        />
      </div>

      {/* Body / notes */}
      <div className="mb-2">
        <label className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-white/40">
          Lesson notes (shown below the video)
        </label>
        <textarea
          value={lesson.body ?? ""}
          onChange={(e) => onChange({ body: e.target.value })}
          placeholder="Key takeaways, action steps, anything you want learners to read…"
          rows={4}
          className="w-full resize-none rounded border border-white/[0.07] bg-white/[0.03] p-2 text-xs leading-relaxed text-white outline-none placeholder:text-white/25 focus:border-electric-500/40"
        />
      </div>

      {/* Free preview toggle */}
      <label className="mb-2 flex items-center gap-2 text-[11px] text-white/65">
        <input
          type="checkbox"
          checked={lesson.freePreview}
          onChange={(e) => onChange({ freePreview: e.target.checked })}
          className="h-3.5 w-3.5 cursor-pointer rounded border-white/20 bg-white/[0.04] accent-electric-500"
        />
        {lesson.freePreview ? (
          <span className="flex items-center gap-1 text-jade-300">
            <Eye className="h-3 w-3" />
            Free preview — anyone can watch
          </span>
        ) : (
          <span className="flex items-center gap-1 text-white/55">
            <Lock className="h-3 w-3" />
            Locked — only plans listed on this topic can watch
          </span>
        )}
      </label>

      {/* Downloads */}
      <details className="rounded border border-white/[0.05] bg-white/[0.02]">
        <summary className="cursor-pointer px-2 py-1.5 text-[10px] font-medium uppercase tracking-wider text-white/40 hover:text-white/65">
          <Paperclip className="mr-1 inline h-3 w-3" />
          Downloads ({(lesson.resources ?? []).length})
        </summary>
        <div className="space-y-1.5 p-2">
          {(lesson.resources ?? []).map((r, rIdx) => (
            <div key={r.id} className="flex items-center gap-1.5">
              <input
                value={r.label}
                onChange={(e) =>
                  updateResource(rIdx, { label: e.target.value })
                }
                placeholder="Script PDF"
                className="h-7 w-32 rounded border border-white/[0.07] bg-white/[0.03] px-2 text-[11px] text-white outline-none focus:border-electric-500/40"
              />
              <input
                value={r.url}
                onChange={(e) =>
                  updateResource(rIdx, { url: e.target.value })
                }
                placeholder="https://…"
                className="h-7 flex-1 rounded border border-white/[0.07] bg-white/[0.03] px-2 text-[11px] text-white outline-none focus:border-electric-500/40"
              />
              <button
                type="button"
                onClick={() => removeResource(rIdx)}
                aria-label="Remove download"
                className="rounded p-1 text-white/25 hover:text-red-400"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={addResource}
            className="flex items-center gap-1 rounded px-2 py-1 text-[10px] font-medium text-electric-300 hover:bg-electric-500/10"
          >
            <Link2 className="h-3 w-3" />
            Add download link
          </button>
        </div>
      </details>
    </div>
  );
}
