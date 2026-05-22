"use client";

import { createContext, useContext } from "react";
import type { ProfileSection, SectionType } from "@/types";

/**
 * The section operations a section-based builder exposes. Both the profile
 * builder and the funnel-step builder provide one of these, so the section
 * UI (`SectionsManager` / `SectionEditor`) is reusable across both.
 */
export interface SectionsApi {
  sections: ProfileSection[];
  setSections: (sections: ProfileSection[]) => void;
  addSection: (type: SectionType) => void;
  removeSection: (id: string) => void;
  toggleSection: (id: string) => void;
  updateSection: (id: string, patch: Partial<ProfileSection>) => void;
}

const SectionsContext = createContext<SectionsApi | null>(null);

export const SectionsProvider = SectionsContext.Provider;

/** Access the surrounding section builder — a profile or a funnel step. */
export function useSections(): SectionsApi {
  const ctx = useContext(SectionsContext);
  if (!ctx) {
    throw new Error("useSections must be used within a SectionsProvider");
  }
  return ctx;
}
