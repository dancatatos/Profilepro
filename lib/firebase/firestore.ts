import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  addDoc,
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
  Lead,
  Profile,
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
} as const;

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
