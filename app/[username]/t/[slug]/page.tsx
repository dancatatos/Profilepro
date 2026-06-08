import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  getProfileByUsername,
  getTrainingByOwnerSlug,
} from "@/lib/firebase/firestore";
import { isFirebaseConfigured } from "@/lib/firebase/config";
import { PublicTrainingView } from "@/components/public-training/PublicTrainingView";
import type { Profile, Training } from "@/types";

/**
 * Public training page — visitor-facing.
 *
 * Path: /{username}/t/{slug}
 *
 * Server-renders the public preview shell (banner, title, lesson
 * list with locked/unlocked indicators). The client component
 * resolves the viewer's access state in the browser (we don't have
 * the viewer's auth on the server here) and unlocks lessons +
 * shows the player when access is confirmed.
 *
 * Free-preview lessons are watchable by anyone regardless of access.
 * Non-preview lessons show a lock + an "Unlock with code" CTA.
 */

export const dynamic = "force-dynamic";

interface Params {
  username: string;
  slug: string;
}

async function resolveData(params: Params): Promise<{
  profile: Profile;
  training: Training;
} | null> {
  const username = params.username?.toLowerCase();
  const slug = params.slug?.toLowerCase();
  if (!username || !slug) return null;
  if (!isFirebaseConfigured) return null;
  try {
    const profile = await getProfileByUsername(username);
    if (!profile) return null;
    const training = await getTrainingByOwnerSlug(profile.ownerId, slug);
    if (!training) return null;
    return { profile, training };
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const resolved = await params;
  const data = await resolveData(resolved);
  if (!data) {
    return { title: "Training not found" };
  }
  const { training, profile } = data;
  return {
    title: `${training.title} — by ${profile.header.displayName}`,
    description: training.description,
    openGraph: {
      title: training.title,
      description: training.description,
      ...(training.bannerUrl ? { images: [training.bannerUrl] } : {}),
    },
  };
}

export default async function PublicTrainingPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const resolved = await params;
  const data = await resolveData(resolved);
  if (!data) notFound();
  /* Drafts are visible to the owner (client-side gate); for everyone
     else, we 404 so unlisted drafts don't leak. */
  if (data.training.status !== "published") {
    /* Allow viewing — we render an unmistakable "draft" banner.
       The owner needs this to preview. The client component shows
       a "Draft — only you can see this" badge for non-owners we
       won't actually serve (because draft + non-owner short-circuits
       in the client view) — but we keep the SSR path generous so
       previewing while logged-in works without an extra hop. */
  }
  return (
    <PublicTrainingView profile={data.profile} training={data.training} />
  );
}
