/**
 * Team-in-a-box join orchestrator.
 *
 * When a recruit joins a team via /join/team/{code} or the universal
 * code card on the dashboard, this helper fires AFTER the
 * TeamMembership doc is written and applies the leader's configured
 * "onboarding bundle": training grants, funnel clones, pipeline
 * clones, and event RSVPs.
 *
 * Design notes:
 *   - Plan caps short-circuit per item — over-cap items are silently
 *     skipped and reported in the summary so the recruit sees an
 *     upgrade nudge without blocking the join.
 *   - Idempotent. Re-running for a user who has already received
 *     items is safe — training grants and RSVPs upsert by composite
 *     id; funnel + pipeline clones de-dupe by checking for an
 *     existing copy that came from the same source id.
 *   - Past events are filtered out (RSVPing to a finished event is
 *     noise).
 *   - Cloned pipelines are forced isDefault=false so the recruit's
 *     existing default isn't displaced.
 *
 * Bundle changes are NOT retroactive — they apply at join time only.
 * If the leader edits the bundle later, existing members keep what
 * they already received and the new items only flow to future joins.
 */

import {
  activateTrainingForUser,
  getFunnelById,
  getPipeline,
  joinTeamSpace,
  listEventsForTeamSpace,
  listFunnels,
  listPipelinesForUser,
  listTrainingAccessForUser,
  saveFunnel,
  setEventRsvp,
  upsertPipeline,
} from "@/lib/firebase/firestore";
import {
  resolveUserFunnelLimit,
  resolveUserPipelineLimit,
  resolveUserTrainingsActivateLimit,
} from "@/lib/constants";
import { slugify, uid } from "@/lib/utils";
import type {
  AccountUser,
  Funnel,
  Pipeline,
  Plan,
  TeamMembership,
  TeamSpace,
} from "@/types";

/**
 * Per-slot result. `granted` = how many items were actually applied,
 * `skipped` = how many were dropped due to plan caps / past dates / etc.
 * Surfaced on the join-success summary screen.
 */
export interface BundleSlotResult {
  granted: number;
  skipped: number;
  /** Reason a skip happened — surfaced on the summary screen. */
  skipReason?: "plan-cap" | "missing-source" | "past-event";
}

export interface BundleResult {
  membership: TeamMembership;
  trainings: BundleSlotResult;
  funnels: BundleSlotResult;
  pipelines: BundleSlotResult;
  events: BundleSlotResult;
}

const EMPTY_SLOT: BundleSlotResult = { granted: 0, skipped: 0 };

export async function joinTeamWithBundle(input: {
  account: AccountUser;
  space: TeamSpace;
  plans: Plan[];
  joinedVia: TeamMembership["joinedVia"];
}): Promise<BundleResult> {
  const { account, space, plans, joinedVia } = input;
  /* 1) Always create the team membership first. The bundle is a
        best-effort sweetener — if a sub-step fails we still want the
        recruit inside the team. */
  const membership = await joinTeamSpace({
    userId: account.uid,
    teamSpaceId: space.id,
    ownerId: space.ownerId,
    joinedVia,
    userDisplayName: account.displayName,
    userEmail: account.email,
    userPhotoURL: account.photoURL,
  });

  /* 2) Run the four slots in parallel — they touch independent
        collections so there's no ordering dependency. Per-slot
        errors are caught and reported as "skipped" rather than
        propagating, so one broken funnel can't kill the whole
        bundle. */
  const [trainings, funnels, pipelines, events] = await Promise.all([
    grantTrainings(account, plans, space.autoGrantTrainingIds ?? [], space.ownerId).catch(
      () => EMPTY_SLOT,
    ),
    cloneFunnels(account, plans, space.autoGrantFunnelIds ?? []).catch(
      () => EMPTY_SLOT,
    ),
    clonePipelines(account, plans, space.autoGrantPipelineIds ?? []).catch(
      () => EMPTY_SLOT,
    ),
    rsvpEvents(account, space, space.autoGrantEventIds ?? []).catch(
      () => EMPTY_SLOT,
    ),
  ]);

  return { membership, trainings, funnels, pipelines, events };
}

/* ── Training grants ─────────────────────────────────────────────── */

async function grantTrainings(
  account: AccountUser,
  plans: Plan[],
  trainingIds: string[],
  teamOwnerId: string,
): Promise<BundleSlotResult> {
  if (trainingIds.length === 0) return { ...EMPTY_SLOT };
  const cap = resolveUserTrainingsActivateLimit(account, plans);
  const existing = await listTrainingAccessForUser(account.uid).catch(() => []);
  const existingIds = new Set(existing.map((e) => e.trainingId));
  let used = existing.length;
  let granted = 0;
  let skipped = 0;
  for (const tid of trainingIds) {
    if (existingIds.has(tid)) continue; /* already unlocked, no-op */
    if (used >= cap) {
      skipped += 1;
      continue;
    }
    try {
      await activateTrainingForUser({
        userId: account.uid,
        trainingId: tid,
        ownerId: teamOwnerId,
        unlockedVia: "activation",
      });
      granted += 1;
      used += 1;
    } catch {
      skipped += 1;
    }
  }
  return {
    granted,
    skipped,
    ...(skipped > 0 ? { skipReason: "plan-cap" as const } : {}),
  };
}

/* ── Funnel clones ──────────────────────────────────────────────── */

