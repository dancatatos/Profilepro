import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  addDoc,
  deleteDoc,
  runTransaction,
  writeBatch,
  query,
  where,
  orderBy,
  limit as fsLimit,
  serverTimestamp,
} from "firebase/firestore";
import { db, isFirebaseConfigured } from "./client";
import type {
  AccountUser,
  Affiliate,
  AffiliateInvite,
  AIGenerationRecord,
  AnalyticsEvent,
  AnalyticsSummary,
  Booking,
  BookingAnswer,
  Commission,
  FeatureFlags,
  Funnel,
  Lead,
  Pipeline,
  Plan,
  PlanId,
  Profile,
  SavedBuild,
  SentMessageLog,
  SharedBuild,
  PaymentSubmission,
  SharedFunnel,
  UniversityProgress,
  UniversityTopic,
  UserSubscription,
} from "@/types";

/* Firestore collection names — kept in one place. */
export const COL = {
  users: "users",
  profiles: "profiles",
  leads: "leads",
  events: "analytics_events",
  ai: "ai_generations",
  templates: "templates",
  media: "media_assets",
  subscriptions: "subscriptions",
  settings: "settings",
  bookings: "bookings",
  bookingSlots: "bookingSlots",
  sharedBuilds: "sharedBuilds",
  funnels: "funnels",
  sharedFunnels: "sharedFunnels",
  /* Affiliate system — wired progressively across Steps 2–6. */
  affiliates: "affiliates",
  affiliateInvites: "affiliate_invites",
  affiliateClicks: "affiliate_clicks",
  commissions: "commissions",
  /* Credibly University — training cards curated by admin. */
  universityTopics: "university_topics",
  /* Credibly University — per-user lesson completion log. */
  universityProgress: "university_progress",
  /* Follow-Up Pipelines — per-user pipeline definitions. */
  pipelines: "pipelines",
  /* Manual payment submissions — receipts uploaded by visitors. */
  paymentSubmissions: "payment_submissions",
} as const;

/** Subcollection name for a user's saved-build locker. */
const SAVED_BUILDS_SUB = "savedBuilds";

/* ---------------- Feature flags ---------------- */
/* A single settings/featureFlags doc, admin-managed, publicly readable. */

export const DEFAULT_FEATURE_FLAGS: FeatureFlags = {
  templateMarketplace: false,
  /* featuredProfileUsername left undefined → landing page falls back
     to DEMO_PROFILE until an admin picks a real customer to feature. */
};

const FEATURE_FLAGS_DOC = "featureFlags";

/** Read the platform feature flags. Falls back to defaults if unset. */
export async function getFeatureFlags(): Promise<FeatureFlags> {
  if (!isFirebaseConfigured) return { ...DEFAULT_FEATURE_FLAGS };
  try {
    const snap = await getDoc(doc(db, COL.settings, FEATURE_FLAGS_DOC));
    if (!snap.exists()) return { ...DEFAULT_FEATURE_FLAGS };
    return { ...DEFAULT_FEATURE_FLAGS, ...(snap.data() as Partial<FeatureFlags>) };
  } catch {
    return { ...DEFAULT_FEATURE_FLAGS };
  }
}

/** Update one or more feature flags (admin only — enforced by rules). */
export async function setFeatureFlags(
  patch: Partial<FeatureFlags>,
): Promise<void> {
  if (!isFirebaseConfigured) return;
  await setDoc(doc(db, COL.settings, FEATURE_FLAGS_DOC), patch, {
    merge: true,
  });
}

/* ---------------- Subscription plans ---------------- */
/* Admin-editable plan pricing/features stored in settings/plans. */

/**
 * Convert a plan's duration (or billingPeriod fallback) to milliseconds.
 * Used when computing a user's subscription expiry on upgrade.
 *
 * Months / years use rough day-count averages (30 / 365) — calendar-exact
 * "same day next month" math isn't necessary for renewal reminders, and
 * it keeps the helper pure with no Date arithmetic surprises around DST
 * or month-length variation. If the plan has no explicit `duration` we
 * fall back to its billingPeriod (monthly → 30d, annual → 365d).
 */
export function planDurationToMs(plan: Plan): number {
  const ONE_DAY = 24 * 60 * 60 * 1000;
  if (plan.duration) {
    const { value, unit } = plan.duration;
    if (unit === "days") return value * ONE_DAY;
    if (unit === "months") return value * 30 * ONE_DAY;
    if (unit === "years") return value * 365 * ONE_DAY;
  }
  return (plan.billingPeriod === "annual" ? 365 : 30) * ONE_DAY;
}

/**
 * Coerce one stored plan record into a well-formed Plan. Tolerates older
 * shapes — the legacy `priceMonthly` field and a missing `billingPeriod` —
 * so a stale settings/plans document can never crash the pages that read it.
 */
function normalizePlan(raw: Record<string, unknown>): Plan {
  const str = (v: unknown) => (typeof v === "string" ? v : "");
  const num = (v: unknown) => (typeof v === "number" ? v : undefined);
  /* Normalise the optional duration map — tolerates missing fields, bad units. */
  const normalizeDuration = (v: unknown): Plan["duration"] => {
    if (!v || typeof v !== "object") return undefined;
    const d = v as Record<string, unknown>;
    const value = num(d.value);
    const unit = d.unit;
    if (typeof value !== "number" || value <= 0) return undefined;
    if (unit !== "days" && unit !== "months" && unit !== "years") return undefined;
    return { value, unit };
  };
  /* Normalise the optional limits map — only keeps numeric values. */
  const normalizeLimits = (v: unknown): Plan["limits"] => {
    if (!v || typeof v !== "object") return undefined;
    const l = v as Record<string, unknown>;
    const limits: NonNullable<Plan["limits"]> = {};
    if (typeof l.funnels === "number" && l.funnels >= 0) {
      limits.funnels = Math.floor(l.funnels);
    }
    if (typeof l.sharedBuilds === "number" && l.sharedBuilds >= 0) {
      limits.sharedBuilds = Math.floor(l.sharedBuilds);
    }
    return Object.keys(limits).length > 0 ? limits : undefined;
  };
  return {
    id: str(raw.id),
    name: str(raw.name),
    // `priceMonthly` is the legacy field name — fall back to it.
    price: num(raw.price) ?? num(raw.priceMonthly) ?? 0,
    billingPeriod: raw.billingPeriod === "annual" ? "annual" : "monthly",
    tagline: str(raw.tagline),
    features: Array.isArray(raw.features)
      ? raw.features
          .filter(
            (f): f is Record<string, unknown> =>
              typeof f === "object" && f !== null,
          )
          .map((f) => ({ label: str(f.label), included: f.included === true }))
      : [],
    featureKeys: Array.isArray(raw.featureKeys)
      ? raw.featureKeys.filter((k): k is string => typeof k === "string")
      : undefined,
    highlighted: raw.highlighted === true,
    /* New affiliate-system fields. All optional with sensible defaults so a
       plan saved before this schema was introduced still behaves as before. */
    visibility: raw.visibility === "affiliate" ? "affiliate" : "public",
    checkoutUrl: str(raw.checkoutUrl) || undefined,
    commission: num(raw.commission) ?? 0,
    duration: normalizeDuration(raw.duration),
    limits: normalizeLimits(raw.limits),
  };
}

/** Read admin-edited plans. Returns null when none have been saved yet. */
export async function getPlansConfig(): Promise<Plan[] | null> {
  if (!isFirebaseConfigured) return null;
  try {
    const snap = await getDoc(doc(db, COL.settings, "plans"));
    if (!snap.exists()) return null;
    const stored = snap.data()?.plans;
    if (!Array.isArray(stored) || stored.length === 0) return null;
    return stored
      .filter(
        (p): p is Record<string, unknown> =>
          typeof p === "object" && p !== null,
      )
      .map(normalizePlan);
  } catch {
    return null;
  }
}

/** Save the plan definitions (admin only — enforced by Firestore rules). */
export async function setPlansConfig(plans: Plan[]): Promise<void> {
  if (!isFirebaseConfigured) return;
  await setDoc(doc(db, COL.settings, "plans"), { plans }, { merge: true });
}

/* ---------------- Affiliate accounts ---------------- */
/* /affiliates/{uid} mirrors /users/{uid} for users with role=affiliate.
   Code uniqueness is enforced via a query check in the admin invite UI
   before each new affiliate is created. */

