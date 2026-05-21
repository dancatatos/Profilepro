import { create } from "zustand";
import { createSection } from "@/lib/defaults";
import { reorder } from "@/lib/utils";
import type {
  Profile,
  ProfileHeader,
  ProfileSection,
  ProfileSEO,
  SectionType,
  ThemeId,
} from "@/types";

interface ProfileState {
  profile: Profile | null;
  /** Unsaved changes since the last markSaved(). */
  dirty: boolean;
  setProfile: (profile: Profile | null) => void;
  markSaved: () => void;

  updateHeader: (patch: Partial<ProfileHeader>) => void;
  setTheme: (themeId: ThemeId) => void;
  setUsername: (username: string) => void;
  setStatus: (status: Profile["status"]) => void;
  updateSeo: (patch: Partial<ProfileSEO>) => void;

  addSection: (type: SectionType) => void;
  removeSection: (id: string) => void;
  toggleSection: (id: string) => void;
  updateSection: (id: string, patch: Partial<ProfileSection>) => void;
  moveSection: (from: number, to: number) => void;
  setSections: (sections: ProfileSection[]) => void;
}

function touch(profile: Profile): Profile {
  return { ...profile, updatedAt: Date.now() };
}

export const useProfileStore = create<ProfileState>((set) => ({
  profile: null,
  dirty: false,

  setProfile: (profile) => set({ profile, dirty: false }),
  markSaved: () => set({ dirty: false }),

  updateHeader: (patch) =>
    set((s) =>
      s.profile
        ? {
            profile: touch({
              ...s.profile,
              header: { ...s.profile.header, ...patch },
            }),
            dirty: true,
          }
        : s,
    ),

  setTheme: (themeId) =>
    set((s) =>
      s.profile
        ? { profile: touch({ ...s.profile, themeId }), dirty: true }
        : s,
    ),

  setUsername: (username) =>
    set((s) =>
      s.profile
        ? {
            profile: touch({
              ...s.profile,
              username: username.toLowerCase(),
            }),
            dirty: true,
          }
        : s,
    ),

  setStatus: (status) =>
    set((s) =>
      s.profile
        ? { profile: touch({ ...s.profile, status }), dirty: true }
        : s,
    ),

  updateSeo: (patch) =>
    set((s) =>
      s.profile
        ? {
            profile: touch({
              ...s.profile,
              seo: { ...s.profile.seo, ...patch },
            }),
            dirty: true,
          }
        : s,
    ),

  addSection: (type) =>
    set((s) =>
      s.profile
        ? {
            profile: touch({
              ...s.profile,
              sections: [...s.profile.sections, createSection(type)],
            }),
            dirty: true,
          }
        : s,
    ),

  removeSection: (id) =>
    set((s) =>
      s.profile
        ? {
            profile: touch({
              ...s.profile,
              sections: s.profile.sections.filter((sec) => sec.id !== id),
            }),
            dirty: true,
          }
        : s,
    ),

  toggleSection: (id) =>
    set((s) =>
      s.profile
        ? {
            profile: touch({
              ...s.profile,
              sections: s.profile.sections.map((sec) =>
                sec.id === id ? { ...sec, enabled: !sec.enabled } : sec,
              ),
            }),
            dirty: true,
          }
        : s,
    ),

  updateSection: (id, patch) =>
    set((s) =>
      s.profile
        ? {
            profile: touch({
              ...s.profile,
              sections: s.profile.sections.map((sec) =>
                sec.id === id
                  ? ({ ...sec, ...patch } as ProfileSection)
                  : sec,
              ),
            }),
            dirty: true,
          }
        : s,
    ),

  moveSection: (from, to) =>
    set((s) =>
      s.profile
        ? {
            profile: touch({
              ...s.profile,
              sections: reorder(s.profile.sections, from, to),
            }),
            dirty: true,
          }
        : s,
    ),

  setSections: (sections) =>
    set((s) =>
      s.profile
        ? { profile: touch({ ...s.profile, sections }), dirty: true }
        : s,
    ),
}));
