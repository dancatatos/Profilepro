/**
 * Marketing content store — a lightweight client-side cache so any
 * surface that needs admin-configured labels (e.g. the "Trainings"
 * sidebar entry, headings on /trainings, etc.) can read them without
 * each page issuing its own Firestore round-trip.
 *
 * Loaded once on first access, then served from memory until a hard
 * refresh. Admin saves in /admin/marketing also call `setLocal()`
 * directly to keep the UI in sync without another fetch.
 *
 * Mirrors the pattern of useFeatureFlagsStore.
 */

import { create } from "zustand";
import {
  getMarketingContent,
  type MarketingContentPartial,
} from "@/lib/firebase/firestore";

interface MarketingState {
  content: MarketingContentPartial | null;
  loaded: boolean;
  loading: boolean;
  load: (force?: boolean) => Promise<void>;
  setLocal: (next: MarketingContentPartial | null) => void;
}

export const useMarketingStore = create<MarketingState>((set, get) => ({
  content: null,
  loaded: false,
  loading: false,
  load: async (force = false) => {
    if (!force && (get().loaded || get().loading)) return;
    set({ loading: true });
    try {
      const content = await getMarketingContent();
      set({ content, loaded: true, loading: false });
    } catch {
      set({ loaded: true, loading: false });
    }
  },
  setLocal: (next) => set({ content: next, loaded: true }),
}));