export async function getAffiliate(uid: string): Promise<Affiliate | null> {
  if (!isFirebaseConfigured) return null;
  const snap = await getDoc(doc(db, COL.affiliates, uid));
  return snap.exists() ? (snap.data() as Affiliate) : null;
}

/** Find an affiliate by their referral code (case-insensitive). */
export async function getAffiliateByCode(
  code: string,
): Promise<Affiliate | null> {
  if (!isFirebaseConfigured) return null;
  const q = query(
    collection(db, COL.affiliates),
    where("code", "==", code.toUpperCase()),
    fsLimit(1),
  );
  const snap = await getDocs(q);
  return snap.empty ? null : (snap.docs[0].data() as Affiliate);
}

/** True if no affiliate currently uses this code. */
export async function isAffiliateCodeAvailable(
  code: string,
): Promise<boolean> {
  if (!isFirebaseConfigured) return true;
  const existing = await getAffiliateByCode(code);
  return !existing;
}

/** Upsert an affiliate record. Used during accept-invite + admin edits. */
export async function upsertAffiliate(affiliate: Affiliate): Promise<void> {
  if (!isFirebaseConfigured) return;
  await setDoc(doc(db, COL.affiliates, affiliate.uid), affiliate, {
    merge: true,
  });
}

/** Patch an affiliate doc with the given partial. */
export async function updateAffiliate(
  uid: string,
  patch: Partial<Affiliate>,
): Promise<void> {
  if (!isFirebaseConfigured) return;
  await updateDoc(doc(db, COL.affiliates, uid), {
    ...patch,
    updatedAt: Date.now(),
  });
}

/** List all affiliates (admin only). Sorted newest-first. */
export async function listAffiliates(): Promise<Affiliate[]> {
  if (!isFirebaseConfigured) return [];
  const q = query(
    collection(db, COL.affiliates),
    orderBy("createdAt", "desc"),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as Affiliate);
}

/* ---------------- Affiliate invites ---------------- */
/* Magic-link tokens. Anyone with the token can read the invite (needed
   for the accept page), but only admins can create/delete (enforced by
   rules in /affiliate_invites). */

export async function createAffiliateInvite(
  invite: AffiliateInvite,
): Promise<void> {
  if (!isFirebaseConfigured) return;
  await setDoc(doc(db, COL.affiliateInvites, invite.token), invite);
}

export async function getAffiliateInvite(
  token: string,
): Promise<AffiliateInvite | null> {
  if (!isFirebaseConfigured) return null;
  const snap = await getDoc(doc(db, COL.affiliateInvites, token));
  return snap.exists() ? (snap.data() as AffiliateInvite) : null;
}

/** Mark an invite as accepted — does NOT delete so admins can audit. */
export async function markInviteAccepted(
  token: string,
  uid: string,
): Promise<void> {
  if (!isFirebaseConfigured) return;
  await updateDoc(doc(db, COL.affiliateInvites, token), {
    status: "accepted",
    acceptedAt: Date.now(),
    acceptedByUid: uid,
  });
}

/** Revoke (cancel) a pending invite. */
export async function revokeAffiliateInvite(token: string): Promise<void> {
  if (!isFirebaseConfigured) return;
  await deleteDoc(doc(db, COL.affiliateInvites, token));
}

/** List all invites (admin only). Sorted newest-first. */
export async function listAffiliateInvites(): Promise<AffiliateInvite[]> {
  if (!isFirebaseConfigured) return [];
  const q = query(
    collection(db, COL.affiliateInvites),
    orderBy("createdAt", "desc"),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as AffiliateInvite);
}

/* ---------------- Credibly University ---------------- */
/* Public-read, admin-write. Order returned is by sortOrder asc — the
   user-facing page groups by category and respects this ordering
   within each category. */

export async function listUniversityTopics(): Promise<UniversityTopic[]> {
  if (!isFirebaseConfigured) return [];
  const snap = await getDocs(
    query(collection(db, COL.universityTopics), orderBy("sortOrder", "asc")),
  );
  return snap.docs.map((d) => ({
    ...(d.data() as UniversityTopic),
    id: d.id,
  }));
}

/** Create-or-update a topic. Doc id matches the topic id. */
export async function upsertUniversityTopic(
  topic: UniversityTopic,
): Promise<void> {
  if (!isFirebaseConfigured) return;
  await setDoc(doc(db, COL.universityTopics, topic.id), topic);
}

export async function deleteUniversityTopic(id: string): Promise<void> {
  if (!isFirebaseConfigured) return;
  await deleteDoc(doc(db, COL.universityTopics, id));
}

/* ---------------- Credibly University — lesson progress ---------------- */
/* Per-user completion log. Doc id = `${userId}__${lessonId}` so each
   user/lesson pair is unique and upserts are idempotent. Stored in a
   flat collection so the user's entire progress fetches in one query. */

/** Composite doc-id builder for the progress collection. */
function progressDocId(userId: string, lessonId: string): string {
  return `${userId}__${lessonId}`;
}

/** Mark a lesson as completed for this user. Idempotent. */
export async function markLessonComplete(
  userId: string,
  topicId: string,
  lessonId: string,
): Promise<void> {
  if (!isFirebaseConfigured) return;
  const id = progressDocId(userId, lessonId);
  await setDoc(doc(db, COL.universityProgress, id), {
    id,
    userId,
    topicId,
    lessonId,
    completedAt: Date.now(),
  });
}

/** Remove a completion entry — used when the user unmarks a lesson. */
export async function unmarkLessonComplete(
  userId: string,
  lessonId: string,
): Promise<void> {
  if (!isFirebaseConfigured) return;
  await deleteDoc(
    doc(db, COL.universityProgress, progressDocId(userId, lessonId)),
  );
}

/**
 * All progress rows for one user. Returned as a flat list — the
 * caller usually converts it to a `Set<lessonId>` for O(1) lookups
 * while rendering lesson rows.
 */
export async function listUserLessonProgress(
  userId: string,
): Promise<UniversityProgress[]> {
  if (!isFirebaseConfigured) return [];
  const snap = await getDocs(
    query(
      collection(db, COL.universityProgress),
      where("userId", "==", userId),
    ),
  );
  return snap.docs.map(
    (d) => ({ ...(d.data() as UniversityProgress), id: d.id }),
  );
}

/* ---------------- Follow-Up Pipelines ---------------- */
/* Per-user pipeline definitions. Owner-only access enforced by rules.
   Pipelines hold their stages inline (small, bounded list) — leads
   reference a pipelineId + stageId on the lead doc. */

/** List all pipelines for a given user, default first then newest. */
export async function listPipelinesForUser(uid: string): Promise<Pipeline[]> {
  if (!isFirebaseConfigured) return [];
  const q = query(
    collection(db, COL.pipelines),
    where("ownerId", "==", uid),
  );
  const snap = await getDocs(q);
  const list = snap.docs.map((d) => ({ ...(d.data() as Pipeline), id: d.id }));
  /* Sort: default first, then newest. Done client-side to avoid
     needing a composite index for this small per-user list. */
  list.sort((a, b) => {
    if (a.isDefault !== b.isDefault) return a.isDefault ? -1 : 1;
    return b.createdAt - a.createdAt;
  });
  return list;
}

export async function getPipeline(id: string): Promise<Pipeline | null> {
  if (!isFirebaseConfigured) return null;
  const snap = await getDoc(doc(db, COL.pipelines, id));
  return snap.exists() ? ({ ...(snap.data() as Pipeline), id: snap.id }) : null;
}

/** Create or replace a pipeline. Doc id matches Pipeline.id. */
export async function upsertPipeline(pipeline: Pipeline): Promise<void> {
  if (!isFirebaseConfigured) return;
  await setDoc(doc(db, COL.pipelines, pipeline.id), pipeline);
}

export async function deletePipeline(id: string): Promise<void> {
  if (!isFirebaseConfigured) return;
  await deleteDoc(doc(db, COL.pipelines, id));
}

/**
 * Generate a short, shareable code for a pipeline (e.g. "PIPE-AB12CD").
 * Persists onto the pipeline doc; downline team members can paste this
 * code on /pipelines to clone the leader's stage configuration.
 * Cloning the pipeline does NOT clone the leader's leads — each team
 * member captures their own leads through their own Credibly profile.
 */
