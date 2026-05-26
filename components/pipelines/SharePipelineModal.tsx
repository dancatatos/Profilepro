"use client";

/**
 * Pipeline share / clone modals.
 *
 * Two variants:
 *   SharePipelineModal — opens from a pipeline's header. Generates the
 *     pipeline's PIPE-XXX share code on first open, lets the leader
 *     copy it or copy a full clone link to send their team.
 *   ClonePipelineModal — opens from the /pipelines list. Lets a team
 *     member paste a code and clone the leader's pipeline.
 *
 * Mirrors the existing Shared Builds share/clone pattern so users who
 * already know that flow feel at home.
 */

import { useEffect, useState } from "react";
import {
  Check,
  Copy,
  Link2,
  Loader2,
  Search,
  Share2,
  Users2,
} from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import {
  clonePipelineFromShareCode,
  ensurePipelineShareCode,
  lookupPipelineByShareCode,
} from "@/lib/firebase/firestore";
import { copyToClipboard, getAppOrigin } from "@/lib/utils";
import { toast } from "@/store/uiStore";
import type { Pipeline } from "@/types";

/* ── Share modal (for the pipeline owner) ─────────────────────────── */

export function SharePipelineModal({
  open,
  onClose,
  pipeline,
  onCodeGenerated,
}: {
  open: boolean;
  onClose: () => void;
  pipeline: Pipeline;
  /** Notify parent so it can patch local state with the new shareCode. */
  onCodeGenerated: (code: string) => void;
}) {
  const [code, setCode] = useState<string | null>(pipeline.shareCode ?? null);
  const [generating, setGenerating] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  /* Re-seed on open in case the pipeline doc updated between modals. */
  useEffect(() => {
    if (open) setCode(pipeline.shareCode ?? null);
  }, [open, pipeline.shareCode]);

  /* On first open, auto-generate the code if it doesn't exist yet. */
  useEffect(() => {
    if (!open || code || generating) return;
    setGenerating(true);
    ensurePipelineShareCode(pipeline.id)
      .then((c) => {
        setCode(c);
        onCodeGenerated(c);
      })
      .catch(() => toast.error("Couldn't generate share code."))
      .finally(() => setGenerating(false));
  }, [open, code, generating, pipeline.id, onCodeGenerated]);

  const cloneUrl = code ? `${getAppOrigin()}/pipelines?clone=${code}` : "";

  const copy = async (value: string, kind: "code" | "link") => {
    if (await copyToClipboard(value)) {
      if (kind === "code") {
        setCopiedCode(true);
        setTimeout(() => setCopiedCode(false), 1800);
      } else {
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 1800);
      }
      toast.success(`${kind === "code" ? "Code" : "Link"} copied.`);
    } else {
      toast.error("Couldn't copy — long-press to copy manually.");
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Share this pipeline"
      description="Team members can clone the stages + AI prompts into their own account."
      size="md"
    >
      <div className="space-y-4 pb-3">
        <Card className="space-y-1.5 p-3">
          <p className="text-xs font-semibold text-white">{pipeline.name}</p>
          <p className="text-[11px] text-white/45">
            {pipeline.stages.length} stages · {pipeline.industry}
          </p>
          {pipeline.cloneCount != null && pipeline.cloneCount > 0 && (
            <div className="pt-1">
              <Badge tone="blue">
                <Users2 className="mr-0.5 h-3 w-3" />
                Cloned {pipeline.cloneCount}× by your team
              </Badge>
            </div>
          )}
        </Card>

        {/* Share code */}
        <div>
          <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-white/40">
            Share code
          </label>
          {generating || !code ? (
            <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] p-3 text-sm text-white/55">
              <Loader2 className="h-4 w-4 animate-spin" />
              Generating code…
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] p-1.5 pl-3">
              <span className="flex-1 font-mono text-sm font-semibold tracking-wider text-electric-300">
                {code}
              </span>
              <Button
                size="sm"
                variant={copiedCode ? "outline" : "primary"}
                leftIcon={
                  copiedCode ? (
                    <Check className="h-3.5 w-3.5" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )
                }
                onClick={() => copy(code, "code")}
              >
                {copiedCode ? "Copied" : "Copy"}
              </Button>
            </div>
          )}
        </div>

        {/* Full clone link */}
        {code && (
          <div>
            <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-white/40">
              Clone link (auto-opens the clone form)
            </label>
            <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] p-1.5 pl-3">
              <span className="flex-1 truncate text-xs text-white/65">
                {cloneUrl}
              </span>
              <Button
                size="sm"
                variant={copiedLink ? "outline" : "outline"}
                leftIcon={
                  copiedLink ? (
                    <Check className="h-3.5 w-3.5" />
                  ) : (
                    <Link2 className="h-3.5 w-3.5" />
                  )
                }
                onClick={() => copy(cloneUrl, "link")}
              >
                {copiedLink ? "Copied" : "Copy link"}
              </Button>
            </div>
          </div>
        )}

        <p className="text-[11px] text-white/40">
          Cloned pipelines copy the stage configuration + AI prompt context.
          Leads themselves stay private — each team member captures their
          own leads through their own Credibly profile.
        </p>
      </div>

      <div className="border-t border-white/[0.06] p-4 pb-safe">
        <Button fullWidth variant="outline" onClick={onClose}>
          Done
        </Button>
      </div>
    </Modal>
  );
}

