"use client";

/**
 * Training editor — full tabbed editor for Session 2.
 *
 * Four tabs:
 *   - Content       — title, description, banner, lessons (up to 15)
 *   - Distribution  — public/team/paid mode, codes, paid settings,
 *                     pipeline auto-grant
 *   - Learners      — list of users who unlocked this training, with
 *                     per-learner progress summaries
 *   - Clones        — list of other leaders who cloned this training
 *                     (vanity metrics, no PII about their downline)
 *
 * Save model: explicit Save button at the top of the Content tab for
 * the heavy fields (title / description / banner / lessons). Code
 * regeneration, distribution-mode toggles and paid-mode tweaks save
 * immediately so the UI never holds dangerous unsaved state for
 * those one-off actions.
 */

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  CheckCircle2,
  Copy,
  Eye,
  Film,
  GraduationCap,
  Link2,
  Lock,
  Paperclip,
  Plus,
  RefreshCw,
  Save,
  Trash2,
  Users,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { PageHeader } from "@/components/common/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { FullScreenLoader } from "@/components/ui/Spinner";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ImageUploadField } from "@/components/profile/ImageUploadField";
import {
  deleteTraining,
  getTraining,
  listPipelinesForUser,
  listTrainingAccessForTraining,
  listTrainingClones,
  listTrainingProgress,
  regenerateTrainingCode,
  updateTraining,
} from "@/lib/firebase/firestore";
import { normalizeVideoUrl } from "@/lib/video";
import { cn, timeAgo, uid } from "@/lib/utils";
import { toast } from "@/store/uiStore";
import type {
  Training,
  TrainingAccess,
  TrainingDistribution,
  TrainingLesson,
  UniversityResource,
} from "@/types";

const MAX_LESSONS = 15;

type TabKey = "content" | "distribution" | "learners" | "clones";

