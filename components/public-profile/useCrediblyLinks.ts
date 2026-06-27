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
    if (s.type === "cta") {
      for (const b of s.buttons as CTAButton[]) {
        if (b.action === "credibly" && b.credibly) {
          out.push({ buttonId: b.id, spec: b.credibly });
        }
      }
    }
    if (s.type === "products") {
      /* Products keyed by product.id (not section.id) so the renderer
         can look up each card's resolved URL independently. */
      for (const p of s.products) {
        if (p.ctaAction === "credibly" && p.credibly) {
          out.push({ buttonId: p.id, spec: p.credibly });
        }
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
  /* Stable JSON key for the credibly button specs so the effect
     only re-fires when the actual content changes — NOT on every
     parent render. Callers commonly pass sections from
     `profile.sections.filter(...)` which creates a new array
     reference every render; without this hash the effect would
     re-fire forever, setState-loop, freeze the browser. */
  const buttonsKey = useMemo(() => {
    const collected = collectCrediblyButtons(sections);
    return JSON.stringify(collected);
  }, [sections]);

  const [map, setMap] = useState<Record<string, string | null>>({});

  useEffect(() => {
    const buttons = JSON.parse(buttonsKey) as CrediblyButton[];

    if (!ownerId || !ownerUsername || buttons.length === 0) {
      /* Only clear if non-empty — avoids a setState ping-pong on
         pages with zero credibly CTAs (the most common case). */
      setMap((prev) => (Object.keys(prev).length === 0 ? prev : {}));
      return;
    }

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
  }, [ownerId, ownerUsername, buttonsKey]);

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
