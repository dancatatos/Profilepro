"use client";

/**
 * Hook: resolves Credibly Link specs on a page's CTAs to concrete
 * URLs at view time. Runs ONCE per (ownerId, sections) — collects
 * all credibly CTAs across the sections, fetches the owner's funnels
 * and trainings (Firestore rules allow public read), then builds a
 * { [buttonId]: resolvedUrl } map.
 *
 * Returns null entries when the target doesn't exist on the owner's
 * account — caller hides the button silently.
 *
 * Lookup is tag-first, slug-fallback. So:
 *   - bundleTag-tagged clones match cleanly even after slug renames
 *   - hub funnels created before bundleTag existed still resolve via
 *     slug match
 */

import { useEffect, useMemo, useState } from "react";
import {
  listFunnels,
  listTrainingsByOwner,
} from "@/lib/firebase/firestore";
import type {
  CrediblyLinkSpec,
  CTAButton,
  Funnel,
  ProfileSection,
  Training,
} from "@/types";

interface CrediblyButton {
  buttonId: string;
  spec: CrediblyLinkSpec;
}

function collectCrediblyButtons(
  sections: ProfileSection[],
): CrediblyButton[] {
  const out: CrediblyButton[] = [];
  for (const s of sections) {
    if (s.type !== "cta") continue;
    for (const b of s.buttons as CTAButton[]) {
      if (b.action === "credibly" && b.credibly) {
        out.push({ buttonId: b.id, spec: b.credibly });
      }
    }
  }
  return out;
}

export function useCrediblyLinks(
  ownerId: string | undefined,
  sections: ProfileSection[],
  ownerUsername: string | undefined,
): Record<string, string | null> {
  const buttons = useMemo(() => collectCrediblyButtons(sections), [sections]);
  const [map, setMap] = useState<Record<string, string | null>>({});

  useEffect(() => {
    if (!ownerId || !ownerUsername || buttons.length === 0) {
      setMap({});
      return;
    }

    /* Determine which lookups we actually need based on the targets
       present — skip the funnel fetch if no buttons need it, etc. */
    const needsFunnels = buttons.some(
      (b) => b.spec.targetType === "funnel",
    );
    const needsTrainings = buttons.some(
      (b) => b.spec.targetType === "training",
    );

    let cancelled = false;
    (async () => {
      const [funnels, trainings] = await Promise.all([
        needsFunnels
          ? listFunnels(ownerId).catch(() => [] as Funnel[])
          : Promise.resolve([] as Funnel[]),
        needsTrainings
          ? listTrainingsByOwner(ownerId).catch(() => [] as Training[])
          : Promise.resolve([] as Training[]),
      ]);
      if (cancelled) return;

      const resolved: Record<string, string | null> = {};
      for (const { buttonId, spec } of buttons) {
        resolved[buttonId] = resolveOne(
          spec,
          ownerUsername,
          funnels,
          trainings,
        );
      }
      setMap(resolved);
    })();

    return () => {
      cancelled = true;
    };
  }, [ownerId, ownerUsername, buttons]);

  return map;
}

function resolveOne(
  spec: CrediblyLinkSpec,
  ownerUsername: string,
  funnels: Funnel[],
  trainings: Training[],
): string | null {
  switch (spec.targetType) {
    case "profile":
      return `/${ownerUsername}`;
    case "my-events":
      return `/my-events`;
    case "pipeline-today":
      return `/pipelines/today`;
    case "trainings-library":
      return `/trainings`;
    case "funnel": {
      if (!spec.targetTag) return null;
      /* Try bundleTag first (most robust), fall back to slug. Only
         consider published funnels — drafts shouldn't be linkable. */
      const f =
        funnels.find(
          (f) => f.bundleTag === spec.targetTag && f.status === "published",
        ) ??
        funnels.find(
          (f) => f.slug === spec.targetTag && f.status === "published",
        );
      return f ? `/${ownerUsername}/${f.slug}` : null;
    }
    case "training": {
      if (!spec.targetTag) return null;
      const t =
        trainings.find((t) => t.bundleTag === spec.targetTag) ??
        trainings.find((t) => t.slug === spec.targetTag);
      return t ? `/${ownerUsername}/t/${t.slug}` : null;
    }
  }
}
