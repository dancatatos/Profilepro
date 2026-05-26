/* ============================================================
   Funnels — helpers for building mini sales funnels.
   A funnel is an ordered list of section-based steps; each step
   reuses the existing profile section system.
   ============================================================ */

import { createSection } from "@/lib/defaults";
import { snapshotSections } from "@/lib/sharedBuilds";
import { slugify, uid } from "@/lib/utils";
import {
  FUNNEL_TEMPLATES_V2,
  getTemplate,
  templateForAiFunnelType,
  type FunnelTemplateV2,
} from "@/lib/funnel-templates";
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

/**
 * Re-export the V2 template type as `FunnelTemplate` so the rest of
 * the app can keep importing `{ FunnelTemplate } from "@/lib/funnels"`
 * without churn. The V2 shape carries a themeId, category, and a
 * builder function instead of a bare list of step types — so each
 * template ships as a fully-fleshed-out funnel.
 */
export type FunnelTemplate = FunnelTemplateV2;

/** Starter funnel layouts shown when creating a new funnel. */
export const FUNNEL_TEMPLATES: FunnelTemplate[] = FUNNEL_TEMPLATES_V2;

/** Build a fresh funnel from a template. */
export function createFunnel(
  ownerId: string,
  name: string,
  template: FunnelTemplate,
): Funnel {
  const now = Date.now();
  const trimmed = name.trim() || "My Funnel";
  /* Template.build() returns fresh ids on every call — safe to use
     directly without an extra deep-clone. */
  return {
    id: uid("funnel"),
    ownerId,
    name: trimmed,
    slug: slugify(trimmed) || `funnel-${now.toString(36)}`,
    themeId: template.themeId,
    status: "draft",
    steps: template.build(),
    createdAt: now,
    updatedAt: now,
  };
}

/** Convenience for direct id lookup — used by the AI generator. */
export { getTemplate, templateForAiFunnelType };

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

/**
 * Assemble a real funnel from AI-generated funnel content.
 *
 * When `aiFunnelTypeId` is supplied (e.g. "opportunity", "webinar"),
 * we use the matching V2 template as a STARTING STRUCTURE and only
 * overlay the AI's copy on top of it — so the user gets the proven
 * section layout (hero + benefits + FAQ + lead form + etc.) with
 * headlines / subtext / step names personalised by AI.
 *
 * Without an aiFunnelTypeId we fall back to the legacy path: a single
 * text block per step. Kept for back-compat with any callers that
 * haven't been updated.
 */
export function funnelFromGenerated(
  ownerId: string,
  content: GeneratedFunnelContent,
  aiFunnelTypeId?: string,
): Funnel {
  const now = Date.now();
  const name = content.funnelName.trim() || "AI Funnel";
  const template = aiFunnelTypeId
    ? templateForAiFunnelType(aiFunnelTypeId)
    : null;

  let steps: FunnelStep[];

  if (template) {
    /* Template-driven path — keep the polished section layout, only
       overlay AI's headline/body onto each step's hero section, plus
       the step name + CTA label. Extra AI steps beyond the template
       length are appended as plain content steps so we never silently
       drop AI output. */
    const templateSteps = template.build();
    steps = templateSteps.map((tStep, i) => {
      const aiStep = content.steps[i];
      if (!aiStep) return tStep;

      const sections: ProfileSection[] = tStep.sections.map((sec) => {
        if (sec.type === "hero" && (aiStep.headline || aiStep.body)) {
          return {
            ...sec,
            headline: aiStep.headline?.trim() || sec.headline,
            subtext: aiStep.body?.trim() || sec.subtext,
          };
        }
        return sec;
      });

      const merged: FunnelStep = {
        ...tStep,
        name: aiStep.name?.trim() || tStep.name,
        sections,
      };
      if (tStep.cta && aiStep.ctaLabel?.trim()) {
        merged.cta = { ...tStep.cta, label: aiStep.ctaLabel.trim() };
      }
      return merged;
    });

    /* AI generated more steps than the template? Tack them on so we
       don't lose its output. They get a plain text block layout. */
    if (content.steps.length > templateSteps.length) {
      for (let i = templateSteps.length; i < content.steps.length; i++) {
        const gs = content.steps[i];
        const type: FunnelStepType = isFunnelStepType(gs.type) ? gs.type : "content";
        const extra: FunnelStep = {
          id: uid("fstep"),
          type,
          name: gs.name.trim() || type,
          sections: [richTextBlock(gs.headline, gs.body)],
        };
        if (type !== "thankyou") {
          extra.cta = {
            label: gs.ctaLabel.trim() || "Continue",
            action: type === "offer" ? "url" : "next",
            ...(type === "offer" ? { url: "" } : {}),
          };
        }
        steps.push(extra);
      }
    }
  } else {
    /* Legacy path — no template, one text block per step. */
    steps = content.steps.map((gs) => {
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
  }

  return {
    id: uid("funnel"),
    ownerId,
    name,
    slug: slugify(name) || `funnel-${now.toString(36)}`,
    themeId: template?.themeId ?? "navy-glass",
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