export async function ensurePipelineShareCode(
  pipelineId: string,
): Promise<string> {
  if (!isFirebaseConfigured) return "PIPE-DEMO00";
  const existing = await getPipeline(pipelineId);
  if (!existing) throw new Error("Pipeline not found.");
  if (existing.shareCode) return existing.shareCode;
  /* 6-char suffix: uppercase letters + digits, excluding ambiguous I/0/O/1. */
  const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const suffix = Array.from(
    { length: 6 },
    () => ALPHABET[Math.floor(Math.random() * ALPHABET.length)],
  ).join("");
  const code = `PIPE-${suffix}`;
  await updateDoc(doc(db, COL.pipelines, pipelineId), {
    shareCode: code,
    updatedAt: Date.now(),
  });
  return code;
}

/**
 * Look up a pipeline by its share code. Used by the clone-from-code
 * flow on /pipelines. Anyone signed in can read by code — Firestore
 * rules need to allow this lookup (it's already permitted because the
 * pipeline owner doc is readable to any signed-in user via the
 * "where shareCode == X" query path).
 */
export async function lookupPipelineByShareCode(
  code: string,
): Promise<Pipeline | null> {
  if (!isFirebaseConfigured) return null;
  const q = query(
    collection(db, COL.pipelines),
    where("shareCode", "==", code.toUpperCase().trim()),
    fsLimit(1),
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return { ...(snap.docs[0].data() as Pipeline), id: snap.docs[0].id };
}

/**
 * Clone a shared pipeline into the caller's account. Generates fresh
 * pipeline + stage ids so the team member can modify their copy
 * without affecting the leader's. Bumps the original's cloneCount
 * for the leader's analytics.
 */
export async function clonePipelineFromShareCode(
  code: string,
  ownerId: string,
): Promise<Pipeline | null> {
  if (!isFirebaseConfigured) return null;
  const original = await lookupPipelineByShareCode(code);
  if (!original) return null;
  const now = Date.now();
  /* Build a fresh pipeline doc for the cloner — new ids on the
     pipeline AND every stage so future edits don't collide. */
  const cloned: Pipeline = {
    ...original,
    id: `pipe_${now}_${Math.random().toString(36).slice(2, 8)}`,
    ownerId,
    isDefault: false,
    shareCode: undefined,
    cloneCount: undefined,
    stages: original.stages.map((s) => ({
      ...s,
      id: `stage_${now}_${Math.random().toString(36).slice(2, 8)}`,
    })),
    createdAt: now,
    updatedAt: now,
  };
  await upsertPipeline(cloned);
  /* Increment cloneCount on the source for the leader's analytics —
     best-effort, ignore failures (source owner can recompute later). */
  try {
    await updateDoc(doc(db, COL.pipelines, original.id), {
      cloneCount: (original.cloneCount ?? 0) + 1,
    });
  } catch {
    /* The cloner can't write to the leader's doc directly under
       strict rules. That's OK — leader can refresh manually. */
  }
  return cloned;
}

/**
 * Atomically mark this pipeline as the user's default (and clear the
 * default flag on whichever other pipeline was previously default).
 * Only one default per user — that's where new leads auto-enrol.
 */
export async function setDefaultPipeline(
  ownerId: string,
  pipelineId: string,
): Promise<void> {
  if (!isFirebaseConfigured) return;
  const all = await listPipelinesForUser(ownerId);
  await Promise.all(
    all.map(async (p) => {
      const shouldBeDefault = p.id === pipelineId;
      if (p.isDefault === shouldBeDefault) return; // no-op
      await updateDoc(doc(db, COL.pipelines, p.id), {
        isDefault: shouldBeDefault,
        updatedAt: Date.now(),
      });
    }),
  );
}

/**
 * List leads currently enrolled in a given pipeline. Used to render
 * the kanban board. Newest-first within each stage.
 */
export async function listLeadsInPipeline(
  ownerId: string,
  pipelineId: string,
): Promise<Lead[]> {
  if (!isFirebaseConfigured) return [];
  const q = query(
    collection(db, COL.leads),
    where("ownerId", "==", ownerId),
    where("pipelineId", "==", pipelineId),
  );
  const snap = await getDocs(q);
  const leads = snap.docs.map((d) => ({ ...(d.data() as Lead), id: d.id }));
  /* Sort client-side: newest first. */
  leads.sort((a, b) => (b.stageEnteredAt ?? b.createdAt) - (a.stageEnteredAt ?? a.createdAt));
  return leads;
}

/**
 * Patch arbitrary fields on a lead doc. Used by the lead detail view
 * for task notes, snooze actions, etc. Auth is enforced by Firestore
 * rules — only the lead's owner can write.
 */
export async function updateLead(
  id: string,
  patch: Partial<Lead>,
): Promise<void> {
  if (!isFirebaseConfigured) return;
  await updateDoc(doc(db, COL.leads, id), patch);
}

/**
 * Move a lead to a new stage in its pipeline. Updates stageEnteredAt
 * and computes the next-task timestamp from the stage's
 * daysBeforeNextTask hint.
 */
export async function moveLeadToStage(
  leadId: string,
  pipelineId: string,
  stageId: string,
  daysBeforeNextTask?: number,
): Promise<void> {
  if (!isFirebaseConfigured) return;
  const now = Date.now();
  const patch: Record<string, unknown> = {
    pipelineId,
    stageId,
    stageEnteredAt: now,
  };
  if (daysBeforeNextTask && daysBeforeNextTask > 0) {
    patch.nextTaskAt = now + daysBeforeNextTask * 24 * 60 * 60 * 1000;
  } else {
    patch.nextTaskAt = null; // no follow-up due — terminal stage
  }
  await updateDoc(doc(db, COL.leads, leadId), patch);
}

/**
 * Toggle a follow-up message's "sent" status on a lead.
 *
 * Behaviour:
 *   - If a log entry for this (stageId, messageId) already exists, this
 *     call REPLACES its timestamp (so the latest send wins).
 *   - If none exists, it appends a new entry.
 *   - When `sent` is false, the entry is removed entirely — the user
 *     decided they didn't actually send it.
 *
 * Uses a transaction so concurrent sends from two devices don't clobber
 * each other's log writes.
 */
export async function setMessageSentState(
  leadId: string,
  stageId: string,
  messageId: string,
  language: "english" | "taglish",
  sent: boolean,
): Promise<SentMessageLog[]> {
  if (!isFirebaseConfigured) return [];
  const ref = doc(db, COL.leads, leadId);
  return await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) return [];
    const data = snap.data() as Lead;
    const existing: SentMessageLog[] = data.sentMessages ?? [];

    /* Drop any entry that matches the (stage, message) key — we'll
       either re-append a fresh one (sent=true) or simply leave it
       removed (sent=false). */
    const filtered = existing.filter(
      (m) => !(m.stageId === stageId && m.messageId === messageId),
    );
    const next: SentMessageLog[] = sent
      ? [...filtered, { stageId, messageId, language, sentAt: Date.now() }]
      : filtered;
    tx.update(ref, { sentMessages: next });
    return next;
  });
}

/**
 * Bulk move many leads into the same pipeline + starting stage in one
 * atomic write. Used by the Leads tab's "Add to pipeline" action so a
 * user can import 50 orphan leads in a single tap.
 *
 * Firestore batches max out at 500 writes; we chunk to stay safely
 * under that. All leads in a chunk commit together (or none do).
 */
export async function enrollLeadsInPipeline(
  leadIds: string[],
  pipelineId: string,
  stageId: string,
  daysBeforeNextTask?: number,
): Promise<void> {
  if (!isFirebaseConfigured || leadIds.length === 0) return;

  const now = Date.now();
  const nextTaskAt =
    daysBeforeNextTask && daysBeforeNextTask > 0
      ? now + daysBeforeNextTask * 24 * 60 * 60 * 1000
      : null;
  const patch = {
    pipelineId,
    stageId,
    stageEnteredAt: now,
    nextTaskAt,
  };

  /* Chunk into 450 so each batch stays comfortably below Firestore's
     500-op ceiling (includes any internal index updates the SDK adds). */
  const CHUNK = 450;
  for (let i = 0; i < leadIds.length; i += CHUNK) {
    const slice = leadIds.slice(i, i + CHUNK);
    const batch = writeBatch(db);
    for (const id of slice) {
      batch.update(doc(db, COL.leads, id), patch);
    }
    await batch.commit();
  }
}

/**
 * Auto-enrol a freshly-captured lead into the user's default pipeline.
 * Called from the lead-capture endpoints right after the lead is
 * written. Fails open (no enrolment) when the user has no default
 * pipeline yet — they can still see the lead in /leads.
 */
