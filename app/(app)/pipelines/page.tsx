"use client";

/**
 * Follow-Up Pipelines — week 1 foundation.
 *
 * Three states:
 *   1. No pipelines yet → template picker (5 industry presets + custom)
 *   2. Has pipelines + active pipeline open → kanban board view
 *   3. Has pipelines but no active selected → pipeline list cards
 *
 * Feature-gated to plans with `follow_up_pipeline` (Pro / Annual Pro
 * Special / Team — defined in lib/features.ts). Free users see the
 * upgrade prompt.
 *
 * Week 1 ships: data model + board view + manual stage transitions.
 * Week 2 adds: AI message generation + daily task dashboard.
 * Week 3 adds: team duplication via share codes + analytics.
 */

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  CalendarClock,
  Crown,
  KanbanSquare,
  Loader2,
  MoreVertical,
  Pin,
  Plus,
  Settings,
  Share2,
  Sparkles,
  Star,
  Ticket,
  Trash2,
  UserPlus,
} from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { usePlanAccess } from "@/components/providers/PlanProvider";
import { PageHeader } from "@/components/common/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import {
  backfillOrphanLeads,
  deletePipeline,
  listLeadsInPipeline,
  listPipelinesForUser,
  moveLeadToStage,
  setDefaultPipeline,
  upsertPipeline,
} from "@/lib/firebase/firestore";
import { AddLeadModal } from "@/components/pipelines/AddLeadModal";
import { LeadDetailModal } from "@/components/pipelines/LeadDetailModal";
import { StageEditor } from "@/components/pipelines/StageEditor";
import {
  ClonePipelineModal,
  SharePipelineModal,
} from "@/components/pipelines/SharePipelineModal";
import {
  emptyCustomPipeline,
  PIPELINE_TEMPLATES,
  pipelineFromTemplate,
} from "@/lib/pipelines";
import { cn, timeAgo } from "@/lib/utils";
import { toast } from "@/store/uiStore";
import type { Lead, Pipeline, PipelineStage } from "@/types";

/* Next.js 15 requires useSearchParams to be inside a Suspense boundary
   when the page might be statically pre-rendered. Wrap the page body. */
export default function PipelinesPageWrapper() {
  return (
    <Suspense
      fallback={
        <div className="flex h-[40vh] items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-white/40" />
        </div>
      }
    >
      <PipelinesPage />
    </Suspense>
  );
}

