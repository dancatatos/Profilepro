"use client";

/**
 * Daily Task Dashboard.
 *
 * The "what should I do today?" view for a user's follow-up pipelines.
 * Lists every lead whose nextTaskAt is overdue (red), due today/tomorrow
 * (amber), or coming up in 48h (blue). Tapping a row opens the full
 * lead detail modal so the user can copy an AI message and mark done.
 *
 * Designed to be the daily home page for serious users — opens to a
 * focused, finite list of things to do today. Push notifications at
 * 9 AM PHT (future work) will drive traffic here.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  CalendarClock,
  CheckCircle2,
  Crown,
  KanbanSquare,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { usePlanAccess } from "@/components/providers/PlanProvider";
import { PageHeader } from "@/components/common/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import {
  listLeadsWithUpcomingTasks,
  listPipelinesForUser,
} from "@/lib/firebase/firestore";
import { LeadDetailModal } from "@/components/pipelines/LeadDetailModal";
import { cn, timeUntil } from "@/lib/utils";
import { toast } from "@/store/uiStore";
import type { Lead, Pipeline } from "@/types";

type Bucket = "overdue" | "today" | "soon";

interface BucketedLead {
  lead: Lead;
  pipeline: Pipeline | null;
  bucket: Bucket;
}

const BUCKET_LABEL: Record<Bucket, string> = {
  overdue: "Overdue",
  today: "Due now",
  soon: "Coming up",
};

const BUCKET_TONE: Record<
  Bucket,
  { card: string; pill: "danger" | "gold" | "blue" }
> = {
  overdue: {
    card: "border-red-500/30 bg-red-500/[0.04]",
    pill: "danger",
  },
  today: {
    card: "border-gold-400/30 bg-gold-400/[0.04]",
    pill: "gold",
  },
  soon: {
    card: "border-slate-200 bg-slate-50",
    pill: "blue",
  },
};

function bucketForLead(lead: Lead): Bucket {
  const ts = lead.nextTaskAt ?? 0;
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;
  if (ts <= now - dayMs) return "overdue"; // 24+ hours past due
  if (ts <= now + dayMs) return "today"; // due now or within next 24h
  return "soon"; // due in next 48h
}

export default function PipelineTodayPage() {
  const { account, loading: authLoading } = useAuth();
  const { hasFeature } = usePlanAccess();
  const isPaid = hasFeature("follow_up_pipeline");

  const [bucketed, setBucketed] = useState<BucketedLead[]>([]);
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [loading, setLoading] = useState(false);
  const [openLead, setOpenLead] = useState<Lead | null>(null);

  const load = useCallback(async () => {
    if (!account) return;
    setLoading(true);
    try {
      const [leads, allPipelines] = await Promise.all([
        listLeadsWithUpcomingTasks(account.uid, 2),
        listPipelinesForUser(account.uid),
      ]);
      setPipelines(allPipelines);
      const pipeMap = new Map(allPipelines.map((p) => [p.id, p]));
      const rows: BucketedLead[] = leads.map((lead) => ({
        lead,
        pipeline: lead.pipelineId ? pipeMap.get(lead.pipelineId) ?? null : null,
        bucket: bucketForLead(lead),
      }));
      setBucketed(rows);
    } catch {
      toast.error("Couldn't load tasks.");
    } finally {
      setLoading(false);
    }
  }, [account]);

  useEffect(() => {
    if (account && isPaid) load();
  }, [account, isPaid, load]);

  /* Group leads into the three buckets in priority order. */
  const groups = useMemo(() => {
    const map: Record<Bucket, BucketedLead[]> = {
      overdue: [],
      today: [],
      soon: [],
    };
    for (const row of bucketed) map[row.bucket].push(row);
    return map;
  }, [bucketed]);

  if (authLoading || !account) {
    return (
      <div className="flex h-[40vh] items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!isPaid) {
    return (
      <div className="space-y-5">
        <PageHeader
          title="Today's Tasks"
          subtitle="Daily follow-ups across all your pipelines."
        />
        <Card className="border border-gold-400/20 bg-gradient-to-b from-gold-400/[0.06] to-transparent p-6 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-gold-300 to-gold-500">
            <Crown className="h-6 w-6 text-ink-950" />
          </div>
          <h3 className="mt-3 font-display text-base font-bold text-amber-700">
            Follow-Up is a Pro feature
          </h3>
          <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">
            Upgrade to unlock the daily task dashboard, follow-up pipelines
            and AI-assisted message scripts.
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

  const totalDue = bucketed.length;
  const overdueCount = groups.overdue.length;
  const todayCount = groups.today.length;

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <PageHeader
          title="Today's Tasks"
          subtitle={
            totalDue === 0
              ? "All caught up — no follow-ups due in the next 48 hours."
              : `${totalDue} follow-up${totalDue === 1 ? "" : "s"} on deck.`
          }
        />
        <div className="flex shrink-0 gap-2">
          <Button
            size="sm"
            variant="outline"
            href="/pipelines"
            leftIcon={<KanbanSquare className="h-3.5 w-3.5" />}
          >
            Board view
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={load}
            loading={loading}
            leftIcon={<RefreshCw className="h-3.5 w-3.5" />}
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats strip */}
      <div className="grid gap-2 sm:grid-cols-3">
        <StatTile label="Overdue" value={overdueCount} tone="overdue" />
        <StatTile label="Due now" value={todayCount} tone="today" />
        <StatTile
          label="Coming up (48h)"
          value={groups.soon.length}
          tone="soon"
        />
      </div>

      {/* Empty state */}
      {loading ? (
        <Card className="flex h-40 items-center justify-center text-sm text-slate-400">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Loading tasks…
        </Card>
      ) : totalDue === 0 ? (
        <Card className="flex flex-col items-center justify-center gap-2 p-12 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-jade-500/15">
            <CheckCircle2 className="h-6 w-6 text-jade-600" />
          </span>
          <p className="text-sm font-medium text-slate-900">All caught up</p>
          <p className="max-w-sm text-xs text-slate-500">
            No follow-ups due in the next 48 hours. Open your{" "}
            <Link href="/pipelines" className="text-electric-700 hover:underline">
              pipeline board
            </Link>{" "}
            to advance leads through stages.
          </p>
        </Card>
      ) : (
        <div className="space-y-5">
          {(["overdue", "today", "soon"] as Bucket[]).map((bucket) => {
            const rows = groups[bucket];
            if (rows.length === 0) return null;
            return (
              <section key={bucket} className="space-y-2">
                <div className="flex items-center gap-2">
                  <h2 className="font-display text-sm font-semibold text-slate-900">
                    {BUCKET_LABEL[bucket]}
                  </h2>
                  <Badge tone={BUCKET_TONE[bucket].pill}>{rows.length}</Badge>
                </div>
                <div className="space-y-2">
                  {rows.map((row) => (
                    <TaskRow
                      key={row.lead.id}
                      bucketed={row}
                      onOpen={() => setOpenLead(row.lead)}
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}

      {/* Lead detail modal — same one used on the board view */}
      {openLead && (
        <LeadDetailModal
          open={!!openLead}
          onClose={() => setOpenLead(null)}
          lead={openLead}
          pipeline={
            pipelines.find((p) => p.id === openLead.pipelineId) ?? pipelines[0]
          }
          onUpdated={(patch) => {
            setBucketed((prev) =>
              prev
                .map((row) =>
                  row.lead.id === openLead.id
                    ? {
                        ...row,
                        lead: { ...row.lead, ...patch },
                        bucket: bucketForLead({ ...row.lead, ...patch }),
                      }
                    : row,
                )
                /* Drop rows whose next-task moved beyond the 48h window. */
                .filter(
                  (row) =>
                    row.lead.nextTaskAt &&
                    row.lead.nextTaskAt <=
                      Date.now() + 2 * 24 * 60 * 60 * 1000,
                ),
            );
            setOpenLead((cur) => (cur ? { ...cur, ...patch } : cur));
          }}
        />
      )}
    </div>
  );
}

/* ── Stat tile ── */

function StatTile({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: Bucket;
}) {
  const ring = BUCKET_TONE[tone].card;
  return (
    <Card className={cn("p-3", ring)}>
      <p className="text-[10px] font-medium uppercase tracking-wider text-slate-500">
        {label}
      </p>
      <p className="mt-1 font-display text-xl font-bold text-slate-900">{value}</p>
    </Card>
  );
}

/* ── Task row ── */

function TaskRow({
  bucketed,
  onOpen,
}: {
  bucketed: BucketedLead;
  onOpen: () => void;
}) {
  const { lead, pipeline, bucket } = bucketed;
  const stage = pipeline?.stages.find((s) => s.id === lead.stageId);
  const tone = BUCKET_TONE[bucket];

  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        "flex w-full items-center justify-between gap-3 rounded-xl border p-3 text-left transition-colors hover:bg-slate-50",
        tone.card,
      )}
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-slate-900">{lead.name}</p>
        <p className="truncate text-[11px] text-slate-500">
          {pipeline?.name ?? "No pipeline"}
          {stage ? ` · ${stage.name}` : ""}
        </p>
        {lead.taskNotes && (
          <p className="mt-1 line-clamp-1 text-[11px] text-slate-500">
            📝 {lead.taskNotes}
          </p>
        )}
      </div>
      <div className="shrink-0 text-right">
        <Badge tone={tone.pill}>
          <CalendarClock className="mr-0.5 h-3 w-3" />
          {lead.nextTaskAt ? timeUntil(lead.nextTaskAt) : "no date"}
        </Badge>
      </div>
    </button>
  );
}