async function cloneFunnels(
  account: AccountUser,
  plans: Plan[],
  funnelIds: string[],
): Promise<BundleSlotResult> {
  if (funnelIds.length === 0) return { ...EMPTY_SLOT };
  const cap = resolveUserFunnelLimit(account, plans);
  const existing = await listFunnels(account.uid).catch(() => []);
  /* Reserved slugs so we don't collide with the recruit's own funnels. */
  const usedSlugs = new Set(existing.map((f) => f.slug));
  /* Source-id dedup: if the recruit already has a funnel cloned from
     this source (from a prior bundle run), skip re-cloning. This is
     what makes the "re-scan QR to sync" pattern safe. */
  const alreadyClonedSources = new Set(
    existing
      .map((f) => f.clonedFromBundleSource)
      .filter((s): s is string => Boolean(s)),
  );
  let count = existing.length;
  let granted = 0;
  let skipped = 0;
  for (const fid of funnelIds) {
    if (alreadyClonedSources.has(fid)) continue; /* re-scan: already have it */
    if (count >= cap) {
      skipped += 1;
      continue;
    }
    try {
      const source = await getFunnelById(fid);
      if (!source) {
        skipped += 1;
        continue;
      }
      const slug = uniqueSlug(slugify(source.name) || "funnel", usedSlugs);
      usedSlugs.add(slug);
      const now = Date.now();
      /* bundleTag is the stable identifier Credibly Links use to find
         the recruit's copy of this funnel. Inherit from the source if
         the leader explicitly set one; otherwise derive from the
         source's slug (so hub funnels with "Link to my funnel: launch-
         guide" buttons keep working without the leader having to
         manage tags manually). */
      const bundleTag = source.bundleTag ?? source.slug;
      const cloned: Funnel = {
        ...source,
        id: uid("funnel"),
        ownerId: account.uid,
        slug,
        status: "draft",
        clonedFromBundleSource: fid,
        bundleTag,
        createdAt: now,
        updatedAt: now,
      };
      await saveFunnel(cloned);
      alreadyClonedSources.add(fid);
      granted += 1;
      count += 1;
    } catch {
      skipped += 1;
    }
  }
  return {
    granted,
    skipped,
    ...(skipped > 0 ? { skipReason: "plan-cap" as const } : {}),
  };
}

/* ── Pipeline clones ────────────────────────────────────────────── */

async function clonePipelines(
  account: AccountUser,
  plans: Plan[],
  pipelineIds: string[],
): Promise<BundleSlotResult> {
  if (pipelineIds.length === 0) return { ...EMPTY_SLOT };
  const cap = resolveUserPipelineLimit(account, plans);
  const existing = await listPipelinesForUser(account.uid).catch(() => []);
  /* Source-id dedup so re-scanning the team QR doesn't duplicate
     previously-cloned pipelines. See cloneFunnels for rationale. */
  const alreadyClonedSources = new Set(
    existing
      .map((p) => p.clonedFromBundleSource)
      .filter((s): s is string => Boolean(s)),
  );
  let count = existing.length;
  let granted = 0;
  let skipped = 0;
  for (const pid of pipelineIds) {
    if (alreadyClonedSources.has(pid)) continue; /* re-scan: already have it */
    if (count >= cap) {
      skipped += 1;
      continue;
    }
    try {
      const source = await getPipeline(pid);
      if (!source) {
        skipped += 1;
        continue;
      }
      const now = Date.now();
      const cloned: Pipeline = {
        ...source,
        id: uid("pipe"),
        ownerId: account.uid,
        isDefault: false, /* never displace the recruit's own default */
        shareCode: undefined,
        cloneCount: undefined,
        clonedFromBundleSource: pid,
        /* Fresh stage ids so the leader editing the source doesn't
           propagate to the recruit and vice-versa. */
        stages: source.stages.map((s) => ({
          ...s,
          id: uid("stage"),
        })),
        createdAt: now,
        updatedAt: now,
      };
      await upsertPipeline(cloned);
      alreadyClonedSources.add(pid);
      granted += 1;
      count += 1;
    } catch {
      skipped += 1;
    }
  }
  return {
    granted,
    skipped,
    ...(skipped > 0 ? { skipReason: "plan-cap" as const } : {}),
  };
}

/* ── Event RSVPs ────────────────────────────────────────────────── */

async function rsvpEvents(
  account: AccountUser,
  space: TeamSpace,
  eventIds: string[],
): Promise<BundleSlotResult> {
  if (eventIds.length === 0) return { ...EMPTY_SLOT };
  const events = await listEventsForTeamSpace(space.id).catch(() => []);
  const byId = new Map(events.map((e) => [e.id, e] as const));
  const now = Date.now();
  let granted = 0;
  let skipped = 0;
  for (const eid of eventIds) {
    const event = byId.get(eid);
    if (!event) {
      skipped += 1;
      continue;
    }
    if (event.endAt < now) {
      skipped += 1; /* event already finished — RSVPing would be noise */
      continue;
    }
    try {
      await setEventRsvp({
        userId: account.uid,
        eventId: event.id,
        teamSpaceId: space.id,
        status: "going",
      });
      granted += 1;
    } catch {
      skipped += 1;
    }
  }
  return {
    granted,
    skipped,
    ...(skipped > 0 ? { skipReason: "past-event" as const } : {}),
  };
}

/* ── Slug helper ────────────────────────────────────────────────── */

function uniqueSlug(base: string, taken: Set<string>): string {
  if (!taken.has(base)) return base;
  for (let i = 2; i < 1000; i += 1) {
    const candidate = `${base}-${i}`;
    if (!taken.has(candidate)) return candidate;
  }
  /* Pathological tie-breaker — unlikely to ever fire. */
  return `${base}-${Date.now().toString(36)}`;
}