function PipelinesPage() {
  const { account, loading: authLoading } = useAuth();
  const { hasFeature } = usePlanAccess();
  const isPaid = hasFeature("follow_up_pipeline");
  const search = useSearchParams();
  /* When the URL is /pipelines?clone=PIPE-XXX, auto-open the clone
     modal pre-filled with the code. Used for shareable links. */
  const cloneCodeFromUrl = search.get("clone")?.toUpperCase() ?? null;

  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [cloneOpen, setCloneOpen] = useState(false);

  const load = useCallback(async () => {
    if (!account) return;
    setLoading(true);
    try {
      const all = await listPipelinesForUser(account.uid);
      setPipelines(all);
      /* Auto-open the default pipeline on first load. */
      if (!activeId && all.length > 0) {
        const def = all.find((p) => p.isDefault) ?? all[0];
        setActiveId(def.id);
      }
      /* Back-fill any orphan leads into the default pipeline's first
         stage. This is the workaround for: anonymous visitors who
         capture a lead via the public profile can't write the
         pipelineId field themselves (Firestore rules block it). Done
         silently — only toasts when leads were actually enrolled. */
      if (all.some((p) => p.isDefault)) {
        const enrolled = await backfillOrphanLeads(account.uid).catch(() => 0);
        if (enrolled > 0) {
          toast.success(
            `Enrolled ${enrolled} new lead${enrolled === 1 ? "" : "s"} into your pipeline.`,
          );
        }
      }
    } catch {
      toast.error("Couldn't load pipelines.");
    } finally {
      setLoading(false);
    }
  }, [account, activeId]);

  useEffect(() => {
    if (account && isPaid) load();
  }, [account, isPaid, load]);

  /* Auto-open the clone modal when ?clone=PIPE-XXX is in the URL. */
  useEffect(() => {
    if (cloneCodeFromUrl && account && isPaid) {
      setCloneOpen(true);
    }
  }, [cloneCodeFromUrl, account, isPaid]);

  /* ── Loading / gate states ── */

  if (authLoading || !account) {
    return (
      <div className="flex h-[40vh] items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-white/40" />
      </div>
    );
  }

  if (!isPaid) {
    return (
      <div className="space-y-5">
        <PageHeader
          title="Follow-Up"
          subtitle="Never lose a lead again — daily task dashboard with AI message scripts."
        />
        <Card className="border border-gold-400/20 bg-gradient-to-b from-gold-400/[0.06] to-transparent p-6 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-gold-300 to-gold-500">
            <Crown className="h-6 w-6 text-ink-950" />
          </div>
          <h3 className="mt-3 font-display text-base font-bold text-gold-200">
            Follow-Up is a Pro feature
          </h3>
          <p className="mx-auto mt-1 max-w-sm text-sm text-white/55">
            Upgrade to unlock follow-up pipelines, daily task dashboard, and
            AI-assisted message scripts that turn cold leads into closed deals.
          </p>
          <Link
            href="/billing"
            className="mt-4 inline-flex rounded-xl bg-gradient-to-r from-gold-300 to-gold-500 px-5 py-2.5 text-sm font-bold text-ink-950"
          >
            Upgrade to Pro
          </Link>
        </Card>
      </div>
    );
  }

  const active = pipelines.find((p) => p.id === activeId) ?? null;

  /* ── Empty state: no pipelines yet ── */
  if (!loading && pipelines.length === 0) {
    return (
      <div className="space-y-5">
        <PageHeader
          title="Follow-Up"
          subtitle="Pick a starter pipeline or build your own."
        />
        <TemplatePicker
          onPick={async (tplIndex) => {
            const tpl = PIPELINE_TEMPLATES[tplIndex];
            const pipeline = pipelineFromTemplate(tpl, account.uid, {
              isDefault: true,
            });
            try {
              await upsertPipeline(pipeline);
              setPipelines([pipeline]);
              setActiveId(pipeline.id);
              toast.success(`${tpl.name} pipeline created.`);
            } catch {
              toast.error("Couldn't create pipeline.");
            }
          }}
          onCustom={async () => {
            const pipeline = emptyCustomPipeline(account.uid);
            pipeline.isDefault = true;
            try {
              await upsertPipeline(pipeline);
              setPipelines([pipeline]);
              setActiveId(pipeline.id);
              toast.success("Custom pipeline created.");
            } catch {
              toast.error("Couldn't create pipeline.");
            }
          }}
        />
      </div>
    );
  }

  /* ── Has at least one pipeline ── */
  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <PageHeader
          title="Follow-Up"
          subtitle={
            active
              ? `${active.name} · ${active.stages.length} stages`
              : "Your pipelines"
          }
        />
        <div className="flex shrink-0 flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            href="/pipelines/today"
            leftIcon={<CalendarClock className="h-3.5 w-3.5" />}
          >
            Today
          </Button>
          {pipelines.length > 1 && (
            <PipelineSwitcher
              pipelines={pipelines}
              activeId={activeId}
              onPick={setActiveId}
            />
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={() => setPickerOpen(true)}
            leftIcon={<Plus className="h-3.5 w-3.5" />}
          >
            New pipeline
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setCloneOpen(true)}
            leftIcon={<Ticket className="h-3.5 w-3.5" />}
          >
            Use a code
          </Button>
        </div>
      </div>

      {active && (
        <PipelineBoard
          pipeline={active}
          onSetDefault={async () => {
            await setDefaultPipeline(account.uid, active.id);
            setPipelines((prev) =>
              prev.map((p) => ({
                ...p,
                isDefault: p.id === active.id,
              })),
            );
            toast.success(`${active.name} is now your default.`);
          }}
          onDelete={async () => {
            if (
              !confirm(
                `Delete "${active.name}"? Leads in this pipeline stay in /leads but lose their stage.`,
              )
            )
              return;
            await deletePipeline(active.id);
            const remaining = pipelines.filter((p) => p.id !== active.id);
            setPipelines(remaining);
            setActiveId(remaining[0]?.id ?? null);
            toast.success("Pipeline deleted.");
          }}
          onStagesEdited={(next) => {
            /* StageEditor already persisted; reflect locally. */
            setPipelines((prev) =>
              prev.map((p) => (p.id === next.id ? next : p)),
            );
          }}
          onShareCodeGenerated={(code) => {
            /* Patch the pipeline in local state so the share badge
               shows on next open. */
            setPipelines((prev) =>
              prev.map((p) =>
                p.id === active.id ? { ...p, shareCode: code } : p,
              ),
            );
          }}
        />
      )}

      {/* Clone-by-code modal — page-level so it works from the header
          button AND from the ?clone=PIPE-XXX URL param auto-open. */}
      <ClonePipelineModal
        open={cloneOpen}
        onClose={() => setCloneOpen(false)}
        ownerId={account.uid}
        prefilledCode={cloneCodeFromUrl ?? undefined}
        onCloned={(cloned) => {
          setPipelines((prev) => [...prev, cloned]);
          setActiveId(cloned.id);
        }}
      />

      {/* Add-pipeline modal — only opens for already-onboarded users. */}
      <Modal
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        title="New pipeline"
        description="Start from an industry template or build your own."
        size="lg"
      >
        <TemplatePicker
          onPick={async (tplIndex) => {
            const tpl = PIPELINE_TEMPLATES[tplIndex];
            const pipeline = pipelineFromTemplate(tpl, account.uid, {
              isDefault: pipelines.length === 0,
            });
            try {
              await upsertPipeline(pipeline);
              setPipelines((prev) => [...prev, pipeline]);
              setActiveId(pipeline.id);
              setPickerOpen(false);
              toast.success(`${tpl.name} pipeline created.`);
            } catch {
              toast.error("Couldn't create pipeline.");
            }
          }}
          onCustom={async () => {
            const pipeline = emptyCustomPipeline(account.uid);
            pipeline.isDefault = pipelines.length === 0;
            try {
              await upsertPipeline(pipeline);
              setPipelines((prev) => [...prev, pipeline]);
              setActiveId(pipeline.id);
              setPickerOpen(false);
              toast.success("Custom pipeline created.");
            } catch {
              toast.error("Couldn't create pipeline.");
            }
          }}
        />
      </Modal>
    </div>
  );
}

