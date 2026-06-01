import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getFunnelBySlug, getProfileByUsername } from "@/lib/firebase/firestore";
import { isFirebaseConfigured } from "@/lib/firebase/config";
import { FunnelView } from "@/components/public-profile/FunnelView";
import { APP } from "@/lib/constants";
import type { Funnel, Profile } from "@/types";

export const dynamic = "force-dynamic";

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

  return (
    <div className="min-h-dvh bg-ink-950">
      <FunnelView
        funnel={resolved.funnel}
        profileId={resolved.profile.id}
        ownerId={resolved.profile.ownerId}
        paymentMethods={resolved.profile.paymentMethods}
        live
      />
    </div>
  );
}
