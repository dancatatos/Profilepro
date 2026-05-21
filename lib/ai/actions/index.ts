/* ============================================================
   AI actions — modular, reusable single-purpose copy functions.
   Each delegates to rewriteFlow with a focused instruction.
   ============================================================ */

import { rewriteFlow, type FlowResult } from "../flows";
import type { AICopyMode, AILanguage } from "@/types";

export interface ActionContext {
  mode: AICopyMode;
  language: AILanguage;
}

type Action = (
  context: string,
  ctx: ActionContext,
) => Promise<FlowResult<string>>;

export const generateHeadline: Action = (context, ctx) =>
  rewriteFlow(
    "Write one powerful credibility-profile headline (max 80 characters) that names who this person helps and the result they deliver.",
    context,
    ctx.mode,
    ctx.language,
  );

export const generateBio: Action = (context, ctx) =>
  rewriteFlow(
    "Write a short, trust-building profile bio of 2-3 sentences. Mobile-readable.",
    context,
    ctx.mode,
    ctx.language,
  );

export const improveBio: Action = (context, ctx) =>
  rewriteFlow(
    "Rewrite and improve this profile bio. Keep it 2-3 sentences, more credible and more conversion-focused.",
    context,
    ctx.mode,
    ctx.language,
  );

export const generateCTA: Action = (context, ctx) =>
  rewriteFlow(
    "Generate 5 high-converting CTA button labels for a credibility profile. Return them as a numbered list, max 4 words each.",
    context,
    ctx.mode,
    ctx.language,
  );

export const generateRecruitingPitch: Action = (context, ctx) =>
  rewriteFlow(
    "Write a warm, persuasive recruiting pitch (about 4-5 sentences) that invites the reader to join this person's team.",
    context,
    ctx.mode,
    ctx.language,
  );

export const generateTestimonials: Action = (context, ctx) =>
  rewriteFlow(
    "Write 3 short, realistic testimonial quotes (1-2 sentences each) for this person. Return as a numbered list with a first name for each.",
    context,
    ctx.mode,
    ctx.language,
  );

export const generateSocialCaptions: Action = (context, ctx) =>
  rewriteFlow(
    "Write 3 scroll-stopping social media captions promoting this person's credibility profile. Return as a numbered list.",
    context,
    ctx.mode,
    ctx.language,
  );

export const generateHooks: Action = (context, ctx) =>
  rewriteFlow(
    "Write 5 attention-grabbing opening hooks this person can use in content or messages. Return as a numbered list.",
    context,
    ctx.mode,
    ctx.language,
  );

export const generateProductDescription: Action = (context, ctx) =>
  rewriteFlow(
    "Write a compelling product/service description (2-3 sentences) that focuses on benefits and ends with desire to act.",
    context,
    ctx.mode,
    ctx.language,
  );

export const generateLeadMagnet: Action = (context, ctx) =>
  rewriteFlow(
    "Suggest 3 irresistible free lead-magnet ideas this person could offer to capture prospect details. Return as a numbered list.",
    context,
    ctx.mode,
    ctx.language,
  );

export const rewriteSection: Action = (context, ctx) =>
  rewriteFlow(
    "Rewrite this profile section copy to be clearer, more credible and more conversion-focused. Keep a similar length.",
    context,
    ctx.mode,
    ctx.language,
  );

export const optimizeConversion: Action = (context, ctx) =>
  rewriteFlow(
    "Act as a conversion expert. Rewrite this copy to maximise prospect trust and action. Keep it concise.",
    context,
    ctx.mode,
    ctx.language,
  );

/** Action registry keyed by id — used by API routes + the assistant UI. */
export const AI_ACTIONS: Record<string, Action> = {
  "generate-headline": generateHeadline,
  "generate-bio": generateBio,
  "improve-bio": improveBio,
  "generate-cta": generateCTA,
  "generate-recruiting-copy": generateRecruitingPitch,
  "generate-testimonials": generateTestimonials,
  "generate-social-captions": generateSocialCaptions,
  "generate-hooks": generateHooks,
  "generate-product-description": generateProductDescription,
  "generate-lead-magnet": generateLeadMagnet,
  "rewrite-section": rewriteSection,
  "optimize-conversion": optimizeConversion,
};

export interface QuickAction {
  id: keyof typeof AI_ACTIONS;
  label: string;
  icon: string;
  hint: string;
}

/** Quick-action chips surfaced in the AI Assistant panel. */
export const QUICK_ACTIONS: QuickAction[] = [
  { id: "improve-bio", label: "Improve my bio", icon: "Wand2", hint: "Paste your current bio" },
  { id: "generate-cta", label: "CTA ideas", icon: "MousePointerClick", hint: "Describe your offer" },
  { id: "generate-recruiting-copy", label: "Recruiting pitch", icon: "Users", hint: "Describe your opportunity" },
  { id: "generate-social-captions", label: "Social captions", icon: "Share2", hint: "Describe your profile" },
  { id: "generate-hooks", label: "Content hooks", icon: "Zap", hint: "Describe your niche" },
  { id: "generate-product-description", label: "Product copy", icon: "ShoppingBag", hint: "Describe your product" },
  { id: "generate-lead-magnet", label: "Lead magnet ideas", icon: "Magnet", hint: "Describe your audience" },
  { id: "optimize-conversion", label: "Optimize copy", icon: "TrendingUp", hint: "Paste copy to optimize" },
];
