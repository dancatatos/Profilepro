/**
 * Public Follow-Up pipeline showcase.
 *
 * URL: /showcase/pipelines/{username}
 *
 * Purpose: a read-only render of a real user's default pipeline so it
 * can be embedded inside the homepage Phone-frame for the
 * Follow-Up Automation deep-dive. Visitors see authentic stage names
 * and follow-up cadence from a working Credibly account without
 * needing to log in, and without hitting the in-app "Pro feature"
 * upsell screen that /pipelines shows to non-Pro users.
 *
 * Implementation:
 *   - Server component. Resolves username → ownerId via the public
 *     profiles collection, then reads the owner's default pipeline
 *     via the Firebase Admin SDK (bypasses Firestore rules since
 *     pipelines aren't public-readable).
 *   - Lead names + counts are synthetic so we never leak real
 *     prospect PII into a public marketing page. The stage names,
 *     colours, follow-up cadence and goal text ARE real — that's the
 *     point of the showcase.
 *   - Renders the dark dashboard aesthetic so when it loads inside
 *     the homepage phone frame the visitor reads it as a real
 *     in-app screenshot.
 */

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Clock, KanbanSquare, Plus } from "lucide-react";
import { getAdminDb, isAdminConfigured } from "@/lib/firebase/admin";
import type { Pipeline, PipelineStage, Profile } from "@/types";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Pipeline showcase",
  /* Don't index — it's a marketing iframe asset, not a stand-alone page. */
  robots: { index: false, follow: false },
};

/* Synthetic prospects spread across the stages. Keeps the showcase
   feeling "lived in" without leaking any real lead data. */
const SAMPLE_LEAD_POOL = [
  "Maria S.",
  "Rico C.",
  "Diane M.",
  "JM Reyes",
  "Aira P.",
  "Carlos D.",
  "Bea T.",
  "Mikko L.",
  "Joyce H.",
  "Nathan G.",
  "Pia O.",
  "Bryan A.",
];

const STAGE_NOTES = [
  "Saw FB ad — replied today",
  "Watched 80% of training",
  "Asked about pricing",
  "Joined webinar",
  "Wants follow-up Mon",
  "Said “interested” via DM",
  "Replied to opt-in email",
  "Friend referred",
  "From TikTok comment",
  "Booked discovery call",
];

async function loadPipeline(
  username: string,
): Promise<{ pipeline: Pipeline; ownerName: string } | null> {
  if (!isAdminConfigured()) return null;
  const db = getAdminDb();
  /* 1) Resolve username → ownerId via the public profiles collection. */
  const profileSnap = await db
    .collection("profiles")
    .where("username", "==", username.toLowerCase())
    .limit(1)
    .get();
  if (profileSnap.empty) return null;
  const profile = profileSnap.docs[0].data() as Profile;
  const ownerId = profile.ownerId;
  const ownerName = profile.header?.displayName ?? username;
  /* 2) Find the owner's default pipeline (or fall back to any). */
  const pipelineSnap = await db
    .collection("pipelines")
    .where("ownerId", "==", ownerId)
    .get();
  if (pipelineSnap.empty) return null;
  const pipelines = pipelineSnap.docs.map(
    (d) => ({ ...(d.data() as Pipeline), id: d.id }),
  );
  const pipeline =
    pipelines.find((p) => p.isDefault) ??
    pipelines.sort((a, b) => b.createdAt - a.createdAt)[0];
  return { pipeline, ownerName };
}

export default async function PipelineShowcasePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const data = await loadPipeline(username);
  if (!data) notFound();
  const { pipeline, ownerName } = data;
  const stages = [...pipeline.stages].sort(
    (a, b) => a.sortOrder - b.sortOrder,
  );
  return (
    <div className="min-h-screen bg-ink-950 text-white">
      <div className="border-b border-white/[0.06] bg-white/[0.02] px-4 py-3">
        <div className="flex items-center gap-2">
          <KanbanSquare className="h-4 w-4 text-electric-300" />
          <p className="truncate text-sm font-semibold text-white">
            {pipeline.name}
          </p>
        </div>
        <p className="mt-0.5 truncate text-[11px] text-white/45">
          {ownerName}&apos;s follow-up board · {stages.length} stages
        </p>
      </div>
      <div className="overflow-x-auto px-3 py-3">
        <div className="flex gap-3" style={{ minWidth: "max-content" }}>
          {stages.map((stage, i) => (
            <ShowcaseColumn key={stage.id} stage={stage} columnIndex={i} />
          ))}
        </div>
      </div>
    </div>
  );
}

function ShowcaseColumn({
  stage,
  columnIndex,
}: {
  stage: PipelineStage;
  columnIndex: number;
}) {
  /* Pull 2-4 deterministic sample leads per column from the pool so
     reloads don't reshuffle the showcase. */
  const count = 2 + (columnIndex % 3);
  const start = (columnIndex * 3) % SAMPLE_LEAD_POOL.length;
  const leads = Array.from({ length: count }, (_, j) => ({
    name: SAMPLE_LEAD_POOL[(start + j) % SAMPLE_LEAD_POOL.length],
    note: STAGE_NOTES[(columnIndex * 2 + j) % STAGE_NOTES.length],
    overdue: columnIndex === 0 && j === 0,
  }));
  return (
    <div className="w-[230px] shrink-0 rounded-xl border border-white/[0.06] bg-white/[0.02] p-2.5">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="truncate text-[11px] font-semibold uppercase tracking-wider text-white/70">
          {stage.name}
        </p>
        <span className="rounded-md bg-white/[0.05] px-1.5 py-0.5 text-[10px] text-white/55">
          {leads.length}
        </span>
      </div>
      <div className="space-y-1.5">
        {leads.map((l) => (
          <div
            key={l.name}
            className={`rounded-lg border p-2 ${
              l.overdue
                ? "border-red-500/25 bg-red-500/[0.05]"
                : "border-white/[0.06] bg-white/[0.02]"
            }`}
          >
            <p className="truncate text-xs font-medium text-white">
              {l.name}
            </p>
            <p className="mt-0.5 truncate text-[10px] text-white/45">
              {l.note}
            </p>
            <div className="mt-1.5 flex items-center gap-1 text-[10px] text-white/40">
              <Clock className="h-2.5 w-2.5" />
              {l.overdue ? (
                <span className="text-red-300">2 days overdue</span>
              ) : (
                <span>Follow up tomorrow</span>
              )}
            </div>
          </div>
        ))}
        <button
          type="button"
          className="flex w-full items-center justify-center gap-1 rounded-lg border border-dashed border-white/[0.08] px-2 py-1.5 text-[10px] text-white/35 hover:text-white/55"
        >
          <Plus className="h-3 w-3" />
          Add lead
        </button>
      </div>
    </div>
  );
}