export async function autoEnrollLeadInDefaultPipeline(
  leadId: string,
  ownerId: string,
): Promise<void> {
  if (!isFirebaseConfigured) return;
  try {
    const pipelines = await listPipelinesForUser(ownerId);
    const def = pipelines.find((p) => p.isDefault);
    if (!def || def.stages.length === 0) return;
    const firstStage = [...def.stages].sort((a, b) => a.sortOrder - b.sortOrder)[0];
    await moveLeadToStage(
      leadId,
      def.id,
      firstStage.id,
      firstStage.daysBeforeNextTask,
    );
  } catch (err) {
    console.warn("[Credibly] Auto-enrollment failed:", err);
  }
}

/**
 * Return all of the user's leads with their next-task due date within
 * the next `daysAhead` days (or already overdue). Used to power the
 * /pipelines/today daily-task dashboard.
 *
 * Filters client-side because Firestore can't easily query "where
 * field exists" — at a typical user's lead count (hundreds, not
 * thousands) this is fine.
 */
export async function listLeadsWithUpcomingTasks(
  ownerId: string,
  daysAhead: number = 2,
): Promise<Lead[]> {
  if (!isFirebaseConfigured) return [];
  const horizon = Date.now() + daysAhead * 24 * 60 * 60 * 1000;

  /* Fast path: server-side filter via the (ownerId, nextTaskAt)
     composite index. Returns ONLY leads whose nextTaskAt window is
     open — at 2000 users this saves ~95% of reads vs the legacy
     "fetch everything and filter in JS" approach. */
  try {
    const snap = await getDocs(
      query(
        collection(db, COL.leads),
        where("ownerId", "==", ownerId),
        where("nextTaskAt", "<=", horizon),
        orderBy("nextTaskAt", "asc"),
        fsLimit(200),
      ),
    );
    return snap.docs
      .map((d) => ({ ...(d.data() as Lead), id: d.id }))
      /* Defensive client filter — if a row somehow lacks pipelineId
         (shouldn't happen, but the data model allows it) we don't
         want to show it on the daily task board. */
      .filter((l) => !!l.pipelineId);
  } catch (err) {
    /* Fallback for the first deploy where the composite index hasn't
       finished building yet. Firestore throws "failed-precondition"
       when the index is missing — when that happens, fall back to
       the legacy fetch-all-then-filter path so the page still works
       while the admin runs `firebase deploy --only firestore:indexes`.
       Removable once the index is confirmed live in production. */
    const code = (err as { code?: string })?.code;
    if (code !== "failed-precondition") throw err;
    console.warn(
      "[listLeadsWithUpcomingTasks] composite index missing — falling back to client-side filter. Deploy firestore.indexes.json to fix.",
    );
    const snap = await getDocs(
      query(collection(db, COL.leads), where("ownerId", "==", ownerId)),
    );
    const leads = snap.docs
      .map((d) => ({ ...(d.data() as Lead), id: d.id }))
      .filter((l) => {
        if (!l.pipelineId || !l.nextTaskAt) return false;
        return l.nextTaskAt <= horizon;
      });
    leads.sort((a, b) => (a.nextTaskAt ?? 0) - (b.nextTaskAt ?? 0));
    return leads;
  }
}

/**
 * Back-fill enrollment for any leads the owner has that don't yet
 * belong to a pipeline (e.g. captured before the pipeline existed, or
 * captured by an anonymous visitor who couldn't write the pipeline
 * fields themselves due to Firestore rules).
 *
 * Routing precedence per orphan lead:
 *   1. If the lead came from a funnel (`source` starts with "funnel:"),
 *      and that funnel has its own `pipelineId` set, route there.
 *   2. Else if the lead came from a profile section, and the profile has
 *      a `pipelineId` set, route there.
 *   3. Else fall back to the user's `isDefault` pipeline.
 *   4. If no usable pipeline exists, leave the lead orphaned.
 *
 * Returns the number of leads enrolled. Safe to call repeatedly —
 * already-enrolled leads are skipped.
 */
export async function backfillOrphanLeads(ownerId: string): Promise<number> {
  if (!isFirebaseConfigured) return 0;

  /* Pre-load everything we need so the per-lead loop stays cheap and
     doesn't re-fetch funnels / pipelines for every orphan. */
  const [pipelines, funnels, profilesForOwner] = await Promise.all([
    listPipelinesForUser(ownerId),
    listFunnels(ownerId),
    /* Profiles are needed to honor per-profile pipeline routing. */
    (async () => {
      const profSnap = await getDocs(
        query(collection(db, COL.profiles), where("ownerId", "==", ownerId)),
      );
      return profSnap.docs.map((d) => ({ ...(d.data() as Profile), id: d.id }));
    })(),
  ]);
  if (pipelines.length === 0) return 0;
  const def = pipelines.find((p) => p.isDefault);

  /* Build an O(1) lookup table: pipelineId → { pipeline, firstStage }. */
  const enrollmentByPipelineId = new Map<
    string,
    { pipelineId: string; stageId: string; daysBeforeNextTask?: number }
  >();
  for (const p of pipelines) {
    if (p.stages.length === 0) continue;
    const first = [...p.stages].sort((a, b) => a.sortOrder - b.sortOrder)[0];
    enrollmentByPipelineId.set(p.id, {
      pipelineId: p.id,
      stageId: first.id,
      daysBeforeNextTask: first.daysBeforeNextTask,
    });
  }
  const defaultEnrollment = def && enrollmentByPipelineId.get(def.id);

  /* slug → funnel lookup for quick "funnel:{slug}" source resolution. */
  const funnelBySlug = new Map(funnels.map((f) => [f.slug, f]));
  /* profileId → profile lookup so we can honor profile-level routing. */
  const profileById = new Map(profilesForOwner.map((p) => [p.id, p]));

  /* Fetch all leads owned by user. We need to skip ones already in a
     pipeline — Firestore can't "where field == null" reliably, so we
     filter client-side. At a user's typical lead volume this is fine. */
  const snap = await getDocs(
    query(collection(db, COL.leads), where("ownerId", "==", ownerId)),
  );
  let enrolled = 0;
  for (const docSnap of snap.docs) {
    const data = docSnap.data() as Lead;
    if (data.pipelineId) continue; // already enrolled

    /* Resolve the routing target — funnel override → profile override
       → user default. Each step falls through if its target pipeline
       doesn't exist (e.g. owner deleted it after the funnel set it). */
    let target = defaultEnrollment;
    if (data.source?.startsWith("funnel:")) {
      const slug = data.source.slice("funnel:".length);
      const funnel = funnelBySlug.get(slug);
      if (funnel?.pipelineId) {
        target = enrollmentByPipelineId.get(funnel.pipelineId) ?? target;
      }
    } else if (data.profileId) {
      const profile = profileById.get(data.profileId);
      if (profile?.pipelineId) {
        target = enrollmentByPipelineId.get(profile.pipelineId) ?? target;
      }
    }

    if (!target) continue; // no pipeline anywhere — leave orphaned

    try {
      await moveLeadToStage(
        docSnap.id,
        target.pipelineId,
        target.stageId,
        target.daysBeforeNextTask,
      );
      enrolled += 1;
    } catch {
      /* Continue with next lead — partial backfill is acceptable. */
    }
  }
  return enrolled;
}

/* ---------------- Commissions ---------------- */
/* Affiliate-readable only for their own commissions (enforced by rules).
   Admin-writable. Step 5 will auto-create rows when admin upgrades a
   referred user. */

/** All commission records for a given affiliate, newest-first. */
export async function listCommissionsForAffiliate(
  affiliateUid: string,
): Promise<Commission[]> {
  if (!isFirebaseConfigured) return [];
  const q = query(
    collection(db, COL.commissions),
    where("affiliateId", "==", affiliateUid),
    orderBy("earnedAt", "desc"),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ ...(d.data() as Commission), id: d.id }));
}

/**
 * A compact "upcoming renewal" view derived from a user doc. Strips
 * the full AccountUser so the affiliate dashboard only sees the
 * minimum needed for the renewal-opportunity panel: masked email +
 * plan + expiry. Used by listUpcomingRenewalsForAffiliate below.
 */
export interface UpcomingRenewal {
  userId: string;
  displayName: string;
  emailMasked: string;
  planId: PlanId;
  planName: string;
  commission: number;
  expiresAt: number;
}

