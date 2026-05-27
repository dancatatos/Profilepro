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
  UserPlus,
  X,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { listLeads, listPipelinesForUser } from "@/lib/firebase/firestore";
import { PageHeader } from "@/components/common/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/common/EmptyState";
import { AddToPipelineModal } from "@/components/leads/AddToPipelineModal";
import { cn, timeAgo } from "@/lib/utils";
import { toast } from "@/store/uiStore";
import type { Lead, Pipeline } from "@/types";

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
                  ? "border-electric-500/50 bg-electric-500/15 text-electric-300"
                  : "border-white/10 bg-white/[0.04] text-white/65 hover:bg-white/[0.08]",
              )}
            >
              {f.label}
              <span
                className={cn(
                  "rounded-full px-1.5 text-[10px]",
                  filter === f.key
                    ? "bg-electric-500/20 text-electric-200"
                    : "bg-white/[0.08] text-white/45",
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
              className="ml-auto flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1 text-[11px] font-medium text-white/65 hover:bg-white/[0.05]"
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
        <Card className="p-8 text-center text-sm text-white/40">
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
                      <CheckSquare className="h-5 w-5 text-electric-300" />
                    ) : (
                      <Square className="h-5 w-5 text-white/30" />
                    )}
                  </button>
                )}

                <Avatar name={lead.name} size={42} />

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-white">
                    {lead.name}
                  </p>
                  <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-white/45">
                    {lead.email && (
                      <span className="flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {lead.email}
                      </span>
                    )}
                    {lead.phone && (
                      <span className="flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {lead.phone}
                      </span>
                    )}
                  </div>
                  {/* Pipeline / stage indicator — single source of truth
                      for "where is this lead in my workflow". */}
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    {pipeline ? (
                      <span className="flex items-center gap-1 rounded-md bg-electric-500/12 px-1.5 py-0.5 text-[10px] font-medium text-electric-300">
                        <KanbanSquare className="h-3 w-3" />
                        {pipeline.name}
                        {stageName && (
                          <>
                            <span className="text-electric-300/55">·</span>
                            {stageName}
                          </>
                        )}
                      </span>
                    ) : (
                      <span className="rounded-md bg-white/[0.05] px-1.5 py-0.5 text-[10px] font-medium text-white/45">
                        Not in pipeline
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-right">
                  <Badge tone="blue">{lead.source}</Badge>
                  <p className="mt-1 text-[10px] text-white/35">
                    {timeAgo(lead.createdAt)}
                  </p>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Sticky bulk-action bar — appears at the bottom of the viewport
          when at least one lead is selected. Designed to feel like an
          iOS action sheet: high contrast, primary CTA, easy to cancel. */}
      {selecting && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-white/10 bg-ink-950/95 px-4 py-3 pb-safe shadow-2xl backdrop-blur">
          <div className="mx-auto flex max-w-5xl items-center gap-2.5">
            <button
              type="button"
              onClick={exitSelectMode}
              aria-label="Exit selection"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/10 text-white/65 hover:bg-white/5"
            >
              <X className="h-4 w-4" />
            </button>
            <p className="flex-1 truncate text-sm font-medium text-white">
              {selectedCount === 0
                ? "Tap a lead to select"
                : `${selectedCount} selected`}
            </p>
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
