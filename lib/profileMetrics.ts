import type { Profile } from "@/types";

/** 0-100 completeness score for a profile, with the unmet checklist. */
export function profileCompleteness(profile: Profile | null): {
  score: number;
  checklist: { label: string; done: boolean }[];
} {
  if (!profile) return { score: 0, checklist: [] };
  const h = profile.header;
  const hasEnabled = (type: string) =>
    profile.sections.some((s) => s.enabled && s.type === type);

  const checklist = [
    {
      label: "Add your name",
      done: !!h.displayName && h.displayName !== "Your Name",
    },
    { label: "Write a strong headline", done: h.headline.length > 14 },
    { label: "Write your bio", done: h.bio.length > 30 },
    { label: "Upload a profile photo", done: !!h.avatarUrl },
    { label: "Add CTA buttons", done: hasEnabled("cta") },
    { label: "Link your socials", done: hasEnabled("socials") },
    { label: "Add an About section", done: hasEnabled("about") },
    { label: "Show your credibility", done: hasEnabled("credibility") },
    { label: "Add a lead capture form", done: hasEnabled("leadCapture") },
    { label: "Publish your profile", done: profile.status === "published" },
  ];

  const done = checklist.filter((c) => c.done).length;
  return {
    score: Math.round((done / checklist.length) * 100),
    checklist,
  };
}
