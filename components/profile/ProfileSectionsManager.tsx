"use client";

import { useProfileStore } from "@/store/profileStore";
import { SectionsManager } from "./SectionsManager";
import { SectionsProvider, type SectionsApi } from "./SectionsContext";

/**
 * The section builder wired to the profile store — used by the Profile
 * Builder. The funnel builder provides its own `SectionsApi` instead.
 */
export function ProfileSectionsManager() {
  const profile = useProfileStore((s) => s.profile);
  const setSections = useProfileStore((s) => s.setSections);
  const addSection = useProfileStore((s) => s.addSection);
  const removeSection = useProfileStore((s) => s.removeSection);
  const toggleSection = useProfileStore((s) => s.toggleSection);
  const updateSection = useProfileStore((s) => s.updateSection);

  const api: SectionsApi = {
    sections: profile?.sections ?? [],
    setSections,
    addSection,
    removeSection,
    toggleSection,
    updateSection,
  };

  return (
    <SectionsProvider value={api}>
      <SectionsManager />
    </SectionsProvider>
  );
}
