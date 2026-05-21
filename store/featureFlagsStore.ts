import { create } from "zustand";
import {
  DEFAULT_FEATURE_FLAGS,
  getFeatureFlags,
} from "@/lib/firebase/firestore";
import type { FeatureFlags } from "@/types";

interface FeatureFlagsState {
  flags: FeatureFlags;
  /** True once the flags have been fetched at least once. */
  loaded: boolean;
  /** True while a fetch is in flight. */
  loading: boolean;
  /** Fetch flags from Firestore. No-ops if already loaded (unless forced). */
  load: (force?: boolean) => Promise<void>;
  /** Optimistically update flags locally (used after an admin toggle). */
  patchLocal: (patch: Partial<FeatureFlags>) => void;
}

export const useFeatureFlagsStore = create<FeatureFlagsState>((set, get) => ({
  flags: { ...DEFAULT_FEATURE_FLAGS },
  loaded: false,
  loading: false,
  load: async (force = false) => {
    if (!force && (get().loaded || get().loading)) return;
    set({ loading: true });
    try {
      const flags = await getFeatureFlags();
      set({ flags, loaded: true, loading: false });
    } catch {
      set({ loaded: true, loading: false });
    }
  },
  patchLocal: (patch) =>
    set((s) => ({ flags: { ...s.flags, ...patch } })),
}));