export default function TrainingEditorPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const { account, loading: authLoading } = useAuth();

  const [training, setTraining] = useState<Training | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabKey>("content");

  /* Editable content state — held separately from `training` so the
     user can make multiple edits across the form, see a "Save"
     reminder, then commit them in one Firestore write. */
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [bannerUrl, setBannerUrl] = useState("");
  const [lessons, setLessons] = useState<TrainingLesson[]>([]);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    if (!params.id) return;
    setLoading(true);
    const t = await getTraining(params.id);
    setTraining(t);
    if (t) {
      setTitle(t.title);
      setDescription(t.description ?? "");
      setBannerUrl(t.bannerUrl ?? "");
      setLessons(t.lessons ?? []);
      setDirty(false);
    }
    setLoading(false);
  }, [params.id]);

  useEffect(() => {
    load();
  }, [load]);

  if (authLoading || loading) {
    return <FullScreenLoader label="Loading training…" />;
  }

  if (!training) {
    return (
      <div className="space-y-5">
        <PageHeader
          title="Training not found"
          subtitle="It may have been deleted or you don't have access."
        />
        <Button href="/trainings" variant="outline">
          ← Back to trainings
        </Button>
      </div>
    );
  }

  if (account && training.ownerId !== account.uid) {
    return (
      <div className="space-y-5">
        <PageHeader
          title="Not your training"
          subtitle="You can only edit trainings you own."
        />
        <Button href="/trainings" variant="outline">
          ← Back to trainings
        </Button>
      </div>
    );
  }

  /* Immediate-save handler for one-off field changes (status toggle,
     distribution mode, paid-mode settings, codes). Updates Firestore
     and the local training snapshot but does NOT touch the dirty
     flag for the content-tab fields. */
  const patchTraining = async (patch: Partial<Training>) => {
    try {
      await updateTraining(training.id, patch);
      setTraining((prev) => (prev ? { ...prev, ...patch } : prev));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed.");
    }
  };

  const handleSaveContent = async () => {
    setSaving(true);
    try {
      const patch: Partial<Training> = {
        title: title.trim() || "Untitled training",
        description,
        bannerUrl: bannerUrl || undefined,
        lessons,
      };
      await updateTraining(training.id, patch);
      setTraining((prev) => (prev ? { ...prev, ...patch } : prev));
      setDirty(false);
      toast.success("Saved.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  };

  const handlePublishToggle = () => {
    const next: Training["status"] =
      training.status === "published" ? "draft" : "published";
    patchTraining({ status: next });
    toast.success(
      next === "published" ? "Published — visitors can find it now." : "Reverted to draft.",
    );
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteTraining(training.id);
      toast.success("Training deleted.");
      router.push("/trainings");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed.");
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Button
            href="/trainings"
            variant="outline"
            size="sm"
            leftIcon={<ArrowLeft className="h-3.5 w-3.5" />}
          >
            Back
          </Button>
          <Badge tone={training.status === "published" ? "blue" : "neutral"}>
            {training.status === "published" ? "Published" : "Draft"}
          </Badge>
        </div>
        <Button
          size="sm"
          variant={training.status === "published" ? "outline" : "primary"}
          onClick={handlePublishToggle}
        >
          {training.status === "published" ? "Unpublish" : "Publish"}
        </Button>
      </div>

      <PageHeader
        title={training.title}
        subtitle={`/${account?.username ?? "yourname"}/t/${training.slug}`}
      />

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 border-b border-white/[0.07]">
        {(
          [
            { key: "content" as const, label: "Content" },
            { key: "distribution" as const, label: "Distribution" },
            { key: "learners" as const, label: "Learners" },
            { key: "clones" as const, label: "Clones" },
          ]
        ).map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={cn(
              "relative -mb-px px-3 py-2 text-sm font-medium transition-colors",
              tab === t.key
                ? "text-white"
                : "text-white/45 hover:text-white/75",
            )}
          >
            {t.label}
            {tab === t.key && (
              <span className="absolute inset-x-0 bottom-0 h-0.5 bg-electric-400" />
            )}
          </button>
        ))}
      </div>

      {tab === "content" && (
        <ContentTab
          title={title}
          setTitle={(v) => {
            setTitle(v);
            setDirty(true);
          }}
          description={description}
          setDescription={(v) => {
            setDescription(v);
            setDirty(true);
          }}
          bannerUrl={bannerUrl}
          setBannerUrl={(v) => {
            setBannerUrl(v);
            setDirty(true);
          }}
          lessons={lessons}
          setLessons={(v) => {
            setLessons(v);
            setDirty(true);
          }}
          dirty={dirty}
          saving={saving}
          onSave={handleSaveContent}
        />
      )}
      {tab === "distribution" && (
        <DistributionTab training={training} onPatch={patchTraining} />
      )}
      {tab === "learners" && <LearnersTab trainingId={training.id} />}
      {tab === "clones" && <ClonesTab training={training} />}

      {/* Danger zone — only on the Content tab so users on Learners /
          Clones don't accidentally trip it. */}
      {tab === "content" && (
        <Card className="space-y-2 border-red-500/15 bg-red-500/[0.02] p-4">
          <p className="text-[10px] font-medium uppercase tracking-wider text-red-300/80">
            Danger zone
          </p>
          <p className="text-xs text-white/55">
            Deleting removes this training and revokes every learner&apos;s
            access. Cannot be undone.
          </p>
          <Button
            variant="outline"
            onClick={() => setConfirmDelete(true)}
            leftIcon={<Trash2 className="h-3.5 w-3.5" />}
            className="!border-red-500/30 !text-red-300 hover:!bg-red-500/10"
          >
            Delete training
          </Button>
        </Card>
      )}

      <ConfirmDialog
        open={confirmDelete}
        loading={deleting}
        onCancel={() => !deleting && setConfirmDelete(false)}
        onConfirm={handleDelete}
        title="Delete this training?"
        confirmLabel="Delete training"
        body={
          <p>
            <span className="font-medium text-white">{training.title}</span>{" "}
            and every learner&apos;s access record will be permanently
            removed. This can&apos;t be undone.
          </p>
        }
      />
    </div>
  );
}

/* ============================================================
   CONTENT TAB
   ============================================================ */

