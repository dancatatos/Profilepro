import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getProfileByUsername } from "@/lib/firebase/firestore";
import { isFirebaseConfigured } from "@/lib/firebase/config";
import { DEMO_PROFILE } from "@/lib/defaults";
import { PublicProfileView } from "@/components/public-profile/PublicProfileView";
import { APP } from "@/lib/constants";
import { resolveCanRemoveBranding } from "@/lib/branding";
import type { Profile } from "@/types";

/* Edge-cache the rendered profile for 60s. Profile saves in the
   builder are visible immediately to the owner (they edit on a
   non-cached /profile route); external visitors see updates within
   ~1 min. Cuts ~99% of Firestore reads on shared profile traffic
   (one render per minute per profile, instead of one per visit). */
export const revalidate = 60;

async function resolveProfile(username: string): Promise<Profile | null> {
  const handle = username.toLowerCase();
  if (handle === "demo") return DEMO_PROFILE;
  if (!isFirebaseConfigured) return null;
  try {
    return await getProfileByUsername(handle);
  } catch {
    return null;
  }
}

/* resolveCanRemoveBranding lives in lib/branding.ts now — both the
   profile and funnel pages use the same Admin-SDK-backed resolver so
   the /users/{uid} read isn't blocked by the owner-only Firestore
   rule when public visitors hit the page server-side. */

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  const profile = await resolveProfile(username);
  if (!profile) return { title: "Profile not found" };

  const title =
    profile.seo.title || `${profile.header.displayName} · Credibly`;
  const description =
    profile.seo.description || profile.header.headline;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "profile",
      url: `${APP.url}/${profile.username}`,
      ...(profile.header.avatarUrl
        ? { images: [{ url: profile.header.avatarUrl }] }
        : {}),
    },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function PublicProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const profile = await resolveProfile(username);
  if (!profile) notFound();

  /* The demo profile doesn't have a real owner — always show branding. */
  const canRemoveBranding =
    profile === DEMO_PROFILE
      ? false
      : await resolveCanRemoveBranding(profile.ownerId);

  return (
    <div className="min-h-dvh bg-ink-950">
      <PublicProfileView
        profile={profile}
        live
        showBranding={!canRemoveBranding}
      />
    </div>
  );
}