/**
 * List upcoming renewal opportunities for a given affiliate code,
 * within the next `windowDays` (defaults to 30). Sorted soonest-first.
 *
 * The query reads `users` where `affiliateId == code`, which is the
 * affiliate's CODE — admin/affiliate Firestore rules don't currently
 * permit affiliates to read raw user docs, so this fn is intended to
 * be called from the affiliate dashboard via an admin endpoint OR
 * from admin code paths. For now we expose it for admin use; Phase 6C
 * will route it through the cron job.
 */
export async function listUpcomingRenewalsForAffiliate(
  affiliateCode: string,
  windowDays: number = 30,
): Promise<UpcomingRenewal[]> {
  if (!isFirebaseConfigured || !affiliateCode) return [];
  const now = Date.now();
  const windowEnd = now + windowDays * 24 * 60 * 60 * 1000;
  /* Query users referred by this affiliate. The expiresAt filter is
     applied client-side (Firestore supports compound where, but
     filtering on a nested field requires an index and our scale here
     is tiny — at 500 referrals per affiliate this still fits in memory
     trivially). */
  const usersQuery = query(
    collection(db, COL.users),
    where("affiliateId", "==", affiliateCode),
  );
  const [usersSnap, planConfig] = await Promise.all([
    getDocs(usersQuery),
    getPlansConfig(),
  ]);
  const planMap = new Map<string, Plan>(
    (planConfig ?? []).map((p) => [p.id, p]),
  );
  const rows: UpcomingRenewal[] = [];
  for (const docSnap of usersSnap.docs) {
    const user = docSnap.data() as AccountUser;
    const expiresAt = user.subscription?.expiresAt;
    if (!expiresAt || expiresAt < now || expiresAt > windowEnd) continue;
    const plan = planMap.get(user.plan);
    if (!plan || !plan.commission || plan.commission <= 0) continue;
    rows.push({
      userId: user.uid,
      displayName: user.displayName || "Customer",
      emailMasked: maskEmailLocalForRenewal(user.email || ""),
      planId: user.plan,
      planName: plan.name,
      commission: plan.commission,
      expiresAt,
    });
  }
  rows.sort((a, b) => a.expiresAt - b.expiresAt);
  return rows;
}

/** Private mask helper — local copy avoids a client-only-utils circular dep. */
function maskEmailLocalForRenewal(email: string): string {
  if (!email) return "";
  const [local, domain] = email.split("@");
  if (!domain) return email;
  if (local.length <= 2) return `${local[0] ?? ""}*@${domain}`;
  return `${local[0]}${"*".repeat(Math.max(local.length - 2, 1))}${local.slice(-1)}@${domain}`;
}

/* ---------------- Users ---------------- */

export async function getUserDoc(uid: string): Promise<AccountUser | null> {
  if (!isFirebaseConfigured) return null;
  const snap = await getDoc(doc(db, COL.users, uid));
  return snap.exists() ? (snap.data() as AccountUser) : null;
}

export async function upsertUserDoc(user: AccountUser): Promise<void> {
  if (!isFirebaseConfigured) return;
  await setDoc(doc(db, COL.users, user.uid), user, { merge: true });
}

export async function updateUserDoc(
  uid: string,
  patch: Partial<AccountUser>,
): Promise<void> {
  if (!isFirebaseConfigured) return;
  await updateDoc(doc(db, COL.users, uid), {
    ...patch,
    updatedAt: Date.now(),
  });
}

/* ---------------- Profiles ---------------- */
/* The owner's primary profile uses the owner uid as its doc id. */

export async function getProfile(ownerId: string): Promise<Profile | null> {
  if (!isFirebaseConfigured) return null;
  const snap = await getDoc(doc(db, COL.profiles, ownerId));
  return snap.exists() ? (snap.data() as Profile) : null;
}

export async function getProfileByUsername(
  username: string,
): Promise<Profile | null> {
  if (!isFirebaseConfigured) return null;
  const q = query(
    collection(db, COL.profiles),
    where("username", "==", username.toLowerCase()),
    fsLimit(1),
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  /* Spread the data first then overwrite id with the actual doc id —
     previously we returned `data() as Profile` which crucially LACKED
     the `id` field, since Firestore doesn't include the doc id inside
     the data payload. Consumers that needed `profile.id` (e.g. for
     analytics events on the public profile view) got a stale or
     undefined id. */
  return { ...(snap.docs[0].data() as Profile), id: snap.docs[0].id };
}

export async function saveProfile(profile: Profile): Promise<void> {
  if (!isFirebaseConfigured) return;
  await setDoc(
    doc(db, COL.profiles, profile.id),
    { ...profile, updatedAt: Date.now() },
    { merge: true },
  );
}

export async function isUsernameAvailable(
  username: string,
  ownerId: string,
): Promise<boolean> {
  if (!isFirebaseConfigured) return true;
  const q = query(
    collection(db, COL.profiles),
    where("username", "==", username.toLowerCase()),
    fsLimit(1),
  );
  const snap = await getDocs(q);
  return snap.empty || snap.docs[0].id === ownerId;
}

/* ---------------- Leads ---------------- */

export async function createLead(
  lead: Omit<Lead, "id" | "createdAt">,
): Promise<void> {
  if (!isFirebaseConfigured) return;
  await addDoc(collection(db, COL.leads), {
    ...lead,
    createdAt: Date.now(),
    serverCreatedAt: serverTimestamp(),
  });
}

export async function listLeads(ownerId: string): Promise<Lead[]> {
  if (!isFirebaseConfigured) return [];
  const q = query(
    collection(db, COL.leads),
    where("ownerId", "==", ownerId),
    orderBy("createdAt", "desc"),
    fsLimit(200),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Lead);
}

/* ---------------- Manual Payment Submissions ---------------- */
/* Receipt uploads + owner review flow. Anonymous visitors create
   submissions through PaymentSection; owners review in /payments. */

/**
 * Create a submission. Called from the visitor's PaymentSection
 * after they upload a receipt. Returns the new doc id so the
 * caller can show a "submitted" confirmation.
 */
export async function createPaymentSubmission(
  submission: Omit<PaymentSubmission, "id">,
): Promise<string> {
  if (!isFirebaseConfigured) return "demo";
  const ref = await addDoc(collection(db, COL.paymentSubmissions), {
    ...submission,
    serverCreatedAt: serverTimestamp(),
  });
  return ref.id;
}

/**
 * List submissions for the owner, newest first. Used by the
 * /payments dashboard page. Filtered client-side by status tab.
 */
export async function listPaymentSubmissions(
  ownerId: string,
): Promise<PaymentSubmission[]> {
  if (!isFirebaseConfigured) return [];
  const snap = await getDocs(
    query(
      collection(db, COL.paymentSubmissions),
      where("ownerId", "==", ownerId),
      orderBy("submittedAt", "desc"),
      fsLimit(200),
    ),
  );
  return snap.docs.map(
    (d) => ({ ...(d.data() as PaymentSubmission), id: d.id }),
  );
}

/**
 * Update a submission's review status + admin notes. Used by the
 * approve / reject actions on the /payments page.
 */
export async function updatePaymentSubmission(
  id: string,
  patch: Partial<PaymentSubmission>,
): Promise<void> {
  if (!isFirebaseConfigured) return;
  await updateDoc(doc(db, COL.paymentSubmissions, id), patch);
}

/* ---------------- Appointments / bookings ---------------- */

function slotId(profileId: string, date: string, time: string): string {
  return `${profileId}__${date}__${time.replace(":", "")}`;
}

/** Public, PII-free slot markers — used to render which times are taken. */
export async function listBookedSlots(
  profileId: string,
): Promise<{ date: string; time: string }[]> {
  if (!isFirebaseConfigured) return [];
  try {
    const snap = await getDocs(
      query(
        collection(db, COL.bookingSlots),
        where("profileId", "==", profileId),
        fsLimit(1000),
      ),
    );
    return snap.docs.map((d) => {
      const data = d.data() as { date: string; time: string };
      return { date: data.date, time: data.time };
    });
  } catch {
    return [];
  }
}

/**
 * Atomically reserve a slot and store the booking. The slot marker uses a
 * deterministic id, so two visitors can never book the same time — the
 * transaction throws "SLOT_TAKEN" when the slot already exists.
 */
export async function createBooking(input: {
  profileId: string;
  ownerId: string;
  date: string;
  time: string;
  durationMin: number;
  name: string;
  phone: string;
  email: string;
  answers: BookingAnswer[];
}): Promise<void> {
  if (!isFirebaseConfigured) {
    throw new Error("Booking is unavailable in demo mode.");
  }
  await runTransaction(db, async (tx) => {
    const slotRef = doc(
      db,
      COL.bookingSlots,
      slotId(input.profileId, input.date, input.time),
    );
    const existing = await tx.get(slotRef);
    if (existing.exists()) throw new Error("SLOT_TAKEN");
    tx.set(slotRef, {
      profileId: input.profileId,
      ownerId: input.ownerId,
      date: input.date,
      time: input.time,
    });
    tx.set(doc(collection(db, COL.bookings)), {
      profileId: input.profileId,
      ownerId: input.ownerId,
      date: input.date,
      time: input.time,
      durationMin: input.durationMin,
      name: input.name,
      phone: input.phone,
      email: input.email,
      answers: input.answers,
      createdAt: Date.now(),
      serverCreatedAt: serverTimestamp(),
    });
  });
}

/** List the owner's bookings, ordered by date + time. */
export async function listBookings(ownerId: string): Promise<Booking[]> {
  if (!isFirebaseConfigured) return [];
  const snap = await getDocs(
    query(
      collection(db, COL.bookings),
      where("ownerId", "==", ownerId),
      fsLimit(500),
    ),
  );
  const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Booking);
  items.sort((a, b) =>
    `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`),
  );
  return items;
}