function ContentTab({
  title,
  setTitle,
  description,
  setDescription,
  bannerUrl,
  setBannerUrl,
  lessons,
  setLessons,
  dirty,
  saving,
  onSave,
}: {
  title: string;
  setTitle: (v: string) => void;
  description: string;
  setDescription: (v: string) => void;
  bannerUrl: string;
  setBannerUrl: (v: string) => void;
  lessons: TrainingLesson[];
  setLessons: (v: TrainingLesson[]) => void;
  dirty: boolean;
  saving: boolean;
  onSave: () => void;
}) {
  const addLesson = () => {
    if (lessons.length >= MAX_LESSONS) {
      toast.error(`Max ${MAX_LESSONS} lessons per training.`);
      return;
    }
    const next: TrainingLesson = {
      id: uid("lesson"),
      title: "",
      videoUrl: "",
      body: "",
      freePreview: lessons.length === 0, // first lesson auto-set to free preview
      sortOrder: lessons.length,
    };
    setLessons([...lessons, next]);
  };
  const updateLesson = (idx: number, patch: Partial<TrainingLesson>) => {
    setLessons(lessons.map((l, i) => (i === idx ? { ...l, ...patch } : l)));
  };
  const removeLesson = (idx: number) => {
    setLessons(lessons.filter((_, i) => i !== idx));
  };
  const moveLesson = (idx: number, dir: -1 | 1) => {
    const target = idx + dir;
    if (target < 0 || target >= lessons.length) return;
    const next = [...lessons];
    [next[idx], next[target]] = [next[target], next[idx]];
    setLessons(next.map((l, i) => ({ ...l, sortOrder: i })));
  };

  return (
    <div className="space-y-4">
      {/* Save reminder */}
      {dirty && (
        <div className="sticky top-2 z-10 flex items-center justify-between gap-3 rounded-xl border border-electric-500/30 bg-electric-500/[0.08] px-4 py-2.5 text-xs text-electric-200 backdrop-blur">
          <span>You have unsaved changes.</span>
          <Button
            size="sm"
            onClick={onSave}
            loading={saving}
            leftIcon={<Save className="h-3.5 w-3.5" />}
          >
            Save
          </Button>
        </div>
      )}

      {/* Details */}
      <Card className="space-y-3 p-4">
        <p className="text-[10px] font-medium uppercase tracking-wider text-white/45">
          Details
        </p>
        <div>
          <label className="mb-1 block text-xs font-medium text-white/55">
            Title
          </label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Team Onboarding 101"
            className="h-10 w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-electric-500/60"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-white/55">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="What will learners get from this training?"
            className="w-full resize-none rounded-lg border border-white/10 bg-white/[0.03] p-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-electric-500/60"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-white/55">
            Banner image
          </label>
          <ImageUploadField
            value={bannerUrl}
            onChange={(url) => setBannerUrl(url ?? "")}
            folder="media"
          />
        </div>
      </Card>

      {/* Lessons */}
      <Card className="space-y-3 p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-wider text-white/45">
              Lessons
            </p>
            <p className="mt-0.5 text-xs text-white/55">
              {lessons.length} of {MAX_LESSONS} lessons
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={addLesson}
            disabled={lessons.length >= MAX_LESSONS}
            leftIcon={<Plus className="h-3.5 w-3.5" />}
          >
            Add lesson
          </Button>
        </div>

        {lessons.length === 0 ? (
          <div className="rounded-xl border border-dashed border-white/10 p-6 text-center text-xs text-white/45">
            No lessons yet. Add your first lesson — a 10-minute intro video is a
            great starting point.
          </div>
        ) : (
          <div className="space-y-2.5">
            {lessons.map((lesson, idx) => (
              <LessonRow
                key={lesson.id}
                lesson={lesson}
                index={idx}
                total={lessons.length}
                onChange={(p) => updateLesson(idx, p)}
                onRemove={() => removeLesson(idx)}
                onMoveUp={() => moveLesson(idx, -1)}
                onMoveDown={() => moveLesson(idx, 1)}
              />
            ))}
          </div>
        )}
      </Card>

      {/* Bottom save (matches sticky one above) */}
      {dirty && (
        <div className="flex justify-end">
          <Button
            onClick={onSave}
            loading={saving}
            leftIcon={<Save className="h-3.5 w-3.5" />}
          >
            Save changes
          </Button>
        </div>
      )}
    </div>
  );
}

