"use client";

/**
 * AddToPipelineModal — pick a pipeline + starting stage, then enroll
 * one or many leads into it.
 *
 * Used from the Leads tab when the user wants to bulk-import existing
 * leads (orphans, leads from another pipeline, leads they manually
 * captured years ago) into a follow-up pipeline.
 *
 * Works for both "fresh enroll" (orphan lead) and "move between
 * pipelines" (lead already in a different pipeline). The write is
 * idempotent — re-enrolling a lead just resets its stage + next-task.
 */

import { useEffect, useState } from "react";
import { ArrowRight, KanbanSquare } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { enrollLeadsInPipeline } from "@/lib/firebase/firestore";
import { toast } from "@/store/uiStore";
import { cn } from "@/lib/utils";
import type { Pipeline } from "@/types";

interface Props {
  open: boolean;
  onClose: () => void;
  /** Leads being enrolled. Modal title adapts to the count. */
  leadIds: string[];
  /** All pipelines the user owns — used to populate the picker. */
  pipelines: Pipeline[];
  /** Called with the chosen pipeline + stage after a successful enroll. */
  onEnrolled: (pipelineId: string, stageId: string) => void;
}

export function AddToPipelineModal({
  open,
  onClose,
  leadIds,
  pipelines,
  onEnrolled,
}: Props) {
  /* Default the picker to the user's default pipeline so a one-tap
     enroll is possible for the typical case. */
  const defaultPipeline = pipelines.find((p) => p.isDefault) ?? pipelines[0];
  const [pipelineId, setPipelineId] = useState<string>(
    defaultPipeline?.id ?? "",
  );

  const selectedPipeline =
    pipelines.find((p) => p.id === pipelineId) ?? defaultPipeline;
  const sortedStages = selectedPipeline
    ? [...selectedPipeline.stages].sort((a, b) => a.sortOrder - b.sortOrder)
    : [];
  const [stageId, setStageId] = useState<string>(sortedStages[0]?.id ?? "");

  const [submitting, setSubmitting] = useState(false);

  /* Reset state whenever the modal re-opens — keeps the picker in
     sync with the latest pipelines list and prevents stale stage ids. */
  useEffect(() => {
    if (!open) return;
    const def = pipelines.find((p) => p.isDefault) ?? pipelines[0];
    setPipelineId(def?.id ?? "");
    setStageId(
      def
        ? [...def.stages].sort((a, b) => a.sortOrder - b.sortOrder)[0]?.id ?? ""
        : "",
    );
    setSubmitting(false);
  }, [open, pipelines]);

  /* When the user switches pipelines, snap stage to the new first one. */
  useEffect(() => {
    if (!selectedPipeline) return;
    const firstId =
      [...selectedPipeline.stages].sort((a, b) => a.sortOrder - b.sortOrder)[0]
        ?.id ?? "";
    setStageId(firstId);
  }, [selectedPipeline]);

  const submit = async () => {
    if (!selectedPipeline || !stageId) {
      toast.error("Pick a pipeline and starting stage.");
      return;
    }
    const stage = selectedPipeline.stages.find((s) => s.id === stageId);
    if (!stage) return;

    setSubmitting(true);
    try {
      await enrollLeadsInPipeline(
        leadIds,
        selectedPipeline.id,
        stage.id,
        stage.daysBeforeNextTask,
      );
      onEnrolled(selectedPipeline.id, stage.id);
      toast.success(
        leadIds.length === 1
          ? `Added to ${selectedPipeline.name}.`
          : `Added ${leadIds.length} leads to ${selectedPipeline.name}.`,
      );
      onClose();
    } catch (err) {
      console.error("[AddToPipelineModal] enroll failed:", err);
      toast.error("Couldn't add to pipeline.");
    } finally {
      setSubmitting(false);
    }
  };

  /* No pipelines at all = unrecoverable empty state. Tell the user
     and link them to /pipelines so they can create one. */
  if (pipelines.length === 0) {
    return (
      <Modal
        open={open}
        onClose={onClose}
        title="No pipelines yet"
        description="You need at least one pipeline before you can import leads."
      >
        <div className="space-y-3 pb-2">
          <p className="text-sm text-white/65">
            Head to the Follow-Up tab and create your first pipeline —
            then come back here to bulk-add leads.
          </p>
          <Button fullWidth href="/pipelines">
            Open Follow-Up
          </Button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      open={open}
      onClose={() => !submitting && onClose()}
      title={
        leadIds.length === 1
          ? "Add lead to a pipeline"
          : `Add ${leadIds.length} leads to a pipeline`
      }
      description="Pick a pipeline and the starting stage. Re-enrolling a lead resets their stage and next-task date."
    >
      <div className="space-y-4 pb-3">
        {/* Pipeline picker — list of cards */}
        <div>
          <label className="mb-1.5 block text-xs font-medium text-white/65">
            Pipeline
          </label>
          <div className="space-y-1.5">
            {pipelines.map((p) => {
              const selected = p.id === pipelineId;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPipelineId(p.id)}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-xl border p-2.5 text-left transition-colors",
                    selected
                      ? "border-electric-500 bg-electric-500/10"
                      : "border-white/10 hover:border-white/20",
                  )}
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-electric-500/15">
                    <KanbanSquare className="h-4 w-4 text-electric-300" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-white">
                      {p.name}
                      {p.isDefault && (
                        <span className="ml-1.5 rounded-full bg-white/[0.08] px-1.5 py-0.5 text-[9px] font-medium text-white/55">
                          DEFAULT
                        </span>
                      )}
                    </p>
                    <p className="truncate text-[11px] text-white/40">
                      {p.stages.length} stage{p.stages.length === 1 ? "" : "s"}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Stage picker — chips. Defaults to the first stage when the
            user picks a new pipeline. */}
        {selectedPipeline && sortedStages.length > 0 && (
          <div>
            <label className="mb-1.5 block text-xs font-medium text-white/65">
              Start in stage
            </label>
            <div className="flex flex-wrap gap-1.5">
              {sortedStages.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setStageId(s.id)}
                  className={cn(
                    "rounded-lg border px-2.5 py-1 text-[11px] font-medium transition-colors",
                    stageId === s.id
                      ? "border-electric-500/50 bg-electric-500/15 text-electric-300"
                      : "border-white/10 bg-white/[0.04] text-white/65 hover:bg-white/[0.08]",
                  )}
                >
                  {s.name}
                </button>
              ))}
            </div>
            <p className="mt-1.5 text-[10px] text-white/30">
              Next follow-up task will be scheduled based on the stage&apos;s
              days-before-next-task setting.
            </p>
          </div>
        )}

        <Button
          fullWidth
          onClick={submit}
          loading={submitting}
          disabled={submitting || !pipelineId || !stageId}
          rightIcon={<ArrowRight className="h-4 w-4" />}
        >
          {leadIds.length === 1
            ? "Add to pipeline"
            : `Add ${leadIds.length} leads`}
        </Button>
      </div>
    </Modal>
  );
}