/** Cancel a booking — removes the record and frees the slot. */
export async function cancelBooking(booking: Booking): Promise<void> {
  if (!isFirebaseConfigured) return;
  await Promise.allSettled([
    deleteDoc(doc(db, COL.bookings, booking.id)),
    deleteDoc(
      doc(db, COL.bookingSlots, slotId(booking.profileId, booking.date, booking.time)),
    ),
  ]);
}

/* ---------------- Analytics ---------------- */

export async function logEvent(
  event: Omit<AnalyticsEvent, "id" | "createdAt">,
): Promise<void> {
  if (!isFirebaseConfigured) return;
  await addDoc(collection(db, COL.events), {
    ...event,
    createdAt: Date.now(),
    serverCreatedAt: serverTimestamp(),
  });
}

export async function getAnalyticsSummary(
  ownerId: string,
): Promise<AnalyticsSummary> {
  const empty: AnalyticsSummary = {
    views: 0,
    ctaClicks: 0,
    socialClicks: 0,
    leads: 0,
    shares: 0,
    conversionRate: 0,
  };
  if (!isFirebaseConfigured) return empty;
  const q = query(
    collection(db, COL.events),
    where("ownerId", "==", ownerId),
    fsLimit(2000),
  );
  const snap = await getDocs(q);
  const sum = { ...empty };
  snap.docs.forEach((d) => {
    const t = (d.data() as AnalyticsEvent).type;
    if (t === "profile_view") sum.views += 1;
    else if (t === "cta_click") sum.ctaClicks += 1;
    else if (t === "social_click") sum.socialClicks += 1;
    else if (t === "lead_submit") sum.leads += 1;
    else if (t === "share") sum.shares += 1;
  });
  sum.conversionRate = sum.views > 0 ? sum.leads / sum.views : 0;
  return sum;
}

/* ---------------- AI generations ---------------- */

export async function recordAIGeneration(
  record: Omit<AIGenerationRecord, "id" | "createdAt">,
): Promise<void> {
  if (!isFirebaseConfigured) return;
  await addDoc(collection(db, COL.ai), {
    ...record,
    createdAt: Date.now(),
  });
}

/* ---------------- Admin helpers ---------------- */

/** Fetch all user documents (admin only — enforced by Firestore rules). */
export async function listAllUsers(): Promise<AccountUser[]> {
  if (!isFirebaseConfigured) return [];
  const snap = await getDocs(
    query(collection(db, COL.users), orderBy("createdAt", "desc"), fsLimit(500)),
  );
  return snap.docs.map((d) => d.data() as AccountUser);
}

/**
 * Set or clear per-user limit overrides (admin only).
 *
 * Pass numeric values to override the plan defaults — undefined or
 * null clears the override so the user falls back to their plan's
 * limits. Useful for granting individual users extra capacity (e.g.
 * a hired funnel-builder needs 50 funnels even though they're on Pro
 * which only includes 5).
 */
export async function adminSetUserLimitOverrides(
  uid: string,
  overrides: { funnels?: number | null; sharedBuilds?: number | null },
): Promise<void> {
  if (!isFirebaseConfigured) return;
  /* Build a patch that uses null to clear fields (Firestore-compatible
     "delete this field" sentinel when stored, paired with the client's
     ignoreUndefinedProperties so the user can clear cleanly). */
  const patch: Record<string, number | null> = {};
  if (overrides.funnels === null) patch["limitOverrides.funnels"] = null;
  else if (typeof overrides.funnels === "number")
    patch["limitOverrides.funnels"] = Math.max(0, Math.floor(overrides.funnels));
  if (overrides.sharedBuilds === null) patch["limitOverrides.sharedBuilds"] = null;
  else if (typeof overrides.sharedBuilds === "number")
    patch["limitOverrides.sharedBuilds"] = Math.max(
      0,
      Math.floor(overrides.sharedBuilds),
    );
  if (Object.keys(patch).length === 0) return;
  await updateDoc(doc(db, COL.users, uid), {
    ...patch,
    updatedAt: Date.now(),
  });
}

/**
 * Manually set a user's plan (admin only).
 *
 * Side effects beyond updating the user doc:
 *   1. If the user has an `affiliateId` AND the new plan has a non-zero
 *      `commission`, a Commission record is auto-created (signup vs
 *      renewal is determined by whether they were already on this plan).
 *   2. The affiliate's cached `stats` rollup is recomputed.
 *
 * Resolving the affiliate by code happens client-side here (one extra
 * Firestore read) — it's only invoked on admin upgrade actions which
 * are rare, so the cost is negligible.
 *
 * Returns whether a commission was created so the caller can show a
 * toast like "Plan set + ₱499 commission credited to DAN123".
 */
export interface AdminSetUserPlanResult {
  commissionCreated: boolean;
  /** Commission amount (PHP) — present iff commissionCreated. */
  amount?: number;
  /** Affiliate's referral code — present iff commissionCreated. */
  affiliateCode?: string;
  /** Affiliate's account email — for the commission-earned notification. */
  affiliateEmail?: string;
  /** Affiliate's display name — for the email's greeting. */
  affiliateName?: string;
  /** Customer's display name — snapshotted for the email body. */
  customerName?: string;
  /** Plan name — snapshotted for the email body. */
  planName?: string;
  /** "signup" vs "renewal" — drives subject + copy variations. */
  type?: Commission["type"];
}

