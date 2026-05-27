"use client";

/**
 * AddLeadModal — manual "Add a lead" form for the pipeline kanban.
 *
 * Used when the user wants to track a lead that came from outside the
 * profile/funnel funnel — e.g. a Messenger DM, business card, cold
 * outreach list, or referral.
 *
 * Writes a fully-enrolled Lead directly (the owner has write permission
 * to every field, unlike anonymous visitors) so the new lead appears on
 * the board immediately — no orphan/backfill round-trip.
 */

import { useEffect, useState } from "react";
import { UserPlus } from "lucide-react";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { db, isFirebaseConfigured } from "@/lib/firebase/client";
import { toast } from "@/store/uiStore";
import { cn } from "@/lib/utils";
import type { Lead, Pipeline, PipelineStage } from "@/types";

/* Pre-set source options the user can pick from. We pass through the
   raw label as the lead's `source` so it's searchable later. */
const SOURCE_PRESETS = [
  "Messenger DM",
  "Instagram DM",
  "WhatsApp",
  "Viber",
  "Cold list",
  "Business card",
  "Referral",
  "Walk-in",
  "Other",
] as const;
type SourcePreset = (typeof SOURCE_PRESETS)[number];

interface Props {
  open: boolean;
  onClose: () => void;
  ownerId: string;
  profileId: string;
  pipeline: Pipeline;
  /** Called with the new lead so the parent can patch its kanban state. */
  onAdded: (lead: Lead) => void;
}

export function AddLeadModal({
  open,
  onClose,
  ownerId,
  profileId,
  pipeline,
  onAdded,
}: Props) {
  const sortedStages: PipelineStage[] = [...pipeline.stages].sort(
    (a, b) => a.sortOrder - b.sortOrder,
  );
  const firstStage = sortedStages[0];

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [sourcePreset, setSourcePreset] = useState<SourcePreset>("Messenger DM");
  const [customSource, setCustomSource] = useState("");
  const [stageId, setStageId] = useState<string>(firstStage?.id ?? "");
  const [submitting, setSubmitting] = useState(false);

  /* Reset the form whenever the modal opens, so reopening doesn't show
     stale input from the previous lead. */
  useEffect(() => {
    if (!open) return;
    setName("");
    setEmail("");
    setPhone("");
    setSourcePreset("Messenger DM");
    setCustomSource("");
    setStageId(firstStage?.id ?? "");
    setSubmitting(false);
  }, [open, firstStage?.id]);

  const submit = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error("Name is required.");
      return;
    }
    if (!stageId) {
      toast.error("Pick a starting stage.");
      return;
    }
    if (!isFirebaseConfigured) {
      toast.error("Firebase isn't configured.");
      return;
    }
    const stage = sortedStages.find((s) => s.id === stageId);
    if (!stage) return;

    /* Resolve the final source string. "Other" lets the user type a
       free-form value; presets pass through verbatim so the field stays
       searchable + groupable. */
    const source =
      sourcePreset === "Other"
        ? customSource.trim() || "Manual"
        : sourcePreset;

    setSubmitting(true);
    try {
      const now = Date.now();
      const payload: Omit<Lead, "id"> = {
        ownerId,
        profileId,
        name: trimmed,
        source,
        createdAt: now,
        pipelineId: pipeline.id,
        stageId: stage.id,
        stageEnteredAt: now,
        ...(email.trim() ? { email: email.trim() } : {}),
        ...(phone.trim() ? { phone: phone.trim() } : {}),
        ...(stage.daysBeforeNextTask
          ? {
              nextTaskAt: now + stage.daysBeforeNextTask * 24 * 60 * 60 * 1000,
            }
          : {}),
      };

      const ref = await addDoc(collection(db, "leads"), {
        ...payload,
        serverCreatedAt: serverTimestamp(),
      });
      onAdded({ ...payload, id: ref.id });
      toast.success(`Added ${trimmed} to ${stage.name}.`);
      onClose();
    } catch (err) {
      console.error("[AddLeadModal] create failed:", err);
      toast.error("Couldn't add the lead.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={() => !submitting && onClose()}
      title="Add a lead manually"
      description="For leads that didn't come through your profile or funnel — DMs, business cards, referrals."
    >
      <div className="space-y-4 pb-3">
        {/* Name (required) */}
        <div>
          <label className="mb-1.5 block text-xs font-medium text-white/65">
            Name <span className="text-red-400">*</span>
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Maria Santos"
            autoFocus
            className="w-full rounded-xl border border-white/10 bg-white/[0.03] p-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-electric-500/60"
          />
        </div>

        {/* Email + Phone — side by side on desktop */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-white/65">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="maria@example.com"
              className="w-full rounded-xl border border-white/10 bg-white/[0.03] p-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-electric-500/60"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-white/65">
              Phone
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="09xx xxx xxxx"
              className="w-full rounded-xl border border-white/10 bg-white/[0.03] p-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-electric-500/60"
            />
          </div>
        </div>

        {/* Source — preset chips, "Other" reveals a text input */}
        <div>
          <label className="mb-1.5 block text-xs font-medium text-white/65">
            Source
          </label>
          <div className="flex flex-wrap gap-1.5">
            {SOURCE_PRESETS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setSourcePreset(p)}
                className={cn(
                  "rounded-lg border px-2.5 py-1 text-[11px] font-medium transition-colors",
                  sourcePreset === p
                    ? "border-electric-500/50 bg-electric-500/15 text-electric-300"
                    : "border-white/10 bg-white/[0.04] text-white/65 hover:bg-white/[0.08]",
                )}
              >
                {p}
              </button>
            ))}
          </div>
          {sourcePreset === "Other" && (
            <input
              value={customSource}
              onChange={(e) => setCustomSource(e.target.value)}
              placeholder="Where did they come from?"
              className="mt-2 w-full rounded-xl border border-white/10 bg-white/[0.03] p-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-electric-500/60"
            />
          )}
        </div>

        {/* Stage picker — defaults to the first stage but the user can
            drop the lead in any stage if they're already further along. */}
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
        </div>

        {/* Submit */}
        <Button
          fullWidth
          onClick={submit}
          loading={submitting}
          disabled={submitting}
          leftIcon={<UserPlus className="h-4 w-4" />}
        >
          Add lead
        </Button>
      </div>
    </Modal>
  );
}
