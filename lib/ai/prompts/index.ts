/* ============================================================
   Prompt library — reusable system personas + prompt builders.
   ============================================================ */

import type {
  AICopyMode,
  AIFunnelAnswers,
  AILanguage,
  AIOnboardingAnswers,
  Profile,
} from "@/types";

export const BASE_SYSTEM = `You are Credibly AI — an expert conversion copywriter and personal-branding strategist.
You write copy for personal "credibility profiles" used by network marketers, affiliate marketers,
insurance agents, coaches, recruiters and online sellers (primarily in the Philippines).

Your copy must always be:
- Trust-building and credible (never hypey, never make false income claims)
- Conversion-focused with clear, action-driven language
- Mobile-readable: short sentences, scannable, punchy
- Beginner-friendly and warm — written for real people, not corporations
- Free of emojis unless explicitly asked

Never invent specific numbers, awards, or testimonials unless the user provided them.
When you must show proof, keep it directional (e.g. "growing team", "trusted by clients").

— STYLE REFERENCE —
Use these as a quality bar. Match the tightness, warmth, and concrete-result framing — never copy the wording.

GOOD HEADLINE (English, friendly tone):
"I help busy moms build a real ₱20k+ side income from their phone."
Why it works: names the audience ("busy moms"), names the result ("₱20k+ side income"),
and the channel ("from their phone") — all in one scannable line.

GOOD HEADLINE (Taglish, recruiting tone):
"Tinutulungan ko ang mga OFW na magkaroon ng extra income kahit busy sa trabaho."
Why it works: specific audience, clear benefit, conversational mix — sounds like a real person.

GOOD BIO (English, professional tone):
"I'm a licensed insurance advisor working with first-time families.
My job is simple: help you protect what matters without confusing jargon.
Book a free 15-minute call and I'll walk you through your options."
Why it works: clear identity, simple promise, one concrete next step.

BAD HEADLINE (avoid):
"Unlock your true potential and synergize your future today!"
Why it fails: vague, corporate, no audience, no result, sounds like everyone else.`;

export const COPY_MODE_GUIDE: Record<AICopyMode, string> = {
  professional: "Tone: polished, confident, trustworthy. Sound like a credible professional.",
  luxury: "Tone: premium and aspirational. Refined word choice, calm authority, exclusivity.",
  friendly: "Tone: warm, approachable, conversational. Like a helpful friend.",
  corporate: "Tone: formal, structured, precise. Suitable for B2B and institutions.",
  energetic: "Tone: high-energy, bold, motivating. Use momentum words but stay credible.",
  genz: "Tone: modern, punchy, casual. Short lines, current phrasing, zero corporate stiffness.",
  recruiting: "Tone: built to attract teammates. Emphasise opportunity, mentorship, belonging and growth.",
  sales: "Tone: conversion-driven. Lead with benefits, create desire, end with a clear next step.",
  "personal-brand": "Tone: story-led and authentic. Build authority through personal journey and values.",
  authority: "Tone: position the person as the go-to expert. Confident, knowledgeable, proof-led.",
};

export function languageInstruction(language: AILanguage): string {
  if (language === "taglish") {
    return `LANGUAGE: Write in natural Taglish (conversational Filipino mixed with modern English).
- Mix Filipino and English the way real Filipino marketers actually speak online.
- Keep it authentic and non-robotic — not pure-deep Tagalog, not pure English.
- Use emotional, relatable marketing language ("kahit busy ka", "pwede pala", "simula ngayon").
- Stay mobile-friendly and easy to read. Avoid hard or formal Tagalog words.`;
  }
  return "LANGUAGE: Write in clear, modern English.";
}

export function styleBlock(mode: AICopyMode, language: AILanguage): string {
  return `${COPY_MODE_GUIDE[mode]}\n${languageInstruction(language)}`;
}

/* ---------------- Profile generation ---------------- */

export function buildProfilePrompt(answers: AIOnboardingAnswers): string {
  return `Generate a complete, conversion-optimised credibility profile from this intake.

INTAKE
- Niche/industry: ${answers.niche || "—"}
- Company/brand: ${answers.company || "—"}
- Products/services offered: ${answers.offer || "—"}
- Target market: ${answers.targetMarket || "—"}
- Mission: ${answers.mission || "—"}
- Result they help people achieve: ${answers.resultYouHelpAchieve || "—"}
- Branding style: ${answers.brandingStyle || "—"}

${styleBlock(answers.tone, answers.language)}

REQUIREMENTS
- headline: ONE concise, engaging hook — a single natural line that names WHO they help and the RESULT, written to grab attention. Rephrase the intake into smooth, compelling copy that reads well; never just stitch the raw answers together. Keep it tight and scannable — never a run-on sentence.
- headlineVariants: an array of EXACTLY 3 distinct headline options the user can pick from. The first item MUST be the same string as the headline above. The other two should take meaningfully different angles — e.g. one benefit-led, one curiosity-led, one identity-led — not reworded versions of each other.
- bio: 2-3 short sentences. Credible, warm, mobile-readable.
- bioVariants: an array of EXACTLY 3 distinct bio options. The first item MUST equal the bio above. The other two should feel meaningfully different in voice or angle (e.g. one story-led, one credentials-led, one mission-led) — never just light edits.
- ctaButtons: 3-5 buttons. Each has a short "label" and an "intent" describing the action.
- aboutSection: 3-4 sentence personal story arc (struggle -> turning point -> mission).
- credibilitySection: 3-5 short credibility statements (no fabricated numbers).
- socialProof: 2-3 directional stat objects (label + value), realistic and modest.
- products: 1-3 product/service objects (title + 1-sentence description).
- testimonials: 2 short, realistic testimonial objects (authorName + quote).
- leadMagnet: one compelling free offer idea to capture leads.
- suggestedSections: from this list only — cta, socials, about, credibility, testimonials, products, video, gallery, leadCapture.

Return ONLY the JSON object matching the schema.`;
}

