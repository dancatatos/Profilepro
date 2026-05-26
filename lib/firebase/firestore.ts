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
  query,
  where,
  orderBy,
  limit as fsLimit,
  serverTimestamp,
} from "firebase/firestore";
import { db, isFirebaseConfigured } from "./client";
import type {
  AccountUser,
  AIGenerationRecord,
  AnalyticsEvent,
  AnalyticsSummary,
  Booking,
  BookingAnswer,
  FeatureFlags,
  Funnel,
  Lead,
  Plan,
  Profile,
  SavedBuild,
  SharedBuild,
  SharedFunnel,
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
} as const;

/** Subcollection name for a user's saved-build locker. */
const SAVED_BUILDS_SUB = "savedBuilds";

/* ---------------- Feature flags ---------------- */
/* A single settings/featureFlags doc, admin-managed, publicly readable. */

export const DEFAULT_FEATURE_FLAGS: FeatureFlags = {
  templateMarketplace: false,
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
    highlighted: raw.highlighted === true,
    /* New affiliate-system fields. All optional with sensible defaults so a
       plan saved before this schema was introduced still behaves as before. */
    visibility: raw.visibility === "affiliate" ? "affiliate" : "public",
    checkoutUrl: str(raw.checkoutUrl) || undefined,
    commission: num(raw.commission) ?? 0,
    duration: normalizeDuration(raw.duration),
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
  return snap.empty ? null : (snap.docs[0].data() as Profile);
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

/** Manually set a user's plan (admin only). */
export async function adminSetUserPlan(
  uid: string,
  plan: AccountUser["plan"],
): Promise<void> {
  if (!isFirebaseConfigured) return;
  await updateDoc(doc(db, COL.users, uid), {
    plan,
    updatedAt: Date.now(),
  });
}

/** Count all profiles (admin overview). */
export async function countAllProfiles(): Promise<number> {
  if (!isFirebaseConfigured) return 0;
  const snap = await getDocs(collection(db, COL.profiles));
  return snap.size;
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
