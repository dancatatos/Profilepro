"use client";

/**
 * Stage editor — modal that lets the pipeline owner rename, reorder,
 * add, and delete stages on an existing pipeline. Drag-and-drop
 * powered by @dnd-kit (already installed for the University admin).
 *
 * Safety rails:
 *   - Can't delete a stage that still has leads in it (toast warns the
 *     admin to move them first).
 *   - Pipeline must have at least 1 stage at all times.
 *   - sortOrder is re-assigned 10/20/30/... on save so future
 *     insertions always have room between two existing stages.
 */

import { useEffect, useMemo, useState } from "react";
import {
  ChevronUp,
  GripVertical,
  MessageSquarePlus,
  Plus,
  Save,
  Target,
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
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { upsertPipeline } from "@/lib/firebase/firestore";
import { uid as makeId, cn } from "@/lib/utils";
import { toast } from "@/store/uiStore";
import type { FollowUpMessage, Lead, Pipeline, PipelineStage } from "@/types";

interface Props {
  open: boolean;
  onClose: () => void;
  pipeline: Pipeline;
  /** Leads currently in this pipeline — used to prevent stage deletion
   *  when there are still leads sitting in that stage. */
  leadsInPipeline: Lead[];
  /** Called with the updated pipeline so the parent can patch state. */
  onSaved: (next: Pipeline) => void;
}

export function StageEditor({
  open,
  onClose,
  pipeline,
  leadsInPipeline,
  onSaved,
}: Props) {
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [saving, setSaving] = useState(false);

  /* Re-seed local state every time the modal opens. */
  useEffect(() => {
    if (!open) return;
    setStages(
      [...pipeline.stages].sort((a, b) => a.sortOrder - b.sortOrder),
    );
  }, [open, pipeline]);

  /* Count of leads per stage — used to disable delete buttons. */
  const leadCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const l of leadsInPipeline) {
      if (l.stageId) map.set(l.stageId, (map.get(l.stageId) ?? 0) + 1);
    }
    return map;
  }, [leadsInPipeline]);

  /* ── Drag-and-drop reorder ── */
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = stages.findIndex((s) => s.id === active.id);
    const newIndex = stages.findIndex((s) => s.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    setStages(arrayMove(stages, oldIndex, newIndex));
  };

  /* ── Stage CRUD ── */

  const updateStage = (id: string, patch: Partial<PipelineStage>) => {
    setStages((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...patch } : s)),
    );
  };

  const addStage = () => {
    setStages((prev) => [
      ...prev,
      {
        id: makeId("stage"),
        name: "New stage",
        color: "bg-white/[0.04]",
        sortOrder: (prev[prev.length - 1]?.sortOrder ?? 0) + 10,
        daysBeforeNextTask: 2,
      },
    ]);
  };

  const removeStage = (id: string) => {
    if (stages.length <= 1) {
      toast.error("A pipeline needs at least one stage.");
      return;
    }
    const count = leadCounts.get(id) ?? 0;
    if (count > 0) {
      toast.error(
        `Move the ${count} lead${count === 1 ? "" : "s"} out of this stage first.`,
      );
      return;
    }
    setStages((prev) => prev.filter((s) => s.id !== id));
  };

  /* ── Persistence ── */

  const save = async () => {
    if (stages.some((s) => !s.name.trim())) {
      toast.error("Every stage needs a name.");
      return;
    }
    /* Re-assign sortOrder cleanly: 10, 20, 30… */
    const renumbered = stages.map((s, i) => ({
      ...s,
      name: s.name.trim(),
      sortOrder: (i + 1) * 10,
    }));
    const next: Pipeline = {
      ...pipeline,
      stages: renumbered,
      updatedAt: Date.now(),
    };
    setSaving(true);
    try {
      await upsertPipeline(next);
      onSaved(next);
      toast.success("Stages saved.");
      onClose();
    } catch {
      toast.error("Couldn't save stages.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={() => !saving && onClose()}
      title="Edit pipeline stages"
      description="Drag to reorder. Stages with leads in them can't be deleted until you move them."
      size="lg"
    >
      <div className="space-y-3 pb-3">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={stages.map((s) => s.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-2">
              {stages.map((stage) => (
                <SortableStageRow
                  key={stage.id}
                  stage={stage}
                  leadCount={leadCounts.get(stage.id) ?? 0}
                  onChange={(patch) => updateStage(stage.id, patch)}
                  onDelete={() => removeStage(stage.id)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>

        <button
          type="button"
          onClick={addStage}
          className="flex w-full items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-white/[0.12] py-3 text-xs font-medium text-white/55 transition-colors hover:border-electric-500/40 hover:text-electric-300"
        >
          <Plus className="h-4 w-4" />
          Add stage
        </button>
      </div>

      <div className="flex gap-2 border-t border-white/[0.06] p-4 pb-safe">
        <Button variant="outline" fullWidth onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button
          fullWidth
          onClick={save}
          loading={saving}
          disabled={saving}
          leftIcon={<Save className="h-4 w-4" />}
        >
          Save stages
        </Button>
      </div>
    </Modal>
  );
}

/* ── Per-stage sortable row ── */

function SortableStageRow({
  stage,
  leadCount,
  onChange,
  onDelete,
}: {
  stage: PipelineStage;
  leadCount: number;
  onChange: (patch: Partial<PipelineStage>) => void;
  onDelete: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  /** Which language's templates the admin is editing in the expanded panel. */
  const [editLang, setEditLang] = useState<"english" | "taglish">("english");

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: stage.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
    zIndex: isDragging ? 10 : "auto",
  };

  /* Resolve the array the admin is currently editing based on the
     language toggle. Both arrays are stored side-by-side on the stage
     so the user (lead-side) can pick at message-copy time. */
  const messages =
    editLang === "taglish"
      ? stage.followUpMessagesTaglish ?? []
      : stage.followUpMessages ?? [];
  const enCount = stage.followUpMessages?.length ?? 0;
  const tlCount = stage.followUpMessagesTaglish?.length ?? 0;

  const writeMessages = (next: FollowUpMessage[]) => {
    onChange(
      editLang === "taglish"
        ? { followUpMessagesTaglish: next }
        : { followUpMessages: next },
    );
  };

  const addMessage = () => {
    const next: FollowUpMessage[] = [
      ...messages,
      { id: makeId("msg"), label: `Message ${messages.length + 1}`, body: "" },
    ];
    writeMessages(next);
  };

  const updateMessage = (idx: number, patch: Partial<FollowUpMessage>) => {
    const next = messages.map((m, i) => (i === idx ? { ...m, ...patch } : m));
    writeMessages(next);
  };

  const removeMessage = (idx: number) => {
    writeMessages(messages.filter((_, i) => i !== idx));
  };

  return (
    <div ref={setNodeRef} style={style}>
      <div
        className={cn(
          "rounded-xl border border-white/[0.07] bg-white/[0.02]",
          isDragging && "ring-2 ring-electric-500/50",
        )}
      >
        {/* ── Compact header row ── */}
        <div className="flex items-center gap-2 p-2.5">
          {/* Drag handle — only the grip is the listener so inputs work. */}
          <button
            {...attributes}
            {...listeners}
            type="button"
            aria-label="Drag to reorder"
            className="cursor-grab touch-none rounded-md p-1.5 text-white/30 hover:text-white/60 active:cursor-grabbing"
          >
            <GripVertical className="h-4 w-4" />
          </button>

          {/* Stage name (flex-1) */}
          <input
            value={stage.name}
            onChange={(e) => onChange({ name: e.target.value })}
            placeholder="Stage name"
            className="h-9 flex-1 rounded-lg border border-white/[0.07] bg-white/[0.03] px-3 text-sm text-white outline-none focus:border-electric-500/40"
          />

          {/* Days before next task */}
          <div className="flex items-center gap-1.5 rounded-lg border border-white/[0.07] bg-white/[0.03] px-2">
            <input
              type="number"
              min={0}
              value={stage.daysBeforeNextTask ?? 0}
              onChange={(e) =>
                onChange({
                  daysBeforeNextTask: Math.max(0, Number(e.target.value) || 0),
                })
              }
              className="h-9 w-12 bg-transparent text-center text-sm text-white outline-none"
            />
            <span className="text-[10px] text-white/40">d</span>
          </div>

          {/* Lead count badge (informational) */}
          {leadCount > 0 && (
            <span
              className="shrink-0 rounded-md bg-electric-500/12 px-1.5 py-0.5 text-[10px] font-semibold text-electric-300"
              title={`${leadCount} lead(s) currently here`}
            >
              {leadCount}
            </span>
          )}

          {/* Expand / collapse templates editor */}
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            aria-label={expanded ? "Collapse templates" : "Set up templates"}
            className={cn(
              "shrink-0 rounded-md p-1.5 transition-colors",
              expanded
                ? "bg-electric-500/15 text-electric-300"
                : messages.length > 0
                  ? "text-electric-400 hover:bg-electric-500/10"
                  : "text-white/30 hover:text-white/60",
            )}
            title={
              messages.length > 0
                ? `${messages.length} template${messages.length === 1 ? "" : "s"} — click to edit`
                : "Set up follow-up message templates"
            }
          >
            <MessageSquarePlus className="h-4 w-4" />
          </button>

          {/* Delete */}
          <button
            type="button"
            onClick={onDelete}
            aria-label="Delete stage"
            disabled={leadCount > 0}
            className="shrink-0 rounded-md p-1.5 text-white/30 transition-colors hover:bg-red-500/10 hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-white/30"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>

        {/* ── Expanded templates editor ── */}
        {expanded && (
          <div className="space-y-3 border-t border-white/[0.06] px-3 pb-3 pt-3">
            {/* Stage goal / target */}
            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-white/40">
                <Target className="h-3 w-3" />
                Stage goal
              </label>
              <input
                value={stage.followUpGoal ?? ""}
                onChange={(e) =>
                  onChange({ followUpGoal: e.target.value || undefined })
                }
                placeholder="e.g. Book a discovery call, Get them to watch the video"
                className="w-full rounded-lg border border-white/[0.07] bg-white/[0.03] px-3 py-2 text-xs text-white outline-none placeholder:text-white/30 focus:border-electric-500/40"
              />
              <p className="mt-1 text-[10px] text-white/30">
                Shown as a reminder when the follow-up task comes due.
              </p>
            </div>

            {/* Message sequence */}
            <div>
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <label className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-white/40">
                  <MessageSquarePlus className="h-3 w-3" />
                  Message templates
                </label>
                <button
                  type="button"
                  onClick={addMessage}
                  className="flex items-center gap-1 rounded-md bg-electric-500/10 px-2 py-1 text-[10px] font-medium text-electric-300 hover:bg-electric-500/20"
                >
                  <Plus className="h-3 w-3" />
                  Add message
                </button>
              </div>

              {/* EN / TL toggle — admins keep both sequences in sync.
                  Count badges show how many messages exist per language so
                  it's obvious when one side is empty. */}
              <div className="mb-2 flex w-full rounded-md bg-white/[0.04] p-0.5">
                <button
                  type="button"
                  onClick={() => setEditLang("english")}
                  className={cn(
                    "flex flex-1 items-center justify-center gap-1.5 rounded px-2 py-1 text-[10px] font-medium transition-colors",
                    editLang === "english"
                      ? "bg-white/10 text-white"
                      : "text-white/40 hover:text-white/65",
                  )}
                >
                  🇬🇧 English
                  {enCount > 0 && (
                    <span className="rounded-full bg-electric-500/20 px-1.5 text-electric-300">
                      {enCount}
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setEditLang("taglish")}
                  className={cn(
                    "flex flex-1 items-center justify-center gap-1.5 rounded px-2 py-1 text-[10px] font-medium transition-colors",
                    editLang === "taglish"
                      ? "bg-white/10 text-white"
                      : "text-white/40 hover:text-white/65",
                  )}
                >
                  🇵🇭 Taglish
                  {tlCount > 0 && (
                    <span className="rounded-full bg-electric-500/20 px-1.5 text-electric-300">
                      {tlCount}
                    </span>
                  )}
                </button>
              </div>

              {messages.length === 0 ? (
                <div className="rounded-lg border border-dashed border-white/10 py-4 text-center">
                  <p className="text-[11px] text-white/30">
                    No templates yet — add the first message above.
                  </p>
                  <p className="mt-0.5 text-[10px] text-white/20">
                    Use your custom GPT to write the sequence, then paste it here.
                  </p>
                </div>
              ) : (
                <>
                  {/* Placeholder cheat-sheet so admins know what auto-fills
                      on copy. Saves a Slack message asking "how do I make
                      it say their name?" */}
                  <p className="mb-2 text-[10px] text-white/30">
                    Tip: use{" "}
                    <code className="rounded bg-white/[0.05] px-1 py-0.5 text-[10px] text-electric-300">
                      {"{name}"}
                    </code>
                    ,{" "}
                    <code className="rounded bg-white/[0.05] px-1 py-0.5 text-[10px] text-electric-300">
                      {"{email}"}
                    </code>
                    , or{" "}
                    <code className="rounded bg-white/[0.05] px-1 py-0.5 text-[10px] text-electric-300">
                      {"{phone}"}
                    </code>{" "}
                    — they auto-fill from the lead's record on copy.
                  </p>
                </>
              )}
              {messages.length > 0 && (
                <div className="space-y-2">
                  {messages.map((msg, idx) => (
                    <div
                      key={msg.id}
                      className="rounded-lg border border-white/[0.07] bg-white/[0.02] p-2.5"
                    >
                      <div className="mb-2 flex items-center gap-2">
                        <input
                          value={msg.label}
                          onChange={(e) =>
                            updateMessage(idx, { label: e.target.value })
                          }
                          placeholder="Label (e.g. Day 1)"
                          className="h-7 w-28 rounded border border-white/[0.07] bg-white/[0.04] px-2 text-[11px] text-white outline-none focus:border-electric-500/40"
                        />
                        <span className="flex-1" />
                        <button
                          type="button"
                          onClick={() => removeMessage(idx)}
                          aria-label="Remove message"
                          className="rounded p-1 text-white/25 transition-colors hover:bg-red-500/10 hover:text-red-400"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <textarea
                        rows={4}
                        value={msg.body}
                        onChange={(e) =>
                          updateMessage(idx, { body: e.target.value })
                        }
                        placeholder="Paste your follow-up message here…"
                        className="w-full resize-none rounded-lg border border-white/[0.07] bg-white/[0.03] p-2.5 text-xs leading-relaxed text-white outline-none placeholder:text-white/25 focus:border-electric-500/40"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Collapse button */}
            <button
              type="button"
              onClick={() => setExpanded(false)}
              className="flex w-full items-center justify-center gap-1 pt-1 text-[11px] text-white/30 hover:text-white/55"
            >
              <ChevronUp className="h-3.5 w-3.5" />
              Collapse
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
