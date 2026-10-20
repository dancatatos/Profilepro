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
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  /* Re-seed local state every time the modal opens. */
  useEffect(() => {
    if (!open) return;
    setName(pipeline.name);
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
        color: "bg-slate-100",
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
    if (!name.trim()) {
      toast.error("Give the pipeline a name.");
      return;
    }
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
      name: name.trim(),
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
      title="Edit pipeline"
      description="Rename the pipeline, drag stages to reorder. Stages with leads in them can't be deleted until you move them."
      size="lg"
    >
      <div className="space-y-3 pb-3">
        {/* Pipeline name — the one rename surface for the whole
            pipeline. Lives here (not a separate modal) so leaders
            manage name + stages in a single place. */}
        <div>
          <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            Pipeline name
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Recruiting — Manila team"
            className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-electric-500 focus:ring-2 focus:ring-electric-500/15"
          />
        </div>
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
          className="flex w-full items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-slate-300 py-3 text-xs font-medium text-slate-500 transition-colors hover:border-electric-500/40 hover:text-electric-700"
        >
          <Plus className="h-4 w-4" />
          Add stage
        </button>
      </div>

      <div className="flex gap-2 border-t border-slate-200 p-4 pb-safe">
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
          "rounded-xl border border-slate-200 bg-slate-50",
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
            className="cursor-grab touch-none rounded-md p-1.5 text-slate-400 hover:text-slate-500 active:cursor-grabbing"
          >
            <GripVertical className="h-4 w-4" />
          </button>

          {/* Stage name (flex-1) */}
          <input
            value={stage.name}
            onChange={(e) => onChange({ name: e.target.value })}
            placeholder="Stage name"
            className="h-9 flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 outline-none focus:border-electric-500/40"
          />

          {/* Days before next task */}
          <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2">
            <input
              type="number"
              min={0}
              value={stage.daysBeforeNextTask ?? 0}
              onChange={(e) =>
                onChange({
                  daysBeforeNextTask: Math.max(0, Number(e.target.value) || 0),
                })
              }
              className="h-9 w-12 bg-transparent text-center text-sm text-slate-900 outline-none"
            />
            <span className="text-[10px] text-slate-400">d</span>
          </div>

          {/* Lead count badge (informational) */}
          {leadCount > 0 && (
            <span
              className="shrink-0 rounded-md bg-electric-500/12 px-1.5 py-0.5 text-[10px] font-semibold text-electric-700"
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
                ? "bg-electric-500/15 text-electric-700"
                : messages.length > 0
                  ? "text-electric-600 hover:bg-electric-500/10"
                  : "text-slate-400 hover:text-slate-500",
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
            className="shrink-0 rounded-md p-1.5 text-slate-400 transition-colors hover:bg-red-500/10 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-400"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>

        {/* ── Expanded templates editor ── */}
        {expanded && (
          <div className="space-y-3 border-t border-slate-200 px-3 pb-3 pt-3">
            {/* Stage goal / target */}
            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                <Target className="h-3 w-3" />
                Stage goal
              </label>
              <input
                value={stage.followUpGoal ?? ""}
                onChange={(e) =>
                  onChange({ followUpGoal: e.target.value || undefined })
                }
                placeholder="e.g. Book a discovery call, Get them to watch the video"
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 outline-none placeholder:text-slate-400 focus:border-electric-500/40"
              />
              <p className="mt-1 text-[10px] text-slate-400">
                Shown as a reminder when the follow-up task comes due.
              </p>
            </div>

            {/* Message sequence */}
            <div>
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <label className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  <MessageSquarePlus className="h-3 w-3" />
                  Message templates
                </label>
                <button
                  type="button"
                  onClick={addMessage}
                  className="flex items-center gap-1 rounded-md bg-electric-500/10 px-2 py-1 text-[10px] font-medium text-electric-700 hover:bg-electric-500/20"
                >
                  <Plus className="h-3 w-3" />
                  Add message
                </button>
              </div>

              {/* EN / TL toggle — admins keep both sequences in sync.
                  Count badges show how many messages exist per language so
                  it's obvious when one side is empty. */}
              <div className="mb-2 flex w-full rounded-md bg-slate-100 p-0.5">
                <button
                  type="button"
                  onClick={() => setEditLang("english")}
                  className={cn(
                    "flex flex-1 items-center justify-center gap-1.5 rounded px-2 py-1 text-[10px] font-medium transition-colors",
                    editLang === "english"
                      ? "bg-slate-200 text-slate-900"
                      : "text-slate-400 hover:text-slate-600",
                  )}
                >
                  🇬🇧 English
                  {enCount > 0 && (
                    <span className="rounded-full bg-electric-500/20 px-1.5 text-electric-700">
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
                      ? "bg-slate-200 text-slate-900"
                      : "text-slate-400 hover:text-slate-600",
                  )}
                >
                  🇵🇭 Taglish
                  {tlCount > 0 && (
                    <span className="rounded-full bg-electric-500/20 px-1.5 text-electric-700">
                      {tlCount}
                    </span>
                  )}
                </button>
              </div>

              {messages.length === 0 ? (
                <div className="rounded-lg border border-dashed border-slate-200 py-4 text-center">
                  <p className="text-[11px] text-slate-400">
                    No templates yet — add the first message above.
                  </p>
                  <p className="mt-0.5 text-[10px] text-slate-300">
                    Use your custom GPT to write the sequence, then paste it here.
                  </p>
                </div>
              ) : (
                <>
                  {/* Placeholder cheat-sheet so admins know what auto-fills
                      on copy. Saves a Slack message asking "how do I make
                      it say their name?" */}
                  <p className="mb-2 text-[10px] text-slate-400">
                    Tip: use{" "}
                    <code className="rounded bg-slate-100 px-1 py-0.5 text-[10px] text-electric-700">
                      {"{name}"}
                    </code>
                    ,{" "}
                    <code className="rounded bg-slate-100 px-1 py-0.5 text-[10px] text-electric-700">
                      {"{email}"}
                    </code>
                    , or{" "}
                    <code className="rounded bg-slate-100 px-1 py-0.5 text-[10px] text-electric-700">
                      {"{phone}"}
                    </code>{" "}
                    — they auto-fill from the lead&apos;s record on copy.
                  </p>
                </>
              )}
              {messages.length > 0 && (
                <div className="space-y-2">
                  {messages.map((msg, idx) => (
                    <div
                      key={msg.id}
                      className="rounded-lg border border-slate-200 bg-slate-50 p-2.5"
                    >
                      <div className="mb-2 flex items-center gap-2">
                        <input
                          value={msg.label}
                          onChange={(e) =>
                            updateMessage(idx, { label: e.target.value })
                          }
                          placeholder="Label (e.g. Day 1)"
                          className="h-7 w-28 rounded border border-slate-200 bg-slate-100 px-2 text-[11px] text-slate-900 outline-none focus:border-electric-500/40"
                        />
                        <span className="flex-1" />
                        <button
                          type="button"
                          onClick={() => removeMessage(idx)}
                          aria-label="Remove message"
                          className="rounded p-1 text-slate-300 transition-colors hover:bg-red-500/10 hover:text-red-600"
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
                        className="w-full resize-none rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-xs leading-relaxed text-slate-900 outline-none placeholder:text-slate-300 focus:border-electric-500/40"
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
              className="flex w-full items-center justify-center gap-1 pt-1 text-[11px] text-slate-400 hover:text-slate-500"
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