/* ── Template picker ── */

function TemplatePicker({
  onPick,
  onCustom,
}: {
  onPick: (templateIndex: number) => void;
  onCustom: () => void;
}) {
  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        {PIPELINE_TEMPLATES.map((t, i) => (
          <button
            key={t.industry}
            type="button"
            onClick={() => onPick(i)}
            className="group flex flex-col items-start gap-2 rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4 text-left transition-colors hover:border-electric-500/40 hover:bg-electric-500/[0.04]"
          >
            <span className="text-2xl">{t.icon}</span>
            <p className="font-display text-sm font-semibold text-white">
              {t.name}
            </p>
            <p className="text-xs text-white/45">{t.description}</p>
            <p className="text-[10px] uppercase tracking-wider text-white/30">
              {t.stages.length} stages
            </p>
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={onCustom}
        className="flex w-full items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed border-white/[0.12] py-4 text-sm font-medium text-white/55 transition-colors hover:border-electric-500/40 hover:text-electric-300"
      >
        <Sparkles className="h-4 w-4" />
        Build your own (3 starter stages, fully editable)
      </button>
    </div>
  );
}

/* ── Pipeline switcher (when multiple exist) ── */

function PipelineSwitcher({
  pipelines,
  activeId,
  onPick,
}: {
  pipelines: Pipeline[];
  activeId: string | null;
  onPick: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <Button
        size="sm"
        variant="outline"
        onClick={() => setOpen((o) => !o)}
        rightIcon={<MoreVertical className="h-3.5 w-3.5" />}
      >
        Switch
      </Button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-20 mt-1 w-64 overflow-hidden rounded-xl border border-white/10 bg-ink-900 shadow-xl">
            {pipelines.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  onPick(p.id);
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left text-xs transition-colors hover:bg-white/[0.06]",
                  p.id === activeId && "bg-electric-500/10",
                )}
              >
                <div className="flex items-center gap-2">
                  {p.isDefault && <Pin className="h-3 w-3 text-electric-300" />}
                  <span className="font-medium text-white">{p.name}</span>
                </div>
                <span className="text-[10px] text-white/30">
                  {p.stages.length} stages
                </span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/* ── Kanban board ── */

function PipelineBoard({
  pipeline,
  onSetDefault,
  onDelete,
  onStagesEdited,
  onShareCodeGenerated,
}: {
  pipeline: Pipeline;
  onSetDefault: () => void;
  onDelete: () => void;
  onStagesEdited: (next: Pipeline) => void;
  onShareCodeGenerated: (code: string) => void;
}) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(false);
  /* The lead currently open in the detail modal (null = closed). */
  const [openLead, setOpenLead] = useState<Lead | null>(null);
  /* Stage editor modal state. */
  const [stageEditorOpen, setStageEditorOpen] = useState(false);
  /* Share modal state. */
  const [shareOpen, setShareOpen] = useState(false);
  /* "Add a lead manually" modal state — for DMs / business cards / etc. */
  const [addLeadOpen, setAddLeadOpen] = useState(false);

  const loadLeads = useCallback(async () => {
    setLoading(true);
    try {
      const list = await listLeadsInPipeline(pipeline.ownerId, pipeline.id);
      setLeads(list);
    } finally {
      setLoading(false);
    }
  }, [pipeline.ownerId, pipeline.id]);

  useEffect(() => {
    loadLeads();
  }, [loadLeads]);

  /* Group leads by stage for the kanban columns. */
  const sortedStages = useMemo(
    () => [...pipeline.stages].sort((a, b) => a.sortOrder - b.sortOrder),
    [pipeline.stages],
  );
  const leadsByStage = useMemo(() => {
    const map = new Map<string, Lead[]>();
    sortedStages.forEach((s) => map.set(s.id, []));
    leads.forEach((l) => {
      const list = map.get(l.stageId ?? "") ?? [];
      list.push(l);
      map.set(l.stageId ?? "", list);
    });
    return map;
  }, [leads, sortedStages]);

  /* Lead-card "Move to" action — applies daysBeforeNextTask hint. */
  const moveLead = async (lead: Lead, targetStageId: string) => {
    const targetStage = sortedStages.find((s) => s.id === targetStageId);
    if (!targetStage) return;
    try {
      await moveLeadToStage(
        lead.id,
        pipeline.id,
        targetStageId,
        targetStage.daysBeforeNextTask,
      );
      setLeads((prev) =>
        prev.map((l) =>
          l.id === lead.id
            ? {
                ...l,
                stageId: targetStageId,
                stageEnteredAt: Date.now(),
                nextTaskAt: targetStage.daysBeforeNextTask
                  ? Date.now() +
                    targetStage.daysBeforeNextTask * 24 * 60 * 60 * 1000
                  : undefined,
              }
            : l,
        ),
      );
      toast.success(`Moved to ${targetStage.name}.`);
    } catch {
      toast.error("Couldn't move lead.");
    }
  };

  return (
    <div className="space-y-4">
      {/* Pipeline header */}
      <Card className="flex flex-wrap items-center justify-between gap-3 p-3">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-electric-500/15">
            <KanbanSquare className="h-4 w-4 text-electric-300" />
          </span>
          <div>
            <p className="text-sm font-semibold text-white">{pipeline.name}</p>
            <p className="text-[11px] text-white/40">
              {leads.length} lead{leads.length === 1 ? "" : "s"} ·{" "}
              {sortedStages.length} stages
              {pipeline.isDefault && " · default"}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {/* Primary action — most-used button on this page sits first. */}
          <Button
            size="sm"
            onClick={() => setAddLeadOpen(true)}
            leftIcon={<UserPlus className="h-3.5 w-3.5" />}
          >
            Add lead
          </Button>
          <Button
            size="sm"
            variant="outline"
            leftIcon={<Settings className="h-3.5 w-3.5" />}
            onClick={() => setStageEditorOpen(true)}
          >
            Edit stages
          </Button>
          <Button
            size="sm"
            variant="outline"
            leftIcon={<Share2 className="h-3.5 w-3.5" />}
            onClick={() => setShareOpen(true)}
          >
            Share
          </Button>
          {!pipeline.isDefault && (
            <Button
              size="sm"
              variant="outline"
              leftIcon={<Star className="h-3.5 w-3.5" />}
              onClick={onSetDefault}
            >
              Make default
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            leftIcon={<Trash2 className="h-3.5 w-3.5" />}
            onClick={onDelete}
          >
            Delete
          </Button>
        </div>
      </Card>

      {/* Board — horizontal scroll on desktop, stacked on mobile */}
      {loading ? (
        <div className="flex h-40 items-center justify-center text-sm text-white/40">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Loading leads…
        </div>
      ) : leads.length === 0 ? (
        <EmptyBoardState />
      ) : (
        <div className="-mx-4 overflow-x-auto px-4 lg:mx-0 lg:px-0">
          <div className="flex min-w-max gap-3 lg:grid lg:min-w-0 lg:grid-cols-3 xl:grid-cols-4">
            {sortedStages.map((stage) => (
              <StageColumn
                key={stage.id}
                stage={stage}
                leads={leadsByStage.get(stage.id) ?? []}
                allStages={sortedStages}
                onMove={moveLead}
                onOpen={(lead) => setOpenLead(lead)}
              />
            ))}
          </div>
        </div>
      )}

      <LeadDetailModal
        open={!!openLead}
        onClose={() => setOpenLead(null)}
        lead={openLead}
        pipeline={pipeline}
        onUpdated={(patch) => {
          if (!openLead) return;
          /* Patch local state so the board reflects changes immediately
             — saves an extra Firestore read on close. */
          setLeads((prev) =>
            prev.map((l) =>
              l.id === openLead.id ? { ...l, ...patch } : l,
            ),
          );
          setOpenLead((cur) => (cur ? { ...cur, ...patch } : cur));
        }}
      />

      <StageEditor
        open={stageEditorOpen}
        onClose={() => setStageEditorOpen(false)}
        pipeline={pipeline}
        leadsInPipeline={leads}
        onSaved={onStagesEdited}
      />

      <SharePipelineModal
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        pipeline={pipeline}
        onCodeGenerated={onShareCodeGenerated}
      />

      <AddLeadModal
        open={addLeadOpen}
        onClose={() => setAddLeadOpen(false)}
        ownerId={pipeline.ownerId}
        /* Profile id == owner id in this app (single-profile per user). */
        profileId={pipeline.ownerId}
        pipeline={pipeline}
        onAdded={(lead) => setLeads((prev) => [lead, ...prev])}
      />
    </div>
  );
}

/* ── Stage column ── */

function StageColumn({
  stage,
  leads,
  allStages,
  onMove,
  onOpen,
}: {
  stage: PipelineStage;
  leads: Lead[];
  allStages: PipelineStage[];
  onMove: (lead: Lead, targetStageId: string) => void;
  onOpen: (lead: Lead) => void;
}) {
  return (
    <div
      className={cn(
        "flex w-72 shrink-0 flex-col gap-2 rounded-xl border border-white/[0.07] p-3 lg:w-auto",
        stage.color ?? "bg-white/[0.02]",
      )}
    >
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-white/65">
          {stage.name}
        </p>
        <Badge tone="neutral">{leads.length}</Badge>
      </div>
      <div className="space-y-2">
        {leads.length === 0 ? (
          <p className="rounded-lg border border-dashed border-white/[0.06] p-3 text-center text-[11px] text-white/30">
            No leads here
          </p>
        ) : (
          leads.map((lead) => (
            <LeadCard
              key={lead.id}
              lead={lead}
              allStages={allStages}
              currentStageId={stage.id}
              onMove={(target) => onMove(lead, target)}
              onOpen={() => onOpen(lead)}
            />
          ))
        )}
      </div>
    </div>
  );
}

/* ── Lead card ── */

function LeadCard({
  lead,
  allStages,
  currentStageId,
  onMove,
  onOpen,
}: {
  lead: Lead;
  allStages: PipelineStage[];
  currentStageId: string;
  onMove: (targetStageId: string) => void;
  onOpen: () => void;
}) {
  const [open, setOpen] = useState(false);
  const otherStages = allStages.filter((s) => s.id !== currentStageId);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen();
        }
      }}
      className="cursor-pointer rounded-lg border border-white/[0.07] bg-ink-950/40 p-3 transition-colors hover:border-electric-500/40 hover:bg-ink-950/60"
    >
      <p className="text-sm font-medium text-white">{lead.name}</p>
      {lead.email && (
        <p className="mt-0.5 truncate text-[11px] text-white/45">
          {lead.email}
        </p>
      )}
      {lead.phone && !lead.email && (
        <p className="mt-0.5 text-[11px] text-white/45">{lead.phone}</p>
      )}
      <div className="mt-2 flex items-center justify-between gap-2">
        <span className="text-[10px] text-white/30">
          {timeAgo(lead.stageEnteredAt ?? lead.createdAt)}
        </span>
        <div className="relative">
          <button
            type="button"
            onClick={(e) => {
              /* Don't bubble — clicking Move shouldn't open the detail
                 modal, just the move dropdown. */
              e.stopPropagation();
              setOpen((o) => !o);
            }}
            className="flex items-center gap-1 rounded-md border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[11px] font-medium text-white/65 hover:bg-white/[0.08]"
          >
            <ArrowLeft className="h-3 w-3 -rotate-90" />
            Move
          </button>
          {open && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={(e) => {
                  e.stopPropagation();
                  setOpen(false);
                }}
              />
              <div className="absolute right-0 z-20 mt-1 w-44 overflow-hidden rounded-xl border border-white/10 bg-ink-900 shadow-xl">
                {otherStages.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onMove(s.id);
                      setOpen(false);
                    }}
                    className="block w-full px-3 py-2 text-left text-[11px] font-medium text-white hover:bg-white/[0.06]"
                  >
                    {s.name}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Empty state ── */

function EmptyBoardState() {
  return (
    <Card className="p-10 text-center">
      <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white/[0.04]">
        <KanbanSquare className="h-6 w-6 text-white/30" />
      </span>
      <p className="mt-3 text-sm font-medium text-white">No leads here yet</p>
      <p className="mx-auto mt-1 max-w-sm text-xs text-white/45">
        New leads captured via your Credibly profile auto-enrol into your
        default pipeline. You can also add existing leads manually from{" "}
        <Link href="/leads" className="text-electric-300 hover:underline">
          /leads
        </Link>
        .
      </p>
    </Card>
  );
}