function LessonRow({
  lesson,
  index,
  total,
  onChange,
  onRemove,
  onMoveUp,
  onMoveDown,
}: {
  lesson: TrainingLesson;
  index: number;
  total: number;
  onChange: (patch: Partial<TrainingLesson>) => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  const parsed = lesson.videoUrl ? normalizeVideoUrl(lesson.videoUrl) : null;
  const videoStatus = lesson.videoUrl
    ? parsed
      ? `${parsed.provider.toUpperCase()} embed ready`
      : "URL not recognised — paste a YouTube, Adilo, Vimeo or .mp4 link"
    : "No video yet";

  const addResource = () => {
    const next: UniversityResource = { id: uid("res"), label: "", url: "" };
    onChange({ resources: [...(lesson.resources ?? []), next] });
  };
  const updateResource = (rIdx: number, patch: Partial<UniversityResource>) => {
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
      <div className="mb-2 flex items-center gap-2">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-white/[0.06] text-[11px] font-semibold text-white/55">
          {index + 1}
        </span>
        <input
          value={lesson.title}
          onChange={(e) => onChange({ title: e.target.value })}
          placeholder="Lesson title"
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
            parsed ? "text-jade-300" : lesson.videoUrl ? "text-amber-300" : "text-white/30",
          )}
        >
          {videoStatus}
        </p>
      </div>

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
              durationMinutes: e.target.value ? Number(e.target.value) : undefined,
            })
          }
          placeholder="Duration (min)"
          className="h-8 w-full rounded border border-white/[0.07] bg-white/[0.03] px-2 text-xs text-white outline-none focus:border-electric-500/40"
        />
      </div>

      <div className="mb-2">
        <label className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-white/40">
          Notes (shown below the video)
        </label>
        <textarea
          value={lesson.body ?? ""}
          onChange={(e) => onChange({ body: e.target.value })}
          placeholder="Key takeaways, action steps, anything you want learners to read…"
          rows={4}
          className="w-full resize-none rounded border border-white/[0.07] bg-white/[0.03] p-2 text-xs leading-relaxed text-white outline-none placeholder:text-white/25 focus:border-electric-500/40"
        />
      </div>

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
            Free preview — visible to non-learners on the public page
          </span>
        ) : (
          <span className="flex items-center gap-1 text-white/55">
            <Lock className="h-3 w-3" />
            Locked — only activated learners can watch
          </span>
        )}
      </label>

      <details className="rounded border border-white/[0.05] bg-white/[0.02]">
        <summary className="cursor-pointer px-2 py-1.5 text-[10px] font-medium uppercase tracking-wider text-white/40 hover:text-white/65">
          <Paperclip className="mr-1 inline h-3 w-3" />
          Downloads ({(lesson.resources ?? []).length})
        </summary>
        <div className="space-y-2 p-2">
          {(lesson.resources ?? []).map((r, rIdx) => (
            <div
              key={r.id}
              className="flex flex-col gap-1.5 rounded border border-white/[0.05] bg-white/[0.02] p-1.5 sm:flex-row sm:items-center sm:border-transparent sm:bg-transparent sm:p-0"
            >
              <input
                value={r.label}
                onChange={(e) => updateResource(rIdx, { label: e.target.value })}
                placeholder="Script PDF"
                className="h-7 rounded border border-white/[0.07] bg-white/[0.03] px-2 text-[11px] text-white outline-none focus:border-electric-500/40 sm:w-32"
              />
              <input
                value={r.url}
                onChange={(e) => updateResource(rIdx, { url: e.target.value })}
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

/* ============================================================
   DISTRIBUTION TAB
   ============================================================ */

function DistributionTab({
  training,
  onPatch,
}: {
  training: Training;
  onPatch: (patch: Partial<Training>) => Promise<void>;
}) {
  const [regeneratingShare, setRegeneratingShare] = useState(false);
  const [regeneratingActivation, setRegeneratingActivation] = useState(false);

  const copy = (code: string, label: string) => {
    navigator.clipboard.writeText(code).then(
      () => toast.success(`${label} copied.`),
      () => toast.error("Couldn't copy — copy it manually."),
    );
  };

  const regenerate = async (which: "share" | "activation") => {
    const setBusy = which === "share" ? setRegeneratingShare : setRegeneratingActivation;
    setBusy(true);
    try {
      const next = await regenerateTrainingCode(training.id, which);
      const patch =
        which === "share" ? { shareCode: next } : { activationCode: next };
      /* updateTraining already ran inside regenerate, so just mirror
         locally — don't double-write. */
      await onPatch(patch as Partial<Training>);
      toast.success(`New ${which} code generated.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't regenerate.");
    } finally {
      setBusy(false);
    }
  };

  const setMode = (mode: TrainingDistribution) => {
    if (mode === training.distribution) return;
    onPatch({ distribution: mode });
    toast.success(
      mode === "public"
        ? "Switched to public — anyone with the link can watch."
        : mode === "team"
          ? "Switched to team mode — learners need your activation code."
          : "Switched to paid mode — visitors must pay to unlock.",
    );
  };

  const codeOnlyDisplayed = training.distribution !== "public";

  return (
    <div className="space-y-4">
      {/* Mode selector */}
      <Card className="space-y-3 p-4">
        <p className="text-[10px] font-medium uppercase tracking-wider text-white/45">
          Who can watch this training?
        </p>
        <div className="space-y-2">
          <ModeRadio
            checked={training.distribution === "public"}
            onSelect={() => setMode("public")}
            title="🌍 Public"
            description="Anyone with the link can watch — no code needed. Best for marketing or lead-magnet trainings."
          />
          <ModeRadio
            checked={training.distribution === "team"}
            onSelect={() => setMode("team")}
            title="👥 My team"
            description="Free, but only people with your activation code can unlock. Best for onboarding your downline or students."
          />
          <ModeRadio
            checked={training.distribution === "paid"}
            onSelect={() => setMode("paid")}
            title="💳 For sale"
            description="Visitors pay you via GCash/Maya/bank, you approve from /payments, they get instant access. Best for paid courses."
          />
        </div>
      </Card>

      {/* Codes — relevant for team + paid modes (paid still uses
          activation code for the post-purchase unlock flow). */}
      {codeOnlyDisplayed && (
        <Card className="space-y-4 p-4">
          <p className="text-[10px] font-medium uppercase tracking-wider text-white/45">
            Codes
          </p>
          <CodeRow
            label="🔑 Activation code"
            hint="Give this to your downline. They use it to unlock the training; their progress reports to you."
            value={training.activationCode}
            onCopy={() => copy(training.activationCode, "Activation code")}
            onRegenerate={() => regenerate("activation")}
            busy={regeneratingActivation}
            primary
          />
          <CodeRow
            label="🔁 Share code"
            hint="Give this to OTHER LEADERS in your line. They use it to clone this training into their own account so they can track THEIR own downline."
            value={training.shareCode}
            onCopy={() => copy(training.shareCode, "Share code")}
            onRegenerate={() => regenerate("share")}
            busy={regeneratingShare}
          />
        </Card>
      )}

      {/* Paid-mode settings */}
      {training.distribution === "paid" && (
        <Card className="space-y-3 p-4">
          <p className="text-[10px] font-medium uppercase tracking-wider text-white/45">
            Paid mode settings
          </p>
          <div>
            <label className="mb-1 block text-xs font-medium text-white/55">
              Price (PHP)
            </label>
            <input
              type="number"
              min={0}
              value={training.price ?? ""}
              onChange={(e) =>
                onPatch({
                  price: e.target.value ? Number(e.target.value) : undefined,
                })
              }
              placeholder="e.g. 2499"
              className="h-10 w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-electric-500/60 sm:w-48"
            />
            <p className="mt-1 text-[11px] text-white/40">
              Buyers will see this on the public training page and pay via
              your GCash / Maya / bank methods configured on your profile.
              Approve receipts in <code>/payments</code> — if the buyer
              has a Credibly account on the same email, they unlock
              automatically.
            </p>
          </div>
        </Card>
      )}

      {/* Pipeline auto-grant — available for any mode. The trigger
          fires from moveLeadToStage when a lead enters the configured
          stage AND has an email matching a Credibly account. */}
      <AutoGrantBlock training={training} onPatch={onPatch} />
    </div>
  );
}

function AutoGrantBlock({
  training,
  onPatch,
}: {
  training: Training;
  onPatch: (patch: Partial<Training>) => Promise<void>;
}) {
  const { account } = useAuth();
  const [pipelines, setPipelines] = useState<PipelineSummary[]>([]);
  /* Lazy-load the owner's pipelines on mount. Failure is fine — the
     selector just stays empty and the user can configure later. */
  useEffect(() => {
    if (!account || account.uid === "demo") return;
    let cancelled = false;
    (async () => {
      const list = await listPipelinesForUser(account.uid).catch(() => []);
      if (!cancelled) {
        setPipelines(
          list.map((p) => ({
            id: p.id,
            name: p.name,
            stages: p.stages.map((s) => ({ id: s.id, name: s.name })),
          })),
        );
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [account]);

  const selectedPipeline = pipelines.find(
    (p) => p.id === training.autoGrantPipelineId,
  );

  return (
    <Card className="space-y-3 p-4">
      <div>
        <p className="text-[10px] font-medium uppercase tracking-wider text-white/45">
          Pipeline auto-grant (optional)
        </p>
        <p className="mt-1 text-xs text-white/55">
          Auto-unlock this training when a lead enters a specific
          pipeline stage. Works only if the lead&apos;s email matches
          a Credibly account.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-white/40">
            Pipeline
          </label>
          <select
            value={training.autoGrantPipelineId ?? ""}
            onChange={(e) =>
              onPatch({
                autoGrantPipelineId: e.target.value || undefined,
                /* Clear the stage when pipeline changes — old stage
                   id is no longer valid against the new pipeline. */
                autoGrantStageId: undefined,
              })
            }
            className="h-10 w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 text-sm text-white outline-none focus:border-electric-500/60"
          >
            <option value="">— None —</option>
            {pipelines.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-white/40">
            Stage
          </label>
          <select
            value={training.autoGrantStageId ?? ""}
            onChange={(e) =>
              onPatch({ autoGrantStageId: e.target.value || undefined })
            }
            disabled={!selectedPipeline}
            className="h-10 w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 text-sm text-white outline-none focus:border-electric-500/60 disabled:opacity-50"
          >
            <option value="">— Pick a stage —</option>
            {(selectedPipeline?.stages ?? []).map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      {training.autoGrantPipelineId && training.autoGrantStageId && (
        <Button
          size="sm"
          variant="outline"
          onClick={() =>
            onPatch({
              autoGrantPipelineId: undefined,
              autoGrantStageId: undefined,
            })
          }
        >
          Clear auto-grant
        </Button>
      )}
    </Card>
  );
}

/** Lightweight pipeline shape so we don't pull all the heavy fields. */
interface PipelineSummary {
  id: string;
  name: string;
  stages: { id: string; name: string }[];
}

function ModeRadio({
  checked,
  onSelect,
  title,
  description,
}: {
  checked: boolean;
  onSelect: () => void;
  title: string;
  description: string;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "flex w-full items-start gap-3 rounded-xl border p-3 text-left transition-colors",
        checked
          ? "border-electric-500/60 bg-electric-500/[0.08]"
          : "border-white/10 bg-white/[0.02] hover:border-white/20",
      )}
    >
      <span
        className={cn(
          "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border",
          checked ? "border-electric-400 bg-electric-500" : "border-white/25",
        )}
      >
        {checked && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-white">{title}</p>
        <p className="mt-0.5 text-xs leading-relaxed text-white/55">
          {description}
        </p>
      </div>
    </button>
  );
}

function CodeRow({
  label,
  hint,
  value,
  onCopy,
  onRegenerate,
  busy,
  primary,
}: {
  label: string;
  hint: string;
  value: string;
  onCopy: () => void;
  onRegenerate: () => void;
  busy: boolean;
  primary?: boolean;
}) {
  return (
    <div>
      <p className="mb-1 text-sm font-medium text-white">{label}</p>
      <p className="mb-2 text-xs text-white/45">{hint}</p>
      <div className="flex flex-wrap items-center gap-2">
        <code
          className={cn(
            "flex-1 truncate rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 font-mono text-sm",
            primary ? "text-electric-300" : "text-white/80",
          )}
        >
          {value}
        </code>
        <Button
          size="sm"
          variant="outline"
          onClick={onCopy}
          leftIcon={<Copy className="h-3.5 w-3.5" />}
        >
          Copy
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={onRegenerate}
          loading={busy}
          leftIcon={<RefreshCw className="h-3.5 w-3.5" />}
        >
          New
        </Button>
      </div>
    </div>
  );
}

/* ============================================================
   LEARNERS TAB
   ============================================================ */

function LearnersTab({ trainingId }: { trainingId: string }) {
  const [accesses, setAccesses] = useState<TrainingAccess[]>([]);
  const [loading, setLoading] = useState(true);
  /* Map of userId → completed lesson count, so each row shows live
     progress without us joining at query time. */
  const [progressByUser, setProgressByUser] = useState<Map<string, number>>(
    new Map(),
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const list = await listTrainingAccessForTraining(trainingId);
      if (cancelled) return;
      setAccesses(list);
      /* Fan out per-user progress reads. For the typical "30 learners"
         case this is fine; for 200+ we'd batch via a composite index. */
      const map = new Map<string, number>();
      await Promise.all(
        list.map(async (a) => {
          const p = await listTrainingProgress(a.userId, trainingId);
          map.set(a.userId, p.length);
        }),
      );
      if (!cancelled) setProgressByUser(map);
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [trainingId]);

  if (loading) {
    return (
      <Card className="p-6 text-center text-sm text-white/40">
        Loading learners…
      </Card>
    );
  }

  if (accesses.length === 0) {
    return (
      <Card className="p-8 text-center">
        <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-white/[0.05]">
          <Users className="h-6 w-6 text-white/40" />
        </span>
        <p className="text-sm font-medium text-white">No learners yet</p>
        <p className="mt-1 text-xs text-white/50">
          When someone activates this training with your code, they&apos;ll
          appear here with their progress.
        </p>
      </Card>
    );
  }

  return (
    <Card className="divide-y divide-white/[0.06] p-0">
      {accesses.map((a) => {
        const done = progressByUser.get(a.userId) ?? 0;
        return (
          <div key={a.id} className="flex items-center gap-3 p-3.5">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-electric-500/15 text-electric-300">
              <Users className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-white">
                {a.userId}
              </p>
              <p className="mt-0.5 text-xs text-white/45">
                Unlocked {timeAgo(a.unlockedAt)} · via {a.unlockedVia}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1.5 text-xs text-white/60">
              <CheckCircle2 className="h-3.5 w-3.5 text-jade-400" />
              <span>{done} done</span>
            </div>
          </div>
        );
      })}
    </Card>
  );
}

/* ============================================================
   CLONES TAB
   ============================================================ */

function ClonesTab({ training }: { training: Training }) {
  const [clones, setClones] = useState<Training[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const list = await listTrainingClones(training.id).catch(() => []);
      if (!cancelled) {
        setClones(list);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [training.id]);

  if (loading) {
    return (
      <Card className="p-6 text-center text-sm text-white/40">
        Loading clones…
      </Card>
    );
  }

  if (clones.length === 0) {
    return (
      <Card className="p-8 text-center">
        <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-white/[0.05]">
          <GraduationCap className="h-6 w-6 text-white/40" />
        </span>
        <p className="text-sm font-medium text-white">
          No other leaders have cloned this yet
        </p>
        <p className="mt-1 text-xs text-white/50">
          Share your training&apos;s share code with other leaders so they
          can clone it and track their own downline separately.
        </p>
      </Card>
    );
  }

  return (
    <Card className="divide-y divide-white/[0.06] p-0">
      <div className="border-b border-white/[0.06] p-3.5">
        <p className="text-xs font-medium text-white">
          {clones.length} leader{clones.length === 1 ? "" : "s"} cloned this
        </p>
        <p className="mt-0.5 text-[11px] text-white/45">
          You can only see the clone count + when it was made. The
          learner lists inside each clone belong to that leader, not you.
        </p>
      </div>
      {clones.map((c) => (
        <div key={c.id} className="flex items-center gap-3 p-3.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/[0.05] text-white/55">
            <GraduationCap className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-white">
              {c.title || "Untitled clone"}
            </p>
            <p className="mt-0.5 text-xs text-white/45">
              Cloned {timeAgo(c.createdAt)} ·{" "}
              {c.status === "published" ? "Published" : "Draft"}
            </p>
          </div>
        </div>
      ))}
    </Card>
  );
}

