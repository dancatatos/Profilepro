/* ============================================================
   Funnels — helpers for building mini sales funnels.
   A funnel is an ordered list of section-based steps; each step
   reuses the existing profile section system.
   ============================================================ */

import { createSection } from "@/lib/defaults";
import { snapshotSections } from "@/lib/sharedBuilds";
import { slugify, uid } from "@/lib/utils";
import type {
  Funnel,
  FunnelStep,
  FunnelStepType,
  GeneratedFunnelContent,
  ProfileSection,
  RichTextNode,
  SharedFunnel,
  SharedFunnelContent,
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
  {
    id: "webinar",
    name: "Webinar",
    description: "Registration → countdown → replay.",
    steps: ["optin", "content", "content"],
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
    themeId: "navy-glass",
    status: "draft",
    steps: template.steps.map(createFunnelStep),
    createdAt: now,
    updatedAt: now,
  };
}

/* ---------------- AI funnel generator ---------------- */

export interface AIFunnelType {
  id: string;
  label: string;
  description: string;
}

/** Funnel kinds offered by the AI funnel generator wizard. */
export const AI_FUNNEL_TYPES: AIFunnelType[] = [
  {
    id: "lead-capture",
    label: "Lead Capture",
    description: "A landing page and opt-in form to collect leads.",
  },
  {
    id: "opportunity",
    label: "Opportunity",
    description: "An MLM recruiting flow — the why, the presentation, the CTA.",
  },
  {
    id: "webinar",
    label: "Webinar",
    description: "Registration, a countdown, and a replay page.",
  },
  {
    id: "product",
    label: "Product",
    description: "A product pitch leading to an offer.",
  },
];

function isFunnelStepType(v: string): v is FunnelStepType {
  return (
    v === "optin" || v === "content" || v === "offer" || v === "thankyou"
  );
}

/** A Text section built from an AI-generated headline + body. */
function richTextBlock(headline: string, body: string): TextSection {
  const content: RichTextNode[] = [];
  if (headline.trim()) {
    content.push({
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: headline.trim() }],
    });
  }
  for (const para of body
    .split(/\n+/)
    .map((p) => p.trim())
    .filter(Boolean)) {
    content.push({ type: "paragraph", content: [{ type: "text", text: para }] });
  }
  if (content.length === 0) content.push({ type: "paragraph" });
  return {
    id: uid("sec"),
    type: "text",
    enabled: true,
    doc: { type: "doc", content },
  };
}

/** Assemble a real funnel from AI-generated funnel content. */
export function funnelFromGenerated(
  ownerId: string,
  content: GeneratedFunnelContent,
): Funnel {
  const now = Date.now();
  const name = content.funnelName.trim() || "AI Funnel";
  const steps: FunnelStep[] = content.steps.map((gs) => {
    const type: FunnelStepType = isFunnelStepType(gs.type)
      ? gs.type
      : "content";
    const sections: ProfileSection[] = [richTextBlock(gs.headline, gs.body)];
    if (type === "optin") sections.push(createSection("leadCapture"));
    const step: FunnelStep = {
      id: uid("fstep"),
      type,
      name: gs.name.trim() || type,
      sections,
    };
    if (type !== "thankyou") {
      step.cta = {
        label: gs.ctaLabel.trim() || "Continue",
        action: type === "offer" ? "url" : "next",
        ...(type === "offer" ? { url: "" } : {}),
      };
    }
    return step;
  });
  return {
    id: uid("funnel"),
    ownerId,
    name,
    slug: slugify(name) || `funnel-${now.toString(36)}`,
    themeId: "navy-glass",
    status: "draft",
    steps:
      steps.length > 0
        ? steps
        : [createFunnelStep("optin"), createFunnelStep("thankyou")],
    createdAt: now,
    updatedAt: now,
  };
}

/* ---------------- Funnel sharing ---------------- */

/** Deep-copy funnel steps with fresh ids and every link/URL cleared. */
export function snapshotFunnelSteps(steps: FunnelStep[]): FunnelStep[] {
  return steps.map((s) => {
    const step: FunnelStep = {
      id: uid("fstep"),
      type: s.type,
      name: s.name,
      sections: snapshotSections(s.sections),
    };
    if (s.cta) {
      step.cta = {
        label: s.cta.label,
        action: s.cta.action,
        ...(s.cta.action === "url" ? { url: "" } : {}),
      };
    }
    return step;
  });
}

/** A portable, link-free snapshot of a funnel, ready to publish. */
export function funnelSnapshot(funnel: Funnel): SharedFunnelContent {
  return JSON.parse(
    JSON.stringify({
      themeId: funnel.themeId,
      steps: snapshotFunnelSteps(funnel.steps),
    }),
  ) as SharedFunnelContent;
}

/** Build a fresh funnel for a recipient from a shared funnel. */
export function funnelFromShared(
  ownerId: string,
  shared: SharedFunnel,
): Funnel {
  const now = Date.now();
  const name = shared.name.trim() || "Shared Funnel";
  return {
    id: uid("funnel"),
    ownerId,
    name,
    slug: slugify(name) || `funnel-${now.toString(36)}`,
    themeId: shared.funnel.themeId,
    status: "draft",
    steps:
      shared.funnel.steps.length > 0
        ? snapshotFunnelSteps(shared.funnel.steps)
        : [createFunnelStep("optin"), createFunnelStep("thankyou")],
    createdAt: now,
    updatedAt: now,
  };
}
