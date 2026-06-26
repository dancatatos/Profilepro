/**
 * Credibly Link resolver.
 *
 * A "Credibly Link" CTA points to a target ON THE FUNNEL/PROFILE
 * OWNER's account — funnel, training, profile, /my-events, etc. —
 * rather than a hardcoded URL. The resolver runs SERVER-SIDE at the
 * public profile/funnel route, looks up the owner's matching item
 * by bundleTag (or slug), and returns the concrete URL.
 *
 * The point of all this: a leader builds a "hub" funnel with buttons
 * linking to their other funnels. When the bundle clones that hub to
 * Maria's account, Maria's clone renders the SAME buttons but they
 * resolve to MARIA's funnels — not the leader's. Each team member's
 * site is fully wired to their own ecosystem, automatically.
 *
 * Returns null when the target doesn't exist on the owner's account
 * (e.g. recruit hasn't been granted that funnel yet) — the caller
 * hides the button silently.
 */

import { getAdminDb, isAdminConfigured } from "@/lib/firebase/admin";
import type {
  CrediblyLinkSpec,
  Funnel,
  Training,
  Profile,
} from "@/types";

interface ResolveDeps {
  /** Profile owner whose URLs the link resolves against. */
  ownerId: string;
  /** Owner's profile (for username lookup). Optional — fetched if absent. */
  profile?: Profile | null;
}

/**
 * Resolve a single Credibly Link spec to a concrete URL on the
 * owner's account. Server-only — uses the Admin SDK so it works for
 * unauthenticated public visitors. Returns null when the target can't
 * be found (silent hide).
 */
export async function resolveCrediblyLink(
  spec: CrediblyLinkSpec,
  deps: ResolveDeps,
): Promise<string | null> {
  if (!isAdminConfigured()) return null;
  const username = await getOwnerUsername(deps);
  if (!username) return null;

  switch (spec.targetType) {
    /* Bucket A — one canonical route per user, no per-item lookup. */
    case "profile":
      return `/${username}`;
    case "my-events":
      return `/my-events`;
    case "pipeline-today":
      return `/pipelines/today`;
    case "trainings-library":
      return `/trainings`;

    /* Bucket B — match by bundleTag, fall back to slug. */
    case "funnel": {
      if (!spec.targetTag) return null;
      const slug = await lookupFunnelSlug(deps.ownerId, spec.targetTag);
      return slug ? `/${username}/${slug}` : null;
    }
    case "training": {
      if (!spec.targetTag) return null;
      const slug = await lookupTrainingSlug(deps.ownerId, spec.targetTag);
      return slug ? `/${username}/t/${slug}` : null;
    }
  }
}

/* ── Lookups ──────────────────────────────────────────────────── */

async function getOwnerUsername(deps: ResolveDeps): Promise<string | null> {
  if (deps.profile?.username) return deps.profile.username;
  const db = getAdminDb();
  const snap = await db
    .collection("profiles")
    .where("ownerId", "==", deps.ownerId)
    .limit(1)
    .get()
    .catch(() => null);
  if (!snap || snap.empty) return null;
  return (snap.docs[0].data() as Profile).username ?? null;
}

/** Find the owner's funnel matching the bundleTag; fall back to slug. */
async function lookupFunnelSlug(
  ownerId: string,
  tag: string,
): Promise<string | null> {
  const db = getAdminDb();
  /* Try bundleTag first (most robust — survives slug renames). */
  const byTag = await db
    .collection("funnels")
    .where("ownerId", "==", ownerId)
    .where("bundleTag", "==", tag)
    .where("status", "==", "published")
    .limit(1)
    .get()
    .catch(() => null);
  if (byTag && !byTag.empty) {
    return (byTag.docs[0].data() as Funnel).slug ?? null;
  }
  /* Slug fallback for funnels created before bundleTag existed. */
  const bySlug = await db
    .collection("funnels")
    .where("ownerId", "==", ownerId)
    .where("slug", "==", tag)
    .where("status", "==", "published")
    .limit(1)
    .get()
    .catch(() => null);
  if (bySlug && !bySlug.empty) {
    return (bySlug.docs[0].data() as Funnel).slug ?? null;
  }
  return null;
}

/** Find the owner's training matching the bundleTag; fall back to slug. */
async function lookupTrainingSlug(
  ownerId: string,
  tag: string,
): Promise<string | null> {
  const db = getAdminDb();
  const byTag = await db
    .collection("trainings")
    .where("ownerId", "==", ownerId)
    .where("bundleTag", "==", tag)
    .limit(1)
    .get()
    .catch(() => null);
  if (byTag && !byTag.empty) {
    return (byTag.docs[0].data() as Training).slug ?? null;
  }
  const bySlug = await db
    .collection("trainings")
    .where("ownerId", "==", ownerId)
    .where("slug", "==", tag)
    .limit(1)
    .get()
    .catch(() => null);
  if (bySlug && !bySlug.empty) {
    return (bySlug.docs[0].data() as Training).slug ?? null;
  }
  return null;
}