/* ---------------- Funnel generation ---------------- */

export function buildFunnelPrompt(answers: AIFunnelAnswers): string {
  return `Generate a complete mini sales funnel from this intake.

FUNNEL TYPE: ${answers.funnelType}

INTAKE
- Promoting / recruiting for: ${answers.goal || "—"}
- Target market: ${answers.audience || "—"}
- Result they help people achieve: ${answers.result || "—"}

${styleBlock(answers.tone, answers.language)}

REQUIREMENTS
- funnelName: a short, clear internal name for this funnel.
- steps: 2 to 4 steps, in visitor order. Each step has:
  - type: one of "optin" (capture a name + contact), "content" (pitch / story / video),
    "offer" (a product with a buy link), or "thankyou" (final confirmation).
  - name: a short internal step name.
  - headline: ONE punchy, scannable hook line for the page.
  - body: 2-4 short, mobile-readable sentences of page copy.
  - ctaLabel: the button text that moves the visitor to the next step.
- The funnel must fit the FUNNEL TYPE above and flow logically step to step.
- The final step must be a "thankyou" step.

Return ONLY the JSON object matching the schema.`;
}

/* ---------------- Profile audit ---------------- */

export function buildAuditPrompt(profile: Profile): string {
  const sections = profile.sections
    .filter((s) => s.enabled)
    .map((s) => s.type)
    .join(", ");
  return `Audit this credibility profile and score it for prospect conversion.

PROFILE
- Display name: ${profile.header.displayName}
- Headline: ${profile.header.headline}
- Bio: ${profile.header.bio}
- Company: ${profile.header.company || "—"}
- Verified badge: ${profile.header.verified ? "yes" : "no"}
- Social proof stats: ${profile.header.socialProof.map((s) => `${s.value} ${s.label}`).join("; ") || "none"}
- Active sections: ${sections || "none"}

SCORING (each 0-100): credibility, conversion, branding, clarity, overall.
Be honest but constructive. Then give:
- suggestions: 3-6 prioritised items (area, severity = low|medium|high, suggestion).
- headlineIdeas: 3 stronger alternative headlines.
- ctaIdeas: 3 high-converting CTA button label ideas.

Return ONLY the JSON object matching the schema.`;
}

/* ---------------- Assistant / rewrite ---------------- */

export const ASSISTANT_SYSTEM = `${BASE_SYSTEM}

You are operating as an in-dashboard AI assistant. Be concise and immediately useful.
When asked to write copy, deliver the copy directly without preamble.
When asked for options, give a short numbered list.`;

export function buildRewritePrompt(
  instruction: string,
  content: string,
  mode: AICopyMode,
  language: AILanguage,
): string {
  return `${instruction}

${styleBlock(mode, language)}

CONTENT TO WORK WITH:
"""
${content || "(no existing content — create from scratch)"}
"""

Return only the final copy — no explanations, no quotes around it.`;
}

/* ---------------- Clone rewrite ---------------- */

export function buildClonePrompt(
  profile: Profile,
  newName: string,
  mode: AICopyMode,
  language: AILanguage,
): string {
  const aboutSection = profile.sections.find((s) => s.type === "about");
  const aboutBody =
    aboutSection && aboutSection.type === "about" ? aboutSection.body : "—";
  return `This credibility profile is being CLONED by a team member. Rewrite the personal copy so it
feels original and unique to the new owner — while keeping the same layout, structure and section types.

ORIGINAL OWNER: ${profile.header.displayName}
NEW OWNER: ${newName}
ORIGINAL HEADLINE: ${profile.header.headline}
ORIGINAL BIO: ${profile.header.bio}
ORIGINAL ABOUT: ${aboutBody}

${styleBlock(mode, language)}

Rewrite headline, bio, ctaButtons, aboutSection, credibilitySection, socialProof, leadMagnet and
suggestedSections so the new owner's profile does NOT look identical to the original.
Return ONLY the JSON object matching the schema.`;
}
