/* ============================================================
   Generators — turn structured AI output into real Profile data.
   ============================================================ */

import { uid } from "@/lib/utils";
import { createSection } from "@/lib/defaults";
import type {
  CTAButton,
  GeneratedProfileContent,
  Profile,
  ProfileSection,
  SectionType,
} from "@/types";

const CTA_ACCENTS: CTAButton["accent"][] = ["blue", "jade", "gold", "white"];
const CTA_ICONS = ["Users", "GraduationCap", "Phone", "MessageCircle", "Store"];

function buildSection(
  type: SectionType,
  content: GeneratedProfileContent,
): ProfileSection {
  const section = createSection(type);

  if (section.type === "cta" && content.ctaButtons.length) {
    section.buttons = content.ctaButtons.map((b, i) => ({
      id: uid("btn"),
      label: b.label,
      url: "",
      icon: CTA_ICONS[i % CTA_ICONS.length],
      style: i === 0 ? "gradient" : i === 1 ? "solid" : "outline",
      accent: CTA_ACCENTS[i % CTA_ACCENTS.length],
    }));
  }

  if (section.type === "about" && content.aboutSection) {
    section.body = content.aboutSection;
  }

  if (section.type === "credibility" && content.credibilitySection.length) {
    section.items = content.credibilitySection.map((title) => ({
      id: uid("cr"),
      title,
      icon: "BadgeCheck",
    }));
  }

  if (section.type === "testimonials" && content.testimonials.length) {
    section.testimonials = content.testimonials.map((t) => ({
      id: uid("ts"),
      kind: "text" as const,
      authorName: t.authorName,
      quote: t.quote,
      rating: 5,
    }));
  }

  if (section.type === "products" && content.products.length) {
    section.products = content.products.map((p) => ({
      id: uid("pr"),
      title: p.title,
      description: p.description,
      ctaLabel: "Learn More",
      ctaUrl: "",
    }));
  }

  if (section.type === "leadCapture" && content.leadMagnet) {
    section.headline = content.leadMagnet;
    section.subtext = "Send your details and I'll personally reach out.";
  }

  return section;
}

const DEFAULT_ORDER: SectionType[] = [
  "cta",
  "socials",
  "about",
  "credibility",
  "testimonials",
  "products",
  "video",
  "gallery",
  "leadCapture",
];

/**
 * Merge AI-generated content into a base profile, producing a
 * ready-to-publish profile with populated, ordered sections.
 */
export function applyGeneratedContent(
  base: Profile,
  content: GeneratedProfileContent,
): Profile {
  const suggested =
    content.suggestedSections.length > 0
      ? content.suggestedSections
      : DEFAULT_ORDER;

  // Keep a stable, sensible order regardless of what the model returns.
  const ordered = DEFAULT_ORDER.filter((t) => suggested.includes(t));
  const finalTypes = ordered.length ? ordered : DEFAULT_ORDER.slice(0, 5);

  const sections = finalTypes.map((type) => buildSection(type, content));

  return {
    ...base,
    header: {
      ...base.header,
      headline: content.headline || base.header.headline,
      bio: content.bio || base.header.bio,
      socialProof: content.socialProof.length
        ? content.socialProof.map((s) => ({
            id: uid("st"),
            label: s.label,
            value: s.value,
          }))
        : base.header.socialProof,
    },
    sections,
    updatedAt: Date.now(),
  };
}
