import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  getPlansConfig,
  getProfileByUsername,
  getUserDoc,
} from "@/lib/firebase/firestore";
import { isFirebaseConfigured } from "@/lib/firebase/config";
import { DEMO_PROFILE } from "@/lib/defaults";
import { PublicProfileView } from "@/components/public-profile/PublicProfileView";
import { APP, PLANS as DEFAULT_PLANS } from "@/lib/constants";
import { defaultFeatureKeysForPlan, planHasFeature } from "@/lib/features";
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

/**
 * Resolve whether the profile's owner has the `remove_branding` feature
 * — when true, we hide the "Made with Credibly" footer on the public
 * profile. Fail-open (default to showing branding) on any error so the
 * footer is the safe default if the lookup hits permission issues or
 * the owner's doc is missing.
 */
async function resolveCanRemoveBranding(ownerId: string): Promise<boolean> {
  if (!isFirebaseConfigured) return false;
  try {
    const [user, savedPlans] = await Promise.all([
      getUserDoc(ownerId),
      getPlansConfig(),
    ]);
    if (!user) return false;
    const plans =
      savedPlans && savedPlans.length > 0 ? savedPlans : DEFAULT_PLANS;
    const plan = plans.find((p) => p.id === user.plan);
    if (!plan) return false;
    /* Backfill featureKeys if the saved plan predates the catalogue
       so an admin who hasn't re-saved their plans config yet still
       sees the expected paid-tier behaviour. */
    const planWithKeys =
      plan.featureKeys && plan.featureKeys.length > 0
        ? plan
        : { ...plan, featureKeys: defaultFeatureKeysForPlan(plan.id) };
    return planHasFeature(planWithKeys, "remove_branding");
  } catch {
    return false;
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
