"use client";

import { useEffect } from "react";
import { useFeatureFlagsStore } from "@/store/featureFlagsStore";

/**
 * Convenience hook for reading admin-controlled feature flags.
 * Triggers a one-time Firestore fetch on first use; the result is
 * cached in a shared Zustand store so repeated calls are free.
 */
export function useFeatureFlags() {
  const flags = useFeatureFlagsStore((s) => s.flags);
  const loaded = useFeatureFlagsStore((s) => s.loaded);
  const load = useFeatureFlagsStore((s) => s.load);

  useEffect(() => {
    load();
  }, [load]);

  return { flags, loaded };
}