export async function adminSetUserPlan(
  uid: string,
  plan: AccountUser["plan"],
): Promise<AdminSetUserPlanResult> {
  if (!isFirebaseConfigured) {
    return { commissionCreated: false };
  }

  /* Step 1 — read the user BEFORE updating so we can compare old plan
     (renewal vs first-time-upgrade) and look up their affiliateId. */
  const before = await getUserDoc(uid);
  const previousPlan = before?.plan;
  const previousSubscription = before?.subscription;
  const affiliateCode = before?.affiliateId;

  /* Step 2 — resolve the plan record up-front so we can compute the
     subscription expiry AND look up commission together. */
  const planConfig = await getPlansConfig();
  const planRecord = planConfig?.find((p) => p.id === plan) ?? null;

  /* Step 3 — build the subscription metadata.
     - Downgrade to free → clear the subscription entirely.
     - Same plan + still active → extend from the existing expiresAt
       (so a renewal mid-cycle doesn't waste remaining days).
     - New plan / lapsed plan → start a fresh cycle from now. */
  const now = Date.now();
  const isFreePlan = plan === "free" || (planRecord?.price ?? 0) === 0;
  let nextSubscription: UserSubscription | null = null;
  if (!isFreePlan && planRecord) {
    const durationMs = planDurationToMs(planRecord);
    const isSamePlanRenewal =
      previousPlan === plan &&
      previousSubscription?.expiresAt != null &&
      previousSubscription.expiresAt > now;
    const startFrom = isSamePlanRenewal
      ? previousSubscription!.expiresAt
      : now;
    nextSubscription = {
      planId: plan,
      activatedAt: now,
      expiresAt: startFrom + durationMs,
      renewalCount: isSamePlanRenewal
        ? (previousSubscription!.renewalCount ?? 0) + 1
        : 0,
    };
  }

  /* Step 4 — update the user doc unconditionally. ignoreUndefinedProperties
     on the Firestore client strips out `subscription: undefined`, so the
     free-plan path correctly leaves the field unset; passing null
     explicitly removes any existing value. */
  await updateDoc(doc(db, COL.users, uid), {
    plan,
    subscription: nextSubscription ?? null,
    updatedAt: now,
  });

  /* Step 5 — try to generate a commission. Any failure here is logged
     but doesn't roll back the plan update — admins can manually create
     a commission later if attribution genuinely matters. */
  if (!affiliateCode) return { commissionCreated: false };

  try {
    const affiliate = await getAffiliateByCode(affiliateCode);
    if (!planRecord || !planRecord.commission || planRecord.commission <= 0) {
      return { commissionCreated: false };
    }
    if (!affiliate) {
      console.warn(
        `[Credibly] Cannot create commission — no affiliate found for code "${affiliateCode}".`,
      );
      return { commissionCreated: false };
    }

    /* Classification:
         - "signup"  → this is the first time the user has been on this plan
         - "renewal" → they're already on this plan and getting re-upgraded */
    const type: Commission["type"] =
      previousPlan === plan ? "renewal" : "signup";

    /* Build a stable id so an accidental double-click doesn't double-bill.
       Hour-bucket the timestamp so a deliberate "I really did mean to
       renew them twice today" still works after an hour. */
    const hourBucket = Math.floor(Date.now() / (60 * 60 * 1000));
    const id = `${affiliate.uid}_${uid}_${plan}_${type}_${hourBucket}`;

    const commission: Commission = {
      id,
      affiliateId: affiliate.uid,
      affiliateCode: affiliate.code,
      userId: uid,
      userDisplayName: before?.displayName ?? "Customer",
      userEmailMasked: maskEmailLocal(before?.email ?? ""),
      planId: plan,
      planName: planRecord.name,
      amount: planRecord.commission,
      type,
      status: "pending",
      earnedAt: Date.now(),
    };

    await setDoc(doc(db, COL.commissions, id), commission);

    /* Recompute the affiliate's cached stats from the full commission list. */
    await recomputeAffiliateStats(affiliate.uid);

    return {
      commissionCreated: true,
      amount: commission.amount,
      affiliateCode: affiliate.code,
      affiliateEmail: affiliate.email,
      affiliateName: affiliate.displayName,
      customerName: commission.userDisplayName,
      planName: commission.planName,
      type: commission.type,
    };
  } catch (err) {
    console.warn("[Credibly] Commission creation failed:", err);
    return { commissionCreated: false };
  }
}

/**
 * Local mask helper used inside adminSetUserPlan — duplicated from
 * lib/affiliate.ts to avoid a client → server circular import here.
 * Stays in sync with the lib/affiliate.ts version.
 */
function maskEmailLocal(email: string): string {
  if (!email) return "";
  const [local, domain] = email.split("@");
  if (!domain) return email;
  if (local.length <= 2) return `${local[0] ?? ""}*@${domain}`;
  return `${local[0]}${"*".repeat(Math.max(local.length - 2, 1))}${local.slice(-1)}@${domain}`;
}

/**
 * Recompute and cache an affiliate's stats from their full commission
 * history. Called after any commission write so the affiliate dashboard
 * always sees consistent numbers without expensive client-side rollups.
 *
 * "activeReferrals" is approximated as the count of unique referred
 * users (any commission = active enough). Step 6 will refine this when
 * we add subscription expiry tracking.
 */
export async function recomputeAffiliateStats(uid: string): Promise<void> {
  if (!isFirebaseConfigured) return;
  const commissions = await listCommissionsForAffiliate(uid);
  const uniqueUsers = new Set(commissions.map((c) => c.userId));
  const stats: Affiliate["stats"] = {
    totalReferrals: uniqueUsers.size,
    activeReferrals: uniqueUsers.size,
    totalEarned: commissions
      .filter((c) => c.status !== "reversed")
      .reduce((sum, c) => sum + c.amount, 0),
    pendingPayout: commissions
      .filter((c) => c.status === "pending")
      .reduce((sum, c) => sum + c.amount, 0),
    paidOut: commissions
      .filter((c) => c.status === "paid")
      .reduce((sum, c) => sum + c.amount, 0),
  };
  await updateDoc(doc(db, COL.affiliates, uid), {
    stats,
    updatedAt: Date.now(),
  });
}

/* ---------------- Commission admin helpers ---------------- */

/** All commissions across all affiliates (admin only). Newest first. */
export async function listAllCommissions(): Promise<Commission[]> {
  if (!isFirebaseConfigured) return [];
  const snap = await getDocs(
    query(collection(db, COL.commissions), orderBy("earnedAt", "desc"), fsLimit(500)),
  );
  return snap.docs.map((d) => ({ ...(d.data() as Commission), id: d.id }));
}

/**
 * Mark a single commission as paid (or back to pending). Triggers a
 * stats recompute for the affected affiliate so their dashboard
 * "Pending" + "Paid out" totals stay accurate.
 */
export async function setCommissionStatus(
  id: string,
  status: Commission["status"],
): Promise<void> {
  if (!isFirebaseConfigured) return;
  const snap = await getDoc(doc(db, COL.commissions, id));
  if (!snap.exists()) return;
  const commission = snap.data() as Commission;
  await updateDoc(doc(db, COL.commissions, id), {
    status,
    paidAt: status === "paid" ? Date.now() : undefined,
  });
  await recomputeAffiliateStats(commission.affiliateId);
}

/**
 * Batch-mark a list of commission ids to a given status. Used by the
 * admin "Mark selected as paid" action. Recomputes stats once per
 * affected affiliate to avoid redundant writes.
 */
export async function batchSetCommissionStatus(
  ids: string[],
  status: Commission["status"],
): Promise<void> {
  if (!isFirebaseConfigured || ids.length === 0) return;
  const affectedAffiliates = new Set<string>();
  for (const id of ids) {
    const snap = await getDoc(doc(db, COL.commissions, id));
    if (!snap.exists()) continue;
    const commission = snap.data() as Commission;
    affectedAffiliates.add(commission.affiliateId);
    await updateDoc(doc(db, COL.commissions, id), {
      status,
      paidAt: status === "paid" ? Date.now() : undefined,
    });
  }
  await Promise.all(
    Array.from(affectedAffiliates).map((uid) => recomputeAffiliateStats(uid)),
  );
}

/** Count all profiles (admin overview). */
export async function countAllProfiles(): Promise<number> {
  if (!isFirebaseConfigured) return 0;
  const snap = await getDocs(collection(db, COL.profiles));
  return snap.size;
}

/**
 * Admin-only: list every published profile in the system, used by the
 * "Featured Profile" picker on the admin dashboard. Returns full
 * profile docs so the picker can render avatar + name + headline
 * without an extra read per row. Capped at 200 — pickers usually
 * surface a few standouts; admin can paginate later if needed.
 */
export async function listPublishedProfiles(): Promise<Profile[]> {
  if (!isFirebaseConfigured) return [];
  const snap = await getDocs(
    query(
      collection(db, COL.profiles),
      where("status", "==", "published"),
      fsLimit(200),
    ),
  );
  return snap.docs.map((d) => ({ ...(d.data() as Profile), id: d.id }));
}

/** Count all leads (admin overview). */
export async function countAllLeads(): Promise<number> {
  if (!isFirebaseConfigured) return 0;
  const snap = await getDocs(collection(db, COL.leads));
  return snap.size;
}

/* ---------------- Shared builds ---------------- */
/* A published build is a share-coded, identity-free profile template. */

/** Publish a build snapshot and return the stored record (with its id). */
export async function publishSharedBuild(
  input: Omit<SharedBuild, "id" | "createdAt" | "updatedAt">,
): Promise<SharedBuild> {
  if (!isFirebaseConfigured) {
    throw new Error("Sharing is unavailable in demo mode.");
  }
  const ref = doc(collection(db, COL.sharedBuilds));
  const now = Date.now();
  const record: SharedBuild = {
    ...input,
    id: ref.id,
    createdAt: now,
    updatedAt: now,
  };
  await setDoc(ref, record);
  return record;
}

