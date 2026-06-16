import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  getFunnelBySlug,
  getPlansConfig,
  getProfileByUsername,
  getUserDoc,
} from "@/lib/firebase/firestore";
import { isFirebaseConfigured } from "@/lib/firebase/config";
import { FunnelView } from "@/components/public-profile/FunnelView";
import { APP, PLANS as DEFAULT_PLANS } from "@/lib/constants";
import { defaultFeatureKeysForPlan, planHasFeature } from "@/lib/features";
import type { Funnel, Profile } from "@/types";

/* Same edge-cache strategy as the profile page — 60s revalidate.
   Funnel edits show up to external visitors within ~1 min. */
export const revalidate = 60;

async function resolveFunnel(
  username: string,
  slug: string,
): Promise<{ funnel: Funnel; profile: Profile } | null> {
  if (!isFirebaseConfigured) return null;
  try {
    const profile = await getProfileByUsername(username.toLowerCase());
    if (!profile) return null;
    const funnel = await getFunnelBySlug(profile.ownerId, slug.toLowerCase());
    if (!funnel || funnel.status !== "published") return null;
    return { funnel, profile };
  } catch {
    return null;
  }
}

/**
 * Resolve whether the funnel owner's plan includes `remove_branding`
 * — when true, the "Made with Credibly" footer is hidden. Mirrors the
 * resolver on the public profile page so paid plans get the same
 * treatment across every public surface. Fail-open (show branding)
 * on any error so we never silently strip branding by accident.
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
  params: Promise<{ username: string; funnel: string }>;
}): Promise<Metadata> {
  const { username, funnel: slug } = await params;
  const resolved = await resolveFunnel(username, slug);
  if (!resolved) return { title: "Funnel not found" };

  const title = `${resolved.funnel.name} · ${resolved.profile.header.displayName}`;
  const description =
    resolved.profile.header.headline || resolved.profile.seo.description || "";

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      url: `${APP.url}/${resolved.profile.username}/${resolved.funnel.slug}`,
    },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function FunnelPage({
  params,
}: {
  params: Promise<{ username: string; funnel: string }>;
}) {
  const { username, funnel: slug } = await params;
  const resolved = await resolveFunnel(username, slug);
  if (!resolved) notFound();
  const canRemoveBranding = await resolveCanRemoveBranding(
    resolved.profile.ownerId,
  );

  return (
    <div className="min-h-dvh bg-ink-950">
      <FunnelView
        funnel={resolved.funnel}
        profileId={resolved.profile.id}
        ownerId={resolved.profile.ownerId}
        paymentMethods={resolved.profile.paymentMethods}
        live
        showBranding={!canRemoveBranding}
      />
    </div>
  );
}
