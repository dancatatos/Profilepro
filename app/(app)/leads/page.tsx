"use client";

/**
 * Leads page — the master inbox of every prospect the user has
 * captured (via profile lead-capture, funnel form, manual Add Lead,
 * or CSV import in future).
 *
 * What ships here:
 *   - Per-lead pipeline status badge (which pipeline + stage they're
 *     currently in, or "Not in pipeline")
 *   - Filter chips: All / Not in pipeline / In pipeline
 *   - Selection mode with bulk "Add to pipeline" action so users can
 *     import dozens of orphan leads in one tap
 *   - CSV export (unchanged from before)
 *
 * The bulk-enroll flow is the primary upgrade — many users start with
 * leads in the system from before pipelines existed, OR import leads
 * from another tool, OR want to move "done" leads back into a
 * reactivation pipeline. This makes all three a 3-tap operation.
 */

import { useEffect, useMemo, useState } from "react";
import {
  CheckSquare,
  Download,
  KanbanSquare,
  Mail,
  Phone,
  Square,
  Trash2,
  UserPlus,
  X,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import {
  deleteLead,
  deleteLeads,
  listLeads,
  listPipelinesForUser,
} from "@/lib/firebase/firestore";
import { PageHeader } from "@/components/common/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { EmptyState } from "@/components/common/EmptyState";
import { AddToPipelineModal } from "@/components/leads/AddToPipelineModal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { cn, timeAgo } from "@/lib/utils";
import { toast } from "@/store/uiStore";
import type { Lead, Pipeline } from "@/types";

/**
 * Make a lead's `source` field human-readable in the row chip.
 * Raw values come in three shapes:
 *   "funnel:<slug>"   — captured via a funnel
 *   "sec_xxxxx"       — captured via a profile section (section id)
 *   "leadCapture"     — legacy generic profile capture
 * Plus the manual-entry presets ("Messenger DM", "Cold list", etc.)
 * which we leave verbatim. Returns a short, label-y string suitable
 * for a 10px chip.
 */
function formatLeadSource(source: string): string {
  if (!source) return "Unknown";
  if (source.startsWith("funnel:")) {
    /* Strip the prefix and the slug → human title. e.g.
       "funnel:amare-ph-recruitment" → "Amare Ph Recruitment". */
    const slug = source.slice("funnel:".length);
    return slug
      .split("-")
      .filter(Boolean)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  }
  if (source.startsWith("sec_")) return "Profile";
  if (source === "leadCapture") return "Profile";
  return source;
}

const DEMO_LEADS: Lead[] = [
  { id: "l1", profileId: "demo", ownerId: "demo", name: "Maria Santos", email: "maria.santos@example.com", phone: "+63 917 000 1234", source: "leadCapture", createdAt: Date.now() - 2 * 3600_000 },
  { id: "l2", profileId: "demo", ownerId: "demo", name: "Rico Dela Cruz", email: "rico.dc@example.com", source: "leadCapture", createdAt: Date.now() - 26 * 3600_000 },
  { id: "l3", profileId: "demo", ownerId: "demo", name: "Anna Reyes", phone: "+63 922 555 8899", source: "leadCapture", createdAt: Date.now() - 3 * 86400_000 },
];

type FilterKey = "all" | "orphan" | "enrolled";

export default function LeadsPage() {
  const { account } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [loaded, setLoaded] = useState(false);

  /* Selection state — empty Set means "selection mode off". Once the
     user taps "Select", the set is initialized to {} and stays alive
     even with zero items so the bulk action bar shows. */
  const [selecting, setSelecting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  /* Filter — "all" by default; users with messy lead lists can quickly
     narrow to "orphan" to find the ones missing a pipeline. */
  const [filter, setFilter] = useState<FilterKey>("all");

  /* Bulk enroll modal state. */
  const [enrollOpen, setEnrollOpen] = useState(false);

  /* Delete-confirm state. Holds either:
       { kind: "one", lead }  — per-row trash icon click
       { kind: "bulk", ids }  — bulk delete from selection mode
     Null when no dialog is open. */
  const [pendingDelete, setPendingDelete] = useState<
    | { kind: "one"; lead: Lead }
    | { kind: "bulk"; ids: string[] }
    | null
  >(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!account) return;
    if (account.uid === "demo") {
      setLeads(DEMO_LEADS);
      setLoaded(true);
      return;
    }
    /* Load leads + pipelines in parallel — both inform what we render. */
    Promise.all([
      listLeads(account.uid).catch(() => [] as Lead[]),
      listPipelinesForUser(account.uid).catch(() => [] as Pipeline[]),
    ]).then(([ls, ps]) => {
      setLeads(ls);
      setPipelines(ps);
      setLoaded(true);
    });
  }, [account]);

  /* Lookup tables — keyed by id so render-time chip lookup stays O(1). */
  const pipelineById = useMemo(
    () => new Map(pipelines.map((p) => [p.id, p])),
    [pipelines],
  );
  const stageByPipelineAndId = useMemo(() => {
    const map = new Map<string, Map<string, string>>();
    for (const p of pipelines) {
      const stages = new Map<string, string>();
      for (const s of p.stages) stages.set(s.id, s.name);
      map.set(p.id, stages);
    }
    return map;
  }, [pipelines]);

  /* Apply the active filter. "Orphan" = no pipelineId. "Enrolled" =
     has one. */
  const visibleLeads = useMemo(() => {
    if (filter === "all") return leads;
    if (filter === "orphan") return leads.filter((l) => !l.pipelineId);
    return leads.filter((l) => !!l.pipelineId);
  }, [leads, filter]);

  /* Counts per filter so the chips can show how many are in each
     bucket — helps users decide where to look. */
  const counts = useMemo(() => {
    let orphan = 0;
    let enrolled = 0;
    for (const l of leads) {
      if (l.pipelineId) enrolled += 1;
      else orphan += 1;
    }
    return { all: leads.length, orphan, enrolled };
  }, [leads]);

  /* Selection helpers. */
  const toggleOne = (id: string) =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const selectAllVisible = () =>
    setSelectedIds(new Set(visibleLeads.map((l) => l.id)));
  const clearSelection = () => setSelectedIds(new Set());
  const exitSelectMode = () => {
    setSelecting(false);
    clearSelection();
  };

  /* Run the pending delete (single or bulk) and patch local state so
     the UI reflects the removal without a Firestore re-read. Demo
     leads are local-only — they never hit Firestore, so we just drop
     them from state. */
  const confirmDelete = async () => {
    if (!pendingDelete || !account) return;
    setDeleting(true);
    try {
      const ids =
        pendingDelete.kind === "one"
          ? [pendingDelete.lead.id]
          : pendingDelete.ids;
      if (account.uid !== "demo") {
        if (ids.length === 1) {
          await deleteLead(ids[0]);
        } else {
          await deleteLeads(ids);
        }
      }
      const removed = new Set(ids);
      setLeads((prev) => prev.filter((l) => !removed.has(l.id)));
      /* Clean up selection state so the bulk bar count is correct. */
      setSelectedIds((prev) => {
        const next = new Set(prev);
        for (const id of ids) next.delete(id);
        return next;
      });
      toast.success(
        ids.length === 1 ? "Lead deleted" : `${ids.length} leads deleted`,
      );
      setPendingDelete(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed.");
    } finally {
      setDeleting(false);
    }
  };

  /* CSV export — unchanged from the original. */
  const exportCsv = () => {
    const rows = [
      ["Name", "Email", "Phone", "Source", "Pipeline", "Stage", "Date"],
      ...leads.map((l) => {
        const pipeline = l.pipelineId
          ? pipelineById.get(l.pipelineId)?.name ?? ""
          : "";
        const stage =
          l.pipelineId && l.stageId
            ? stageByPipelineAndId.get(l.pipelineId)?.get(l.stageId) ?? ""
            : "";
        return [
          l.name,
          l.email || "",
          l.phone || "",
          l.source,
          pipeline,
          stage,
          new Date(l.createdAt).toISOString(),
        ];
      }),
    ];
    const csv = rows
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    link.download = "credibly-leads.csv";
    link.click();
    toast.success("Leads exported");
  };

  const selectedCount = selectedIds.size;
  const allVisibleSelected =
    visibleLeads.length > 0 &&
    visibleLeads.every((l) => selectedIds.has(l.id));

  return (
    <div className="space-y-5 pb-32 sm:pb-5">
      <PageHeader
        title="Leads"
        subtitle={`${leads.length} prospect${leads.length === 1 ? "" : "s"} captured`}
        action={
          leads.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {!selecting && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setSelecting(true)}
                  leftIcon={<CheckSquare className="h-3.5 w-3.5" />}
                >
                  Select
                </Button>
              )}
              <Button
                size="sm"
                variant="outline"
                onClick={exportCsv}
                leftIcon={<Download className="h-3.5 w-3.5" />}
              >
                Export
              </Button>
            </div>
          )
        }
      />

      {/* Filter chips — All / Not in pipeline / In pipeline. Hidden until
          we have any leads so an empty state looks clean. */}
      {leads.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {(
            [
              { key: "all" as const, label: "All", count: counts.all },
              {
                key: "orphan" as const,
                label: "Not in pipeline",
                count: counts.orphan,
              },
              {
                key: "enrolled" as const,
                label: "In pipeline",
                count: counts.enrolled,
              },
            ]
          ).map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className={cn(
                "flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-medium transition-colors",
                filter === f.key
                  ? "border-electric-500/50 bg-electric-500/15 text-electric-700"
                  : "border-slate-200 bg-slate-100 text-slate-600 hover:bg-slate-200",
              )}
            >
              {f.label}
              <span
                className={cn(
                  "rounded-full px-1.5 text-[10px]",
                  filter === f.key
                    ? "bg-electric-500/20 text-electric-700"
                    : "bg-slate-200 text-slate-500",
                )}
              >
                {f.count}
              </span>
            </button>
          ))}

          {/* Select-all toggle — only shown in selection mode. Inline
              with the filter chips so it doesn't add a row on mobile. */}
          {selecting && visibleLeads.length > 0 && (
            <button
              type="button"
              onClick={() =>
                allVisibleSelected ? clearSelection() : selectAllVisible()
              }
              className="ml-auto flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-100"
            >
              {allVisibleSelected ? (
                <CheckSquare className="h-3.5 w-3.5" />
              ) : (
                <Square className="h-3.5 w-3.5" />
              )}
              {allVisibleSelected ? "Clear all" : "Select all"}
            </button>
          )}
        </div>
      )}

      {loaded && leads.length === 0 ? (
        <EmptyState
          icon="Inbox"
          title="No leads yet"
          description="When prospects submit your lead capture form, they'll appear here."
        />
      ) : visibleLeads.length === 0 ? (
        <Card className="p-8 text-center text-sm text-slate-400">
          No leads in this view. Try a different filter.
        </Card>
      ) : (
        <div className="space-y-2.5">
          {visibleLeads.map((lead) => {
            const isSelected = selectedIds.has(lead.id);
            const pipeline = lead.pipelineId
              ? pipelineById.get(lead.pipelineId)
              : undefined;
            const stageName =
              lead.pipelineId && lead.stageId
                ? stageByPipelineAndId.get(lead.pipelineId)?.get(lead.stageId)
                : undefined;
            return (
              <Card
                key={lead.id}
                className={cn(
                  "flex items-center gap-3 p-3.5 transition-colors",
                  selecting && "cursor-pointer hover:border-electric-500/30",
                  isSelected && "border-electric-500/50 bg-electric-500/[0.04]",
                )}
                onClick={() => selecting && toggleOne(lead.id)}
              >
                {/* Checkbox — only when in selection mode. */}
                {selecting && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleOne(lead.id);
                    }}
                    aria-label={isSelected ? "Deselect" : "Select"}
                    className="shrink-0"
                  >
                    {isSelected ? (
                      <CheckSquare className="h-5 w-5 text-electric-700" />
                    ) : (
                      <Square className="h-5 w-5 text-slate-300" />
                    )}
                  </button>
                )}

                <Avatar name={lead.name} size={42} />

                <div className="min-w-0 flex-1">
                  {/* Name + relative timestamp — timestamp now sits
                      inline with the name so the right column doesn't
                      need to hold anything wide. Was previously stacked
                      with the source badge, which overflowed and visually
                      overlapped the email/phone line on long funnel
                      sources like "funnel:amare-ph-recruitment". */}
                  <div className="flex items-baseline gap-2">
                    <p className="min-w-0 flex-1 truncate text-sm font-medium text-slate-900">
                      {lead.name}
                    </p>
                    <span className="shrink-0 text-[10px] text-slate-400">
                      {timeAgo(lead.createdAt)}
                    </span>
                  </div>
                  <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-slate-500">
                    {lead.email && (
                      <span className="flex min-w-0 items-center gap-1">
                        <Mail className="h-3 w-3 shrink-0" />
                        <span className="truncate">{lead.email}</span>
                      </span>
                    )}
                    {lead.phone && (
                      <span className="flex items-center gap-1">
                        <Phone className="h-3 w-3 shrink-0" />
                        {lead.phone}
                      </span>
                    )}
                    {lead.customAnswers && lead.customAnswers.length > 0 && (
                      <span className="flex items-center gap-1 rounded-md bg-electric-500/12 px-1.5 py-0.5 text-[10px] font-medium text-electric-700">
                        💬 {lead.customAnswers.length} answer
                        {lead.customAnswers.length === 1 ? "" : "s"}
                      </span>
                    )}
                  </div>
                  {/* Pipeline + stage + source chips on one wrap-friendly
                      row. Source is now displayed inline as a tinted chip
                      (no longer floating on the right), with the
                      "funnel:" / "sec_" prefix stripped so the visible
                      string is short and human-readable. */}
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    {pipeline ? (
                      <span className="flex max-w-full items-center gap-1 rounded-md bg-electric-500/12 px-1.5 py-0.5 text-[10px] font-medium text-electric-700">
                        <KanbanSquare className="h-3 w-3 shrink-0" />
                        <span className="truncate">
                          {pipeline.name}
                          {stageName && (
                            <>
                              <span className="text-electric-700/55"> · </span>
                              {stageName}
                            </>
                          )}
                        </span>
                      </span>
                    ) : (
                      <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">
                        Not in pipeline
                      </span>
                    )}
                    <span className="max-w-[10rem] truncate rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">
                      {formatLeadSource(lead.source)}
                    </span>
                  </div>
                </div>

                {/* Per-row delete — only when NOT in selection mode (in
                    selection mode the whole row toggles selection, so a
                    second clickable target would be confusing). Compact
                    icon button so it doesn't fight the lead info for
                    visual weight. */}
                {!selecting && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setPendingDelete({ kind: "one", lead });
                    }}
                    aria-label={`Delete ${lead.name}`}
                    className="ml-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-300 transition-colors hover:bg-red-500/10 hover:text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Sticky bulk-action bar — appears at the bottom of the viewport
          when at least one lead is selected. Designed to feel like an
          iOS action sheet: high contrast, primary CTA, easy to cancel. */}
      {selecting && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-slate-50/95 px-4 py-3 pb-safe shadow-2xl backdrop-blur">
          <div className="mx-auto flex max-w-5xl items-center gap-2.5">
            <button
              type="button"
              onClick={exitSelectMode}
              aria-label="Exit selection"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100"
            >
              <X className="h-4 w-4" />
            </button>
            <p className="flex-1 truncate text-sm font-medium text-slate-900">
              {selectedCount === 0
                ? "Tap a lead to select"
                : `${selectedCount} selected`}
            </p>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                if (selectedCount === 0) {
                  toast.error("Select at least one lead first.");
                  return;
                }
                setPendingDelete({
                  kind: "bulk",
                  ids: Array.from(selectedIds),
                });
              }}
              leftIcon={<Trash2 className="h-3.5 w-3.5" />}
              className="!border-red-500/30 !text-red-700 hover:!bg-red-500/10"
            >
              Delete
            </Button>
            <Button
              size="sm"
              onClick={() => {
                if (selectedCount === 0) {
                  toast.error("Select at least one lead first.");
                  return;
                }
                setEnrollOpen(true);
              }}
              leftIcon={<UserPlus className="h-3.5 w-3.5" />}
            >
              Add to pipeline
            </Button>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!pendingDelete}
        loading={deleting}
        onCancel={() => !deleting && setPendingDelete(null)}
        onConfirm={confirmDelete}
        title={
          pendingDelete?.kind === "one"
            ? "Delete this lead?"
            : `Delete ${pendingDelete?.ids?.length ?? 0} leads?`
        }
        confirmLabel={
          pendingDelete?.kind === "one"
            ? "Delete lead"
            : `Delete ${pendingDelete?.ids?.length ?? 0}`
        }
        body={
          pendingDelete?.kind === "one" ? (
            <p>
              <span className="font-medium text-slate-900">
                {pendingDelete.lead.name}
              </span>{" "}
              and all their contact info will be permanently removed from
              your inbox, pipelines, and today&apos;s tasks. This can&apos;t
              be undone.
            </p>
          ) : (
            <p>
              These leads will be permanently removed from your inbox,
              pipelines, and today&apos;s tasks. This can&apos;t be undone.
            </p>
          )
        }
      />

      <AddToPipelineModal
        open={enrollOpen}
        onClose={() => setEnrollOpen(false)}
        leadIds={Array.from(selectedIds)}
        pipelines={pipelines}
        onEnrolled={(pipelineId, stageId) => {
          /* Optimistically patch local state so the kanban/lead badges
             reflect the move without a Firestore re-read. */
          setLeads((prev) =>
            prev.map((l) =>
              selectedIds.has(l.id)
                ? {
                    ...l,
                    pipelineId,
                    stageId,
                    stageEnteredAt: Date.now(),
                  }
                : l,
            ),
          );
          exitSelectMode();
        }}
      />
    </div>
  );
}
