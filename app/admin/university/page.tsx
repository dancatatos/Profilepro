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
  GraduationCap,
  ImagePlus,
  Loader2,
  Plus,
  RefreshCw,
  Save,
  Trash2,
} from "lucide-react";
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
import type { Plan, PlanId, UniversityTopic } from "@/types";

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
    if (!topic.buttonUrl.trim()) {
      toast.error("Button URL is required.");
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
    <Card
      className={cn(
        "p-5",
        topic.active
          ? "border border-white/[0.06]"
          : "border border-gold-400/30 bg-gold-400/[0.02]",
      )}
    >
      <div className="grid gap-5 lg:grid-cols-[280px,1fr]">
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
          <div className="flex items-start justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-md bg-white/[0.06] px-2 py-0.5 font-mono text-[10px] text-white/55">
                #{topic.sortOrder}
              </span>
              <Badge tone={topic.active ? "jade" : "gold"}>
                {topic.active ? "Active" : "Draft"}
              </Badge>
              {dirty && (
                <span className="rounded-md bg-electric-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-electric-300">
                  Unsaved
                </span>
              )}
            </div>
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

          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              label="Category"
              value={topic.category}
              onChange={(e) => onChange({ category: e.target.value })}
              placeholder="Getting Started"
              hint="Topics are grouped by category on the user page."
            />
            <Input
              label="Sort order"
              type="number"
              value={String(topic.sortOrder)}
              onChange={(e) =>
                onChange({ sortOrder: Number(e.target.value) || 0 })
              }
              hint="Lower numbers appear first within a category."
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
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

          {/* Active toggle + Save */}
          <div className="flex items-center justify-between gap-3 border-t border-white/[0.06] pt-3">
            <label className="flex items-center gap-2 text-xs text-white/65">
              <input
                type="checkbox"
                checked={topic.active}
                onChange={(e) => onChange({ active: e.target.checked })}
                className="h-4 w-4 cursor-pointer rounded border-white/20 bg-white/[0.04] accent-electric-500"
              />
              Show on /university (uncheck to hide without deleting)
            </label>
            <Button
              size="sm"
              onClick={onSave}
              loading={saving}
              disabled={saving || !dirty}
              leftIcon={<Save className="h-3.5 w-3.5" />}
            >
              {dirty ? "Save" : "Saved"}
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