/* ── Clone modal (for the team member receiving the code) ─────────── */

export function ClonePipelineModal({
  open,
  onClose,
  ownerId,
  prefilledCode,
  onCloned,
}: {
  open: boolean;
  onClose: () => void;
  ownerId: string;
  /** When opened via ?clone=PIPE-XXX URL param, pre-fills the input. */
  prefilledCode?: string;
  onCloned: (clonedPipeline: Pipeline) => void;
}) {
  const [code, setCode] = useState("");
  const [looking, setLooking] = useState(false);
  const [found, setFound] = useState<Pipeline | null>(null);
  const [cloning, setCloning] = useState(false);

  useEffect(() => {
    if (!open) return;
    setCode(prefilledCode ?? "");
    setFound(null);
    setLooking(false);
    setCloning(false);
  }, [open, prefilledCode]);

  /* Auto-look-up when prefilled to save the user a click. */
  useEffect(() => {
    if (!open || !prefilledCode || found || looking) return;
    void doLookup(prefilledCode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, prefilledCode]);

  const doLookup = async (c: string) => {
    const trimmed = c.trim();
    if (trimmed.length < 3) {
      toast.error("Enter a share code.");
      return;
    }
    setLooking(true);
    setFound(null);
    try {
      const result = await lookupPipelineByShareCode(trimmed);
      if (!result) {
        toast.error("No active pipeline found for that code.");
      } else {
        setFound(result);
      }
    } catch {
      toast.error("Lookup failed — please try again.");
    } finally {
      setLooking(false);
    }
  };

  const clone = async () => {
    if (!found) return;
    setCloning(true);
    try {
      const cloned = await clonePipelineFromShareCode(
        found.shareCode ?? "",
        ownerId,
      );
      if (!cloned) {
        toast.error("Couldn't clone — the source may have been removed.");
        return;
      }
      onCloned(cloned);
      toast.success(`Cloned "${cloned.name}" into your account.`);
      onClose();
    } catch {
      toast.error("Couldn't clone the pipeline.");
    } finally {
      setCloning(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={() => !cloning && onClose()}
      title="Clone a pipeline"
      description="Paste a code your upline shared to copy their pipeline into your account."
      size="md"
    >
      <div className="space-y-3 pb-3">
        {/* Mobile: stack vertically; sm+: side-by-side */}
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            onKeyDown={(e) => {
              if (e.key === "Enter") doLookup(code);
            }}
            placeholder="PIPE-XXXXXX"
            className="h-11 w-full flex-1 rounded-xl border border-white/10 bg-white/[0.03] px-3.5 text-sm tracking-widest text-white outline-none placeholder:text-white/25 focus:border-electric-500/60"
          />
          <Button
            onClick={() => doLookup(code)}
            loading={looking}
            leftIcon={<Search className="h-4 w-4" />}
            fullWidth
            className="sm:w-auto sm:flex-none"
          >
            Find
          </Button>
        </div>

        {found && (
          <Card className="space-y-1 p-3">
            <p className="text-sm font-semibold text-white">{found.name}</p>
            <p className="text-[11px] text-white/45">
              {found.stages.length} stages · {found.industry}
              {found.cloneCount != null && found.cloneCount > 0
                ? ` · cloned ${found.cloneCount}× already`
                : ""}
            </p>
            <div className="pt-2">
              <Button fullWidth onClick={clone} loading={cloning}>
                Clone into my account
              </Button>
            </div>
          </Card>
        )}
      </div>

      <div className="flex gap-2 border-t border-white/[0.06] p-4 pb-safe">
        <Button variant="outline" fullWidth onClick={onClose} disabled={cloning}>
          Close
        </Button>
      </div>
    </Modal>
  );
}

/* Tiny helper export for the Share button trigger so the parent can
   render its own button while the modal state lives here. */
export { Share2 as ShareIcon };
