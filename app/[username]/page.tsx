import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getProfileByUsername } from "@/lib/firebase/firestore";
import { isFirebaseConfigured } from "@/lib/firebase/config";
import { DEMO_PROFILE } from "@/lib/defaults";
import { PublicProfileView } from "@/components/public-profile/PublicProfileView";
import { APP } from "@/lib/constants";
import type { Profile } from "@/types";

export const dynamic = "force-dynamic";

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

  return (
    <div className="min-h-dvh bg-ink-950">
      <PublicProfileView profile={profile} live />
    </div>
  );
}
