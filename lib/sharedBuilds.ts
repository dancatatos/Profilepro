/* ============================================================
   Shared builds — helpers for publishing a profile build as a
   reusable, share-coded template and applying one back.
   ============================================================ */

import { uid } from "@/lib/utils";
import type {
  Profile,
  ProfileSection,
  SharedBuildContent,
  ThemeId,
} from "@/types";

/* Ambiguous characters (0/O, 1/I/L) are left out so codes are easy to read. */
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

/** A short, human-friendly share code, e.g. "DAN-7K2PXM". */
export function generateShareCode(name: string): string {
  const letters = (name.match(/[a-zA-Z]/g) ?? []).slice(0, 3).join("");
  const prefix = (letters || "BLD").toUpperCase();
  let rand = "";
  for (let i = 0; i < 6; i += 1) {
    rand += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return `${prefix}-${rand}`;
}

/**
 * Deep-copy sections with fresh ids and every link/URL cleared, so a shared
 * build never carries the publisher's destinations — the recipient fills
 * in their own. Section structure and copy are preserved.
 */
export function snapshotSections(sections: ProfileSection[]): ProfileSection[] {
  return sections.map(freshSection);
}

function freshSection(section: ProfileSection): ProfileSection {
  const base = {
    id: uid("sec"),
    enabled: section.enabled,
    title: section.title,
  };
  switch (section.type) {
    case "cta":
      return {
        ...base,
        type: "cta",
        buttons: section.buttons.map((b) => ({ ...b, id: uid("btn"), url: "" })),
      };
    case "socials":
      return {
        ...base,
        type: "socials",
        links: section.links.map((l) => ({ ...l, id: uid("ln"), url: "" })),
      };
    case "about":
      return { ...base, type: "about", body: section.body };
    case "text":
      return {
        ...base,
        type: "text",
        doc: JSON.parse(JSON.stringify(section.doc)),
      };
    case "countdown":
      return {
        ...base,
        type: "countdown",
        headline: section.headline,
        targetIso: section.targetIso,
        expiredText: section.expiredText,
      };
    case "hero":
      return {
        ...base,
        type: "hero",
        headline: section.headline,
        subtext: section.subtext,
        ...(section.backgroundUrl
          ? { backgroundUrl: section.backgroundUrl }
          : {}),
      };
    case "credibility":
      return {
        ...base,
        type: "credibility",
        items: section.items.map((it) => ({ ...it, id: uid("cr") })),
      };
    case "testimonials":
      return {
        ...base,
        type: "testimonials",
        testimonials: section.testimonials.map((t) => ({ ...t, id: uid("ts") })),
      };
    case "products":
      return {
        ...base,
        type: "products",
        products: section.products.map((p) => ({
          ...p,
          id: uid("pr"),
          ctaUrl: "",
        })),
      };
    case "video":
      return {
        ...base,
        type: "video",
        videos: section.videos.map((v) => ({ ...v, id: uid("vid"), url: "" })),
      };
    case "gallery":
      return {
        ...base,
        type: "gallery",
        images: section.images.map((g) => ({ ...g, id: uid("img") })),
      };
    case "leadCapture":
      return {
        ...base,
        type: "leadCapture",
        headline: section.headline,
        subtext: section.subtext,
        fields: [...section.fields],
        channels: {},
      };
    case "appointment":
      return {
        ...base,
        type: "appointment",
        headline: section.headline,
        subtext: section.subtext,
        availableDays: [...section.availableDays],
        startTime: section.startTime,
        endTime: section.endTime,
        slotMinutes: section.slotMinutes,
        bookingWindowDays: section.bookingWindowDays,
        questions: section.questions.map((q) => ({ ...q, id: uid("q") })),
      };
  }
}

/** Drop undefined values so the snapshot is safe to write to Firestore. */
function jsonClean<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

/** Build a portable, link-free, identity-free snapshot from a profile. */
export function buildSnapshotFromProfile(profile: Profile): SharedBuildContent {
  return jsonClean({
    headline: profile.header.headline,
    bio: profile.header.bio,
    sections: snapshotSections(profile.sections),
  });
}

/**
 * Produce a new profile by applying a build's theme, copy and sections as an
 * exact copy. The recipient's identity (name, photo, contact) is kept intact.
 */
export function applyExactBuild(
  base: Profile,
  content: SharedBuildContent,
  themeId: ThemeId,
): Profile {
  return {
    ...base,
    themeId,
    header: {
      ...base.header,
      headline: content.headline || base.header.headline,
      bio: content.bio || base.header.bio,
    },
    sections: snapshotSections(content.sections),
    updatedAt: Date.now(),
  };
}