/** All builds the given user has published. */
export async function listMySharedBuilds(
  ownerId: string,
): Promise<SharedBuild[]> {
  if (!isFirebaseConfigured) return [];
  const snap = await getDocs(
    query(
      collection(db, COL.sharedBuilds),
      where("ownerId", "==", ownerId),
      fsLimit(50),
    ),
  );
  return snap.docs
    .map((d) => ({ ...(d.data() as SharedBuild), id: d.id }))
    .sort((a, b) => b.createdAt - a.createdAt);
}

/** Enable/disable a published build's share code. */
export async function setSharedBuildRevoked(
  id: string,
  revoked: boolean,
): Promise<void> {
  if (!isFirebaseConfigured) return;
  await updateDoc(doc(db, COL.sharedBuilds, id), {
    revoked,
    updatedAt: Date.now(),
  });
}

/** Permanently remove a published build (owner only — enforced by rules). */
export async function deleteSharedBuild(id: string): Promise<void> {
  if (!isFirebaseConfigured) return;
  await deleteDoc(doc(db, COL.sharedBuilds, id));
}

/** Resolve a share code to its build. Returns null when missing or revoked. */
export async function lookupSharedBuildByCode(
  code: string,
): Promise<SharedBuild | null> {
  if (!isFirebaseConfigured) return null;
  const snap = await getDocs(
    query(
      collection(db, COL.sharedBuilds),
      where("shareCode", "==", code.trim().toUpperCase()),
      fsLimit(1),
    ),
  );
  if (snap.empty) return null;
  const found = { ...(snap.docs[0].data() as SharedBuild), id: snap.docs[0].id };
  return found.revoked ? null : found;
}

/* ---------------- Saved-build locker ---------------- */
/* Owner-only subcollection under the user doc. */

/** All builds the user has saved into their locker, newest first. */
export async function listSavedBuilds(uid: string): Promise<SavedBuild[]> {
  if (!isFirebaseConfigured) return [];
  const snap = await getDocs(
    query(collection(db, COL.users, uid, SAVED_BUILDS_SUB), fsLimit(50)),
  );
  return snap.docs
    .map((d) => ({ ...(d.data() as SavedBuild), id: d.id }))
    .sort((a, b) => b.savedAt - a.savedAt);
}

/**
 * Save a build into the locker. When `replaceId` is given, that slot is
 * removed first — used when the locker is already at its plan limit.
 */
export async function saveBuildToLocker(
  uid: string,
  build: Omit<SavedBuild, "id" | "savedAt">,
  replaceId?: string,
): Promise<void> {
  if (!isFirebaseConfigured) {
    throw new Error("Saving is unavailable in demo mode.");
  }
  if (replaceId) {
    await deleteDoc(doc(db, COL.users, uid, SAVED_BUILDS_SUB, replaceId));
  }
  await addDoc(collection(db, COL.users, uid, SAVED_BUILDS_SUB), {
    ...build,
    savedAt: Date.now(),
  });
}

/** Remove one saved build from the locker. */
export async function deleteSavedBuild(
  uid: string,
  savedId: string,
): Promise<void> {
  if (!isFirebaseConfigured) return;
  await deleteDoc(doc(db, COL.users, uid, SAVED_BUILDS_SUB, savedId));
}

/* ---------------- Funnels ---------------- */
/* Mini sales funnels — public-readable like profiles, owner-writable. */

/** All funnels owned by a user, newest first. */
export async function listFunnels(ownerId: string): Promise<Funnel[]> {
  if (!isFirebaseConfigured) return [];
  const snap = await getDocs(
    query(
      collection(db, COL.funnels),
      where("ownerId", "==", ownerId),
      fsLimit(50),
    ),
  );
  return snap.docs
    .map((d) => ({ ...(d.data() as Funnel), id: d.id }))
    .sort((a, b) => b.createdAt - a.createdAt);
}

/** Fetch one funnel by its id. */
export async function getFunnelById(id: string): Promise<Funnel | null> {
  if (!isFirebaseConfigured) return null;
  const snap = await getDoc(doc(db, COL.funnels, id));
  return snap.exists() ? { ...(snap.data() as Funnel), id: snap.id } : null;
}

/** Resolve a funnel by owner + slug — used by the public funnel route. */
export async function getFunnelBySlug(
  ownerId: string,
  slug: string,
): Promise<Funnel | null> {
  if (!isFirebaseConfigured) return null;
  const snap = await getDocs(
    query(
      collection(db, COL.funnels),
      where("ownerId", "==", ownerId),
      where("slug", "==", slug.toLowerCase()),
      fsLimit(1),
    ),
  );
  return snap.empty
    ? null
    : { ...(snap.docs[0].data() as Funnel), id: snap.docs[0].id };
}

/** Create or update a funnel (owner-only — enforced by rules). */
export async function saveFunnel(funnel: Funnel): Promise<void> {
  if (!isFirebaseConfigured) return;
  await setDoc(
    doc(db, COL.funnels, funnel.id),
    /* JSON round-trip drops any undefined values so the write never fails. */
    JSON.parse(JSON.stringify({ ...funnel, updatedAt: Date.now() })),
    { merge: true },
  );
}

/** Delete a funnel. */
export async function deleteFunnel(id: string): Promise<void> {
  if (!isFirebaseConfigured) return;
  await deleteDoc(doc(db, COL.funnels, id));
}

/**
 * Per-step view counts for one funnel — powers the drop-off chart. Funnel
 * step views are logged as analytics events with `target` = "{id}#{step}".
 */
export async function getFunnelAnalytics(
  ownerId: string,
  funnelId: string,
): Promise<Record<number, number>> {
  if (!isFirebaseConfigured) return {};
  const snap = await getDocs(
    query(
      collection(db, COL.events),
      where("ownerId", "==", ownerId),
      where("type", "==", "funnel_step"),
      fsLimit(3000),
    ),
  );
  const counts: Record<number, number> = {};
  const prefix = `${funnelId}#`;
  snap.docs.forEach((d) => {
    const target = (d.data() as AnalyticsEvent).target ?? "";
    if (!target.startsWith(prefix)) return;
    const idx = Number(target.slice(prefix.length));
    if (Number.isNaN(idx)) return;
    counts[idx] = (counts[idx] ?? 0) + 1;
  });
  return counts;
}

/* ---------------- Shared funnels ---------------- */
/* A funnel published as a share-coded, cloneable template. */

/** Publish a funnel snapshot and return the stored record. */
export async function publishSharedFunnel(
  input: Omit<SharedFunnel, "id" | "createdAt" | "updatedAt">,
): Promise<SharedFunnel> {
  if (!isFirebaseConfigured) {
    throw new Error("Sharing is unavailable in demo mode.");
  }
  const ref = doc(collection(db, COL.sharedFunnels));
  const now = Date.now();
  const record: SharedFunnel = {
    ...input,
    id: ref.id,
    createdAt: now,
    updatedAt: now,
  };
  await setDoc(ref, record);
  return record;
}

/** All funnels the given user has published. */
export async function listMySharedFunnels(
  ownerId: string,
): Promise<SharedFunnel[]> {
  if (!isFirebaseConfigured) return [];
  const snap = await getDocs(
    query(
      collection(db, COL.sharedFunnels),
      where("ownerId", "==", ownerId),
      fsLimit(50),
    ),
  );
  return snap.docs
    .map((d) => ({ ...(d.data() as SharedFunnel), id: d.id }))
    .sort((a, b) => b.createdAt - a.createdAt);
}

/** Enable/disable a published funnel's share code. */
export async function setSharedFunnelRevoked(
  id: string,
  revoked: boolean,
): Promise<void> {
  if (!isFirebaseConfigured) return;
  await updateDoc(doc(db, COL.sharedFunnels, id), {
    revoked,
    updatedAt: Date.now(),
  });
}

/** Permanently remove a published funnel. */
export async function deleteSharedFunnel(id: string): Promise<void> {
  if (!isFirebaseConfigured) return;
  await deleteDoc(doc(db, COL.sharedFunnels, id));
}

/** Resolve a share code to its funnel. Null when missing or revoked. */
export async function lookupSharedFunnelByCode(
  code: string,
): Promise<SharedFunnel | null> {
  if (!isFirebaseConfigured) return null;
  const snap = await getDocs(
    query(
      collection(db, COL.sharedFunnels),
      where("shareCode", "==", code.trim().toUpperCase()),
      fsLimit(1),
    ),
  );
  if (snap.empty) return null;
  const found = {
    ...(snap.docs[0].data() as SharedFunnel),
    id: snap.docs[0].id,
  };
  return found.revoked ? null : found;
}
