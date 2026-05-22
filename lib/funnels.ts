/* ============================================================
   Funnels — helpers for building mini sales funnels.
   A funnel is an ordered list of section-based steps; each step
   reuses the existing profile section system.
   ============================================================ */

import { createSection } from "@/lib/defaults";
import { slugify, uid } from "@/lib/utils";
import type {
  Funnel,
  FunnelStep,
  FunnelStepType,
  RichTextNode,
  TextSection,
} from "@/types";

/** A Text section pre-filled with a single paragraph of starter copy. */
function textBlock(text: string): TextSection {
  const doc: RichTextNode = {
    type: "doc",
    content: [{ type: "paragraph", content: [{ type: "text", text }] }],
  };
  return { id: uid("sec"), type: "text", enabled: true, doc };
}

/** A fresh funnel step of the given type, with sensible starter content. */
export function createFunnelStep(type: FunnelStepType): FunnelStep {
  const base = { id: uid("fstep"), type };
  switch (type) {
    case "optin":
      return {
        ...base,
        name: "Opt-In",
        sections: [
          textBlock("Enter your details below to get instant access."),
          createSection("leadCapture"),
        ],
        cta: { label: "Get Instant Access", action: "next" },
      };
    case "content":
      return {
        ...base,
        name: "Sales Page",
        sections: [
          textBlock("Tell your story and make your pitch here."),
          createSection("video"),
        ],
        cta: { label: "I'm Interested", action: "next" },
      };
    case "offer":
      return {
        ...base,
        name: "Offer",
        sections: [createSection("products")],
        cta: { label: "Get It Now", action: "url", url: "" },
      };
    case "thankyou":
      return {
        ...base,
        name: "Thank You",
        sections: [
          textBlock("Thank you! Check your messages — I'll be in touch soon."),
        ],
      };
  }
}

export interface FunnelTemplate {
  id: string;
  name: string;
  description: string;
  steps: FunnelStepType[];
}

/** Starter funnel layouts shown when creating a new funnel. */
export const FUNNEL_TEMPLATES: FunnelTemplate[] = [
  {
    id: "blank",
    name: "Blank Funnel",
    description: "A simple opt-in and thank-you to start from.",
    steps: ["optin", "thankyou"],
  },
  {
    id: "lead-capture",
    name: "Lead Capture",
    description: "Landing page → opt-in form → thank you.",
    steps: ["content", "optin", "thankyou"],
  },
  {
    id: "opportunity",
    name: "Opportunity (MLM)",
    description: "Why extra income → presentation → call to action.",
    steps: ["content", "content", "thankyou"],
  },
];

/** Build a fresh funnel from a template. */
export function createFunnel(
  ownerId: string,
  name: string,
  template: FunnelTemplate,
): Funnel {
  const now = Date.now();
  const trimmed = name.trim() || "My Funnel";
  return {
    id: uid("funnel"),
    ownerId,
    name: trimmed,
    slug: slugify(trimmed) || `funnel-${now.toString(36)}`,
    themeId: "midnight",
    status: "draft",
    steps: template.steps.map(createFunnelStep),
    createdAt: now,
    updatedAt: now,
  };
}
